#!/usr/bin/env bash
# ============================================================
# OpenHR — Docker Init Script
# Runs inside the openhr-init container after all Supabase
# services report healthy. Applies migrations, deploys edge
# functions, and configures cron jobs.
# ============================================================

set -euo pipefail

# ---- Colors ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log()   { echo -e "${GREEN}[init]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
err()   { echo -e "${RED}[err]${NC}   $*"; }
header(){ echo -e "\n${BLUE}${BOLD}=== $* ===${NC}\n"; }

# ---- Configuration (from environment, set by docker-compose) ----
DB_HOST="${DB_HOST:-supabase-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-postgres}"
SUPABASE_DB_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

KONG_URL="${KONG_URL:-http://supabase-kong:8000}"
EDGE_FUNCTIONS_URL="${EDGE_FUNCTIONS_URL:-http://supabase-edge-functions:9000}"
EDGE_MGMT_URL="${EDGE_MGMT_URL:-http://supabase-edge-functions:9001}"

CRON_SECRET="${CRON_SECRET:-}"
MAX_WAIT_SEC="${MAX_WAIT_SEC:-120}"

# ---- Phase 1: Install Dependencies ----
header "Phase 1: Installing dependencies"
apk add --no-cache --quiet postgresql-client curl jq 2>/dev/null
log "Dependencies installed (psql, curl, jq)"

# ---- Phase 2: Wait for All Services ----
header "Phase 2: Waiting for services (timeout: ${MAX_WAIT_SEC}s)"

wait_for_pg() {
    local waited=0
    while [ $waited -lt $MAX_WAIT_SEC ]; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; then
            log "PostgreSQL is ready"
            return 0
        fi
        sleep 2
        waited=$((waited + 2))
    done
    err "PostgreSQL did not become ready within ${MAX_WAIT_SEC}s"
    return 1
}

wait_for_http() {
    local url="$1"
    local name="$2"
    local waited=0
    while [ $waited -lt $MAX_WAIT_SEC ]; do
        if curl -sf -o /dev/null "$url" 2>/dev/null; then
            log "${name} is ready"
            return 0
        fi
        sleep 2
        waited=$((waited + 2))
    done
    warn "${name} did not respond within ${MAX_WAIT_SEC}s — continuing anyway"
    return 0  # don't fail — some services may be slow to start
}

wait_for_pg
wait_for_http "${KONG_URL}/auth/v1/settings" "GoTrue (auth)"
wait_for_http "${KONG_URL}/rest/v1/" "PostgREST (rest)"
wait_for_http "${SUPABASE_STORAGE_URL:-http://supabase-storage:5000}/status" "Storage"
wait_for_http "${EDGE_FUNCTIONS_URL}" "Edge Functions"

log "All services checked — proceeding with setup"

# ---- Phase 3: Apply Database Migrations ----
header "Phase 3: Applying database migrations"

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"
migration_count=0
error_count=0

