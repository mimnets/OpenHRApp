-- Migration 0052: nobody is their own line manager
--
-- Ticking a team lead as a member of their own team made them their own line manager. Their
-- leave then went to themselves and could not be approved, and it waited for an HR override.
-- The app no longer does this; this clears the records it already wrote. Those people's new
-- requests go to HR until a "Reports To" is set on their employee profile.
--
-- Apply by hand in the SQL Editor (same as 0040-0051).

UPDATE public.profiles
SET line_manager_id = NULL
WHERE line_manager_id = id;

-- Requests already stuck this way. They are left as they are: HR or an Admin decides each one
-- with the override on the Leave screen.
SELECT id, employee_name, organization_id, type, start_date, end_date
FROM public.leaves
WHERE status = 'PENDING_MANAGER' AND line_manager_id = employee_id;
