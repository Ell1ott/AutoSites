"""SQLite connection helper. WAL, foreign keys, JSON1, sane row factory."""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

_BACKEND_ROOT = Path(__file__).resolve().parent.parent


def db_path() -> Path:
    raw = os.environ.get("BACKEND_DB_PATH")
    if raw:
        return Path(raw).expanduser().resolve()
    return _BACKEND_ROOT / "data" / "leads.db"


def data_dir() -> Path:
    raw = os.environ.get("BACKEND_DATA_DIR")
    if raw:
        return Path(raw).expanduser().resolve()
    return _BACKEND_ROOT / "data"


def connect(*, readonly: bool = False, check_same_thread: bool = True) -> sqlite3.Connection:
    """Open a connection with the project's standard pragmas applied.

    Caller owns lifetime; prefer the `session()` context manager for short ops.

    Pass `check_same_thread=False` when the connection will be shared across
    threads (e.g. the worker's per-job conn, which the stderr pump thread also
    writes through). The caller is responsible for serializing access.
    """
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if readonly:
        uri = f"file:{path}?mode=ro"
        conn = sqlite3.connect(
            uri, uri=True, isolation_level=None, timeout=30.0, check_same_thread=check_same_thread
        )
    else:
        conn = sqlite3.connect(
            path, isolation_level=None, timeout=30.0, check_same_thread=check_same_thread
        )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 30000;")
    # JSON1 ships with stock SQLite >= 3.38; verify once.
    conn.execute("SELECT json('{}')")
    return conn


@contextmanager
def session(*, readonly: bool = False) -> Iterator[sqlite3.Connection]:
    conn = connect(readonly=readonly)
    try:
        yield conn
    finally:
        conn.close()
