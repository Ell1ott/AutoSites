"""Unit tests for regex-based contact extraction from HTML."""
import re

from jobs.extract_contacts import extract_from_html, _merge_contacts, _empty_bundle


def test_mailto_and_plain_email():
    html = """
    <a href="mailto:info@bakery.dk">Email us</a>
    <footer>Reach us at hello@bakery.dk for orders.</footer>
    """
    out = extract_from_html(html)
    assert "info@bakery.dk" in out["emails"]
    assert "hello@bakery.dk" in out["emails"]


def test_tel_link():
    html = '<a href="tel:+4512345678">Call</a>'
    out = extract_from_html(html)
    assert any("4512345678" in p.replace(" ", "") for p in out["phones"])


def test_social_links_strip_tracking():
    html = """
    <a href="https://www.facebook.com/mybakery?utm_source=site&fbclid=abc">FB</a>
    <a href="https://instagram.com/mybakery/">IG</a>
    """
    out = extract_from_html(html)
    assert "facebook" in out["socials"]
    assert out["socials"]["facebook"][0].startswith("https://www.facebook.com/mybakery")
    assert "utm_" not in out["socials"]["facebook"][0]
    assert "instagram" in out["socials"]


def test_obfuscated_email():
    html = "<p>Contact info [at] domain [dot] dk for help.</p>"
    out = extract_from_html(html)
    assert "info@domain.dk" in out["emails"]


def test_rejects_placeholder_and_javascript():
    html = """
    <a href="javascript:void(0)">nope</a>
    <span>noreply@example.com</span>
    <img src="logo@2x.png" />
    """
    out = extract_from_html(html)
    assert "noreply@example.com" not in out["emails"]


def test_rejects_js_ids_svg_coords_and_generic_facebook():
    html = """
    <script>var x = 1041122824; var y = 7649499062604744587;</script>
    <svg><path d="M8.586 12.5 0 0 20 20"/></svg>
    <span>157.240.200.35</span>
    <a href="https://www.facebook.com/policies/cookies/">Cookies</a>
    <a href="https://www.facebook.com/help/568137493302217">Help</a>
    """
    out = extract_from_html(html)
    assert out["phones"] == []
    assert "facebook" not in out["socials"]


def test_accepts_danish_formatted_phone_in_text():
    html = "<footer>Ring til os på 40 59 59 60 eller +45 97 12 20 23</footer>"
    out = extract_from_html(html)
    digits = [re.sub(r"\D", "", p) for p in out["phones"]]
    assert "40595960" in digits
    assert "4597122023" in digits


def test_rejects_svg_coordinate_runs_as_phones():
    html = "<svg><path d='M17 14 21 18 0 0 20 20'/></svg>"
    out = extract_from_html(html)
    assert out["phones"] == []


def test_rejects_facebook_footer_and_uuid_slugs():
    html = """
    <a href="https://www.facebook.com/pages/create/?ref_type=site_footer">x</a>
    <a href="https://www.facebook.com/ab99fd59-deba-42b7-9eba-0c14dff03c7d">x</a>
    <a href="https://www.facebook.com/Meta">x</a>
    <a href="https://www.facebook.com/validbusinesspage">x</a>
    """
    out = extract_from_html(html)
    urls = out.get("socials", {}).get("facebook", [])
    assert any("validbusinesspage" in u for u in urls)
    assert not any("pages/create" in u for u in urls)
    assert not any("ab99fd59" in u for u in urls)
    assert not any("/meta" in u.lower() for u in urls)


def test_merge_contacts_dedupes():
    acc = _empty_bundle()
    _merge_contacts(acc, {"emails": ["a@b.dk"], "phones": [], "socials": {}})
    _merge_contacts(
        acc,
        {
            "emails": ["a@b.dk", "c@d.dk"],
            "phones": ["+45 12 34 56 78"],
            "socials": {"facebook": ["https://facebook.com/x"]},
        },
    )
    assert acc["emails"] == ["a@b.dk", "c@d.dk"]
    assert len(acc["phones"]) == 1
    assert acc["socials"]["facebook"] == ["https://facebook.com/x"]
