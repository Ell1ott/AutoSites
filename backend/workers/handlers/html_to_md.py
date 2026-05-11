"""`html_to_md` job handler — converts crawled HTML to Markdown.

Wraps `mapsLeadsFetcher/html_to_markdown.py`.
"""
from __future__ import annotations

from typing import Any

from workers.handlers._subprocess import run_legacy_script


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001
    cli: list[str] = []
    pids = args.get("place_ids")
    if isinstance(pids, list) and pids:
        cli.extend(["--place-ids", ",".join(str(p) for p in pids)])
    if "limit" in args and args["limit"] is not None:
        cli.extend(["--limit", str(int(args["limit"]))])
    if args.get("force"):
        cli.append("--force")

    is_cancelled = args["__cancel__"] if callable(args.get("__cancel__")) else (lambda: False)
    log.started(scope="html_to_md", place_ids_count=len(pids) if isinstance(pids, list) else None)
    return run_legacy_script(
        script="html_to_markdown.py",
        cli_args=cli,
        log=log,
        is_cancelled=is_cancelled,
    )
