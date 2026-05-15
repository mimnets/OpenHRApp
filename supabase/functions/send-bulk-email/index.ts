// OpenHR — Super Admin Bulk Email Edge Function
// Resolves recipients from auth.users (service role), personalises per-recipient,
// sends via Resend batch API, records results in reports_queue.
//
// Template placeholders supported in subject and htmlContent:
//   {{name}}        — recipient's display name from profiles
//   {{reset_link}}  — Supabase-generated password recovery link (unique per user)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BULK_CAMPAIGN_PREFIX = 'BULK_CAMPAIGN_';
const MAX_BULK_RECIPIENTS = 5000;
const SEND_BATCH_SIZE = 100;
const FROM_EMAIL = 'OpenHR <noreply@openhrapp.com>';

type BulkEmailFilter =
  | { kind: 'ALL_ADMINS' }
  | { kind: 'ALL_USERS' }
  | { kind: 'ORG'; organizationId: string; rolesScope?: 'ALL' | 'ADMINS' }
  | { kind: 'BY_SUBSCRIPTION'; statuses: string[]; rolesScope?: 'ALL' | 'ADMINS' };

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function personalise(template: string, name: string, resetLink: string): string {
  return template
    .replace(/\{\{name\}\}|%7B%7Bname%7D%7D/gi, name || 'User')
    .replace(/\{\{reset_link\}\}|%7B%7Breset_link%7D%7D/gi, resetLink || '#');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { success: false, message: 'Method not allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse(401, { success: false, message: 'Missing Authorization header' });

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return jsonResponse(500, { success: false, message: 'RESEND_API_KEY secret not configured' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Verify caller is SUPER_ADMIN
  const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await anonClient.auth.getUser();
  if (!caller) return jsonResponse(401, { success: false, message: 'Invalid token' });

  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', caller.id).single();
  if (callerProfile?.role !== 'SUPER_ADMIN') return jsonResponse(403, { success: false, message: 'Only SUPER_ADMIN can send bulk emails' });

  let filter: BulkEmailFilter, subject: string, htmlContent: string;
  try {
    const body = await req.json();
    filter = body.filter;
    subject = (body.subject || '').trim();
    htmlContent = (body.htmlContent || '').trim();
  } catch {
    return jsonResponse(400, { success: false, message: 'Invalid JSON body' });
  }

  if (!filter) return jsonResponse(400, { success: false, message: 'filter is required' });
  if (!subject) return jsonResponse(400, { success: false, message: 'subject is required' });
  if (!htmlContent) return jsonResponse(400, { success: false, message: 'htmlContent is required' });

  const needsResetLink = htmlContent.includes('{{reset_link}}') || subject.includes('{{reset_link}}');

  // Resolve profiles matching the filter — fetch name too for personalisation
  let profileQuery = adminClient.from('profiles').select('id, organization_id, role, name').neq('role', 'SUPER_ADMIN');

  if (filter.kind === 'ALL_ADMINS') {
    profileQuery = profileQuery.in('role', ['ADMIN', 'HR']);
  } else if (filter.kind === 'ORG') {
    profileQuery = profileQuery.eq('organization_id', filter.organizationId);
    if (filter.rolesScope === 'ADMINS') profileQuery = profileQuery.in('role', ['ADMIN', 'HR']);
  } else if (filter.kind === 'BY_SUBSCRIPTION') {
    if (!filter.statuses?.length) return jsonResponse(400, { success: false, message: 'statuses required for BY_SUBSCRIPTION filter' });
    const { data: orgs } = await adminClient.from('organizations').select('id').in('subscription_status', filter.statuses);
    const orgIds = (orgs ?? []).map((o: { id: string }) => o.id);
    if (orgIds.length === 0) return jsonResponse(200, { success: false, message: 'No organizations matched subscription filter', sent: 0, failed: 0, campaignId: '' });
    profileQuery = profileQuery.in('organization_id', orgIds);
    if (filter.rolesScope === 'ADMINS') profileQuery = profileQuery.in('role', ['ADMIN', 'HR']);
  }

  const { data: profiles, error: profilesError } = await profileQuery;
  if (profilesError) return jsonResponse(500, { success: false, message: `Failed to resolve recipients: ${profilesError.message}` });

  if (!profiles?.length) return jsonResponse(200, { success: false, message: 'No recipients matched this audience', sent: 0, failed: 0, campaignId: '' });
  if (profiles.length > MAX_BULK_RECIPIENTS) {
    return jsonResponse(400, {
      success: false,
      message: `Recipient list (${profiles.length}) exceeds the per-campaign cap of ${MAX_BULK_RECIPIENTS}. Narrow the audience.`,
      sent: 0, failed: 0, campaignId: '',
    });
  }

  // Fetch emails from auth.users
  const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers({ perPage: 10000 });
  if (authError) return jsonResponse(500, { success: false, message: `Failed to fetch auth users: ${authError.message}` });

  const emailMap = new Map<string, string>();
  for (const u of authUsers ?? []) {
    if (u.email) emailMap.set(u.id, u.email);
  }

  const campaignId = crypto.randomUUID();
  const type = `${BULK_CAMPAIGN_PREFIX}${campaignId}`;
  const now = new Date().toISOString();

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < profiles.length; i += SEND_BATCH_SIZE) {
    const batch = profiles.slice(i, i + SEND_BATCH_SIZE);
    const queueRows: unknown[] = [];
    const toSend: { profile: typeof batch[0]; email: string; html: string; subj: string }[] = [];

    for (const profile of batch) {
      const email = emailMap.get(profile.id);
      if (!email) {
        queueRows.push({
          organization_id: profile.organization_id || null,
          type, status: 'FAILED', recipient_email: '',
          subject, message: htmlContent,
          error_message: 'Email not found in auth.users', sent_at: null,
        });
        failed++;
        continue;
      }

      // Generate password recovery link if template needs it
      let resetLink = '';
      if (needsResetLink) {
        try {
          const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
            type: 'recovery',
            email,
          });
          if (linkError) throw linkError;
          resetLink = linkData?.properties?.action_link ?? '';
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          queueRows.push({
            organization_id: profile.organization_id || null,
            type, status: 'FAILED', recipient_email: email,
            subject, message: htmlContent,
            error_message: `Failed to generate reset link: ${msg}`, sent_at: null,
          });
          failed++;
          continue;
        }
      }

      const name = (profile.name || '').split(' ')[0] || 'User';
      const personalisedHtml = personalise(htmlContent, name, resetLink);
      const personalisedSubject = personalise(subject, name, resetLink);
      toSend.push({ profile, email, html: personalisedHtml, subj: personalisedSubject });
    }

    // Send batch via Resend batch API — each item can have unique html/subject
    if (toSend.length > 0) {
      let batchError: string | null = null;
      try {
        const res = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(toSend.map(({ email, html, subj }) => ({
            from: FROM_EMAIL,
            to: [email],
            subject: subj,
            html,
          }))),
        });
        if (!res.ok) {
          const errBody = await res.text();
          batchError = `Resend ${res.status}: ${errBody}`;
        }
      } catch (e: unknown) {
        batchError = e instanceof Error ? e.message : String(e);
      }

      for (const { profile, email, html } of toSend) {
        if (batchError) {
          failed++;
          queueRows.push({
            organization_id: profile.organization_id || null,
            type, status: 'FAILED', recipient_email: email,
            subject, message: html,
            error_message: batchError, sent_at: null,
          });
        } else {
          sent++;
          queueRows.push({
            organization_id: profile.organization_id || null,
            type, status: 'SENT', recipient_email: email,
            subject, message: html,
            error_message: null, sent_at: now,
          });
        }
      }
    }

    await adminClient.from('reports_queue').insert(queueRows);
  }

  const message = failed === 0
    ? `Sent ${sent} email${sent === 1 ? '' : 's'} successfully.`
    : `Sent ${sent} of ${profiles.length} emails — ${failed} failed.`;

  return jsonResponse(200, { success: sent > 0, message, sent, failed, campaignId });
});
