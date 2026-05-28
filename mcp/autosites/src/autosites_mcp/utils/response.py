from __future__ import annotations

import json
from typing import Any


def tool_result(
    *,
    ok: bool,
    data: Any = None,
    summary: str = "",
    next_actions: list[str] | None = None,
    error: str | None = None,
) -> str:
    payload: dict[str, Any] = {
        "ok": ok,
        "summary": summary,
        "next_actions": next_actions or [],
    }
    if data is not None:
        payload["data"] = data
    if error:
        payload["error"] = error
    return json.dumps(payload, ensure_ascii=False, default=str, indent=2)
