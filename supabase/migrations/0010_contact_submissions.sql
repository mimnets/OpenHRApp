-- Contact form submissions from landing page (public, no auth required)
create table public.contact_submissions (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  email      text not null,
  subject    text not null,
  message    text not null,
  created    timestamptz not null default now()
);

-- Public can insert, only superadmins can read
alter table public.contact_submissions enable row level security;

create policy "contact_submissions_insert" on public.contact_submissions
  for insert with check (true);

create policy "contact_submissions_select" on public.contact_submissions
  for select using (public.is_super_admin());
