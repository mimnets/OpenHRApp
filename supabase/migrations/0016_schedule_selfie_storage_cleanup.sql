-- ============================================================
-- OpenHR — Schedule Selfie Storage Cleanup Edge Function
-- 0016_schedule_selfie_storage_cleanup.sql
--
-- Schedules the cron-selfie-storage-cleanup Edge Function to
-- run daily at 2 AM UTC via pg_cron + pg_net.
--
-- PREREQUISITES (before running this migration):
--   1. Deploy the Edge Function:
--        supabase functions deploy cron-selfie-storage-cleanup
--   2. Set the CRON_SECRET secret:
--        supabase secrets set CRON_SECRET=<your-secret>
--   3. Replace <YOUR_PROJECT_REF> below with your actual Supabase
--      project ref (find it in Dashboard → Project Settings → General).
--   4. Replace <YOUR_CRON_SECRET> below with the same secret value
--      you set in step 2.
-- ============================================================

-- pg_net: enables net.http_post() for calling Edge Functions from pg_cron
create extension if not exists pg_net with schema extensions;

-- Remove existing schedule if re-running (idempotent)
select cron.unschedule('selfie-storage-cleanup');

-- Schedule: daily at 2 AM UTC
select cron.schedule(
  'selfie-storage-cleanup',
  '0 2 * * *',
  $$
    select net.http_post(
      url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/cron-selfie-storage-cleanup',
      headers := '{"Authorization": "Bearer <YOUR_CRON_SECRET>", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
