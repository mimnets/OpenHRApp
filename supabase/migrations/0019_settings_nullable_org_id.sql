-- Ensure organization_id allows NULL for platform-level settings (e.g. super admin theme, guide_help_links).
-- The partial unique indexes from 0006 already handle both null and non-null conflict resolution;
-- this migration just makes sure the column accepts NULLs.
ALTER TABLE public.settings ALTER COLUMN organization_id DROP NOT NULL;
