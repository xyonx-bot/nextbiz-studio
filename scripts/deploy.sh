#!/usr/bin/env bash
# NextBizStudio — VM-side deploy (run by GitHub Actions over SSH, or manually).
#
# NEVER touches the working checkout (Kira may be mid-sprint on a feature
# branch): deploys from a clean `git archive` export of origin/main into a
# staging dir, with COMPOSE_PROJECT_NAME pinned so the same containers/volumes
# are reused. Idempotent; safe to re-run on the same SHA.
#
# Flow: fetch → stage-export origin/main → compose build → migrate → up --wait
#       → nginx reload (cached container-IP trap) → health gate (direct + public)
# Exit non-zero on any failure — the CI job goes red and the deploy is visible.

set -euo pipefail

MAIN_REPO="${DEPLOY_MAIN_REPO:-$HOME/workspaces/kira/repos/nextbiz-studio}"
STAGE_DIR="${DEPLOY_STAGE_DIR:-$HOME/deploy-stage/nextbiz-studio}"
APP_CONTAINER="nextbiz_app"
DB_CONTAINER="nextbiz_db"
NGINX_CONTAINER="joyverse_nginx"
PUBLIC_HOST="https://nextbizstudio.com"
export COMPOSE_PROJECT_NAME=nextbiz-studio   # matches the running project's
                                             # volume/image/container names

log() { echo "[deploy] $*"; }

cd "$MAIN_REPO"
log "fetching origin/main…"
git fetch origin main
NEW_SHA=$(git rev-parse origin/main)
log "deploying origin/main @ ${NEW_SHA:0:8}"

log "staging clean export → $STAGE_DIR"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
git archive origin/main | tar -x -C "$STAGE_DIR"

# .env is untracked (secrets never in repo) — copy from the canonical checkout
cp "$MAIN_REPO/.env" "$STAGE_DIR/.env"
chmod 600 "$STAGE_DIR/.env"

# public/ is empty + untracked in git (same trap ci-cd.yml line ~99 documents),
# so git archive drops it — but the Dockerfile COPYs /app/public. Recreate it.
[ -d "$STAGE_DIR/public" ] || mkdir -p "$STAGE_DIR/public"

cd "$STAGE_DIR"

# 1. Build the production image (old container keeps serving meanwhile)
log "building image…"
docker compose build nextbiz-app

# 2. Apply DB migrations (idempotent SQL, ON_ERROR_STOP)
log "applying migrations…"
for f in db/migrations/*.sql; do
  log "  migration: $f"
  docker exec -i "$DB_CONTAINER" psql -U nextbiz -d nextbiz \
    -v ON_ERROR_STOP=1 < "$f" >/dev/null
done

# 3. Swap to the new image (explicit container names → same containers recreated)
log "starting containers…"
docker compose up -d --wait
log "containers up"

# 4. nginx reload — it caches container IPs; without this the site 502s
log "reloading nginx…"
docker exec "$NGINX_CONTAINER" nginx -t
docker exec "$NGINX_CONTAINER" nginx -s reload

# 5. Health gate — direct (bypasses Cloudflare) then public (through CF)
log "health gate…"
for path in / /contact; do
  code=$(docker exec "$NGINX_CONTAINER" wget -q -O /dev/null -S \
    "http://${APP_CONTAINER}:3000${path}" 2>&1 | head -1 | grep -oE '[0-9]{3}' || true)
  [ "$code" = "200" ] || { echo "[deploy] FAIL: direct ${path} -> ${code:-no-response}"; exit 1; }
  log "  direct ${path} -> 200"
done

for path in / /contact; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "${PUBLIC_HOST}${path}")
  [ "$code" = "200" ] || { echo "[deploy] FAIL: public ${path} -> ${code}"; exit 1; }
  log "  public ${path} -> 200"
done

log "✅ deploy healthy at ${NEW_SHA:0:8} — ${PUBLIC_HOST}"
