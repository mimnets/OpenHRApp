-- ============================================================
-- OpenHR — Broadcast Audit Log
-- 0012_broadcasts.sql
--
-- Records every Super Admin push broadcast: who sent it, target,
-- counts. Service role only writes; SUPER_ADMIN reads via RPC or
-- service-role Edge Function.
-- ============================================================

create table public.broadcasts (
  id              uuid primary key default gen_random_uuid(),
  sent_by         uuid not null references auth.users(id) on delete set null,
  sent_by_name    text,
  title           text not null,
  body            text not null,
  url             text,
  icon            text,
  target_type     text not null check (target_type in ('ALL','ORG','ROLE','USER')),
  target_value    text,
  recipient_count int  not null default 0,
  delivered_count int  not null default 0,
  failed_count    int  not null default 0,
  stale_cleaned   int  not null default 0,
  created         timestamptz not null default now()
);

create index idx_broadcasts_created on public.broadcasts(created desc);
create index idx_broadcasts_sent_by on public.broadcasts(sent_by);

-- RLS
alter table public.broadcasts enable row level security;

-- Service role full access (Edge Function writes + reads for history list)
create policy "broadcasts_service_all"
  on public.broadcasts for all
  to service_role
  using (true)
  with check (true);

-- SUPER_ADMIN can read history (role lookup via profiles)
create policy "broadcasts_superadmin_read"
  on public.broadcasts for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'SUPER_ADMIN'
    )
  );
