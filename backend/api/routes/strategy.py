"""Strategy: a paste-ready "what should I do next?" prompt.

`GET /strategy` snapshots the entire operation — the pipeline funnel, every AI
task with its `done/ready/blocked/errored` counts and what's blocking it, dynamic
field coverage, the lead-score distribution, and recent jobs — and wraps it in a
system prompt that frames an external AI as a strategy advisor. Pasting the result
into any model returns the highest impact-per-effort next action.

Counts are *not* recomputed: we reuse `pipeline_graph.flow()` (the shared
pipeline-graph compute) so the numbers always agree.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from api import pipeline_graph
from api.deps import Auth, get_db_ro
from db.repos import ai_tasks, fields, jobs

router = APIRouter(prefix="/strategy", tags=["strategy"])

# How much of each task's meta_prompt to show in the catalog so the advisor
# understands what the task does without bloating the bundle.
_PROMPT_PREVIEW_CHARS = 320


def _build_snapshot(db) -> dict[str, Any]:
    """Gather everything that could be useful for strategic advice."""
    graph = pipeline_graph.flow(db)
    nodes = graph["nodes"]
    edges = graph["edges"]

    stage = {n["id"]: n for n in nodes if n.get("kind") == "stage"}
    task_nodes = [n for n in nodes if n.get("kind") == "task"]

    # node_id -> list of upstream node ids (so we can show dependencies).
    deps: dict[str, list[str]] = {}
    for e in edges:
        deps.setdefault(e["target"], []).append(e["source"])

    # Task catalog (label, model, prompt preview) keyed by name.
    catalog: dict[str, dict[str, Any]] = {}
    for t in ai_tasks.list_all(db):
        config = t.get("config") or {}
        meta = config.get("meta_prompt") or config.get("prompt_template") or ""
        if isinstance(meta, str) and len(meta) > _PROMPT_PREVIEW_CHARS:
            meta = meta[:_PROMPT_PREVIEW_CHARS].rstrip() + "…"
        catalog[t["name"]] = {
            "label": t.get("label") or t["name"],
            "task_type": t.get("task_type", "place"),
            "enabled": bool(t.get("enabled", True)),
            "output_field": config.get("output_field"),
            "model": config.get("model"),
            "send_screenshot": config.get("send_screenshot", True),
            "send_markdown": config.get("send_markdown", True),
            "prompt_preview": meta,
        }

    # Lead-score histogram.
    histogram: dict[str, int] = {}
    for row in db.execute(
        "SELECT lead_score, COUNT(*) AS n FROM places GROUP BY lead_score"
    ):
        key = "unrated" if row["lead_score"] is None else str(row["lead_score"])
        histogram[key] = row["n"]

    # Dynamic field coverage.
    coverage = [
        {"key": f["key"], "coverage": round(f.get("coverage", 0.0), 4)}
        for f in fields.discover(db).get("dynamic", [])
    ]

    # list_recent omits the `error` column; pull it for failed jobs so the
    # advisor can see what went wrong.
    recent_jobs = jobs.list_recent(db, limit=10)
    for j in recent_jobs:
        if j.get("status") == "failed":
            full = jobs.get(db, j["id"])
            if full:
                j["error"] = full.get("error")

    return {
        "stages": stage,
        "tasks": task_nodes,
        "deps": deps,
        "catalog": catalog,
        "score_histogram": histogram,
        "coverage": coverage,
        "recent_jobs": recent_jobs,
    }


_SYSTEM = """\
You are a senior growth & operations strategist for **AutoSites**, an automated
agency that finds local businesses and sells them new websites.

How AutoSites works (the pipeline):
1. **Discover** — pull local businesses from Google Maps into a leads database.
2. **Crawl** — screenshot + extract markdown from each lead's existing website.
3. **Enrich** — a configurable pipeline of AI tasks runs per lead: rating the
   current site, writing a design brief, finding design inspiration (browser
   agent), generating variant designs, etc. Each task needs certain inputs
   (screenshot, markdown, or the output of an earlier task) and is *blocked*
   until they exist.
4. **Score** — the operator rates leads 1–10 by hand.
5. **Sell & build** — the best leads get a freshly generated website.

A lead is **done** for a task when its output exists, **ready** when all inputs
are present (runnable right now), **blocked** when an input is missing, and
**errored** when the last run failed.

Your job: read the operation snapshot below and tell the operator the **single
highest impact-per-effort next action**, followed by a short ranked list of the
next best moves. Be concrete and decisive — name the task and the number of leads.

