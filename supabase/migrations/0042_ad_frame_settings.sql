-- Migration 0042: Dashboard ad frame settings
--
-- Purpose: a public, read-only RPC that returns the dashboard ad frame configuration
-- (master switch plus Adsterra / A-Ads / Zoho entries). It is read by the app, to decide
-- whether to render the frame, and by the standalone ad page on ads.openhrapp.com, to pick
-- an ad. Super Admins write it through Super Admin -> Ads as the platform-level setting
-- 'ad_frame_config' (organization_id = null).
--
-- Security: returns ONLY whitelisted fields, each type-checked. Nothing else from the
-- settings table is exposed. A missing or malformed row returns {"enabled": false}.
--
-- Apply by hand in the Supabase SQL Editor (same as 0040/0041).

CREATE OR REPLACE FUNCTION public.get_ad_frame_settings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
BEGIN
  SELECT CASE WHEN jsonb_typeof(value) = 'object' THEN value ELSE NULL END INTO cfg
  FROM public.settings
  WHERE key = 'ad_frame_config' AND organization_id IS NULL
  LIMIT 1;

  IF cfg IS NULL THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;

  RETURN jsonb_build_object(
    'enabled', COALESCE((cfg->>'enabled')::boolean, false),
    'adsterra', jsonb_build_object(
      'enabled', COALESCE((cfg->'adsterra'->>'enabled')::boolean, false),
      'key', COALESCE(cfg->'adsterra'->>'key', ''),
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
      'href', COALESCE(cfg->'zoho'->>'href', ''),
      'weight', COALESCE((cfg->'zoho'->>'weight')::int, 0)
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('enabled', false);
END;
$$;

REVOKE ALL ON FUNCTION public.get_ad_frame_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ad_frame_settings() TO anon, authenticated;
