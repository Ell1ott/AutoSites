"""Per-place AI task runtime.

`run_task_for_place(task_config, place)` is the only public entry point. It
orchestrates: input loading → prompt assembly → provider call → parsed result.

The handler does the persistence + logging. Errors are raised; the handler
decides whether to log warn / write to <output_field>_error / keep going.
"""
from __future__ import annotations

import logging
from typing import Any

from ai import place_context, prompt
from ai.providers import ProviderError, call

logger = logging.getLogger(__name__)


class MissingInputError(RuntimeError):
    """Raised when a required on-disk input (screenshot or markdown) is absent.

    The handler treats this as a 'skip', not a failure — running the task before
    the crawl/screenshot job is a routine condition, not an error.
    """


# Re-export so callers only import from `ai.runtime`.
__all__ = ["MissingInputError", "ProviderError", "run_task_for_place"]


def run_task_for_place(
    task_config: dict[str, Any], place: dict[str, Any]
) -> str | dict[str, Any]:
    """Execute one task against one place. Returns the model's parsed output."""
    place_id = place.get("place_id")
    if not isinstance(place_id, str) or not place_id:
        raise MissingInputError("place has no place_id")

    send_screenshot = bool(task_config.get("send_screenshot", True))
    send_markdown = bool(task_config.get("send_markdown", True))
    subpage_mode = str(task_config.get("subpage_markdown_mode", "none"))
    recommended_field = str(task_config.get("recommended_subpages_field", "ai_subpages"))

    # ---- inputs ----------------------------------------------------------
    image_bytes: bytes | None = None
    if send_screenshot:
        image_bytes = place_context.load_screenshot(place_id)
        if image_bytes is None:
            raise MissingInputError(
                f"screenshot missing: {place_context.screenshot_path(place_id)}"
            )

    markdown_blob: str | None = None
    if send_markdown:
        root_md = place_context.load_root_markdown(place_id)
        if root_md is None:
            raise MissingInputError(
                f"markdown missing: {place_context.root_markdown_path(place_id)}"
            )
        recommended_hints = (place.get("dynamic") or {}).get(recommended_field)
        markdown_blob = place_context.assemble_markdown_blob(
            place_id=place_id,
            root_markdown=root_md,
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

    text_parts: list[str] = []
    if markdown_blob is not None:
        text_parts.append(f"Website markdown extract:\n\n{markdown_blob}")
    text_parts.append(expanded)
    prompt_text = "\n\n".join(text_parts)

    # ---- model call ------------------------------------------------------
    provider = str(task_config.get("provider", "gemini"))
    model = task_config.get("model")
    if not isinstance(model, str) or not model:
        raise ValueError("task_config.model is required")

    response_schema = task_config.get("response_json_schema")
    if response_schema is not None and not isinstance(response_schema, dict):
        raise ValueError("task_config.response_json_schema must be an object")

    return call(
        provider=provider,
        model=model,
        text=prompt_text,
        image_bytes=image_bytes,
        response_schema=response_schema if response_schema else None,
    )
