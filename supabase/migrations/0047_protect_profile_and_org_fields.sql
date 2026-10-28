-- Migration 0047: stop privilege escalation through profile and organization updates
--
-- The update policies let any signed-in member update any profile in their organization and
-- their organization's own row (0002). Nothing stopped an employee from setting their own
-- role to SUPER_ADMIN or ADMIN, editing a colleague's salary, or setting their organization to
-- ACTIVE (the paid, ad-free plan). These triggers enforce who may change what. Policies stay
-- as they are, so every screen that works today keeps working.
--
-- Edge functions (service role) and the SQL Editor have no auth.uid() and are not restricted:
-- registration, create-employee, offboarding, crons and demo-reset all run that way.
--
-- Apply by hand in the Supabase SQL Editor (same as 0040-0046).

-- ── profiles ────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller profiles%ROWTYPE;
  col text;
  -- Fields that only ADMIN/HR (or the platform) may change. Compared as JSON, so a column
  -- missing from this database simply compares null = null.
  privileged text[] := ARRAY[
    'role', 'organization_id', 'email', 'employee_id', 'designation', 'department',
    'line_manager_id', 'team_id', 'shift_id', 'employment_type', 'work_type',
    'joining_date', 'salary', 'status'
  ];
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  SELECT * INTO caller FROM profiles WHERE id = auth.uid();

  IF OLD.role = 'SUPER_ADMIN' OR NEW.role = 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Only a Super Admin can change a Super Admin account';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'A profile cannot be moved to another organization';
  END IF;

  IF caller.role IN ('ADMIN', 'HR') AND caller.organization_id = OLD.organization_id THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF OLD.id = auth.uid() THEN
        RAISE EXCEPTION 'You cannot change your own role';
      END IF;
      IF (NEW.role = 'ADMIN' OR OLD.role = 'ADMIN') AND caller.role <> 'ADMIN' THEN
        RAISE EXCEPTION 'Only an ADMIN can grant or remove the ADMIN role';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Everyone else may edit only their own profile, and only its personal fields.
  IF OLD.id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only edit your own profile';
  END IF;
  FOREACH col IN ARRAY privileged LOOP
    IF to_jsonb(NEW) -> col IS DISTINCT FROM to_jsonb(OLD) -> col THEN
      RAISE EXCEPTION 'Only ADMIN or HR can change %', col;
    END IF;
  END LOOP;
  -- Self-verification is allowed only once the sign-in email is actually confirmed.
  IF NEW.verified IS DISTINCT FROM OLD.verified AND NOT (
    NEW.verified IS TRUE
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Only ADMIN or HR can change verification';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- ── organizations ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_org_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.organization_id = OLD.id AND p.role IN ('ADMIN', 'HR')
  ) THEN
    RAISE EXCEPTION 'Only ADMIN or HR can edit the organization';
  END IF;

  IF NEW.is_demo IS DISTINCT FROM OLD.is_demo
     OR NEW.demo_reset_at IS DISTINCT FROM OLD.demo_reset_at
     OR NEW.subscription_expires IS DISTINCT FROM OLD.subscription_expires THEN
    RAISE EXCEPTION 'Only a Super Admin can change the plan';
  END IF;

  -- The one plan change an organization may make itself: Upgrade → "Free with ads".
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.trial_end_date IS DISTINCT FROM OLD.trial_end_date THEN
    IF NOT (
      NEW.subscription_status = 'AD_SUPPORTED'
      AND OLD.subscription_status IN ('TRIAL', 'EXPIRED', 'AD_SUPPORTED')
      AND NEW.trial_end_date IS NULL
      AND NOT COALESCE(OLD.is_demo, false)
    ) THEN
      RAISE EXCEPTION 'Only a Super Admin can change the plan';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_org_fields ON public.organizations;
CREATE TRIGGER trg_protect_org_fields
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.protect_org_fields();
