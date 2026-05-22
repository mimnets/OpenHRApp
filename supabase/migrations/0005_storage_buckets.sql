-- ============================================================
-- OpenHR — Storage Buckets + RLS Policies
-- 0005_storage_buckets.sql
-- ============================================================

-- ── Buckets ──────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',               'avatars',               false, 5242880,  array['image/jpeg','image/png','image/webp','image/gif']),
  ('org-logos',             'org-logos',             true,  5242880,  array['image/jpeg','image/png','image/webp','image/gif']),
  ('selfies',               'selfies',               false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('content-images',        'content-images',        true,  10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('donation-screenshots',  'donation-screenshots',  false, 5242880,  array['image/jpeg','image/png','image/webp','image/gif']),
  ('showcase-logos',        'showcase-logos',        true,  5242880,  array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- ── avatars (private — user reads own, admin reads org) ──────────────────────
create policy "avatars_select" on storage.objects for select using (
  bucket_id = 'avatars' and (
    public.is_super_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or public.auth_org_id() is not null  -- any authed org member can view avatars
  )
);
create policy "avatars_insert" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.uid() is not null and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.auth_role() in ('ADMIN','HR','SUPER_ADMIN')
  )
);
create policy "avatars_update" on storage.objects for update using (
  bucket_id = 'avatars' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.auth_role() in ('ADMIN','HR','SUPER_ADMIN')
  )
);
create policy "avatars_delete" on storage.objects for delete using (
  bucket_id = 'avatars' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.auth_role() in ('ADMIN','HR','SUPER_ADMIN')
  )
);

-- ── org-logos (public read, ADMIN+ write) ────────────────────────────────────
create policy "org_logos_select" on storage.objects for select using (
  bucket_id = 'org-logos'
);
create policy "org_logos_insert" on storage.objects for insert with check (
  bucket_id = 'org-logos' and auth.uid() is not null and
  public.auth_role() in ('ADMIN','SUPER_ADMIN')
);
create policy "org_logos_update" on storage.objects for update using (
  bucket_id = 'org-logos' and
  public.auth_role() in ('ADMIN','SUPER_ADMIN')
);
create policy "org_logos_delete" on storage.objects for delete using (
  bucket_id = 'org-logos' and
  public.auth_role() in ('ADMIN','SUPER_ADMIN')
);

-- ── selfies (private — org members with ADMIN/HR/MANAGER read, uploader write)
create policy "selfies_select" on storage.objects for select using (
  bucket_id = 'selfies' and (
    public.is_super_admin()
    or public.auth_role() in ('ADMIN','HR','MANAGER')
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);
create policy "selfies_insert" on storage.objects for insert with check (
  bucket_id = 'selfies' and auth.uid() is not null
);
create policy "selfies_update" on storage.objects for update using (
  bucket_id = 'selfies' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.auth_role() in ('ADMIN','HR','SUPER_ADMIN')
  )
);
create policy "selfies_delete" on storage.objects for delete using (
  bucket_id = 'selfies' and
  public.auth_role() in ('ADMIN','HR','SUPER_ADMIN')
);

-- ── content-images (public read, authed write) ───────────────────────────────
create policy "content_images_select" on storage.objects for select using (
  bucket_id = 'content-images'
);
create policy "content_images_insert" on storage.objects for insert with check (
  bucket_id = 'content-images' and auth.uid() is not null
);
create policy "content_images_update" on storage.objects for update using (
  bucket_id = 'content-images' and auth.uid() is not null
);
create policy "content_images_delete" on storage.objects for delete using (
  bucket_id = 'content-images' and
  public.auth_role() in ('ADMIN','HR','SUPER_ADMIN')
);

-- ── donation-screenshots (private — uploader + SUPER_ADMIN) ─────────────────
create policy "donation_screenshots_select" on storage.objects for select using (
  bucket_id = 'donation-screenshots' and (
    public.is_super_admin()
    or public.auth_org_id()::text = (storage.foldername(name))[1]
  )
);
create policy "donation_screenshots_insert" on storage.objects for insert with check (
  bucket_id = 'donation-screenshots' and auth.uid() is not null
);
create policy "donation_screenshots_update" on storage.objects for update using (
  bucket_id = 'donation-screenshots' and
  public.auth_role() in ('ADMIN','SUPER_ADMIN')
);
create policy "donation_screenshots_delete" on storage.objects for delete using (
  bucket_id = 'donation-screenshots' and public.is_super_admin()
);

-- ── showcase-logos (public read, SUPER_ADMIN write) ─────────────────────────
create policy "showcase_logos_select" on storage.objects for select using (
  bucket_id = 'showcase-logos'
);
create policy "showcase_logos_write" on storage.objects for all using (
  bucket_id = 'showcase-logos' and public.is_super_admin()
);
