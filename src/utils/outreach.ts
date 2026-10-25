// Pure outreach logic for the Super Admin CRM: CSV import, stage changes,
// follow-up stop rules and validation metrics. Send-side rules live in
// supabase/functions/_shared/outreach.ts and are re-exported here.

export {
  isValidEmail, escapeHtml, renderTemplate, hasUnresolvedVariables, sendBlockReason,
} from '../../supabase/functions/_shared/outreach';
import { isValidEmail } from '../../supabase/functions/_shared/outreach';

export const PIPELINE = ['NEW', 'QUALIFIED', 'CONTACTED', 'REPLIED', 'INTERESTED', 'DEMO', 'PILOT', 'PAYING'] as const;
export const CLOSED = ['NOT_INTERESTED', 'UNSUBSCRIBED'] as const;
export type ProspectStatus = typeof PIPELINE[number] | typeof CLOSED[number];

export const STATUS_LABEL: Record<ProspectStatus, string> = {
  NEW: 'New', QUALIFIED: 'Qualified', CONTACTED: 'Contacted', REPLIED: 'Replied',
  INTERESTED: 'Interested', DEMO: 'Demo', PILOT: 'Pilot', PAYING: 'Paying Customer',
  NOT_INTERESTED: 'Not Interested', UNSUBSCRIBED: 'Unsubscribed',
};

export const OUTREACH_BASIS = {
  UNVERIFIED: 'Unverified — cannot email',
  PUBLISHED_BUSINESS_CONTACT: 'Published business contact',
  REFERRAL: 'Referral / introduction',
  INBOUND_INQUIRY: 'Inbound inquiry',
  EXISTING_RELATIONSHIP: 'Existing relationship',
  OPTED_IN: 'Opted in',
} as const;
export type OutreachBasis = keyof typeof OUTREACH_BASIS;

export interface Prospect {
  id: string;
  campaign_id: string | null;
  company_name: string;
  industry: string | null;
  contact_name: string | null;
  email: string;
  website: string | null;
  city: string | null;
  employee_count: number | null;
  contact_source: string | null;
  outreach_basis: OutreachBasis;
  current_hr_method: string | null;
  primary_problem: string | null;
  status: ProspectStatus;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  notes: string | null;
  do_not_contact: boolean;
  archived: boolean;
  interview_completed_at: string | null;
  demo_scheduled_at: string | null;
  demo_completed_at: string | null;
  pilot_started_at: string | null;
  paid_at: string | null;
  confirmed_mrr: number | null;
}

export type ProspectInput = Partial<Omit<Prospect, 'id'>> & { company_name: string; email: string };

export interface OutreachMessage {
  id: string;
  prospect_id: string;
  direction: 'OUTBOUND' | 'INBOUND';
  template_key: string | null;
  subject: string | null;
  body: string | null;
  status: 'DRAFT' | 'SENDING' | 'SENT' | 'DELIVERED' | 'BOUNCED' | 'FAILED' | 'RECEIVED';
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null;
  recipient_email: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  error: string | null;
  created: string;
}

export interface Campaign {
  id: string;
  name: string;
  length_days: 30 | 60;
  start_date: string;
  end_date: string;
  industry_target: string | null;
  goal_contacts: number;
  goal_interviews: number;
  goal_demos: number;
  goal_pilots: number;
  goal_paying: number;
  proposed_price: number;
}

export interface FollowUpTask {
  id: string;
  prospect_id: string;
  due_date: string;
  template_key: string | null;
  note: string | null;
  status: 'OPEN' | 'DONE' | 'CANCELLED';
  created: string;
}

export interface OutreachTemplate { id: string; key: string; name: string; subject: string; body: string; sort: number }

// ── Validation ──────────────────────────────────────────────────────────────
export function validateProspect(p: ProspectInput): string | null {
  if (!p.company_name?.trim()) return 'Company name is required';
  const email = p.email?.trim().toLowerCase() ?? '';
  if (!isValidEmail(email)) return 'A valid business email is required';
  if (p.employee_count != null && (!Number.isInteger(p.employee_count) || p.employee_count < 0)) {
    return 'Employee count must be a whole number';
  }
  if (p.website && !/^https?:\/\/\S+\.\S+/i.test(p.website.trim())) return 'Website must start with http:// or https://';
  return null;
}

