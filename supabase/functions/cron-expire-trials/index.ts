// OpenHR — Trial Expiration Cron
// Schedule: 0 0 * * * (daily midnight UTC)
//
// 1. Finds orgs where subscription_status = 'TRIAL' and trial_end_date < now() → sets EXPIRED.
//    Sends expiry email to org admins via Resend.
// 2. Finds orgs whose trial expires in exactly 7, 3, or 1 day(s) → sends reminder email.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FROM_EMAIL = 'OpenHR <noreply@openhrapp.com>';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sendEmail(resendKey: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[cron-expire-trials] Resend error: ${res.status} ${err}`);
  }
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse(401, { success: false, message: 'Unauthorized' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const admin = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  let expired = 0;
  let reminded = 0;

  // ── 1. Expire overdue trials ────────────────────────────────────────────────
  const { data: expiredOrgs } = await admin
    .from('organizations')
    .select('id, name')
    .eq('subscription_status', 'TRIAL')
    .not('trial_end_date', 'is', null)
    .lt('trial_end_date', now.toISOString());

  for (const org of expiredOrgs ?? []) {
    if (org.name === '__SYSTEM__' || org.name === 'Platform') continue;

    await admin
      .from('organizations')
      .update({ subscription_status: 'EXPIRED', updated: now.toISOString() })
      .eq('id', org.id);

    expired++;
    console.log(`[cron-expire-trials] Expired org: ${org.name} (${org.id})`);

    if (!resendKey) continue;

    // Email org admins.
    const { data: admins } = await admin
      .from('profiles')
      .select('id, name')
      .eq('organization_id', org.id)
      .eq('role', 'ADMIN');

    const { data: authUsers } = await admin.auth.admin.listUsers();
    const authMap = new Map(authUsers?.users?.map((u) => [u.id, u.email]) ?? []);

    for (const adm of admins ?? []) {
      const email = authMap.get(adm.id);
      if (!email) continue;

      await sendEmail(
        resendKey,
        email,
        `OpenHR Trial Expired — ${org.name}`,
        `<h2>Your OpenHR Trial Has Expired</h2>
         <p>Dear ${adm.name || 'Admin'},</p>
         <p>Your 14-day trial for <strong>${org.name}</strong> has ended.</p>
         <p>Your account is now in read-only mode. Contact our team to upgrade.</p>
         <p>Your data is safe and remains accessible.</p>`,
      );

      // Bell notification.
      await admin.from('notifications').insert({
        user_id: adm.id,
        organization_id: org.id,
        type: 'SYSTEM',
        title: 'Trial Expired',
        message: 'Your OpenHR trial has ended. Account is now in read-only mode.',
        is_read: false,
        priority: 'URGENT',
        action_url: 'upgrade',
      });
    }
  }

  // ── 2. Trial expiry reminders: 7, 3, 1 days before ─────────────────────────
  const reminderDays = [7, 3, 1];

  for (const daysLeft of reminderDays) {
    const targetStart = new Date(now);
    targetStart.setUTCHours(0, 0, 0, 0);
    targetStart.setDate(targetStart.getDate() + daysLeft);

    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetEnd.getDate() + 1);

    const { data: reminderOrgs } = await admin
      .from('organizations')
      .select('id, name')
      .eq('subscription_status', 'TRIAL')
      .not('trial_end_date', 'is', null)
      .gte('trial_end_date', targetStart.toISOString())
      .lt('trial_end_date', targetEnd.toISOString());

    for (const org of reminderOrgs ?? []) {
      if (org.name === '__SYSTEM__' || org.name === 'Platform') continue;

      if (!resendKey) { reminded++; continue; }

      const { data: admins } = await admin
        .from('profiles')
        .select('id, name')
        .eq('organization_id', org.id)
        .eq('role', 'ADMIN');

      const { data: authUsers } = await admin.auth.admin.listUsers();
      const authMap = new Map(authUsers?.users?.map((u) => [u.id, u.email]) ?? []);

      const isUrgent = daysLeft <= 3;
      const dayLabel = daysLeft === 1 ? 'day' : 'days';
      const subject = isUrgent
        ? `Urgent: Your OpenHR Trial Expires in ${daysLeft} ${dayLabel} — ${org.name}`
        : `Your OpenHR Trial Expires in ${daysLeft} ${dayLabel} — ${org.name}`;

      for (const adm of admins ?? []) {
        const email = authMap.get(adm.id);
        if (!email) continue;

        await sendEmail(
          resendKey,
          email,
          subject,
          `<h2>Trial Expiration Reminder</h2>
           <p>Dear ${adm.name || 'Admin'},</p>
           <p>Your OpenHR trial for <strong>${org.name}</strong> expires in
              <strong>${daysLeft} ${dayLabel}</strong>.</p>
           ${isUrgent
             ? `<p style="color:#dc2626;font-weight:bold;">After expiration, your account switches to read-only mode.</p>`
             : `<p>After expiration, your account switches to read-only mode.</p>`}
           <p>Log in to your OpenHR account and visit the Upgrade page to continue.</p>`,
        );

        // Bell notification.
        await admin.from('notifications').insert({
          user_id: adm.id,
          organization_id: org.id,
          type: 'SYSTEM',
          title: `Trial expires in ${daysLeft} ${dayLabel}`,
          message: `Your OpenHR trial for ${org.name} expires in ${daysLeft} ${dayLabel}.`,
          is_read: false,
          priority: isUrgent ? 'URGENT' : 'HIGH',
          action_url: 'upgrade',
        });

        reminded++;
      }
    }
  }

  console.log(`[cron-expire-trials] Done. expired=${expired} reminded=${reminded}`);
  return jsonResponse(200, { success: true, expired, reminded });
});
