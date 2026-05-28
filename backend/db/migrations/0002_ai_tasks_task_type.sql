-- Add task_type to ai_tasks so non-per-place agents (e.g. browser-use inspiration
-- finders) can coexist with the existing one-shot LLM tasks. Existing rows keep
-- the default 'place' which preserves current behaviour.

ALTER TABLE ai_tasks ADD COLUMN task_type TEXT NOT NULL DEFAULT 'place';
