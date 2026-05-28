-- Capture the exact prompt sent to the model and the raw response so the
-- UI can show "what did the AI actually see / say" inside task logs.
ALTER TABLE ai_outputs_log ADD COLUMN prompt_text   TEXT;
ALTER TABLE ai_outputs_log ADD COLUMN raw_response  TEXT;
ALTER TABLE ai_outputs_log ADD COLUMN image_b64     TEXT;
ALTER TABLE ai_outputs_log ADD COLUMN provider      TEXT;
ALTER TABLE ai_outputs_log ADD COLUMN duration_ms   INTEGER;
