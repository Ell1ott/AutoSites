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
from api.routes import tasks as tasks_routes
from workers.log_sink import ApiSink

logger = logging.getLogger("backend.api")
logging.basicConfig(level=os.environ.get("BACKEND_LOG_LEVEL", "INFO"))


def _cors_origins() -> list[str]:
    raw = os.environ.get("BACKEND_CORS_ORIGINS", "")
    if not raw.strip():
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8080",
        ]
    return [s.strip() for s in raw.split(",") if s.strip()]


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    sink = ApiSink()
    try:
        await sink.start()
    except Exception:
        logger.exception("could not start event sink; SSE will fall back to polling-only")
        sink = None  # type: ignore[assignment]
    app.state.event_bus = sink
    if not os.environ.get("BACKEND_AUTH_TOKEN"):
        logger.warning(
            "BACKEND_AUTH_TOKEN is not set — API is OPEN. Set it for any non-local use."
        )
    try:
        yield
    finally:
        if sink is not None:
            await sink.stop()


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


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}
