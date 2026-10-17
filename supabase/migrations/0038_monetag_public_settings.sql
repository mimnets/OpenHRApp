-- Migration 0038: Public Monetag Settings Reader
-- 
-- Purpose: Allow anonymous users to read the two Monetag activation booleans
-- required for client-side ad gating. The Monetag loader runs in the browser
-- and needs to check if ads are enabled without requiring authentication.
--
-- Security: This function returns ONLY the two boolean flags (ipp_enabled, vignette_enabled).
-- No other settings, credentials, or admin data are exposed. The function reads
-- from the settings table where platform-level settings (organization_id = null)
-- are stored by Super Admins through the Ad Management interface.
--
-- Default behavior: If the settings don't exist or can't be read, the function
-- returns false for both flags (safe default-OFF behavior).

-- Create a public function that returns the two Monetag activation booleans
CREATE OR REPLACE FUNCTION public.get_monetag_settings()
RETURNS TABLE(ipp_enabled boolean, vignette_enabled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ipp_val boolean := false;
  vignette_val boolean := false;
  ipp_row record;
  vignette_row record;
BEGIN
  -- Read IPP enabled setting (platform-level, organization_id = null)
  SELECT value INTO ipp_row
  FROM public.settings
  WHERE key = 'monetag_ipp_enabled'
    AND organization_id IS NULL
  LIMIT 1;
  
  IF ipp_row IS NOT NULL AND ipp_row.value IS NOT NULL THEN
    -- The value is stored as JSONB, so extract the boolean
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
  
  -- Return the two booleans
  RETURN QUERY SELECT ipp_val, vignette_val;
END;
$$;

-- Grant execute permission to anonymous users (required for client-side access)
GRANT EXECUTE ON FUNCTION public.get_monetag_settings() TO anon;

-- Also grant to authenticated users (they may also view public pages)
GRANT EXECUTE ON FUNCTION public.get_monetag_settings() TO authenticated;

-- Add comment documenting the function's purpose and security model
COMMENT ON FUNCTION public.get_monetag_settings() IS
'Reads the two Monetag advertising activation booleans (ipp_enabled, vignette_enabled) from platform-level settings. Returns false for both if settings are missing or unreadable. This function is callable by anonymous users to support client-side ad gating. No other settings or credentials are exposed.';
