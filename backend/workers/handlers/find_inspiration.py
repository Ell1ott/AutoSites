"""`find_inspiration` job handler — drives a browser-use agent to collect design
inspiration links + screenshots from sites like Dribbble.

Two run shapes share the same handler:

  Per-place (the common case, like the existing `design_prompt` task):
    args = {task: "find_inspiration", place_ids: [pid, ...]}
    For each place we render the prompt/start_url with the place's
    `design_prompt` (or fallbacks), run the agent, and persist the resulting
    list of picks to `places.dynamic[<output_field>]`.

  Ad-hoc (free-text exploration, from CLI or curl):
    args = {prompt_override: "find me inspiration for a coffee site", ...}
    No place is touched; picks come back in the job summary.

The actual agent loop (browser session + `add_inspiration` tool + screenshot
capture) lives in `inspiration_agent`, which is shared with `scripts/find_inspiration.py`.
"""
from __future__ import annotations

import asyncio
import os
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

from db.connection import session
from db.repos import ai_outputs_log, ai_runs, ai_tasks, fields as fields_repo, places
from workers.handlers import inspiration_agent

# Repo root → mapsLeadsFetcher/screenshots/ matches what the API already serves.
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_SCREENSHOTS_DIR = Path(
    os.environ.get("AUTOSITES_SCREENSHOTS_DIR")
    or _REPO_ROOT / "mapsLeadsFetcher" / "screenshots"
).resolve()


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001
    cfg = _resolve_config(args)
    log.started(
        task=cfg.task_name,
        mode="ad_hoc" if cfg.is_ad_hoc else "per_place",
        place_ids_count=len(cfg.place_ids),
        model=cfg.model,
        max_picks=cfg.max_picks,
    )

    is_cancelled = args["__cancel__"] if callable(args.get("__cancel__")) else (lambda: False)

    if inspiration_agent.is_openrouter_model(cfg.model):
        if not os.environ.get("OPENROUTER_API_KEY"):
            raise RuntimeError("OPENROUTER_API_KEY must be set")
        api_key = None
    else:
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY (or GOOGLE_API_KEY) must be set")

    results_by_place: dict[str, list[dict[str, Any]]] = {}
    ad_hoc_picks: list[dict[str, Any]] = []
    total_picks = 0

    targets = cfg.place_ids if not cfg.is_ad_hoc else [None]
    log.progress(done=0, total=len(targets))

    for idx, place_id in enumerate(targets, start=1):
        if is_cancelled():
            log.cancelled(at_item=place_id)
            break

        place_row = _load_place(place_id) if place_id else None
        ctx = _build_context(cfg, place_row)
        start_url = inspiration_agent.render_template(cfg.start_url_template, ctx)
        agent_prompt = inspiration_agent.render_template(cfg.prompt_template, ctx)
        place_label = (place_row or {}).get("name") if place_row else "ad-hoc"

        log.item_start(place_id=place_id or "ad-hoc", name=place_label, start_url=start_url)
        t0 = time.monotonic()
        try:
            picks = asyncio.run(
                _run_one(
                    cfg=cfg,
                    agent_prompt=agent_prompt,
                    start_url=start_url,
                    api_key=api_key,
                    place_id=place_id,
                    run_id=log.job_id,
                    log=log,
                )
            )
        except Exception as e:  # noqa: BLE001
            log.error(e, context={"place_id": place_id, "start_url": start_url})
            picks = []
        duration_ms = (time.monotonic() - t0) * 1000

        if place_id is not None:
            results_by_place[place_id] = picks
            _persist_place_result(
                place_id=place_id,
                task=cfg.task_name,
                output_field=cfg.output_field,
                picks=picks,
                model=cfg.model,
                run_id=log.job_id,
            )
        else:
            ad_hoc_picks = picks

        total_picks += len(picks)
        log.item_done(
            place_id=place_id or "ad-hoc",
            duration_ms=duration_ms,
            outputs={cfg.output_field: picks},
            picks_count=len(picks),
        )
        log.progress(done=idx, total=len(targets))

    fields_repo.invalidate()

    # Mirror into ai_runs so /ai-runs queries see it (consistent with ai_task).
    persist_args = {k: v for k, v in args.items() if not k.startswith("__")}
    with session() as c:
        ai_runs.upsert(
            c,
            run_id=log.job_id,
            task=cfg.task_name,
            started_at=None,
            finished_at=None,
            status="ok",
            args=persist_args,
            counts={"picks": total_picks, "places": len(results_by_place)},
        )

    summary: dict[str, Any] = {
        "task": cfg.task_name,
        "mode": "ad_hoc" if cfg.is_ad_hoc else "per_place",
        "picks_count": total_picks,
    }
    if cfg.is_ad_hoc:
        summary["picks"] = ad_hoc_picks
    else:
        summary["per_place"] = results_by_place
    return summary


# -----------------------------------------------------------------------------
# Config resolution
# -----------------------------------------------------------------------------


@dataclass
class _Config:
    task_name: str
    is_ad_hoc: bool
    place_ids: list[str]
    start_url_template: str
    prompt_template: str
    model: str
    max_picks: int
    max_steps: int
    output_field: str
    extra_context: dict[str, Any] = field(default_factory=dict)


