"""Worker entrypoint. Polls the `jobs` table, dispatches to handlers.

Runs as a separate process from the FastAPI API. Survives API restarts. Single
worker is enough for a Pi; concurrency would require lock changes.

Each iteration:
  - claim_next() atomically picks a queued job
  - import + call the matching handler in `workers.handlers.<kind>`
  - logger pushes structured events to job_logs AND to the API via UDS
  - on exception: log error, mark job failed
  - on cancel_requested: mark cancelled, return
  - on normal return: mark done with handler's summary
"""
from __future__ import annotations

import importlib
import logging
import os
import signal
import time
from typing import Any, Protocol

from db.connection import connect
from db.repos import jobs as jobs_repo
from workers.log_sink import WorkerSink
from workers.logger import JobLogger

logger = logging.getLogger("backend.worker")
logging.basicConfig(level=os.environ.get("BACKEND_LOG_LEVEL", "INFO"))


class Handler(Protocol):
    def run(self, args: dict[str, Any], log: JobLogger) -> dict[str, Any] | None: ...


_HANDLER_CACHE: dict[str, Handler] = {}


def _load_handler(kind: str) -> Handler:
    if kind in _HANDLER_CACHE:
        return _HANDLER_CACHE[kind]
    try:
        mod = importlib.import_module(f"workers.handlers.{kind}")
    except ImportError as e:
        raise RuntimeError(f"unknown job kind {kind!r}: {e}") from e
    if not hasattr(mod, "run"):
        raise RuntimeError(f"handler {kind!r} has no run(args, log) function")
    _HANDLER_CACHE[kind] = mod  # type: ignore[assignment]
    return mod  # type: ignore[return-value]


_should_exit = False


def _on_signal(signum: int, _frame: Any) -> None:
    global _should_exit
    logger.info("got signal %s, finishing current job and exiting", signum)
    _should_exit = True


def _run_one(sink: WorkerSink) -> bool:
    """Try to claim and run one job. Returns True if a job was processed."""
    conn = connect()
    try:
        job = jobs_repo.claim_next(conn)
        if job is None:
            return False
    finally:
        conn.close()

    job_id = job["id"]
    kind = job["kind"]
    args = job["args"] or {}

    # Each job gets its own connection so we don't share state across jobs.
    conn = connect()
    log = JobLogger(conn, job_id, notify=sink.push)
    try:
        handler = _load_handler(kind)
        log.started(kind=kind, args=args)
        # Cancellation check helper passed to handlers.
        def is_cancelled() -> bool:
            return jobs_repo.is_cancel_requested(conn, job_id)

        # Inject the cancel check into args. Handlers that care will read
        # `args["__cancel__"]()` at iteration boundaries.
        run_args = dict(args)
        run_args["__cancel__"] = is_cancelled

        result = handler.run(run_args, log)  # type: ignore[attr-defined]

        if is_cancelled():
            log.cancelled()
            jobs_repo.mark_cancelled(conn, job_id)
        else:
            log.finished(summary=result if isinstance(result, dict) else None)
            jobs_repo.mark_done(conn, job_id, result=result if isinstance(result, dict) else None)
    except Exception as e:  # noqa: BLE001 - we want to swallow and record
        log.error(e, context={"kind": kind})
        jobs_repo.mark_failed(conn, job_id, error=f"{type(e).__name__}: {e}")
    finally:
        conn.close()
    return True


def main() -> int:
    signal.signal(signal.SIGINT, _on_signal)
    signal.signal(signal.SIGTERM, _on_signal)
    sink = WorkerSink()
    logger.info("worker started; polling jobs table")
    poll_interval = float(os.environ.get("BACKEND_POLL_INTERVAL", "1.0"))
    while not _should_exit:
        try:
            did_work = _run_one(sink)
        except Exception:
            logger.exception("worker loop crashed; sleeping before retry")
            did_work = False
        if not did_work and not _should_exit:
            time.sleep(poll_interval)
    logger.info("worker exiting")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
