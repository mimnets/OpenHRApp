-- Migration 0046: check-in screen placement
--
-- Adds 'attendance' (the ad below the camera on the check-in / check-out screen) to the
-- placement whitelist. Opt-in: off until switched on in Super Admin. Otherwise identical to 0045.
--
-- Apply by hand in the Supabase SQL Editor (same as 0040-0045).

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
  sizes text[] := ARRAY['300x250', '320x50', '468x60', '728x90', '320x100'];
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
    'settings', 'guides', 'blog', 'landing', 'attendance'
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
      'keySize', CASE WHEN cfg->'adsterra'->>'keySize' = ANY(sizes) THEN cfg->'adsterra'->>'keySize' ELSE '300x250' END,
      'keyWide', COALESCE(cfg->'adsterra'->>'keyWide', ''),
      'keyWideSize', CASE WHEN cfg->'adsterra'->>'keyWideSize' = ANY(sizes) THEN cfg->'adsterra'->>'keyWideSize' ELSE '728x90' END,
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
