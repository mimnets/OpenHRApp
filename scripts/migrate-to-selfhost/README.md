# Supabase Pro → self-hosted Supabase (OCI)

Follow these in order:

1. **`OCI-SETUP.md`**: install the official self-hosted Supabase on the OCI server,
   behind Nginx Proxy Manager, at https://api.openhrapp.com.
2. **`MIGRATE-DATA.md`**: secrets, Resend email, Edge Functions, the rehearsal, the
   cutover with Vercel, and rollback.

Files used by those guides:

| File | Purpose |
|---|---|
| `db-copy.sh` | Copies the database from Pro using Supabase's official dump method, plus the parts it skips (auth triggers, storage policies, cron jobs). Checks before changing anything, and compares row counts after. Modes: `full` (empty server) and `data` (reload data at cutover). |
| `storage-copy.mjs` | Copies every bucket and file through both Storage APIs. Copies only missing files, so it is safe to re-run. |
| `docker-compose.openhr.yml` | Adds OpenHR's Edge Function secrets and the 8-digit email code setting to the official stack. |

The repo's root `docker-compose.yml` is a separate, older all-in-one setup. The OCI
server does not use it.
