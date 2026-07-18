-- Contact form submissions from landing page (public, no auth required)
-- Anti-spam: rate-limited by email (3/hr, 10/day) via helper function,
-- honeypot column for bot detection.

-- ── Table ──────────────────────────────────────────────────────────────────────
create table public.contact_submissions (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  email      text not null,
  subject    text not null,
  message    text not null,
  honeypot   text not null default '',              -- hidden field; bots fill, humans don't
  created    timestamptz not null default now()
);

create index idx_contact_submissions_email_created
  on public.contact_submissions(email, created);

-- ── Rate-limit helper (SECURITY DEFINER so RLS policy can call it) ──────────────
create or replace function public.check_contact_rate_limit(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    (select count(*) from public.contact_submissions
     where email = p_email
     and created > now() - interval '1 hour') < 3
    and
    (select count(*) from public.contact_submissions
     where email = p_email
     and created > now() - interval '1 day') < 10
  );
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.contact_submissions enable row level security;

-- Anyone can insert provided: honeypot is empty AND rate limits not exceeded
create policy "contact_submissions_insert" on public.contact_submissions
  for insert with check (
    honeypot = ''
    and public.check_contact_rate_limit(email)
  );

-- Only super admins can read submissions
create policy "contact_submissions_select" on public.contact_submissions
  for select using (public.is_super_admin());
