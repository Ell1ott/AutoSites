"""Resolve a browser-use indexed DOM element to an image file on disk.

The agent picks an element by its `index` (an `<img>`, or any wrapper that
contains one). We resolve the index → DOM node, extract the best image URL we
can find (`src`, highest entry of `srcset`, lazy-load attrs, or
`background-image: url(...)`), and download it. If nothing usable is found we
fall back to a CDP screenshot clipped to the element's bounds, so the caller
always gets *something* visual.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import httpx


_BG_IMAGE_RE = re.compile(
    r"background-image\s*:\s*url\(\s*['\"]?([^'\")]+)['\"]?\s*\)",
    re.IGNORECASE,
)
_LAZY_SRC_ATTRS = ("src", "data-src", "data-lazy-src", "data-original", "data-image")


async def grab_element_image(
    browser_session,  # noqa: ANN001
    index: int,
    out_path_base: Path,
) -> tuple[Path | None, str | None]:
    """Save the image represented by an indexed element.

    Returns (saved_path, source_url). `source_url` is None when we fell back
    to a bounding-box screenshot; `saved_path` is None if we couldn't produce
    any image at all.
    """
    node = await browser_session.get_dom_element_by_index(index)
    if node is None:
        return None, None

    url = _extract_image_url(node)
    if url:
        try:
            url = await _resolve_url(browser_session, url)
            ext = _ext_from_url(url)
            out_path = out_path_base.with_suffix(f".{ext}")
            async with httpx.AsyncClient(follow_redirects=True, timeout=20.0) as client:
                resp = await client.get(
                    url,
                    headers={
                        "User-Agent": (
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/121.0.0.0 Safari/537.36"
                        ),
                    },
                )
                resp.raise_for_status()
                out_path.write_bytes(resp.content)
                return out_path, url
        except Exception:  # noqa: BLE001
            pass  # fall through to clipped screenshot

    rect = getattr(node, "absolute_position", None)
    if rect is None or rect.width <= 0 or rect.height <= 0:
        return None, None
    try:
        png = await browser_session.take_screenshot(
            full_page=True,
            clip={"x": rect.x, "y": rect.y, "width": rect.width, "height": rect.height},
        )
        out_path = out_path_base.with_suffix(".png")
        out_path.write_bytes(png)
        return out_path, None
    except Exception:  # noqa: BLE001
        return None, None


def _extract_image_url(node: Any) -> str | None:
    img = _find_img_descendant(node)
    if img is not None:
        attrs = img.attributes or {}
        srcset = attrs.get("srcset") or attrs.get("data-srcset")
        if srcset:
            best = _best_from_srcset(srcset)
            if best:
                return best
        for key in _LAZY_SRC_ATTRS:
            v = attrs.get(key)
            if v and not v.startswith("data:"):
                return v

    style = (getattr(node, "attributes", None) or {}).get("style") or ""
    m = _BG_IMAGE_RE.search(style)
    if m:
        return m.group(1)
    return None


def _find_img_descendant(node: Any) -> Any | None:
    if getattr(node, "node_name", "").lower() == "img":
        return node
    children = getattr(node, "children_and_shadow_roots", None) or getattr(node, "children", None) or []
    for child in children:
        found = _find_img_descendant(child)
        if found is not None:
            return found
    return None


def _best_from_srcset(srcset: str) -> str | None:
    """Pick the entry with the largest width/density descriptor."""
    best_url: str | None = None
    best_weight = -1.0
    for entry in srcset.split(","):
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split()
        url = parts[0]
        weight = 1.0
        if len(parts) >= 2:
            descriptor = parts[1]
            if descriptor.endswith(("x", "w")):
                try:
                    weight = float(descriptor[:-1])
                except ValueError:
                    weight = 1.0
        if weight > best_weight:
            best_weight = weight
            best_url = url
    return best_url


async def _resolve_url(browser_session, url: str) -> str:  # noqa: ANN001
    if url.startswith(("http://", "https://", "data:")):
        return url
    if url.startswith("//"):
        return "https:" + url
    try:
        page = await browser_session.must_get_current_page()
        page_url = await page.get_url() if hasattr(page, "get_url") else getattr(page, "url", "")
    except Exception:  # noqa: BLE001
        page_url = ""
    if page_url:
        return urljoin(page_url, url)
    return url


def _ext_from_url(url: str) -> str:
    base = url.split("?", 1)[0].rsplit("/", 1)[-1]
    if "." in base:
        ext = base.rsplit(".", 1)[1].lower()
        if 0 < len(ext) <= 5 and ext.isalnum():
            return ext
    return "jpg"
