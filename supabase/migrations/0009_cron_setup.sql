-- ============================================================
-- OpenHR — Cron Job Setup
-- 0009_cron_setup.sql
--
-- Enables pg_net (HTTP from SQL) for Edge Function triggers.
-- Schedules pure-SQL cleanup cron jobs via pg_cron.
--
-- Edge Function cron schedules (auto_close_sessions, auto_expire_trials,
-- auto_absent_check, daily_attendance_report, attendance_reminders,
-- review_cycle_transition) are set up separately in
-- scripts/setup-cron-edge-functions.sql after deploying Edge Functions.
-- ============================================================

-- pg_net: enables net.http_post() for calling Edge Functions from pg_cron
create extension if not exists pg_net with schema extensions;

-- ============================================================
-- NOTIFICATION CLEANUP — Daily 3 AM UTC
-- Deletes notifications older than 30 days to keep table lean.
-- Retention period can be extended by changing the interval.
-- ============================================================
select cron.schedule(
  'notification-cleanup',
  '0 3 * * *',
  $$
    delete from public.notifications
    where created < now() - interval '30 days';
  $$
);

-- ============================================================
-- SELFIE CLEANUP — Daily 2 AM UTC
-- Clears selfie storage path on old attendance rows.
-- Note: actual Storage objects are deleted via Edge Function
-- cron-selfie-storage-cleanup (scheduled separately) because
-- Supabase Storage deletion requires service role HTTP call.
-- This SQL step nulls the path reference so the app stops
-- serving broken URLs immediately.
-- ============================================================
select cron.schedule(
  'selfie-cleanup',
  '0 2 * * *',
  $$
    update public.attendance
    set
      selfie = null,
      updated = now()
    where
      date < current_date - interval '30 days'
      and selfie is not null;
  $$
);
