"""Shared browser-use agent loop for collecting design inspiration picks.

Both the production job handler (`workers/handlers/find_inspiration.py`) and
the standalone CLI (`scripts/find_inspiration.py`) drive the same loop:

  - spin up a BrowserSession
  - register a custom `add_inspiration` tool
  - let the agent browse and call the tool until `max_picks` is reached

This module is the single source of truth for that loop. Callers customise
behaviour through small callbacks (warn / on_pick / after_agent_run) and a
`base_dir` that controls whether pick screenshot paths are stored as
absolute or relative-to-base.

Note: this module deliberately does NOT use `from __future__ import
annotations`. browser-use's tools registry validates the `browser_session:
BrowserSession` parameter against `signature(func)` without `eval_str=True`,
so deferred (string) annotations cause a "conflicts with special argument"
ValueError when the action is registered.
"""
import asyncio
import base64
import os
import re
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional

try:
    from browser_use import ActionResult, Agent, BrowserSession, ChatGoogle, Tools
except ImportError:  # pragma: no cover
    ActionResult = Agent = BrowserSession = ChatGoogle = Tools = None  # type: ignore[assignment]

try:
    from browser_use.llm.openrouter.chat import ChatOpenRouter
except ImportError:  # pragma: no cover
    ChatOpenRouter = None  # type: ignore[assignment]

from workers.handlers.inspiration_image import grab_element_image


DEFAULT_PROMPT = (
    "You are scouting visual inspiration for a website I'm designing.\n"
    "Brief: {{design_prompt}}\n\n"
    "Browse the page. Open shots that look promising. For each genuinely good "
    "match, call the `add_inspiration` tool with the shot's URL, a short title, "
    "one sentence on why it fits the brief, and — whenever the page is showing "
    "the inspiration image itself — the `image_index` of that image element (or "
    "the link/card wrapping it) from the indexed DOM. Aim for variety. Stop "
    "after {{max_picks}} picks."
)
DEFAULT_START_URL = "https://dribbble.com/search/{{query}}?s=popular"
DEFAULT_MODEL = "gemma-4-26b-a4b-it"
DEFAULT_MAX_PICKS = 5
DEFAULT_MAX_STEPS = 40
DEFAULT_OUTPUT_FIELD = "design_inspirations"


def is_openrouter_model(model: str) -> bool:
    """Slash in the model id means it's an OpenRouter slug (e.g. `openrouter/owl-alpha`,
    `anthropic/claude-sonnet-4-6`). Bare ids (`gemma-4-26b-a4b-it`) route to Gemini."""
    return "/" in model


_TEMPLATE_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")


def render_template(template: str, ctx: "dict[str, str]") -> str:
    """Tiny `{{var}}` substitution; missing keys render as empty string."""
    return _TEMPLATE_RE.sub(lambda m: ctx.get(m.group(1), ""), template)


WarnFn = Callable[[str], None]
PickFn = Callable[[int, int, "dict[str, Any]"], None]
AfterRunFn = Callable[[], Awaitable[None]]


