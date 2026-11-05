# Install self-hosted Supabase on the OCI server

Server: **150.136.150.227** (Oracle Cloud). API domain: **api.openhrapp.com**.
These steps follow Supabase's official guide for release `self-hosted/v0.8.3`
(Postgres 17, Auth v2.197), checked on 2026-11-05.
Run the commands in PuTTY. In PuTTY, **right-click pastes**.

## Why the API needs a domain

The app runs on HTTPS (Vercel). Browsers block an HTTPS page from calling a plain
`http://150.136.150.227:8000` address. Logins, the service worker and push notifications
also need HTTPS. You can get a free HTTPS certificate only for a domain name, not for a
bare IP. So the API gets a subdomain (`api.openhrapp.com`). The server's existing
Nginx Proxy Manager sits in front of Supabase, and gets and renews the Let's Encrypt
certificate automatically.

---

## Step 0: Check the server (in PuTTY)

```bash
cat /etc/os-release | head -2; uname -m; nproc; free -h; df -h /
```

You need:
- At least 4 GB RAM (8 GB recommended)
- At least 2 CPUs
- At least 40 GB disk

`aarch64` (Ampere) and `x86_64` both work. These steps are for **Ubuntu**. If the first
line says Oracle Linux, stop and ask for the matching commands.

## Step 1: Open ports 80 and 443 in Oracle Cloud (web console)

1. Go to **Networking → Virtual Cloud Networks →** your VCN **→ Subnets →** your subnet
   **→ Security Lists → Default Security List → Add Ingress Rules**.
2. Add two rules:
   - Source CIDR `0.0.0.0/0`, IP protocol TCP, destination port `80`
   - Source CIDR `0.0.0.0/0`, IP protocol TCP, destination port `443`
3. **Do not open** ports 8000, 5432 or 6543. The database and the gateway stay private.
   Nginx Proxy Manager is the only public entry point. (If NPM already works for other
   sites, ports 80 and 443 are probably open already.)

Then, in PuTTY (Oracle's Ubuntu images also have their own firewall rules):

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## Step 2: Point the domain at the server

Wherever the DNS for `openhrapp.com` is managed (Vercel, Cloudflare or your registrar),
add this record:

| Type | Name | Value |
|---|---|---|
| A | `api` | `150.136.150.227` |

If you use Cloudflare, set the record to **DNS only** (grey cloud), so Nginx Proxy Manager
can get the certificate.

Check it from your PC (Command Prompt):

```
nslookup api.openhrapp.com
```

It must return `150.136.150.227` before you start Step 6.

## Step 3: Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
```

Connect again with PuTTY, then check that Docker works:

```bash
docker compose version
```

## Step 4: Download Supabase (latest self-hosted release)

```bash
cd ~
git clone --depth 1 --branch self-hosted/v0.8.3 https://github.com/supabase/supabase
mkdir supabase-project
cp -rf supabase/docker/. supabase-project
cd supabase-project && cp .env.example .env
printf 'ref=self-hosted/v0.8.3\n' > .supabase-version
docker compose pull
```

## Step 5: Generate keys and configure `.env`

Do all of this **before the first start**. You cannot easily change the database password
after the first start.

```bash
sh utils/generate-keys.sh
sh utils/add-new-auth-keys.sh
nano .env
```

In `.env`, set these values:

```
POSTGRES_PASSWORD=<long random password, letters and digits only>
DASHBOARD_USERNAME=<your admin name>
DASHBOARD_PASSWORD=<strong password; this protects Studio on the internet>
PROXY_DOMAIN=api.openhrapp.com
SUPABASE_PUBLIC_URL=https://api.openhrapp.com
API_EXTERNAL_URL=https://api.openhrapp.com/auth/v1
SITE_URL=https://openhrapp.com
ADDITIONAL_REDIRECT_URLS=https://openhrapp.com/**,https://www.openhrapp.com/**
```

Also set the SMTP values. Use the same values as the Pro project
(Pro Dashboard → Authentication → SMTP):

```
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_ADMIN_EMAIL=
SMTP_SENDER_NAME=
```

To save in nano: **Ctrl+O**, then **Enter**, then **Ctrl+X**.

Check that no example passwords are left. The `.env.example` file that `.env` was
copied from contains example values such as `your-super-secret-...` and
`this_password_is_insecure...`. Anyone can read these on GitHub, so none of them may stay.
This command searches `.env` for those example values:

```bash
grep -nE "your-super-secret|this_password_is_insecure|your-tenant-id" .env
```

- **It prints nothing:** good. Every secret has a real value. Go on.
- **It prints lines**, for example `42:DASHBOARD_PASSWORD=this_password_is_insecure_and_should_be_updated`:
  the number at the start is the line number in `.env`. Open `.env` again with `nano .env`,
  replace those values with your own strong values, save, and run the command again
  until it prints nothing.

**Keep a copy of `.env` in a safe place** (for example, a password manager). It contains
all the keys.

## Step 6: Start Supabase

The server already runs **Nginx Proxy Manager (NPM)** on ports 80 and 443, so NPM gives
the API its HTTPS certificate. Do **not** use the Caddy option. Caddy needs the same
ports, so the two cannot run together.

If you already ran `sh run.sh config add caddy`, undo it first:

```bash
cd ~/supabase-project
sh run.sh config remove caddy
docker rm -f supabase-caddy 2>/dev/null
```

Start Supabase:

```bash
cd ~/supabase-project
sh run.sh start
docker compose ps
```

All services must show `healthy`. The first start can take a few minutes. The `PROXY_DOMAIN`
line in `.env` is for Caddy only. It is not used now, and you can leave it.

Supabase now listens on port **8000** on the server. Port 8000 stays **closed** in the
Oracle Cloud security list. Only NPM reaches it, from inside the server.

Find the server's private IP address, which NPM uses to reach Supabase:

```bash
hostname -I | awk '{print $1}'
```

It looks like `10.0.0.123`. Write it down.

Check that Supabase answers on that address (use your IP):

```bash
curl -s http://10.0.0.123:8000/auth/v1/health
```

It must return JSON. If it does not, check `docker compose ps` again.

## Step 7: Add the API domain in Nginx Proxy Manager

Open the NPM admin page (usually `http://150.136.150.227:81`, or the address you normally
use). Go to **Hosts → Proxy Hosts → Add Proxy Host**.

