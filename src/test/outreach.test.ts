import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, vi } from 'vitest';
import {
  handleOutreachSend, configProblem, renderOutreachEmail, OUTREACH_MAX_PER_HOUR,
  type SendDeps, type OutreachProspectRow,
} from '../../supabase/functions/_shared/outreach';
import {
  renderTemplate, hasUnresolvedVariables, sendBlockReason, validateProspect, prepareCsvImport,
  parseCsv, computeMetrics, dueFollowUps, followUpsStopped, stageChange, campaignProgress,
  orgSegment, orgMetrics, lastActivity, isVerifiedPaying, orgProspectInput, linksByOrg, templatePurpose,
  type OrgInsight, type Prospect, type OutreachMessage, type FollowUpTask, type Campaign,
} from '../utils/outreach';

const cfg = {
  resendApiKey: 're_test', fromEmail: 'Monir at OpenHRApp <monir@openhrapp.com>',
  postalAddress: '1 Test Street, Dhaka', unsubscribeSecret: 'secret',
};
const row = (o: Partial<OutreachProspectRow> = {}): OutreachProspectRow => ({
  id: 'p1', email: 'ceo@acme.com', status: 'NEW', outreach_basis: 'PUBLISHED_BUSINESS_CONTACT',
  do_not_contact: false, archived: false, ...o,
});
const req = (o: Record<string, unknown> = {}) => ({
  prospectId: 'p1', confirmEmail: 'ceo@acme.com', subject: 'Hello', body: 'Hi there',
  idempotencyKey: '0b2f6c1e-1111-4222-8333-444455556666', ...o,
});

function deps(o: Partial<SendDeps> = {}) {
  const used = new Set<string>();
  const d: SendDeps = {
    config: cfg,
    callerRole: async () => ({ id: 'u1', role: 'SUPER_ADMIN' }),
    getProspect: async () => row(),
    isOrgAdminContact: async () => true,
    isSuppressed: async () => false,
    hasPendingSince: async () => false,
    countOutboundSince: async () => 0,
    claim: vi.fn(async (r: Record<string, unknown>) => {
      const k = r.idempotency_key as string;
      if (used.has(k)) return null;
      used.add(k);
      return { id: 'm1' };
    }),
    finish: vi.fn(async () => {}),
    markContacted: vi.fn(async () => {}),
    unsubscribeUrl: async () => 'https://x.supabase.co/functions/v1/email-unsubscribe?token=abc',
    resend: vi.fn(async () => ({ id: 're_msg_1' })),
    now: () => new Date('2026-10-25T10:00:00Z'),
    ...o,
  };
  return d;
}

describe('outreach-send authorization', () => {
  it('rejects invalid tokens and non super admins without touching Resend', async () => {
    for (const role of ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']) {
      const d = deps({ callerRole: async () => ({ id: 'u', role }) });
      expect((await handleOutreachSend(req(), d)).status).toBe(403);
      expect(d.resend).not.toHaveBeenCalled();
    }
    expect((await handleOutreachSend(req(), deps({ callerRole: async () => null }))).status).toBe(401);
  });

  it('fails closed when sender configuration is missing or unverified', async () => {
    expect(configProblem({ ...cfg, resendApiKey: '' })).toMatch(/resendApiKey/);
    expect(configProblem({ ...cfg, postalAddress: '' })).toMatch(/postalAddress/);
    expect(configProblem({ ...cfg, fromEmail: 'me@gmail.com' })).toMatch(/verified/);
    expect(configProblem({ ...cfg, fromEmail: 'OpenHRApp <noreply@openhrapp.com>' })).toMatch(/no-reply/);
    expect(configProblem(cfg)).toBeNull();
    const d = deps({ config: { ...cfg, fromEmail: '' } });
    expect((await handleOutreachSend(req(), d)).status).toBe(503);
    expect(d.resend).not.toHaveBeenCalled();
  });

  it('never sends to an address other than the stored prospect (no relay)', async () => {
    const d = deps();
    const r = await handleOutreachSend(req({ confirmEmail: 'victim@other.com', to: 'victim@other.com' }), d);
    expect(r.status).toBe(400);
    expect(d.resend).not.toHaveBeenCalled();
  });
});

