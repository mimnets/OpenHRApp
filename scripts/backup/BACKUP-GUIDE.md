# Backup and recovery

How to back up the self-hosted Supabase server and restore it after an incident.

No passwords or keys belong in this file.

**Status on 2026-11-09:**

| Item | Status |
|---|---|
| Off-site storage (R2 bucket `openhr-backups`, encrypted) | Working |
| Backup script | Ran by hand: exit code 0, three files in R2 |
| Backup contents | Checked: 33 public tables, `auth.users`, `cron.job`, 63 stored files, `.env` |
| Nightly schedule | Set by the owner. The first scheduled run has not been checked yet |
| Alert (healthchecks.io) | Not confirmed by a scheduled run yet |
| OCI boot volume backup | Not confirmed |
| Restore | **Not tested.** Do the restore test below before you rely on these backups |

| Item | Value |
|---|---|
| Server | OCI, `150.136.150.227`, logged in as `root` |
| Folders | `/home/ubuntu/OpenHRApp`, `/home/ubuntu/supabase-project` |
| Script | `scripts/backup/openhr-backup.sh` |
| Local copies | `/home/ubuntu/openhr-backups`, kept for about 3 days |
| Off-site copies | rclone remote `openhr-backup:`, kept for 30 days |

## Why Supabase does not do this for us

Self-hosted Supabase has no backup schedule or backup page. The backups in the Cloud dashboard are part of
the hosted service. The Cloud project also stopped receiving data at the move, so it is not a backup of
current data.

`supabase db dump` and `pg_dump` can copy the database, but they do not copy uploaded files or `.env`. The
script uses `pg_dumpall`, which also includes roles and all schemas.

CSV exports in the app are for reports. They cannot restore the system.

## What is protected

| Layer | Protects against | Contains |
|---|---|---|
| OCI boot volume backup | VM failure, or a bad change that breaks the server | The whole server, including Nginx Proxy Manager, n8n and qdrant |
| Nightly script | Loss of the OCI account or region, or deleted data | `db.sql.gz`, `storage.tar.gz`, `config.tar.gz` (includes `.env`) |
| GitHub | Loss of the code | The app, migrations and Edge Functions |

Recreate these by hand after a move to a new server: the DNS records, the Nginx Proxy Manager host
(`api.openhrapp.com` to port 8100), and the Vercel variables if the API address or keys change.

## Setup

### 1. Check the server

```bash
docker inspect supabase-storage --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
du -sh /home/ubuntu/supabase-project/volumes/*
df -h /
date
```

The script expects files in `volumes/storage`. If they are somewhere else, change the script first. The
schedule below assumes that the server clock is on UTC.

### 2. Turn on OCI backups

1. In the OCI Console, go to **Compute → Boot Volumes → the VM's volume → Boot Volume Backups**, and create
   one now.
2. Under **Block Storage → Backup Policies**, create a custom daily policy that keeps about 3 copies, and
   assign it to the volume.
3. Check the cost. Always Free includes a limited number of backups.

These backups are taken while the server runs. Postgres recovers from them as it does after a power cut.

### 3. Set up encrypted off-site storage

This step uses Cloudflare R2, which is outside OCI. You do not need the `rclone config` menus. The commands
below create the same settings. Never share the keys, the passwords or `rclone.conf`, or a screenshot that
shows them.

**a. In Cloudflare.** Button names may differ slightly.

1. Open **R2 Object Storage**. Cloudflare may ask for a payment card, even for the free tier.
2. Click **Create bucket**, and name it exactly `openhr-backups`. Keep the default settings. Do not choose a
   jurisdiction such as EU, because it needs a different endpoint.
3. Open **Manage API Tokens**, then **Create API Token**.
4. Set the permission to **Object Read & Write**, and limit the token to the `openhr-backups` bucket.
5. Create the token, and keep the page open. It shows these values only once: **Access Key ID**,
   **Secret Access Key** and **Endpoint**.

**b. Install rclone, and connect it to R2.** Run this as `root`. The endpoint must end at `.com`, in the form
`https://<id>.r2.cloudflarestorage.com`. Do not add `/openhr-backups`.

