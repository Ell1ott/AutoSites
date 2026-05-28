"""Patchright automation for variant.com design generation.

Verified selectors (2026-05-26 browser run-through):
  Auth: textbox "Email address", button "Continue with Email", OTP textbox, Verify
  Projects: textbox "Get endless designs for...", button.submit-button, optional Dismiss modal
  Chat: .presentation-card iframe previews, .card-loading for poll completion
"""
from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from patchright.sync_api import Locator, Page, sync_playwright

from workers.browser_snapshot import attach_browser_snapshot

CHAT_URL_RE = re.compile(r"/chat/[0-9a-f-]{36}")
DEFAULT_PROJECTS_URL = os.environ.get(
    "VARIANT_PROJECTS_URL", "https://variant.com/projects"
)
DEFAULT_GENERATION_TIMEOUT_S = int(os.environ.get("VARIANT_GENERATION_TIMEOUT_S", "900"))
POLL_INTERVAL_S = 2.0
# Consecutive polls where every design iframe looks rendered (avoids exiting on empty iframes).
STABLE_POLLS_REQUIRED = int(os.environ.get("VARIANT_GENERATION_STABLE_POLLS", "3"))
# Brief pause after "complete" so late assets inside iframes can finish painting.
POST_READY_SETTLE_MS = int(os.environ.get("VARIANT_POST_READY_SETTLE_MS", "4000"))

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DEFAULT_PROFILE_DIR = (
    Path(os.environ.get("VARIANT_BROWSER_PROFILE_DIR") or (_REPO_ROOT / "backend" / "data" / "variant-browser-profile"))
).resolve()


class VariantAuthRequired(RuntimeError):
    """Raised when the persisted profile is not logged in."""


@dataclass
class VariantRunResult:
    url: str | None
    status: str  # complete | timed_out | failed
    designs: list[dict[str, Any]]
    captured_at: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def profile_dir() -> Path:
    return DEFAULT_PROFILE_DIR


def _is_auth_page(page: Page) -> bool:
    return "/authentication" in page.url


def ensure_not_auth(page: Page) -> None:
    if _is_auth_page(page):
        raise VariantAuthRequired(
            "Variant session is not logged in. Run once:\n"
            "  cd backend && uv run python -m scripts.setup_variant_session"
        )
    email = page.get_by_role("textbox", name="Email address")
    if email.count() and email.first.is_visible():
        raise VariantAuthRequired(
            "Variant login screen is showing. Run once:\n"
            "  cd backend && uv run python -m scripts.setup_variant_session"
        )


def dismiss_onboarding_modal(page: Page) -> None:
    btn = page.get_by_role("button", name="Dismiss")
    if btn.count() and btn.first.is_visible():
        btn.first.click(timeout=3000)


def _wait_for_page_settle(page: Page) -> None:
    """Let Variant's client bundle hydrate the projects composer."""
    try:
        page.wait_for_load_state("networkidle", timeout=30_000)
    except Exception:  # noqa: BLE001
        page.wait_for_load_state("load", timeout=15_000)


def _resolve_composer(page: Page, *, timeout_ms: int = 45_000) -> Locator:
    """Find the Lexical prompt editor on /projects or /chat."""
    candidates: list[Locator] = [
        page.locator(".input-field[contenteditable='true']").first,
        page.locator(".input-field").first,
        page.get_by_role(
            "textbox",
            name=re.compile(r"Get endless designs|Design anything", re.I),
        ),
    ]
    deadline = time.monotonic() + timeout_ms / 1000
    last_err: Exception | None = None
    while time.monotonic() < deadline:
        ensure_not_auth(page)
        dismiss_onboarding_modal(page)
        for loc in candidates:
            try:
                loc.wait_for(state="visible", timeout=2000)
                return loc
            except Exception as e:  # noqa: BLE001
                last_err = e
        page.wait_for_timeout(500)
    hint = f"url={page.url!r} title={page.title()!r}"
    if last_err:
        raise TimeoutError(
            f"Variant prompt editor not found ({hint}). "
            "Confirm login via setup_variant_session and that /projects loads."
        ) from last_err
    raise TimeoutError(
        f"Variant prompt editor not found ({hint}). "
        "Confirm login via setup_variant_session."
    )


def _type_prompt(composer: Locator, prompt: str) -> None:
    """Lexical editor: fill() does not enable submit; press_sequentially does."""
    composer.click(timeout=15_000)
    composer.press_sequentially(prompt, delay=15)


