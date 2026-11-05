#!/usr/bin/env bash
# ============================================================
# OpenHR — copy all app data from Supabase Pro to the self-hosted stack.
#
# Copies the public schema (all app tables) and the auth schema (users,
# identities, sessions, refresh tokens) as data only. The self-hosted schema
# must already exist: `docker compose up -d` and let openhrapp-init apply the
# migrations first. Storage files are copied separately by storage-copy.mjs.
#
# Run on the OCI VM:
#   SRC_DB_URL='postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres' \
#   POSTGRES_PASSWORD='<self-hosted db password>' \
#   ./scripts/migrate-to-selfhost/db-copy.sh
#
# WARNING: empties every public.* and auth.* table on the TARGET first.
# Safe to re-run: each run is a full, fresh copy.
# ============================================================
set -euo pipefail

: "${SRC_DB_URL:?set SRC_DB_URL to the Pro session pooler URL (port 5432, not 6543)}"
: "${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD to the self-hosted db password}"
NET="${TARGET_NETWORK:-openhrapp-network}"
JOBS="${JOBS:-4}"
WORK="${WORK:-$HOME/openhr-dump}"
DST_DB_URL="postgresql://supabase_admin:${POSTGRES_PASSWORD}@supabase-db:5432/postgres"

# Tables owned by GoTrue's own bookkeeping, or pure logs. Never copied.
SKIP_SQL="('auth.schema_migrations','auth.audit_log_entries')"

CLIENT=17
pg() { docker run --rm -i --user "$(id -u):$(id -g)" --network "$NET" -v "$WORK:/dump" "postgres:$CLIENT" "$@"; }
q()  { pg psql "$1" -X -v ON_ERROR_STOP=1 -At -c "$2"; }

mkdir -p "$WORK"

echo "== 1/6 Versions"
SRC_MAJOR=$(q "$SRC_DB_URL" "show server_version_num" | cut -c1-2)
DST_MAJOR=$(q "$DST_DB_URL" "show server_version_num" | cut -c1-2)
echo "   Pro: Postgres $SRC_MAJOR   self-hosted: Postgres $DST_MAJOR"
if [ "$DST_MAJOR" -lt "$SRC_MAJOR" ]; then
  echo "ABORT: self-hosted Postgres is older than Pro. Set the supabase-db image in"
  echo "       docker-compose.yml to a supabase/postgres $SRC_MAJOR.x tag, recreate the volume, retry."
  exit 1
fi
CLIENT=$DST_MAJOR  # newer pg_dump reads older servers; pg_restore must be >= the dump

echo "== 2/6 Schema check (every Pro column must exist on the target)"
COLS="select n.nspname||'.'||c.relname||'.'||a.attname
      from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','auth') and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped
        and n.nspname||'.'||c.relname not in $SKIP_SQL order by 1"
q "$SRC_DB_URL" "$COLS" > "$WORK/src-cols.txt"
q "$DST_DB_URL" "$COLS" > "$WORK/dst-cols.txt"
MISSING=$(comm -23 "$WORK/src-cols.txt" "$WORK/dst-cols.txt" || true)
if [ -n "$MISSING" ]; then
  echo "ABORT: these Pro columns do not exist on the target:"
  echo "$MISSING" | sed 's/^/   /'
  echo "   public.* -> apply the missing migrations on the target."
  echo "   auth.*   -> Pro runs a newer GoTrue; bump the supabase-auth image tag and restart it."
  exit 1
fi
echo "   OK ($(wc -l < "$WORK/src-cols.txt") columns)"

echo "== 3/6 Dump from Pro ($JOBS parallel jobs)"
rm -rf "$WORK/db"
pg pg_dump "$SRC_DB_URL" --data-only --format=directory --jobs="$JOBS" --file=/dump/db \
  --schema=public --schema=auth \
  --exclude-table=auth.schema_migrations --exclude-table=auth.audit_log_entries \
  --no-owner --no-privileges
du -sh "$WORK/db" | sed 's/^/   size: /'

echo "== 4/6 Empty target tables"
q "$DST_DB_URL" "select 'truncate table '||string_agg(format('%I.%I',n.nspname,c.relname),', ')||' restart identity cascade'
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','auth') and c.relkind in ('r','p')
    and n.nspname||'.'||c.relname not in $SKIP_SQL" > "$WORK/truncate.sql"
pg psql "$DST_DB_URL" -X -v ON_ERROR_STOP=1 -q -f /dump/truncate.sql

echo "== 5/6 Restore into self-hosted (triggers off, so no emails/pushes fire)"
pg pg_restore --dbname="$DST_DB_URL" --data-only --jobs="$JOBS" --disable-triggers \
  --no-owner --no-privileges --exit-on-error /dump/db
q "$DST_DB_URL" "analyze" > /dev/null

echo "== 6/6 Row counts"
COUNTS="select n.nspname||'.'||c.relname||' '||(xpath('/row/n/text()',
          query_to_xml(format('select count(*) as n from %I.%I',n.nspname,c.relname),false,true,'')))[1]::text
        from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname in ('public','auth') and c.relkind in ('r','p')
          and n.nspname||'.'||c.relname not in $SKIP_SQL order by 1"
q "$SRC_DB_URL" "$COUNTS" > "$WORK/src-counts.txt"
q "$DST_DB_URL" "$COUNTS" > "$WORK/dst-counts.txt"
if diff "$WORK/src-counts.txt" "$WORK/dst-counts.txt" > "$WORK/count-diff.txt"; then
  echo "   All $(wc -l < "$WORK/src-counts.txt") tables match."
else
  echo "   Counts differ (< Pro, > self-hosted). Expected only if Pro took writes during the copy:"
  sed 's/^/   /' "$WORK/count-diff.txt"
  exit 2
fi
echo "Done. Next: node scripts/migrate-to-selfhost/storage-copy.mjs"
