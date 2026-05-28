"""In-process job dispatcher.

Runs inside the FastAPI process. Started/stopped by the app lifespan. The
enqueue endpoint calls `submit(job_id)` after inserting the row; the dispatcher
loop picks it up immediately, acquires a slot in the concurrency semaphore,
and runs the handler in a threadpool (handlers are sync).

Semantics:
  - max_concurrent jobs run in parallel; the rest sit in a FIFO asyncio.Queue.
  - Handlers are unchanged: `run(args, log) -> dict | None`.
  - Cancellation: the existing `__cancel__` callable is injected into args.
  - On API restart: any still-active rows are reaped to `failed` (or
    `cancelled` if a prior cancel was requested) by `reap_active_on_startup`.
"""
from __future__ import annotations

import asyncio
import importlib
import logging
from typing import Any, Protocol

from db.connection import connect
from db.repos import jobs as jobs_repo
from workers.event_bus import EventBus
from workers.logger import JobLogger

logger = logging.getLogger("backend.dispatcher")


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


class Dispatcher:
    def __init__(self, bus: EventBus, *, max_concurrent: int = 3) -> None:
        self._bus = bus
        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._sem = asyncio.Semaphore(max_concurrent)
        self._loop_task: asyncio.Task[None] | None = None
        self._active: set[asyncio.Task[None]] = set()
        self._stopping = False
        self._max_concurrent = max_concurrent

    # --- lifecycle ----------------------------------------------------------

    async def start(self) -> None:
        if self._loop_task is not None:
            return
        loop = asyncio.get_running_loop()
        self._bus.attach_loop(loop)
        self._loop_task = asyncio.create_task(self._loop(), name="dispatcher-loop")
        logger.info("dispatcher started (max_concurrent=%d)", self._max_concurrent)

    async def stop(self) -> None:
        self._stopping = True
        if self._loop_task is not None:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass
            self._loop_task = None
        # Let in-flight jobs finish gracefully (they own short threadpool calls
        # for legacy-script wrappers; SIGTERM during a job will surface as the
        # job recording an error, which is fine).
        if self._active:
            await asyncio.gather(*self._active, return_exceptions=True)
        logger.info("dispatcher stopped")

    # --- public API ---------------------------------------------------------

    def submit(self, job_id: str) -> None:
        """Hand a fresh job id to the dispatcher. Returns immediately."""
        self._queue.put_nowait(job_id)

    # --- internals ----------------------------------------------------------

    async def _loop(self) -> None:
        while not self._stopping:
            try:
                job_id = await self._queue.get()
            except asyncio.CancelledError:
                return
            await self._sem.acquire()
            task = asyncio.create_task(self._run_one(job_id), name=f"job-{job_id}")
            self._active.add(task)
            task.add_done_callback(self._on_done)

    def _on_done(self, task: asyncio.Task[None]) -> None:
        self._active.discard(task)
        self._sem.release()

    async def _run_one(self, job_id: str) -> None:
        # All DB work and the handler itself run off the event loop so we
        # don't block other jobs' progress, SSE delivery, or HTTP requests.
        try:
            await asyncio.to_thread(_execute_job, job_id, self._bus)
        except Exception:  # noqa: BLE001 - last-resort guard
            logger.exception("dispatcher: uncaught error running job %s", job_id)


def _execute_job(job_id: str, bus: EventBus) -> None:
    """Synchronous job execution. Runs in a worker thread."""
    # Per-job connection. `check_same_thread=False` because some legacy-script
    # handlers spawn a stderr-pump thread that calls back through the logger.
    conn = connect(check_same_thread=False)
    log = JobLogger(conn, job_id, bus=bus)
    try:
        job = jobs_repo.get(conn, job_id)
        if job is None:
            logger.warning("dispatcher: job %s vanished before running", job_id)
            return
        kind = job["kind"]
        args = job["args"] or {}

        jobs_repo.mark_running(conn, job_id)

        def is_cancelled() -> bool:
            return jobs_repo.is_cancel_requested(conn, job_id)

        run_args = dict(args)
        run_args["__cancel__"] = is_cancelled

        handler = _load_handler(kind)
        log.started(kind=kind, args=args)
        try:
            result = handler.run(run_args, log)  # type: ignore[attr-defined]
        except Exception as e:  # noqa: BLE001
            log.error(e, context={"kind": kind})
            jobs_repo.mark_failed(conn, job_id, error=f"{type(e).__name__}: {e}")
            return

        if is_cancelled():
            log.cancelled()
            jobs_repo.mark_cancelled(conn, job_id)
        else:
            log.finished(summary=result if isinstance(result, dict) else None)
            jobs_repo.mark_done(
                conn, job_id, result=result if isinstance(result, dict) else None
            )
    finally:
        conn.close()