def _click_submit(page: Page) -> None:
    submit_btn = page.locator("button.submit-button:not([disabled])")
    if submit_btn.count():
        submit_btn.first.click(timeout=15_000)
    else:
        page.keyboard.press("Enter")


def submit_prompt(page: Page, prompt: str, projects_url: str = DEFAULT_PROJECTS_URL) -> str:
    """Navigate to projects, type prompt, submit. Returns chat URL without query string."""
    page.goto(projects_url, wait_until="domcontentloaded", timeout=60_000)

    _wait_for_page_settle(page)
    ensure_not_auth(page)
    dismiss_onboarding_modal(page)

    composer = _resolve_composer(page)
    _type_prompt(composer, prompt)
    _click_submit(page)

    page.wait_for_url(CHAT_URL_RE, timeout=120_000)
    return page.url.split("?", 1)[0]


def _iframe_design_ready(frame) -> bool:  # noqa: ANN001
    """True when the preview iframe has real design markup, not an empty shell."""
    try:
        return bool(
            frame.evaluate(
                """() => {
                    const root = document.documentElement;
                    const text = (root.innerText || '').replace(/\\s+/g, ' ').trim();
                    if (text.length < 80) return false;
                    const htmlLen = (root.outerHTML || '').length;
                    if (htmlLen < 1200) return false;
                    const hasStructure = !!(
                        document.querySelector(
                            'img[src], picture, svg[width], canvas, video, [style*="background-image"]'
                        ) ||
                        document.querySelector('h1, h2, h3, header, main, section, article')
                    );
                    if (!hasStructure) return false;
                    const loadingish = document.querySelector(
                        '[class*="loading"], [class*="skeleton"], [class*="shimmer"], [aria-busy="true"]'
                    );
                    if (loadingish && text.length < 200) return false;
                    return true;
                }"""
            )
        )
    except Exception:  # noqa: BLE001
        return False


def _design_cards_state(page: Page) -> dict[str, int]:
    """Snapshot Variant's generation progress on the chat page."""
    loading = page.locator(".presentation-content-wrapper.card-loading").count()
    cards = page.locator(".presentation-card")
    card_count = cards.count()
    iframe_cards = 0
    ready_iframes = 0

    for i in range(card_count):
        card = cards.nth(i)
        iframe_loc = card.locator("iframe").first
        if iframe_loc.count() == 0:
            continue
        iframe_cards += 1
        handle = iframe_loc.element_handle()
        if handle is None:
            continue
        frame = handle.content_frame()
        if frame is not None and _iframe_design_ready(frame):
            ready_iframes += 1

    return {
        "loading": loading,
        "card_count": card_count,
        "iframe_cards": iframe_cards,
        "ready_iframes": ready_iframes,
    }


def _page_still_exploring(page: Page) -> bool:
    try:
        body = page.inner_text("body", timeout=3000)
    except Exception:  # noqa: BLE001
        return False
    return bool(re.search(r"Exploring\s+\d+\s+designs?", body, re.I))


def generation_complete(page: Page) -> bool:
    """Cards must exist, spinners gone, iframes mounted, and each iframe filled in."""
    state = _design_cards_state(page)
    if state["loading"] > 0:
        return False
    if state["card_count"] < 1:
        return False
    if state["iframe_cards"] < 1:
        return False
    if _page_still_exploring(page):
        return False
    return state["ready_iframes"] >= state["iframe_cards"]


def wait_for_generation(
    page: Page,
    *,
    timeout_s: float = DEFAULT_GENERATION_TIMEOUT_S,
    poll_interval_s: float = POLL_INTERVAL_S,
    is_cancelled: Callable[[], bool] | None = None,
    on_tick: Callable[[dict[str, int]] | None, None] = None,
) -> bool:
    """Poll until every design iframe looks rendered. Returns True if complete."""
    deadline = time.monotonic() + timeout_s
    stable_polls = 0
    last_state: dict[str, int] | None = None

    while time.monotonic() < deadline:
        if is_cancelled and is_cancelled():
            return False

        last_state = _design_cards_state(page)
        if generation_complete(page):
            stable_polls += 1
            if stable_polls >= STABLE_POLLS_REQUIRED:
                page.wait_for_timeout(POST_READY_SETTLE_MS)
                return True
        else:
            stable_polls = 0

        if on_tick:
            on_tick(last_state)

        page.wait_for_timeout(int(poll_interval_s * 1000))

    if generation_complete(page):
        page.wait_for_timeout(POST_READY_SETTLE_MS)
        return True
    return False


