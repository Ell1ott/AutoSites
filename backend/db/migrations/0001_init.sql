-- AutoSites backend initial schema.
-- Hybrid: indexed columns for hot filters + `dynamic` JSON for everything else.

CREATE TABLE IF NOT EXISTS places (
    place_id        TEXT PRIMARY KEY,
    name            TEXT,
    rating          REAL,
    review_count    INTEGER,
    website         TEXT,
    business_status TEXT,
    lead_score      INTEGER,                  -- user 1-10
    data            TEXT NOT NULL DEFAULT '{}',  -- raw Google API row, JSON
    dynamic         TEXT NOT NULL DEFAULT '{}',  -- everything added over time, JSON
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS places_name_idx          ON places(name);
CREATE INDEX IF NOT EXISTS places_rating_idx        ON places(rating);
CREATE INDEX IF NOT EXISTS places_review_count_idx  ON places(review_count);
CREATE INDEX IF NOT EXISTS places_website_idx       ON places(website);
CREATE INDEX IF NOT EXISTS places_status_idx        ON places(business_status);
CREATE INDEX IF NOT EXISTS places_lead_score_idx    ON places(lead_score);


-- AI task definitions (replaces settings.json)
CREATE TABLE IF NOT EXISTS ai_tasks (
    name        TEXT PRIMARY KEY,
    label       TEXT,
    config      TEXT NOT NULL,            -- JSON: meta_prompt, model, flags, schema
    enabled     INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);


-- AI run history (replaces runs.json)
CREATE TABLE IF NOT EXISTS ai_runs (
    run_id       TEXT PRIMARY KEY,
    task         TEXT,                    -- nullable: legacy runs may not have this
    started_at   TEXT,
    finished_at  TEXT,
    status       TEXT,
    args         TEXT,                    -- JSON
    counts       TEXT,                    -- JSON
    error        TEXT
);
CREATE INDEX IF NOT EXISTS ai_runs_started_idx ON ai_runs(started_at);


-- Append-only AI output history (provenance for `places.dynamic.<task>`)
CREATE TABLE IF NOT EXISTS ai_outputs_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    place_id    TEXT NOT NULL,
    task        TEXT NOT NULL,
    value       TEXT NOT NULL,            -- JSON
    model       TEXT,
    run_id      TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    FOREIGN KEY (place_id) REFERENCES places(place_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ai_outputs_log_place_task_idx
    ON ai_outputs_log(place_id, task, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_outputs_log_run_idx
    ON ai_outputs_log(run_id);


-- Job queue
CREATE TABLE IF NOT EXISTS jobs (
    id                 TEXT PRIMARY KEY,
    kind               TEXT NOT NULL,
    status             TEXT NOT NULL,           -- queued|running|done|failed|cancelled
    args               TEXT NOT NULL DEFAULT '{}',
    progress           TEXT NOT NULL DEFAULT '{}',
    result             TEXT,
    error              TEXT,
    created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    started_at         TEXT,
    finished_at        TEXT,
    cancel_requested   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS jobs_status_created_idx ON jobs(status, created_at);
CREATE INDEX IF NOT EXISTS jobs_kind_idx           ON jobs(kind);


-- Structured event stream per job (the observability backbone)
CREATE TABLE IF NOT EXISTS job_logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id    TEXT NOT NULL,
    seq       INTEGER NOT NULL,            -- per-job monotonic
    ts        TEXT NOT NULL,               -- ISO with ms
    level     TEXT NOT NULL DEFAULT 'info',
    event     TEXT NOT NULL,
    message   TEXT,
    data      TEXT,                        -- JSON payload
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS job_logs_job_seq_idx ON job_logs(job_id, id);
CREATE INDEX IF NOT EXISTS job_logs_event_idx   ON job_logs(job_id, event);


-- Optional UI override for dynamic field display (safe to leave empty)
CREATE TABLE IF NOT EXISTS field_meta (
    key          TEXT PRIMARY KEY,         -- e.g. dynamic.visual_rating
    display      TEXT,
    format       TEXT,
    filterable   INTEGER NOT NULL DEFAULT 1,
    editable     INTEGER NOT NULL DEFAULT 1,
    enum_values  TEXT,                     -- JSON
    updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
