-- ============================================================
-- OpenHRApp — Super Admin outreach CRM (customer validation)
-- 0040_outreach_crm.sql
--
-- Sales prospects are NOT HR records: nothing here references profiles,
-- organizations or employees, and every table is readable and writable only
-- by SUPER_ADMIN. Suppression reuses public.email_suppressions, so the
-- existing one-click unsubscribe function stops outreach too.
-- ============================================================

-- ── Campaigns ───────────────────────────────────────────────────────────────
create table if not exists public.outreach_campaigns (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(name) between 1 and 120),
  length_days      int  not null check (length_days in (30, 60)),
  start_date       date not null,
  end_date         date not null,
  industry_target  text,
  goal_contacts    int not null default 0 check (goal_contacts >= 0),
  goal_interviews  int not null default 0 check (goal_interviews >= 0),
  goal_demos       int not null default 0 check (goal_demos >= 0),
  goal_pilots      int not null default 0 check (goal_pilots >= 0),
  goal_paying      int not null default 0 check (goal_paying >= 0),
  proposed_price   numeric(10,2) not null default 0 check (proposed_price >= 0),
  created          timestamptz not null default now(),
  constraint outreach_campaign_dates check (end_date = start_date + length_days)
);

-- ── Prospects ───────────────────────────────────────────────────────────────
create table if not exists public.outreach_prospects (
  id                     uuid primary key default gen_random_uuid(),
  campaign_id            uuid references public.outreach_campaigns(id) on delete set null,
  company_name           text not null check (length(company_name) between 1 and 200),
  industry               text,
  contact_name           text,
  email                  text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  website                text,
  city                   text,
  employee_count         int check (employee_count is null or employee_count >= 0),
  contact_source         text,
  -- Legal basis for contacting. UNVERIFIED (the default) can never be emailed.
  outreach_basis         text not null default 'UNVERIFIED' check (outreach_basis in
                           ('UNVERIFIED','PUBLISHED_BUSINESS_CONTACT','REFERRAL',
                            'INBOUND_INQUIRY','EXISTING_RELATIONSHIP','OPTED_IN')),
  current_hr_method      text,
  primary_problem        text,
  status                 text not null default 'NEW' check (status in
                           ('NEW','QUALIFIED','CONTACTED','REPLIED','INTERESTED','DEMO',
                            'PILOT','PAYING','NOT_INTERESTED','UNSUBSCRIBED')),
  last_contacted_at      timestamptz,
  next_follow_up         date,
  notes                  text,
  do_not_contact         boolean not null default false,
  archived               boolean not null default false,
  interview_completed_at timestamptz,
  demo_scheduled_at      timestamptz,
  demo_completed_at      timestamptz,
  pilot_started_at       timestamptz,
  paid_at                timestamptz,
  confirmed_mrr          numeric(10,2) check (confirmed_mrr is null or confirmed_mrr >= 0),
  created                timestamptz not null default now(),
  updated                timestamptz not null default now()
);
create unique index if not exists outreach_prospects_email_key on public.outreach_prospects (email);
create index if not exists outreach_prospects_campaign_idx on public.outreach_prospects (campaign_id);

-- ── Templates ───────────────────────────────────────────────────────────────
-- Separate from email_templates: those drive the lifecycle cron by audience.
create table if not exists public.outreach_templates (
  id        uuid primary key default gen_random_uuid(),
  key       text not null unique check (key ~ '^[a-z][a-z0-9_]{2,49}$'),
  name      text not null,
  subject   text not null,
  body      text not null,
  sort      int  not null default 0,
  updated   timestamptz not null default now()
);

-- ── Messages (outbound ledger + recorded replies) ───────────────────────────
create table if not exists public.outreach_messages (
  id                   uuid primary key default gen_random_uuid(),
  prospect_id          uuid not null references public.outreach_prospects(id) on delete cascade,
  direction            text not null default 'OUTBOUND' check (direction in ('OUTBOUND','INBOUND')),
  template_key         text,
  subject              text,
  body                 text,
  status               text not null check (status in
                         ('DRAFT','SENDING','SENT','DELIVERED','BOUNCED','FAILED','RECEIVED')),
  sentiment            text check (sentiment in ('POSITIVE','NEUTRAL','NEGATIVE')),
  recipient_email      text,
  idempotency_key      text unique,
  provider_message_id  text,
  sent_at              timestamptz,
  error                text,
  created_by           uuid,
  created              timestamptz not null default now()
);
create index if not exists outreach_messages_prospect_idx on public.outreach_messages (prospect_id, created desc);
create index if not exists outreach_messages_sent_idx on public.outreach_messages (created desc) where direction = 'OUTBOUND';