def _inject_base_tag(html: str, base_href: str) -> str:
    if re.search(r"<base\s", html, re.I):
        return html
    tag = f'<base href="{base_href}">'
    if re.search(r"<head[^>]*>", html, re.I):
        return re.sub(r"(<head[^>]*>)", r"\1" + tag, html, count=1, flags=re.I)
    return tag + html


def _card_title(card_locator) -> str | None:  # noqa: ANN001
    try:
        text = card_locator.inner_text(timeout=2000)
        line = (text or "").strip().split("\n", 1)[0].strip()
        return line[:120] if line else None
    except Exception:  # noqa: BLE001
        return None


def capture_design_html(
    page: Page,
    *,
    dest_dir: Path,
    base_dir: Path,
    place_id: str,
    job_id: str,
) -> list[dict[str, Any]]:
    """Extract HTML from each .presentation-card iframe and write under dest_dir."""
    designs: list[dict[str, Any]] = []
    cards = page.locator(".presentation-card")
    count = cards.count()
    dest_dir.mkdir(parents=True, exist_ok=True)

    for i in range(count):
        card = cards.nth(i)
        iframe_loc = card.locator("iframe").first
        if iframe_loc.count() == 0:
            continue
        handle = iframe_loc.element_handle()
        if handle is None:
            continue
        frame = handle.content_frame()
        if frame is None:
            continue
        html = ""
        try:
            html = frame.content()
        except Exception:  # noqa: BLE001
            try:
                html = frame.evaluate("document.documentElement.outerHTML")
            except Exception:  # noqa: BLE001
                continue
        if not html.strip():
            continue
        html = _inject_base_tag(html, "https://variant.com/")
        rel = f"{place_id}/variant/{job_id}/{i:02d}.html"
        path = dest_dir / f"{i:02d}.html"
        path.write_text(html, encoding="utf-8")
        title = _card_title(card)
        designs.append(
            {
                "index": i,
                "html_path": Path(rel).as_posix(),
                "title": title,
            }
        )
    return designs


def run_for_place(
    *,
    prompt: str,
    place_id: str,
    job_id: str,
    screenshots_dir: Path,
    projects_url: str = DEFAULT_PROJECTS_URL,
    generation_timeout_s: float = DEFAULT_GENERATION_TIMEOUT_S,
    headless: bool = False,
    user_data_dir: Path | None = None,
    is_cancelled: Callable[[], bool] | None = None,
    on_url_saved: Callable[[str], None] | None = None,
    on_progress: Callable[[], None] | None = None,
) -> VariantRunResult:
    """Full Variant flow for one place: submit, wait, capture iframe HTML."""
    profile = user_data_dir or profile_dir()
    profile.mkdir(parents=True, exist_ok=True)
    dest_dir = screenshots_dir / place_id / "variant" / job_id
    captured_at = _now_iso()
    chat_url: str | None = None
    designs: list[dict[str, Any]] = []
    status = "failed"

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(profile),
            headless=headless,
            viewport={"width": 1280, "height": 720},
        )
        page: Page | None = None
        try:
            page = context.pages[0] if context.pages else context.new_page()
            chat_url = submit_prompt(page, prompt, projects_url=projects_url)
            if on_url_saved and chat_url:
                on_url_saved(chat_url)

            complete = wait_for_generation(
                page,
                timeout_s=generation_timeout_s,
                is_cancelled=is_cancelled,
                on_tick=on_progress,
            )
            status = "complete" if complete else "timed_out"
            designs = capture_design_html(
                page,
                dest_dir=dest_dir,
                base_dir=screenshots_dir,
                place_id=place_id,
                job_id=job_id,
            )
        except Exception as e:
            attach_browser_snapshot(e, page)
            raise
        finally:
            context.close()

    return VariantRunResult(
        url=chat_url,
        status=status,
        designs=designs,
        captured_at=captured_at,
    )


def result_to_dynamic(result: VariantRunResult) -> dict[str, Any]:
    return {
        "url": result.url,
        "status": result.status,
        "designs": result.designs,
        "captured_at": result.captured_at,
    }
