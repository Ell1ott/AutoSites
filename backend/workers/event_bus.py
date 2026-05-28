"""In-process pub/sub for job events.

A `JobLogger` publishes each event it writes to `job_logs` here; the SSE
endpoint subscribes per job and tails. Both live inside the same FastAPI
process — no sockets, no serialization, just direct asyncio queues.

Publishers may be sync (called from a worker thread); subscribers are async.
Bridging is handled internally with `loop.call_soon_threadsafe`.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)


class EventBus:
    """Per-job subscriber fan-out. Bounded queues drop oldest on overflow
    rather than back-pressure the worker."""

    def __init__(self, *, queue_max: int = 1024) -> None:
        self._subs: dict[str, list[asyncio.Queue[dict[str, Any]]]] = {}
        self._loop: asyncio.AbstractEventLoop | None = None
        self._queue_max = queue_max

    def attach_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Bind to the running event loop. Called once from the FastAPI lifespan."""
        self._loop = loop

    def subscribe(self, job_id: str) -> asyncio.Queue[dict[str, Any]]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=self._queue_max)
        self._subs.setdefault(job_id, []).append(q)
        return q

    def unsubscribe(self, job_id: str, q: asyncio.Queue[dict[str, Any]]) -> None:
        subs = self._subs.get(job_id)
        if not subs:
            return
        try:
            subs.remove(q)
        except ValueError:
            pass
        if not subs:
            self._subs.pop(job_id, None)

    def publish(self, job_id: str, event: dict[str, Any]) -> None:
        """Thread-safe. Callable from worker threads via the bound loop."""
        subs = self._subs.get(job_id)
        if not subs:
            return
        loop = self._loop
        if loop is None or not loop.is_running():
            # No loop yet (shouldn't happen in normal operation). Drop silently —
            # job_logs still has the durable copy.
            return
        # Hand off to the loop thread so queue.put_nowait runs safely.
        loop.call_soon_threadsafe(self._deliver, job_id, event)

    def _deliver(self, job_id: str, event: dict[str, Any]) -> None:
        for q in list(self._subs.get(job_id, [])):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # Drop oldest to make room; subscribers can resume from
                # job_logs via ?since= if they need the gap.
                try:
                    q.get_nowait()
                    q.put_nowait(event)
                except (asyncio.QueueEmpty, asyncio.QueueFull):
                    pass