describe('outreach-send eligibility and suppression', () => {
  it.each([
    [{ do_not_contact: true }, /do-not-contact/],
    [{ archived: true }, /archived/],
    [{ status: 'UNSUBSCRIBED' }, /unsubscribed/],
    [{ status: 'NOT_INTERESTED' }, /not interested/],
    [{ outreach_basis: 'UNVERIFIED' }, /outreach basis/],
  ])('blocks %o', async (patch, msg) => {
    const d = deps({ getProspect: async () => row(patch) });
    const r = await handleOutreachSend(req(), d);
    expect(r.status).toBe(422);
    expect(String(r.body.message)).toMatch(msg);
    expect(d.resend).not.toHaveBeenCalled();
  });

  it('blocks suppressed (unsubscribed or bounced) addresses', async () => {
    const d = deps({ isSuppressed: async () => true });
    expect((await handleOutreachSend(req(), d)).status).toBe(422);
    expect(d.resend).not.toHaveBeenCalled();
  });

  it('refuses unfilled template variables and multi-line subjects', async () => {
    expect((await handleOutreachSend(req({ body: 'Hi {{first_name}}' }), deps())).status).toBe(400);
    expect((await handleOutreachSend(req({ subject: 'a\r\nBcc: x@y.com' }), deps())).status).toBe(400);
  });
});

describe('outreach-send delivery record', () => {
  it('marks SENT only after Resend accepts, with provider id and unsubscribe headers', async () => {
    const d = deps();
    const r = await handleOutreachSend(req(), d);
    expect(r.status).toBe(200);
    const payload = (d.resend as any).mock.calls[0][0];
    expect(payload.to).toEqual(['ceo@acme.com']);
    expect(payload.headers['List-Unsubscribe']).toContain('email-unsubscribe');
    expect(payload.html).toContain('1 Test Street');
    expect(d.finish).toHaveBeenCalledWith('m1', expect.objectContaining({ status: 'SENT', provider_message_id: 're_msg_1' }));
    expect(d.markContacted).toHaveBeenCalled();
  });

  it('records FAILED with the provider error and does not mark contacted', async () => {
    const d = deps({ resend: vi.fn(async () => ({ error: 'Resend 422: domain not verified' })) });
    const r = await handleOutreachSend(req(), d);
    expect(r.status).toBe(502);
    expect(d.finish).toHaveBeenCalledWith('m1', expect.objectContaining({ status: 'FAILED', error: expect.stringContaining('domain not verified') }));
    expect(d.markContacted).not.toHaveBeenCalled();
  });

  it('treats a timeout or 5xx as unknown: never FAILED, never contacted', async () => {
    for (const resend of [vi.fn(async () => { throw new Error('TimeoutError'); }), vi.fn(async () => ({ error: 'Resend 503', unknown: true }))]) {
      const d = deps({ resend });
      const r = await handleOutreachSend(req(), d);
      expect(r.status).toBe(504);
      expect(r.body.unknown).toBe(true);
      expect(d.finish).toHaveBeenCalledWith('m1', { error: expect.stringContaining('Outcome unknown') });
      expect(d.markContacted).not.toHaveBeenCalled();
    }
  });

  it('blocks a new send while an earlier one has an unknown outcome', async () => {
    const d = deps({ hasPendingSince: async () => true });
    expect((await handleOutreachSend(req(), d)).status).toBe(409);
    expect(d.claim).not.toHaveBeenCalled();
  });

  it('blocks a duplicate submit with the same idempotency key', async () => {
    const d = deps();
    expect((await handleOutreachSend(req(), d)).status).toBe(200);
    const second = await handleOutreachSend(req(), d);
    expect(second.status).toBe(409);
    expect(d.resend).toHaveBeenCalledTimes(1);
  });

  it('applies the hourly rate limit', async () => {
    const d = deps({ countOutboundSince: async () => OUTREACH_MAX_PER_HOUR });
    expect((await handleOutreachSend(req(), d)).status).toBe(429);
    expect(d.claim).not.toHaveBeenCalled();
  });
});

