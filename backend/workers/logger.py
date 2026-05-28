"""Structured job logger.

Every handler writes events through this class. Each call:
  - writes one row to `job_logs` (durable, the source of truth);
  - notifies the in-process log sink so anyone tailing (e.g. the API's SSE stream)
    sees it immediately.

The event payload is a plain dict matching the row shape: `{id, job_id, seq, ts,
level, event, message, data}`. Same shape lands in SQLite and on the wire.
"""
from __future__ import annotations

import sqlite3
import threading
import traceback
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from db.repos import job_logs
from workers.browser_snapshot import SNAPSHOT_ATTR

if TYPE_CHECKING:
    from workers.event_bus import EventBus


def _now_iso() -> str:
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"


class JobLogger:
    """One per running job. Thread-safe: `_emit` is serialized by a lock so the
    main worker thread and helper threads (e.g. stderr pumps) can log freely.
    The underlying connection must be opened with `check_same_thread=False`."""

    def __init__(
        self,
        conn: sqlite3.Connection,
        job_id: str,
        *,
        bus: "EventBus | None" = None,
    ) -> None:
        self._conn = conn
        self._job_id = job_id
        self._seq = job_logs.next_seq(conn, job_id) - 1
        self._bus = bus
        self._lock = threading.Lock()

    @property
    def job_id(self) -> str:
        return self._job_id

    def _emit(
        self,
        event: str,
        *,
        level: str = "info",
        message: str = "",
        data: dict[str, Any] | None = None,
    ) -> int:
        with self._lock:
            self._seq += 1
            ts = _now_iso()
            log_id = job_logs.append(
                self._conn,
                job_id=self._job_id,
                seq=self._seq,
                ts=ts,
                level=level,
                event=event,
                message=message,
                data=data or {},
            )
            if self._bus is not None:
                payload = {
                    "id": log_id,
                    "job_id": self._job_id,
                    "seq": self._seq,
                    "ts": ts,
                    "level": level,
                    "event": event,
                    "message": message,
                    "data": data or {},
                }
                try:
                    self._bus.publish(self._job_id, payload)
                except Exception:
                    # Publish path must never break the job.
                    pass
            return log_id

    # ----- typed conveniences (the public surface handlers should call) -----

    def started(self, *, total: int | None = None, **data: Any) -> None:
        payload = {"total": total, **data}
        self._emit("started", message="job started", data=payload)

    def progress(
        self, *, done: int, total: int | None = None, eta_seconds: float | None = None, **data: Any
    ) -> None:
        payload = {"done": done, "total": total, "eta_seconds": eta_seconds, **data}
        self._emit("progress", data=payload)

    def item_start(self, *, place_id: str, name: str | None = None, **data: Any) -> None:
        self._emit("item_start", data={"place_id": place_id, "name": name, **data})

    def item_done(
        self, *, place_id: str, duration_ms: float, outputs: dict[str, Any] | None = None, **data: Any
    ) -> None:
        self._emit(
            "item_done",
            data={
                "place_id": place_id,
                "duration_ms": duration_ms,
                "outputs": outputs or {},
                **data,
            },
        )

    def ai_call_start(self, *, model: str, task: str, place_id: str | None = None, **data: Any) -> None:
        self._emit("ai_call_start", data={"model": model, "task": task, "place_id": place_id, **data})

    def ai_call_done(
        self,
        *,
        duration_ms: float,
        tokens_in: int | None = None,
        tokens_out: int | None = None,
        cost_usd: float | None = None,
        **data: Any,
    ) -> None:
        self._emit(
            "ai_call_done",
            data={
                "duration_ms": duration_ms,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
                "cost_usd": cost_usd,
                **data,
            },
        )

    def ai_call_error(self, *, model: str, error_class: str, message: str, **data: Any) -> None:
        self._emit(
            "ai_call_error",
            level="warn",
            message=message,
            data={"model": model, "error_class": error_class, "message": message, **data},
        )

    def http_call(self, *, host: str, status: int, duration_ms: float, **data: Any) -> None:
        level = "warn" if status >= 400 else "debug"
        self._emit(
            "http_call",
            level=level,
            data={"host": host, "status": status, "duration_ms": duration_ms, **data},
        )

    def metric(self, *, key: str, value: float, unit: str | None = None, **data: Any) -> None:
        self._emit("metric", data={"key": key, "value": value, "unit": unit, **data})

    def warn(self, message: str, **data: Any) -> None:
        self._emit("warn", level="warn", message=message, data=data)

    def info(self, message: str, **data: Any) -> None:
        self._emit("log", level="info", message=message, data=data)

    def debug(self, message: str, **data: Any) -> None:
        self._emit("log", level="debug", message=message, data=data)

    def browser_snapshot(self, snapshot: dict[str, Any], **data: Any) -> None:
        """Compressed page HTML from a failed browser automation step."""
        self._emit(
            "browser_snapshot",
            level="warn",
            message="browser page snapshot",
            data={**snapshot, **data},
        )

    def error(self, exc: BaseException, *, context: dict[str, Any] | None = None) -> None:
        ctx = dict(context or {})
        snap = getattr(exc, SNAPSHOT_ATTR, None)
        if isinstance(snap, dict) and snap.get("payload"):
            # Keep the heavy payload in its own event; error row stays small.
            self.browser_snapshot(snap, **{k: v for k, v in ctx.items() if k != SNAPSHOT_ATTR})
            ctx = {**ctx, "has_browser_snapshot": True}

        tb = traceback.format_exc()
        # Pull file/line from the deepest frame if possible.
        file_, line = _exc_location(exc)
        self._emit(
            "error",
            level="error",
            message=f"{type(exc).__name__}: {exc}",
            data={
                "class": type(exc).__name__,
                "message": str(exc),
                "traceback": tb,
                "file": file_,
                "line": line,
                "context": ctx,
            },
        )

    def finished(self, *, summary: dict[str, Any] | None = None) -> None:
        self._emit("finished", message="job complete", data={"summary": summary or {}})

    def cancelled(self, *, at_item: str | None = None) -> None:
        self._emit("cancelled", level="warn", data={"at_item": at_item})


def _exc_location(exc: BaseException) -> tuple[str | None, int | None]:
    tb = exc.__traceback__
    if tb is None:
        return None, None
    # Walk to deepest frame
    while tb.tb_next is not None:
        tb = tb.tb_next
    f = tb.tb_frame
    return f.f_code.co_filename, tb.tb_lineno
