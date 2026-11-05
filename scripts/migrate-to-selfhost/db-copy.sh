#!/usr/bin/env bash
# ============================================================
# OpenHR — copy the database from Supabase Pro (cloud) to the official
# self-hosted Supabase stack (supabase/docker), on the OCI server.
#
# Follows Supabase's official "restore from platform" method (roles, schema and
# data dumped with the Supabase CLI, restored with psql, triggers off), plus the
# parts that method skips for OpenHR:
#   - our triggers on auth.users (profile creation, email sync)
#   - our access policies on storage.objects (selfies, avatars, logos, ...)
#   - the pg_cron jobs, repointed at the self-hosted Edge Functions
# Storage FILES are copied separately by storage-copy.mjs.
#
# Run from the supabase-project folder (it reads POSTGRES_PASSWORD and CRON_SECRET from .env):
#   cd ~/supabase-project
#   export SRC_DB_URL='postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres'
#   bash ~/OpenHRApp/scripts/migrate-to-selfhost/db-copy.sh full   # first time: empty self-hosted db
#   bash ~/OpenHRApp/scripts/migrate-to-selfhost/db-copy.sh data   # later (cutover): reload data only
#
# Cron jobs are copied PAUSED unless ENABLE_CRON=yes (set it only at cutover).
#
# "data" mode EMPTIES all public.* and auth.* tables on the self-hosted db first.
# ============================================================
set -euo pipefail

MODE="${1:-}"
[ "$MODE" = full ] || [ "$MODE" = data ] || { echo "usage: db-copy.sh full|data"; exit 1; }
: "${SRC_DB_URL:?set SRC_DB_URL to the Pro session pooler URL (port 5432, not 6543)}"
[ -f .env ] || { echo "run this from the supabase-project folder (no .env here)"; exit 1; }
envval() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/'; }
POSTGRES_PASSWORD="$(envval POSTGRES_PASSWORD)"
CRON_SECRET="$(envval CRON_SECRET || true)"
WORK="${WORK:-$HOME/openhr-migration}"
mkdir -p "$WORK"; cd "$WORK"

# The Pro project ref, from the pooler user (postgres.<ref>) or the direct host (db.<ref>.supabase.co)
REF="$(echo "$SRC_DB_URL" | sed -nE 's#.*//postgres\.([a-z0-9]+):.*#\1#p; s#.*@db\.([a-z0-9]+)\.supabase\.co.*#\1#p' | head -1)"
[ -n "$REF" ] || { echo "cannot read the project ref from SRC_DB_URL"; exit 1; }