// ── CSV import ──────────────────────────────────────────────────────────────
/** RFC 4180-ish: quoted fields, escaped quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

const CSV_COLUMNS: Record<string, keyof ProspectInput> = {
  company: 'company_name', company_name: 'company_name', industry: 'industry',
  contact: 'contact_name', contact_name: 'contact_name', name: 'contact_name',
  email: 'email', business_email: 'email', website: 'website', city: 'city',
  employees: 'employee_count', employee_count: 'employee_count',
  source: 'contact_source', contact_source: 'contact_source',
  basis: 'outreach_basis', outreach_basis: 'outreach_basis',
  current_hr_method: 'current_hr_method', hr_method: 'current_hr_method',
  primary_problem: 'primary_problem', problem: 'primary_problem', notes: 'notes',
};

export interface CsvPreviewRow { line: number; data: ProspectInput; error: string | null }

/** Maps headers, validates each row, and flags duplicates against the file and existing emails. */
export function prepareCsvImport(text: string, existingEmails: Iterable<string>): CsvPreviewRow[] {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ''));
  if (!header) return [];
  const keys = header.map((h) => CSV_COLUMNS[h.trim().toLowerCase().replace(/[\s-]+/g, '_')]);
  const seen = new Set([...existingEmails].map((e) => e.toLowerCase()));
  return rows.map((cells, i) => {
    const data: ProspectInput = { company_name: '', email: '' };
    keys.forEach((k, j) => {
      const v = cells[j]?.trim();
      if (!k || !v) return;
      if (k === 'employee_count') data.employee_count = Number(v);
      else (data as Record<string, unknown>)[k] = v;
    });
    data.email = data.email.toLowerCase();
    if (data.outreach_basis && !(data.outreach_basis in OUTREACH_BASIS)) data.outreach_basis = 'UNVERIFIED';
    let error = validateProspect(data);
    if (!error && seen.has(data.email)) error = 'Duplicate email';
    if (!error) seen.add(data.email);
    return { line: i + 2, data, error };
  });
}

// ── Stage changes and stop rules ───────────────────────────────────────────
/** Fields to write when moving a prospect to a stage; stamps the first time each milestone is reached. */
export function stageChange(p: Prospect, to: ProspectStatus, now = new Date()): Partial<Prospect> {
  const iso = now.toISOString();
  const patch: Partial<Prospect> = { status: to };
  if (to === 'DEMO' && !p.demo_scheduled_at) patch.demo_scheduled_at = iso;
  if (to === 'PILOT' && !p.pilot_started_at) patch.pilot_started_at = iso;
  if (to === 'PAYING' && !p.paid_at) patch.paid_at = iso;
  if (to === 'UNSUBSCRIBED') patch.do_not_contact = true;
  return patch;
}

/** Closed prospects get no follow-ups at all (mirrors the database stop rule). */
export function followUpsStopped(p: Pick<Prospect, 'status' | 'do_not_contact' | 'archived'>): boolean {
  return p.archived || p.do_not_contact || ['NOT_INTERESTED', 'UNSUBSCRIBED', 'PAYING'].includes(p.status);
}

/**
 * Open follow-ups due by `today`. A task scheduled before the prospect's latest
 * reply is stopped too: the database cancels it, and this keeps the list right
 * even before a reload.
 */
export function dueFollowUps(
  tasks: FollowUpTask[], prospects: Prospect[], messages: OutreachMessage[], today: string,
) {
  const byId = new Map(prospects.map((p) => [p.id, p]));
  const lastReply = new Map<string, string>();
  for (const m of messages) {
    if (m.direction === 'INBOUND' && m.created > (lastReply.get(m.prospect_id) ?? '')) lastReply.set(m.prospect_id, m.created);
  }
  return tasks
    .filter((t) => t.status === 'OPEN' && t.due_date <= today)
    .map((t) => ({ task: t, prospect: byId.get(t.prospect_id)!, overdue: t.due_date < today }))
    .filter((x) => x.prospect && !followUpsStopped(x.prospect))
    .filter((x) => (lastReply.get(x.task.prospect_id) ?? '') <= x.task.created)
    .sort((a, b) => a.task.due_date.localeCompare(b.task.due_date));
}

