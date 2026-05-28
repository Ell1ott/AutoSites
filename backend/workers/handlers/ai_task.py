"""`ai_task` job handler — runs one configured AI task across selected places.

In-process runtime. Task config lives in the `ai_tasks` table (the DB is the
single source of truth — adding a new task is one row, no script edit). The
runtime in `backend/ai/` loads the screenshot + markdown from disk, expands the
meta_prompt's `{{var}}` placeholders, calls the configured provider/model, and
returns the parsed output. This handler iterates the scope, persists each
result to `places.dynamic.<output_field>`, and streams item_start/item_done
events to the dashboard.

Args:
    task: str                    (required) — name of the task row in `ai_tasks`
    place_ids: list[str]         (optional) — explicit scope; picked places are
                                              always regenerated
    limit: int                   (optional) — when no place_ids, cap at N places
                                              still missing the output_field
    force: bool                  (optional) — regenerate even if output_field set
                                              (always True when place_ids passed)
"""
from __future__ import annotations

import base64
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from ai.runtime import MissingInputError, ProviderError, TaskRunResult, run_task_for_place
from db.connection import session
from db.repos import ai_outputs_log, ai_runs, ai_tasks, fields as fields_repo, places


_DEFAULT_WORKERS = 4
_MAX_WORKERS = 32


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001
    task_name = args.get("task")
    if not isinstance(task_name, str) or not task_name:
        raise ValueError("args.task is required")

    raw_place_ids = args.get("place_ids")
    place_ids: list[str] = []
    if isinstance(raw_place_ids, list) and raw_place_ids:
        place_ids = [str(p) for p in raw_place_ids if isinstance(p, (str, int))]
    force = bool(args.get("force")) or bool(place_ids)
    limit_raw = args.get("limit")
    limit = int(limit_raw) if isinstance(limit_raw, int) or (isinstance(limit_raw, str) and limit_raw.isdigit()) else None

    # ---- resolve task ----------------------------------------------------
    with session() as c:
        task_row = ai_tasks.get(c, task_name)
    if task_row is None:
        raise ValueError(f"unknown ai_task {task_name!r}")
    if task_row.get("task_type", "place") != "place":
        raise ValueError(
            f"ai_task {task_name!r} has task_type={task_row.get('task_type')!r}, "
            "but this handler only runs task_type='place'"
        )
    task_config: dict[str, Any] = task_row.get("config") or {}
    output_field = task_config.get("output_field")
    if not isinstance(output_field, str) or not output_field:
        raise ValueError(f"ai_task {task_name!r} has no output_field configured")
    model = str(task_config.get("model") or "")
    error_field = f"{output_field}_error"

    # ---- resolve scope ---------------------------------------------------
    targets = _select_places(place_ids, output_field, force, limit)
    if not targets:
        log.started(task=task_name, total=0)
        log.info("no places matched scope — nothing to do", task=task_name)
        log.finished(summary={"task": task_name, "processed": 0})
        return {"task": task_name, "processed": 0, "generated": 0, "skipped": 0, "failed": 0}

    workers = max(1, min(int(task_config.get("workers") or _DEFAULT_WORKERS), _MAX_WORKERS))
    log.started(
        task=task_name,
        total=len(targets),
        model=model,
        provider=str(task_config.get("provider") or "gemini"),
        output_field=output_field,
        workers=workers,
    )
    log.progress(done=0, total=len(targets))

    is_cancelled = args["__cancel__"] if callable(args.get("__cancel__")) else (lambda: False)
    counts = {"processed": 0, "generated": 0, "skipped": 0, "failed": 0}

    def _one(place: dict[str, Any]) -> tuple[dict[str, Any], float, TaskRunResult | None, BaseException | None]:
        t0 = time.monotonic()
        try:
            result = run_task_for_place(task_config, place)
            return place, (time.monotonic() - t0) * 1000, result, None
        except BaseException as exc:  # noqa: BLE001
            return place, (time.monotonic() - t0) * 1000, None, exc

    with ThreadPoolExecutor(max_workers=workers, thread_name_prefix=f"ai_task-{task_name}") as ex:
        # Emit item_start eagerly so the dashboard shows what's in flight even
        # before any completes.
        for p in targets:
            log.item_start(place_id=p["place_id"], name=p.get("name"))

        future_to_place = {ex.submit(_one, p): p for p in targets}

        for fut in as_completed(future_to_place):
            if is_cancelled():
                log.cancelled(at_item=future_to_place[fut].get("place_id"))
                # Don't bother waiting on stragglers; the dispatcher will return.
                break
            place, dur_ms, result, err = fut.result()
            pid = place["place_id"]
            counts["processed"] += 1

            if err is None and result is not None:
                log_id = _persist_success(
                    pid,
                    output_field,
                    error_field,
                    result,
                    run_id=log.job_id,
                    duration_ms=int(dur_ms),
                )
                counts["generated"] += 1
                # One inline record per call so the task log can render a
                # collapsible "AI call" block (click → modal with full
                # prompt + screenshot + raw response).
                log.ai_call_record(
                    log_id=log_id,
                    place_id=pid,
                    task=task_name,
                    provider=result.provider,
                    model=result.model,
                    duration_ms=int(dur_ms),
                    has_image=result.image_bytes is not None,
                    prompt_preview=_truncate(result.prompt_text, 240),
                    response_preview=_truncate(result.raw_response, 240),
                    place_name=place.get("name"),
                    output_field=output_field,
                )
                log.item_done(
                    place_id=pid,
                    duration_ms=dur_ms,
                    outputs={output_field: result.value},
                )
            elif isinstance(err, MissingInputError):
                counts["skipped"] += 1
                log.warn(
                    f"skip {pid}: {err}",
                    place_id=pid,
                    name=place.get("name"),
                    reason=str(err),
                )
            elif isinstance(err, ProviderError):
                counts["failed"] += 1
                _persist_failure(pid, error_field, output_field, str(err))
                log.warn(
                    f"failed {pid}: {err}",
                    place_id=pid,
                    name=place.get("name"),
                    error=str(err),
                    error_class=type(err).__name__,
                )
            else:
                counts["failed"] += 1
                _persist_failure(pid, error_field, output_field, f"{type(err).__name__}: {err}")
                log.warn(
                    f"failed {pid}: {type(err).__name__}: {err}",
                    place_id=pid,
                    name=place.get("name"),
                    error=str(err),
                    error_class=type(err).__name__,
                )
            log.progress(done=counts["processed"], total=len(targets))

    # ---- final bookkeeping ----------------------------------------------
    fields_repo.invalidate()
    persist_args = {k: v for k, v in args.items() if not k.startswith("__")}
    with session() as c:
        ai_runs.upsert(
            c,
            run_id=log.job_id,
            task=task_name,
            started_at=None,
            finished_at=None,
            status="ok" if counts["failed"] == 0 else "failed",
            args=persist_args,
            counts=counts,
        )

    summary = {"task": task_name, **counts}
    return summary


