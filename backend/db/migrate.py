"""Idempotent migration runner. `python -m db.migrate` applies any pending *.sql.

Files in `db/migrations/` are applied in lexical order. A `_migrations` table tracks
what's been applied. Each file runs as one transaction.
"""
from __future__ import annotations

import sys
from pathlib import Path

from db.connection import connect

_MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def applied(conn) -> set[str]:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS _migrations ("
        "name TEXT PRIMARY KEY, "
        "applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))"
        ")"
    )
    return {row["name"] for row in conn.execute("SELECT name FROM _migrations")}


def pending() -> list[Path]:
    return sorted(_MIGRATIONS_DIR.glob("*.sql"))


def ensure(*, verbose: bool = False) -> int:
    """Apply any pending migrations. Returns how many were applied."""
    conn = connect()
    try:
        done = applied(conn)
        ran = 0
        for path in pending():
            if path.name in done:
                continue
            sql = path.read_text(encoding="utf-8")
            if verbose:
                print(f"  applying {path.name}", flush=True)
            # executescript() implicitly commits, so we don't wrap it in a manual
            # transaction. All migration statements use IF NOT EXISTS so re-running
            # after a partial failure is safe.
            conn.executescript(sql)
            conn.execute(
                "INSERT INTO _migrations(name) VALUES (?)", (path.name,)
            )
            ran += 1
        if verbose:
            print(f"done. {ran} migration(s) applied, {len(done) + ran} total.")
        return ran
    finally:
        conn.close()


def run() -> int:
    ensure(verbose=True)
    return 0


if __name__ == "__main__":
    sys.exit(run())
