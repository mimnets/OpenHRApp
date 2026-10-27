-- Migration 0044: per-placement switches and desktop-size creatives for the ad frame
--
-- Adds adsterra.keyWide (728x90 banner key) and zoho.imgWide (728x90 image) for desktop;
-- adsterra.key / zoho.img are now the 300x250 creatives used on phones.
-- Extends get_ad_frame_settings() (0042/0043) with a 'placements' object: one boolean per
-- known placement, whitelisted below. Keep the list in sync with AD_PLACEMENTS in
-- src/components/ads/AdBanner.tsx. 'employee_dashboard' defaults to true (the original
-- placement); every other placement defaults to false until switched on in Super Admin.
-- settings.value is TEXT, so it is cast to jsonb (see 0043).
--
-- Apply by hand in the Supabase SQL Editor (same as 0040-0043).

CREATE OR REPLACE FUNCTION public.get_ad_frame_settings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw text;
  cfg jsonb;
  pl jsonb;
  placements jsonb := '{}'::jsonb;
  name text;
BEGIN
  SELECT value INTO raw
  FROM public.settings
  WHERE key = 'ad_frame_config' AND organization_id IS NULL
  LIMIT 1;

  BEGIN
    cfg := raw::jsonb;
  EXCEPTION WHEN OTHERS THEN
    cfg := NULL;
  END;

  IF cfg IS NULL OR jsonb_typeof(cfg) <> 'object' THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;

  pl := CASE WHEN jsonb_typeof(cfg->'placements') = 'object' THEN cfg->'placements' ELSE '{}'::jsonb END;
  FOREACH name IN ARRAY ARRAY[
    'employee_dashboard', 'team_dashboards', 'announcements', 'sidebar', 'notifications',
    'settings', 'guides', 'blog', 'landing'
  ] LOOP
    placements := placements || jsonb_build_object(
      name,
      COALESCE((pl->>name)::boolean, name = 'employee_dashboard')
    );
  END LOOP;

  RETURN jsonb_build_object(
    'enabled', COALESCE((cfg->>'enabled')::boolean, false),
    'adsterra', jsonb_build_object(
      'enabled', COALESCE((cfg->'adsterra'->>'enabled')::boolean, false),
      'key', COALESCE(cfg->'adsterra'->>'key', ''),
      'keyWide', COALESCE(cfg->'adsterra'->>'keyWide', ''),
      'weight', COALESCE((cfg->'adsterra'->>'weight')::int, 0)
    ),
    'aads', jsonb_build_object(
      'enabled', COALESCE((cfg->'aads'->>'enabled')::boolean, false),
      'unit', COALESCE(cfg->'aads'->>'unit', ''),
      'weight', COALESCE((cfg->'aads'->>'weight')::int, 0)
    ),
    'zoho', jsonb_build_object(
      'enabled', COALESCE((cfg->'zoho'->>'enabled')::boolean, false),
      'img', COALESCE(cfg->'zoho'->>'img', ''),
      'imgWide', COALESCE(cfg->'zoho'->>'imgWide', ''),
      'href', COALESCE(cfg->'zoho'->>'href', ''),
      'weight', COALESCE((cfg->'zoho'->>'weight')::int, 0)
    ),
    'placements', placements
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('enabled', false);
END;
$$;

REVOKE ALL ON FUNCTION public.get_ad_frame_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ad_frame_settings() TO anon, authenticated;
