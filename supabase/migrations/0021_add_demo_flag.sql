-- Add demo mode columns to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS demo_reset_at timestamptz;

-- Index for efficient demo-org lookups by cron functions and demo-login
CREATE INDEX IF NOT EXISTS idx_organizations_is_demo ON public.organizations(is_demo);
