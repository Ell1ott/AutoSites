"""FastAPI app entrypoint."""
from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import leads as leads_routes

logger = logging.getLogger("backend.api")
logging.basicConfig(level=os.environ.get("BACKEND_LOG_LEVEL", "INFO"))


def _cors_origins() -> list[str]:
    raw = os.environ.get("BACKEND_CORS_ORIGINS", "")
    if not raw.strip():
        # Sensible dev defaults; tighten in prod via env var.
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8080",
        ]
    return [s.strip() for s in raw.split(",") if s.strip()]


app = FastAPI(title="AutoSites backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads_routes.router)


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}


@app.on_event("startup")
def _startup_banner() -> None:
    if not os.environ.get("BACKEND_AUTH_TOKEN"):
        logger.warning(
            "BACKEND_AUTH_TOKEN is not set — API is OPEN. Set it for any non-local use."
        )
