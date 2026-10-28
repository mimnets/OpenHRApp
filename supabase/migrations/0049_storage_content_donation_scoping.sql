-- Migration 0049: lock down blog/guide images and donation screenshots
--
-- 0005 let any signed-in user (any organization) upload or overwrite content-images, the
-- public blog and guide images, and let an ADMIN of any organization replace any
-- organization's donation screenshot. Blog posts and guides are written only by Super Admins
-- (blog_posts/tutorials insert policies), so their images are too. Donation screenshots are
-- uploaded by ADMIN/HR from the Upgrade page into <their organization id>/.
--
-- Apply by hand in the Supabase SQL Editor (same as 0040-0048).

-- ── content-images (read stays public) ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "content_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "content_images_update" ON storage.objects;
DROP POLICY IF EXISTS "content_images_delete" ON storage.objects;

CREATE POLICY "content_images_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'content-images' AND public.is_super_admin()
);
CREATE POLICY "content_images_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'content-images' AND public.is_super_admin()
);
CREATE POLICY "content_images_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'content-images' AND public.is_super_admin()
);

-- ── donation-screenshots (select and delete unchanged) ──────────────────────────────────────
DROP POLICY IF EXISTS "donation_screenshots_insert" ON storage.objects;
DROP POLICY IF EXISTS "donation_screenshots_update" ON storage.objects;

CREATE POLICY "donation_screenshots_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'donation-screenshots' AND (
    public.is_super_admin()
    OR (public.auth_role() IN ('ADMIN', 'HR') AND (storage.foldername(name))[1] = public.auth_org_id()::text)
  )
);
CREATE POLICY "donation_screenshots_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'donation-screenshots' AND public.is_super_admin()
);
