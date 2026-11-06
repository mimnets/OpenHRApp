# Move OpenHR from Supabase Pro to the self-hosted server

Do this after `OCI-SETUP.md` works (you can log in to Studio at https://api.openhrapp.com).

There are three parts:

- **Part A, setup (once):** code, secrets, email (Resend) and Edge Functions on the server.
- **Part B, rehearsal:** copy everything, test, and change nothing for real users.
  Repeat it as often as you like.
- **Part C, cutover:** the real switch. It takes about 15 minutes.

Users stay logged in after the switch. The app keeps its saved login and refreshes it
against the new server.

## The web page (easier than Parts B and C)

**https://openhrapp.com/db-migrate** does Parts B and C from the browser, and can also copy
everything back to Supabase Cloud. Step-by-step instructions are in **`DB-MIGRATE-PAGE.md`**.
Do steps A1, A4, A5 and A6 first. The page installs the Supabase CLI itself (A2), and asks
for the address from A3.

In PuTTY:

```bash
cd ~/OpenHRApp && git pull
python3 scripts/migrate-to-selfhost/migrate-runner.py
```

It prints one `iptables` command, one block for the **Advanced** tab of the
`api.openhrapp.com` proxy host in Nginx Proxy Manager, and a token. Do the first two, then
paste the token in the page.

When you finish, click **Stop the helper**, then remove the block from Nginx Proxy Manager.

The helper runs only fixed actions, and only accepts requests with the token. Backups and
dumps are in `~/openhr-migration`. They contain password hashes, so delete them when you no
longer need them.

---

## Part A: Setup (once)

### A1. Get the OpenHR code on the server (PuTTY)

```bash
cd ~
git clone https://github.com/mimnets/OpenHRApp.git
```

To update it later: `cd ~/OpenHRApp && git pull`.

### A2. Install the Supabase CLI

The script uses it to export the database from Pro.

```bash
ARCH=$(dpkg --print-architecture)
curl -fsSL -o /tmp/supabase.tar.gz https://github.com/supabase/cli/releases/latest/download/supabase_linux_${ARCH}.tar.gz
sudo tar -xzf /tmp/supabase.tar.gz -C /usr/local/bin supabase
supabase --version
```

### A3. Get the Pro database address

1. In the Pro dashboard, click **Connect** (top of the project page).
2. Choose **Session pooler**. The port must be **5432**, not 6543.
3. Copy the URI. It looks like this:
   `postgresql://postgres.cixryuwtlwbofabctrkk:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres`
4. Replace `[YOUR-PASSWORD]` with the Pro database password. If you lost it, reset it in
   **Project Settings → Database**.

Keep this address private. It gives full access to the Pro database.

### A4. Add the OpenHR secrets to the server's `.env`

Supabase does not show the values of saved Edge Function secrets, so take each value
from where it came from (your password manager, the local `.env.cloud` file on your PC,
or the service's own dashboard).

```bash
cd ~/supabase-project
nano .env
```

Add these lines at the end:

```
# ---- OpenHR ----
APP_URL=https://openhrapp.com
CRON_SECRET=<new random value, see below>
RESEND_API_KEY=<Resend API key>
VAPID_PUBLIC_KEY=<the SAME public key as Pro>
VAPID_PRIVATE_KEY=<the SAME private key as Pro>
VAPID_SUBJECT=<the same as Pro, e.g. mailto:admin@openhrapp.com>
TURNSTILE_SECRET_KEY=<Cloudflare Turnstile secret key>
TURNSTILE_ALLOWED_HOSTNAMES=<the same as Pro>
ANTHROPIC_API_KEY=<the same as Pro>
DEMO_USER_PASSWORD=<the same as Pro>
OUTREACH_FROM_EMAIL=<the same as Pro>
OUTREACH_POSTAL_ADDRESS=<the same as Pro>
OUTREACH_REPLY_TO=<the same as Pro>
```

- **CRON_SECRET:** make a new one with `openssl rand -hex 32` and paste it. Use letters
  and digits only.
- **VAPID keys must be the same as on Pro.** The app in the browser has the public key
  built in (`VITE_VAPID_PUBLIC_KEY` on Vercel). New keys would stop every push
  notification.
- **Check that the keys are not Supabase's public demo keys.** This must print `0`. If it
  prints `1` or more, stop and run `sh utils/generate-keys.sh` again:

  ```bash
  grep -c "supabase-demo\|dc_X5iR_VP_qT0zsiyj\|DaYlNEoUrrEn2Ig7" .env
  ```

- In the same file, check that `FUNCTIONS_VERIFY_JWT=false`. The cron jobs and the email
  unsubscribe link call functions without a login.

### A5. Connect Resend (email)

Resend sends two kinds of email:

| Email | Sent by | Setting |
|---|---|---|
| Sign-up codes, password reset, email change | Supabase Auth, through Resend's SMTP | `SMTP_*` in `.env` |
| Leave, attendance, reminders, reports, outreach | Edge Functions, through Resend's API | `RESEND_API_KEY` (A4) |

1. In the Resend dashboard, open **Domains** and check that `openhrapp.com` shows
   **Verified**. It is already verified if Pro sends email through Resend now.
2. In `.env`, set the SMTP lines like this:

   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_USER=resend
   SMTP_PASS=<Resend API key, the same as RESEND_API_KEY>
   SMTP_ADMIN_EMAIL=noreply@openhrapp.com
   SMTP_SENDER_NAME=OpenHRApp
   ```

   `SMTP_USER` is the word `resend`, not your email. `SMTP_ADMIN_EMAIL` is the sender
   address, and it must use the verified domain. Use the same sender as Pro
   (Pro dashboard → **Authentication → Emails → SMTP Settings**).
3. Also in `.env`, check: `ENABLE_EMAIL_SIGNUP=true` and `ENABLE_EMAIL_AUTOCONFIRM=false`.

Save `.env` (**Ctrl+O**, **Enter**, **Ctrl+X**).

### A6. Install the OpenHR Edge Functions

```bash
cd ~/supabase-project
for d in ~/OpenHRApp/supabase/functions/*/; do
  [ "$(basename "$d")" = main ] || cp -r "$d" volumes/functions/
done
cp ~/OpenHRApp/scripts/migrate-to-selfhost/docker-compose.openhr.yml .
sh run.sh config add docker-compose.openhr.yml
sh run.sh start
```

This keeps Supabase's own `main` router and adds our 28 functions plus the `_shared`
folder. `docker-compose.openhr.yml` passes the A4 secrets to the functions, and sets
email codes to 8 digits, as on Pro.

Test:

```bash
curl -s https://api.openhrapp.com/functions/v1/public-ad-config
```

It must return JSON, not `NOT_FOUND` or `BOOT_ERROR`.

When the code changes later: `cd ~/OpenHRApp && git pull`, run the `for` loop again, then
`docker restart supabase-edge-functions`.

---

## Part B: Rehearsal (no effect on users)

### B1. Copy the database

```bash
cd ~/supabase-project
export SRC_DB_URL='<the Pro address from A3>'
bash ~/OpenHRApp/scripts/migrate-to-selfhost/db-copy.sh full
```

The script:

1. Checks the versions and the columns. If something does not match, it stops before it
   changes anything.
2. Exports roles, schema and data from Pro with the Supabase CLI (Supabase's official
   method).
3. Also copies what that method leaves out: our triggers on users, our file-access rules,
   and the cron jobs. The cron jobs stay **paused** in a rehearsal.
4. Restores everything in one transaction. If any step fails, nothing is kept.
5. Compares the row count of every table, the number of security rules, and the number of
   cron jobs with Pro.

The run must end with `DONE. All ... tables, policies and cron jobs match Pro.` If it
shows differences or an error, send the output to Claude.

`full` works only on an empty database. To copy again later, use `data` (Part C).

### B2. Copy the files (selfies, photos, logos)

Copy the Pro **service_role** key first: Pro dashboard → **Project Settings → API Keys**
(the legacy `service_role` key). The self-hosted key is in `.env`:
`grep ^SERVICE_ROLE_KEY= ~/supabase-project/.env`.

```bash
mkdir -p ~/openhr-storage && cp ~/OpenHRApp/scripts/migrate-to-selfhost/storage-copy.mjs ~/openhr-storage/
docker run --rm -it --network host -v ~/openhr-storage:/w -w /w \
  -e SRC_URL=https://cixryuwtlwbofabctrkk.supabase.co \
  -e SRC_SERVICE_KEY='<Pro service_role key>' \
  -e DST_URL=http://localhost:8100 \
  -e DST_SERVICE_KEY='<self-hosted SERVICE_ROLE_KEY>' \
  node:20 sh -c "npm i --silent @supabase/supabase-js@2 && node storage-copy.mjs"
```

It prints each bucket, then `All buckets copied.` If it reports failures, run it again.
It copies only the files that are missing, so a second run is fast.

### B3. Test with a Vercel preview

1. In Vercel, go to **Project → Settings → Environment Variables**. Add these two for
   **Preview** only (not Production):
   - `VITE_SUPABASE_URL` = `https://api.openhrapp.com`
   - `VITE_SUPABASE_ANON_KEY` = the self-hosted key, from
     `grep ^ANON_KEY= ~/supabase-project/.env`
2. Push any branch, or redeploy a preview, and open its URL.
3. On the server, add the preview address to `.env` so logins can return to it. Use the
   exact preview URL from Vercel, for example:
   `ADDITIONAL_REDIRECT_URLS=https://openhrapp.com/**,https://www.openhrapp.com/**,https://openhr-app-git-test-yourteam.vercel.app/**`,
   then run `sh run.sh start`. Do not use `https://*.vercel.app/**`, because then anyone's
   Vercel site could receive login links. Remove the preview URL again after cutover.
4. Test: log in as an admin and as an employee, open attendance and leave, and view a
   selfie and a profile photo. Do not create real leave requests. This copy is thrown
   away at cutover.

---

## Part C: Cutover (about 15 minutes)

Pick a quiet time, for example late evening.

1. **Pause Pro's cron jobs**, so reminders are not sent twice. In the Pro dashboard, open
   **SQL Editor** and run:

   ```sql
   select cron.alter_job(jobid, active := false) from cron.job;
   ```

2. **Copy the database again** with active cron jobs:

   ```bash
   cd ~/supabase-project
   export SRC_DB_URL='<the Pro address from A3>'
   ENABLE_CRON=yes bash ~/OpenHRApp/scripts/migrate-to-selfhost/db-copy.sh data
   ```

   It must end with `DONE`.
3. **Copy new files:** run the B2 command again.
4. **Switch Vercel:** in **Settings → Environment Variables**, set the same two variables
   as in B3 for **Production**. Then go to **Deployments**, open the latest production
   deployment, click **⋯ → Redeploy**, and wait until it is **Ready**. Keep
   `VITE_VAPID_PUBLIC_KEY`, `VITE_TURNSTILE_SITE_KEY` and `VITE_AD_FRAME_URL` unchanged.
5. **Smoke test** on https://openhrapp.com: log in, check in and out, apply for leave,
   and register a test organization (this checks the Resend email code). In Resend →
   **Emails**, the sent emails must show as delivered.
6. **Keep Pro** for 2 to 4 weeks as a fallback. Do not delete it.

### Rollback (if something is badly wrong)

1. In Vercel, set the two Production variables back to the Pro values, then redeploy.
2. In Pro's SQL Editor, run:
   `select cron.alter_job(jobid, active := true) from cron.job;`
3. Pause the self-hosted cron jobs: open Studio (https://api.openhrapp.com) → **SQL Editor**,
   and run `select cron.alter_job(jobid, active := false) from cron.job;`

This does not copy data entered on the new server back to Pro. To keep that data, use the
revert below instead.

### Revert to Supabase Cloud, with the data

Use **Revert** in step 5 of https://openhrapp.com/db-migrate. It:

1. Checks that the Cloud project is reachable, has the OpenHR tables, and has every
   self-hosted column. If not, it stops and changes nothing.
2. Pauses the self-hosted cron jobs, and saves a backup of Cloud's data in `~/openhr-migration`.
3. Replaces the `public` and `auth` data on Cloud in one transaction. If any error occurs,
   Cloud keeps its old data, and the self-hosted cron jobs start again.
4. Copies the files to Cloud, and compares the row counts.
5. Turns on the cron jobs on Cloud. You then set the two Vercel variables back to the Cloud
   values, and redeploy.

Limits:

- It works only after the final switch, because before it the live data is on Cloud. If
  you switched with the scripts instead of the page, run `touch ~/openhr-migration/CUTOVER_DONE` first.
- It needs the original Cloud project. **Do not delete that project.** If it is paused,
  restore it in the Supabase dashboard first. A new, empty project is not supported.
- The data and files must fit the limits of the project's current Cloud plan.
- If you add a migration on the self-hosted server, apply it on Cloud too, or the revert
  stops at step 1 and lists the missing columns.

---

## Optional: custom email templates

If the Pro project uses custom email templates (**Authentication → Emails → Templates**),
the self-hosted server needs them as files on a URL. Ask Claude to set this up. Without
it, sign-up codes still arrive, in Supabase's default design.