For every recommendation use this format:
- **Recommendation** — one line.
- **Why** — what it unblocks or moves forward.
- **Effort** — low / medium / high.
- **Impact** — low / medium / high.
- **Action** — the concrete thing to do (e.g. "run `design_prompt` on the 80 ready
  leads", "crawl the 340 uncrawled leads to unblock everything downstream").
"""


def _pct(n: int, total: int) -> str:
    return f"{(100 * n / total):.0f}%" if total else "0%"


def build_strategy_prompt(snapshot: dict[str, Any]) -> str:
    stages = snapshot["stages"]
    tasks = snapshot["tasks"]
    deps = snapshot["deps"]
    catalog = snapshot["catalog"]

    total = stages.get("discovered", {}).get("total", 0)
    crawled = stages.get("crawled", {}).get("counts", {})
    scored = stages.get("scored", {}).get("counts", {})

    lines: list[str] = [_SYSTEM, "", "---", "", "# AutoSites — operation snapshot", ""]

    # 1. Funnel
    lines.append("## Pipeline funnel")
    lines.append(f"- **Discovered leads:** {total}")
    lines.append(
        f"- **Crawled:** {crawled.get('done', 0)} done "
        f"({_pct(crawled.get('done', 0), total)}), "
        f"{crawled.get('missing', 0)} missing screenshot+markdown"
    )
    lines.append(
        f"- **Scored by operator:** {scored.get('rated', 0)} rated, "
        f"{scored.get('unrated', 0)} unrated"
    )
    hist = snapshot["score_histogram"]
    if hist:
        parts = [f"{k}: {hist[k]}" for k in sorted(hist, key=lambda x: (x == "unrated", x))]
        lines.append(f"- **Lead-score distribution:** {', '.join(parts)}")
    lines.append("")

    # 2. Per-task table
    lines.append("## AI tasks — current state")
    lines.append("| Task | Output field | Model | Done | Ready | Blocked | Errored | Top missing inputs | Depends on |")
    lines.append("|---|---|---|---|---|---|---|---|---|")
    for t in tasks:
        c = t.get("counts", {})
        miss = t.get("missing_breakdown", {}) or {}
        miss_str = ", ".join(
            f"{k} ({v})" for k, v in sorted(miss.items(), key=lambda kv: -kv[1])
        ) or "—"
        dep_ids = deps.get(t["id"], [])
        dep_str = ", ".join(
            d.replace("task:", "") for d in sorted(dep_ids)
        ) or "—"
        lines.append(
            f"| {t.get('label')} | {t.get('output_field') or '—'} | "
            f"{catalog.get(t.get('name'), {}).get('model') or '—'} | "
            f"{c.get('done', 0)} | {c.get('ready', 0)} | {c.get('blocked', 0)} | "
            f"{c.get('errored', 0)} | {miss_str} | {dep_str} |"
        )
    lines.append("")

    # 3. Cheap wins
    ready_now = [t for t in tasks if t.get("counts", {}).get("ready", 0) > 0]
    lines.append("## Runnable right now (cheap wins)")
    if ready_now:
        for t in sorted(ready_now, key=lambda x: -x["counts"]["ready"]):
            lines.append(
                f"- **{t.get('label')}** — {t['counts']['ready']} leads ready "
                f"(`{t.get('name')}`)"
            )
    else:
        lines.append("- Nothing is ready to run — everything is blocked or done.")
    lines.append("")

    # 4. Bottlenecks
    blocked = [t for t in tasks if t.get("counts", {}).get("blocked", 0) > 0]
    lines.append("## Bottlenecks (blocked leads & why)")
    if blocked:
        for t in sorted(blocked, key=lambda x: -x["counts"]["blocked"]):
            miss = t.get("missing_breakdown", {}) or {}
            why = ", ".join(f"{k} ({v})" for k, v in sorted(miss.items(), key=lambda kv: -kv[1]))
            lines.append(
                f"- **{t.get('label')}** — {t['counts']['blocked']} blocked · "
                f"missing: {why or 'unknown'}"
            )
    else:
        lines.append("- No blocked tasks.")
    if crawled.get("missing", 0):
        lines.append(
            f"- **Crawl gap:** {crawled['missing']} leads have no screenshot/markdown, "
            "which blocks every task that needs them."
        )
    lines.append("")

    # 5. Task catalog
    lines.append("## Task catalog (what each task does)")
    for name, meta in catalog.items():
        flags = []
        if meta.get("send_screenshot"):
            flags.append("screenshot")
        if meta.get("send_markdown"):
            flags.append("markdown")
        flag_str = f" · inputs: {', '.join(flags)}" if flags else ""
        status = "" if meta.get("enabled") else " · ⚠️ disabled"
        lines.append(f"- **{meta['label']}** (`{name}`, {meta['task_type']}{status}){flag_str}")
        if meta.get("prompt_preview"):
            lines.append(f"  > {meta['prompt_preview']}")
    lines.append("")

    # 6. Field coverage
    cov = snapshot["coverage"]
    if cov:
        lines.append("## Dynamic field coverage")
        for f in cov:
            lines.append(f"- `{f['key']}`: {f['coverage'] * 100:.1f}%")
        lines.append("")

    # 7. Recent jobs
    recent = snapshot["recent_jobs"]
    if recent:
        lines.append("## Recent jobs")
        for j in recent:
            line = f"- `{j['kind']}` — {j['status']} ({j.get('created_at', '')})"
            if j.get("status") == "failed" and j.get("error"):
                line += f" — error: {j['error']}"
            lines.append(line)
        lines.append("")

    lines.append("---")
    lines.append(
        "Now give me the single highest impact-per-effort next action, then the "
        "ranked next best moves."
    )
    return "\n".join(lines)


@router.get("", dependencies=[Auth])
def strategy(db=Depends(get_db_ro)) -> dict[str, Any]:
    snapshot = _build_snapshot(db)
    return {"prompt": build_strategy_prompt(snapshot), "snapshot": snapshot}
