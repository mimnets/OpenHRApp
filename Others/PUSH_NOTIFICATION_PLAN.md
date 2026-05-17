# PWA Push Check-In Reminder — Implementation Plan

## Overview

Sends Web Push notifications to employees based on their assigned shift start time and organization timezone. Works with phone locked, app closed. iOS 16.4+ (PWA added to Home Screen required).

---

## Architecture

```
Supabase Cron (every minute)
  └─▶ Edge Function: cron-push-checkin-reminder
        ├─ Query orgs → read timezone from settings.app_config
        ├─ Query shifts (start_time, working_days)
        ├─ Match employees on shift via profiles.shift_id
        ├─ Check attendance table for missed check-in
        └─▶ Web Push → Browser Push Service (FCM/APNS) → Device
```

---

## Notification Schedule Per Employee

| Trigger | Timing | Message |
|---|---|---|
| Early warning | `shift.start_time - 15 min` | "Check-in in 15 minutes!" |
| Missed check-in | `shift.start_time + 30 min` | "You haven't checked in yet!" |

Both are idempotent — `notifications.reference_id` prevents duplicate sends per employee per day.

---

## Files Created / Modified

### New Files

| File | Purpose |
|---|---|
| `supabase/migrations/0011_push_subscriptions.sql` | `push_subscriptions` table with RLS |
| `supabase/functions/cron-push-checkin-reminder/index.ts` | Edge Function — reads shifts, sends Web Push |
| `src/sw.ts` | Custom Service Worker with push + notificationclick handlers |
| `src/services/pushNotification.service.ts` | Frontend — permission, subscribe, save to DB, unsubscribe |

### Modified Files

| File | Change |
|---|---|
| `vite.config.ts` | Switched from `generateSW` → `injectManifest` (enables custom SW with push handlers) |
| `src/App.tsx` | Added `useEffect` to auto-subscribe after login |
| `scripts/setup-cron-schedules.sql` | Added `push-checkin-reminder` cron schedule |

---

## Database Schema

```sql
push_subscriptions (
  id            uuid PK
  user_id       uuid → auth.users
  organization_id uuid → organizations
  endpoint      text        -- browser push endpoint URL
  p256dh        text        -- encryption key
  auth          text        -- auth secret
  created       timestamptz
  updated       timestamptz
  UNIQUE(user_id, endpoint) -- one row per user per device/browser
)
```

RLS: users manage own rows. Service role reads all (for Edge Function).

---

## Data Sources (No New Columns Needed)

- **Check-in time**: `shifts.start_time` (per employee via `profiles.shift_id`)
- **Timezone**: `settings` table, `key = 'app_config'`, JSON field `timezone` (same pattern as existing cron)
- **Working days**: `shifts.working_days` text array (`['MON','TUE',...]`)

---

## Prerequisites (Already Done by You)

- [x] VAPID keys generated via `npx web-push generate-vapid-keys`
- [x] Supabase secrets set: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- [x] Vercel env set: `VITE_VAPID_PUBLIC_KEY`

---

## Deployment Steps (Manual — Run After Pushing Code)

### 1. Apply DB Migration
```bash
supabase db push
# or paste 0011_push_subscriptions.sql into Supabase SQL Editor
```

### 2. Deploy Edge Function
```bash
supabase functions deploy cron-push-checkin-reminder
```

### 3. Register Cron Schedule
Run in Supabase SQL Editor (or psql):
```sql
-- From scripts/setup-cron-schedules.sql — the push-checkin-reminder block
select cron.schedule(
  'push-checkin-reminder',
  '* * * * *',
  $$
  select extensions.http_post(
    url := 'https://cixryuwtlwbofabctrkk.supabase.co/functions/v1/cron-push-checkin-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 4. Deploy Frontend
```bash
git push origin localdev
# Vercel auto-deploys
```

---

## User Flow

1. Employee opens PWA → permission prompt appears automatically after login
2. Employee grants permission → subscription saved to `push_subscriptions`
3. At `shift_start - 15min`: push fires → OS notification → employee opens app → checks in
4. At `shift_start + 30min`: if no check-in record → second push fires
5. Stale/expired subscriptions auto-cleaned by Edge Function on 410 response

---

## iOS Requirements

- iOS 16.4+
- PWA **added to Home Screen** (not just Safari)
- Notification permission granted inside the installed PWA

---

## Performance Impact

- Zero impact on app load (SW runs in separate thread)
- Cron: 1 DB query/minute (orgs) + per-org shift queries only when time matches
- Push delivery: Supabase → FCM/APNS → device (not through app)
- Rush-hour safe: notifications fire *before* rush hour, not during

---

## Monitoring

```sql
-- Check sent notifications
select reference_id, created from notifications
where reference_type in ('CHECKIN_REMINDER')
order by created desc limit 50;

-- Check active subscriptions
select count(*), organization_id from push_subscriptions group by organization_id;

-- Check cron job status
select jobname, schedule, active from cron.job where jobname = 'push-checkin-reminder';
```