# ---------------------------------------------------------------------------
# Scope resolution
# ---------------------------------------------------------------------------


def _select_places(
    explicit_ids: list[str],
    output_field: str,
    force: bool,
    limit: int | None,
) -> list[dict[str, Any]]:
    """Return the place rows to process.

    - With explicit `place_ids`: fetch each (in the given order), always regenerate.
    - Without: scan for places that don't already have `output_field` in
      `dynamic`, capped by `limit`.
    - With `force` and no explicit ids: scan all places (capped by `limit`).
    """
    with session() as c:
        if explicit_ids:
            out: list[dict[str, Any]] = []
            for pid in explicit_ids:
                row = places.get(c, pid)
                if row is not None:
                    out.append(row)
            return out

        if force:
            return places.list_(
                c,
                limit=limit if limit is not None else 1_000_000,
                order_by="name",
                direction="ASC",
            )

        where = f"json_extract(dynamic, '$.{output_field}') IS NULL"
        return places.list_(
            c,
            where_sql=where,
            limit=limit if limit is not None else 1_000_000,
            order_by="name",
            direction="ASC",
        )


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


def _persist_success(
    place_id: str,
    output_field: str,
    error_field: str,
    result: TaskRunResult,
    *,
    run_id: str,
    duration_ms: int,
) -> int:
    image_b64 = (
        base64.b64encode(result.image_bytes).decode("ascii")
        if result.image_bytes is not None
        else None
    )
    with session() as c:
        places.merge_dynamic(c, place_id, {output_field: result.value, error_field: None})
        return ai_outputs_log.append(
            c,
            place_id=place_id,
            task=output_field,
            value=result.value,
            model=result.model or None,
            run_id=run_id,
            prompt_text=result.prompt_text,
            raw_response=result.raw_response,
            image_b64=image_b64,
            provider=result.provider,
            duration_ms=duration_ms,
        )


def _truncate(s: str, n: int) -> str:
    if len(s) <= n:
        return s
    return s[:n] + "…"


def _persist_failure(place_id: str, error_field: str, output_field: str, message: str) -> None:
    with session() as c:
        # Keep the previous output (if any) intact — only set the error field.
        places.set_dynamic(c, place_id, error_field, message)
