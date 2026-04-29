# mapsLeadsFetcher — commands

Working directory: `mapsLeadsFetcher/` (use `uv run …` so deps from `pyproject.toml` apply).

**Env:** `.env.local` in this folder — `GOOGLE_MAPS_API_KEY` (Places), `GEMINI_API_KEY` (AI scripts). Optional Supabase keys for the admin UI if you use that integration.

**Browser (screenshots once):** `uv run patchright install chromium`

---

## Typical pipeline

1. `fetch_businesses.py` → `maps_businesses.json`  
2. `screenshot_store_websites.py` → PNGs + HTML under `screenshots/`  
3. `html_to_markdown.py` → `.md` next to each `.html`  
4. `generate_design_prompts.py` → fills task fields (e.g. `design_prompt`) per `settings.json`

---

## `fetch_businesses.py`

Text Search (Places API New); merges into existing JSON by place id; writes CSV beside JSON unless `--no-csv`.

```bash
uv run fetch_businesses.py -q "café" -n 20
```

```bash
uv run fetch_businesses.py -q "frisør" --lat 55.67 --lng 12.57 --radius-m 15000 -o maps_businesses.json
```

Admin-style NDJSON on stdout (human logs on stderr): add `--json-events` and optional `--run-id my-run`.

---

## `screenshot_store_websites.py`

Opens each place’s `websiteUri` with Patchright; writes `screenshots/{placeId}.png` (+ `.html`); optional subpage crawl. Skips when homepage PNG exists unless `--force`.

```bash
uv run screenshot_store_websites.py
```

```bash
uv run screenshot_store_websites.py --input maps_businesses.json --dir screenshots --force
```

Homepage only, no link following: `--no-subpage-crawl`. Cookie banners: auto-dismissed via `cookie_consent_rules.py` (not a CLI — imported by this script); use `--no-cookie-dismiss` to turn off.

---

## `html_to_markdown.py`

Converts HTML paths stored in JSON to Markdown (markitdown); updates `markdown_path` on each page.

```bash
uv run html_to_markdown.py
```

```bash
uv run html_to_markdown.py --input maps_businesses.json --force
```

---

## `generate_design_prompts.py`

Runs a Gemini task from `settings.json` (`ai_tasks`). Default task id: `design_prompt`.

```bash
uv run generate_design_prompts.py
```

```bash
uv run generate_design_prompts.py --task design_prompt --limit 10 --workers 4 --force
```

Subset only: `--place-ids ChIJxxx,ChIJyyy`. Admin live log: `--json-events` (+ optional `--run-id`).

---

## `plot_reviews_vs_visuel_rating.py`

Scatter plot: `userRatingCount` vs `visuel_rating` for places that have both.

```bash
uv run plot_reviews_vs_visuel_rating.py
```

```bash
uv run plot_reviews_vs_visuel_rating.py maps_businesses.json -o reviews_vs_visuel_rating.png
```

---

## New site (`scripts/create-site.ts`)

**Run from the AutoSites repo root** (`..` from this folder), not inside `mapsLeadsFetcher/`. Requires [Bun](https://bun.sh). Scaffolds `sites/<slug>` (Next app), writes `.env.local` from `sites/blank-demo/.env.local`, and upserts `public.sites` when Supabase service-role keys are present (use `--no-db` to skip).

```bash
cd .. && bun scripts/create-site.ts my-shop
```

Themed from `kaffe` by default; minimal app with `--blank`. Port defaults to next free after existing sites (override with `--port=3010`).

```bash
cd .. && bun scripts/create-site.ts demo-client --blank --no-db
```

After: `bun --cwd sites/<slug> dev` (URL printed by the script).

---

## Admin UI (`admin/`)

SvelteKit app for lead overview, AI runs, screenshots, etc.

```bash
cd admin && npm install && npm run dev
```

Build / preview: `npm run build`, `npm run preview`.

---

## `cookie_consent_rules.py`

Library of CMP selectors used by `screenshot_store_websites.py` — **do not run directly**.
