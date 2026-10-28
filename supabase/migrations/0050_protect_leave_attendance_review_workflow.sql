-- Migration 0050: enforce the leave, attendance and review workflows in the database
--
-- The insert/update policies on leaves, performance_reviews (0002) and attendance (0008) let
-- any member of an organization write any row in it: approve their own leave, rate their own
-- review, create check-ins for a colleague or move their own check-in time. These triggers
-- allow each step only to the person it belongs to. Policies stay as they are.
--
--   leaves       employee applies for themselves (pending only; line manager taken from their
--                profile); the assigned line manager forwards to HR or rejects a request waiting
--                for them; ADMIN/HR of the organization may do anything.
--   attendance   employee checks in for themselves (not in the future, at most 7 days back for
--                offline sync); afterwards they may only set their check-out once, add remarks and
--                attach the selfie; MANAGERs may edit their reports' rows (not their own);
--                ADMIN/HR may do anything.
--   reviews      employee creates their own DRAFT and submits the self-assessment; the assigned
--                line manager submits manager ratings; ADMIN/HR may do anything.
--
-- Edge functions, crons (service role) and the SQL Editor have no auth.uid() and are not
-- restricted. Apply by hand in the Supabase SQL Editor (same as 0040-0049).

-- ── leaves ──────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_leave_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller profiles%ROWTYPE;
  me text := auth.uid()::text;
  fixed text[] := ARRAY['status', 'manager_remarks', 'updated'];
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  SELECT * INTO caller FROM profiles WHERE id = auth.uid();

  IF caller.role IN ('ADMIN', 'HR') AND caller.organization_id = NEW.organization_id THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.employee_id IS DISTINCT FROM me THEN
      RAISE EXCEPTION 'You can only apply for your own leave';
    END IF;
    IF NEW.status NOT IN ('PENDING_MANAGER', 'PENDING_HR') THEN
      RAISE EXCEPTION 'A new leave request must be pending';
    END IF;
    NEW.line_manager_id := caller.line_manager_id::text;
    NEW.manager_remarks := NULL;
    NEW.approver_remarks := NULL;
    RETURN NEW;
  END IF;

  -- The assigned line manager acts once, on a request waiting for them, changing only the
  -- status and their remarks.
  IF OLD.line_manager_id = me AND OLD.employee_id <> me
     AND OLD.status = 'PENDING_MANAGER' AND NEW.status IN ('PENDING_HR', 'REJECTED')
     AND (to_jsonb(NEW) - fixed) = (to_jsonb(OLD) - fixed) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Only the assigned manager, HR or an Admin can act on this leave request';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_leave_workflow ON public.leaves;
CREATE TRIGGER trg_protect_leave_workflow
  BEFORE INSERT OR UPDATE ON public.leaves
  FOR EACH ROW EXECUTE FUNCTION public.protect_leave_workflow();

-- ── attendance ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_attendance_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller profiles%ROWTYPE;
  me text := auth.uid()::text;
  -- Check-in times are built from the device clock rounded to the minute.
  slack interval := interval '15 minutes';
  fixed text[] := ARRAY['check_out', 'remarks', 'selfie', 'updated'];
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  SELECT * INTO caller FROM profiles WHERE id = auth.uid();

  IF caller.organization_id = NEW.organization_id AND (
       caller.role IN ('ADMIN', 'HR')
       OR (TG_OP = 'UPDATE' AND caller.role = 'MANAGER' AND OLD.employee_id <> me)
     ) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.employee_id IS DISTINCT FROM me THEN
      RAISE EXCEPTION 'You can only check in for yourself';
    END IF;
    IF NEW.check_in > now() + slack OR NEW.check_in < now() - interval '7 days'
       OR NEW.check_out > now() + slack THEN
      RAISE EXCEPTION 'Attendance time is out of range';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.employee_id IS DISTINCT FROM me THEN
    RAISE EXCEPTION 'You can only update your own attendance';
  END IF;
  IF (to_jsonb(NEW) - fixed) <> (to_jsonb(OLD) - fixed) THEN
    RAISE EXCEPTION 'Only check-out, remarks and the selfie can be changed';
  END IF;
  -- No "after check-in" rule: night-shift check-outs are stored against the check-in date.
  IF NEW.check_out IS DISTINCT FROM OLD.check_out
     AND (OLD.check_out IS NOT NULL OR NEW.check_out IS NULL OR NEW.check_out > now() + slack) THEN
    RAISE EXCEPTION 'Check-out can be set once and not in the future';
  END IF;
  IF NEW.selfie IS DISTINCT FROM OLD.selfie AND OLD.selfie IS NOT NULL THEN
    RAISE EXCEPTION 'The check-in selfie cannot be replaced';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_attendance_workflow ON public.attendance;
CREATE TRIGGER trg_protect_attendance_workflow
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.protect_attendance_workflow();

-- ── performance_reviews ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_review_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller profiles%ROWTYPE;
  me text := auth.uid()::text;
  self_fields text[] := ARRAY['status', 'submitted_at', 'self_ratings', 'updated'];
  manager_fields text[] := ARRAY['status', 'manager_reviewed_at', 'manager_ratings', 'updated'];
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  SELECT * INTO caller FROM profiles WHERE id = auth.uid();

  IF caller.role IN ('ADMIN', 'HR') AND caller.organization_id = NEW.organization_id THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- shortcut: the attendance/leave summary snapshot is still computed by the client; recompute
    -- it here if employees ever start gaming it (HR sees the live records when finalizing).
    IF NEW.employee_id IS DISTINCT FROM me OR NEW.status IS DISTINCT FROM 'DRAFT'
       OR NEW.self_ratings IS NOT NULL OR NEW.manager_ratings IS NOT NULL
       OR NEW.hr_overall_rating IS NOT NULL OR NEW.hr_final_remarks IS NOT NULL
       OR NEW.finalized_by IS NOT NULL OR NEW.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'You can only start your own review as a draft';
    END IF;
    NEW.line_manager_id := COALESCE(caller.line_manager_id::text, '');
    NEW.manager_name := COALESCE((SELECT name FROM profiles WHERE id = caller.line_manager_id), '');
    RETURN NEW;
  END IF;

  IF OLD.employee_id = me AND OLD.status = 'DRAFT' AND NEW.status = 'SELF_REVIEW_SUBMITTED'
     AND (to_jsonb(NEW) - self_fields) = (to_jsonb(OLD) - self_fields) THEN
    RETURN NEW;
  END IF;
  IF OLD.line_manager_id = me AND OLD.employee_id <> me
     AND OLD.status = 'SELF_REVIEW_SUBMITTED' AND NEW.status = 'MANAGER_REVIEWED'
     AND (to_jsonb(NEW) - manager_fields) = (to_jsonb(OLD) - manager_fields) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Only the employee, their manager, HR or an Admin can make this change';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_review_workflow ON public.performance_reviews;
CREATE TRIGGER trg_protect_review_workflow
  BEFORE INSERT OR UPDATE ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_review_workflow();