src() { docker run --rm -i postgres:17 psql "$SRC_DB_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }
dst() { docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
          psql -h 127.0.0.1 -U supabase_admin -d postgres -X -q -v ON_ERROR_STOP=1 "$@"; }

echo "== 1/7 Checks (Pro project: $REF, mode: $MODE)"
command -v supabase > /dev/null || { echo "Supabase CLI missing; see MIGRATE-DATA.md step 2"; exit 1; }
SRC_MAJOR=$(src -Atc "show server_version_num" | cut -c1-2)
DST_MAJOR=$(dst -Atc "show server_version_num" | cut -c1-2)
echo "   Postgres: Pro $SRC_MAJOR, self-hosted $DST_MAJOR"
[ "$DST_MAJOR" -ge "$SRC_MAJOR" ] || { echo "ABORT: self-hosted Postgres is older than Pro"; exit 1; }
PUBLIC_TABLES=$(dst -Atc "select count(*) from pg_tables where schemaname='public'")
if [ "$MODE" = full ] && [ "$PUBLIC_TABLES" != 0 ]; then
  echo "ABORT: the self-hosted db already has $PUBLIC_TABLES tables in public. Use 'data' mode to reload data."
  exit 1
fi
if [ "$MODE" = data ] && [ "$PUBLIC_TABLES" = 0 ]; then
  echo "ABORT: the self-hosted db is empty. Run 'full' mode first."; exit 1
fi

# Every Pro column in auth (and in public, for data mode) must exist on the target.
COLS="select n.nspname||'.'||c.relname||'.'||a.attname from pg_attribute a
      join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ($( [ "$MODE" = full ] && echo "'auth'" || echo "'auth','public'" ))
        and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped
        and c.relname not in ('schema_migrations') order by 1"
src -Atc "$COLS" > src-cols.txt
dst -Atc "$COLS" > dst-cols.txt
MISSING=$(comm -23 src-cols.txt dst-cols.txt || true)
if [ -n "$MISSING" ]; then
  echo "ABORT: these Pro columns do not exist on the self-hosted db:"; echo "$MISSING" | sed 's/^/   /'
  echo "   auth.*   -> Pro runs a newer Auth (GoTrue). Update the self-hosted stack (sh update.sh)."
  echo "   public.* -> Pro's schema changed since the 'full' run. Ask Claude how to re-run 'full'."
  exit 1
fi
echo "   OK"

echo "== 2/7 Dump from Pro with the Supabase CLI"
# Storage rows are not copied: storage-copy.mjs uploads every file through the
# Storage API, which writes the rows and the files together.
STORAGE_TABLES=$(src -Atc "select string_agg(schemaname||'.'||tablename, ',') from pg_tables where schemaname='storage'")
if [ "$MODE" = full ]; then
  supabase db dump --remote="$SRC_DB_URL" -f roles.sql --role-only
  supabase db dump --remote="$SRC_DB_URL" -f schema.sql
fi
supabase db dump --remote="$SRC_DB_URL" -f data.sql --data-only --use-copy --exclude="$STORAGE_TABLES"
ls -lh ./*.sql | awk '{print "   "$5"  "$9}'

echo "== 3/7 Extract what the CLI dump skips (auth triggers, storage policies, extensions, cron)"
# Extensions the app uses, in the same schema as on Pro. Loaded BEFORE the schema.
src -Atc "select format('create extension if not exists %I with schema %I;', e.extname, n.nspname)
          from pg_extension e join pg_namespace n on n.oid = e.extnamespace
          where e.extname in ('pg_cron','pg_net','pg_trgm','uuid-ossp')" > extensions.sql
src -At > extras.sql <<'SQL'
set search_path = '';
-- Our triggers on Supabase-managed tables (they call functions outside auth/storage)
select format('drop trigger if exists %I on %I.%I;', t.tgname, n.nspname, c.relname) || E'\n' || pg_get_triggerdef(t.oid) || ';'
from pg_trigger t
join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid join pg_namespace pn on pn.oid = p.pronamespace
where n.nspname in ('auth','storage') and not t.tgisinternal and pn.nspname not in ('auth','storage');
-- Our access policies on storage tables
select format('drop policy if exists %I on %I.%I;', policyname, schemaname, tablename) || E'\n' ||
       format('create policy %I on %I.%I as %s for %s to %s', policyname, schemaname, tablename, permissive, cmd,
              (select string_agg(quote_ident(r), ', ') from unnest(roles) r))
       || coalesce(' using (' || qual || ')', '') || coalesce(' with check (' || with_check || ')', '') || ';'
from pg_policies where schemaname = 'storage';
SQL
src -At > cron.sql <<SQL
select 'select cron.unschedule(jobid) from cron.job;';
select format('select cron.schedule(%L, %L, %L);', jobname, schedule,
              replace(command, 'https://$REF.supabase.co', 'http://api-gw:8000'))
from cron.job where active order by jobname;
SQL
echo "   $(wc -l < extensions.sql) extensions, $(grep -c '^create policy' extras.sql) storage policies, $(grep -c '^CREATE.*TRIGGER' extras.sql) auth/storage triggers, $(grep -c 'cron.schedule(' cron.sql) cron jobs"

echo "== 4/7 Prepare the self-hosted db"
if [ "$MODE" = full ]; then
  # Keep Pro's table grants instead of the target's defaults (Supabase CLI docs)
  dst -c "alter default privileges in schema public revoke all on tables from anon, authenticated;"
else
  dst -At -c "select 'truncate table '||string_agg(format('%I.%I',schemaname,tablename),', ')||' restart identity cascade;'
              from pg_tables where schemaname in ('public','auth') and tablename <> 'schema_migrations'" > truncate.sql
fi
if [ -n "$CRON_SECRET" ]; then
  dst -c "alter database postgres set app.cron_secret = '$CRON_SECRET';"
else
  echo "   WARNING: no CRON_SECRET in .env; cron jobs will be rejected by the functions"
fi

echo "== 5/7 Restore (one transaction, triggers off during the data load)"
for f in extensions.sql roles.sql schema.sql data.sql extras.sql truncate.sql cron.sql; do
  [ -f "$f" ] && docker cp "$f" supabase-db:/tmp/"$f"
done
if [ "$MODE" = full ]; then
  dst --single-transaction -f /tmp/extensions.sql -f /tmp/roles.sql -f /tmp/schema.sql \
      -c 'SET session_replication_role = replica' -f /tmp/data.sql \
      -c 'SET session_replication_role = origin' -f /tmp/extras.sql
else
  dst --single-transaction -f /tmp/extensions.sql -f /tmp/truncate.sql \
      -c 'SET session_replication_role = replica' -f /tmp/data.sql \
      -c 'SET session_replication_role = origin' -f /tmp/extras.sql
fi
dst -f /tmp/cron.sql > /dev/null
if [ "${ENABLE_CRON:-}" = yes ]; then
  echo "   cron jobs ACTIVE on the self-hosted server"
else
  # Rehearsal: keep the jobs paused, or users get every reminder twice (Pro still runs its own).
  dst -c "select cron.alter_job(jobid, active := false) from cron.job;" > /dev/null
  echo "   cron jobs copied but PAUSED (set ENABLE_CRON=yes at cutover)"
fi
dst -c "analyze" > /dev/null
dst -c "notify pgrst, 'reload schema';" > /dev/null

echo "== 6/7 Compare row counts"
COUNTS="select n.nspname||'.'||c.relname||' '||(xpath('/row/n/text()',
          query_to_xml(format('select count(*) as n from %I.%I',n.nspname,c.relname),false,true,'')))[1]::text
        from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname in ('public','auth') and c.relkind in ('r','p')
          and c.relname not in ('schema_migrations','audit_log_entries') order by 1"
src -Atc "$COUNTS" > src-counts.txt
dst -Atc "$COUNTS" > dst-counts.txt
COUNTS_OK=1
diff src-counts.txt dst-counts.txt > count-diff.txt || COUNTS_OK=0

echo "== 7/7 Compare security rules"
RULES="select 'policies '||schemaname||' '||count(*) from pg_policies where schemaname in ('public','storage') group by schemaname
       union all select 'functions public '||count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
       union all select 'cron jobs '||count(*) from cron.job order by 1"
src -Atc "$RULES" > src-rules.txt
dst -Atc "$RULES" > dst-rules.txt
RULES_OK=1
diff src-rules.txt dst-rules.txt > rules-diff.txt || RULES_OK=0
sed 's/^/   /' dst-rules.txt

if [ $COUNTS_OK = 1 ] && [ $RULES_OK = 1 ]; then
  echo "DONE. All $(wc -l < src-counts.txt) tables, policies and cron jobs match Pro."
  echo "Next: node storage-copy.mjs (see MIGRATE-DATA.md)."
else
  echo "Differences found (< Pro, > self-hosted). Row-count differences are expected only if Pro"
  echo "received new data during the copy. Send these files to Claude:"
  [ $COUNTS_OK = 0 ] && sed 's/^/   /' count-diff.txt
  [ $RULES_OK = 0 ] && sed 's/^/   /' rules-diff.txt
  exit 2
fi
