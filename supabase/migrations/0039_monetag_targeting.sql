-- Migration 0039: Monetag Page Targeting
-- 
-- Purpose: Extend the public Monetag settings RPC to return page-group targeting
-- for both IPP and Vignette formats. This allows the Super Admin to control which
-- page groups are eligible for advertising independently for each format.
--
-- Security: This function returns ONLY the activation booleans and targeting objects.
-- No other settings, credentials, or admin data are exposed. The function reads
-- from the settings table where platform-level settings (organization_id = null)
-- are stored by Super Admins through the Ad Management interface.
--
-- Default behavior: If the settings don't exist or can't be read, the function
-- returns false for both activations and default targeting objects (IPP: guides-articles
-- only; Vignette: all OFF). This preserves backward compatibility.

-- Drop the existing function to recreate it with the new signature
DROP FUNCTION IF EXISTS public.get_monetag_settings();

-- Create the updated function that returns activation booleans and targeting
CREATE OR REPLACE FUNCTION public.get_monetag_settings()
RETURNS TABLE(
  ipp_enabled boolean,
  vignette_enabled boolean,
  ipp_targeting jsonb,
  vignette_targeting jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ipp_val boolean := false;
  vignette_val boolean := false;
  ipp_targeting_val jsonb := '{"guides-listing":false,"guides-articles":true,"blog-listing":false,"blog-articles":false,"landing-page":false}'::jsonb;
  vignette_targeting_val jsonb := '{"guides-listing":false,"guides-articles":false,"blog-listing":false,"blog-articles":false,"landing-page":false}'::jsonb;
  ipp_row record;
  vignette_row record;
  ipp_targeting_row record;
  vignette_targeting_row record;
BEGIN
  -- Read IPP enabled setting (platform-level, organization_id = null)
  SELECT value INTO ipp_row
  FROM public.settings
  WHERE key = 'monetag_ipp_enabled'
    AND organization_id IS NULL
  LIMIT 1;
  
  IF ipp_row IS NOT NULL AND ipp_row.value IS NOT NULL THEN
    BEGIN
      ipp_val := (ipp_row.value)::boolean;
    EXCEPTION WHEN OTHERS THEN
      ipp_val := false;
    END;
  END IF;
  
  -- Read Vignette enabled setting (platform-level, organization_id = null)
  SELECT value INTO vignette_row
  FROM public.settings
  WHERE key = 'monetag_vignette_enabled'
    AND organization_id IS NULL
  LIMIT 1;
  
  IF vignette_row IS NOT NULL AND vignette_row.value IS NOT NULL THEN
    BEGIN
      vignette_val := (vignette_row.value)::boolean;
    EXCEPTION WHEN OTHERS THEN
      vignette_val := false;
    END;
  END IF;
  
  -- Read IPP targeting setting (platform-level, organization_id = null)
  SELECT value INTO ipp_targeting_row
  FROM public.settings
  WHERE key = 'monetag_ipp_targeting'
    AND organization_id IS NULL
  LIMIT 1;
  
  IF ipp_targeting_row IS NOT NULL AND ipp_targeting_row.value IS NOT NULL THEN
    BEGIN
      ipp_targeting_val := ipp_targeting_row.value;
    EXCEPTION WHEN OTHERS THEN
      -- Keep default targeting on parse error
      ipp_targeting_val := '{"guides-listing":false,"guides-articles":true,"blog-listing":false,"blog-articles":false,"landing-page":false}'::jsonb;
    END;
  END IF;
  
  -- Read Vignette targeting setting (platform-level, organization_id = null)
  SELECT value INTO vignette_targeting_row
  FROM public.settings
  WHERE key = 'monetag_vignette_targeting'
    AND organization_id IS NULL
  LIMIT 1;
  
  IF vignette_targeting_row IS NOT NULL AND vignette_targeting_row.value IS NOT NULL THEN
    BEGIN
      vignette_targeting_val := vignette_targeting_row.value;
    EXCEPTION WHEN OTHERS THEN
      -- Keep default targeting on parse error
      vignette_targeting_val := '{"guides-listing":false,"guides-articles":false,"blog-listing":false,"blog-articles":false,"landing-page":false}'::jsonb;
    END;
  END IF;
  
  -- Return the activation booleans and targeting objects
  RETURN QUERY SELECT ipp_val, vignette_val, ipp_targeting_val, vignette_targeting_val;
END;
$$;

-- Grant execute permission to anonymous users (required for client-side access)
GRANT EXECUTE ON FUNCTION public.get_monetag_settings() TO anon;

-- Also grant to authenticated users (they may also view public pages)
GRANT EXECUTE ON FUNCTION public.get_monetag_settings() TO authenticated;

-- Add comment documenting the function's purpose and security model
COMMENT ON FUNCTION public.get_monetag_settings() IS
'Reads the Monetag advertising activation booleans (ipp_enabled, vignette_enabled) and page-group targeting objects (ipp_targeting, vignette_targeting) from platform-level settings. Returns safe defaults if settings are missing or unreadable. This function is callable by anonymous users to support client-side ad gating. No other settings or credentials are exposed.';
