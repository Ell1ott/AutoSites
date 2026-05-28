"""`generate_inspiration_queries` job handler.

Reads the gallery list + prompt template from the `generate_inspiration_queries`
row in `ai_tasks` and, for each place_id passed in, asks an LLM to produce one
short search query per gallery. Result lands in `places.dynamic[output_field]`
as `{gallery_id: query_string}` and is also appended to `ai_outputs_log`.

Args:
    place_ids: list[str]                          (required)
    task: str                                      (optional, default
                                                    'generate_inspiration_queries')
    model: str                                     (optional, overrides config)
    force: bool                                    (optional, ignored for now)
"""
from __future__ import annotations

import json
import os
import re
import time
from typing import Any

from db.connection import session
from db.repos import ai_outputs_log, ai_runs, ai_tasks, fields as fields_repo, places

try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:  # pragma: no cover
    genai = None  # type: ignore[assignment]
    genai_types = None  # type: ignore[assignment]


_DEFAULT_MODEL = "gemini-2.5-flash"
_DEFAULT_OUTPUT_FIELD = "inspiration_queries"
_DEFAULT_PROMPT = (
    "You are picking search queries for a design inspiration session.\n"
    "Brief: {{design_prompt}}\n\n"
    "For each gallery key in the requested JSON object, propose ONE short "
    "search query (2-5 words) tuned to that gallery."
)


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001
    task_name = args.get("task") or "generate_inspiration_queries"
    place_ids = args.get("place_ids") or []
    if not isinstance(place_ids, list) or not place_ids:
        raise ValueError("args.place_ids must be a non-empty list")
    place_ids = [str(p) for p in place_ids]

    with session() as c:
        row = ai_tasks.get(c, task_name)
    saved: dict[str, Any] = (row or {}).get("config") or {}

    galleries = saved.get("galleries") or []
    if not isinstance(galleries, list) or not galleries:
        raise ValueError(
            f"ai_task {task_name!r} has no 'galleries' configured. "
            "Run `uv run python -m scripts.seed_inspiration_queries_task` first."
        )
    # Accept either `meta_prompt` (canonical, matches other place tasks) or
    # `prompt_template` (legacy alias) from the saved config.
    prompt_template = (
        args.get("prompt_override")
        or saved.get("meta_prompt")
        or saved.get("prompt_template")
        or _DEFAULT_PROMPT
    )
    model = args.get("model") or saved.get("model") or _DEFAULT_MODEL
    output_field = saved.get("output_field") or _DEFAULT_OUTPUT_FIELD

    if genai is None:
        raise RuntimeError(
            "google-genai is not installed. Run `uv sync` in backend/ to install it."
        )
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY (or GOOGLE_API_KEY) must be set")

    is_cancelled = args["__cancel__"] if callable(args.get("__cancel__")) else (lambda: False)

    log.started(
        task=task_name,
        place_ids_count=len(place_ids),
        galleries_count=len(galleries),
        model=model,
    )
    log.progress(done=0, total=len(place_ids))

    client = genai.Client(api_key=api_key)
    # `reuse_query_from` galleries (e.g. Behance reusing Dribbble's query) are
    # NOT shown to the LLM — they're populated from the source gallery's value
    # after the call. Keeps the LLM unaware of mirror destinations.
    primary_galleries = [g for g in galleries if not g.get("reuse_query_from")]
    mirror_galleries = [g for g in galleries if g.get("reuse_query_from")]
    gallery_ids = [
        str(g["id"]) for g in primary_galleries if isinstance(g, dict) and g.get("id")
    ]
    results_by_place: dict[str, dict[str, str]] = {}

    for idx, place_id in enumerate(place_ids, start=1):
        if is_cancelled():
            log.cancelled(at_item=place_id)
            break

        place_row = _load_place(place_id)
        place_label = (place_row or {}).get("name") or place_id
        log.item_start(place_id=place_id, name=place_label)

        ctx = _build_context(place_row, galleries)
        rendered = _render(prompt_template, ctx)
        full_prompt = f"{rendered}\n\n{_format_galleries_for_prompt(primary_galleries)}"

        schema = _build_schema(primary_galleries)
        t0 = time.monotonic()
        log.ai_call_start(model=model, task=task_name, place_id=place_id, prompt_chars=len(full_prompt))
        try:
            queries = _call_llm(client, model, full_prompt, gallery_ids, schema)
        except Exception as e:  # noqa: BLE001
            log.error(e, context={"place_id": place_id})
            log.item_done(place_id=place_id, duration_ms=(time.monotonic() - t0) * 1000, picks_count=0)
            log.progress(done=idx, total=len(place_ids))
            continue
        log.ai_call_done(duration_ms=(time.monotonic() - t0) * 1000, tokens_in=0, tokens_out=0)

        before = set(queries.keys())
        queries = _validate_against_categories(queries, primary_galleries)
        dropped = sorted(before - set(queries.keys()))
        if dropped:
            log.warn(f"dropped invalid category values for: {dropped}")

        for g in mirror_galleries:
            mid = g.get("id")
            src = g.get("reuse_query_from")
            if not isinstance(mid, str) or not isinstance(src, str):
                continue
            src_value = queries.get(src)
            if isinstance(src_value, str) and src_value:
                queries[mid] = src_value

        results_by_place[place_id] = queries
        _persist(place_id=place_id, task=task_name, output_field=output_field,
                 value=queries, model=model, run_id=log.job_id)

        log.item_done(
            place_id=place_id,
            duration_ms=(time.monotonic() - t0) * 1000,
            outputs={output_field: queries},
        )
        log.progress(done=idx, total=len(place_ids))

    fields_repo.invalidate()

    persist_args = {k: v for k, v in args.items() if not k.startswith("__")}
    with session() as c:
        ai_runs.upsert(
            c,
            run_id=log.job_id,
            task=task_name,
            started_at=None,
            finished_at=None,
            status="ok",
            args=persist_args,
            counts={"places": len(results_by_place)},
        )

    return {
        "task": task_name,
        "places_count": len(results_by_place),
        "per_place": results_by_place,
    }


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------


