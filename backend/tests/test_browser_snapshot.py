from __future__ import annotations

import base64
import gzip

from workers.browser_snapshot import (
    ENCODING,
    attach_browser_snapshot,
    is_browser_automation_error,
    pack_html,
    unpack_html,
)


class _FakePage:
    url = "https://example.com/projects"
    title = "Example"

    def content(self) -> str:
        return (
            "<!DOCTYPE html><html><head><title>T</title>"
            "<style>body { margin: 0; }</style></head>"
            "<body><div class='input-field' contenteditable='true'>"
            "Get endless designs for your ideas</div></body></html>"
        )


class _Timeout(Exception):
    pass


def test_pack_roundtrip():
    html = "<html><body>" + ("<p>hello</p>" * 200) + "</body></html>"
    packed = pack_html(html)
    assert packed["encoding"] == ENCODING
    assert packed["packed_bytes"] < packed["raw_bytes"]
    restored = unpack_html(packed["payload"], packed["encoding"])
    assert "hello" in restored


def test_unpack_gzip_base64():
    raw = "<html><body>ok</body></html>".encode()
    payload = base64.b64encode(gzip.compress(raw)).decode()
    assert "ok" in unpack_html(payload)


def test_is_browser_automation_error_patchright_module():
    class E(TimeoutError):
        __module__ = "patchright._impl._errors"

    assert is_browser_automation_error(E("Locator.click: timeout"))


def test_is_browser_automation_error_locator_timeout_message():
    assert is_browser_automation_error(
        TimeoutError('Locator.click: Timeout 10000ms exceeded.\nwaiting for get_by_role("textbox")')
    )


def test_attach_browser_snapshot_sets_attr():
    page = _FakePage()
    exc = TimeoutError("Locator.click: Timeout")
    attach_browser_snapshot(exc, page)
    snap = exc.browser_snapshot  # type: ignore[attr-defined]
    assert snap["url"] == page.url
    assert snap["encoding"] == ENCODING
    assert len(snap["payload"]) > 20
    assert "input-field" in unpack_html(snap["payload"])


def test_attach_skips_non_browser_errors():
    exc = ValueError("nope")
    attach_browser_snapshot(exc, _FakePage())
    assert not hasattr(exc, "browser_snapshot")
