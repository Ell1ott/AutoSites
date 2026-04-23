#!/usr/bin/env python3
"""
Convert every HTML file referenced in maps_businesses.json to Markdown using
microsoft/markitdown (https://github.com/microsoft/markitdown), save each .md
next to its source .html (same stem), and record the path under each page
entry as `markdown_path`.

Run:

    uv run html_to_markdown.py [--input maps_businesses.json] [--force]
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

from markitdown import MarkItDown

logger = logging.getLogger(__name__)


def _places(record: dict[str, Any]) -> list[dict[str, Any]]:
    api = record.get("api_response")
    if not isinstance(api, dict):
        return []
    raw = api.get("places")
    if not isinstance(raw, list):
        return []
    return [p for p in raw if isinstance(p, dict)]


def _pages(place: dict[str, Any]) -> list[dict[str, Any]]:
    wc = place.get("website_crawl")
    if not isinstance(wc, dict):
        return []
    raw = wc.get("pages")
    if not isinstance(raw, list):
        return []
    return [p for p in raw if isinstance(p, dict)]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert HTML files listed in maps_businesses.json to Markdown via markitdown."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("maps_businesses.json"),
        help="Path to maps_businesses.json",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-convert even when the .md file already exists",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stderr,
    )

    json_path = args.input.resolve()
    if not json_path.is_file():
        logger.error("Input JSON not found: %s", json_path)
        sys.exit(1)

    base_dir = json_path.parent
    with json_path.open(encoding="utf-8") as f:
        record = json.load(f)

    md = MarkItDown()

    total = converted = skipped = missing = failed = 0

    for place in _places(record):
        for page in _pages(place):
            html_rel = page.get("html_path")
            if not isinstance(html_rel, str) or not html_rel.strip():
                continue
            total += 1
            html_path = (base_dir / html_rel).resolve()
            if not html_path.is_file():
                logger.warning("Missing HTML file: %s", html_path)
                page["markdown_error"] = "html_missing"
                missing += 1
                continue

            md_path = html_path.with_suffix(".md")
            md_rel = md_path.relative_to(base_dir).as_posix()

            if md_path.is_file() and md_path.stat().st_size > 0 and not args.force:
                page["markdown_path"] = md_rel
                page.pop("markdown_error", None)
                skipped += 1
                continue

            try:
                result = md.convert(str(html_path))
                md_path.write_text(result.text_content or "", encoding="utf-8")
                page["markdown_path"] = md_rel
                page.pop("markdown_error", None)
                converted += 1
                logger.info("Converted %s -> %s", html_rel, md_rel)
            except Exception as exc:
                page["markdown_error"] = f"{type(exc).__name__}: {exc}"
                page.pop("markdown_path", None)
                failed += 1
                logger.error("Failed %s: %s", html_rel, exc)

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(record, f, indent=2, ensure_ascii=False)
        f.write("\n")

    logger.info(
        "Done: %d html entr(ies) — converted=%d, skipped=%d, missing=%d, failed=%d",
        total,
        converted,
        skipped,
        missing,
        failed,
    )


if __name__ == "__main__":
    main()