-- ── Follow-up tasks ─────────────────────────────────────────────────────────
create table if not exists public.outreach_tasks (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid not null references public.outreach_prospects(id) on delete cascade,
  due_date     date not null,
  template_key text,
  note         text,
  status       text not null default 'OPEN' check (status in ('OPEN','DONE','CANCELLED')),
  created      timestamptz not null default now()
);
create index if not exists outreach_tasks_open_idx on public.outreach_tasks (due_date) where status = 'OPEN';

-- ── RLS: SUPER_ADMIN only ───────────────────────────────────────────────────
alter table public.outreach_campaigns enable row level security;
alter table public.outreach_prospects enable row level security;
alter table public.outreach_templates enable row level security;
alter table public.outreach_messages  enable row level security;
alter table public.outreach_tasks     enable row level security;

drop policy if exists "outreach_campaigns_all" on public.outreach_campaigns;
create policy "outreach_campaigns_all" on public.outreach_campaigns
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "outreach_prospects_all" on public.outreach_prospects;
create policy "outreach_prospects_all" on public.outreach_prospects
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "outreach_templates_all" on public.outreach_templates;
create policy "outreach_templates_all" on public.outreach_templates
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "outreach_tasks_all" on public.outreach_tasks;
create policy "outreach_tasks_all" on public.outreach_tasks
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- The send ledger is append-only from the dashboard: a super admin may write
-- drafts and manually recorded replies, but only the service-role edge
-- function can produce SENDING/SENT/FAILED rows. A sent record you can edit
-- is not a record.
drop policy if exists "outreach_messages_select" on public.outreach_messages;
create policy "outreach_messages_select" on public.outreach_messages
  for select using (public.is_super_admin());

drop policy if exists "outreach_messages_insert" on public.outreach_messages;
create policy "outreach_messages_insert" on public.outreach_messages
  for insert with check (
    public.is_super_admin() and (
      (direction = 'OUTBOUND' and status = 'DRAFT' and idempotency_key is null and provider_message_id is null and sent_at is null)
      or (direction = 'INBOUND' and status = 'RECEIVED')
    )
  );

drop policy if exists "outreach_messages_update_draft" on public.outreach_messages;
create policy "outreach_messages_update_draft" on public.outreach_messages
  for update using (public.is_super_admin() and status = 'DRAFT')
  with check (public.is_super_admin() and status = 'DRAFT' and idempotency_key is null and provider_message_id is null);

drop policy if exists "outreach_messages_delete_draft" on public.outreach_messages;
create policy "outreach_messages_delete_draft" on public.outreach_messages
  for delete using (public.is_super_admin() and status = 'DRAFT');

-- ── Stop rules ──────────────────────────────────────────────────────────────
-- Follow-ups stop on reply, unsubscribe, bounce, closure or conversion. Done
-- in the database so it holds no matter which path changed the prospect,
-- including the public unsubscribe function.
create or replace function public.outreach_stop_followups()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated := now();
  if (new.status in ('REPLIED','NOT_INTERESTED','UNSUBSCRIBED','PAYING')
        and new.status is distinct from old.status)
     or (new.do_not_contact and not old.do_not_contact)
     or (new.archived and not old.archived) then
    update public.outreach_tasks set status = 'CANCELLED'
      where prospect_id = new.id and status = 'OPEN';
    new.next_follow_up := null;
  end if;
  return new;
end $$;

drop trigger if exists outreach_prospects_stop on public.outreach_prospects;
create trigger outreach_prospects_stop before update on public.outreach_prospects
  for each row execute function public.outreach_stop_followups();

-- A recorded reply moves an early-stage prospect to REPLIED (which fires the
-- stop rule above) and records the contact date.
create or replace function public.outreach_on_reply()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.direction = 'INBOUND' then
    update public.outreach_prospects
      set status = case when status in ('NEW','QUALIFIED','CONTACTED') then 'REPLIED' else status end,
          next_follow_up = null
      where id = new.prospect_id;
    update public.outreach_tasks set status = 'CANCELLED'
      where prospect_id = new.prospect_id and status = 'OPEN';
  end if;
  return new;
end $$;

