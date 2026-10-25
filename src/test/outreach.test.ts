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
  type Prospect, type OutreachMessage, type FollowUpTask, type Campaign,
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
