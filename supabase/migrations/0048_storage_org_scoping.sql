-- Migration 0048: keep selfies, avatars and org logos inside their own organization
--
-- 0005 checked roles but not organizations, so:
--   * an ADMIN/HR/MANAGER of any organization could list and download every organization's
--     check-in selfies;
--   * any signed-in user could upload into any selfie folder;
--   * an ADMIN/HR of one organization could replace or delete another organization's avatars,
--     and an ADMIN its logo; any member of any organization could read every avatar.
--
-- Folder layout (unchanged): selfies/<attendance id>/selfie.webp, avatars/<profile id>/...,
-- org-logos/<organization id>/logo.*. Edge functions use the service role and bypass these.
-- Org logos stay publicly readable (the bucket is public; logos show on the landing page).
--
-- Apply by hand in the Supabase SQL Editor (same as 0040-0047).

-- Lookups run as definer so the policies do not depend on the attendance/profiles RLS.
CREATE OR REPLACE FUNCTION public.storage_attendance_owner(folder text)
RETURNS TABLE (organization_id uuid, employee_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.organization_id, a.employee_id FROM attendance a WHERE a.id::text = folder
$$;

CREATE OR REPLACE FUNCTION public.storage_profile_org(folder text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.organization_id FROM profiles p WHERE p.id::text = folder
$$;

REVOKE ALL ON FUNCTION public.storage_attendance_owner(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.storage_profile_org(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_attendance_owner(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_profile_org(text) TO authenticated;

-- ── selfies ─────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "selfies_select" ON storage.objects;
DROP POLICY IF EXISTS "selfies_insert" ON storage.objects;
DROP POLICY IF EXISTS "selfies_update" ON storage.objects;
DROP POLICY IF EXISTS "selfies_delete" ON storage.objects;

-- ADMIN/HR/MANAGER of the record's organization, or the employee who checked in.
CREATE POLICY "selfies_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'selfies' AND (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.storage_attendance_owner((storage.foldername(name))[1]) o
      WHERE o.organization_id = public.auth_org_id()
        AND (public.auth_role() IN ('ADMIN', 'HR', 'MANAGER') OR o.employee_id = auth.uid()::text)
    )
  )
);
-- Only into the folder of the uploader's own attendance record (created before the upload).
CREATE POLICY "selfies_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'selfies' AND EXISTS (
    SELECT 1 FROM public.storage_attendance_owner((storage.foldername(name))[1]) o
    WHERE o.employee_id = auth.uid()::text AND o.organization_id = public.auth_org_id()
  )
);
CREATE POLICY "selfies_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'selfies' AND (
    public.is_super_admin()
    OR (public.auth_role() IN ('ADMIN', 'HR') AND EXISTS (
      SELECT 1 FROM public.storage_attendance_owner((storage.foldername(name))[1]) o
      WHERE o.organization_id = public.auth_org_id()
    ))
  )
);
CREATE POLICY "selfies_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'selfies' AND (
    public.is_super_admin()
    OR (public.auth_role() IN ('ADMIN', 'HR') AND EXISTS (
      SELECT 1 FROM public.storage_attendance_owner((storage.foldername(name))[1]) o
      WHERE o.organization_id = public.auth_org_id()
    ))
  )
);

-- ── avatars ─────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;

-- Own avatar, or colleagues in the same organization.
CREATE POLICY "avatars_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'avatars' AND (
    public.is_super_admin()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.storage_profile_org((storage.foldername(name))[1]) = public.auth_org_id()
  )
);
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND (
    public.is_super_admin()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (public.auth_role() IN ('ADMIN', 'HR')
        AND public.storage_profile_org((storage.foldername(name))[1]) = public.auth_org_id())
  )
);
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND (
    public.is_super_admin()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (public.auth_role() IN ('ADMIN', 'HR')
        AND public.storage_profile_org((storage.foldername(name))[1]) = public.auth_org_id())
  )
);
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND (
    public.is_super_admin()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (public.auth_role() IN ('ADMIN', 'HR')
        AND public.storage_profile_org((storage.foldername(name))[1]) = public.auth_org_id())
  )
);

-- ── org-logos (read stays public) ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "org_logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "org_logos_update" ON storage.objects;
DROP POLICY IF EXISTS "org_logos_delete" ON storage.objects;

CREATE POLICY "org_logos_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'org-logos' AND (
    public.is_super_admin()
    OR (public.auth_role() = 'ADMIN' AND (storage.foldername(name))[1] = public.auth_org_id()::text)
  )
);
CREATE POLICY "org_logos_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'org-logos' AND (
    public.is_super_admin()
    OR (public.auth_role() = 'ADMIN' AND (storage.foldername(name))[1] = public.auth_org_id()::text)
  )
);
CREATE POLICY "org_logos_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'org-logos' AND (
    public.is_super_admin()
    OR (public.auth_role() = 'ADMIN' AND (storage.foldername(name))[1] = public.auth_org_id()::text)
  )
);
