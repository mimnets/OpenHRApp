---
name: PB to Supabase migration — full status
description: Complete status of the PocketBase to Supabase migration as of 2026-06-08
type: project
originSessionId: f9fb8799-c860-4f92-88f7-d834cf191da5
---
## Migration Summary

The migration from PocketBase to Supabase is **complete** as of 2026-06-08. All active code paths use Supabase exclusively.

## What was migrated (May 2026)

All domain services ported to Supabase:
- attendance.service.ts, leave.service.ts, employee.service.ts
- organization.service.ts, shift.service.ts, review.service.ts
- notification.service.ts, announcement.service.ts
- superadmin.service.ts, verification.service.ts
- blog.service.ts, tutorial.service.ts, upgrade.service.ts
- sociallinks.service.ts, showcase.service.ts, contact.service.ts

Frozen modules ported:
- sessionManager.ts (Supabase auth session)
- workdaySessionManager.ts (Supabase attendance queries)

PocketBase hooks → Supabase Edge Functions:
- cron-auto-close-sessions, cron-auto-absent, cron-daily-report
- cron-attendance-reminders, cron-expire-trials, cron-review-transitions
- cron-push-checkin-reminder

PB custom endpoints → Edge Functions:
- register, create-employee, admin-verify-employee
- superadmin-create-org, superadmin-delete-org
- admin-send-push, send-bulk-email

Cron jobs → pg_cron:
- Notification cleanup, selfie cleanup run as pure SQL jobs
- All Edge Function crons called via net.http_post()

## Database

### Supabase project
- URL: https://cixryuwtdwbofabctrkk.supabase.co
- Anon key in .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- 14 migrations in supabase/migrations/
- 15 Edge Functions in supabase/functions/

### PocketBase (legacy)
- PB server may still be running at pocketbase.mimnets.com
- pb_hooks/ contains the last deployed hooks for reference
- No active code paths call PB anymore

## Pending deployment items
- New `public-ad-config` Edge Function needs to be deployed: `supabase functions deploy public-ad-config`
- After deployment, ad banners on public pages (landing, blog, tutorials) will work again

## Data migration
- Migration scripts in scripts/migrate-from-pb/ (export → import → verify → files)
- Historical record only; migration has been completed
