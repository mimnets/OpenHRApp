-- Migration 0055: stop the check-in reminder job
--
-- The reminder sent 15 minutes before a shift and the alert sent 30 minutes after it starts are no
-- longer wanted. This removes the job that called the cron-push-checkin-reminder Edge Function
-- every minute. Past reminders stay in the notifications table until the normal cleanup removes
-- them.
--
-- Safe to run more than once. Apply by hand in the SQL Editor on every database the app may run on.

select cron.unschedule(jobname)
from cron.job
where jobname = 'push-checkin-reminder';
