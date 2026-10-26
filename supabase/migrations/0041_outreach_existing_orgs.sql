-- ============================================================
-- OpenHRApp — Outreach: existing organizations as a customer segment
-- 0041_outreach_existing_orgs.sql
--
-- Organizations stay the single source of truth. Outreach reads them through
-- one SUPER_ADMIN-guarded aggregate RPC (nothing is copied or snapshotted),
-- and a prospect row is created only when the Super Admin explicitly chooses
-- to manage an organization, linked by organization_id (one per org).
-- ============================================================

-- ── Explicit link: at most one outreach record per organization ─────────────
alter table public.outreach_prospects
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
create unique index if not exists outreach_prospects_org_key
  on public.outreach_prospects (organization_id) where organization_id is not null;

-- ── Organization-level usage aggregates ─────────────────────────────────────
-- Counts and timestamps only: no employee names, selfies, locations, leave
-- reasons or per-person rows ever leave the database. The only person-level
-- value is the organization's registered admin contact (name + email), which
-- is the business contact the account was opened with.
create or replace function public.outreach_org_insights(p_days int default 30)
returns table (
  org_id               uuid,
  org_name             text,
  org_created          timestamptz,
  subscription_status  text,
  trial_end_date       timestamptz,
  subscription_expires timestamptz,
  is_demo              boolean,
  employee_count       int,
  attendance_total     int,
  attendance_recent    int,
  last_attendance_at   timestamptz,
  leave_total          int,
  leave_recent         int,
  last_leave_at        timestamptz,
  verified_payments    int,
  last_payment_at      timestamptz,
  admin_name           text,
  admin_email          text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365));
begin
  if not public.is_super_admin() then
    raise exception 'Only SUPER_ADMIN may read organization insights' using errcode = '42501';
  end if;

  return query
  with u as (
    select p.organization_id as oid, count(*)::int as n
    from public.profiles p
    where p.organization_id is not null and p.role <> 'SUPER_ADMIN'
    group by p.organization_id
  ), a as (
    select t.organization_id as oid, count(*)::int as n,
           count(*) filter (where t.created >= since)::int as recent, max(t.created) as last_at
    from public.attendance t group by t.organization_id
  ), l as (
    select v.organization_id as oid, count(*)::int as n,
           count(*) filter (where v.created >= since)::int as recent, max(v.created) as last_at
    from public.leaves v group by v.organization_id
  ), pay as (
    -- Paid = a donation the Super Admin approved with a real amount, not the
    -- subscription_status flag (which can be set by hand).
    select r.organization_id as oid, count(*)::int as n, max(coalesce(r.processed_at, r.updated)) as last_at
    from public.upgrade_requests r
    where r.request_type = 'DONATION' and r.status = 'APPROVED' and coalesce(r.donation_amount, 0) > 0
    group by r.organization_id
  ), adm as (
    -- Founding admin, preferring one who is still active.
    select distinct on (p.organization_id) p.organization_id as oid, p.name, p.email
    from public.profiles p
    where p.role = 'ADMIN' and p.organization_id is not null and p.email is not null
    order by p.organization_id, (p.status <> 'ACTIVE'), p.created
  )
  select o.id, o.name, o.created, o.subscription_status, o.trial_end_date, o.subscription_expires,
         coalesce(o.is_demo, false),
         coalesce(u.n, 0), coalesce(a.n, 0), coalesce(a.recent, 0), a.last_at,
         coalesce(l.n, 0), coalesce(l.recent, 0), l.last_at,
         coalesce(pay.n, 0), pay.last_at,
         adm.name, lower(adm.email)
  from public.organizations o
  left join u   on u.oid   = o.id
  left join a   on a.oid   = o.id
  left join l   on l.oid   = o.id
  left join pay on pay.oid = o.id
  left join adm on adm.oid = o.id
  order by o.created desc;
end;
$$;

revoke all on function public.outreach_org_insights(int) from public;
grant execute on function public.outreach_org_insights(int) to authenticated;

-- ── Account/service templates for existing customers ────────────────────────
insert into public.outreach_templates (key, name, subject, body, sort) values
('org_onboarding', 'Customer: onboarding check-in', 'Getting {{company_name}} set up on OpenHRApp',
'Hi {{first_name}},

Thanks for creating the {{company_name}} workspace on OpenHRApp. I''m checking in to make sure setup went smoothly: adding employees, shifts, and the first check-ins usually take about ten minutes.

If anything got in the way, reply to this email and I''ll help you finish it.

{{sender_signature}}', 100),
('org_feedback', 'Customer: feedback request', 'How is OpenHRApp working for {{company_name}}?',
'Hi {{first_name}},

You have been using OpenHRApp at {{company_name}} for a while, and I''d value your honest view: what works, what is frustrating, and what is missing for your team.

Even a two-line reply helps me decide what to fix next.

{{sender_signature}}', 110),
('org_subscription', 'Customer: subscription discussion', 'Your OpenHRApp plan for {{company_name}}',
'Hi {{first_name}},

I wanted to talk about the plan for {{company_name}} so nothing interrupts your team''s attendance and leave records. I''m happy to explain the options or answer questions before you decide.

Would a short call or a reply here work?

{{sender_signature}}', 120)
on conflict (key) do nothing;