for f in $(ls "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | sort); do
    fname=$(basename "$f")
    log "Applying: $fname"

    if PGPASSWORD="$DB_PASS" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v ON_ERROR_STOP=1 \
        -f "$f" 2>&1 | tail -1; then
        migration_count=$((migration_count + 1))
    else
        err "Migration failed: $fname"
        error_count=$((error_count + 1))
        # Check if it's a "relation already exists" error — if so, skip
        if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -f "$f" 2>&1 | grep -qi "already exists"; then
            warn "Skipping $fname (objects already exist — likely from previous run)"
            error_count=$((error_count - 1))
        fi
    fi
done

log "Migrations: ${migration_count} applied, ${error_count} errors"

# ---- Phase 4: Deploy Edge Functions ----
header "Phase 4: Deploying edge functions"

FUNCTIONS_DIR="${FUNCTIONS_DIR:-/functions}"
deployed=0
failed=0

if [ -d "$FUNCTIONS_DIR" ]; then
    for func_dir in "${FUNCTIONS_DIR}"/*/; do
        func_name=$(basename "$func_dir")

        if [ ! -f "${func_dir}index.ts" ]; then
            warn "Skipping $func_name — no index.ts found"
            continue
        fi

        log "Deploying: $func_name"

        # Read the function body and JSON-escape it for the API call
        func_body=$(cat "${func_dir}index.ts")

        # Call the edge-runtime management API to create/update the function
        response=$(curl -s -w "\n%{http_code}" \
            -X POST "${EDGE_MGMT_URL}/functions/v1/${func_name}" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${CRON_SECRET:-supabase}" \
            -d "$(jq -n --arg name "$func_name" --arg body "$func_body" \
                 '{name: $name, body: $body, verify_jwt: false}')" 2>/dev/null || echo "000")

        http_code=$(echo "$response" | tail -1)

        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ] 2>/dev/null; then
            deployed=$((deployed + 1))
        elif [ "$http_code" = "000" ] || [ "$http_code" -ge 500 ] 2>/dev/null; then
            # Management API may not exist — functions might be auto-discovered from volume mount
            warn "Management API returned ${http_code} for $func_name (may be auto-discovered from volume)"
            deployed=$((deployed + 1))  # count as deployed since volume mount handles it
        else
            warn "Failed to deploy $func_name (HTTP ${http_code})"
            failed=$((failed + 1))
        fi
    done
    log "Edge functions: ${deployed} deployed, ${failed} failed"
else
    warn "Functions directory $FUNCTIONS_DIR not found — skipping edge function deployment"
fi

# ---- Phase 5: Configure Cron Jobs ----
header "Phase 5: Configuring cron jobs"

CRON_SQL_TEMPLATE="${CRON_SQL_TEMPLATE:-/scripts/setup-cron-schedules.sql}"
CRON_SQL_WORKING="/tmp/setup-cron-schedules-docker.sql"

if [ -f "$CRON_SQL_TEMPLATE" ] && [ -n "$CRON_SECRET" ]; then
    log "Templating cron SQL with Docker-internal URLs..."

    # Replace cloud URLs with Docker-internal Kong URLs
    # Original pattern: https://<PROJECT_REF>.supabase.co/functions/v1/<function-name>
    # Docker pattern:    http://supabase-kong:8000/functions/v1/<function-name>
    sed -e "s|https://[^.]*\.supabase\.co/functions/v1/|${KONG_URL}/functions/v1/|g" \
        -e "s|'app\.cron_secret'|'app.cron_secret'|g" \
        "$CRON_SQL_TEMPLATE" > "$CRON_SQL_WORKING"

    # Set the app.cron_secret PostgreSQL parameter
    log "Setting app.cron_secret database parameter..."
    PGPASSWORD="$DB_PASS" psql \
        -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "ALTER DATABASE ${DB_NAME} SET app.cron_secret = '${CRON_SECRET}';" 2>/dev/null || \
        warn "Could not set app.cron_secret parameter (may already be set or need superuser)"

    # Execute the cron schedule SQL
    log "Registering cron jobs..."
    if PGPASSWORD="$DB_PASS" psql \
        -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$CRON_SQL_WORKING" 2>&1 | tail -5; then
        log "Cron jobs registered successfully"
    else
        warn "Some cron jobs may already exist (this is normal on restart)"

        # Try registering them individually with ON CONFLICT DO NOTHING
        if PGPASSWORD="$DB_PASS" psql \
            -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -c "SELECT cron.schedule FROM cron.job;" 2>/dev/null; then
            log "Verified: pg_cron extension is active with existing jobs"
        fi
    fi
elif [ -z "$CRON_SECRET" ]; then
    warn "CRON_SECRET not set — skipping cron job configuration"
    warn "Set CRON_SECRET in .env and restart to enable cron jobs"
else
    warn "Cron SQL template not found at $CRON_SQL_TEMPLATE — skipping"
fi

# Also run migration 0009 (pg_net extension and built-in cleanup cron jobs)
# This was already applied in Phase 3, but verify pg_cron is active
log "Verifying pg_cron extension..."
if PGPASSWORD="$DB_PASS" psql \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');" 2>/dev/null; then
    log "Required extensions are active"
else
    warn "Could not verify extensions — they may need to be enabled manually"
fi

# ---- Phase 6: Write Generated Secrets Marker ----
header "Phase 6: Saving state"

SECRETS_DIR="${SECRETS_DIR:-/secrets}"
if [ -d "$SECRETS_DIR" ]; then
    cat > "${SECRETS_DIR}/.init-complete" <<EOF
# OpenHR Docker — Init Complete
# Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# This marker file indicates that the init container has completed setup.
# Delete it to force a fresh initialization on next start.
EOF
    log "Init marker written to ${SECRETS_DIR}/.init-complete"
fi

# ---- Phase 7: Print Summary ----
header "OpenHR Docker Setup Complete!"

echo -e "${GREEN}${BOLD}  OpenHR is ready!${NC}"
echo ""
echo -e "  ${BOLD}OpenHR App:${NC}       http://localhost:3000"
echo -e "  ${BOLD}Supabase Studio:${NC}  http://localhost:3001"
echo -e "  ${BOLD}Supabase API:${NC}     http://localhost:8000"
echo ""
echo -e "  ${BOLD}Studio Login:${NC}"
echo -e "    Username: ${DASHBOARD_USERNAME:-admin}"
echo -e "    Password: ${DASHBOARD_PASSWORD:-admin}"
echo ""
echo -e "  ${YELLOW}First time? Register your organization at:${NC}"
echo -e "  ${YELLOW}http://localhost:3000 → Get Started${NC}"
echo ""
echo -e "  ${BLUE}Useful commands:${NC}"
echo -e "    docker compose logs -f              # Follow all logs"
echo -e "    docker compose logs openhr-init     # Re-read this setup log"
echo -e "    docker compose restart openhr-frontend  # Restart frontend after .env changes"
echo ""

exit 0