drop trigger if exists outreach_messages_reply on public.outreach_messages;
create trigger outreach_messages_reply after insert on public.outreach_messages
  for each row execute function public.outreach_on_reply();

-- Any suppression (unsubscribe link, complaint, bounce, manual) marks the
-- matching prospect do-not-contact.
create or replace function public.outreach_on_suppression()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.outreach_prospects
    set do_not_contact = true,
        status = case when new.reason in ('UNSUBSCRIBED','COMPLAINT') then 'UNSUBSCRIBED' else status end
    where email = lower(new.email);
  return new;
end $$;

drop trigger if exists email_suppressions_outreach on public.email_suppressions;
create trigger email_suppressions_outreach after insert or update on public.email_suppressions
  for each row execute function public.outreach_on_suppression();

-- ── Starter templates ───────────────────────────────────────────────────────
-- Plain text. Variables: {{first_name}} {{contact_name}} {{company_name}}
-- {{industry}} {{city}} {{primary_problem}} {{current_hr_method}} {{sender_signature}}
insert into public.outreach_templates (key, name, subject, body, sort) values
('initial_intro', 'Initial introduction', 'Attendance and leave at {{company_name}}',
'Hi {{first_name}},

I''m building OpenHRApp, a simple HR tool for teams like {{company_name}}: staff check in and out from their phones, apply for leave, and see their own records, while the admin side stays in one place instead of spreadsheets and chat threads.

I''m not asking you to buy anything. I''d value 15 minutes to hear how you handle attendance and leave today, and whether this would help at all.

Would a short call next week work?

{{sender_signature}}', 10),
('problem_discovery', 'HR problem discovery', 'Quick question about {{primary_problem}}',
'Hi {{first_name}},

When I talk to companies of your size, {{primary_problem}} comes up often. I''m curious how {{company_name}} handles it today, and what is most frustrating about the current approach ({{current_hr_method}}).

A two-line reply would genuinely help me understand the problem better.

{{sender_signature}}', 20),
('interview_invite', 'Interview invitation', '15 minutes on how {{company_name}} runs HR?',
'Hi {{first_name}},

I''m speaking with a small number of {{industry}} businesses to understand how they manage attendance, leave and employee requests. This is a research conversation, not a sales call.

Would you have 15 minutes this week or next? I''m happy to work around your schedule.

{{sender_signature}}', 30),
('demo_invite', 'Demo invitation', 'A short OpenHRApp walkthrough for {{company_name}}',
'Hi {{first_name}},

Thanks for sharing how things work at {{company_name}}. Based on what you described, I think a short walkthrough would be useful: mobile check-in, leave applications and approvals, and the employee self-service view.

It takes about 20 minutes. Which day suits you?

{{sender_signature}}', 40),
('demo_followup', 'Demo follow-up', 'Following up on the OpenHRApp walkthrough',
'Hi {{first_name}},

Thank you for your time on the walkthrough. If it would help, I can set up a workspace for {{company_name}} so your team can try attendance and leave with real use.

Is there anything you''d need to see before trying it?

{{sender_signature}}', 50),
('pilot_invite', 'Pilot invitation', 'Try OpenHRApp with your team at {{company_name}}',
'Hi {{first_name}},

I''d like to offer {{company_name}} a short pilot: we set up your workspace, add a few employees, and you run attendance and leave through OpenHRApp for a few weeks. I''ll check in regularly and fix what gets in the way.

If that sounds reasonable, reply and I''ll send the setup steps.

{{sender_signature}}', 60),
('pilot_feedback', 'Pilot feedback', 'How is the pilot going at {{company_name}}?',
'Hi {{first_name}},

Checking in on the pilot. What is working, what is annoying, and is anything missing that your team expected?

Honest answers help most, even if the answer is that it isn''t a fit.

{{sender_signature}}', 70),
('subscription_offer', 'Subscription offer', 'Continuing with OpenHRApp at {{company_name}}',
'Hi {{first_name}},

Thank you for running the pilot. If you''d like to keep using OpenHRApp, I can move {{company_name}} to a paid plan so nothing changes for your team.

Happy to answer any questions about pricing or setup before you decide.

{{sender_signature}}', 80),
('final_followup', 'Final follow-up', 'Closing the loop',
'Hi {{first_name}},

I haven''t heard back, so I''ll assume now isn''t the right time and won''t follow up again. If attendance or leave management becomes a priority for {{company_name}} later, just reply to this email.

{{sender_signature}}', 90)
on conflict (key) do nothing;