describe('template rendering and escaping', () => {
  it('fills known variables and leaves unknown ones detectable', () => {
    const out = renderTemplate('Hi {{first_name}} at {{company_name}} {{nope}}', { first_name: 'Ana', company_name: 'Acme' });
    expect(out).toBe('Hi Ana at Acme {{nope}}');
    expect(hasUnresolvedVariables(out)).toBe(true);
  });

  it('escapes variable values in the HTML email', () => {
    const body = renderTemplate('Hello {{company_name}}', { company_name: '<script>alert(1)</script> & "Co"' });
    const { html, text } = renderOutreachEmail({ body, unsubscribeUrl: 'https://u/?t="x"', postalAddress: '<b>addr</b>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Co&quot;');
    expect(html).toContain('&lt;b&gt;addr&lt;/b&gt;');
    expect(html).toContain('href="https://u/?t=&quot;x&quot;"');
    expect(text).toContain('Unsubscribe: https://u/?t="x"');
  });
});

describe('prospect validation and CSV import', () => {
  it('validates required fields', () => {
    expect(validateProspect({ company_name: '', email: 'a@b.co' })).toMatch(/Company/);
    expect(validateProspect({ company_name: 'A', email: 'nope' })).toMatch(/email/);
    expect(validateProspect({ company_name: 'A', email: 'a@b.co', website: 'acme.com' })).toMatch(/Website/);
    expect(validateProspect({ company_name: 'A', email: 'a@b.co', employee_count: 1.5 })).toMatch(/whole/);
    expect(validateProspect({ company_name: 'A', email: 'a@b.co' })).toBeNull();
  });

  it('parses quoted CSV and dedupes against the file and existing prospects', () => {
    expect(parseCsv('a,"b, ""c"""\r\n1,"x\ny"')).toEqual([['a', 'b, "c"'], ['1', 'x\ny']]);
    const csv = 'Company,Email,Basis,Employees\nAcme,CEO@acme.com,REFERRAL,20\nAcme2,ceo@acme.com,,\nOld,old@x.com,,\nBad,not-an-email,,\nGuess,g@x.com,SCRAPED,';
    const rows = prepareCsvImport(csv, ['old@x.com']);
    expect(rows.map((r) => r.error)).toEqual([null, 'Duplicate email', 'Duplicate email', expect.stringMatching(/email/), null]);
    expect(rows[0].data).toMatchObject({ email: 'ceo@acme.com', outreach_basis: 'REFERRAL', employee_count: 20 });
    expect(rows[4].data.outreach_basis).toBe('UNVERIFIED');
  });
});

const P = (o: Partial<Prospect>): Prospect => ({
  id: 'p', campaign_id: null, company_name: 'Co', industry: null, contact_name: null, email: 'a@b.co', website: null,
  city: null, employee_count: null, contact_source: null, outreach_basis: 'REFERRAL', current_hr_method: null,
  primary_problem: null, status: 'NEW', last_contacted_at: null, next_follow_up: null, notes: null, do_not_contact: false,
  archived: false, interview_completed_at: null, demo_scheduled_at: null, demo_completed_at: null, pilot_started_at: null,
  paid_at: null, confirmed_mrr: null, ...o,
});
const M = (o: Partial<OutreachMessage>): OutreachMessage => ({
  id: Math.random().toString(), prospect_id: 'p', direction: 'OUTBOUND', template_key: null, subject: null, body: null,
  status: 'SENT', sentiment: null, recipient_email: null, provider_message_id: null, sent_at: null, error: null,
  created: '2026-10-01T00:00:00Z', ...o,
});

describe('campaign conversion metrics', () => {
  it('separates drafted/sent/delivered, replies/positive, demo scheduled/completed, proposed/confirmed', () => {
    const c: Campaign = { id: 'c', name: 'C', length_days: 30, start_date: '2026-10-01', end_date: '2026-10-31', industry_target: null,
      goal_contacts: 10, goal_interviews: 0, goal_demos: 0, goal_pilots: 0, goal_paying: 0, proposed_price: 49 };
    const prospects = [
      P({ id: 'a', campaign_id: 'c', status: 'PAYING', confirmed_mrr: 39, demo_scheduled_at: 'x', demo_completed_at: 'x', pilot_started_at: 'x', paid_at: 'x' }),
      P({ id: 'b', campaign_id: 'c', status: 'PILOT', demo_scheduled_at: 'x', pilot_started_at: 'x' }),
      P({ id: 'd', campaign_id: 'c', status: 'CONTACTED' }),
      P({ id: 'z', status: 'PAYING', archived: true, confirmed_mrr: 999 }),
    ];
    const messages = [
      M({ prospect_id: 'a' }), M({ prospect_id: 'b' }), M({ prospect_id: 'd', status: 'FAILED' }), M({ prospect_id: 'd', status: 'DRAFT' }),
      M({ prospect_id: 'a', direction: 'INBOUND', status: 'RECEIVED', sentiment: 'POSITIVE' }),
      M({ prospect_id: 'b', direction: 'INBOUND', status: 'RECEIVED', sentiment: 'NEUTRAL' }),
      M({ prospect_id: 'z' }),
    ];
    const m = computeMetrics(prospects, messages, [c]);
    expect(m).toMatchObject({
      prospects: 3, drafted: 1, sent: 2, delivered: 0, failed: 1, contacted: 2, replies: 2, positiveReplies: 1,
      demosScheduled: 2, demosCompleted: 1, pilots: 2, paying: 1, interested: 2, proposedMrr: 49, confirmedMrr: 39,
    });
  });

  it('reports 30/60 day progress', () => {
    const c = { start_date: '2026-10-01', length_days: 60 } as Campaign;
    expect(campaignProgress(c, new Date('2026-10-30T12:00:00'))).toEqual({ day: 30, pct: 50, ended: false });
    expect(campaignProgress(c, new Date('2026-12-15T12:00:00')).ended).toBe(true);
  });
});

describe('follow-up stopping rules', () => {
  const T = (o: Partial<FollowUpTask>): FollowUpTask => ({
    id: Math.random().toString(), prospect_id: 'p', due_date: '2026-10-20', template_key: null, note: null,
    status: 'OPEN', created: '2026-10-05T00:00:00Z', ...o,
  });

  it('stops for closed, unsubscribed, do-not-contact, archived and paying prospects', () => {
    for (const p of [P({ status: 'PAYING' }), P({ status: 'UNSUBSCRIBED' }), P({ status: 'NOT_INTERESTED' }), P({ do_not_contact: true }), P({ archived: true })]) {
      expect(followUpsStopped(p)).toBe(true);
      expect(dueFollowUps([T({})], [p], [], '2026-10-25')).toHaveLength(0);
    }
    expect(followUpsStopped(P({ status: 'CONTACTED' }))).toBe(false);
  });

  it('stops tasks scheduled before a reply but keeps ones added after', () => {
    const reply = M({ direction: 'INBOUND', status: 'RECEIVED', created: '2026-10-10T00:00:00Z' });
    const before = T({ created: '2026-10-05T00:00:00Z' });
    const after = T({ created: '2026-10-11T00:00:00Z' });
    const due = dueFollowUps([before, after], [P({ status: 'REPLIED' })], [reply], '2026-10-25');
    expect(due.map((d) => d.task.id)).toEqual([after.id]);
    expect(due[0].overdue).toBe(true);
  });

  it('stamps milestones once on stage change', () => {
    const p = stageChange(P({}), 'DEMO', new Date('2026-10-25T00:00:00Z'));
    expect(p.demo_scheduled_at).toBe('2026-10-25T00:00:00.000Z');
    expect(stageChange(P({ demo_scheduled_at: 'old' }), 'DEMO').demo_scheduled_at).toBeUndefined();
    expect(stageChange(P({}), 'UNSUBSCRIBED').do_not_contact).toBe(true);
  });

  it('sendBlockReason allows an eligible prospect', () => {
    expect(sendBlockReason(P({}), false)).toBeNull();
  });
});

describe('migration 0040 RLS', () => {
  const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/0040_outreach_crm.sql'), 'utf8');
  const tables = ['outreach_campaigns', 'outreach_prospects', 'outreach_templates', 'outreach_messages', 'outreach_tasks'];

  it('enables RLS on every outreach table and gates every policy on is_super_admin()', () => {
    for (const t of tables) expect(sql).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`));
    const policies = sql.match(/create policy[\s\S]*?;/g) ?? [];
    expect(policies.length).toBeGreaterThanOrEqual(8);
    for (const p of policies) expect(p).toContain('public.is_super_admin()');
  });

  it('does not let the dashboard write sent records', () => {
    const insert = sql.match(/create policy "outreach_messages_insert"[\s\S]*?;/)![0];
    expect(insert).toMatch(/status = 'DRAFT'/);
    expect(insert).not.toMatch(/'SENT'/);
    expect(sql).not.toMatch(/references public\.(profiles|employees|organizations)/);
  });
});

// ── Phase 5D: existing organizations ────────────────────────────────────────
const NOW = new Date('2026-10-26T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400_000).toISOString();
const O = (o: Partial<OrgInsight> = {}): OrgInsight => ({
  org_id: 'o1', org_name: 'Acme', org_created: daysAgo(60), subscription_status: 'TRIAL',
  trial_end_date: daysAgo(-30), subscription_expires: null, is_demo: false, employee_count: 12,
  attendance_total: 100, attendance_recent: 20, last_attendance_at: daysAgo(1),
  leave_total: 3, leave_recent: 1, last_leave_at: daysAgo(5),
  verified_payments: 0, last_payment_at: null, admin_name: 'Rahim Uddin', admin_email: 'admin@acme.com', ...o,
});

describe('existing organization segmentation', () => {
  it('classifies each segment from evidence', () => {
    expect(orgSegment(O(), null, NOW)).toBe('ACTIVE_TRIAL');
    expect(orgSegment(O({ org_created: daysAgo(3) }), null, NOW)).toBe('NEW');
    expect(orgSegment(O({ last_attendance_at: null, last_leave_at: null, attendance_recent: 0, leave_recent: 0 }), null, NOW)).toBe('NOT_ACTIVATED');
    expect(orgSegment(O({ attendance_recent: 0, leave_recent: 0, last_attendance_at: daysAgo(90) }), null, NOW)).toBe('INACTIVE');
    expect(orgSegment(O({ trial_end_date: daysAgo(-3) }), null, NOW)).toBe('TRIAL_EXPIRING');
    expect(orgSegment(O({ trial_end_date: daysAgo(1) }), null, NOW)).toBe('EXPIRED');
    expect(orgSegment(O({ subscription_status: 'EXPIRED' }), null, NOW)).toBe('EXPIRED');
    expect(orgSegment(O({ subscription_status: 'ACTIVE', verified_payments: 1 }), null, NOW)).toBe('PAYING');
  });

  it('does not treat ACTIVE status as paid without evidence', () => {
    const o = O({ subscription_status: 'ACTIVE', trial_end_date: null });
    expect(isVerifiedPaying(o)).toBe(false);
    expect(orgSegment(o, null, NOW)).toBe('ACTIVE_UNVERIFIED');
    // A PAYING stage without a paid_at stamp is not evidence either.
    expect(isVerifiedPaying(o, P({ status: 'PAYING', paid_at: null }))).toBe(false);
    expect(isVerifiedPaying(o, P({ status: 'PAYING', paid_at: daysAgo(2) }))).toBe(true);
  });

  it('reports the activity source and never invents activity', () => {
    expect(lastActivity(O())).toEqual({ at: daysAgo(1), source: 'Attendance record' });
    expect(lastActivity(O({ last_attendance_at: daysAgo(9) }))?.source).toBe('Leave request');
    expect(lastActivity(O({ last_attendance_at: null, last_leave_at: null }))).toBeNull();
  });

  it('aggregates dashboard metrics per organization, excluding demos', () => {
    const orgs = [
      O({ org_id: 'a' }),
      O({ org_id: 'b', org_created: daysAgo(2), last_attendance_at: null, last_leave_at: null, attendance_recent: 0, leave_recent: 0 }),
      O({ org_id: 'c', subscription_status: 'ACTIVE', verified_payments: 2 }),
      O({ org_id: 'd', attendance_recent: 0, leave_recent: 0 }),
      O({ org_id: 'demo', is_demo: true, verified_payments: 5 }),
    ];
    const m = orgMetrics(orgs, [P({ id: 'x', organization_id: 'a' })], NOW);
    expect(m).toMatchObject({ total: 4, newlyRegistered: 1, activated: 3, activeRecent: 2, inactive: 1, verifiedPaying: 1, convertedTrials: 1, linked: 1 });
  });
});

describe('existing organization vs external prospect', () => {
  it('builds the explicit outreach record from the org admin contact only', () => {
    expect(orgProspectInput(O({ admin_email: null }))).toBeNull();
    const input = orgProspectInput(O({ admin_email: 'Admin@Acme.com' }))!;
    expect(input).toMatchObject({ organization_id: 'o1', email: 'admin@acme.com', outreach_basis: 'EXISTING_RELATIONSHIP', status: 'NEW' });
    expect(Object.keys(input).sort()).toEqual(
      ['company_name', 'contact_name', 'contact_source', 'email', 'employee_count', 'organization_id', 'outreach_basis', 'status']);
  });

  it('indexes at most one outreach record per organization and ignores external prospects', () => {
    const links = linksByOrg([P({ id: '1', organization_id: 'o1' }), P({ id: '2' }), P({ id: '3', organization_id: null })]);
    expect([...links.keys()]).toEqual(['o1']);
  });

  it('labels account/service vs promotional templates', () => {
    expect(templatePurpose('org_onboarding')).toBe('SERVICE');
    expect(templatePurpose('org_feedback')).toBe('SERVICE');
    expect(templatePurpose('org_subscription')).toBe('PROMOTIONAL');
    expect(templatePurpose('initial_intro')).toBe('PROMOTIONAL');
    expect(templatePurpose(null)).toBe('PROMOTIONAL');
  });
});

describe('outreach-send for linked organizations', () => {
  it('refuses a linked organization recipient who is not a current admin (never emails employees)', async () => {
    const d = deps({ getProspect: async () => row({ organization_id: 'o1' }), isOrgAdminContact: async () => false });
    const r = await handleOutreachSend(req(), d);
    expect(r.status).toBe(422);
    expect(d.claim).not.toHaveBeenCalled();
    expect(d.resend).not.toHaveBeenCalled();
  });

  it('still applies suppression and basis rules to linked organizations', async () => {
    const admin = vi.fn(async () => true);
    expect((await handleOutreachSend(req(), deps({ getProspect: async () => row({ organization_id: 'o1' }), isSuppressed: async () => true, isOrgAdminContact: admin }))).status).toBe(422);
    expect((await handleOutreachSend(req(), deps({ getProspect: async () => row({ organization_id: 'o1', outreach_basis: 'UNVERIFIED' }), isOrgAdminContact: admin }))).status).toBe(422);
    expect((await handleOutreachSend(req(), deps({ getProspect: async () => row({ organization_id: 'o1' }), isOrgAdminContact: admin }))).status).toBe(200);
    expect(admin).toHaveBeenCalledWith('o1', 'ceo@acme.com');
  });

  it('does not check org membership for external prospects', async () => {
    const admin = vi.fn(async () => false);
    expect((await handleOutreachSend(req(), deps({ isOrgAdminContact: admin }))).status).toBe(200);
    expect(admin).not.toHaveBeenCalled();
  });
});

describe('migration 0041 organization insights', () => {
  const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/0041_outreach_existing_orgs.sql'), 'utf8');
  const fn = sql.match(/create or replace function public\.outreach_org_insights[\s\S]*?\$\$;/)![0];
  const returns = fn.match(/returns table \(([\s\S]*?)\)\s*language/)![1];

  it('is SUPER_ADMIN-only and not executable by anon', () => {
    expect(fn).toMatch(/if not public\.is_super_admin\(\) then\s+raise exception/);
    expect(sql).toMatch(/revoke all on function public\.outreach_org_insights\(int\) from public/);
    expect(sql).not.toMatch(/grant execute[^;]*to anon/);
  });

  it('returns organization-level aggregates only, no personal HR data', () => {
    for (const col of ['employee_name', 'selfie', 'latitude', 'longitude', 'location', 'reason', 'remarks', 'salary', 'mobile', 'check_in'])
      expect(returns).not.toMatch(new RegExp(`\\b${col}\\b`));
    expect(fn).not.toMatch(/\b(t|v)\.(employee_name|selfie|latitude|longitude|location|reason|remarks)\b/);
  });

  it('prevents duplicate organization links and does not recreate 0040 tables', () => {
    expect(sql).toMatch(/create unique index if not exists outreach_prospects_org_key\s+on public\.outreach_prospects \(organization_id\) where organization_id is not null/);
    expect(sql).not.toMatch(/create table/i);
    expect(sql).toMatch(/on conflict \(key\) do nothing/);
  });
});
