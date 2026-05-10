# AutoSites backend

Pi-hosted job runner + SQLite for the AutoSites leads pipeline. Two processes, one DB:

- **api** — FastAPI/Uvicorn. Accepts job submissions, streams structured events over SSE.
- **worker** — long-running process that polls the `jobs` table, dispatches to handlers, writes
  events to `job_logs` and pushes them live to the API via a Unix domain socket.

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
# in two terminals:
uv run uvicorn api.main:app --reload --port 8080
uv run python -m workers.runner
```

Smoke:

```bash
curl localhost:8080/healthz
curl -X POST localhost:8080/jobs \
  -H "Authorization: Bearer $BACKEND_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kind":"fetch_leads","args":{"query":"cafe","lat":55.68,"lng":12.57,"count":3}}'
curl -N localhost:8080/jobs/<id>/stream -H "Authorization: Bearer $BACKEND_AUTH_TOKEN"
```

## Pi deployment

See `deploy/README.md`.

## Layout

```
api/        FastAPI app + routes
workers/    Worker process + JobLogger + log sink + exporter
workers/handlers/   One handler per job kind
jobs/       The actual scripts (ports of mapsLeadsFetcher Python)
db/         SQLite connection + migrations + repos
scripts/    One-shot tools (migrate_from_json, seed_tasks)
deploy/     systemd units + install script
data/       gitignored: leads.db, screenshots/, crawls/
tests/
```
