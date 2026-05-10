"""Worker -> API live event push via a Unix domain socket.

The worker writes events to a UDS as newline-delimited JSON. The API process
listens on the same socket, parses incoming events, and forwards them to any
SSE subscribers tailing that job. If the API isn't running (or the socket
doesn't exist), the worker silently skips push — events still land in `job_logs`
on disk, so reconnecting clients see them via the resume-from-seq path.

Why UDS instead of polling: <100 ms end-to-end latency target. WAL-poll-based
hand-off would add ~200 ms by itself.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import socket
from collections import defaultdict
from typing import Any, AsyncIterator, Awaitable, Callable

logger = logging.getLogger(__name__)


def default_socket_path() -> str:
    return os.environ.get("BACKEND_EVENT_SOCK", "/tmp/autosites-backend-events.sock")


# ---------------------------------------------------------------- worker side


class WorkerSink:
    """Best-effort UDS pusher. Writes one line per event; failures are swallowed."""

    def __init__(self, sock_path: str | None = None) -> None:
        self._sock_path = sock_path or default_socket_path()
        self._sock: socket.socket | None = None
        self._last_connect_attempt = 0.0

    def _ensure_connected(self) -> socket.socket | None:
        if self._sock is not None:
            return self._sock
        if not os.path.exists(self._sock_path):
            return None
        try:
            s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            s.connect(self._sock_path)
            s.settimeout(0.25)
            self._sock = s
            return s
        except OSError:
            return None

    def push(self, payload: dict[str, Any]) -> None:
        s = self._ensure_connected()
        if s is None:
            return
        line = json.dumps(payload, separators=(",", ":")) + "\n"
        try:
            s.sendall(line.encode("utf-8"))
        except OSError:
            # API likely restarted; drop the connection so we reconnect next time.
            try:
                s.close()
            except OSError:
                pass
            self._sock = None


# ---------------------------------------------------------------- API side


class ApiSink:
    """Async UDS server that fans out events to per-job subscribers (asyncio
    queues). Started as a background task in the FastAPI lifespan."""

    def __init__(self, sock_path: str | None = None) -> None:
        self._sock_path = sock_path or default_socket_path()
        self._subs: dict[str, list[asyncio.Queue[dict[str, Any]]]] = defaultdict(list)
        self._server: asyncio.base_events.Server | None = None

    async def start(self) -> None:
        if os.path.exists(self._sock_path):
            try:
                os.unlink(self._sock_path)
            except OSError:
                pass
        self._server = await asyncio.start_unix_server(self._on_client, path=self._sock_path)
        os.chmod(self._sock_path, 0o600)
        logger.info("event sink listening on %s", self._sock_path)

    async def stop(self) -> None:
        if self._server is not None:
            self._server.close()
            await self._server.wait_closed()
        try:
            os.unlink(self._sock_path)
        except OSError:
            pass

    async def _on_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            while True:
                line = await reader.readline()
                if not line:
                    break
                try:
                    payload = json.loads(line.decode("utf-8"))
                except (UnicodeDecodeError, json.JSONDecodeError):
                    continue
                job_id = payload.get("job_id")
                if not isinstance(job_id, str):
                    continue
                for q in list(self._subs.get(job_id, [])):
                    try:
                        q.put_nowait(payload)
                    except asyncio.QueueFull:
                        # Drop oldest by waiting briefly; SSE consumers should keep up.
                        pass
        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except (OSError, asyncio.CancelledError):
                pass

    def subscribe(self, job_id: str) -> asyncio.Queue[dict[str, Any]]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=1024)
        self._subs[job_id].append(q)
        return q

    def unsubscribe(self, job_id: str, q: asyncio.Queue[dict[str, Any]]) -> None:
        try:
            self._subs[job_id].remove(q)
        except (KeyError, ValueError):
            pass
        if not self._subs[job_id]:
            self._subs.pop(job_id, None)