async def run_agent(
    *,
    agent_prompt: str,
    start_url: str,
    model: str,
    api_key: Optional[str] = None,
    max_picks: int,
    max_steps: int,
    shot_dir: Path,
    base_dir: Optional[Path] = None,
    headless: bool = True,
    on_warn: Optional[WarnFn] = None,
    on_pick: Optional[PickFn] = None,
    after_agent_run: Optional[AfterRunFn] = None,
) -> "list[dict[str, Any]]":
    """Run the inspiration agent and return the picks list.

    `base_dir`: when set, stored screenshot/image paths are made relative to
    this directory (production handler). When None, absolute paths are
    stored (CLI).

    `after_agent_run`: awaited after `agent.run()` returns and *before* the
    BrowserSession is killed. The CLI uses this to keep the browser open.
    """
    if Agent is None:
        raise RuntimeError(
            "browser-use is not installed. Run `uv sync` in backend/ to install it."
        )

    shot_dir.mkdir(parents=True, exist_ok=True)
    picks: "list[dict[str, Any]]" = []
    warn: WarnFn = on_warn or (lambda _msg: None)

    def _store_path(p: Path) -> str:
        if base_dir is not None:
            try:
                return str(p.relative_to(base_dir))
            except ValueError:
                pass
        return str(p)

    tools = Tools()

    @tools.action(
        description=(
            "Save the currently-open page as an inspiration pick. Call this on any "
            "shot/page that's a good match for the brief. A full-page screenshot "
            "is always captured. When the inspiration image itself is visible, "
            "also pass `image_index`: the DOM index of the <img> element (or any "
            "wrapper, like the link/card around it). We will extract that image "
            "from the page automatically — you do NOT need to copy or type the "
            "image URL anywhere."
        )
    )
    async def add_inspiration(  # noqa: ARG001  (signature consumed by browser-use)
        url: str,
        title: str,
        why: str,
        browser_session: BrowserSession,
        image_index: int | None = None,
    ) -> ActionResult:
        png_bytes = await _capture_screenshot(browser_session, warn)
        idx = len(picks) + 1

        screenshot_path: str | None = None
        if png_bytes:
            file_path = shot_dir / f"{idx:02d}.png"
            file_path.write_bytes(png_bytes)
            screenshot_path = _store_path(file_path)

        image_path: str | None = None
        image_url: str | None = None
        if image_index is not None:
            try:
                saved, src = await grab_element_image(
                    browser_session,
                    image_index,
                    shot_dir / f"{idx:02d}.image",
                )
                if saved:
                    image_path = _store_path(saved)
                    image_url = src
            except Exception as e:  # noqa: BLE001
                warn(f"grab_element_image({image_index}) failed: {e}")

        pick: dict[str, Any] = {
            "url": url,
            "title": title,
            "why": why,
            "screenshot": screenshot_path,
            "image": image_path,
            "image_url": image_url,
        }
        picks.append(pick)
        if on_pick is not None:
            on_pick(idx, max_picks, pick)

        done = len(picks) >= max_picks
        return ActionResult(
            extracted_content=(
                f"Saved pick {idx}/{max_picks}: {title}"
                + (" — quota reached, stopping." if done else "")
            ),
            long_term_memory=f"Picks saved so far: {len(picks)} / {max_picks}",
            is_done=done,
            success=True if done else None,
        )

    if is_openrouter_model(model):
        if ChatOpenRouter is None:
            raise RuntimeError(
                "browser_use.llm.openrouter.chat.ChatOpenRouter is unavailable; "
                "upgrade browser-use to use OpenRouter models."
            )
        openrouter_key = os.environ.get("OPENROUTER_API_KEY")
        if not openrouter_key:
            raise RuntimeError("OPENROUTER_API_KEY must be set")
        llm = ChatOpenRouter(model=model, api_key=openrouter_key)
    else:
        llm = ChatGoogle(model=model, api_key=api_key)
    session_obj = BrowserSession(headless=headless)
    task = (
        f"Start at {start_url} and follow the instructions below.\n\n"
        f"{agent_prompt}\n\n"
        f"You MUST use the `add_inspiration` tool to record picks. "
        f"Do not just describe them in text. Stop after {max_picks} picks."
    )
    try:
        agent = Agent(task=task, llm=llm, tools=tools, browser_session=session_obj)
        await agent.run(max_steps=max_steps)
    finally:
        if after_agent_run is not None:
            try:
                await after_agent_run()
            except (KeyboardInterrupt, asyncio.CancelledError):
                pass
        try:
            await session_obj.kill()
        except Exception:  # noqa: BLE001
            pass
    return picks


# -----------------------------------------------------------------------------
# Screenshot helpers
# -----------------------------------------------------------------------------


async def _capture_screenshot(browser_session, warn: WarnFn) -> bytes:  # noqa: ANN001
    """Best-effort screenshot. Different browser-use versions return bytes,
    base64 strings, or a path — try each in order."""
    try:
        page = await browser_session.must_get_current_page()
        result = await page.screenshot()
        decoded = _decode_screenshot(result)
        if decoded:
            return decoded
    except Exception as e:  # noqa: BLE001
        warn(f"page.screenshot() failed: {e}")

    try:
        result = await browser_session.get_screenshot()
        if isinstance(result, (str, Path)):
            p = Path(result)
            if p.is_file():
                return p.read_bytes()
        decoded = _decode_screenshot(result)
        if decoded:
            return decoded
    except Exception as e:  # noqa: BLE001
        warn(f"browser_session.get_screenshot() failed: {e}")

    return b""


def _decode_screenshot(result: Any) -> bytes:
    if isinstance(result, bytes):
        return result
    if isinstance(result, str):
        if "," in result and result.startswith("data:"):
            result = result.split(",", 1)[1]
        try:
            return base64.b64decode(result, validate=False)
        except Exception:  # noqa: BLE001
            return b""
    return b""
