#!/usr/bin/env bash
# ============================================================
# OpenHR — Secrets Generator
# Run this ONCE before "docker compose up" to generate a secure
# .env file from .env.docker.
#
# Usage:
#   bash scripts/generate-secrets.sh
#
# Requires: openssl (for random bytes) and node (for JWT signing).
# Both are standard on any system with Node.js installed.
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_DOCKER="${PROJECT_DIR}/.env.docker"
ENV_FILE="${PROJECT_DIR}/.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${GREEN}${BOLD}OpenHR — Secrets Generator${NC}"
echo ""

# ---- Check prerequisites ----
if ! command -v node &>/dev/null; then
    echo -e "${RED}Error: Node.js is required but not found.${NC}"
    echo "Install Node.js 18+ from https://nodejs.org"
    exit 1
fi

if ! command -v openssl &>/dev/null; then
    echo -e "${RED}Error: openssl is required but not found.${NC}"
    exit 1
fi

# ---- Check for existing .env ----
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}WARNING: .env already exists at ${ENV_FILE}${NC}"
    echo "Overwriting will replace your current secrets."
    read -r -p "Overwrite? [y/N] " reply
    if [ "$reply" != "y" ] && [ "$reply" != "Y" ]; then
        echo "Aborted. Existing .env preserved."
        exit 0
    fi
fi

# ---- Generate secrets ----
echo "Generating secrets..."

POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
CRON_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)
DEMO_USER_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | cut -c1-12)

# ---- Derive JWT keys from JWT_SECRET ----
# Supabase uses HS256 JWTs. We create valid tokens that Supabase services
# will accept for the 'anon' and 'service_role' roles.
echo "Deriving ANON_KEY and SERVICE_ROLE_KEY from JWT_SECRET..."

ANON_KEY=$(node -e "
const crypto = require('crypto');

function base64url(buf) {
    return buf.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

const secret = process.argv[1];
const now = Math.floor(Date.now() / 1000);
const tenYears = now + (10 * 365 * 24 * 60 * 60);

function sign(payload) {
    const header = base64url(Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})));
    const body = base64url(Buffer.from(JSON.stringify(payload)));
    const data = header + '.' + body;
    const sig = base64url(crypto.createHmac('sha256', secret).update(data).digest());
    return data + '.' + sig;
}

console.log(sign({role:'anon', iss:'supabase', iat:now, exp:tenYears}));
" "$JWT_SECRET")

SERVICE_ROLE_KEY=$(node -e "
const crypto = require('crypto');

function base64url(buf) {
    return buf.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

const secret = process.argv[1];
const now = Math.floor(Date.now() / 1000);
const tenYears = now + (10 * 365 * 24 * 60 * 60);

function sign(payload) {
    const header = base64url(Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})));
    const body = base64url(Buffer.from(JSON.stringify(payload)));
    const data = header + '.' + body;
    const sig = base64url(crypto.createHmac('sha256', secret).update(data).digest());
    return data + '.' + sig;
}

console.log(sign({role:'service_role', iss:'supabase', iat:now, exp:tenYears}));
" "$JWT_SECRET")

# ---- Write .env file ----
echo "Writing .env..."

cat > "$ENV_FILE" <<ENVEOF
# ============================================================
# OpenHR — Generated Environment Variables
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Source:    .env.docker
#
# Keep this file SECRET — it contains credentials.
# Add .env to your .gitignore.
# ============================================================

# --- PostgreSQL ---
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# --- JWT Signing Secret ---
JWT_SECRET=${JWT_SECRET}

# --- Supabase API Keys ---
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# --- Cron Job Secret ---
CRON_SECRET=${CRON_SECRET}

# --- Supabase Studio ---
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=admin

# --- Frontend (build-time env vars for Vite) ---
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=${ANON_KEY}

# --- Optional: Web Push Notifications ---
VITE_VAPID_PUBLIC_KEY=

# --- Optional: Email (Resend) ---
RESEND_API_KEY=

# --- Optional: Demo User Password ---
DEMO_USER_PASSWORD=${DEMO_USER_PASSWORD}
ENVEOF

# ---- Print summary ----
echo ""
echo -e "${GREEN}${BOLD}Done! .env file created at ${ENV_FILE}${NC}"
echo ""
echo -e "  ${BOLD}Generated values:${NC}"
echo -e "    POSTGRES_PASSWORD:   ${POSTGRES_PASSWORD:0:12}..."
echo -e "    JWT_SECRET:          ${JWT_SECRET:0:12}..."
echo -e "    CRON_SECRET:         ${CRON_SECRET:0:12}..."
echo -e "    DEMO_USER_PASSWORD:  ${DEMO_USER_PASSWORD}"
echo ""
echo -e "  ${BOLD}Next steps:${NC}"
echo -e "    1. Edit .env to set DASHBOARD_USERNAME and DASHBOARD_PASSWORD"
echo -e "    2. Run: ${GREEN}docker compose up -d${NC}"
echo -e "    3. Open: ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "  ${YELLOW}Note: VITE_SUPABASE_ANON_KEY has been set to match ANON_KEY.${NC}"
echo -e "  ${YELLOW}If you change ANON_KEY later, update VITE_SUPABASE_ANON_KEY too${NC}"
echo -e "  ${YELLOW}and rebuild the frontend: docker compose build --no-cache openhr-frontend${NC}"
echo ""
