-- Migration 0043: fix get_ad_frame_settings() for the text settings.value column
--
-- 0042 read settings.value as jsonb, but the column is text (0001). The type error was caught
-- by the function's own EXCEPTION handler, so it always returned {"enabled": false}. This
-- version casts the stored text to jsonb; anything that is not a JSON object still returns
-- {"enabled": false}. Output shape and grants are unchanged.
--
-- Apply by hand in the Supabase SQL Editor (same as 0040-0042).

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
