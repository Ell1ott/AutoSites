"""Thin Gemini + OpenRouter wrappers for the AI task runtime.

One call per place; thread-local clients amortize construction. Structured
output is honored when a JSON Schema is supplied — the parsed dict is returned;
otherwise the raw text. All failures raise `ProviderError` with a human-readable
message so the runtime can log a single clean warn line.
"""
from __future__ import annotations

import base64
import json
import os
import threading
from dataclasses import dataclass
from typing import Any

try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:  # pragma: no cover
    genai = None  # type: ignore[assignment]
    genai_types = None  # type: ignore[assignment]

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore[assignment]


OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
SUPPORTED_PROVIDERS = frozenset({"gemini", "openrouter"})

_thread_gemini = threading.local()
_thread_openrouter = threading.local()


class ProviderError(RuntimeError):
    """One typed exception so the runtime can format a clean log line."""


@dataclass(frozen=True)
class ProviderCallResult:
    """Wraps every provider call so callers can both use the parsed value
    *and* surface the raw prompt/response in the UI without re-doing the call.

    - `value` is what the runtime returns to the handler (parsed dict for
      structured output, plain string otherwise).
    - `raw_response` is the exact unparsed text the model produced (best
      effort — `str(parsed)` if a provider only hands back a parsed object).
    """

    value: str | dict[str, Any]
    raw_response: str


def call(
    *,
    provider: str,
    model: str,
    text: str,
    image_bytes: bytes | None = None,
    response_schema: dict[str, Any] | None = None,
) -> ProviderCallResult:
    """Dispatch to the right provider."""
    if provider == "openrouter":
        return _call_openrouter(
            model=model, text=text, image_bytes=image_bytes, response_schema=response_schema
        )
    if provider == "gemini":
        return _call_gemini(
            model=model, text=text, image_bytes=image_bytes, response_schema=response_schema
        )
    raise ProviderError(f"unsupported provider {provider!r}")


# ---------------------------------------------------------------------------
# Gemini
# ---------------------------------------------------------------------------


def _gemini_client() -> "genai.Client":
    if genai is None:
        raise ProviderError(
            "google-genai is not installed. Run `uv sync` in backend/ to install it."
        )
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ProviderError("GEMINI_API_KEY (or GOOGLE_API_KEY) must be set")
    c = getattr(_thread_gemini, "client", None)
    if c is None:
        c = genai.Client()
        _thread_gemini.client = c
    return c


def _call_gemini(
    *,
    model: str,
    text: str,
    image_bytes: bytes | None,
    response_schema: dict[str, Any] | None,
) -> ProviderCallResult:
    client = _gemini_client()
    contents: list[Any] = []
    if image_bytes is not None:
        contents.append(
            genai_types.Part.from_bytes(data=image_bytes, mime_type="image/png")
        )
    contents.append(text)
    config = None
    if response_schema:
        config = genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=response_schema,
        )
    try:
        response = client.models.generate_content(
            model=model, contents=contents, config=config
        )
    except Exception as exc:  # noqa: BLE001 - provider SDK can raise anything
        raise ProviderError(f"Gemini call failed ({type(exc).__name__}): {exc}") from exc

    raw_text = response.text if isinstance(response.text, str) else ""

    if response_schema:
        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, dict):
            return ProviderCallResult(value=parsed, raw_response=raw_text or json.dumps(parsed))
        if parsed is not None and hasattr(parsed, "model_dump"):
            dumped = parsed.model_dump(mode="json")
            if isinstance(dumped, dict):
                return ProviderCallResult(value=dumped, raw_response=raw_text or json.dumps(dumped))
        if raw_text.strip():
            try:
                obj = json.loads(raw_text)
            except json.JSONDecodeError as exc:
                raise ProviderError(f"Gemini returned non-JSON text: {exc}") from exc
            if isinstance(obj, dict):
                return ProviderCallResult(value=obj, raw_response=raw_text)
            raise ProviderError("Gemini structured response must be a JSON object")
        raise ProviderError("Gemini returned empty structured response")

    if not raw_text.strip():
        raise ProviderError("Gemini returned empty response")
    return ProviderCallResult(value=raw_text.strip(), raw_response=raw_text)


# ---------------------------------------------------------------------------
# OpenRouter
# ---------------------------------------------------------------------------


def _openrouter_client() -> "OpenAI":
    if OpenAI is None:
        raise ProviderError(
            "openai package is not installed. Run `uv sync` in backend/ to install it."
        )
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ProviderError("OPENROUTER_API_KEY must be set")
    c = getattr(_thread_openrouter, "client", None)
    if c is None:
        c = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=api_key)
        _thread_openrouter.client = c
    return c


def _call_openrouter(
    *,
    model: str,
    text: str,
    image_bytes: bytes | None,
    response_schema: dict[str, Any] | None,
) -> ProviderCallResult:
    client = _openrouter_client()
    content: list[dict[str, Any]] = []
    if image_bytes is not None:
        b64 = base64.b64encode(image_bytes).decode("ascii")
        content.append(
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
        )
    content.append({"type": "text", "text": text})
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
    }
    if response_schema:
        kwargs["response_format"] = {
            "type": "json_schema",
            "json_schema": {
                "name": "task_output",
                "strict": True,
                "schema": response_schema,
            },
        }
    try:
        resp = client.chat.completions.create(**kwargs)
    except Exception as exc:  # noqa: BLE001
        raise ProviderError(f"OpenRouter call failed ({type(exc).__name__}): {exc}") from exc

    raw = resp.choices[0].message.content if resp.choices else None
    if not isinstance(raw, str) or not raw.strip():
        raise ProviderError("OpenRouter returned empty response")
    if response_schema:
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ProviderError(f"OpenRouter returned non-JSON text: {exc}") from exc
        if not isinstance(obj, dict):
            raise ProviderError("OpenRouter structured response must be a JSON object")
        return ProviderCallResult(value=obj, raw_response=raw)
    return ProviderCallResult(value=raw.strip(), raw_response=raw)
