"""Helper for handlers that wrap an existing `mapsLeadsFetcher/*.py` script.

The legacy scripts already emit NDJSON events on stdout via `--json-events`.
We parse each line, route it to `JobLogger` so it lands in `job_logs` + the
SSE stream, and surface non-JSON stderr as `warn` events.

This lets us run AI tasks / crawls / html_to_md jobs on the new queue with full
real-time observability *without* rewriting 2000+ lines of script code today.
Each script can be ported in-process later when convenient.
"""
from __future__ import annotations

import json
import os
import subprocess
import threading
from pathlib import Path
from typing import Any, Callable

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_MLF = _REPO_ROOT / "mapsLeadsFetcher"


def run_legacy_script(
    *,
    script: str,
    cli_args: list[str],
    log,  # JobLogger
    is_cancelled: Callable[[], bool],
    extra_env: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Spawn `uv run <script> --json-events --run-id <job_id> <cli_args...>` from
    `mapsLeadsFetcher/`, stream events into the logger, and return a summary.

    Cancellation: when `is_cancelled()` returns True at the next stdout-line
    boundary, we SIGTERM the child and let the handler return.
    """
    cmd = ["uv", "run", script, "--json-events", "--run-id", log.job_id, *cli_args]
    env = dict(os.environ)
    if extra_env:
        env.update(extra_env)

    log.info(f"spawning {script}", cmd=cmd[:6] + ["…"] if len(cmd) > 6 else cmd)

    proc = subprocess.Popen(
        cmd,
        cwd=str(_MLF),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )

    summary: dict[str, Any] = {"events_seen": 0, "exit_code": None}
    stderr_tail: list[str] = []

    def _stderr_pump() -> None:
        assert proc.stderr is not None
        for line in proc.stderr:
            line = line.rstrip()
            if not line:
                continue
            stderr_tail.append(line)
            if len(stderr_tail) > 200:
                stderr_tail.pop(0)
            log.warn(line[:1000], source="stderr")

    err_thread = threading.Thread(target=_stderr_pump, daemon=True)
    err_thread.start()

    cancelled = False
    try:
        assert proc.stdout is not None
        for raw in proc.stdout:
            line = raw.rstrip("\n")
            if not line:
                continue
            summary["events_seen"] = summary["events_seen"] + 1
            try:
                evt = json.loads(line)
            except json.JSONDecodeError:
                log.info(line[:2000], source="stdout")
                continue
            _forward(evt, log)
            if is_cancelled() and not cancelled:
                cancelled = True
                log.warn("cancellation requested; terminating subprocess")
                try:
                    proc.terminate()
                except ProcessLookupError:
                    pass
    finally:
        rc = proc.wait()
        err_thread.join(timeout=2.0)
        summary["exit_code"] = rc
        if rc != 0 and not cancelled:
            tail = "\n".join(stderr_tail[-20:])
            raise RuntimeError(f"{script} exited with code {rc}\n--- stderr tail ---\n{tail}")

    return summary


def _forward(evt: dict[str, Any], log) -> None:
    """Route a legacy NDJSON event to a JobLogger method.

    The legacy scripts use freeform `type` strings; we map a few of the
    common ones to our typed taxonomy and let the rest fall through as
    `info` log entries with the original payload intact.
    """
    t = evt.get("type") or "log"
    msg = evt.get("message") or ""
    if t == "started":
        log.started(**{k: v for k, v in evt.items() if k not in {"type"}})
        return
    if t == "progress":
        log.progress(
            done=int(evt.get("done") or 0),
            total=evt.get("total"),
            **{k: v for k, v in evt.items() if k not in {"type", "done", "total"}},
        )
        return
    if t == "item_start":
        log.item_start(
            place_id=str(evt.get("place_id") or ""),
            name=evt.get("place_name") or evt.get("name"),
            **{k: v for k, v in evt.items() if k not in {"type", "place_id", "place_name", "name"}},
        )
        return
    if t == "item_done" or t == "item_ok":
        try:
            dur = float(evt.get("duration_ms") or 0)
        except (TypeError, ValueError):
            dur = 0.0
        log.item_done(
            place_id=str(evt.get("place_id") or ""),
            duration_ms=dur,
            outputs={k: v for k, v in evt.items() if k not in {"type", "place_id", "duration_ms"}},
        )
        return
    if t in ("error", "spawn_error", "task_error"):
        log.warn(msg or str(evt), **evt)
        return
    if t == "process_exit":
        return  # handled by exit_code
    if t == "finished" or t == "done":
        log.info("subprocess finished", **{k: v for k, v in evt.items() if k != "type"})
        return
    # Default: keep the raw payload around so nothing is lost.
    log.info(msg or t, type=t, **{k: v for k, v in evt.items() if k not in {"type", "message"}})