def _load_place(place_id: str) -> dict[str, Any] | None:
    with session() as c:
        return places.get(c, place_id)


def _build_context(place: dict[str, Any] | None, galleries: list[dict[str, Any]]) -> dict[str, str]:
    ctx: dict[str, str] = {
        "galleries": ", ".join(str(g.get("name") or g.get("id") or "") for g in galleries),
    }
    if place:
        dyn = place.get("dynamic") or {}
        design_prompt = dyn.get("design_prompt") or ""
        category = ""
        types = dyn.get("types")
        if isinstance(types, list) and types:
            category = str(types[0])
        elif isinstance(dyn.get("category"), str):
            category = str(dyn["category"])
        ctx.update(
            {
                "design_prompt": str(design_prompt),
                "name": place.get("name") or "",
                "category": category,
            }
        )
    else:
        ctx.update({"design_prompt": "", "name": "", "category": ""})
    return ctx


_TEMPLATE_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")


def _render(template: str, ctx: dict[str, str]) -> str:
    return _TEMPLATE_RE.sub(lambda m: ctx.get(m.group(1), ""), template)


def _gallery_category_slugs(g: dict[str, Any]) -> list[str]:
    """Return the list of category slugs if this gallery is enum-style, else []."""
    cats = g.get("categories")
    if not isinstance(cats, list):
        return []
    slugs: list[str] = []
    for c in cats:
        if isinstance(c, dict):
            slug = c.get("slug")
            if isinstance(slug, str) and slug:
                slugs.append(slug)
    return slugs


def _build_schema(galleries: list[dict[str, Any]]) -> dict[str, Any]:
    """JSON schema enforcing one string per gallery id.

    We deliberately do NOT emit `enum` for category galleries: Gemini's
    `response_json_schema` rejects schemas with too much branching ("enums
    with too many values" — the Lapa list of 78+ trips this). The allowed
    slugs are listed in the prompt instead, and `run()` post-validates each
    category gallery's value against its slug list, dropping invalids."""
    props: dict[str, Any] = {}
    required: list[str] = []
    for g in galleries:
        gid = g.get("id")
        if not isinstance(gid, str) or not gid:
            continue
        name = g.get("name") or gid
        hint = g.get("prompt_hint") or ""
        is_category = bool(_gallery_category_slugs(g))
        if is_category:
            description = (
                f"Category slug for {name}. Must be one of the slugs listed "
                f"in the prompt for this gallery."
            )
        else:
            description = f"Search query for {name}, 2-5 words."
        if hint:
            description += f" {hint}"
        props[gid] = {"type": "string", "description": description}
        required.append(gid)
    return {
        "type": "object",
        "properties": props,
        "required": required,
    }


