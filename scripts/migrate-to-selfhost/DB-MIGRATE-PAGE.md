# How to use the db-migrate page

**https://openhrapp.com/db-migrate** moves the OpenHR database and files from Supabase
Cloud to the self-hosted server (https://api.openhrapp.com). It can also copy everything
back to Cloud.

The page does not do the work itself. A browser cannot connect to Postgres, so the page
sends commands to a small helper program on the OCI server. The helper runs `db-copy.sh`
and `storage-copy.mjs`.

---

## Before you start

You need:

- PuTTY access to the OCI server.
- Admin access to Nginx Proxy Manager.
- Access to the Supabase Cloud dashboard and to Vercel.
- A self-hosted server that works: you can log in to Studio at https://api.openhrapp.com
  (see `OCI-SETUP.md`).

Finish these steps in `MIGRATE-DATA.md` first:

| Step | What it does |
|---|---|
| A1 | Gets the OpenHR code on the server |
| A4 | Adds the OpenHR secrets to `.env` |
| A5 | Connects Resend (email) |
| A6 | Installs the Edge Functions |

The page runs the test copy without these, but it refuses to run the final switch until
`CRON_SECRET`, `RESEND_API_KEY` and the Edge Functions are in place. You do not need step
A2. The helper installs the Supabase CLI itself.

Also have these two values from the Supabase Cloud dashboard:

- **Database address:** click **Connect**, choose **Session pooler** (port **5432**), and
  copy the URI. Replace `[YOUR-PASSWORD]` with the database password.
- **service_role key:** **Project Settings → API Keys**.

---

## If Supabase has restricted the Cloud project

If the Cloud project goes over a plan limit, Supabase can block its APIs. Every request
then fails with `HTTP 402` and `exceed_storage_size_quota`. Logins, data and files all
stop working in the app. The files cannot be read through the API until the restriction is
lifted.

| Option | Result |
|---|---|
| **A. Lift the restriction first (recommended).** Upgrade the plan for the time of the move, or as the Supabase dashboard offers. Then follow the normal steps. | Everything moves in one go, including selfies, photos and logos. The plan cost is yours to decide. |
| **B. Move the database now, and the files later.** Works only if the **Pro database** line in step 2 shows `OK`. | The app is back quickly, but existing selfies, photos and logos are missing until you lift the restriction and copy the files. |

For option B:

1. The **Pro files** check shows `WARN`. This does not block the database copy.
2. Skip the test copy if the app is down, and go to step 4. Run the final copy. It finishes
   with failed files.
3. Type `ACCEPT` to continue, and switch Vercel.
4. After the restriction is lifted, click **Copy the files** in step 3. It copies only
   missing files and never overwrites a file on the self-hosted server.

---

## Step 1: Start the helper and connect

1. In PuTTY, run:

   ```bash
   cd ~/OpenHRApp && git pull
   python3 scripts/migrate-to-selfhost/migrate-runner.py
   ```

   It prints the next three items. Keep the window open until you copy them.

   If your prompt shows `root@`, use `cd /home/ubuntu/OpenHRApp && git pull`, and set
   `SUPABASE_PROJECT` first (see "No .env file" below).

2. **Run the `iptables` command that it prints.** This lets Nginx Proxy Manager reach the
   helper. Run it again if the server restarts.

3. **Add the block that it prints to Nginx Proxy Manager:**
   1. Open **Hosts → Proxy Hosts**, and edit `api.openhrapp.com`.
   2. Open the **Advanced** tab.
   3. Paste the block below anything already there, and save.

   ```nginx
   location /db-migrate-runner/ {
       proxy_pass http://<private-ip>:8787;
   }
   ```

   Copy the block from PuTTY, because it has your real private IP.

4. **Open https://openhrapp.com/db-migrate.** Paste the token from PuTTY, and click
   **Connect**.

Do not open port 8787 in Oracle Cloud. Do not share the token. Each start of the helper
makes a new token.

You can now close PuTTY. The helper and any running step continue. Reloading the page is
also safe: reconnect with the token, and enter the Cloud details again.

---

## Step 2: Enter the Cloud details and run the checks

1. Paste the database address and the service_role key. They are sent only to your server,
   and only in memory. Reloading the page clears them.
2. Click **Run the checks**.

| Result | Meaning |
|---|---|
| `OK` | Good. |
| `WARN` | Read it. It does not stop the test copy. |
| `FAIL` | Fix it and run the checks again. The copy buttons stay off until no line shows `FAIL`. |

---

## Step 3: Test copy (users are not affected)

The app stays on Cloud. Cron jobs on the self-hosted server stay paused, so nobody gets a
reminder twice. You can repeat this step as often as you like.

1. Click **Copy the database**. Wait until the log shows that it finished.
2. Click **Copy the files**. If it reports failures, click it again. It continues with the
   files that are still missing.
3. Optional, but recommended: test the copy with a Vercel preview. In Vercel, set
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for **Preview only**, with the values
   shown in step 4 of the page. Log in on the preview URL, and open attendance, leave and a
   selfie. Do not enter real data. The final copy replaces this copy.

If the self-hosted database already has data, the page asks you to type `REPLACE`. The
helper saves a backup in `~/openhr-migration` before it replaces anything.

---

## Step 4: Final switch

Pick a quiet time. **Anything users enter on Cloud after this copy starts does not move
across.**

1. Type `CUTOVER`, and click **Run the final copy**. It pauses Cloud's cron jobs, copies the
   newest data and files, and starts cron on the self-hosted server.
2. Read the result:

   | Result | What to do |
   |---|---|
   | **Final copy done** | Go to the next step. |
   | **Finished with differences** | Read the log. Small row differences are normal if users were active. Type `ACCEPT`, or run the final copy again. |
   | **Failed** | Cron is back on Cloud, and the app stays on Cloud. Send the log to Claude. |

3. Immediately switch Vercel. In **Project → Settings → Environment Variables**, set the
   two values shown on the page for **Production**. Then open **Deployments**, open the
   latest production deployment, and click **⋯ → Redeploy**. Keep
   `VITE_VAPID_PUBLIC_KEY`, `VITE_TURNSTILE_SITE_KEY` and `VITE_AD_FRAME_URL` unchanged.
4. When the deployment is **Ready**, test https://openhrapp.com:
   - Log in, check in and check out, and apply for leave.
   - Register a test organization, and check that the code email arrives.
   - In Resend → **Emails**, check that the emails are delivered.

After the final copy, the page refuses new database copies, so a wrong click cannot replace
live data.

---

## Step 5: Finish

1. Click **Stop the helper**. It also stops by itself after 6 idle hours.
2. Remove the `/db-migrate-runner/` block from Nginx Proxy Manager.
3. Keep the Cloud project. The revert below needs it.
4. When you are sure that you will not go back, delete the backups in `~/openhr-migration`.
   They contain password hashes.

---

## Going back to Supabase Cloud

Start the helper and connect again (step 1), and enter the Cloud details (step 2). Then open
step 5 on the page. There are two options.

### Option 1: Revert, with all data

Use this to keep everything entered since the switch.

Before you start:

- The **original Cloud project** must still exist. A new, empty project is not supported.
- If the project is paused, restore it in the Supabase dashboard.
- The project must not be restricted, and the data and files must fit its plan. If it is
  restricted, the revert stops and changes nothing.
- If you added a migration on the self-hosted server, apply it on Cloud too. Otherwise the
  revert stops and lists the missing columns.

Then:

1. Pick a quiet time. Anything users enter during the copy does not move across.
2. Type `REVERT`, and click **Copy back to Cloud**. It backs up Cloud's data on your server,
   replaces the data on Cloud in one transaction, copies the files, and compares row counts.
3. Read the result:

   | Result | What to do |
   |---|---|
   | **Copied back and verified** | Go to the next step. Cron now runs on Cloud. |
   | **Differences or failed files** | The self-hosted server is still live. Run it again at a quiet time, or type `ACCEPT`. |
   | **Failed** | Cloud kept its old data, and the app stays on the self-hosted server. Send the log to Claude. |

4. In Vercel, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for **Production** back to
   the Cloud values, and redeploy.

Files that were deleted on the self-hosted server stay on Cloud. The revert adds and updates
files, but it does not remove any.

### Option 2: Quick rollback, without data

Use this only right after the switch, if nobody has entered data worth keeping.

1. Set the two Vercel values back to Cloud, and redeploy.
2. Type `ROLLBACK`, and click **Roll back**. Cron starts on Cloud and pauses on the
   self-hosted server.

Data entered on the self-hosted server stays there. After a quick rollback, the page treats
Cloud as live again, so **Revert** stays off until the next final switch.

---

## If something goes wrong

| Problem | Fix |
|---|---|
| `Supabase project: No .env file in /root/supabase-project` | The helper is looking in the wrong folder. See "No .env file" below. |
| `cp: cannot stat '/root/OpenHRApp/...'` or `cd: OpenHRApp/: No such file or directory` | You are logged in as `root`, so `~` means `/root`. Use `/home/ubuntu/OpenHRApp` and `/home/ubuntu/supabase-project`. See "If you are logged in as `root`" in `MIGRATE-DATA.md`. |
| `cp: missing destination file operand` | The end of the command is missing. The `cp` line in step A6 must end with a space and a dot. |
| "Cannot reach the helper" | Check that the helper is running: `pgrep -af migrate-runner`. If not, start it again. A new start makes a new token. |
| Page shows a 502 message | Nginx cannot reach the helper. Run the `iptables` command again, and check the private IP in the Nginx block. If it still fails, use `172.17.0.1` in place of the private IP. |
| "Wrong token" | Use the token from the latest start of the helper. |
| `address already in use` when you start the helper | It is already running. To stop it, click **Stop the helper**, or run `pkill -f migrate-runner`. |
| `python3: command not found` | Run `sudo apt install -y python3`. |
| **Pro database** check fails | Check the password and that the address uses port 5432. Check in the Supabase dashboard that the project is not paused. |
| **Pro files** check shows `WARN` | The project is restricted. See "If Supabase has restricted the Cloud project" above. |
| "Locked: the final copy is done" | This is the protection against replacing live data. If you truly need a new copy from Cloud (for example, the switch was not done in Vercel), use Roll back first. |
| "The app is still on Supabase Cloud" when you revert | The final switch was not done with the page. If you did switch, run `touch ~/openhr-migration/CUTOVER_DONE` on the server, then try again. |

The full log is in `~/openhr-migration/runner.log`. Passwords and keys are hidden in it. If
a step fails, send the log to Claude.

### "No .env file" when you run the checks

The helper looks for `supabase-project` in the home folder of the user that started it. If
you run it as `root`, it looks in `/root/supabase-project`, but the project may be in another
folder, such as `/home/ubuntu/supabase-project`. Do not move the project. Tell the helper
where it is.

In PuTTY, go to the folder where you started the helper (usually `~/OpenHRApp`), then:

1. Stop the helper and find the Supabase folder:

   ```bash
   pkill -f migrate-runner
   export SUPABASE_PROJECT=$(docker inspect supabase-db --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}')
   echo "$SUPABASE_PROJECT"; ls -la "$SUPABASE_PROJECT/.env"
   ```

   This must print the folder path, then a line that shows the `.env` file. If you get an
   error, or `.env` is not listed, stop and send the output to Claude.

2. Start the helper again, in the same PuTTY window:

   ```bash
   python3 scripts/migrate-to-selfhost/migrate-runner.py
   ```

3. The restart makes a new token. Reload https://openhrapp.com/db-migrate, paste the new token,
   and click **Connect**. Enter the Cloud details again, then click **Run the checks**.

You do not need to change the Nginx block or run the `iptables` command again, unless the IP
in the newly printed block has changed.

`SUPABASE_PROJECT` lasts only for that PuTTY session, so run the `export` line again whenever
you start the helper from a new window. Always start the helper as the same user: its backups,
log and lock file are in that user's home folder (for `root`, `/root/openhr-migration`).

---

## What the helper changes on the server

| Item | Location | Remove with |
|---|---|---|
| Supabase CLI | `~/.local/bin/supabase` | `rm ~/.local/bin/supabase` |
| Dumps, backups, log | `~/openhr-migration` | `rm -rf ~/openhr-migration` (also removes the lock) |
| File copy tool | `~/openhr-storage` | `sudo rm -rf ~/openhr-storage` |
| `iptables` rule for port 8787 | Memory only | A server restart removes it |
| Nginx block | Proxy host, Advanced tab | Delete it there |
