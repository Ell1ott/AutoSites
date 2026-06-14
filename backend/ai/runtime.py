"""Per-place AI task runtime.

`run_task_for_place(task_config, place)` is the only public entry point. It
orchestrates: input loading → prompt assembly → provider call → parsed result.

The handler does the persistence + logging. Errors are raised; the handler
decides whether to log warn / write to <output_field>_error / keep going.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from ai import place_context, prompt
from ai.providers import ProviderError, call

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TaskRunResult:
    """Everything the handler needs to persist + surface in the UI.

    `value` is the parsed model output (str or dict). `prompt_text` and
    `image_bytes` are the exact inputs sent to the model; `raw_response` is
    the model's unparsed text. The handler logs/displays these as the
    "what did the AI actually see and say" record.
    """

    value: str | dict[str, Any]
    prompt_text: str
    image_bytes: bytes | None
    raw_response: str
    provider: str
    model: str


class MissingInputError(RuntimeError):
    """Raised when one or more required inputs for the task are absent.

    The handler treats this as a 'skip', not a failure — running the task
    before its dependencies are ready is a routine condition, not an error.
    """


# Re-export so callers only import from `ai.runtime`.
__all__ = [
    "MissingInputError",
    "ProviderError",
    "TaskRunResult",
    "missing_inputs_for_place",
    "run_task_for_place",
]


# Chips that map to on-disk artifacts rather than place fields.
_SCREENSHOT_KEYS = frozenset({"screenshot"})
_MARKDOWN_KEYS = frozenset({"markdown", "crawl_pages"})


def _required_keys(task_config: dict[str, Any]) -> list[str]:
    """Resolve the task's hard dependency list.

    Sources, in priority order:
      1. `included_context` — chips the user explicitly added in the editor.
      2. Legacy `send_screenshot` / `send_markdown` flags (default True) —
         add their respective keys when they aren't already present.
    """
    included = task_config.get("included_context")
    keys: list[str] = []
    seen: set[str] = set()
    if isinstance(included, list):
        for item in included:
            if isinstance(item, str) and item and item not in seen:
                keys.append(item)
                seen.add(item)
    if bool(task_config.get("send_screenshot", True)) and "screenshot" not in seen:
        keys.append("screenshot")
        seen.add("screenshot")
    if bool(task_config.get("send_markdown", True)) and not (seen & _MARKDOWN_KEYS):
        keys.append("markdown")
        seen.add("markdown")
    return keys


def missing_inputs_for_place(
    task_config: dict[str, Any], place: dict[str, Any]
) -> list[str]:
    """Return the labels of required inputs absent from `place`.

    Pure check — no disk reads of large artifacts beyond existence.
    """
    place_id = place.get("place_id")
    if not isinstance(place_id, str) or not place_id:
        return ["place_id"]

    missing: list[str] = []
    namespace = prompt.build_namespace(place)
    for key in _required_keys(task_config):
        if key in _SCREENSHOT_KEYS:
            if place_context.load_screenshot(place_id) is None:
                missing.append("screenshot")
        elif key in _MARKDOWN_KEYS:
            if place_context.load_root_markdown(place_id) is None:
                missing.append(key)
        else:
            value = namespace.get(key, "").strip()
            if not value:
                missing.append(key)
    return missing


def run_task_for_place(
    task_config: dict[str, Any], place: dict[str, Any]
) -> TaskRunResult:
    """Execute one task against one place. Returns the parsed output along
    with the exact prompt + raw response, so callers can persist them as
    provenance and surface them in the UI."""
    place_id = place.get("place_id")
    if not isinstance(place_id, str) or not place_id:
        raise MissingInputError("place has no place_id")

    missing = missing_inputs_for_place(task_config, place)
    if missing:
        raise MissingInputError(f"missing inputs: {', '.join(missing)}")

    send_screenshot = bool(task_config.get("send_screenshot", True)) or (
        "screenshot" in (task_config.get("included_context") or [])
    )
    send_markdown = bool(task_config.get("send_markdown", True)) or bool(
        set(task_config.get("included_context") or []) & _MARKDOWN_KEYS
    )
    subpage_mode = str(task_config.get("subpage_markdown_mode", "none"))
    recommended_field = str(task_config.get("recommended_subpages_field", "ai_subpages"))

    # ---- inputs ----------------------------------------------------------
    image_bytes: bytes | None = None
    if send_screenshot:
        image_bytes = place_context.load_screenshot(place_id)

    markdown_blob: str | None = None
    if send_markdown:
        root_md = place_context.load_root_markdown(place_id)
        recommended_hints = (place.get("dynamic") or {}).get(recommended_field)
        markdown_blob = place_context.assemble_markdown_blob(
            place_id=place_id,
            root_markdown=root_md or "",
            subpage_mode=subpage_mode,
            recommended_hints=recommended_hints,
        )

    # ---- prompt ----------------------------------------------------------
    meta_prompt = task_config.get("meta_prompt")
    if not isinstance(meta_prompt, str) or not meta_prompt.strip():
        raise ValueError("task_config.meta_prompt is required")
    expanded, missing = prompt.expand_template(meta_prompt, place)
    if missing:
        logger.debug(
            "place %s — template placeholders had no value: %s",
            place_id,
            sorted(set(missing)),
        )

    # The task instruction becomes the system prompt; the documents (markdown
    # extract + screenshot) are the user turn the model acts on. Keeping them
    # separate follows standard prompting practice and puts the instruction
    # firmly at the top, ahead of all context.
    system_prompt = expanded

    context_parts: list[str] = []
    if markdown_blob is not None:
        context_parts.append(f"Website markdown extract:\n\n{markdown_blob}")
    user_text = "\n\n".join(context_parts).strip()
    if not user_text:
        # No textual context (e.g. screenshot-only task) — give the user turn
        # a minimal anchor so providers that require non-empty content are happy.
        user_text = "Apply the instructions to the attached context."

    # Provenance record shown in the UI: system instruction first, then context.
    prompt_text = f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_text}"

    # ---- model call ------------------------------------------------------
    provider = str(task_config.get("provider", "gemini"))
    model = task_config.get("model")
    if not isinstance(model, str) or not model:
        raise ValueError("task_config.model is required")

    response_schema = task_config.get("response_json_schema")
    if response_schema is not None and not isinstance(response_schema, dict):
        raise ValueError("task_config.response_json_schema must be an object")

    result = call(
        provider=provider,
        model=model,
        text=user_text,
        system=system_prompt,
        image_bytes=image_bytes,
        response_schema=response_schema if response_schema else None,
    )
    return TaskRunResult(
        value=result.value,
        prompt_text=prompt_text,
        image_bytes=image_bytes,
        raw_response=result.raw_response,
        provider=provider,
        model=model,
    )
