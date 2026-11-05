# Supabase Pro → self-hosted Supabase (OCI)

Two scripts move everything:

| Script | Moves | Re-runnable |
|---|---|---|
| `db-copy.sh` | all `public.*` data + `auth.*` users, identities, sessions | yes, full fresh copy each run |
| `storage-copy.mjs` | every bucket and file | yes, only copies missing or changed files |

Schema is **not** copied. It comes from `supabase/migrations`, which `openhrapp-init`
applies when the stack starts. `db-copy.sh` refuses to run if any Pro column is
missing on the target, so schema drift fails before anything is changed.

## One-time setup on the OCI VM

1. Install Docker and Node 20. Clone the repo.
2. Create `.env` next to `docker-compose.yml`. Copy each secret from the Pro dashboard:
   - `JWT_SECRET`: use **Pro's legacy JWT secret** (Settings → API → JWT). Then Pro's
     `ANON_KEY` / `SERVICE_ROLE_KEY` stay valid on the new server, and existing logins
     keep working.
   - `ANON_KEY`, `SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`, `SITE_URL`, `API_EXTERNAL_URL`
   - SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL`)
   - Edge function secrets: `CRON_SECRET`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`,
     `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES`, `VAPID_PUBLIC_KEY`,
     `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `OUTREACH_*`, `DEMO_USER_PASSWORD`
3. Match versions to Pro. Without this, `db-copy.sh` stops at step 1 or 2:
   - Postgres major (Pro: Settings → Infrastructure). If Pro is on 17, set
     `supabase-db` to a `supabase/postgres:17.x` tag.
   - GoTrue (Auth). Set `supabase-auth` to the same or a newer version than Pro's.
4. `docker compose up -d`, then wait for `openhrapp-init` to exit successfully.
5. Put HTTPS in front of Kong (port 8000), for example with Caddy or nginx + certbot, on
   a hostname such as `api.openhrapp.com`.
6. Copy the GoTrue settings that are only in the Pro dashboard: redirect URLs, email
   templates (the 8-digit OTP copy), rate limits.

## Source connection

Pro's direct host `db.<ref>.supabase.co` is IPv6-only. Use the **session pooler** URL
(Connect → Session pooler, port **5432**, user `postgres.<ref>`). Do not use the
transaction pooler (6543), because pg_dump cannot use it.

## Rehearsal (do this at least once, any day)

```bash
export SRC_DB_URL='postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres'
export POSTGRES_PASSWORD='<self-hosted db pw>'
./scripts/migrate-to-selfhost/db-copy.sh            # ends with a row-count comparison

SRC_URL=https://<ref>.supabase.co SRC_SERVICE_KEY=<pro service key> \
DST_URL=https://api.openhrapp.com DST_SERVICE_KEY=<self-host service key> \
node scripts/migrate-to-selfhost/storage-copy.mjs   # bulk copy of files, the slow part
```

Point a preview frontend build at the new API (`VITE_SUPABASE_URL`) and log in as
a few real users to check.

## Cutover (usually under 15 minutes)

1. Announce a short maintenance window.
2. **Stop Pro's cron jobs**, or both servers send reminders and emails:
   Pro SQL editor → `select cron.unschedule(jobname) from cron.job;`
3. Run `db-copy.sh` again. The row counts must match.
4. Run `storage-copy.mjs` again. It copies only the files added since the rehearsal.
5. Set `VITE_SUPABASE_URL` (and `VITE_SUPABASE_ANON_KEY`, if you did not reuse Pro's
   key) in Vercel and redeploy the frontend.
6. Smoke test: log in, check in and out, apply for leave, upload a selfie.
7. Keep the Pro project paused, not deleted, for a few weeks as a rollback.

## Known effects

- Users are logged out once. supabase-js stores the session under a key derived from
  the API hostname. To keep sessions, set `storageKey: 'sb-<old-ref>-auth-token'` in
  `src/services/supabase.ts`, and reuse Pro's JWT secret.
- `src/sw.ts` caching rules match only `*.supabase.co`. On a custom domain, API calls
  bypass the service-worker cache and go straight to the network. This is safe, but
  you lose the 8 s offline fallback for REST reads.
- Writes that reach Pro between step 3 and step 5 are lost. Keep that gap short.
