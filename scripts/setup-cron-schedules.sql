-- ============================================================
-- OpenHR — Cron Edge Function Schedule Setup
-- Run this ONCE after deploying all cron Edge Functions.
--
-- Prerequisites:
--   1. All cron-* Edge Functions deployed to Supabase.
--   2. CRON_SECRET secret set: supabase secrets set CRON_SECRET=<random-string>
--   3. Same CRON_SECRET set as pg parameter (see below).
--   4. pg_net extension enabled (migration 0009_cron_setup.sql applied).
--
-- Replace <PROJECT_REF> with your Supabase project ref (<PROJECT_REF>).
-- Replace <CRON_SECRET> with the same value set via `supabase secrets set`.
--
-- Run via: psql $DATABASE_URL -f scripts/setup-cron-schedules.sql
-- Or paste into Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================

-- Store CRON_SECRET as a DB-level parameter so pg_cron can access it.
-- Run this separately as superuser if needed.
-- ALTER DATABASE postgres SET app.cron_secret = '<CRON_SECRET>';

-- ============================================================
-- auto_close_sessions — every 5 min (offset to :03)
-- ============================================================
select cron.schedule(
  'auto-close-sessions',
  '3-59/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cron-auto-close-sessions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- auto_expire_trials — daily midnight UTC
-- ============================================================
select cron.schedule(
  'auto-expire-trials',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cron-expire-trials',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- auto_absent_check — every minute
-- ============================================================
select cron.schedule(
  'auto-absent-check',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cron-auto-absent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- daily_attendance_report — daily 11 PM UTC
-- ============================================================
select cron.schedule(
  'daily-attendance-report',
  '0 23 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cron-daily-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- attendance_reminders — every 5 min (offset to :03)
-- ============================================================
select cron.schedule(
  'attendance-reminders',
  '3-59/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cron-attendance-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- review_cycle_transition — daily midnight UTC
-- ============================================================
select cron.schedule(
  'review-cycle-transition',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cron-review-transitions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- push_checkin_reminder — every minute (checks 15-min early + 30-min missed windows)
-- ============================================================
select cron.schedule(
  'push-checkin-reminder',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cron-push-checkin-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- demo_reset — daily midnight UTC
-- ============================================================
select cron.schedule(
  'demo-reset',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/demo-reset',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- Verify all jobs registered:
-- ============================================================
-- select jobid, jobname, schedule, active from cron.job order by jobname;
