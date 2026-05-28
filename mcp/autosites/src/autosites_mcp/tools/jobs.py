from __future__ import annotations

import json
import time
from typing import Any

from autosites_mcp.clients import backend as backend_client
from autosites_mcp.utils.coerce import coerce_json_object
from autosites_mcp.utils.response import tool_result

_TERMINAL = {"done", "failed", "cancelled"}


def run_job(kind: str, args: Any = None) -> str:
    """Enqueue a background job. Args is JSON matching backend job kinds."""
    try:
        parsed = coerce_json_object(args, field_name="args", allow_empty=True) or {}
        job = backend_client.backend.start_job(kind, parsed)
        job_id = job.get("id")
        return tool_result(
            ok=True,
            summary=f"Enqueued {kind} job {job_id}",
            data=job,
            next_actions=[
                f"run_job_and_wait(job_id={job_id!r}) to wait for completion",
                f"debug_job(job_id={job_id!r}) if it fails",
            ],
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary=f"Failed to enqueue {kind}")


def run_job_and_wait(
    kind: str | None = None,
    args: Any = None,
    job_id: str | None = None,
    timeout_seconds: int = 600,
    poll_interval_seconds: float = 2.0,
) -> str:
    """Enqueue a job (or wait on existing job_id) until done/failed/cancelled."""
    try:
        if job_id:
            target_id = job_id
        elif kind:
            parsed = coerce_json_object(args, field_name="args", allow_empty=True) or {}
            created = backend_client.backend.start_job(kind, parsed)
            target_id = created["id"]
        else:
            raise ValueError("Provide kind+args to enqueue, or job_id to wait")

        deadline = time.time() + timeout_seconds
        last_status = None
        snapshot: dict[str, Any] = {}

        while time.time() < deadline:
            snapshot = backend_client.backend.get_job(target_id)
            status = snapshot.get("status")
            if status != last_status:
                last_status = status
            if status in _TERMINAL:
                break
            time.sleep(poll_interval_seconds)
        else:
            return tool_result(
                ok=False,
                error=f"Timed out after {timeout_seconds}s",
                summary=f"Job {target_id} still {snapshot.get('status')}",
                data={"job": snapshot},
                next_actions=[f"debug_job(job_id={target_id!r})"],
            )

        status = snapshot.get("status")
        ok = status == "done"
        summary = f"Job {target_id} finished with status={status}"
        next_actions: list[str] = []
        if not ok:
            next_actions.append(f"debug_job(job_id={target_id!r})")
        else:
            next_actions.append("search_leads or describe_lead to inspect results")

        return tool_result(
            ok=ok,
            summary=summary,
            data={
                "job": snapshot,
                "metrics": snapshot.get("metrics"),
                "last_error": snapshot.get("last_error"),
            },
            next_actions=next_actions,
            error=snapshot.get("error") if not ok else None,
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary="Job wait failed")


def debug_job(job_id: str, event: int | None = None, export_format: str = "markdown") -> str:
    """Export paste-ready job debug bundle (markdown or json)."""
    try:
        fmt = export_format if export_format in ("markdown", "json") else "markdown"
        body = backend_client.backend.export_job(job_id, event=event, fmt=fmt)
        if fmt == "markdown":
            return tool_result(
                ok=True,
                summary=f"Debug export for job {job_id}",
                data={"markdown": body},
                next_actions=["Use the markdown bundle to diagnose and fix the failure"],
            )
        return tool_result(
            ok=True,
            summary=f"Debug export (json) for job {job_id}",
            data=body,
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary=f"Export failed for {job_id}")


def cancel_job(job_id: str) -> str:
    """Request cancellation of a running job."""
    try:
        result = backend_client.backend.cancel_job(job_id)
        return tool_result(
            ok=True,
            summary=f"Cancel requested for {job_id}",
            data=result,
        )
    except Exception as e:
        return tool_result(ok=False, error=str(e), summary=f"Cancel failed for {job_id}")
