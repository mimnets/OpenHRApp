-- Migration 0054: record who decided each leave request
--
-- A leave record kept no trace of who approved or rejected it. The database now records the
-- person, their name at that moment and the time, whenever the status becomes a decision. A
-- manager forwarding to HR is not a decision; a manager rejecting is. A later change of decision
-- replaces the record, and going back to pending clears it.
--
-- Browsers cannot set these columns: any value they send is replaced. Inserts with no signed-in
-- user (data copies between servers, demo seeds, the SQL Editor) keep what they supply, so moving
-- the database does not erase the history. Status changes with no signed-in user record the time
-- with no person. Requests decided before this migration have no record and stay that way.
--
-- This trigger must run after trg_protect_leave_workflow, which it does because triggers fire in
-- name order. Apply by hand in the SQL Editor, after 0053, on every database the app may run on:
-- a revert to Supabase Cloud stops if Cloud does not have these columns.

ALTER TABLE public.leaves
  ADD COLUMN IF NOT EXISTS decided_by text,
  ADD COLUMN IF NOT EXISTS decided_by_name text,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz;

CREATE OR REPLACE FUNCTION public.stamp_leave_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.decided_by := OLD.decided_by;
    NEW.decided_by_name := OLD.decided_by_name;
    NEW.decided_at := OLD.decided_at;
    RETURN NEW;
  END IF;

  IF NEW.status IN ('PENDING_MANAGER', 'PENDING_HR') THEN
    NEW.decided_by := NULL;
    NEW.decided_by_name := NULL;
    NEW.decided_at := NULL;
  ELSE
    NEW.decided_by := auth.uid()::text;
    NEW.decided_by_name := (SELECT name FROM profiles WHERE id = auth.uid());
    NEW.decided_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_leave_decision ON public.leaves;
CREATE TRIGGER trg_stamp_leave_decision
  BEFORE INSERT OR UPDATE ON public.leaves
  FOR EACH ROW EXECUTE FUNCTION public.stamp_leave_decision();
