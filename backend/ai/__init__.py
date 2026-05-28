"""In-process AI task runtime.

Task definitions are read from the `ai_tasks` table (the DB is the single
source of truth); per-place screenshots and markdown live on disk at
`mapsLeadsFetcher/screenshots/<place_id>.{png,md}`. Outputs land in
`places.dynamic.<output_field>` via `places.set_dynamic` + `ai_outputs_log`.

Adding a new place-type AI task is one row in `ai_tasks` — no script edit
required.
"""

from ai.runtime import MissingInputError, ProviderError, run_task_for_place

__all__ = ["MissingInputError", "ProviderError", "run_task_for_place"]
