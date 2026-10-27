#!/usr/bin/env bash
# NextBizStudio — VM-side deploy (manual, or via the nextbiz-beta-deploy
# systemd timer for beta).
#
# NEVER touches the working checkout (Kira may be mid-sprint on a feature
# branch): deploys from a clean `git archive` export into a staging dir,
# with COMPOSE_PROJECT_NAME pinned so the same containers/volumes are reused.
# Idempotent; safe to re-run on the same SHA.
#
# Environments (docs/release-flow.md):
#   beta  origin/main, auto-deployed every 5 min by the systemd timer.
#         URL beta.nextbizstudio.com (public, X-Robots-Tag: noindex).
#         Own DB (nextbiz_beta_db) — seed it from the prod DB with --seed.
#   prod  Joydip's explicit GO only, from a pushed release tag:
#         scripts/deploy.sh --env prod --ref v1.0.0 --approved-by "Joydip 2026-10-26"
#         Refuses without --ref and --approved-by. Audit log:
#         ~/deploy-logs/nextbiz-studio-prod.log
#
# Flow: gate → fetch → stage export → build → db up → [seed] → migrations
#       → up --wait → nginx reload (cached container-IP trap) → health gate
#       (direct always; public once the beta DNS record is live).
# Exit non-zero on any failure.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy.sh --env beta [--ref origin/main] [--seed]
  scripts/deploy.sh --env prod --ref <v-tag> --approved-by "Joydip <date>"

--seed (beta only, no value) reseeds the beta DB from the live prod DB.
EOF
}

MAIN_REPO="${DEPLOY_MAIN_REPO:-$HOME/workspaces/kira/repos/nextbiz-studio}"
NGINX_CONTAINER="joyverse_nginx"
LOG_DIR="$HOME/deploy-logs"

ENV="" REF="" APPROVED_BY="" SEED=""
while [ $# -gt 0 ]; do
  case "$1" in
    --env)         ENV="$2"; shift 2 ;;
    --ref)         REF="$2"; shift 2 ;;
    --approved-by) APPROVED_BY="$2"; shift 2 ;;
    --seed)        SEED="yes"; shift ;;
    -h|--help)     usage; exit 0 ;;
    *)             usage >&2; echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

# ---- gates ------------------------------------------------------------------
[ -n "$ENV" ] || { usage >&2; echo "REFUSED: --env is required (beta|prod)" >&2; exit 2; }
case "$ENV" in
  beta|prod) ;;
  *) usage >&2; echo "REFUSED: --env must be 'beta' or 'prod'" >&2; exit 2 ;;
esac

if [ "$ENV" = prod ]; then
  # prod = public deploy = stop-table item (swe-iteration-kernel): Joydip's
  # explicit GO, in writing, logged. No gate, no deploy — no exceptions.
  [ -n "$APPROVED_BY" ] || { echo 'REFUSED: --env prod requires --approved-by "Joydip <date>" — explicit GO required' >&2; exit 2; }
  [ -n "$REF" ] || { echo "REFUSED: --env prod requires --ref <v-tag> (e.g. v1.0.0) — prod ships tagged releases only" >&2; exit 2; }
  case "$REF" in
    v[0-9]*.[0-9]*.[0-9]*) ;;
    *) echo "REFUSED: prod --ref must be a release tag like v1.0.0 (got '$REF')" >&2; exit 2 ;;
  esac
  [ "$SEED" != yes ] || { echo "REFUSED: --seed is beta-only" >&2; exit 2; }
else
  REF="${REF:-origin/main}"
  [ -z "$APPROVED_BY" ] || { echo "REFUSED: --approved-by is prod-only" >&2; exit 2; }
fi

# ---- per-env config ---------------------------------------------------------
case "$ENV" in
  beta)
    STAGE_DIR="${DEPLOY_STAGE_DIR:-$HOME/beta-stage/nextbiz-studio}"
    COMPOSE_FILE="docker-compose.beta.yml"
    export COMPOSE_PROJECT_NAME="nextbiz-studio-beta"
    APP_SVC="nextbiz-beta-app"; DB_SVC="nextbiz-beta-db"
    APP_CONTAINER="nextbiz_beta_app"; DB_CONTAINER="nextbiz_beta_db"
    ENV_FILE="$MAIN_REPO/.env.beta"
    PUBLIC_DOMAIN="beta.nextbizstudio.com"
    ;;
  prod)
    STAGE_DIR="${DEPLOY_STAGE_DIR:-$HOME/deploy-stage/nextbiz-studio}"
    COMPOSE_FILE="docker-compose.yml"
    export COMPOSE_PROJECT_NAME="nextbiz-studio"
    APP_SVC="nextbiz-app"; DB_SVC="nextbiz-db"
    APP_CONTAINER="nextbiz_app"; DB_CONTAINER="nextbiz_db"
    ENV_FILE="$MAIN_REPO/.env"
    PUBLIC_DOMAIN="nextbizstudio.com"
    ;;
esac

[ -f "$ENV_FILE" ] || { echo "REFUSED: env file missing: $ENV_FILE (see .env.beta.example)" >&2; exit 2; }

PUBLIC_HOST="https://$PUBLIC_DOMAIN"
log() { echo "[deploy:$ENV] $*"; }