def _resolve_config(args: dict[str, Any]) -> _Config:
    task_name = args.get("task") or "find_inspiration"
    place_ids = args.get("place_ids") or []
    if not isinstance(place_ids, list):
        raise ValueError("args.place_ids must be a list")
    place_ids = [str(p) for p in place_ids]

    saved: dict[str, Any] = {}
    if isinstance(task_name, str) and task_name:
        with session() as c:
            row = ai_tasks.get(c, task_name)
        if row is not None:
            saved = row.get("config") or {}

    start_url = (
        args.get("start_url_override")
        or saved.get("start_url_template")
        or inspiration_agent.DEFAULT_START_URL
    )
    prompt = (
        args.get("prompt_override")
        or saved.get("prompt_template")
        or saved.get("meta_prompt")
        or inspiration_agent.DEFAULT_PROMPT
    )
    model = args.get("model") or saved.get("model") or inspiration_agent.DEFAULT_MODEL
    max_picks = int(
        args.get("max_picks") or saved.get("max_picks") or inspiration_agent.DEFAULT_MAX_PICKS
    )
    max_steps = int(
        args.get("max_steps") or saved.get("max_steps") or inspiration_agent.DEFAULT_MAX_STEPS
    )
    output_field = (
        args.get("output_field")
        or saved.get("output_field")
        or inspiration_agent.DEFAULT_OUTPUT_FIELD
    )

    is_ad_hoc = not place_ids and bool(args.get("prompt_override"))
    return _Config(
        task_name=task_name,
        is_ad_hoc=is_ad_hoc,
        place_ids=place_ids,
        start_url_template=start_url,
        prompt_template=prompt,
        model=model,
        max_picks=max_picks,
        max_steps=max_steps,
        output_field=output_field,
    )


def _load_place(place_id: str) -> dict[str, Any] | None:
    with session() as c:
        return places.get(c, place_id)


def _build_context(cfg: _Config, place: dict[str, Any] | None) -> dict[str, str]:
    """Variables available for `{{...}}` interpolation in start_url + prompt."""
    ctx: dict[str, str] = {
        "max_picks": str(cfg.max_picks),
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
                "label": place.get("name") or "",
                "category": category,
                "name": place.get("name") or "",
                "query": _query_from(design_prompt, category, place.get("name")),
            }
        )
    else:
        # Ad-hoc: the prompt_override IS the design brief. Mirror it across the
        # usual context keys so templates that reference {{design_prompt}} or
        # {{query}} still work without a place.
        prompt_override = cfg.prompt_template
        ctx.update(
            {
                "design_prompt": prompt_override,
                "label": "",
                "category": "",
                "name": "",
                "query": _query_from(prompt_override, "", None),
            }
        )
    return ctx


def _query_from(design_prompt: str, category: str, name: str | None) -> str:
    """Squeeze a search-friendly query out of whatever we have."""
    raw = design_prompt or category or name or "website inspiration"
    clean = re.sub(r"\s+", " ", raw).strip()[:100]
    return quote_plus(clean)


# -----------------------------------------------------------------------------
# Agent loop wrapper
# -----------------------------------------------------------------------------


async def _run_one(
    *,
    cfg: _Config,
    agent_prompt: str,
    start_url: str,
    api_key: str | None,
    place_id: str | None,
    run_id: str,
    log,  # noqa: ANN001
) -> list[dict[str, Any]]:
    shot_dir = _screenshot_dir_for(place_id, run_id)

    def _on_warn(msg: str) -> None:
        log.warn(msg)

    def _on_pick(idx: int, _max: int, pick: dict[str, Any]) -> None:
        log.info(
            f"add_inspiration {idx}/{_max}: {pick['title']}",
            url=pick["url"],
            image=pick.get("image"),
        )

    log.ai_call_start(model=cfg.model, task="find_inspiration", place_id=place_id)
    t0 = time.monotonic()
    try:
        return await inspiration_agent.run_agent(
            agent_prompt=agent_prompt,
            start_url=start_url,
            model=cfg.model,
            api_key=api_key,
            max_picks=cfg.max_picks,
            max_steps=cfg.max_steps,
            shot_dir=shot_dir,
            base_dir=_SCREENSHOTS_DIR,
            headless=True,
            on_warn=_on_warn,
            on_pick=_on_pick,
        )
    finally:
        log.ai_call_done(duration_ms=(time.monotonic() - t0) * 1000)


def _screenshot_dir_for(place_id: str | None, run_id: str) -> Path:
    if place_id:
        return _SCREENSHOTS_DIR / place_id / "inspirations" / run_id
    return _SCREENSHOTS_DIR / "_inspirations" / run_id


# -----------------------------------------------------------------------------
# Persistence
# -----------------------------------------------------------------------------


def _persist_place_result(
    *,
    place_id: str,
    task: str,
    output_field: str,
    picks: list[dict[str, Any]],
    model: str,
    run_id: str,
) -> None:
    with session() as c:
        places.set_dynamic(c, place_id, output_field, picks)
        ai_outputs_log.append(
            c,
            place_id=place_id,
            task=task,
            value=picks,
            model=model,
            run_id=run_id,
        )
