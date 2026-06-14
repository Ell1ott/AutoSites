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
import re
import threading
import time
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
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
SUPPORTED_PROVIDERS = frozenset({"gemini", "openrouter", "groq"})

_thread_gemini = threading.local()
_thread_openrouter = threading.local()
_thread_groq = threading.local()


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
    system: str | None = None,
    image_bytes: bytes | None = None,
    response_schema: dict[str, Any] | None = None,
) -> ProviderCallResult:
    """Dispatch to the right provider.

    `system` is the task instruction prompt; it is sent as a true system
    instruction (Gemini `system_instruction` / OpenAI `system` message).
    `text` is the user turn — the documents and place context the model
    should act on.
    """
    if provider == "openrouter":
        return _call_openrouter(
            model=model, text=text, system=system, image_bytes=image_bytes, response_schema=response_schema
        )
    if provider == "groq":
        return _call_groq(
            model=model, text=text, system=system, image_bytes=image_bytes, response_schema=response_schema
        )
    if provider == "gemini":
        return _call_gemini(
            model=model, text=text, system=system, image_bytes=image_bytes, response_schema=response_schema
        )
    raise ProviderError(f"unsupported provider {provider!r}")


# ---------------------------------------------------------------------------
# Gemini
# ---------------------------------------------------------------------------

# When Gemini answers 429 RESOURCE_EXHAUSTED it usually includes a suggested
# `retryDelay` (e.g. "34s"). We honor it, but cap the wait so a slow-recovering
# quota can't stall the worker indefinitely. If no hint is present we fall back
# to a short, slightly growing backoff.
_GEMINI_MAX_RETRIES = 3
_GEMINI_MAX_RETRY_DELAY = 40.0  # seconds
_GEMINI_DEFAULT_RETRY_DELAY = 5.0  # seconds


def _is_rate_limited(exc: Exception) -> bool:
    """True when the SDK error looks like a 429 / RESOURCE_EXHAUSTED."""
    code = getattr(exc, "code", None)
    if code == 429:
        return True
    msg = str(exc)
    return "429" in msg or "RESOURCE_EXHAUSTED" in msg


def _retry_delay_from_error(exc: Exception) -> float:
    """Pull the server-suggested retry delay (seconds) out of the error text,
    capped to `_GEMINI_MAX_RETRY_DELAY`. Falls back to a short default."""
    match = re.search(r"retry\s*in\s*([0-9]+(?:\.[0-9]+)?)s", str(exc), re.IGNORECASE)
    if not match:
        match = re.search(r"retryDelay'?:?\s*'?([0-9]+(?:\.[0-9]+)?)s", str(exc))
    if match:
        try:
            return min(float(match.group(1)), _GEMINI_MAX_RETRY_DELAY)
        except ValueError:
            pass
    return _GEMINI_DEFAULT_RETRY_DELAY


def _gemini_keys() -> list[str]:
    """Primary key first, then the optional fallback. Deduped, blanks dropped."""
    keys: list[str] = []
    for env in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY_FALLBACK"):
        val = os.environ.get(env)
        if val and val not in keys:
            keys.append(val)
    return keys


def _gemini_client(api_key: str) -> "genai.Client":
    if genai is None:
        raise ProviderError(
            "google-genai is not installed. Run `uv sync` in backend/ to install it."
        )
    cache = getattr(_thread_gemini, "clients", None)
    if cache is None:
        cache = {}
        _thread_gemini.clients = cache
    c = cache.get(api_key)
    if c is None:
        c = genai.Client(api_key=api_key)
        cache[api_key] = c
    return c


