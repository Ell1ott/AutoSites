"""`extract_contacts` job handler: thin wrapper over `jobs.extract_contacts.run`."""
from __future__ import annotations

from typing import Any

from jobs import extract_contacts


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001
    return extract_contacts.run(args, log)
