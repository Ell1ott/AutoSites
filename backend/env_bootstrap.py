"""Load ``backend/.env`` into ``os.environ`` regardless of how the process was
launched.

Historically the env was only populated by ``dev.sh`` sourcing ``backend/.env``.
Any other launcher (the MCP server's backend, a manual ``uv run python -m api``,
a restart from an IDE) started without ``GEMINI_API_KEY`` etc., which surfaced as
``GEMINI_API_KEY (or GOOGLE_API_KEY) must be set`` mid-job.

Importing this module once, before anything reads ``os.environ``, fixes that.
Existing environment variables win over the file (``override=False``), so the
shell can still override values for local experiments.
"""
from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent / ".env"


def load() -> None:
    if _ENV_PATH.is_file():
        load_dotenv(_ENV_PATH, override=False)


load()