def _call_gemini(
    *,
    model: str,
    text: str,
    system: str | None,
    image_bytes: bytes | None,
    response_schema: dict[str, Any] | None,
) -> ProviderCallResult:
    keys = _gemini_keys()
    if not keys:
        raise ProviderError("GEMINI_API_KEY (or GOOGLE_API_KEY) must be set")

    contents: list[Any] = []
    if image_bytes is not None:
        contents.append(
            genai_types.Part.from_bytes(data=image_bytes, mime_type="image/png")
        )
    contents.append(text)

    config_kwargs: dict[str, Any] = {}
    if system and system.strip():
        config_kwargs["system_instruction"] = system
    if response_schema:
        config_kwargs["response_mime_type"] = "application/json"
        config_kwargs["response_json_schema"] = response_schema
    config = genai_types.GenerateContentConfig(**config_kwargs) if config_kwargs else None

    # Try the primary key, then fall back to the next key on any SDK error.
    # On a 429 rate-limit we sleep for the server-suggested delay and retry the
    # same key a few times before giving up on it — this spaces out requests
    # that are simply coming in too fast.
    response = None
    last_exc: Exception | None = None
    for idx, api_key in enumerate(keys):
        for attempt in range(_GEMINI_MAX_RETRIES):
            try:
                response = _gemini_client(api_key).models.generate_content(
                    model=model, contents=contents, config=config
                )
                break
            except Exception as exc:  # noqa: BLE001 - provider SDK can raise anything
                last_exc = exc
                if _is_rate_limited(exc) and attempt + 1 < _GEMINI_MAX_RETRIES:
                    time.sleep(_retry_delay_from_error(exc))
                    continue
                break
        if response is not None:
            break
    if response is None:
        suffix = " (after fallback)" if len(keys) > 1 else ""
        raise ProviderError(
            f"Gemini call failed{suffix} ({type(last_exc).__name__}): {last_exc}"
        ) from last_exc

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
    system: str | None,
    image_bytes: bytes | None,
    response_schema: dict[str, Any] | None,
) -> ProviderCallResult:
    return _call_openai_compatible(
        client=_openrouter_client(),
        label="OpenRouter",
        model=model,
        text=text,
        system=system,
        image_bytes=image_bytes,
        response_schema=response_schema,
    )


# ---------------------------------------------------------------------------
# Groq (OpenAI-compatible)
# ---------------------------------------------------------------------------


def _groq_client() -> "OpenAI":
    if OpenAI is None:
        raise ProviderError(
            "openai package is not installed. Run `uv sync` in backend/ to install it."
        )
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ProviderError("GROQ_API_KEY must be set")
    c = getattr(_thread_groq, "client", None)
    if c is None:
        c = OpenAI(base_url=GROQ_BASE_URL, api_key=api_key)
        _thread_groq.client = c
    return c


def _call_groq(
    *,
    model: str,
    text: str,
    system: str | None,
    image_bytes: bytes | None,
    response_schema: dict[str, Any] | None,
) -> ProviderCallResult:
    return _call_openai_compatible(
        client=_groq_client(),
        label="Groq",
        model=model,
        text=text,
        system=system,
        image_bytes=image_bytes,
        response_schema=response_schema,
    )


# ---------------------------------------------------------------------------
# Shared OpenAI-compatible chat-completions path
# ---------------------------------------------------------------------------


def _call_openai_compatible(
    *,
    client: "OpenAI",
    label: str,
    model: str,
    text: str,
    system: str | None,
    image_bytes: bytes | None,
    response_schema: dict[str, Any] | None,
) -> ProviderCallResult:
    content: list[dict[str, Any]] = []
    if image_bytes is not None:
        b64 = base64.b64encode(image_bytes).decode("ascii")
        content.append(
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
        )
    content.append({"type": "text", "text": text})
    messages: list[dict[str, Any]] = []
    if system and system.strip():
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": content})
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
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
        raise ProviderError(f"{label} call failed ({type(exc).__name__}): {exc}") from exc

    raw = resp.choices[0].message.content if resp.choices else None
    if not isinstance(raw, str) or not raw.strip():
        raise ProviderError(f"{label} returned empty response")
    if response_schema:
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ProviderError(f"{label} returned non-JSON text: {exc}") from exc
        if not isinstance(obj, dict):
            raise ProviderError(f"{label} structured response must be a JSON object")
        return ProviderCallResult(value=obj, raw_response=raw)
    return ProviderCallResult(value=raw.strip(), raw_response=raw)
