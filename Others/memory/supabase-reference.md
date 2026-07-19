---
name: Supabase project reference
description: Supabase project details, deployed Edge Functions, migrations, and cron schedules
type: reference
originSessionId: f9fb8799-c860-4f92-88f7-d834cf191da5
---
## Project Details
- **Project URL**: https://<your-project-ref>.supabase.co
- **Anon key**: In `.env` (VITE_SUPABASE_ANON_KEY)

## Edge Functions (15 deployed + 1 pending)

### Deployed (in supabase/functions/)
| Function | Purpose | Auth |
|----------|---------|------|
| admin-send-push | Send push notifications to subscribed users | SUPER_ADMIN |
| admin-verify-employee | Manually verify/activate employee account | ADMIN/HR |
| create-employee | Create new auth user + profile | ADMIN/HR |
| cron-attendance-reminders | Checkout reminders every 5 min | CRON_SECRET |
| cron-auto-absent | Mark absent employees | CRON_SECRET |
| cron-auto-close-sessions | Close forgotten check-outs | CRON_SECRET |
| cron-daily-report | Daily attendance summary email | CRON_SECRET |
| cron-expire-trials | Trial expiration + reminders | CRON_SECRET |
| cron-push-checkin-reminder | Missed check-in push alerts | CRON_SECRET |
| cron-review-transitions | Auto-open/close review cycles | CRON_SECRET |
| register | Organization registration | Public |
| send-bulk-email | Super admin bulk email broadcast | SUPER_ADMIN |
| superadmin-create-org | Create organization (service role) | SUPER_ADMIN |
| superadmin-delete-org | Cascade delete organization | SUPER_ADMIN |

### Pending deployment
| Function | Purpose | Auth |
|----------|---------|------|
| public-ad-config | Public ad config for landing/blog/tutorials | Public |

## PostgreSQL Cron Jobs
Defined in `scripts/setup-cron-schedules.sql`. Uses `net.http_post()` (pg_net 0.20.0+).

| Job | Schedule | Function |
|-----|----------|----------|
| auto-close-sessions | 3-59/5 * * * * | cron-auto-close-sessions |
| auto-absent-check | * * * * * | cron-auto-absent |
| daily-attendance-report | 0 23 * * * | cron-daily-report |
| attendance-reminders | */5 * * * * | cron-attendance-reminders |
| push-checkin-reminder | */5 * * * * | cron-push-checkin-reminder |
| review-cycle-transition | 0 0 * * * | cron-review-transitions |
| auto-expire-trials | 0 0 * * * | cron-expire-trials |

CRON_SECRET env var is set on each Edge Function for auth verification.

## Database Migrations
14 migrations in `supabase/migrations/`:
- 0001: Initial schema (profiles, attendance, leaves, shifts, teams, settings, etc.)
- 0002: RLS policies
- 0003: Auth hooks (handle_new_user trigger)
- 0004: RLS helper fixes
- 0005: Storage buckets (avatars, selfies, org-logos, content-images, donation-screenshots, showcase-logos)
- 0006: Settings unique constraint (organization_id, key)
- 0007: Attendance self-update RLS
- 0008: Attendance self-update text cast fix
- 0009: Cron setup SQL
- 0010: Contact submissions table
- 0011: Push subscriptions table
- 0012: Broadcasts audit table
- 0013: Add email to profiles
- 0014: Cross-org RLS for ADMIN/HR

## Storage Buckets
- avatars (public read)
- selfies (private, user-scoped)
- org-logos (public read)
- content-images (public read, for blog/tutorial covers)
- donation-screenshots (admin read)
- showcase-logos (public read)
