// OpenHR — Daily Attendance Report Cron
// Schedule: 0 23 * * * (daily 11 PM UTC)
//
// For each org with dailyReportEnabled in app_config:
//   - Counts PRESENT/LATE/ABSENT and approved leaves for org-local today.
//   - Sends email report to all ADMIN and HR profiles via Resend.
//   - Inserts a bell notification for each ADMIN/HR profile.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FROM_EMAIL = 'OpenHR <noreply@openhrapp.com>';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function toLocalDateStr(date: Date, tz: string): string {
  try {
    return date.toLocaleString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

async function sendEmail(resendKey: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) console.error(`[cron-daily-report] Resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return jsonResponse(401, { success: false, message: 'Unauthorized' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const admin = createClient(supabaseUrl, serviceKey);
  const now = new Date();

  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name')
    .neq('subscription_status', 'SUSPENDED');

  let reportsSent = 0;

  for (const org of orgs ?? []) {
    if (org.name === '__SYSTEM__' || org.name === 'Platform') continue;

    const { data: cfgRow } = await admin
      .from('settings').select('value')
      .eq('organization_id', org.id).eq('key', 'app_config').maybeSingle();

    let cfg: Record<string, unknown> = {};
    try { cfg = cfgRow ? JSON.parse(cfgRow.value) : {}; } catch { continue; }
    if (!cfg.dailyReportEnabled) continue;

    const timezone = (cfg.timezone as string) || 'UTC';
    const dateStr = toLocalDateStr(now, timezone);

    // Count attendance statuses for today.
    const { data: attRows } = await admin
      .from('attendance').select('status')
      .eq('organization_id', org.id).eq('date', dateStr);

    let present = 0, late = 0, absent = 0;
    for (const row of attRows ?? []) {
      if (row.status === 'PRESENT') present++;
      else if (row.status === 'LATE') late++;
      else if (row.status === 'ABSENT') absent++;
    }

    // Count approved leaves covering today.
    const { count: onLeave } = await admin
      .from('leaves').select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id).eq('status', 'APPROVED')
      .lte('start_date', dateStr).gte('end_date', dateStr);

    const leaveCount = onLeave ?? 0;
    const total = present + late + absent;

    // Fetch ADMIN + HR profiles.
    const { data: admins } = await admin
      .from('profiles').select('id, name')
      .eq('organization_id', org.id)
      .in('role', ['ADMIN', 'HR']);

    const { data: authData } = await admin.auth.admin.listUsers();
    const authMap = new Map(authData?.users?.map((u) => [u.id, u.email]) ?? []);

    for (const adm of admins ?? []) {
      // Bell notification.
      await admin.from('notifications').insert({
        user_id: adm.id,
        organization_id: org.id,
        type: 'ATTENDANCE',
        title: `Daily Attendance Report: ${dateStr}`,
        message: `Present: ${present} | Late: ${late} | Absent: ${absent} | On Leave: ${leaveCount}`,
        is_read: false,
        priority: absent > 0 ? 'URGENT' : 'NORMAL',
        action_url: 'attendance',
      });

      // Email.
      if (!resendKey) continue;
      const email = authMap.get(adm.id);
      if (!email) continue;

      await sendEmail(
        resendKey,
        email,
        `Daily Attendance Report — ${dateStr} — ${org.name}`,
        `<h2>Daily Attendance Report</h2>
         <p><strong>Organization:</strong> ${org.name}</p>
         <p><strong>Date:</strong> ${dateStr}</p>
         <table style="border-collapse:collapse;margin-top:16px;">
           <tr style="background:#f8f9fa;">
             <th style="padding:12px;border:1px solid #ddd;text-align:left;">Status</th>
             <th style="padding:12px;border:1px solid #ddd;text-align:center;">Count</th>
           </tr>
           <tr><td style="padding:12px;border:1px solid #ddd;color:#10b981;">Present</td><td style="padding:12px;border:1px solid #ddd;text-align:center;">${present}</td></tr>
           <tr><td style="padding:12px;border:1px solid #ddd;color:#f59e0b;">Late</td><td style="padding:12px;border:1px solid #ddd;text-align:center;">${late}</td></tr>
           <tr><td style="padding:12px;border:1px solid #ddd;color:#ef4444;">Absent</td><td style="padding:12px;border:1px solid #ddd;text-align:center;">${absent}</td></tr>
           <tr><td style="padding:12px;border:1px solid #ddd;color:#3b82f6;">On Leave</td><td style="padding:12px;border:1px solid #ddd;text-align:center;">${leaveCount}</td></tr>
           <tr style="background:#f8f9fa;"><td style="padding:12px;border:1px solid #ddd;"><strong>Total Tracked</strong></td><td style="padding:12px;border:1px solid #ddd;text-align:center;"><strong>${total}</strong></td></tr>
         </table>
         <p style="margin-top:16px;color:#6b7280;font-size:12px;">Automated daily report from OpenHR.</p>`,
      );
      reportsSent++;
    }
  }

  console.log(`[cron-daily-report] Done. reports_sent=${reportsSent}`);
  return jsonResponse(200, { success: true, reportsSent });
});
