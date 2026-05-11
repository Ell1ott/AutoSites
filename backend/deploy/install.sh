#!/usr/bin/env bash
# AutoSites backend installer for Raspberry Pi (Debian/Ubuntu).
#
# Run on the Pi after cloning the repo to ~/AutoSites:
#   bash ~/AutoSites/backend/deploy/install.sh
#
# Idempotent: re-run after pulling updates to apply migrations and restart units.
set -euo pipefail

BACKEND_DIR="$HOME/AutoSites/backend"
USER_NAME="$(id -un)"

cd "$BACKEND_DIR"

echo "==> ensuring uv is installed"
if ! command -v uv >/dev/null 2>&1; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi

echo "==> uv sync"
uv sync

echo "==> running migrations"
uv run python -m db.migrate

if [ ! -f .env ]; then
    echo "==> creating .env from .env.example (edit and rerun)"
    cp .env.example .env
    echo "    -> Edit $BACKEND_DIR/.env (BACKEND_AUTH_TOKEN, GOOGLE_MAPS_API_KEY, GEMINI_API_KEY)"
    echo "    Then re-run this script."
    exit 1
fi

echo "==> installing systemd units"
sudo cp deploy/systemd/backend-api.service "/etc/systemd/system/backend-api@${USER_NAME}.service"
sudo cp deploy/systemd/backend-worker.service "/etc/systemd/system/backend-worker@${USER_NAME}.service"
sudo systemctl daemon-reload
sudo systemctl enable "backend-api@${USER_NAME}.service" "backend-worker@${USER_NAME}.service"
sudo systemctl restart "backend-api@${USER_NAME}.service" "backend-worker@${USER_NAME}.service"

echo "==> done. Status:"
sudo systemctl --no-pager status "backend-api@${USER_NAME}.service" "backend-worker@${USER_NAME}.service" | head -30 || true
echo
echo "Tail logs with:"
echo "  journalctl -u backend-api@${USER_NAME} -f"
echo "  journalctl -u backend-worker@${USER_NAME} -f"
