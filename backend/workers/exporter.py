"""Build a paste-ready bundle for an AI coding agent from any job event.

`build_export(conn, job_id, event_id=None, format='markdown')` returns a string
ready to drop into Claude / ChatGPT / a coding agent. Two flavors:

  - `event=<id>`: focus on one event (usually an `error`) — the error's class,
    file, line, traceback, the args that triggered it, and the last 20 events
    leading up to it. Best for "fix this specific failure" prompts.
  - no `event`: dump the whole job — args, summary, all events. Best for
    "this ran weirdly, help me figure out why" prompts.

Output formats: `markdown` (default, human-readable) or `json` (structured).
"""
from __future__ import annotations

import json
from typing import Any

from db.repos import job_logs, jobs as jobs_repo


def build_export(
    conn,
    job_id: str,
    *,
    event_id: int | None = None,
    fmt: str = "markdown",
) -> tuple[str, str]:
    """Returns `(content, media_type)` for the HTTP response."""
    job = jobs_repo.get(conn, job_id)
    if job is None:
        raise LookupError(f"job not found: {job_id}")

    if event_id is not None:
        focus = job_logs.find_by_id(conn, job_id, event_id)
        if focus is None:
            raise LookupError(f"event {event_id} not found for job {job_id}")
        context = job_logs.tail(conn, job_id, since_id=0, limit=10_000)
        # Trim to the 20 events leading up to (and including) the focus event.
        idx = next((i for i, e in enumerate(context) if e["id"] == event_id), len(context) - 1)
        window = context[max(0, idx - 19) : idx + 1]
    else:
        focus = None
        window = job_logs.tail(conn, job_id, since_id=0, limit=10_000)

    if fmt == "json":
        body = {
            "job": job,
            "focus_event": focus,
            "events": window,
        }
        return json.dumps(body, default=str, ensure_ascii=False, indent=2), "application/json"

    return _render_markdown(job, focus, window), "text/markdown"


def _render_markdown(
    job: dict[str, Any], focus: dict[str, Any] | None, events: list[dict[str, Any]]
) -> str:
    out: list[str] = []
    title_suffix = ""
    args = job.get("args") or {}
    if isinstance(args, dict):
        task = args.get("task") or args.get("query")
        if task:
            title_suffix = f" / {task}"
    out.append(f"# Job {job['status']}: {job['kind']}{title_suffix}")
    out.append("")
    out.append(f"- id: `{job['id']}`")
    out.append(f"- created: {job.get('created_at')}")
    out.append(f"- started: {job.get('started_at')}")
    out.append(f"- finished: {job.get('finished_at')}")
    out.append("")

    out.append("## Args")
    out.append("```json")
    out.append(json.dumps(args, indent=2, default=str, ensure_ascii=False))
    out.append("```")
    out.append("")

    if job.get("result"):
        out.append("## Result")
        out.append("```json")
        out.append(json.dumps(job["result"], indent=2, default=str, ensure_ascii=False))
        out.append("```")
        out.append("")

    if job.get("error"):
        out.append("## Error (job-level)")
        out.append("```")
        out.append(str(job["error"]))
        out.append("```")
        out.append("")

    if focus is not None:
        out.append("## Focus event")
        out.append(_render_event_block(focus, full=True))
        out.append("")

    out.append(f"## Events ({'last 20 before focus' if focus else 'full'})")
    for ev in events:
        out.append(_render_event_line(ev))
    out.append("")

    return "\n".join(out)


def _render_event_line(ev: dict[str, Any]) -> str:
    ts = ev.get("ts") or ""
    level = ev.get("level") or "info"
    event = ev.get("event") or "?"
    msg = ev.get("message") or ""
    data = ev.get("data") or {}
    summary = ""
    if isinstance(data, dict) and data:
        # Compact one-line summary of the data payload
        parts = []
        for k, v in list(data.items())[:6]:
            sv = json.dumps(v, default=str, ensure_ascii=False)
            if len(sv) > 60:
                sv = sv[:57] + "…"
            parts.append(f"{k}={sv}")
        summary = "  " + " ".join(parts)
    msg_str = f" {msg}" if msg else ""
    return f"- `{ts}` `[{level}]` **{event}**{msg_str}{summary}"


def _render_event_block(ev: dict[str, Any], *, full: bool = False) -> str:
    out: list[str] = []
    out.append(f"- event: **{ev.get('event')}**")
    out.append(f"- level: {ev.get('level')}")
    out.append(f"- ts: {ev.get('ts')}")
    if ev.get("message"):
        out.append(f"- message: {ev['message']}")
    data = ev.get("data") or {}
    if isinstance(data, dict):
        # Special handling for error data — bring traceback out as its own fenced block.
        tb = data.get("traceback") if ev.get("event") == "error" else None
        compact = {k: v for k, v in data.items() if k != "traceback"} if tb else data
        if compact:
            out.append("")
            out.append("```json")
            out.append(json.dumps(compact, indent=2, default=str, ensure_ascii=False))
            out.append("```")
        if tb:
            out.append("")
            out.append("Traceback:")
            out.append("")
            out.append("```")
            out.append(str(tb).rstrip())
            out.append("```")
    return "\n".join(out)
