// OpenHRApp — Super Admin outreach: send one reviewed email via Resend.
//
// One recipient per call, taken from outreach_prospects (never from the
// request), so this cannot be used as a relay. All rules live in
// _shared/outreach.ts; this file only wires Supabase, Resend and env.
//
// Required secrets (fails closed with 503 if any is missing):
//   RESEND_API_KEY, OUTREACH_FROM_EMAIL (monitored @openhrapp.com address),
//   OUTREACH_POSTAL_ADDRESS, CRON_SECRET (signs unsubscribe links).
// Optional: OUTREACH_REPLY_TO.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleOutreachSend } from '../_shared/outreach.ts';
import { signUnsubscribe } from '../_shared/unsubscribe.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { success: false, message: 'Method not allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json(401, { success: false, message: 'Missing Authorization header' });

  let input: unknown;
  try { input = await req.json(); } catch { return json(400, { success: false, message: 'Invalid JSON body' }); }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const secret = Deno.env.get('CRON_SECRET') ?? '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';

  const result = await handleOutreachSend(input, {
    config: {
      resendApiKey,
      fromEmail: Deno.env.get('OUTREACH_FROM_EMAIL') ?? '',
      replyTo: Deno.env.get('OUTREACH_REPLY_TO') ?? '',
      postalAddress: Deno.env.get('OUTREACH_POSTAL_ADDRESS') ?? '',
      unsubscribeSecret: secret,
    },
    async callerRole() {
      const { data: { user } } = await anon.auth.getUser();
      if (!user) return null;
      const { data } = await admin.from('profiles').select('role').eq('id', user.id).single();
      return { id: user.id, role: data?.role ?? '' };
    },
    async getProspect(id) {
      const { data } = await admin.from('outreach_prospects')
        .select('id, email, status, outreach_basis, do_not_contact, archived').eq('id', id).maybeSingle();
      return data;
    },
    async isSuppressed(email) {
      const { data, error } = await admin.from('email_suppressions').select('email').eq('email', email).maybeSingle();
      if (error) throw new Error(`Suppression check failed: ${error.message}`);
      return !!data;
    },
    async hasPendingSince(prospectId, iso) {
      const { count, error } = await admin.from('outreach_messages')
        .select('id', { count: 'exact', head: true })
        .eq('prospect_id', prospectId).eq('status', 'SENDING').gte('created', iso);
      if (error) throw new Error(`Pending-send check failed: ${error.message}`);
      return (count ?? 0) > 0;
    },
    async countOutboundSince(iso) {
      const { count, error } = await admin.from('outreach_messages')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'OUTBOUND').in('status', ['SENDING', 'SENT', 'DELIVERED']).gte('created', iso);
      if (error) throw new Error(`Rate-limit check failed: ${error.message}`);
      return count ?? 0;
    },
    async claim(row) {
      const { data, error } = await admin.from('outreach_messages').insert(row).select('id').single();
      if (error?.code === '23505') return null; // idempotency_key already used
      if (error) throw new Error(`Could not record message: ${error.message}`);
      return data;
    },
    async finish(id, patch) {
      await admin.from('outreach_messages').update(patch).eq('id', id);
    },
    async markContacted(prospectId, at) {
      await admin.from('outreach_prospects').update({ last_contacted_at: at }).eq('id', prospectId);
      await admin.from('outreach_prospects').update({ status: 'CONTACTED' })
        .eq('id', prospectId).in('status', ['NEW', 'QUALIFIED']);
    },
    async unsubscribeUrl(email) {
      return `${supabaseUrl}/functions/v1/email-unsubscribe?token=${await signUnsubscribe(email, secret)}`;
    },
    async resend(payload, idempotencyKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000), // thrown abort is treated as "outcome unknown"
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { error: `Resend ${res.status}: ${body?.message ?? JSON.stringify(body)}`, unknown: res.status >= 500 };
      }
      return { id: body?.id };
    },
    now: () => new Date(),
  }).catch((e) => ({ status: 500, body: { success: false, message: e instanceof Error ? e.message : String(e) } }));

  return json(result.status, result.body);
});
