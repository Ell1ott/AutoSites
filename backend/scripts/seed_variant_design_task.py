"""One-shot seeder for the default `variant_design` AI task row.

    uv run python -m scripts.seed_variant_design_task
"""
from __future__ import annotations

import sys

from db.connection import session
from db.repos import ai_tasks

_NAME = "variant_design"
_LABEL = "Variant designs"
_CONFIG = {
    "output_field": "variant_design",
    "start_url": "https://variant.com/projects",
    "generation_timeout_s": 900,
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
            sort_order=int((existing or {}).get("sort_order") or 85),
            task_type="variant",
        )
    print(f"seeded ai_task: {_NAME}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
