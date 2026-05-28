"""FastAPI app entrypoint."""
from __future__ import annotations

import contextlib
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import jobs as jobs_routes
from api.routes import leads as leads_routes
from api.routes import ratings as ratings_routes
from api.routes import runs as runs_routes
from api.routes import screenshots as screenshots_routes
from api.routes import tasks as tasks_routes
from db.connection import connect
from db.repos import jobs as jobs_repo
from workers.dispatcher import Dispatcher
from workers.event_bus import EventBus

logger = logging.getLogger("backend.api")
logging.basicConfig(level=os.environ.get("BACKEND_LOG_LEVEL", "INFO"))


def _cors_origins() -> list[str]:
    raw = os.environ.get("BACKEND_CORS_ORIGINS", "")
    if not raw.strip():
        return [
            "http://localhost:4242",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8888",
        ]
    return [s.strip() for s in raw.split(",") if s.strip()]


def _max_concurrent() -> int:
    raw = os.environ.get("BACKEND_MAX_CONCURRENT", "3")
    try:
        n = int(raw)
    except ValueError:
        n = 3
    return max(1, n)


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Reap any jobs left behind by a previous run. We never auto-resume.
    conn = connect()
    try:
        reaped = jobs_repo.reap_active_on_startup(conn)
        if reaped:
            logger.info("reaped %d abandoned job(s) from prior run", reaped)
    finally:
        conn.close()

    bus = EventBus()
    dispatcher = Dispatcher(bus, max_concurrent=_max_concurrent())
    await dispatcher.start()

    app.state.event_bus = bus
    app.state.dispatcher = dispatcher

    if not os.environ.get("BACKEND_AUTH_TOKEN"):
        logger.warning(
            "BACKEND_AUTH_TOKEN is not set — API is OPEN. Set it for any non-local use."
        )
    try:
        yield
    finally:
        await dispatcher.stop()


app = FastAPI(title="AutoSites backend", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads_routes.router)
app.include_router(jobs_routes.router)
app.include_router(ratings_routes.router)
app.include_router(tasks_routes.router)
app.include_router(runs_routes.router)
app.include_router(screenshots_routes.router)


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}
