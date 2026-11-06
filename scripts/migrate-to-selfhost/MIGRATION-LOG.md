# Migration record: errors and fixes

What went wrong during the move from Supabase Cloud to the self-hosted server in November
2026, why, and how each problem was fixed. Use it if the same error comes back.

No passwords or keys belong in this file.

| Item | Value |
|---|---|
| Server | OCI, `150.136.150.227`, logged in as `root` |
| Folders | `/home/ubuntu/OpenHRApp`, `/home/ubuntu/supabase-project` |
| API | https://api.openhrapp.com, through Nginx Proxy Manager to port 8100 |
| App | https://openhrapp.com on Vercel |
| Old Cloud project | `cixryuwtlwbofabctrkk` (keep it: the revert needs it) |
| Guides | `OCI-SETUP.md`, `MIGRATE-DATA.md`, `DB-MIGRATE-PAGE.md` |

## Quick lookup

| You see | Go to |
|---|---|
| `HTTP 402` or `exceed_storage_size_quota` | 1 |
| Vercel: `[BUILD_UTILS_SPAWN_1] Command "npm run build" exited with 1` | 2 |
| "This store has not been activated" | 3 |
| Page or `curl` shows `502 Bad Gateway` for `/db-migrate-runner/` | 4 |
| `User authentication failed. Missing username and password` for `/db-migrate-runner/` | 5 |
| `Supabase project: No .env file in /root/supabase-project` | 6 |
| `cp: cannot stat '/root/OpenHRApp/...'` or `cd: OpenHRApp/: No such file or directory` | 7 |
| `cp: missing destination file operand` | 8 |
| `password authentication failed for user "postgres"` | 9 |
| Demo login fails, or `{"error":"Demo not configured"}` | 10 |
| Cutover would leave no cron jobs | 11 |

---

## 1. Cloud project restricted: HTTP 402

**Symptom:** every Cloud API (login, data, files, functions) returned:

```
Service for this project is restricted due to the following violations: exceed_storage_size_quota
```

The app could not log anyone in.

**Cause:** Supabase blocked the project for going over its storage quota, after the Pro
subscription was cancelled.

**Fix:** move to the self-hosted server. The Storage API stays blocked until the restriction
is lifted, so files can be copied only after that. The database copy uses a direct database
connection instead of these APIs. The `db-migrate` page treats the 402 as a warning, and
**Copy the files** can run after the switch. Then it copies only missing files.

**Check:**

```bash
curl -s https://cixryuwtlwbofabctrkk.supabase.co/auth/v1/health -H "apikey: <anon key>"
```

## 2. Vercel build failed

**Symptom:** `Error: [BUILD_UTILS_SPAWN_1] Command "npm run build" exited with 1`. The same
build passed on a PC.

**Cause:** the same 402. `npm run build` also runs `generate-sitemap`, `generate-feed` and
`generate-llms`. They read from Supabase and stop the build if a query fails. On a PC with no
`VITE_SUPABASE_*` values they skip that step, which is why the build passed there.

**Fix (commit `fed1673`):** on an HTTP 402 only, the three scripts keep the last committed files
in `public/` and let the build continue. Other errors, such as a 401, still stop the build.

**To reproduce:** run the build with Vercel's `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
The build log shows which script failed and why.

## 3. "This store has not been activated"

**Symptom:** `openhrapp.com` sometimes showed this Lemon Squeezy page. The browser console
showed `useCheckoutState`, Sentry and `/cdn-cgi/` errors, none of which belong to this app.
`curl` showed the correct Vercel page at the same time.

**Cause:** the domain had **two** A records: `216.198.79.1` (Vercel) and `3.33.255.208` (a Lemon
Squeezy store). Each connection could land on either one. It affected every page, not only
`/db-migrate`. In-app clicks could still work, because they do not always load a new page.

**Fix:** delete the `3.33.255.208` A record in DNS. Keep `216.198.79.1`.

**Check:** `nslookup openhrapp.com 8.8.8.8` must list only `216.198.79.1`. To test an address
directly:

```bash
curl -s --resolve openhrapp.com:443:3.33.255.208 https://openhrapp.com/ | grep -i "not been activated"
```

## 4. 502 Bad Gateway on the helper

**Symptom:** `https://api.openhrapp.com/db-migrate-runner/status` returned `502 Bad Gateway`.

**Cause:** Nginx had the block, but could not reach the helper: either it was not running, or the
server firewall blocked port 8787 from Docker.

**Fix:**

```bash
pgrep -af migrate-runner
sudo iptables -I INPUT 1 -p tcp -s 172.16.0.0/12 --dport 8787 -j ACCEPT
```

**Check:** `curl -s https://api.openhrapp.com/db-migrate-runner/status` must return
`{"error": "Wrong token."}`. That answer means the helper is reachable.

## 5. "Missing username and password" on the helper

**Symptom:** the page said "The server answered, but not the helper (status 401)".

