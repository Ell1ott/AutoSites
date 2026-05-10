"""One-shot import of mapsLeadsFetcher JSON files into SQLite.

Sources (read-only):
    mapsLeadsFetcher/maps_businesses.json  -> places (typed cols + data + dynamic)
    mapsLeadsFetcher/lead_ratings.json     -> places.lead_score
    mapsLeadsFetcher/runs.json             -> ai_runs + ai_outputs_log
    mapsLeadsFetcher/settings.json         -> ai_tasks

Destination:
    backend/data/leads.db  (must already be migrated; run `python -m db.migrate` first)

Idempotent: re-running upserts in place. Safe to run repeatedly.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from db.connection import session
from db.repos import ai_outputs_log, ai_runs, ai_tasks, places

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_MLF = _REPO_ROOT / "mapsLeadsFetcher"


def _read_json(path: Path) -> Any:
    if not path.exists():
        return None
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _extract_typed(place: dict[str, Any]) -> dict[str, Any]:
    """Pull the indexed columns out of a Google Places record."""
    dn = place.get("displayName")
    name = None
    if isinstance(dn, dict):
        name = dn.get("text")
    elif isinstance(dn, str):
        name = dn
    rating = place.get("rating")
    try:
        rating = float(rating) if rating is not None else None
    except (TypeError, ValueError):
        rating = None
    rc = place.get("userRatingCount")
    try:
        review_count = int(rc) if rc is not None else None
    except (TypeError, ValueError):
        review_count = None
    return {
        "place_id": place.get("id"),
        "name": name,
        "rating": rating,
        "review_count": review_count,
        "website": place.get("websiteUri"),
        "business_status": place.get("businessStatus"),
    }


def import_places(ai_task_names: set[str]) -> int:
    raw = _read_json(_MLF / "maps_businesses.json") or {}
    places_list = (raw.get("api_response") or {}).get("places") or []
    n = 0
    with session() as c:
        for p in places_list:
            typed = _extract_typed(p)
            if not typed["place_id"]:
                continue
            # Partition each place's fields: AI task outputs land in `dynamic`,
            # the rest of the Google response stays in `data` untouched.
            dynamic: dict[str, Any] = {}
            data: dict[str, Any] = {}
            for k, v in p.items():
                if k in ai_task_names:
                    dynamic[k] = v
                else:
                    data[k] = v
            places.upsert(
                c,
                place_id=typed["place_id"],
                name=typed["name"],
                rating=typed["rating"],
                review_count=typed["review_count"],
                website=typed["website"],
                business_status=typed["business_status"],
                data=data,
                dynamic=dynamic,
            )
            n += 1
    return n


def import_ratings() -> int:
    raw = _read_json(_MLF / "lead_ratings.json") or {}
    n = 0
    with session() as c:
        for place_id, score in raw.items():
            try:
                s = int(score)
            except (TypeError, ValueError):
                continue
            # only set if the place was migrated
            if c.execute("SELECT 1 FROM places WHERE place_id = ?", (place_id,)).fetchone():
                places.set_lead_score(c, place_id, s)
                n += 1
    return n


def import_settings() -> int:
    raw = _read_json(_MLF / "settings.json") or {}
    tasks = raw.get("ai_tasks") or {}
    order = raw.get("ai_task_order") or []
    sort_index = {name: i for i, name in enumerate(order)}
    n = 0
    with session() as c:
        for name, cfg in tasks.items():
            label = cfg.get("label") if isinstance(cfg, dict) else None
            ai_tasks.upsert(
                c,
                name=name,
                label=label,
                config=cfg if isinstance(cfg, dict) else {},
                enabled=True,
                sort_order=sort_index.get(name, 999),
            )
            n += 1
    return n


def import_runs(ai_task_names: set[str]) -> tuple[int, int]:
    raw = _read_json(_MLF / "runs.json") or {}
    runs = raw.get("runs") if isinstance(raw, dict) else raw
    if not isinstance(runs, list):
        return 0, 0
    runs_n = 0
    outputs_n = 0
    with session() as c:
        for run in runs:
            run_id = run.get("id")
            if not run_id:
                continue
            tool = run.get("tool")
            ai_runs.upsert(
                c,
                run_id=run_id,
                task=tool,
                started_at=run.get("started_at"),
                finished_at=run.get("finished_at"),
                status=run.get("status"),
                args=run.get("scope"),
                counts=run.get("counts"),
            )
            runs_n += 1
            # items[] -> ai_outputs_log (history)
            for item in run.get("items") or []:
                pid = item.get("place_id")
                value = item.get("after")
                if pid and tool and value is not None:
                    # only log if the place exists in our DB
                    if c.execute(
                        "SELECT 1 FROM places WHERE place_id = ?", (pid,)
                    ).fetchone():
                        ai_outputs_log.append(
                            c,
                            place_id=pid,
                            task=tool,
                            value=value,
                            model=None,
                            run_id=run_id,
                        )
                        outputs_n += 1
    return runs_n, outputs_n


def main() -> int:
    settings_raw = _read_json(_MLF / "settings.json") or {}
    ai_task_names = set((settings_raw.get("ai_tasks") or {}).keys())

    print(f"source: {_MLF}")
    print(f"ai task names: {sorted(ai_task_names)}")

    print("\nimporting ai_tasks (settings.json) …")
    tasks_n = import_settings()
    print(f"  {tasks_n} task(s)")

    print("\nimporting places (maps_businesses.json) …")
    places_n = import_places(ai_task_names)
    print(f"  {places_n} place(s)")

    print("\nimporting lead_ratings.json …")
    ratings_n = import_ratings()
    print(f"  {ratings_n} rating(s) applied")

    print("\nimporting runs.json …")
    runs_n, outputs_n = import_runs(ai_task_names)
    print(f"  {runs_n} run(s), {outputs_n} ai_output_log entry(ies)")

    # Verification: count rows
    with session(readonly=True) as c:
        rows = {
            "places": c.execute("SELECT COUNT(*) FROM places").fetchone()[0],
            "places_with_lead_score": c.execute(
                "SELECT COUNT(*) FROM places WHERE lead_score IS NOT NULL"
            ).fetchone()[0],
            "ai_tasks": c.execute("SELECT COUNT(*) FROM ai_tasks").fetchone()[0],
            "ai_runs": c.execute("SELECT COUNT(*) FROM ai_runs").fetchone()[0],
            "ai_outputs_log": c.execute(
                "SELECT COUNT(*) FROM ai_outputs_log"
            ).fetchone()[0],
        }
    print("\nDB counts:")
    for k, v in rows.items():
        print(f"  {k}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