```bash
curl https://rclone.org/install.sh | sudo bash

read -r -p "Access Key ID: " R2_KEY
read -r -p "Secret Access Key: " R2_SECRET
read -r -p "Endpoint: " R2_ENDPOINT

rclone config create r2 s3 provider=Cloudflare \
  access_key_id="$R2_KEY" secret_access_key="$R2_SECRET" \
  endpoint="$R2_ENDPOINT" region=auto acl=private no_check_bucket=true > /dev/null

rclone ls r2:openhr-backups && echo "R2 CONNECTED"
```

`R2 CONNECTED` must appear. If you see `403` or `AccessDenied`, see **If R2 says Access Denied** below, and do
not continue yet.

**c. Add the encryption.**

```bash
P1=$(openssl rand -hex 32)
P2=$(openssl rand -hex 32)

rclone config create openhr-backup crypt \
  remote=r2:openhr-backups password="$P1" password2="$P2" --obscure > /dev/null

echo "Password 1: $P1"
echo "Password 2: $P2"
```

Both lines must show a long value. If one is empty, a line was lost when it was pasted: run
`rclone config delete openhr-backup`, and paste the block again.

Store both passwords in a password manager now. **Without them, the backups cannot be read.** Once a backup
exists, do not run this again. A new run makes new passwords, and older backups still need the old ones.

**d. Test it.**

```bash
echo "backup test" > /tmp/rclone-test.txt
rclone copy /tmp/rclone-test.txt openhr-backup:test
echo "--- Readable through the encrypted connection:"
rclone ls openhr-backup:
echo "--- What Cloudflare actually stores:"
rclone ls r2:openhr-backups
rclone purge openhr-backup:test
rm /tmp/rclone-test.txt
```

The first list must show `test/rclone-test.txt`. The second must show scrambled names.

**e. Save the settings.** Copy the output of this command into the same password manager entry. A new server
needs it to read the backups:

```bash
cat /root/.config/rclone/rclone.conf
```

#### If R2 says Access Denied

`AccessDenied` on `ListObjectsV2` usually means that the token is not allowed to use that bucket, or that the
address is wrong. Check these in order:

1. **Endpoint:** it must not end in `/openhr-backups`. To check it, and to correct it:

   ```bash
   rclone config show r2 | grep endpoint
   rclone config update r2 endpoint=https://<id>.r2.cloudflarestorage.com
   ```

2. **Bucket name:** it must be exactly `openhr-backups` in Cloudflare, including the final `s`.
3. **Token:** it must have **Object Read & Write**, and list the `openhr-backups` bucket. If not, create a new
   token, because the secret cannot be shown again, and enter the new keys:

   ```bash
   read -r -p "Access Key ID: " R2_KEY
   read -r -p "Secret Access Key: " R2_SECRET
   rclone config update r2 access_key_id="$R2_KEY" secret_access_key="$R2_SECRET"
   ```

4. **Jurisdiction:** if the bucket was created with one such as EU, delete it and create it again without one.

Then test again:

```bash
rclone ls r2:openhr-backups && echo "R2 CONNECTED"
```

#### Other rclone messages

| You see | Meaning | What to do |
|---|---|---|
| `Failed to read versioning status, assuming unversioned` with `GetBucketVersioning` and `AccessDenied` | The token cannot read this bucket setting. rclone carries on | Nothing. Do not give the token more access |
| `didn't find section in config file ("openhr-backup")` | The encrypted connection does not exist, or you are not logged in as `root` | Run `whoami` and `rclone listremotes`. If it shows only `r2:`, do step c |

`openhr-backup:` is the encrypted connection in rclone. `openhr-backups` is the bucket in Cloudflare. Use
`r2:openhr-backups` to see the scrambled files, and `openhr-backup:` to see the real names.

### 4. Run it once

```bash
cd /home/ubuntu/OpenHRApp && git pull
bash scripts/backup/openhr-backup.sh
rclone ls openhr-backup:
```

Three files must appear under today's date. Then check what is inside them. The output contains only names and
counts:

