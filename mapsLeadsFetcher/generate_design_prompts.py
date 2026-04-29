#!/usr/bin/env python3
"""
For every place in maps_businesses.json that has a root website screenshot and
optional root markdown, send configured inputs to Gemini and store model output
on the place under a task-specific field (e.g. `design_prompt`, `website_overview`).
Errors are stored as `<output_field>_error`.

Task definitions live in `settings.json` under `ai_tasks` (see admin / TypeScript
settings). Legacy files with only top-level `design_prompt` are still read.

Per-task optional keys (same level as ``send_markdown``):

- ``subpage_markdown_mode``: ``"none"`` (default), ``"all"``, or ``"recommended"``.
  When ``send_markdown`` is true, ``"all"`` appends markdown from crawled sub-pages
  (``website_crawl.pages`` with ``markdown_path``, after ``html_to_markdown.py``).
  ``"recommended"`` appends only pages whose URLs match ``path_or_hint`` entries in
  the structured JSON stored on each place (see ``recommended_subpages_field``).
  Requires a prior ``ai_subpages`` (or equivalent) run for ``"recommended"``.
- ``recommended_subpages_field``: place JSON key for that structured output
  (default ``"ai_subpages"``).

Optional structured output: set `response_json_schema` on a task to a JSON Schema
object (Gemini-supported subset). The model then returns JSON; it is stored as
an object under `output_field`. Omit the key for plain text, as before.

Run:

    uv run generate_design_prompts.py [--task TASK_ID] [--input maps_businesses.json] \\
        [--limit N] [--force] [--place-ids id1,id2] [--workers W] \\
        [--run-id <str>] [--json-events] [-v]

`--json-events` emits one NDJSON line per lifecycle event on stdout, for the
admin dashboard's live log stream. Human logs stay on stderr.

Requires GEMINI_API_KEY in the environment (loaded from .env.local / .env).
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import threading
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

from dotenv import load_dotenv
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

DEFAULT_META_PROMPT = (
    "You are looking at a screenshot and markdown extract of a business's "
    "current website. Write a short design brief (3-5 sentences) describing "
    "what *feeling* a redesigned version of this website should evoke. Focus "
    "purely on mood, atmosphere, aesthetic direction, and emotional tone. "
    "Include what the business is about, what it sells, what it does, the "
    "business's name, and a very short resume of what features / types of "
    "info the website has. DO NOT mention specific copy, product names, "
    "addresses, contact details, or other literal page content."
)
DEFAULT_WEBSITE_OVERVIEW_META = (
    "You are given a screenshot and a markdown extract of a business website. "
    "Write a concise general overview (4–8 sentences) of what the website is for, "
    "who it serves, main sections or offerings implied by the layout, and any "
    "notable functional patterns (e.g. booking, shop, menu). Stay high-level; "
    "do not quote specific headlines, prices, addresses, or phone numbers."
)
DEFAULT_MODEL = "gemini-3-flash-preview"
DEFAULT_RECOMMENDED_SUBPAGES_FIELD = "ai_subpages"
SUBPAGE_MARKDOWN_MODES = frozenset({"none", "all", "recommended"})
DEFAULT_SETTINGS: dict[str, Any] = {
    "meta_prompt": DEFAULT_META_PROMPT,
    "model": DEFAULT_MODEL,
    "send_screenshot": True,
    "send_markdown": True,
    "subpage_markdown_mode": "none",
    "recommended_subpages_field": DEFAULT_RECOMMENDED_SUBPAGES_FIELD,
}
MAX_RUNS = 50
DEFAULT_TASK_ID = "design_prompt"
DEFAULT_WORKERS = 4
MIN_WORKERS = 1
MAX_WORKERS = 32

_thread_genai_client = threading.local()


def _get_thread_genai_client() -> genai.Client:
    c = getattr(_thread_genai_client, "client", None)
    if c is None:
        c = genai.Client()
        _thread_genai_client.client = c
    return c


def _places(record: dict[str, Any]) -> list[dict[str, Any]]:
    api = record.get("api_response")
    if not isinstance(api, dict):
        return []
    raw = api.get("places")
    if not isinstance(raw, list):
        return []
    return [p for p in raw if isinstance(p, dict)]


def _default_task_for_id(task_id: str) -> dict[str, Any]:
    base = dict(DEFAULT_SETTINGS)
    if task_id == "design_prompt":
        return {
            "label": "Design brief",
            "output_field": "design_prompt",
            **base,
        }
    if task_id == "website_overview":
        return {
            **base,
            "label": "Website overview",
            "output_field": "website_overview",
            "meta_prompt": DEFAULT_WEBSITE_OVERVIEW_META,
        }
    label = task_id.replace("_", " ").strip().title() or task_id
    return {"label": label, "output_field": task_id, **base}


def _merge_task(task_id: str, partial: Optional[dict[str, Any]]) -> dict[str, Any]:
    out = _default_task_for_id(task_id)
    if not partial:
        return out
    for k in (
        "meta_prompt",
        "model",
        "send_screenshot",
        "send_markdown",
        "subpage_markdown_mode",
        "recommended_subpages_field",
    ):
        if k in partial and partial[k] is not None:
            out[k] = partial[k]
    if "response_json_schema" in partial:
        rjs = partial["response_json_schema"]
        if isinstance(rjs, dict):
            out["response_json_schema"] = rjs
        elif rjs is None:
            out.pop("response_json_schema", None)
    lab = partial.get("label")
    if isinstance(lab, str) and lab.strip():
        out["label"] = lab.strip()
    of = partial.get("output_field")
    if isinstance(of, str) and of.strip():
        out["output_field"] = of.strip()
    out["send_screenshot"] = bool(out["send_screenshot"])
    out["send_markdown"] = bool(out["send_markdown"])
    sm = str(out.get("subpage_markdown_mode") or "none").strip().lower()
    if sm not in SUBPAGE_MARKDOWN_MODES:
        sm = "none"
    out["subpage_markdown_mode"] = sm
    rsf = str(out.get("recommended_subpages_field") or "").strip()
    if not rsf:
        rsf = DEFAULT_RECOMMENDED_SUBPAGES_FIELD
    out["recommended_subpages_field"] = rsf
    return out


def _read_settings_file(base_dir: Path) -> dict[str, Any]:
    settings_path = base_dir / "settings.json"
    if not settings_path.is_file():
        return {
            "ai_tasks": {"design_prompt": _default_task_for_id("design_prompt")},
            "ai_task_order": ["design_prompt"],
        }
    try:
        with settings_path.open(encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        logger.warning("settings.json unreadable (%s); using defaults", exc)
        return {
            "ai_tasks": {"design_prompt": _default_task_for_id("design_prompt")},
            "ai_task_order": ["design_prompt"],
        }
    if not isinstance(data, dict):
        return {
            "ai_tasks": {"design_prompt": _default_task_for_id("design_prompt")},
            "ai_task_order": ["design_prompt"],
        }
    if isinstance(data.get("ai_tasks"), dict) and data["ai_tasks"]:
        return data
    legacy = data.get("design_prompt")
    if isinstance(legacy, dict):
        merged = _merge_task("design_prompt", legacy)
        return {"ai_tasks": {"design_prompt": merged}, "ai_task_order": ["design_prompt"]}
    return {
        "ai_tasks": {"design_prompt": _default_task_for_id("design_prompt")},
        "ai_task_order": ["design_prompt"],
    }


def _assert_unique_outputs(tasks: dict[str, dict[str, Any]]) -> None:
    seen: dict[str, str] = {}
    for tid, t in tasks.items():
        field = str(t.get("output_field") or tid).strip() or tid
        if field in seen:
            raise ValueError(
                f'Duplicate output_field "{field}" on tasks "{seen[field]}" and "{tid}"'
            )
        seen[field] = tid


def _load_all_tasks(base_dir: Path) -> dict[str, dict[str, Any]]:
    raw = _read_settings_file(base_dir)
    raw_tasks = raw.get("ai_tasks")
    if not isinstance(raw_tasks, dict):
        raw_tasks = {}
    tasks: dict[str, dict[str, Any]] = {}
    for tid in raw_tasks.keys():
        block = raw_tasks.get(tid)
        if isinstance(block, dict):
            tasks[tid] = _merge_task(tid, block)
    if not tasks:
        tasks["design_prompt"] = _default_task_for_id("design_prompt")
    _assert_unique_outputs(tasks)
    return tasks


def _validate_core(t: dict[str, Any]) -> None:
    if not isinstance(t.get("meta_prompt"), str) or not str(t["meta_prompt"]).strip():
        raise ValueError("task meta_prompt must be a non-empty string")
    if not isinstance(t.get("model"), str) or not str(t["model"]).strip():
        raise ValueError("task model must be a non-empty string")
    if not (bool(t.get("send_screenshot")) or bool(t.get("send_markdown"))):
        raise ValueError(
            "At least one of send_screenshot / send_markdown must be true for this task"
        )
    rjs = t.get("response_json_schema")
    if rjs is not None and not isinstance(rjs, dict):
        raise ValueError("task response_json_schema must be a JSON object (dict) when set")
    sm = str(t.get("subpage_markdown_mode") or "none").strip().lower()
    if sm not in SUBPAGE_MARKDOWN_MODES:
        raise ValueError(
            f'task subpage_markdown_mode must be one of: {", ".join(sorted(SUBPAGE_MARKDOWN_MODES))}'
        )
    rsf = t.get("recommended_subpages_field")
    if not isinstance(rsf, str) or not rsf.strip():
        raise ValueError("task recommended_subpages_field must be a non-empty string")


def _resolved_task(base_dir: Path, task_id: str) -> dict[str, Any]:
    tasks = _load_all_tasks(base_dir)
    if task_id not in tasks:
        known = ", ".join(sorted(tasks))
        raise ValueError(f'Unknown task "{task_id}". Known tasks: {known}')
    t = dict(tasks[task_id])
    out_field = str(t.get("output_field") or task_id).strip() or task_id
    t["output_field"] = out_field
    t["error_field"] = f"{out_field}_error"
    t["task_id"] = task_id
    _validate_core(t)
    return t


def _snapshot_for_run(t: dict[str, Any]) -> dict[str, Any]:
    snap: dict[str, Any] = {
        "label": t["label"],
        "output_field": t["output_field"],
        "meta_prompt": t["meta_prompt"],
        "model": t["model"],
        "send_screenshot": t["send_screenshot"],
        "send_markdown": t["send_markdown"],
        "subpage_markdown_mode": t["subpage_markdown_mode"],
        "recommended_subpages_field": t["recommended_subpages_field"],
    }
    rjs = t.get("response_json_schema")
    if isinstance(rjs, dict):
        snap["response_json_schema"] = rjs
    return snap


def _place_has_output(val: Any) -> bool:
    if isinstance(val, str):
        return bool(val.strip())
    if isinstance(val, dict):
        return bool(val)
    if isinstance(val, list):
        return bool(val)
    return False


def _after_for_log(result: str | dict[str, Any]) -> str:
    if isinstance(result, dict):
        return json.dumps(result, ensure_ascii=False)
    return result


def _generate_prompt(
    client: genai.Client,
    *,
    model: str,
    meta_prompt: str,
    png_bytes: Optional[bytes],
    markdown_text: Optional[str],
    response_json_schema: Optional[dict[str, Any]] = None,
) -> str | dict[str, Any]:
    contents: list[Any] = []
    if png_bytes is not None:
        contents.append(types.Part.from_bytes(data=png_bytes, mime_type="image/png"))
    if markdown_text is not None:
        contents.append(f"Website markdown extract:\n\n{markdown_text}")
    contents.append(meta_prompt)
    config: Optional[types.GenerateContentConfig] = None
    if response_json_schema:
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=response_json_schema,
        )
    response = client.models.generate_content(
        model=model, contents=contents, config=config
    )
    if response_json_schema:
        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, dict):
            return parsed
        if parsed is not None and hasattr(parsed, "model_dump"):
            dumped = parsed.model_dump(mode="json")
            if isinstance(dumped, dict):
                return dumped
        text = response.text
        if isinstance(text, str) and text.strip():
            try:
                obj = json.loads(text)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Gemini returned non-JSON text: {exc}") from exc
            if isinstance(obj, dict):
                return obj
            raise ValueError("Gemini structured response must be a JSON object")
        raise ValueError("Gemini returned empty structured response")
    text = response.text
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Gemini returned empty response")
    return text.strip()


def _emit_event(
    enabled: bool,
    event_type: str,
    payload: dict[str, Any],
    *,
    line_lock: Optional[threading.Lock] = None,
) -> None:
    if not enabled:
        return
    obj: dict[str, Any] = {"type": event_type}
    obj.update(payload)
    line = json.dumps(obj, ensure_ascii=False) + "\n"
    if line_lock is not None:
        with line_lock:
            print(line, end="", flush=True)
    else:
        print(line, end="", flush=True)


def _place_label(place: dict[str, Any]) -> str:
    display = place.get("displayName")
    if isinstance(display, dict):
        text = display.get("text")
        if isinstance(text, str) and text.strip():
            return text.strip()
    pid = place.get("id")
    if isinstance(pid, str) and pid.strip():
        return pid
    return "<unknown>"


def _now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )


def _write_run_entry(base_dir: Path, entry: dict[str, Any]) -> None:
    runs_path = base_dir / "runs.json"
    doc: dict[str, Any] = {"runs": []}
    if runs_path.is_file():
        try:
            with runs_path.open(encoding="utf-8") as f:
                loaded = json.load(f)
            if isinstance(loaded, dict) and isinstance(loaded.get("runs"), list):
                doc = loaded
        except Exception as exc:
            logger.warning("runs.json unreadable (%s); starting fresh", exc)
    runs = list(doc.get("runs", []))
    runs.append(entry)
    runs = runs[-MAX_RUNS:]
    doc["runs"] = runs
    tmp = runs_path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(doc, f, indent=2, ensure_ascii=False)
        f.write("\n")
    tmp.replace(runs_path)


def _persist_maps_json(json_path: Path, record: dict[str, Any]) -> None:
    """Atomic write so partial files are never left if the process is interrupted mid-write."""
    tmp = json_path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(record, f, indent=2, ensure_ascii=False)
        f.write("\n")
    tmp.replace(json_path)


def _parse_place_ids(raw: str) -> list[str]:
    ids = [x.strip() for x in raw.split(",") if x.strip()]
    if not ids:
        raise ValueError("--place-ids must contain at least one non-empty id")
    return ids


def _host_key(hostname: str | None) -> str:
    if not hostname:
        return ""
    h = hostname.lower()
    return h[4:] if h.startswith("www.") else h


def _norm_url_path(path: str) -> str:
    p = (path or "/").strip() or "/"
    if not p.startswith("/"):
        p = "/" + p
    s = p.rstrip("/")
    return s if s else "/"


def _hint_matches_page(hint_raw: str, page: dict[str, Any]) -> bool:
    hint = hint_raw.strip()
    if not hint:
        return False
    urls: list[str] = []
    for key in ("url_final", "url_requested"):
        u = page.get(key)
        if isinstance(u, str) and u.strip():
            urls.append(u.strip())
    if not urls:
        return False
    if hint.lower().startswith(("http://", "https://")):
        ph = urlparse(hint)
        hint_host = _host_key(ph.hostname)
        hint_path = _norm_url_path(ph.path or "/")
    else:
        hint_host = None
        hint_path = _norm_url_path(hint if hint.startswith("/") else "/" + hint)
    for u in urls:
        pu = urlparse(u)
        page_host = _host_key(pu.hostname)
        page_path = _norm_url_path(pu.path or "/")
        if hint_host is not None and page_host != hint_host:
            continue
        if page_path == hint_path or (
            hint_path != "/" and page_path.startswith(hint_path + "/")
        ):
            return True
    return False


def _root_markdown_rel(screenshot_rel: str) -> str:
    return Path(screenshot_rel).with_suffix(".md").as_posix()


def _is_home_crawl_row(page: dict[str, Any], root_screenshot_rel: str) -> bool:
    rs = root_screenshot_rel.strip()
    sp = page.get("screenshot_path")
    if isinstance(sp, str) and sp.strip() == rs:
        return True
    root_md = _root_markdown_rel(rs)
    mp = page.get("markdown_path")
    if isinstance(mp, str) and mp.strip() == root_md:
        return True
    return False


def _crawl_subpage_rows(place: dict[str, Any], root_screenshot_rel: str) -> list[dict[str, Any]]:
    wc = place.get("website_crawl")
    if not isinstance(wc, dict):
        return []
    raw = wc.get("pages")
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for p in raw:
        if not isinstance(p, dict):
            continue
        if _is_home_crawl_row(p, root_screenshot_rel):
            continue
        out.append(p)
    return out


def _recommended_subpage_hints(place: dict[str, Any], field: str) -> list[dict[str, Any]]:
    raw = place.get(field)
    if not isinstance(raw, dict):
        return []
    subs = raw.get("subpages")
    if not isinstance(subs, list):
        return []
    return [x for x in subs if isinstance(x, dict)]


def _compose_markdown_with_subpages(
    *,
    base_dir: Path,
    place: dict[str, Any],
    root_markdown: str,
    root_screenshot_rel: str,
    subpage_mode: str,
    recommended_field: str,
    log_prefix: str,
) -> tuple[str, list[dict[str, Any]]]:
    if subpage_mode == "none":
        return root_markdown, []
    rows = _crawl_subpage_rows(place, root_screenshot_rel)
    if subpage_mode == "recommended":
        hints = _recommended_subpage_hints(place, recommended_field)
        if not hints:
            logger.warning(
                "%s — subpage_markdown_mode=recommended but %r has no subpages; using root only",
                log_prefix,
                recommended_field,
            )
            return root_markdown, []
        selected: list[dict[str, Any]] = []
        used_indices: set[int] = set()
        for h in hints:
            poh = h.get("path_or_hint")
            if not isinstance(poh, str) or not poh.strip():
                continue
            for idx, page in enumerate(rows):
                if idx in used_indices:
                    continue
                if _hint_matches_page(poh, page):
                    selected.append(page)
                    used_indices.add(idx)
                    break
        rows = selected
    chunks: list[tuple[str, str, str]] = []
    for page in rows:
        mrel = page.get("markdown_path")
        if not isinstance(mrel, str) or not mrel.strip():
            logger.warning(
                "%s — crawl page has no markdown_path (%s)",
                log_prefix,
                page.get("url_final") or page.get("url_requested"),
            )
            continue
        mrel_s = mrel.strip()
        mpath = (base_dir / mrel_s).resolve()
        if not mpath.is_file():
            logger.warning("%s — subpage markdown missing: %s", log_prefix, mpath)
            continue
        title = page.get("url_final") or page.get("url_requested") or mrel_s
        chunks.append((mrel_s, str(title), mpath.read_text(encoding="utf-8")))
    if not chunks:
        return root_markdown, []
    manifest = [{"markdown_path": c[0], "url": c[1]} for c in chunks]
    parts = [
        root_markdown.rstrip(),
        "",
        "---",
        "",
        "Additional subpage markdown:",
        "",
    ]
    for _mrel, title, text in chunks:
        parts.append(f"### {title}")
        parts.append("")
        parts.append(text.strip())
        parts.append("")
    return "\n".join(parts).rstrip(), manifest


def _inputs_used_for_place(
    *,
    screenshot_rel: str,
    send_screenshot: bool,
    send_markdown: bool,
    subpage_manifest: list[dict[str, Any]],
) -> dict[str, Any]:
    rel = screenshot_rel.strip()
    shot: Optional[str] = rel if send_screenshot else None
    md_files: list[dict[str, Any]] = []
    if send_markdown:
        md_files.append({"role": "root", "path": _root_markdown_rel(rel)})
        for sp in subpage_manifest:
            mp = sp.get("markdown_path")
            if not isinstance(mp, str) or not mp.strip():
                continue
            url = sp.get("url")
            entry: dict[str, Any] = {"role": "subpage", "path": mp.strip()}
            if isinstance(url, str) and url.strip():
                entry["url"] = url.strip()
            else:
                entry["url"] = None
            md_files.append(entry)
    return {"screenshot_path": shot, "markdown_files": md_files}


@dataclass(frozen=True)
class _PlaceWorkItem:
    place: dict[str, Any]
    place_id: str
    name: str
    index: int
    total: int
    existing_for_compare: Optional[str]
    screenshot_rel: str
    log_prefix: str


@dataclass
class _PlaceWorkOutcome:
    place_id: str
    name: str
    index: int
    total: int
    log_prefix: str
    success: bool
    result: str | dict[str, Any] | None
    err: Optional[str]
    existing_for_compare: Optional[str]
    inputs_used: Optional[dict[str, Any]]


def _run_place_ai_job(
    wi: _PlaceWorkItem,
    *,
    base_dir: Path,
    settings: dict[str, Any],
) -> _PlaceWorkOutcome:
    place = wi.place
    prefix = wi.log_prefix
    label = wi.name
    inputs_used: Optional[dict[str, Any]] = None
    try:
        screenshot_rel = wi.screenshot_rel
        screenshot_path = (base_dir / screenshot_rel).resolve()
        png_bytes: Optional[bytes] = (
            screenshot_path.read_bytes() if settings["send_screenshot"] else None
        )
        markdown_text: Optional[str] = None
        subpage_manifest: list[dict[str, Any]] = []
        if settings["send_markdown"]:
            md_path = screenshot_path.with_suffix(".md")
            root_md = md_path.read_text(encoding="utf-8")
            sp_mode = str(settings["subpage_markdown_mode"])
            markdown_text, subpage_manifest = _compose_markdown_with_subpages(
                base_dir=base_dir,
                place=place,
                root_markdown=root_md,
                root_screenshot_rel=screenshot_rel.strip(),
                subpage_mode=sp_mode,
                recommended_field=str(settings["recommended_subpages_field"]),
                log_prefix=f"{prefix} {label}",
            )
        inputs_used = _inputs_used_for_place(
            screenshot_rel=screenshot_rel.strip(),
            send_screenshot=bool(settings["send_screenshot"]),
            send_markdown=bool(settings["send_markdown"]),
            subpage_manifest=subpage_manifest,
        )
        logger.info(
            "%s %s — generating (png %s, md %s)",
            prefix,
            label,
            f"{len(png_bytes)} bytes" if png_bytes is not None else "skipped",
            f"{len(markdown_text)} chars" if markdown_text is not None else "skipped",
        )
        rjs = settings.get("response_json_schema")
        schema = rjs if isinstance(rjs, dict) else None
        client = _get_thread_genai_client()
        result = _generate_prompt(
            client,
            model=settings["model"],
            meta_prompt=settings["meta_prompt"],
            png_bytes=png_bytes,
            markdown_text=markdown_text,
            response_json_schema=schema,
        )
        return _PlaceWorkOutcome(
            place_id=wi.place_id,
            name=label,
            index=wi.index,
            total=wi.total,
            log_prefix=prefix,
            success=True,
            result=result,
            err=None,
            existing_for_compare=wi.existing_for_compare,
            inputs_used=inputs_used,
        )
    except Exception as exc:
        return _PlaceWorkOutcome(
            place_id=wi.place_id,
            name=label,
            index=wi.index,
            total=wi.total,
            log_prefix=prefix,
            success=False,
            result=None,
            err=f"{type(exc).__name__}: {exc}",
            existing_for_compare=wi.existing_for_compare,
            inputs_used=inputs_used,
        )


def _apply_place_outcome(
    place: dict[str, Any],
    *,
    out_field: str,
    err_field: str,
    outcome: _PlaceWorkOutcome,
) -> None:
    if outcome.success and outcome.result is not None:
        place[out_field] = outcome.result
        place.pop(err_field, None)
    else:
        err = outcome.err or "Unknown error"
        place[err_field] = err
        place.pop(out_field, None)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Run a configured AI task per place in maps_businesses.json using Gemini."
        ),
    )
    parser.add_argument(
        "--task",
        type=str,
        default=DEFAULT_TASK_ID,
        help=f"Task id from settings.json ai_tasks (default: {DEFAULT_TASK_ID})",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("maps_businesses.json"),
        help="Path to maps_businesses.json",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of successful generations this run (default: unlimited)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if this task's output field is already set",
    )
    parser.add_argument(
        "--place-ids",
        type=str,
        default=None,
        help=(
            "Comma-separated list of place IDs to restrict to. "
            "Picked places are always regenerated."
        ),
    )
    parser.add_argument(
        "--run-id",
        type=str,
        default=None,
        help="Optional externally-supplied run id. Generated if omitted.",
    )
    parser.add_argument(
        "--json-events",
        action="store_true",
        help="Emit NDJSON lifecycle events on stdout (for the admin dashboard)",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Log debug detail")
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        metavar="W",
        help=(
            f"Number of places to call Gemini for in parallel (default: {DEFAULT_WORKERS}, "
            f"max: {MAX_WORKERS}). With --limit, batch size is capped so the success cap "
            "is never exceeded in one wave."
        ),
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stderr,
    )

    load_dotenv(".env.local")
    load_dotenv()

    if not os.environ.get("GEMINI_API_KEY"):
        logger.error("GEMINI_API_KEY is not set. Add it to .env.local or export it.")
        sys.exit(1)

    if args.limit is not None and args.limit < 1:
        logger.error("--limit must be at least 1")
        sys.exit(2)

    if args.workers < MIN_WORKERS or args.workers > MAX_WORKERS:
        logger.error("--workers must be between %d and %d", MIN_WORKERS, MAX_WORKERS)
        sys.exit(2)

    task_id = args.task.strip()
    if not task_id:
        logger.error("--task must be non-empty")
        sys.exit(2)

    json_path = args.input.resolve()
    if not json_path.is_file():
        logger.error("Input JSON not found: %s", json_path)
        sys.exit(1)

    base_dir = json_path.parent
    events_on = args.json_events
    run_id = args.run_id or f"{_now_iso()}-{os.urandom(3).hex()}"

    try:
        settings = _resolved_task(base_dir, task_id)
    except ValueError as exc:
        logger.error("Invalid settings: %s", exc)
        sys.exit(1)

    out_field = settings["output_field"]
    err_field = settings["error_field"]
    snap = _snapshot_for_run(settings)

    picked_ids: Optional[set[str]] = None
    if args.place_ids:
        try:
            picked_ids = set(_parse_place_ids(args.place_ids))
        except ValueError as exc:
            logger.error("%s", exc)
            sys.exit(2)

    with json_path.open(encoding="utf-8") as f:
        record = json.load(f)

    places = _places(record)
    logger.info("Found %d place(s) in JSON", len(places))

    if picked_ids is not None:
        scope_mode = "pick"
    elif args.limit is not None:
        scope_mode = "limit"
    else:
        scope_mode = "all-new"

    scope_places = (
        [p for p in places if isinstance(p.get("id"), str) and p["id"] in picked_ids]
        if picked_ids is not None
        else places
    )

    started_at = _now_iso()
    items: list[dict[str, Any]] = []
    counts = {"processed": 0, "generated": 0, "skipped": 0, "failed": 0}
    force_picked = picked_ids is not None
    status = "ok"
    emit_lock = threading.Lock()

    def ev(event_type: str, payload: dict[str, Any]) -> None:
        _emit_event(events_on, event_type, payload, line_lock=emit_lock)

    _emit_event(
        events_on,
        "run_started",
        {
            "runId": run_id,
            "taskId": task_id,
            "total": len(scope_places),
            "scope": {
                "mode": scope_mode,
                "place_ids": sorted(picked_ids) if picked_ids else [],
                "limit": args.limit,
                "force": bool(args.force),
                "workers": args.workers,
                "subpage_markdown_mode": snap["subpage_markdown_mode"],
                "recommended_subpages_field": snap["recommended_subpages_field"],
            },
            "settings": snap,
        },
        line_lock=emit_lock,
    )

    work_queue: deque[_PlaceWorkItem] = deque()
    total_scope = len(scope_places)

    try:
        for i, place in enumerate(scope_places, start=1):
            pid = place.get("id") if isinstance(place.get("id"), str) else f"#{i}"
            label = _place_label(place)
            prefix = f"[{i}/{total_scope}]"

            screenshot_rel = place.get("website_screenshot_path")
            if not isinstance(screenshot_rel, str) or not screenshot_rel.strip():
                counts["skipped"] += 1
                ev("place_skipped", {"placeId": pid, "name": label, "reason": "no_screenshot"})
                logger.debug("%s %s — skip (no website_screenshot_path)", prefix, label)
                continue

            screenshot_path = (base_dir / screenshot_rel).resolve()
            if not screenshot_path.is_file():
                counts["skipped"] += 1
                ev("place_skipped", {"placeId": pid, "name": label, "reason": "no_screenshot"})
                logger.warning(
                    "%s %s — skip (screenshot missing: %s)", prefix, label, screenshot_path
                )
                continue

            md_path = screenshot_path.with_suffix(".md")
            if settings["send_markdown"] and not md_path.is_file():
                counts["skipped"] += 1
                ev("place_skipped", {"placeId": pid, "name": label, "reason": "no_markdown"})
                logger.warning(
                    "%s %s — skip (root markdown missing: %s)", prefix, label, md_path
                )
                continue

            existing_raw = place.get(out_field)
            existing_for_compare = (
                _after_for_log(existing_raw) if _place_has_output(existing_raw) else None
            )

            if existing_for_compare and not args.force and not force_picked:
                counts["skipped"] += 1
                ev("place_skipped", {"placeId": pid, "name": label, "reason": "already_generated"})
                logger.debug("%s %s — skip (%s already set)", prefix, label, out_field)
                continue

            work_queue.append(
                _PlaceWorkItem(
                    place=place,
                    place_id=str(pid),
                    name=label,
                    index=i,
                    total=total_scope,
                    existing_for_compare=existing_for_compare,
                    screenshot_rel=screenshot_rel.strip(),
                    log_prefix=prefix,
                )
            )

        def _one_job(wi: _PlaceWorkItem) -> _PlaceWorkOutcome:
            return _run_place_ai_job(wi, base_dir=base_dir, settings=settings)

        workers_n = min(args.workers, MAX_WORKERS)
        with ThreadPoolExecutor(max_workers=workers_n) as executor:
            while work_queue and (args.limit is None or counts["generated"] < args.limit):
                if args.limit is not None:
                    remaining_ok = args.limit - counts["generated"]
                    batch_n = min(workers_n, len(work_queue), max(0, remaining_ok))
                else:
                    batch_n = min(workers_n, len(work_queue))
                if batch_n < 1:
                    break
                batch = [work_queue.popleft() for _ in range(batch_n)]
                for wi in batch:
                    counts["processed"] += 1
                    ev(
                        "place_generating",
                        {
                            "placeId": wi.place_id,
                            "name": wi.name,
                            "index": wi.index,
                            "total": wi.total,
                        },
                    )
                outcomes = list(executor.map(_one_job, batch))
                for wi, out in zip(batch, outcomes):
                    existing_for_compare = wi.existing_for_compare
                    label = wi.name
                    prefix = wi.log_prefix
                    place = wi.place
                    _apply_place_outcome(
                        place,
                        out_field=out_field,
                        err_field=err_field,
                        outcome=out,
                    )
                    if out.success and out.result is not None:
                        counts["generated"] += 1
                        after_log = _after_for_log(out.result)
                        before_log = existing_for_compare
                        items.append(
                            {
                                "place_id": wi.place_id,
                                "place_name": label,
                                "status": "ok",
                                "before": before_log,
                                "after": after_log,
                                "error": None,
                                "inputs_used": out.inputs_used,
                            }
                        )
                        ev(
                            "place_done",
                            {
                                "placeId": wi.place_id,
                                "name": label,
                                "before": before_log,
                                "after": after_log,
                                "inputs_used": out.inputs_used,
                            },
                        )
                        logger.info(
                            "%s %s — ok (%s)",
                            prefix,
                            label,
                            f"{len(after_log)} chars"
                            if isinstance(out.result, str)
                            else "structured JSON",
                        )
                    else:
                        counts["failed"] += 1
                        err = out.err or "Unknown error"
                        item_failed: dict[str, Any] = {
                            "place_id": wi.place_id,
                            "place_name": label,
                            "status": "failed",
                            "before": existing_for_compare,
                            "after": None,
                            "error": err,
                        }
                        if out.inputs_used is not None:
                            item_failed["inputs_used"] = out.inputs_used
                        items.append(item_failed)
                        fail_evt: dict[str, Any] = {
                            "placeId": wi.place_id,
                            "name": label,
                            "error": err,
                        }
                        if out.inputs_used is not None:
                            fail_evt["inputs_used"] = out.inputs_used
                        ev("place_failed", fail_evt)
                        logger.error("%s %s — failed: %s", prefix, label, err)

                    try:
                        _persist_maps_json(json_path, record)
                    except OSError as exc:
                        logger.error("Could not persist %s after %s — %s", json_path, wi.place_id, exc)
                        raise

                if args.limit is not None and counts["generated"] >= args.limit:
                    if work_queue:
                        logger.info(
                            "Reached --limit=%d; not scheduling further generation",
                            args.limit,
                        )
                    break

        if counts["generated"] == 0 and counts["failed"] > 0:
            status = "failed"
        elif counts["failed"] > 0:
            status = "partial"
        else:
            status = "ok"

    finally:
        try:
            _persist_maps_json(json_path, record)
        except OSError as exc:
            logger.error("Final persist failed for %s — %s", json_path, exc)

        finished_at = _now_iso()
        run_entry = {
            "id": run_id,
            "started_at": started_at,
            "finished_at": finished_at,
            "tool": task_id,
            "status": status,
            "settings_snapshot": snap,
            "scope": {
                "mode": scope_mode,
                "place_ids": sorted(picked_ids) if picked_ids else [],
                "limit": args.limit,
                "force": bool(args.force),
                "workers": args.workers,
                "subpage_markdown_mode": snap["subpage_markdown_mode"],
                "recommended_subpages_field": snap["recommended_subpages_field"],
            },
            "counts": counts,
            "items": items,
        }
        try:
            _write_run_entry(base_dir, run_entry)
        except Exception as exc:
            logger.error("Failed to write runs.json entry: %s", exc)

        _emit_event(
            events_on,
            "run_finished",
            {"runId": run_id, "counts": counts, "status": status},
            line_lock=emit_lock,
        )

    logger.info(
        "Done: processed=%d, generated=%d, skipped=%d, failed=%d",
        counts["processed"],
        counts["generated"],
        counts["skipped"],
        counts["failed"],
    )


if __name__ == "__main__":
    main()
