"""`fetch_leads` job handler: thin wrapper over `jobs.fetch_businesses.run`."""
from __future__ import annotations

from typing import Any

from jobs import fetch_businesses


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001
    return fetch_businesses.run(args, log)
