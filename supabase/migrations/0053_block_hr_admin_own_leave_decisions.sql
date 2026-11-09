-- Migration 0053: HR and Admins do not decide their own leave
--
-- 0050 lets ADMIN/HR of an organization do anything to any leave, including their own: approve
-- it, create it already approved, edit it after a decision, or delete it to restore their
-- balance. They now apply like everyone else, and another active HR or Admin decides.
--
-- The only person who may act on their own leave is the organization's sole active HR or Admin,
-- because nobody else could ever decide it. They still cannot skip a boss who has yet to review
-- it. src/utils/leaveApprovers.ts applies the same rule on screen; keep the two in step.
--
-- Edge functions, crons (service role), the SQL Editor and Super Admins are not restricted.
-- Replaces the 0050 leave trigger function in full. Apply by hand in the SQL Editor.

CREATE OR REPLACE FUNCTION public.has_other_leave_approver(org uuid, me uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE organization_id = org
      AND id <> me
      AND role IN ('ADMIN', 'HR')
      AND COALESCE(status, 'ACTIVE') <> 'INACTIVE'
  )
$$;

REVOKE ALL ON FUNCTION public.has_other_leave_approver(uuid, uuid) FROM PUBLIC, anon, authenticated;

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
  is_own boolean;
  waiting_for_boss boolean;
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  SELECT * INTO caller FROM profiles WHERE id = auth.uid();

  IF caller.role IN ('ADMIN', 'HR') AND caller.organization_id = NEW.organization_id THEN
    is_own := NEW.employee_id = me;
    IF TG_OP = 'UPDATE' THEN
      is_own := is_own OR OLD.employee_id = me;
      waiting_for_boss := OLD.status = 'PENDING_MANAGER' AND OLD.line_manager_id IS NOT NULL AND OLD.line_manager_id <> me;
    ELSE
      waiting_for_boss := caller.line_manager_id IS NOT NULL AND caller.line_manager_id <> caller.id;
    END IF;

    IF NOT is_own OR (NOT waiting_for_boss AND NOT public.has_other_leave_approver(caller.organization_id, caller.id)) THEN
      RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'Another HR or Admin must act on your own leave request';
    END IF;
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

-- Only ADMIN/HR can delete leaves (0002), so this only has to stop them deleting their own.
CREATE OR REPLACE FUNCTION public.protect_own_leave_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me text := auth.uid()::text;
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() OR OLD.employee_id <> me THEN
    RETURN OLD;
  END IF;
  IF (OLD.status <> 'PENDING_MANAGER' OR OLD.line_manager_id IS NULL OR OLD.line_manager_id = me)
     AND NOT public.has_other_leave_approver(OLD.organization_id, auth.uid()) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Another HR or Admin must act on your own leave request';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_own_leave_delete ON public.leaves;
CREATE TRIGGER trg_protect_own_leave_delete
  BEFORE DELETE ON public.leaves
  FOR EACH ROW EXECUTE FUNCTION public.protect_own_leave_delete();
