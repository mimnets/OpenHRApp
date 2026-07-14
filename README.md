# OpenHR — Open Source HRMS for Growing Teams

**[OpenHR](https://www.openhrapp.com/)** is a free, open-source Human Resource Management System (HRMS) built for small to mid-size organizations (20–500 employees). It delivers biometric attendance tracking, intelligent leave management, performance reviews, and organizational tools — all in a lightweight, privacy-first, self-hostable package.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/openhr/openhr/pulls)

---

## Why OpenHR?

Most open-source HRMS tools are bloated, hard to deploy, or stuck in the past. OpenHR is different:

- **Supabase backend** — Managed PostgreSQL with built-in auth, storage, and real-time subscriptions. Free tier is enough to get started.
- **Self-hostable** — Deploy Supabase on your own infrastructure with Docker. Your employee data never leaves your server.
- **Modern stack** — React 19 + TypeScript + Tailwind CSS, not a legacy PHP monolith
- **Mobile-ready** — Installable PWA on iOS, Android, and desktop with offline-aware caching
- **Multi-tenant** — One instance can serve multiple organizations with full data isolation

---

## Key Features

### Attendance Tracking (Biometric + GPS)
- Selfie-verified clock in/out to prevent buddy punching
- GPS geofencing to validate employee location
- Office and factory/field duty types
- Auto-close forgotten sessions at end of workday

### Leave Management
- Multi-tier approval workflows (Employee → Manager → HR)
- Real-time leave balance tracking (Annual, Sick, Casual, and custom types)
- Configurable department-level approval routing
- Automated email and in-app notifications at every step

### Performance Reviews
- Configurable review cycles with competency-based ratings
- Self-assessment → Manager review → HR finalization pipeline
- Auto-calculated attendance and leave summaries per review period

### Employee Directory & Organization Setup
- Dynamic departments, designations, and team structures
- Role-based access control (Admin, HR, Manager, Team Lead, Employee)
- Centralized holiday calendar
- Shift management with grace periods and auto-close rules

### Announcements & Notifications
- Organization-wide announcements with role targeting and expiry
- Real-time notification bell + email alerts for leave, attendance, and review events

### Reports & Analytics
- Attendance summaries and leave reports
- Exportable data for payroll integration (CSV, PDF)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS |
| Backend | [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage + Edge Functions) |
| Mobile | Installable PWA (iOS Safari, Android Chrome, desktop) |
| Icons | Lucide React |
| Deployment | Vercel / Netlify (frontend), Supabase (backend) |

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- A **Supabase** account ([free tier](https://supabase.com) is enough) — or Docker for self-hosting
- **Supabase CLI** (install via npm): `npm install -g supabase`

---

### Option A: Supabase Cloud (Recommended — 5 minutes)

This is the fastest way to get OpenHR running. Supabase's free tier includes 500 MB database, 5 GB bandwidth, and 2 Edge Functions — enough for a small team.

#### 1. Clone & Install

```bash
git clone https://github.com/openhr/openhr.git
cd openhr
npm install
```

#### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose an organization, name your project (e.g. `my-openhr`), set a secure database password, and choose a region close to your users
4. Wait ~2 minutes for the database to provision

#### 3. Link Your Local Repo to Supabase

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

You can find your project ref in Supabase Dashboard → Settings → General → Reference ID.

#### 4. Apply Database Migrations

```bash
supabase db push
```

This applies all 15 migration files from `supabase/migrations/` — creating every table, index, RLS policy, trigger, storage bucket, and helper function OpenHR needs.

#### 5. Deploy Edge Functions

```bash
supabase functions deploy admin-send-push
supabase functions deploy admin-verify-employee
supabase functions deploy create-employee
supabase functions deploy cron-attendance-reminders
supabase functions deploy cron-auto-absent
supabase functions deploy cron-auto-close-sessions
supabase functions deploy cron-daily-report
supabase functions deploy cron-expire-trials
supabase functions deploy cron-push-checkin-reminder
supabase functions deploy cron-review-transitions
supabase functions deploy notify-admins-email
supabase functions deploy public-ad-config
supabase functions deploy register
supabase functions deploy send-bulk-email
supabase functions deploy superadmin-create-org
supabase functions deploy superadmin-delete-org
```

#### 6. Set Required Secrets

```bash
# Generate a random secret for cron job auth:
# PowerShell: [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
# Bash: openssl rand -base64 32

supabase secrets set CRON_SECRET=<your-random-secret>
```

#### 7. Set Up Cron Jobs

Open your Supabase Dashboard → **SQL Editor** and run the contents of `scripts/setup-cron-schedules.sql`. Before running, replace:
- `<PROJECT_REF>` with your Supabase project ref
- `<CRON_SECRET>` with the secret you set in step 6

This schedules all background jobs: auto-close sessions, auto-absent marking, trial expiration, attendance reminders, daily reports, review cycle transitions, and push notification check-in reminders.

#### 8. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Source |
|----------|--------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon` `public` key |
| `VITE_VAPID_PUBLIC_KEY` | *(Optional)* Generate with `npx web-push generate-vapid-keys` for browser push notifications |

#### 9. Start the Dev Server

```bash
npm run dev
```

Open `http://localhost:3000`. You'll see the OpenHR landing page. Register your organization from the app, or create the first admin user via the Supabase Dashboard → Authentication → Add User.

---

### Option B: Self-Hosted Supabase (Docker)

For organizations that need to keep all data on their own servers. This deploys the full Supabase stack locally.

#### Prerequisites

- **Docker** and **Docker Compose** v2+
- **Git** and **Node.js** 18+
- **Supabase CLI**: `npm install -g supabase`

#### 1. Clone OpenHR

```bash
git clone https://github.com/openhr/openhr.git
cd openhr
npm install
```

#### 2. Clone & Start Supabase Self-Hosted

The official Supabase Docker setup:

```bash
git clone --depth 1 https://github.com/supabase/supabase.git supabase-docker
cd supabase-docker/docker
cp .env.example .env
```

Edit the `.env` file — at minimum set:
- `POSTGRES_PASSWORD`: a secure database password
- `JWT_SECRET`: a random string (generate with `openssl rand -base64 64`)
- `ANON_KEY`: generate with the JWT secret (see [Supabase self-hosting docs](https://supabase.com/docs/guides/self-hosting))
- `SERVICE_ROLE_KEY`: generate with the JWT secret
- `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD`: for the Supabase Studio UI

Then start all services:

```bash
docker compose up -d
```

Wait ~2 minutes for all containers to become healthy. Verify with `docker compose ps` — all services should show `healthy` or `running`.

#### 3. Point OpenHR at Your Self-Hosted Supabase

```bash
cd ../../  # back to openhr root
supabase link --project-ref local
```

Or manually configure: edit `.env` in the OpenHR root (copy from `.env.example`):

```env
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=<your-anon-key-from-step-2>
```

The Supabase Studio (admin UI) will be at `http://localhost:8000`.

#### 4. Apply Migrations

```bash
supabase db push --db-url postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres
```

#### 5. Deploy Edge Functions

```bash
# Deploy all functions
for func in admin-send-push admin-verify-employee create-employee \
  cron-attendance-reminders cron-auto-absent cron-auto-close-sessions \
  cron-daily-report cron-expire-trials cron-push-checkin-reminder \
  cron-review-transitions notify-admins-email public-ad-config \
  register send-bulk-email superadmin-create-org superadmin-delete-org; do
  supabase functions deploy $func
done
```

#### 6. Set Secrets & Enable Cron

```bash
supabase secrets set CRON_SECRET=<your-random-secret>
```

For self-hosted Supabase, you need the `pg_cron` and `pg_net` extensions. Run the cron setup SQL from `scripts/setup-cron-schedules.sql` against your local database, replacing the URL with `http://kong:8000/functions/v1/...` (the internal Docker network URL).

#### 7. Start the App

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Environment Variables Reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | **Yes** | Your Supabase project URL (cloud: `https://<ref>.supabase.co`, self-hosted: `http://localhost:8000`) |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase anonymous/public API key (safe to expose in client code) |
| `VITE_VAPID_PUBLIC_KEY` | No | VAPID public key for web push notifications. Generate with `npx web-push generate-vapid-keys` |

---

## Architecture

```
React 19 PWA (TypeScript + Tailwind)
    │
    ▼
Custom Hooks → hrService (facade) → Domain Services → Supabase SDK
    │
    ▼
Supabase
├── PostgreSQL (15 tables, full RLS)
├── Auth (email/password, row-level security)
├── Storage (avatars, selfies, org logos, content images)
├── Edge Functions (16 serverless functions)
└── Realtime (notification bell live updates)
    │
    ▼
pg_cron + pg_net → Edge Functions (scheduled background jobs)
```

- **State-based routing** — No React Router; `currentPath` state in `App.tsx`
- **Context + Event Bus** — No Redux; AuthContext, ThemeContext, SubscriptionContext
- **Multi-tenant** — Every query scoped by `organization_id`
- **Row-Level Security** — PostgreSQL RLS policies enforce data isolation per user/org
- **WebP auto-conversion** — All uploaded images converted to WebP

---

## Supabase Project Structure

```
supabase/
├── migrations/              # Database schema (15 migrations)
│   ├── 0001_initial_schema.sql          # Core tables (orgs, profiles, attendance, leaves, etc.)
│   ├── 0002_rls_policies.sql            # Row-level security policies
│   ├── 0003_auth_hooks.sql              # handle_new_user trigger
│   ├── 0004_fix_rls_helpers.sql         # RLS helper function fixes
│   ├── 0005_storage_buckets.sql         # Storage buckets + policies
│   ├── 0006_settings_unique_constraint.sql
│   ├── 0007_attendance_self_update.sql
│   ├── 0008_attendance_self_update_text_cast.sql
│   ├── 0009_cron_setup.sql              # pg_cron + pg_net extension setup
│   ├── 0010_contact_submissions.sql
│   ├── 0011_push_subscriptions.sql
│   ├── 0012_broadcasts.sql
│   ├── 0013_add_email_to_profiles.sql
│   ├── 0014_admin_hr_cross_org_rls.sql
│   └── 0015_notify_super_admins.sql
├── functions/               # Edge Functions (16 deployed)
│   ├── register/            # Organization registration
│   ├── admin-verify-employee/  # Manual employee verification
│   ├── create-employee/     # Create auth user + profile
│   ├── admin-send-push/     # Send push notifications
│   ├── send-bulk-email/     # Super admin bulk email
│   ├── notify-admins-email/ # Admin notification emails
│   ├── public-ad-config/    # Public ad slot configuration
│   ├── superadmin-create-org/  # Create org (service role)
│   ├── superadmin-delete-org/  # Cascade delete org
│   ├── cron-auto-close-sessions/   # Close forgotten check-outs
│   ├── cron-auto-absent/           # Mark absent employees
│   ├── cron-daily-report/          # Daily attendance summary
│   ├── cron-attendance-reminders/  # Checkout reminders
│   ├── cron-expire-trials/         # Trial expiration
│   ├── cron-review-transitions/    # Review cycle open/close
│   └── cron-push-checkin-reminder/ # Missed check-in push alerts
└── .temp/                   # Local Supabase config (git-ignored)
```

### Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `avatars` | Public read | Employee profile photos |
| `selfies` | Private, user-scoped | Attendance verification selfies |
| `org-logos` | Public read | Organization logos |
| `content-images` | Public read | Blog/tutorial cover images |
| `donation-screenshots` | Admin read | Upgrade request screenshots |
| `showcase-logos` | Public read | Featured organization logos |

### Cron Jobs

| Job | Schedule | Edge Function |
|-----|----------|---------------|
| `auto-close-sessions` | Every 5 min | `cron-auto-close-sessions` |
| `auto-absent-check` | Every minute | `cron-auto-absent` |
| `daily-attendance-report` | Daily 23:00 UTC | `cron-daily-report` |
| `attendance-reminders` | Every 5 min | `cron-attendance-reminders` |
| `push-checkin-reminder` | Every minute | `cron-push-checkin-reminder` |
| `review-cycle-transition` | Daily midnight | `cron-review-transitions` |
| `auto-expire-trials` | Daily midnight | `cron-expire-trials` |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant org records with subscription status |
| `profiles` | Employee profiles (extends `auth.users`, 1-to-1) |
| `attendance` | Daily attendance with GPS, selfie, and duty type |
| `leaves` | Leave requests with multi-tier approval status |
| `shifts` | Shift definitions with grace periods |
| `teams` | Team records with leader assignments |
| `settings` | Key-value organization configuration |
| `announcements` | Organization announcements with role targeting |
| `notifications` | User notification records |
| `review_cycles` | Performance review cycle definitions |
| `performance_reviews` | Individual review records |
| `blog_posts` | Blog articles |
| `tutorials` | Tutorial/how-to content |
| `showcase_organizations` | Featured organizations |
| `social_links` | Social media links |
| `upgrade_requests` | Donation and upgrade requests |
| `reports_queue` | Email automation queue |
| `contact_submissions` | Contact form submissions |
| `push_subscriptions` | Web push notification subscriptions |
| `broadcasts` | Super admin broadcast audit log |

---

## Role-Based Access

| Role | Access Level |
|------|-------------|
| **Super Admin** | Cross-organization platform management |
| **Admin** | Full organization visibility and configuration |
| **HR** | Full employee data, leave approvals, review finalization |
| **Manager** | Team members' attendance, leave, and reviews |
| **Team Lead** | Direct reports only |
| **Employee** | Own data only |

---

## Deployment

### Frontend (Vercel / Netlify / Any Static Host)

```bash
npm run build      # outputs to dist/
```

Set the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables in your hosting dashboard. Deploy the `dist/` folder.

### Backend (Supabase)

The backend is your Supabase project. No additional deployment needed for the database and auth. For self-hosted, run the Supabase Docker stack behind a reverse proxy (nginx, Caddy) with TLS.

---

## Contributing

We welcome contributions! Bug fixes, new features, and documentation improvements are all appreciated.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Submit a pull request

Please read `Others/CLAUDE.md` for architecture details, coding standards, and development guidelines.

---

## License

OpenHR is open-source software licensed under the [MIT License](LICENSE).

---

## Keywords

`open source HRMS` · `free HR software` · `human resource management system` · `open source attendance tracking` · `leave management system` · `employee management software` · `self-hosted HR tool` · `Supabase HRMS` · `React HR application` · `open source people management` · `free attendance system` · `performance review software` · `open source employee directory`
