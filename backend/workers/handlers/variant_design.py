"""`variant_design` job handler — submits design_prompt on variant.com via Patchright.

Per-place:
  args = {task: "variant_design", place_ids: [pid, ...]}
  Reads `design_prompt` from places.dynamic, runs browser automation, persists
  `variant_design` object (url + captured iframe HTML paths).
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from db.connection import session
from db.repos import ai_outputs_log, ai_runs, ai_tasks, fields as fields_repo, places
from workers.handlers import variant_browser

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_SCREENSHOTS_DIR = Path(
    os.environ.get("AUTOSITES_SCREENSHOTS_DIR")
    or _REPO_ROOT / "mapsLeadsFetcher" / "screenshots"
).resolve()

DEFAULT_TASK_NAME = "variant_design"
DEFAULT_OUTPUT_FIELD = "variant_design"


@dataclass
class _Config:
    task_name: str
    place_ids: list[str]
    output_field: str
    projects_url: str
    generation_timeout_s: float
    headless: bool


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001
    cfg = _resolve_config(args)
    log.started(
        task=cfg.task_name,
        place_ids_count=len(cfg.place_ids),
        output_field=cfg.output_field,
        projects_url=cfg.projects_url,
    )

    is_cancelled = args["__cancel__"] if callable(args.get("__cancel__")) else (lambda: False)

    results_by_place: dict[str, dict[str, Any]] = {}
    log.progress(done=0, total=len(cfg.place_ids))

    for idx, place_id in enumerate(cfg.place_ids, start=1):
        if is_cancelled():
            log.cancelled(at_item=place_id)
            break

        place_row = _load_place(place_id)
        place_label = (place_row or {}).get("name") or place_id
        prompt = _prompt_for_place(place_row, args)

        if not prompt.strip():
            log.warn(f"skip {place_id}: empty design_prompt", place_id=place_id)
            log.progress(done=idx, total=len(cfg.place_ids))
            continue

        log.item_start(place_id=place_id, name=place_label, prompt_len=len(prompt))
        t0 = time.monotonic()

        def _on_url(url: str) -> None:
            partial = {
                "url": url,
                "status": "running",
                "designs": [],
                "captured_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]
                + "Z",
            }
            _persist_place_result(
                place_id=place_id,
                task=cfg.task_name,
                output_field=cfg.output_field,
                value=partial,
                run_id=log.job_id,
            )
            log.info("variant chat URL saved", url=url, place_id=place_id)

        try:
            result = variant_browser.run_for_place(
                prompt=prompt,
                place_id=place_id,
                job_id=log.job_id,
                screenshots_dir=_SCREENSHOTS_DIR,
                projects_url=cfg.projects_url,
                generation_timeout_s=cfg.generation_timeout_s,
                headless=cfg.headless,
                is_cancelled=is_cancelled,
                on_url_saved=_on_url,
                on_progress=lambda state: log.info(
                    "waiting for variant generation",
                    place_id=place_id,
                    **(state or {}),
                ),
            )
            value = variant_browser.result_to_dynamic(result)
        except variant_browser.VariantAuthRequired as e:
            log.error(e, context={"place_id": place_id})
            value = {
                "url": None,
                "status": "failed",
                "designs": [],
                "error": str(e),
            }
        except Exception as e:  # noqa: BLE001
            log.error(e, context={"place_id": place_id})
            value = {
                "url": None,
                "status": "failed",
                "designs": [],
                "error": str(e),
            }

        duration_ms = (time.monotonic() - t0) * 1000
        results_by_place[place_id] = value
        _persist_place_result(
            place_id=place_id,
            task=cfg.task_name,
            output_field=cfg.output_field,
            value=value,
            run_id=log.job_id,
        )
        log.item_done(
            place_id=place_id,
            duration_ms=duration_ms,
            outputs={cfg.output_field: value},
            designs_count=len(value.get("designs") or []),
            status=value.get("status"),
        )
        log.progress(done=idx, total=len(cfg.place_ids))

    fields_repo.invalidate()

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
            counts={"places": len(results_by_place)},
        )

    return {
        "task": cfg.task_name,
        "per_place": results_by_place,
    }


def _resolve_config(args: dict[str, Any]) -> _Config:
    task_name = args.get("task") or DEFAULT_TASK_NAME
    place_ids = args.get("place_ids") or []
    if not isinstance(place_ids, list):
        place_ids = [place_ids]

    saved: dict[str, Any] = {}
    with session() as c:
        row = ai_tasks.get(c, task_name)
        if row and isinstance(row.get("config"), dict):
            saved = row["config"]

    output_field = (
        args.get("output_field")
        or saved.get("output_field")
        or DEFAULT_OUTPUT_FIELD
    )
    projects_url = (
        args.get("projects_url")
        or saved.get("start_url")
        or variant_browser.DEFAULT_PROJECTS_URL
    )
    generation_timeout_s = float(
        args.get("generation_timeout_s")
        or saved.get("generation_timeout_s")
        or variant_browser.DEFAULT_GENERATION_TIMEOUT_S
    )
    # Headed by default while testing Variant UI; pass headless=true in job args for prod.
    headless = bool(args.get("headless", False))

    return _Config(
        task_name=task_name,
        place_ids=[str(p) for p in place_ids],
        output_field=str(output_field),
        projects_url=str(projects_url),
        generation_timeout_s=generation_timeout_s,
        headless=headless,
    )


def _load_place(place_id: str) -> dict[str, Any] | None:
    with session() as c:
        return places.get(c, place_id)


def _prompt_for_place(place: dict[str, Any] | None, args: dict[str, Any]) -> str:
    override = args.get("prompt_override")
    if isinstance(override, str) and override.strip():
        return override.strip()
    if not place:
        return ""
    dyn = place.get("dynamic") or {}
    raw = dyn.get("design_prompt") or ""
    return str(raw).strip()


def _preserve_design_flags(
    place: dict[str, Any] | None,
    output_field: str,
    value: dict[str, Any],
) -> dict[str, Any]:
    """Keep user bookmarks when Variant returns new previews for the same html_path."""
    if not place:
        return value
    dyn = place.get("dynamic") or {}
    prev = dyn.get(output_field)
    if not isinstance(prev, dict):
        return value
    prev_designs = prev.get("designs")
    if not isinstance(prev_designs, list):
        return value
    flagged_by_path = {
        str(d["html_path"]): True
        for d in prev_designs
        if isinstance(d, dict) and d.get("flagged") and d.get("html_path")
    }
    if not flagged_by_path:
        return value
    designs = value.get("designs")
    if not isinstance(designs, list):
        return value
    merged = []
    for design in designs:
        if not isinstance(design, dict):
            merged.append(design)
            continue
        row = dict(design)
        path = row.get("html_path")
        if path and flagged_by_path.get(str(path)):
            row["flagged"] = True
        merged.append(row)
    return {**value, "designs": merged}


def _persist_place_result(
    *,
    place_id: str,
    task: str,
    output_field: str,
    value: dict[str, Any],
    run_id: str,
) -> None:
    with session() as c:
        place = places.get(c, place_id)
        value = _preserve_design_flags(place, output_field, value)
        places.set_dynamic(c, place_id, output_field, value)
        ai_outputs_log.append(
            c,
            place_id=place_id,
            task=task,
            value=value,
            run_id=run_id,
        )