def _validate_against_categories(
    queries: dict[str, str],
    galleries: list[dict[str, Any]],
) -> dict[str, str]:
    """Drop category-gallery values that aren't in the allowed slug list.

    Returns a new dict; never mutates input. Invalid values are dropped (not
    coerced) so the UI's `query.length > 0` filter hides the gallery rather
    than rendering a broken URL."""
    by_id: dict[str, list[str]] = {}
    for g in galleries:
        gid = g.get("id")
        if not isinstance(gid, str) or not gid:
            continue
        slugs = _gallery_category_slugs(g)
        if slugs:
            by_id[gid] = slugs
    out: dict[str, str] = {}
    for gid, value in queries.items():
        slugs = by_id.get(gid)
        if slugs and value not in slugs:
            continue
        out[gid] = value
    return out


def _format_galleries_for_prompt(galleries: list[dict[str, Any]]) -> str:
    """Human-readable per-gallery instructions to append to the LLM prompt.

    Free-text galleries get their `prompt_hint` inline; category galleries
    additionally list allowed `<slug> (<label>)` choices so the model can pick
    on meaning, even though the schema enforces the slug."""
    lines: list[str] = [
        "Produce a JSON object whose keys are the gallery IDs below.",
        "Each value must satisfy that gallery's rule:",
        "",
    ]
    for g in galleries:
        gid = g.get("id")
        if not isinstance(gid, str) or not gid:
            continue
        name = g.get("name") or gid
        hint = (g.get("prompt_hint") or "").strip()
        slugs = _gallery_category_slugs(g)
        if slugs:
            lines.append(f"- {gid} ({name}, CATEGORY): pick ONE slug.")
            if hint:
                lines.append(f"    Hint: {hint}")
            cats = g.get("categories") or []
            allowed_parts: list[str] = []
            for c in cats:
                if not isinstance(c, dict):
                    continue
                slug = c.get("slug")
                if not isinstance(slug, str) or not slug:
                    continue
                label = c.get("label") or slug
                allowed_parts.append(f"{slug} ({label})")
            lines.append("    Allowed: " + ", ".join(allowed_parts))
        else:
            lines.append(f"- {gid} ({name}, FREE-TEXT): short search query.")
            if hint:
                lines.append(f"    Hint: {hint}")
    return "\n".join(lines)


def _call_llm(
    client,
    model: str,
    prompt: str,
    gallery_ids: list[str],
    schema: dict[str, Any],
) -> dict[str, str]:
    """Call Gemini with a strict response_json_schema and parse the result."""
    config = genai_types.GenerateContentConfig(
        response_mime_type="application/json",
        response_json_schema=schema,
    )
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=config,
    )
    # SDK exposes parsed-object when response_json_schema is set; fall back to
    # parsing response.text if .parsed isn't populated for this model.
    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, dict):
        raw: Any = parsed
    else:
        text = (response.text or "").strip()
        try:
            raw = json.loads(text)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"LLM returned non-JSON: {text[:200]}") from e
    if not isinstance(raw, dict):
        raise RuntimeError(f"LLM returned non-object JSON: {raw!r}")
    out: dict[str, str] = {}
    for gid in gallery_ids:
        v = raw.get(gid)
        if isinstance(v, str) and v.strip():
            out[gid] = v.strip()
    if not out:
        raise RuntimeError(f"LLM response contained none of the gallery IDs: {raw!r}")
    return out


def _persist(
    *,
    place_id: str,
    task: str,
    output_field: str,
    value: dict[str, str],
    model: str,
    run_id: str,
) -> None:
    with session() as c:
        places.set_dynamic(c, place_id, output_field, value)
        ai_outputs_log.append(
            c,
            place_id=place_id,
            task=task,
            value=value,
            model=model,
            run_id=run_id,
        )
