#!/usr/bin/env bash
# AutoSites dev: backend API (runs jobs in-process) + admin-next, all in one terminal.
# Ctrl+C cleans up everything.
#
# Usage: ./dev.sh
#
# Each subprocess's stdout/stderr is prefixed with a tag so you can see who
# said what. Logs land in the terminal; nothing is hidden.
set -u
cd "$(dirname "$0")"

# --- env --------------------------------------------------------------------

if [ -f mapsLeadsFetcher/.env.local ]; then
    set -a; . mapsLeadsFetcher/.env.local; set +a
else
    echo "[dev] note: mapsLeadsFetcher/.env.local not found — GOOGLE_MAPS_API_KEY/GEMINI_API_KEY won't be set"
fi

if [ -f backend/.env ]; then
    set -a; . backend/.env; set +a
fi

# --- prereqs (quick) --------------------------------------------------------

if [ ! -d backend/.venv ]; then
    echo "[dev] backend: first run, syncing deps with uv…"
    ( cd backend && uv sync )
fi
if [ ! -d admin-next/node_modules ]; then
    echo "[dev] admin-next: first run, installing with bun…"
    ( cd admin-next && bun install )
fi
if [ ! -f backend/data/leads.db ]; then
    echo "[dev] backend: initializing SQLite…"
    ( cd backend && uv run python -m db.migrate )
    if [ -f mapsLeadsFetcher/maps_businesses.json ]; then
        echo "[dev] backend: importing existing JSON data…"
        ( cd backend && uv run python -m scripts.migrate_from_json )
    fi
fi

# --- run --------------------------------------------------------------------

# ANSI colors per process for readability.
C_API='\033[36m'   # cyan
C_UI='\033[32m'    # green
C_OFF='\033[0m'

pids=()

prefix() { # $1=tag $2=color
    local tag=$1 color=$2
    while IFS= read -r line; do
        printf "%b[%s]%b %s\n" "$color" "$tag" "$C_OFF" "$line"
    done
}

cleanup() {
    echo
    echo "[dev] stopping…"
    for pid in "${pids[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    # second pass, force
    sleep 0.3
    for pid in "${pids[@]}"; do
        kill -9 "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

( cd backend && uv run python -m api 2>&1 ) | prefix "api  " "$C_API" &
pids+=($!)

( cd admin-next && bun run dev 2>&1 ) | prefix "admin" "$C_UI" &
pids+=($!)

echo "[dev] running:"
echo "       backend API   → http://localhost:8888  (healthz, fields, leads, jobs/...)"
echo "       admin-next UI → http://localhost:4242"
echo
echo "[dev] press Ctrl+C to stop everything."

# Wait for any child to exit, then tear the rest down.
wait -n 2>/dev/null
cleanup
