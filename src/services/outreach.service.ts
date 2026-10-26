import { supabase } from './supabase';
import { ORG_THRESHOLDS, orgProspectInput } from '../utils/outreach';
import type {
  Campaign, FollowUpTask, OrgInsight, OutreachMessage, OutreachTemplate, Prospect, ProspectInput,
} from '../utils/outreach';

// Super Admin outreach CRM. Every table is SUPER_ADMIN-only by RLS; sending
// goes through the outreach-send edge function, which holds the Resend key.

const must = <T>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
};

export interface SendOutreachInput {
  prospectId: string;
  confirmEmail: string;
  subject: string;
  body: string;
  templateKey: string | null;
  idempotencyKey: string;
}

export const outreachService = {
  async loadAll() {
    const [p, m, c, t, k] = await Promise.all([
      supabase.from('outreach_prospects').select('*').order('created', { ascending: false }),
      supabase.from('outreach_messages').select('*').order('created', { ascending: false }),
      supabase.from('outreach_campaigns').select('*').order('start_date', { ascending: false }),
      supabase.from('outreach_templates').select('*').order('sort'),
      supabase.from('outreach_tasks').select('*').order('due_date'),
    ]);
    return {
      prospects: must(p, 'Could not load prospects') as Prospect[],
      messages: must(m, 'Could not load messages') as OutreachMessage[],
      campaigns: must(c, 'Could not load campaigns') as Campaign[],
      templates: must(t, 'Could not load templates') as OutreachTemplate[],
      tasks: must(k, 'Could not load follow-ups') as FollowUpTask[],
    };
  },

  /** Organization-level aggregates from a SUPER_ADMIN-guarded RPC; nothing per-employee reaches the browser. */
  async orgInsights(): Promise<OrgInsight[]> {
    const r = await supabase.rpc('outreach_org_insights', { p_days: ORG_THRESHOLDS.activeDays });
    return must(r, 'Organization insights unavailable') as OrgInsight[];
  },

  /**
   * Explicitly start managing an organization in outreach. Reuses an existing
   * prospect with the same admin email instead of creating a duplicate; the
   * unique organization_id index blocks a second link.
   */
  async linkOrganization(o: OrgInsight) {
    const input = orgProspectInput(o);
    if (!input) throw new Error('This organization has no admin contact with a valid email');
    const found = await supabase.from('outreach_prospects')
      .select('id, organization_id').eq('email', input.email).maybeSingle();
    const existing = must(found, 'Could not check existing prospects') as { id: string; organization_id: string | null } | null;
    if (existing?.organization_id && existing.organization_id !== o.org_id) {
      throw new Error('This email is already linked to a different organization');
    }
    const r = existing
      ? await supabase.from('outreach_prospects').update({ organization_id: o.org_id }).eq('id', existing.id)
      : await supabase.from('outreach_prospects').insert(input);
    if (r.error?.code === '23505') throw new Error('This organization is already managed in outreach');
    must(r, 'Could not link organization');
  },

  async saveProspect(id: string | null, input: Partial<ProspectInput>) {
    const row = input.email ? { ...input, email: input.email.trim().toLowerCase() } : input;
    const q = id
      ? supabase.from('outreach_prospects').update(row).eq('id', id)
      : supabase.from('outreach_prospects').insert(row);
    const r = await q;
    if (r.error?.code === '23505') throw new Error('A prospect with this email already exists');
    must(r, 'Could not save prospect');
  },

  async importProspects(rows: ProspectInput[]) {
    // ignoreDuplicates: a row added by someone else since the preview is skipped, not overwritten.
    const r = await supabase.from('outreach_prospects')
      .upsert(rows, { onConflict: 'email', ignoreDuplicates: true });
    must(r, 'Import failed');
  },

  async deleteProspect(id: string) {
    must(await supabase.from('outreach_prospects').delete().eq('id', id), 'Could not delete prospect');
  },

  async saveTemplate(t: Pick<OutreachTemplate, 'id' | 'subject' | 'body' | 'name'>) {
    must(await supabase.from('outreach_templates')
      .update({ name: t.name, subject: t.subject, body: t.body, updated: new Date().toISOString() })
      .eq('id', t.id), 'Could not save template');
  },

  async saveDraft(d: { prospect_id: string; template_key: string | null; subject: string; body: string }) {
    must(await supabase.from('outreach_messages')
      .insert({ ...d, direction: 'OUTBOUND', status: 'DRAFT' }), 'Could not save draft');
  },

  async deleteDraft(id: string) {
    must(await supabase.from('outreach_messages').delete().eq('id', id).eq('status', 'DRAFT'), 'Could not delete draft');
  },

  async recordReply(prospectId: string, sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE', body: string) {
    must(await supabase.from('outreach_messages').insert({
      prospect_id: prospectId, direction: 'INBOUND', status: 'RECEIVED', sentiment, body,
    }), 'Could not record reply');
  },

  /** Manual suppression (e.g. a bounce seen in the Resend dashboard); the DB trigger marks the prospect do-not-contact. */
  async suppress(email: string, reason: 'HARD_BOUNCE' | 'UNSUBSCRIBED' | 'MANUAL', note: string) {
    must(await supabase.from('email_suppressions')
      .upsert({ email: email.toLowerCase(), reason, note }, { onConflict: 'email' }), 'Could not suppress address');
  },

  async addTask(t: { prospect_id: string; due_date: string; template_key: string | null; note: string | null }) {
    must(await supabase.from('outreach_tasks').insert(t), 'Could not add follow-up');
    must(await supabase.from('outreach_prospects').update({ next_follow_up: t.due_date }).eq('id', t.prospect_id),
      'Could not update next follow-up');
  },

  async setTaskStatus(id: string, status: 'DONE' | 'CANCELLED') {
    must(await supabase.from('outreach_tasks').update({ status }).eq('id', id), 'Could not update follow-up');
  },

  async saveCampaign(id: string | null, c: Omit<Campaign, 'id'>) {
    const q = id
      ? supabase.from('outreach_campaigns').update(c).eq('id', id)
      : supabase.from('outreach_campaigns').insert(c);
    must(await q, 'Could not save campaign');
  },

  async deleteCampaign(id: string) {
    must(await supabase.from('outreach_campaigns').delete().eq('id', id), 'Could not delete campaign');
  },

  async send(input: SendOutreachInput): Promise<{ messageId: string; providerMessageId: string }> {
    const { data, error } = await supabase.functions.invoke('outreach-send', { body: input });
    if (error) {
      let message = error.message;
      try {
        const body = await (error as any).context?.json?.();
        if (body?.message) message = body.message;
      } catch { /* keep the original message */ }
      throw new Error(message);
    }
    return data;
  },
};
