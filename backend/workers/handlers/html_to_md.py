"""`html_to_md` job handler: thin wrapper over `jobs.html_to_md.run`.

Converts each place's crawled HTML (recorded in `places.dynamic.website_crawl`)
to Markdown, saving the `.md` next to its `.html`. Ported from the legacy
`html_to_markdown.py` script (which read maps_businesses.json).
"""
from __future__ import annotations

from typing import Any

from jobs import html_to_md


def run(args: dict[str, Any], log) -> dict[str, Any]:  # noqa: ANN001
    return html_to_md.run(args, log)
