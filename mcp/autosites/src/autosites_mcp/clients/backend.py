from __future__ import annotations

from typing import Any

import httpx

from autosites_mcp.config import settings
from autosites_mcp.utils.filters import filters_to_query_string


class BackendClient:
    def __init__(self) -> None:
        headers: dict[str, str] = {}
        if settings.backend_token:
            headers["Authorization"] = f"Bearer {settings.backend_token}"
        self._client = httpx.Client(
            base_url=settings.backend_url,
            headers=headers,
            timeout=120.0,
        )

    def close(self) -> None:
        self._client.close()

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        res = self._client.request(method, path, **kwargs)
        if res.status_code >= 400:
            detail = res.text
            try:
                body = res.json()
                if isinstance(body, dict) and "detail" in body:
                    detail = str(body["detail"])
            except Exception:
                pass
            raise RuntimeError(f"HTTP {res.status_code} for {path}: {detail}")
        if res.status_code == 204 or not res.content:
            return None
        if kwargs.get("expect") == "text":
            return res.text
        return res.json()

    def healthz(self) -> dict[str, Any]:
        return self._request("GET", "/healthz")

    def fields(self, *, force: bool = False) -> dict[str, Any]:
        path = "/fields?force=true" if force else "/fields"
        return self._request("GET", path)

    def list_leads(
        self,
        *,
        filters: dict[str, Any] | None = None,
        sort: dict[str, str] | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        qs = filters_to_query_string(filters, sort=sort, limit=limit, offset=offset)
        path = f"/leads?{qs}" if qs else f"/leads?limit={limit}&offset={offset}"
        return self._request("GET", path)

    def get_lead(self, place_id: str) -> dict[str, Any]:
        return self._request("GET", f"/leads/{place_id}")

    def patch_lead(self, place_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        return self._request("PATCH", f"/leads/{place_id}", json={"set": patch})

    def rate_lead(self, place_id: str, score: int | None) -> dict[str, Any]:
        return self._request("PUT", f"/leads/{place_id}/rating", json={"score": score})

    def list_ai_tasks(self) -> list[dict[str, Any]]:
        res = self._request("GET", "/ai-tasks")
        return res.get("items", [])

    def get_ai_task(self, name: str) -> dict[str, Any]:
        return self._request("GET", f"/ai-tasks/{name}")

    def create_ai_task(self, body: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/ai-tasks", json=body)

    def patch_ai_task(self, name: str, body: dict[str, Any]) -> dict[str, Any]:
        return self._request("PATCH", f"/ai-tasks/{name}", json=body)

    def list_ai_runs(self, *, task: str | None = None) -> list[dict[str, Any]]:
        path = f"/ai-runs?task={task}" if task else "/ai-runs"
        res = self._request("GET", path)
        return res.get("items", [])

    def list_jobs(
        self,
        *,
        kind: str | None = None,
        status: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        params: list[tuple[str, str]] = [("limit", str(limit))]
        if kind:
            params.append(("kind", kind))
        if status:
            params.append(("status", status))
        qs = "&".join(f"{k}={v}" for k, v in params)
        res = self._request("GET", f"/jobs?{qs}")
        return res.get("items", [])

    def get_job(self, job_id: str) -> dict[str, Any]:
        return self._request("GET", f"/jobs/{job_id}")

    def start_job(self, kind: str, args: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/jobs", json={"kind": kind, "args": args})

    def cancel_job(self, job_id: str) -> dict[str, Any]:
        return self._request("POST", f"/jobs/{job_id}/cancel")

    def job_events(
        self,
        job_id: str,
        *,
        since: int | None = None,
        event: str | None = None,
        level: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        params: list[str] = [f"limit={limit}"]
        if since is not None:
            params.append(f"since={since}")
        if event:
            params.append(f"event={event}")
        if level:
            params.append(f"level={level}")
        qs = "&".join(params)
        return self._request("GET", f"/jobs/{job_id}/events?{qs}")

    def export_job(
        self,
        job_id: str,
        *,
        event: int | None = None,
        fmt: str = "markdown",
    ) -> str | dict[str, Any]:
        params = [f"format={fmt}"]
        if event is not None:
            params.append(f"event={event}")
        qs = "&".join(params)
        if fmt == "markdown":
            return self._request("GET", f"/jobs/{job_id}/export?{qs}", expect="text")
        return self._request("GET", f"/jobs/{job_id}/export?{qs}")


backend = BackendClient()
