"""`crawl` job handler: thin wrapper over `jobs.crawl_sites.run`.

Crawls each place's website with Patchright, saves PNG(s) + HTML under
`mapsLeadsFetcher/screenshots/`, and writes crawl metadata into
`places.dynamic.website_crawl`. Ported from the legacy
`screenshot_store_websites.py` script (which read maps_businesses.json).
"""
from __future__ import annotations

from typing import Any

from jobs import crawl_sites


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001
    return crawl_sites.run(args, log)