```bash
cd /home/ubuntu/openhr-backups/$(date -u +%F)
echo "Public tables in dump: $(zcat db.sql.gz | grep -c '^COPY public\.')"
echo "Login table in dump: $(zcat db.sql.gz | grep -c '^COPY auth.users')"
echo "Cron jobs table in dump: $(zcat db.sql.gz | grep -c '^COPY cron.job ')"
echo "Stored files: $(tar -tzf storage.tar.gz | grep -vc '/$')"
tar -tzf config.tar.gz | grep -E '/\.env$|/docker-compose\.openhr\.yml$'
```

On 2026-11-09 this showed 33 public tables, 1 login table, 1 cron table and 63 stored files, and listed both
config files. A much lower number later means that something is wrong.

### 5. Schedule it

Create a check at [healthchecks.io](https://healthchecks.io) with a daily period. It sends an alert when a
backup does not report in.

Add this line with `crontab -e`. Replace the URL with the one for your check. On a UTC clock, it runs at 03:00 in
Dhaka:

```
0 21 * * * PING_URL=https://hc-ping.com/<id> bash /home/ubuntu/OpenHRApp/scripts/backup/openhr-backup.sh >> /var/log/openhr-backup.log 2>&1
```

## Recovery

### The VM failed or is broken

Create a new instance from the latest boot volume backup. If its public IP address changed, update the DNS
records and the Nginx Proxy Manager host. Then run the checks below.

### OCI is lost

1. Create a VM with Docker and rclone, and restore `rclone.conf` from the password manager.
2. Download the backup:

   ```bash
   rclone lsd openhr-backup:
   rclone copy openhr-backup:<date> /home/ubuntu/restore
   ```

3. Restore the config and files:

   ```bash
   tar -C /home/ubuntu -xzf /home/ubuntu/restore/config.tar.gz
   cd /home/ubuntu/supabase-project
   mkdir -p volumes
   tar --xattrs --xattrs-include='*' -C volumes -xzf /home/ubuntu/restore/storage.tar.gz
   ```

4. Start only the database: `docker compose up -d db`. The restored compose files keep the same image versions.
5. Restore the dump. Some `already exists` and `cannot drop` messages about roles are normal:

   ```bash
   export PGPASSWORD=$(grep '^POSTGRES_PASSWORD=' .env | tail -1 | cut -d= -f2-)
   gunzip -c /home/ubuntu/restore/db.sql.gz | docker exec -i -e PGPASSWORD supabase-db \
     psql -h 127.0.0.1 -U supabase_admin -d postgres
   ```

6. Start everything: `sh run.sh start`
7. Set up Nginx Proxy Manager for `api.openhrapp.com`, and point DNS at the new server.

### Checks after any restore

- Log in to the app, and open a selfie and an organization logo.
- In Studio's SQL Editor, run `select jobname, active from cron.job;`. Every job must be active. See section 11
  of `scripts/migrate-to-selfhost/MIGRATION-LOG.md`.
- Compare the employee and attendance row counts with what you expect.

## Restore test

Do the **OCI is lost** steps on a temporary VM now, then every few months. Skip the DNS step, and test the
stack directly on the temporary VM.

**The restored cron jobs can call the live API and affect real users.** They are in the dump with their
addresses and `CRON_SECRET`. So, on the temporary VM only:

1. Before step 5, remove `RESEND_API_KEY` and `SMTP_PASS` from its `.env`.
2. Immediately after step 5, switch off every job:

   ```bash
   docker exec -e PGPASSWORD supabase-db psql -h 127.0.0.1 -U supabase_admin -d postgres \
     -c "select cron.alter_job(jobid, active := false) from cron.job;"
   ```

For this test, the check that every job is active does not apply. Check that the jobs are listed.

Delete the VM and the restored files afterwards. They contain real employee data.

## Known gaps

- **Up to 24 hours of data can be lost**, because the off-site copy runs once a night.
- **Files still on the Cloud project are not included**, because they are not on this server. See section 1 of
  `scripts/migrate-to-selfhost/MIGRATION-LOG.md`.
- **Other containers** (n8n, qdrant and the rest) are only in the OCI boot volume backup.
- **Supabase Vault's encryption key is not included.** The migrations do not use Vault. If that changes, add the key
  to the script.
- **Disk and storage space:** three days of local copies and 30 days of off-site copies. Check the size after the
  first run, and lower `KEEP_DAYS` if needed.
