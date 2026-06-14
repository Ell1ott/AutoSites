"""Tests for on-disk website_crawl reconstruction."""
from ai import place_context


def test_reconstruct_website_crawl_from_disk_builds_home_and_subpages(tmp_path, monkeypatch):
    screenshots = tmp_path / "screenshots"
    screenshots.mkdir()
    pid = "place-abc"

    (screenshots / f"{pid}.html").write_text("<html>home</html>", encoding="utf-8")
    (screenshots / f"{pid}.png").write_bytes(b"png")
    (screenshots / f"{pid}.md").write_text("# Home", encoding="utf-8")
    (screenshots / f"{pid}__sub1.html").write_text("<html>sub</html>", encoding="utf-8")
    (screenshots / f"{pid}__sub1.png").write_bytes(b"png")

    monkeypatch.setattr(place_context, "_SCREENSHOTS", screenshots)
    monkeypatch.setattr(place_context, "_MLF", tmp_path)

    crawl = place_context.reconstruct_website_crawl_from_disk(pid)
    assert crawl is not None
    pages = crawl["pages"]
    assert len(pages) == 2
    assert pages[0]["html_path"] == f"screenshots/{pid}.html"
    assert pages[0]["screenshot_path"] == f"screenshots/{pid}.png"
    assert pages[0]["markdown_path"] == f"screenshots/{pid}.md"
    assert pages[1]["html_path"] == f"screenshots/{pid}__sub1.html"


def test_resolve_website_crawl_prefers_db_metadata():
    db_crawl = {"pages": [{"html_path": "screenshots/x.html"}]}
    wc, from_disk = place_context.resolve_website_crawl(db_crawl, "place-x")
    assert wc == db_crawl
    assert from_disk is False


def test_crawl_html_on_disk(tmp_path, monkeypatch):
    screenshots = tmp_path / "screenshots"
    screenshots.mkdir()
    pid = "place-xyz"
    monkeypatch.setattr(place_context, "_SCREENSHOTS", screenshots)
    assert place_context.crawl_html_on_disk(pid) is False
    (screenshots / f"{pid}.html").write_text("<html></html>", encoding="utf-8")
    assert place_context.crawl_html_on_disk(pid) is True
