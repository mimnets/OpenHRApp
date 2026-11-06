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
| Selfie blank after check-in, uploads fail, `Bucket not found` | 12 |
| Images inside blog articles are broken | 13 |
| No Adsterra ads, only the "Remove ads" banner | 14 |

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

**Status:** fixed. After these commands, `demo-login` returned `200` for admin, manager and
employee.

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

**Result after the move:** all 10 jobs are active: `attendance-reminders`, `auto-absent-check`,
`auto-close-sessions`, `auto-expire-trials`, `daily-attendance-report`, `demo-reset`,
`notification-cleanup`, `push-checkin-reminder`, `review-cycle-transition`, `selfie-cleanup`.

`active` shows only that a job is switched on. To see whether its calls succeed, run this. Responses
are kept for only a few hours. Expect `200`. A `401` means that `CRON_SECRET` does not match. A
`status_code` of null, with an `error_msg`, means that the call did not reach the functions:

```sql
select status_code, timed_out, left(error_msg, 80) as error, count(*), max(created) as latest
from net._http_response group by 1, 2, 3 order by latest desc;
```

**Selfie cleanup and files not yet copied:** `selfie-cleanup` clears the selfie link on attendance rows
past the retention period (30 days by default), whether or not the file is on this server. If old
selfies are still on Cloud, a later copy brings the file back, but the row no longer links to it, and
the cleanup job no longer removes it. Those files then stay in storage unused. To keep the links until
the files are copied, pause the job, and turn it on again afterwards with `active := true`:

```sql
select cron.alter_job((select jobid from cron.job where jobname = 'selfie-cleanup'), active := false);
```

**`lifecycle-emails` is not in the list.** The `cron-lifecycle-emails` function exists, and migration 0031
says to schedule it by hand. `db-copy.sh` copies every job, so it was probably never scheduled on Cloud
either. Scheduling it starts emails to real users, so that is a decision for the owner.

## 12. Selfies blank and uploads fail: buckets missing

**Status:** fixed. After the SQL below, all six buckets exist, and a real check-in saved its selfie.

**Symptom:** check-in succeeds, but the session selfie shows blank. Uploads to the server return:

```json
{"statusCode":"404","error":"Bucket not found","message":"Bucket not found","code":"NoSuchBucket"}
```

The same failure applies to anything uploaded to the missing buckets: profile photos, organization
logos, donation screenshots and showcase logos.

**Cause:** `db-copy.sh` does not copy the storage tables, and that includes the list of buckets. Only
`storage-copy.mjs` created buckets, and it could not read Cloud because of the 402 (see 1). So only
`content-images` existed. Attendance is saved first and the selfie uploads afterwards in the
background, so the check-in looked fine and the employee saw no error.

**Fix:** run this in Studio's SQL Editor. It adds only the missing buckets and changes no files:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',              'avatars',              false, 5242880,  array['image/jpeg','image/png','image/webp','image/gif']),
  ('org-logos',            'org-logos',            true,  5242880,  array['image/jpeg','image/png','image/webp','image/gif']),
  ('selfies',              'selfies',              false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('content-images',       'content-images',       true,  10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('donation-screenshots', 'donation-screenshots', false, 5242880,  array['image/jpeg','image/png','image/webp','image/gif']),
  ('showcase-logos',       'showcase-logos',       true,  5242880,  array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

select id, public from storage.buckets order by id;
```

`db-copy.sh` now also copies the buckets, so a future run does not hit this.

**Check:**

```bash
curl -s -X POST -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>" -H "Content-Type: image/webp" \
  --data-binary "test" https://api.openhrapp.com/storage/v1/object/selfies/probe/none.webp
```

It must say `new row violates row-level security policy`, not `Bucket not found`. The refusal is correct:
the bucket exists, and it rejects uploads with no login. Do not test with the public URL
(`/object/public/selfies/...`). It says `Bucket not found` for private buckets even when they exist.
Then do a real check-in with a selfie.

**Selfies taken while the bucket was missing:** after three failed tries, the app keeps a selfie in that
device's browser and tries again when the attendance screen opens, for 7 days. They upload by themselves
if the employee opens the app on the same device within that time. After that, or if the browser's
storage is cleared, those selfies are lost.

**Files from Cloud are a separate step:** this fix makes new uploads work. Old files stay on Cloud
until the restriction is lifted and **Copy the files** is run (see 1).

## 13. Blog and guide images are broken

**Symptom:** covers and images inside blog articles do not load.

**Cause, in two parts:**

1. The files stayed on Cloud (see 1). The server had none of the 19 blog covers, the 43 images inside
   articles, or the 3 guide covers.
2. The images inside articles have the old Cloud address written into the article text. Copying or
   uploading the files alone does not fix them. Covers store only a path, so they follow the server
   address by themselves.

**Fix:** follow `Others/content-image-regeneration-guide.md`. It has the SQL that fixes the addresses, a
prompt for each image, and the upload steps. If the Cloud restriction is lifted, **Copy the files**
restores the originals instead, but the SQL is still needed.

## 14. No Adsterra ads

**Symptom:** the ad space shows only "Remove ads — OpenHRApp ad-free plan", or no real ad.

**Cause:** `ads-frame/index.html` runs on its own site (`ads.openhrapp.com`, Cloudflare Pages), and is
not part of the Vercel build. Changing the Vercel variables did not change it, so it kept reading its
settings from Cloud. Cloud answered 402, and the frame fell back to the house banner.

**Fix:** set `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the top of `ads-frame/index.html` to the
self-hosted values, then deploy it to Cloudflare Pages. If the project is not connected to Git: Workers
& Pages → the ads project → **Create deployment** → upload the `ads-frame` folder.

**Check:**

```bash
curl -s https://ads.openhrapp.com/ | grep "var SUPABASE_URL"
```

It must show `https://api.openhrapp.com`. Cloudflare may cache the page for up to 5 minutes.

**If you revert to Cloud:** change these two values back as well.

**Who sees ads:** every organization except `ACTIVE` (the paid ad-free plan) and the demo. Ad blockers
also hide them. Test with a non-`ACTIVE` organization, with no ad blocker. Adsterra does not fill every
ad space on every view.

---

## Still to do after the migration

- [ ] Stop the helper, and remove the `/db-migrate-runner/` block from Nginx Proxy Manager.
- [ ] Copy the files, if the restriction stopped them (see 1).
- [ ] Fix the image addresses in the blog articles, and restore or regenerate the images (see 13).
- [x] Check that the cron jobs are active (see 11).
- [ ] Check that the cron jobs' calls succeed (see 11).
- [ ] Decide whether to pause `selfie-cleanup` until the old files are copied (see 11).
- [ ] Decide whether `lifecycle-emails` should be scheduled (see 11).
- [ ] Turn off **Block Common Exploits** on the `api.openhrapp.com` proxy host. It can block normal
      database queries from the app.
- [ ] Close port 8100 to the internet. It answers from outside over plain HTTP. First point the proxy
      host at a private address instead of `150.136.150.227`, or the API stops working.
- [ ] Remove any custom domain for this site in Lemon Squeezy (see 3).
- [ ] Decide when to delete the backups in `/root/openhr-migration`. They contain password hashes.
- [ ] Keep the Cloud project until you are sure that you will not revert.