// ── Metrics ─────────────────────────────────────────────────────────────────
const REACHED: Record<ProspectStatus, number> = Object.fromEntries(
  [...PIPELINE.map((s, i) => [s, i]), ['NOT_INTERESTED', 3], ['UNSUBSCRIBED', 2]],
) as Record<ProspectStatus, number>;

export interface OutreachMetrics {
  prospects: number;
  drafted: number;
  sent: number;
  delivered: number;
  failed: number;
  contacted: number;
  replies: number;
  positiveReplies: number;
  interested: number;
  interviews: number;
  demosScheduled: number;
  demosCompleted: number;
  pilots: number;
  paying: number;
  proposedMrr: number;
  confirmedMrr: number;
}

/** "Contacted" means at least one message Resend accepted, not a status someone set by hand. */
export function computeMetrics(
  prospects: Prospect[], messages: OutreachMessage[], campaigns: Campaign[] = [],
): OutreachMetrics {
  const ids = new Set(prospects.filter((p) => !p.archived).map((p) => p.id));
  const live = prospects.filter((p) => ids.has(p.id));
  const msgs = messages.filter((m) => ids.has(m.prospect_id));
  const out = msgs.filter((m) => m.direction === 'OUTBOUND');
  const accepted = out.filter((m) => m.status === 'SENT' || m.status === 'DELIVERED');
  const inbound = msgs.filter((m) => m.direction === 'INBOUND');
  const price = new Map(campaigns.map((c) => [c.id, Number(c.proposed_price) || 0]));
  const at = (p: Prospect, s: ProspectStatus) => REACHED[p.status] >= REACHED[s] && !CLOSED.includes(p.status as never);
  return {
    prospects: live.length,
    drafted: out.filter((m) => m.status === 'DRAFT').length,
    sent: accepted.length,
    delivered: out.filter((m) => m.status === 'DELIVERED').length,
    failed: out.filter((m) => m.status === 'FAILED' || m.status === 'BOUNCED').length,
    contacted: new Set(accepted.map((m) => m.prospect_id)).size,
    replies: new Set(inbound.map((m) => m.prospect_id)).size,
    positiveReplies: new Set(inbound.filter((m) => m.sentiment === 'POSITIVE').map((m) => m.prospect_id)).size,
    interested: live.filter((p) => at(p, 'INTERESTED')).length,
    interviews: live.filter((p) => p.interview_completed_at).length,
    demosScheduled: live.filter((p) => p.demo_scheduled_at).length,
    demosCompleted: live.filter((p) => p.demo_completed_at).length,
    pilots: live.filter((p) => p.pilot_started_at).length,
    paying: live.filter((p) => p.status === 'PAYING').length,
    proposedMrr: live.filter((p) => ['INTERESTED', 'DEMO', 'PILOT'].includes(p.status))
      .reduce((s, p) => s + (p.campaign_id ? price.get(p.campaign_id) ?? 0 : 0), 0),
    confirmedMrr: live.filter((p) => p.status === 'PAYING').reduce((s, p) => s + (Number(p.confirmed_mrr) || 0), 0),
  };
}

export function campaignProgress(c: Campaign, today = new Date()) {
  const start = new Date(`${c.start_date}T00:00:00`);
  const day = Math.floor((today.getTime() - start.getTime()) / 86400_000) + 1;
  const elapsed = Math.min(Math.max(day, 0), c.length_days);
  return { day: elapsed, pct: Math.round((elapsed / c.length_days) * 100), ended: day > c.length_days };
}

export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export function templateVars(p: Prospect, signature: string): Record<string, string> {
  const name = p.contact_name?.trim() ?? '';
  return {
    first_name: name.split(/\s+/)[0] || 'there',
    contact_name: name || 'there',
    company_name: p.company_name,
    industry: p.industry ?? '',
    city: p.city ?? '',
    primary_problem: p.primary_problem ?? '',
    current_hr_method: p.current_hr_method ?? '',
    sender_signature: signature,
  };
}
