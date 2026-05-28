# AutoSites backend

Pi-hosted job runner + SQLite for the AutoSites leads pipeline. One process:

- **api** — FastAPI/Uvicorn. Accepts job submissions, runs them in an in-process
  dispatcher (concurrency cap defaults to 3 via `BACKEND_MAX_CONCURRENT`), and
  streams structured events over SSE direct from the in-memory event bus.

The data layer is dynamic: most "add a new field" cases are zero-migration. Each `places` row
has a `dynamic` JSON column where any new key (AI output, user note, derived metric) can land.
`GET /fields` discovers what's there so the client can render filters generically.

## Dev quickstart

```bash
cd backend
uv sync
cp .env.example .env
# fill in BACKEND_AUTH_TOKEN, GOOGLE_MAPS_API_KEY, GEMINI_API_KEY
uv run python -m db.migrate
uv run python scripts/migrate_from_json.py    # one-shot import from mapsLeadsFetcher
uv run python -m api
```

### Variant.com automation (optional)

Uses Patchright **Chromium** (bundled browser), not system Chrome:

```bash
cd backend
uv run patchright install chromium
uv run python -m scripts.setup_variant_session   # one-time login (hi@novine.dk + OTP)
uv run python -m scripts.seed_variant_design_task
```

Then run the `variant_design` task from admin-next on leads that have a `design_prompt`.

Smoke:

```bash
curl localhost:8888/healthz
curl -X POST localhost:8888/jobs \
  -H "Authorization: Bearer $BACKEND_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kind":"fetch_leads","args":{"query":"cafe","lat":55.68,"lng":12.57,"count":3}}'
curl -N localhost:8888/jobs/<id>/stream -H "Authorization: Bearer $BACKEND_AUTH_TOKEN"
```

## Pi deployment

See `deploy/README.md`.

## Layout

```
api/        FastAPI app + routes
workers/    In-process dispatcher + event bus + JobLogger + exporter
workers/handlers/   One handler per job kind
jobs/       The actual scripts (ports of mapsLeadsFetcher Python)
db/         SQLite connection + migrations + repos
scripts/    One-shot tools (migrate_from_json, seed_tasks)
deploy/     systemd units + install script
data/       gitignored: leads.db, screenshots/, crawls/
tests/
```