**Details tab:**

| Field | Value |
|---|---|
| Domain Names | `api.openhrapp.com` |
| Scheme | `http` |
| Forward Hostname / IP | the private IP from Step 6, for example `10.0.0.123` |
| Forward Port | `8000` |
| Cache Assets | **off** |
| Block Common Exploits | **off** (it can block normal database queries from the app) |
| Websockets Support | **on** (required for live updates, called Realtime) |

**SSL tab:**

| Field | Value |
|---|---|
| SSL Certificate | Request a new SSL Certificate (Let's Encrypt) |
| Force SSL | on |
| HTTP/2 Support | on |
| Email / Agree to terms | your email, tick the box |

Click **Save**. NPM gets the certificate. This takes up to a minute.

## Step 8: Check that it works

1. On your PC, open **https://api.openhrapp.com**. A login prompt must appear. This is
   Studio. Log in with `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD`.
2. In PuTTY:

   ```bash
   curl -s https://api.openhrapp.com/auth/v1/health
   ```

   It must return JSON that contains a version number.

If something fails:

| Problem | Cause and fix |
|---|---|
| NPM cannot get the certificate | DNS does not point at the server yet (Step 2), or port 80 is closed (Step 1). |
| `502 Bad Gateway` | NPM cannot reach Supabase. Check the private IP and port 8000 in the proxy host, and check that `curl http://<private-ip>:8000/auth/v1/health` works (Step 6). If NPM still cannot reach it, use `172.17.0.1` as the Forward Hostname. |
| File uploads fail with `413` | In the proxy host, open the **Advanced** tab, add `client_max_body_size 50m;`, and save. |

---

## After Step 8: the migration (done with Claude)

When Steps 0 to 8 work, tell Claude, and send the output of Step 0. The server size and
CPU type decide some settings. The remaining work:

1. Change `db-copy.sh` to Supabase's official dump-and-restore method. This copies Pro's
   real schema, which is necessary because some migrations were applied by hand. The
   version check and the row-count comparison stay.
2. Edge Functions: copy the 30 functions into `volumes/functions/`, and add their secrets
   (Resend, VAPID, Turnstile and others) in a `docker-compose.override.yml`.
3. Point the cron jobs at `https://api.openhrapp.com`.
4. Do a rehearsal with `db-copy.sh` and `storage-copy.mjs`, then the cutover
   (see `README.md` in this folder).

## Sources

- [Supabase: Self-hosting with Docker](https://supabase.com/docs/guides/self-hosting/docker)
- [Supabase: HTTPS with a reverse proxy](https://supabase.com/docs/guides/self-hosting/self-hosted-proxy-https)