**Cause:** the `/db-migrate-runner/` block was not yet in Nginx Proxy Manager, so the request went
to Supabase's gateway.

**Fix:** edit the `api.openhrapp.com` proxy host, click the **gear icon** (this version has no tab
named Advanced), paste the block that the helper prints, and save.

## 6. "No .env file in /root/supabase-project"

**Symptom:** the checks failed with this message.

**Cause:** the helper looks in the home folder of the user that started it. It ran as `root`, but
the project is in `/home/ubuntu`.

**Fix:** see "No .env file" in `DB-MIGRATE-PAGE.md`. In short:

```bash
pkill -f migrate-runner
export SUPABASE_PROJECT=$(docker inspect supabase-db --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}')
python3 scripts/migrate-to-selfhost/migrate-runner.py
```

The restart makes a new token.

## 7. "cannot stat '/root/OpenHRApp/...'"

**Cause:** as `root`, `~` means `/root`. The folders are in `/home/ubuntu`.

**Fix:** use `/home/ubuntu/OpenHRApp` and `/home/ubuntu/supabase-project`. See "If you are logged
in as `root`" in `MIGRATE-DATA.md`.

## 8. "cp: missing destination file operand"

**Cause:** the end of the line was lost when it was pasted.

**Fix:** the line must end with a space and a dot:

```bash
cp /home/ubuntu/OpenHRApp/scripts/migrate-to-selfhost/docker-compose.openhr.yml .
```

## 9. "password authentication failed for user postgres"

**Symptom:** the **Pro database** check failed with this message.

**Cause:** the database password in the address was rejected. The exact mistake was not recorded.
Common ones are leaving the `[ ]` around the password, or using the Supabase login password or
the service_role key.

**Fix:** correct the password in the address, or reset it in **Project Settings → Database**.

## 10. Demo accounts do not work

**Symptom:** the demo login fails. `demo-login` returns `{"error":"Demo not configured"}`.

**Cause, in two parts:**

1. `DEMO_USER_PASSWORD` was not in the server's `.env`, because the value was forgotten. Supabase
   does not show saved secrets, so it could not be read back from Cloud.
2. Setting a new value alone is not enough. The demo users were copied from Cloud with a hash of
   the old password. `demo-login` and `demo-reset` set the password only when they create a
   user, so sign-in would then fail with a different error.

**Fix:** make a new password, and set it in both places. Run this on the server. It never prints
the password:

```bash
cd /home/ubuntu/supabase-project
NEW=$(openssl rand -hex 16)
sed -i '/^DEMO_USER_PASSWORD=/d' .env
echo "DEMO_USER_PASSWORD=$NEW" >> .env
docker exec -e PGPASSWORD="$(grep '^POSTGRES_PASSWORD=' .env | tail -1 | cut -d= -f2-)" supabase-db \
  psql -h 127.0.0.1 -U supabase_admin -d postgres -c \
  "update auth.users set encrypted_password = extensions.crypt('$NEW', extensions.gen_salt('bf')), updated_at = now()
   where email in ('demo-admin@openhrapp.com','demo-manager@openhrapp.com','demo-employee@openhrapp.com');"
sh run.sh start
```

`UPDATE 3` must appear. If it shows a lower number, `demo-login` creates a missing user on its
first use, with the new password.

**Check:** each line must print `200`:

```bash
for r in admin manager employee; do
  curl -s -o /dev/null -w "$r %{http_code}\n" -X POST -H 'Content-Type: application/json' \
    -d "{\"role\":\"$r\"}" https://api.openhrapp.com/functions/v1/demo-login
done
```

**Good to know:** this password is not a real secret. The `demo-credentials` function gives it to
anyone who opens the demo window. Never reuse a real password for it. If you forget it, run this
fix again.

## 11. Cutover would have removed all cron jobs (found in review)

**Symptom:** none, because it was fixed before the switch.

**Cause:** the old steps paused Cloud's cron jobs first. `db-copy.sh` then deleted the target's jobs
and copied only the `active` ones, so it would have copied none.

**Fix (commit `fcda856`):** `db-copy.sh` copies every job.

**Check:** run this in Studio's SQL Editor. Every job must show `active = true`:

```sql
select jobname, schedule, active from cron.job order by jobname;
```

---

## Still to do after the migration

- [ ] Stop the helper, and remove the `/db-migrate-runner/` block from Nginx Proxy Manager.
- [ ] Copy the files, if the restriction stopped them (see 1).
- [ ] Check that the cron jobs are active and running (see 11).
- [ ] Turn off **Block Common Exploits** on the `api.openhrapp.com` proxy host. It can block normal
      database queries from the app.
- [ ] Close port 8100 to the internet. It answers from outside over plain HTTP. First point the proxy
      host at a private address instead of `150.136.150.227`, or the API stops working.
- [ ] Remove any custom domain for this site in Lemon Squeezy (see 3).
- [ ] Decide when to delete the backups in `/root/openhr-migration`. They contain password hashes.
- [ ] Keep the Cloud project until you are sure that you will not revert.
