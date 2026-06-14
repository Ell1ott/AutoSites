"""Lead-pipeline graph: a node/edge view of the whole operation.

`flow(db)` returns a node/edge graph of the lead pipeline computed server-side:
the upstream stages (discovered → crawled → scored) plus one node per row in
`ai_tasks`. Edges are *inferred* — task B depends on task A when A's
`output_field` shows up among B's required inputs or `{{placeholders}}` — so the
graph adapts automatically when tasks are added/edited, with no code change.

For every task node it reports how many leads are `done` / `ready` (inputs
satisfied, runnable now) / `blocked` (missing inputs) / `errored`, a breakdown of
which inputs are missing, and the `ready_place_ids`.

This is plain compute (no HTTP route); `/strategy` consumes it so the numbers
always agree with whatever else renders the graph.
"""
from __future__ import annotations

import re
from collections import Counter
from typing import Any

from ai import place_context, prompt
from ai.runtime import _required_keys
from db.repos import ai_tasks, places

# Placeholders we resolve from on-disk artifacts (the `crawled` stage) rather
# than from the place row.
_CRAWL_KEYS = frozenset({"screenshot", "markdown", "crawl_pages"})

# Fixed top-level place fields — a placeholder matching one of these is a base
# input that every discovered lead already has, so it hangs off `discovered`.
_BASE_FIELDS = frozenset(
    {
        "place_id",
        "name",
        "category",
        "website",
        "rating",
        "review_count",
        "business_status",
        "lead_score",
    }
)

_PLACEHOLDER = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")
_TEMPLATE_KEYS = ("meta_prompt", "prompt_template", "start_url_template", "prompt")


def _template_placeholders(config: dict[str, Any]) -> set[str]:
    """Every `{{token}}` referenced across a task's prompt/url templates."""
    found: set[str] = set()
    for key in _TEMPLATE_KEYS:
        val = config.get(key)
        if isinstance(val, str):
            found.update(_PLACEHOLDER.findall(val))
    return found


def _task_inputs(config: dict[str, Any]) -> set[str]:
    """All keys a task consumes: hard-required inputs + template placeholders."""
    return set(_required_keys(config)) | _template_placeholders(config)


def _missing_inputs(
    config: dict[str, Any],
    *,
    namespace: dict[str, str],
    has_screenshot: bool,
    has_markdown: bool,
) -> list[str]:
    """Lightweight mirror of `ai.runtime.missing_inputs_for_place` that reuses
    pre-computed per-place artifact flags (no per-task disk reads)."""
    missing: list[str] = []
    for key in _required_keys(config):
        if key == "screenshot":
            if not has_screenshot:
                missing.append("screenshot")
        elif key in {"markdown", "crawl_pages"}:
            if not has_markdown:
                missing.append(key)
        elif not namespace.get(key, "").strip():
            missing.append(key)
    return missing


def flow(db) -> dict[str, Any]:
    tasks = [t for t in ai_tasks.list_all(db) if t.get("enabled", True)]

    # output_field -> task name (who produces this dynamic key).
    outputs: dict[str, str] = {}
    for t in tasks:
        field = (t.get("config") or {}).get("output_field")
        if isinstance(field, str) and field:
            outputs[field] = t["name"]

    total = places.count(db)
    rows = places.list_(db, limit=total or 1, order_by="place_id") if total else []

    # Per-place artifact + namespace, computed once.
    prepared = []
    crawled_done = 0
    scored = 0
    for place in rows:
        pid = place.get("place_id") or ""
        has_ss = place_context.screenshot_path(pid).is_file()
        has_md = place_context.root_markdown_path(pid).is_file()
        if has_ss and has_md:
            crawled_done += 1
        if place.get("lead_score") is not None:
            scored += 1
        prepared.append(
            {
                "place_id": pid,
                "dynamic": place.get("dynamic") or {},
                "namespace": prompt.build_namespace(place),
                "has_screenshot": has_ss,
                "has_markdown": has_md,
            }
        )

    nodes: list[dict[str, Any]] = [
        {"id": "discovered", "kind": "stage", "label": "Discovered leads", "total": total},
        {
            "id": "crawled",
            "kind": "stage",
            "label": "Crawled (screenshot + markdown)",
            "counts": {"done": crawled_done, "missing": total - crawled_done},
        },
        {
            "id": "scored",
            "kind": "stage",
            "label": "Lead scoring",
            "counts": {"rated": scored, "unrated": total - scored},
        },
    ]
    edges: set[tuple[str, str]] = {
        ("discovered", "crawled"),
        ("discovered", "scored"),
    }

    for t in tasks:
        name = t["name"]
        config = t.get("config") or {}
        node_id = f"task:{name}"
        field = config.get("output_field")
        err_field = f"{field}_error" if field else None

        done = ready = blocked = errored = 0
        breakdown: Counter[str] = Counter()
        ready_ids: list[str] = []

        for p in prepared:
            dynamic = p["dynamic"]
            has_output = bool(field) and bool(dynamic.get(field))
            has_error = bool(err_field) and err_field in dynamic
            if has_output:
                done += 1
                continue
            if has_error:
                errored += 1
                continue
            miss = _missing_inputs(
                config,
                namespace=p["namespace"],
                has_screenshot=p["has_screenshot"],
                has_markdown=p["has_markdown"],
            )
            if miss:
                blocked += 1
                breakdown.update(miss)
            else:
                ready += 1
                ready_ids.append(p["place_id"])

        nodes.append(
            {
                "id": node_id,
                "kind": "task",
                "task_type": t.get("task_type", "place"),
                "label": t.get("label") or name,
                "name": name,
                "output_field": field,
                "counts": {
                    "done": done,
                    "ready": ready,
                    "blocked": blocked,
                    "errored": errored,
                },
                "missing_breakdown": dict(breakdown),
                "ready_place_ids": ready_ids,
            }
        )

        # Infer dependency edges from the task's consumed inputs.
        has_dep_edge = False
        for key in _task_inputs(config):
            if key in outputs and outputs[key] != name:
                edges.add((f"task:{outputs[key]}", node_id))
                has_dep_edge = True
            elif key in _CRAWL_KEYS:
                edges.add(("crawled", node_id))
                has_dep_edge = True
            elif key in _BASE_FIELDS:
                edges.add(("discovered", node_id))
                has_dep_edge = True
            else:
                # A consumed key nothing produces (e.g. a manual field) — keep the
                # node wired into the graph rather than orphaning it.
                edges.add(("discovered", node_id))
                has_dep_edge = True
        if not has_dep_edge:
            edges.add(("crawled", node_id))

    return {
        "nodes": nodes,
        "edges": [{"source": s, "target": t} for s, t in sorted(edges)],
    }
