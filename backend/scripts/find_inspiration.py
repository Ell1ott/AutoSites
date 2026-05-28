"""Standalone CLI for the inspiration agent — no FastAPI, no dispatcher.

Runs the same browser-use agent loop that the `find_inspiration` job handler
runs, but in-process so you can iterate without touching the API. Prints
progress to stdout and dumps the picks list as JSON at the end.

    uv run python -m scripts.find_inspiration --prompt "coffee shop website"

Optional:
    --start-url "https://dribbble.com/search/coffee"
    --max-picks 5
    --max-steps 40
    --model gemini-3-flash-preview
    --out picks.json          # write picks list to a file too
    --shot-dir ./shots         # override screenshot dir
"""
import argparse
import asyncio
import json
import os
import re
import sys
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

from workers.handlers import inspiration_agent


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--prompt", required=True, help="Free-text design brief.")
    p.add_argument("--start-url", help="Override the start URL.")
    p.add_argument("--max-picks", type=int, default=inspiration_agent.DEFAULT_MAX_PICKS)
    p.add_argument("--max-steps", type=int, default=inspiration_agent.DEFAULT_MAX_STEPS)
    p.add_argument("--model", default=inspiration_agent.DEFAULT_MODEL)
    p.add_argument(
        "--headful",
        action="store_true",
        help="Show the browser window so you can watch the agent click around.",
    )
    p.add_argument(
        "--keep-open",
        action="store_true",
        help="Leave the browser open after the run finishes (implies --headful).",
    )
    p.add_argument(
        "--shot-dir",
        default=None,
        help="Where to write screenshots (default: ./inspiration_shots/<runid>).",
    )
    p.add_argument(
        "--out",
        default=None,
        help="Also write picks list as JSON to this path.",
    )
    args = p.parse_args()

    if inspiration_agent.is_openrouter_model(args.model):
        if not os.environ.get("OPENROUTER_API_KEY"):
            sys.stderr.write("error: OPENROUTER_API_KEY must be set\n")
            return 2
        api_key = None
    else:
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            sys.stderr.write("error: GEMINI_API_KEY (or GOOGLE_API_KEY) must be set\n")
            return 2

    run_id = uuid.uuid4().hex[:8]
    shot_dir = Path(args.shot_dir) if args.shot_dir else Path("inspiration_shots") / run_id

    query = quote_plus(re.sub(r"\s+", " ", args.prompt).strip()[:100])
    ctx = {
        "design_prompt": args.prompt,
        "query": query,
        "max_picks": str(args.max_picks),
        "label": "",
        "category": "",
        "name": "",
    }
    start_url = args.start_url or inspiration_agent.render_template(
        inspiration_agent.DEFAULT_START_URL, ctx
    )
    agent_prompt = inspiration_agent.render_template(inspiration_agent.DEFAULT_PROMPT, ctx)

    print(f"[{run_id}] model:     {args.model}")
    print(f"[{run_id}] start_url: {start_url}")
    print(f"[{run_id}] shot_dir:  {shot_dir}")
    print(f"[{run_id}] brief:     {args.prompt}")
    print()

    headful = args.headful or args.keep_open
    t0 = time.monotonic()
    picks = asyncio.run(
        _run_cli(
            agent_prompt=agent_prompt,
            start_url=start_url,
            model=args.model,
            api_key=api_key,
            max_picks=args.max_picks,
            max_steps=args.max_steps,
            shot_dir=shot_dir,
            headless=not headful,
            keep_open=args.keep_open,
        )
    )
    duration = time.monotonic() - t0

    print()
    print(f"[{run_id}] done in {duration:.1f}s with {len(picks)} pick(s):")
    print(json.dumps(picks, indent=2))
    if args.out:
        Path(args.out).write_text(json.dumps(picks, indent=2))
        print(f"[{run_id}] wrote {args.out}")
    return 0


async def _run_cli(
    *,
    agent_prompt: str,
    start_url: str,
    model: str,
    api_key: str | None,
    max_picks: int,
    max_steps: int,
    shot_dir: Path,
    headless: bool,
    keep_open: bool,
) -> "list[dict[str, Any]]":
    def _on_warn(msg: str) -> None:
        print(f"  ! {msg}", file=sys.stderr)

    def _on_pick(idx: int, _max: int, pick: dict[str, Any]) -> None:
        suffix = f"  image={pick['image']}" if pick.get("image") else ""
        print(f"  + pick {idx}/{_max}: {pick['title']}  ({pick['url']}){suffix}")

    async def _idle_until_interrupt() -> None:
        print("(--keep-open) browser left running. Press Ctrl+C to exit.")
        while True:
            await asyncio.sleep(3600)

    return await inspiration_agent.run_agent(
        agent_prompt=agent_prompt,
        start_url=start_url,
        model=model,
        api_key=api_key,
        max_picks=max_picks,
        max_steps=max_steps,
        shot_dir=shot_dir,
        base_dir=None,
        headless=headless,
        on_warn=_on_warn,
        on_pick=_on_pick,
        after_agent_run=_idle_until_interrupt if keep_open else None,
    )


if __name__ == "__main__":
    sys.exit(main())