# audit trail — one line per attempt: timestamp | env | ref | sha | approver | result
mkdir -p "$LOG_DIR"
APP_LOG="$LOG_DIR/nextbiz-studio-$ENV.log"
STATE_FILE="$LOG_DIR/nextbiz-studio-beta.sha"
NEW_SHA="undeployed"
RESULT="FAILED"
finish() {
  printf '%s | %s | %s | %s | %s | %s\n' \
    "$(date -u +%FT%TZ)" "$ENV" "${REF:-?}" "${NEW_SHA:0:12}" "${APPROVED_BY:-auto}" "$RESULT" \
    >> "$APP_LOG"
}
trap finish EXIT

# ---- deploy -----------------------------------------------------------------
cd "$MAIN_REPO"
log "fetching origin/main (+tags)…"
git fetch origin main --tags --quiet

git rev-parse --verify --quiet "$REF^{commit}" >/dev/null \
  || { echo "REFUSED: ref '$REF' not found after fetch" >&2; exit 2; }
NEW_SHA="$(git rev-parse "$REF^{commit}")"
log "deploying $REF @ ${NEW_SHA:0:8}"

log "staging clean export → $STAGE_DIR"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
git archive "$NEW_SHA" | tar -x -C "$STAGE_DIR"

# .env is untracked (secrets never in repo) — copy the env-matching file
cp "$ENV_FILE" "$STAGE_DIR/.env"
chmod 600 "$STAGE_DIR/.env"

# public/ is empty + untracked in git (same trap ci-cd.yml documents), so
# git archive drops it — but the Dockerfile COPYs /app/public. Recreate it.
[ -d "$STAGE_DIR/public" ] || mkdir -p "$STAGE_DIR/public"

cd "$STAGE_DIR"

# 1. Build the image (old container keeps serving meanwhile)
log "building image…"
docker compose -f "$COMPOSE_FILE" build "$APP_SVC"

# 2. DB up first (fresh beta volumes need the db before migrations/seed)
log "starting DB ($DB_SVC, waiting for healthcheck)…"
# --wait is load-bearing: up -d alone returns before postgres accepts
# connections, and a fresh beta volume's first exec then races the socket
# (bit us on the first beta deploy — psql "No such file or directory")
docker compose -f "$COMPOSE_FILE" up -d --wait "$DB_SVC"

if [ "$ENV" = beta ] && [ "$SEED" = yes ]; then
  log "seeding beta DB from prod DB (nextbiz_db) — wipes beta DB…"
  docker exec "$DB_CONTAINER" psql -U nextbiz -d postgres \
    -c 'DROP DATABASE nextbiz WITH (FORCE)' \
    -c 'CREATE DATABASE nextbiz' >/dev/null
  # pipefail is load-bearing here: a died-mid-stream pg_dump must fail the deploy
  docker exec nextbiz_db pg_dump -U nextbiz nextbiz \
    | docker exec -i "$DB_CONTAINER" psql -U nextbiz -d nextbiz -v ON_ERROR_STOP=1 -q
  log "  seed restored"
fi

# 3. Apply DB migrations (idempotent SQL, ON_ERROR_STOP)
log "applying migrations…"
for f in db/migrations/*.sql; do
  log "  migration: $f"
  docker exec -i "$DB_CONTAINER" psql -U nextbiz -d nextbiz \
    -v ON_ERROR_STOP=1 < "$f" >/dev/null
done

# 4. Swap to the new image (explicit container names → same containers recreated)
log "starting containers…"
docker compose -f "$COMPOSE_FILE" up -d --wait
log "containers up"

# 5. nginx reload — it caches container IPs; without this the site 502s
log "reloading nginx…"
docker exec "$NGINX_CONTAINER" nginx -t
docker exec "$NGINX_CONTAINER" nginx -s reload

# 6. Health gate — direct (bypasses Cloudflare), then public (through CF)
log "health gate…"
for path in / /contact; do
  code=$(docker exec "$NGINX_CONTAINER" wget -q -O /dev/null -S \
    "http://${APP_CONTAINER}:3000${path}" 2>&1 | head -1 | grep -oE '[0-9]{3}' || true)
  [ "$code" = "200" ] || { echo "[deploy:$ENV] FAIL: direct ${path} -> ${code:-no-response}"; exit 1; }
  log "  direct ${path} -> 200"
done

if getent hosts "$PUBLIC_DOMAIN" >/dev/null 2>&1; then
  for path in / /contact; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "${PUBLIC_HOST}${path}")
    [ "$code" = "200" ] || { echo "[deploy:$ENV] FAIL: public ${path} -> $code"; exit 1; }
    log "  public ${path} -> 200"
  done
else
  [ "$ENV" = prod ] && { echo "[deploy:prod] FAIL: $PUBLIC_DOMAIN does not resolve — prod must be publicly reachable"; exit 1; }
  log "  public check SKIPPED (DNS for $PUBLIC_DOMAIN not live yet) — direct gate passed; gate goes live when the DNS record lands"
fi

if [ "$ENV" = beta ]; then
  echo "$NEW_SHA" > "$STATE_FILE"
fi

RESULT="ok"
log "✅ deploy healthy at ${NEW_SHA:0:8} — $PUBLIC_HOST"
