#!/bin/bash
# ============================================================
# OpenHR: nightly backup of the self-hosted Supabase stack to encrypted storage
# outside OCI. Copies the database, the uploaded files, and the secrets and config.
#
# Needs an rclone crypt remote named "openhr-backup" (see BACKUP-GUIDE.md).
# Run as root on the server:
#   PING_URL=https://hc-ping.com/... bash scripts/backup/openhr-backup.sh
#
# Optional settings: PROJECT, LOCAL, REMOTE, KEEP_DAYS, PING_URL.
# ============================================================
set -euo pipefail
umask 077

PROJECT=${PROJECT:-/home/ubuntu/supabase-project}
LOCAL=${LOCAL:-/home/ubuntu/openhr-backups}
REMOTE=${REMOTE:-openhr-backup:}
KEEP_DAYS=${KEEP_DAYS:-30}
PING_URL=${PING_URL:-}

STAMP=$(date -u +%F)
DIR=$LOCAL/$STAMP
mkdir -p "$DIR"
echo "$(date -u +%FT%TZ) backup started: $DIR"

# Database first: a file newer than the dump is harmless, a missing file is not.
export PGPASSWORD=$(grep '^POSTGRES_PASSWORD=' "$PROJECT/.env" | tail -1 | cut -d= -f2-)
docker exec -e PGPASSWORD supabase-db \
  pg_dumpall -h 127.0.0.1 -U supabase_admin --clean --if-exists | gzip > "$DIR/db.sql.gz"

# Keep xattrs, which the file backend uses for content types.
# tar exit 1 only means that a file changed while it was being read.
tar --xattrs --xattrs-include='*' -C "$PROJECT/volumes" -czf "$DIR/storage.tar.gz" storage || [ $? -eq 1 ]

# Secrets and config. This archive includes .env.
tar -C "$(dirname "$PROJECT")" \
  --exclude="$(basename "$PROJECT")/volumes/db/data" \
  --exclude="$(basename "$PROJECT")/volumes/storage" \
  -czf "$DIR/config.tar.gz" "$(basename "$PROJECT")"

# Stop here if the dump is incomplete, so that old backups are not deleted below.
zcat "$DIR/db.sql.gz" | tail -n 20 | grep -q 'database cluster dump complete'

rclone copy "$DIR" "$REMOTE$STAMP"
rclone delete "$REMOTE" --min-age "${KEEP_DAYS}d"
find "$LOCAL" -mindepth 1 -maxdepth 1 -type d -mtime +2 -exec rm -rf {} +

# Reports success only. A missing ping is what triggers the alert.
[ -z "$PING_URL" ] || curl -fsS -m 10 "$PING_URL" > /dev/null
echo "$(date -u +%FT%TZ) backup finished: $(du -sh "$DIR" | cut -f1)"
