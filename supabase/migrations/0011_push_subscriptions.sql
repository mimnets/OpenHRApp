-- ============================================================
-- OpenHR — Push Notification Subscriptions
-- 0011_push_subscriptions.sql
--
-- Stores Web Push (VAPID) subscriptions per user.
-- One row per user per browser/device. Upsert on endpoint.
-- ============================================================

create table public.push_subscriptions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth         text not null,
  created      timestamptz not null default now(),
  updated      timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index idx_push_subs_org on public.push_subscriptions(organization_id);
create index idx_push_subs_user on public.push_subscriptions(user_id);

-- RLS
alter table public.push_subscriptions enable row level security;

-- Users can manage their own subscriptions
create policy "push_subs_own_select"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subs_own_insert"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subs_own_delete"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

create policy "push_subs_own_update"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

-- Service role (Edge Functions) can read all
create policy "push_subs_service_read"
  on public.push_subscriptions for select
  to service_role
  using (true);
