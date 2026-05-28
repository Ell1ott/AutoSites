"""One-shot seeder for the default `find_inspiration` AI task row.

Idempotent: re-running just refreshes the config to current defaults without
clobbering enabled/sort_order if you've changed them in the UI.

    uv run python -m scripts.seed_inspiration_task
"""
from __future__ import annotations

import sys

from db.connection import session
from db.repos import ai_tasks


_NAME = "find_inspiration"
_LABEL = "Design inspiration (browser agent)"
_CONFIG = {
    "model": "gemma-4-26b-a4b-it",
    "output_field": "design_inspirations",
    "start_url_template": "https://dribbble.com/search/{{query}}?s=popular",
    "prompt_template": (
        "You are scouting visual inspiration for a website I'm designing.\n"
        "Brief: {{design_prompt}}\n\n"
        "Browse the page. Open shots that look promising. For each genuinely "
        "good match, call the `add_inspiration` tool with the shot's URL, a "
        "short title, and one sentence on why it fits the brief. Aim for "
        "variety across layout, color, and typography. Stop after "
        "{{max_picks}} picks."
    ),
    "max_picks": 5,
    "max_steps": 40,
}


def main() -> int:
    with session() as c:
        existing = ai_tasks.get(c, _NAME)
        ai_tasks.upsert(
            c,
            name=_NAME,
            label=(existing or {}).get("label") or _LABEL,
            config=_CONFIG,
            enabled=bool((existing or {}).get("enabled", True)),
            sort_order=int((existing or {}).get("sort_order") or 90),
            task_type="browser_agent",
        )
    print(f"seeded ai_task: {_NAME}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
