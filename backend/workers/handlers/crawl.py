"""`crawl` job handler — runs the Playwright screenshot crawler over places.

Wraps `mapsLeadsFetcher/screenshot_store_websites.py`. Screenshots and crawl
metadata stay in their existing on-disk locations under mapsLeadsFetcher/; the
new admin reads them by relative path.
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
    if args.get("max_subpages") is not None:
        cli.extend(["--max-subpages", str(int(args["max_subpages"]))])

    is_cancelled = args["__cancel__"] if callable(args.get("__cancel__")) else (lambda: False)
    log.started(scope="crawl", place_ids_count=len(pids) if isinstance(pids, list) else None)
    return run_legacy_script(
        script="screenshot_store_websites.py",
        cli_args=cli,
        log=log,
        is_cancelled=is_cancelled,
    )
