-- Migration 0051: employees read only the records they are meant to see
--
-- The select policies on attendance and leaves (0025) and performance_reviews (0002) let any
-- member read every row of their organization: colleagues' check-in locations, leave reasons
-- and review ratings. The screens already showed less; now the database matches them:
--
--   attendance, leaves   ADMIN/HR: whole organization. Everyone: their own rows. Managers and
--                        team leads: their direct reports, members of teams they lead and (role
--                        MANAGER) members of their own team, as on the dashboard, Leave and
--                        Attendance screens. Leaves also stay visible to the line manager they
--                        were assigned to.
--   performance_reviews  ADMIN/HR, the employee, and the review's assigned line manager.
--   selfies (storage)    ADMIN/HR, the employee, and the people who manage them (was: any
--                        MANAGER in the organization).
--   blog_posts, tutorials  drafts only for Super Admins (was: any signed-in user).
--
-- (select fn()) wrappers make Postgres evaluate them once per query, not once per row.
-- Apply by hand in the Supabase SQL Editor (same as 0040-0050).

CREATE OR REPLACE FUNCTION public.manages_employee(emp text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN profiles me ON me.id = auth.uid()
    WHERE p.id::text = emp
      AND p.id <> me.id
      AND p.organization_id = me.organization_id
      AND (
        p.line_manager_id = me.id
        OR p.team_id IN (SELECT t.id FROM teams t WHERE t.leader_id = me.id)
        OR (me.role = 'MANAGER' AND p.team_id IS NOT NULL AND p.team_id = me.team_id)
      )
  )
$$;

REVOKE ALL ON FUNCTION public.manages_employee(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manages_employee(text) TO authenticated;

-- ── attendance ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT USING (
  (SELECT public.is_super_admin())
  OR (
    organization_id = (SELECT public.auth_org_id())
    AND (
      (SELECT public.auth_role()) IN ('ADMIN', 'HR')
      OR employee_id = (SELECT auth.uid())::text
      OR public.manages_employee(employee_id)
    )
  )
);

-- ── leaves ──────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leaves_select" ON public.leaves;
CREATE POLICY "leaves_select" ON public.leaves FOR SELECT USING (
  (SELECT public.is_super_admin())
  OR (
    organization_id = (SELECT public.auth_org_id())
    AND (
      (SELECT public.auth_role()) IN ('ADMIN', 'HR')
      OR employee_id = (SELECT auth.uid())::text
      OR line_manager_id = (SELECT auth.uid())::text
      OR public.manages_employee(employee_id)
    )
  )
);

-- ── performance_reviews ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "perf_reviews_select" ON public.performance_reviews;
CREATE POLICY "perf_reviews_select" ON public.performance_reviews FOR SELECT USING (
  (SELECT public.is_super_admin())
  OR (
    organization_id = (SELECT public.auth_org_id())
    AND (
      (SELECT public.auth_role()) IN ('ADMIN', 'HR')
      OR employee_id = (SELECT auth.uid())::text
      OR line_manager_id = (SELECT auth.uid())::text
    )
  )
);

-- ── selfies (replaces 0048's select) ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "selfies_select" ON storage.objects;
CREATE POLICY "selfies_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'selfies' AND (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.storage_attendance_owner((storage.foldername(name))[1]) o
      WHERE o.organization_id = public.auth_org_id()
        AND (
          public.auth_role() IN ('ADMIN', 'HR')
          OR o.employee_id = auth.uid()::text
          OR public.manages_employee(o.employee_id)
        )
    )
  )
);

-- ── blog_posts, tutorials ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "blog_posts_select" ON public.blog_posts;
CREATE POLICY "blog_posts_select" ON public.blog_posts FOR SELECT USING (
  status = 'PUBLISHED' OR public.is_super_admin()
);
DROP POLICY IF EXISTS "tutorials_select" ON public.tutorials;
CREATE POLICY "tutorials_select" ON public.tutorials FOR SELECT USING (
  status = 'PUBLISHED' OR public.is_super_admin()
);
