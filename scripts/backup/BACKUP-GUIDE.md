# Backup and recovery

How to back up the self-hosted Supabase server and restore it after an incident.

No passwords or keys belong in this file.

**Status:** written on 2026-11-09. The script and the restore steps have not been run yet. Do the
restore test below before you rely on them.

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

Use storage outside OCI, such as Cloudflare R2.

1. Create a bucket, and an API token limited to that bucket.
2. Install rclone: `curl https://rclone.org/install.sh | sudo bash`
3. Run `rclone config`, and create two remotes:
   - An S3 remote with provider Cloudflare, named `r2`.
   - A **crypt** remote named `openhr-backup`, pointing at `r2:<bucket>`.
4. Store the crypt passwords and a copy of `/root/.config/rclone/rclone.conf` in a password manager.

**Without the crypt passwords, the backups cannot be read.** They must not exist only on the server.

### 4. Run it once

```bash
cd /home/ubuntu/OpenHRApp && git pull
bash scripts/backup/openhr-backup.sh
rclone ls openhr-backup:
```

Three files must appear under today's date.

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
