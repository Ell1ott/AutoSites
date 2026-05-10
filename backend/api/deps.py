"""FastAPI dependencies: bearer-token auth and DB sessions."""
from __future__ import annotations

import os
from typing import Generator

from fastapi import Depends, Header, HTTPException, status

from db.connection import connect


def _expected_token() -> str | None:
    return os.environ.get("BACKEND_AUTH_TOKEN") or None


def require_auth(authorization: str | None = Header(default=None)) -> None:
    expected = _expected_token()
    if not expected:
        # No token configured -> open (dev mode). Log once at boot rather than here.
        return
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(None, 1)[1].strip()
    if token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token"
        )


def get_db(readonly: bool = False) -> Generator:
    conn = connect(readonly=readonly)
    try:
        yield conn
    finally:
        conn.close()


def get_db_ro() -> Generator:
    yield from get_db(readonly=True)


Auth = Depends(require_auth)
