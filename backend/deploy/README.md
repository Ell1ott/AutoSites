# Raspberry Pi deployment

Quick checklist for getting the backend running on a Pi behind Tailscale.

## 1. Pi prep (one-time)

```bash
sudo apt update && sudo apt install -y git curl
# Tailscale — follow https://tailscale.com/download/linux
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Note the MagicDNS name (e.g. raspberrypi.tailnet-XXXX.ts.net)
```

## 2. Clone & install

```bash
cd ~ && git clone <your-repo> AutoSites
bash ~/AutoSites/backend/deploy/install.sh
# First run will create .env from the template; edit it then re-run.
```

`.env` must have:
- `BACKEND_AUTH_TOKEN` — random secret; admin must send `Authorization: Bearer <token>`.
- `GOOGLE_MAPS_API_KEY` — Places API key (same one used by mapsLeadsFetcher).
- `GEMINI_API_KEY` — for AI task handlers.

After editing `.env`, re-run `install.sh`. The script enables/starts:
- `backend-api@<user>.service` — FastAPI on :8888 (also hosts the in-process
  job dispatcher; there's no separate worker unit anymore).

## 3. Verify

From the laptop (on the same tailnet):
```bash
curl -H "Authorization: Bearer <token>" https://<pi-hostname>:8888/healthz
curl -H "Authorization: Bearer <token>" https://<pi-hostname>:8888/fields | jq .total
```

From the Pi:
```bash
journalctl -u backend-api@<user> -f
```

## 4. First job

```bash
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
     -d '{"kind":"fetch_leads","args":{"query":"cafe","lat":55.4318,"lng":11.5555,"count":3}}' \
     https://<pi-hostname>:8888/jobs
# Then tail it:
curl -N -H "Authorization: Bearer <token>" "https://<pi-hostname>:8888/jobs/<id>/stream?since=0"
```

## Updating

```bash
cd ~/AutoSites && git pull
bash backend/deploy/install.sh   # re-syncs deps, applies migrations, restarts units
```

## One-time data import

Run once on the Pi after a fresh install if you want to keep the existing
mapsLeadsFetcher JSON data:

```bash
cd ~/AutoSites/backend && uv run python -m scripts.migrate_from_json
```
