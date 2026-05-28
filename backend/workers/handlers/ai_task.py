"""`ai_task` job handler — runs one AI task across selected places.

Args: `{task: <name>, place_ids: [..]?, limit?, force?, subpage_markdown_mode?}`.

Currently wraps `mapsLeadsFetcher/generate_design_prompts.py` via subprocess so
we get full real-time event streaming without re-implementing 1100+ lines. Later
this can be ported in-process when convenient. After the subprocess finishes,
we sync any new outputs from `maps_businesses.json` into `places.dynamic` so the
new system is the source of truth going forward.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from db.connection import session
from db.repos import ai_outputs_log, ai_runs, places, fields as fields_repo
from workers.handlers._subprocess import run_legacy_script

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_MAPS_JSON = _REPO_ROOT / "mapsLeadsFetcher" / "maps_businesses.json"


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001
    task = args.get("task")
    if not isinstance(task, str) or not task:
        raise ValueError("args.task is required")

    cli: list[str] = ["--task", task]
    place_ids = args.get("place_ids")
    if isinstance(place_ids, list) and place_ids:
        cli.extend(["--place-ids", ",".join(str(p) for p in place_ids)])
    if "limit" in args and args["limit"] is not None:
        cli.extend(["--limit", str(int(args["limit"]))])
    if args.get("force"):
        cli.append("--force")
    subm = args.get("subpage_markdown_mode")
    if isinstance(subm, str) and subm:
        cli.extend(["--subpage-markdown-mode", subm])

    is_cancelled = args["__cancel__"] if callable(args.get("__cancel__")) else (lambda: False)

    log.started(task=task, place_ids_count=len(place_ids) if isinstance(place_ids, list) else None)

    summary = run_legacy_script(
        script="generate_design_prompts.py",
        cli_args=cli,
        log=log,
        is_cancelled=is_cancelled,
    )

    synced = _sync_from_maps_json(task, log)
    summary["synced_outputs"] = synced

    # Record the run row too (the script also appends to its own runs.json; we
    # mirror into ai_runs so /ai-runs queries see it).
    # Strip runner-injected private keys (e.g. __cancel__ callable) before persisting.
    persist_args = {k: v for k, v in args.items() if not k.startswith("__")}
    with session() as c:
        ai_runs.upsert(
            c,
            run_id=log.job_id,
            task=task,
            started_at=None,  # subprocess events carry these; not required here
            finished_at=None,
            status="ok" if summary.get("exit_code") == 0 else "failed",
            args=persist_args,
            counts={"events_seen": summary.get("events_seen")},
        )
    fields_repo.invalidate()
    return summary


def _sync_from_maps_json(task: str, log) -> int:
    """Pull `<task>` values out of maps_businesses.json into `places.dynamic`
    and `ai_outputs_log`. Returns the number of places updated."""
    if not _MAPS_JSON.exists():
        return 0
    try:
        with _MAPS_JSON.open(encoding="utf-8") as f:
            obj = json.load(f)
    except (OSError, json.JSONDecodeError):
        log.warn("could not re-read maps_businesses.json for sync")
        return 0
    items = (obj.get("api_response") or {}).get("places") or []
    n = 0
    with session() as c:
        for p in items:
            pid = p.get("id")
            if not pid or task not in p:
                continue
            row = c.execute("SELECT 1 FROM places WHERE place_id = ?", (pid,)).fetchone()
            if not row:
                continue
            value = p[task]
            places.set_dynamic(c, pid, task, value)
            ai_outputs_log.append(
                c, place_id=pid, task=task, value=value, run_id=log.job_id
            )
            n += 1
    return n
