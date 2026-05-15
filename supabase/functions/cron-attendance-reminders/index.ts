// OpenHR — Attendance Reminders Cron
// Schedule: 3-59/5 * * * * (every 5 min, offset)
//
// 1. Checkout reminders: employees with check_in today but no check_out,
//    and org-local time has passed the reminder threshold
//    (default: officeEndTime from app_config, or 18:00 fallback).
//    Sends one bell notification per employee per day (idempotent via metadata check).
// 2. Upcoming holiday alerts: notifies all employees of holidays tomorrow.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function toLocalTimeStr(date: Date, tz: string): string {
  try {
    return date.toLocaleString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return `${String(date.getUTCHours()).padStart(2,'0')}:${String(date.getUTCMinutes()).padStart(2,'0')}`;
  }
}

function toLocalDateStr(date: Date, tz: string): string {
  try {
    return date.toLocaleString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return jsonResponse(401, { success: false, message: 'Unauthorized' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);
  const now = new Date();

  const { data: orgs } = await admin
    .from('organizations').select('id, name')
    .neq('subscription_status', 'SUSPENDED');

  let checkoutReminders = 0;
  let holidayAlerts = 0;

  for (const org of orgs ?? []) {
    if (org.name === '__SYSTEM__' || org.name === 'Platform') continue;

    const { data: cfgRow } = await admin
      .from('settings').select('value')
      .eq('organization_id', org.id).eq('key', 'app_config').maybeSingle();

    let cfg: Record<string, unknown> = {};
    try { cfg = cfgRow ? JSON.parse(cfgRow.value) : {}; } catch { continue; }

    const timezone = (cfg.timezone as string) || 'UTC';
    const officeEndTime = (cfg.officeEndTime as string) || '18:00';
    const orgLocalTime = toLocalTimeStr(now, timezone);
    const orgLocalDate = toLocalDateStr(now, timezone);

    // ── Checkout reminders ───────────────────────────────────────────────────
    // Only send after office end time.
    if (orgLocalTime >= officeEndTime) {
      // Find employees checked in today but no checkout.
      const { data: openSessions } = await admin
        .from('attendance')
        .select('id, employee_id, employee_name')
        .eq('organization_id', org.id)
        .eq('date', orgLocalDate)
        .not('check_in', 'is', null)
        .is('check_out', null)
        .neq('status', 'ABSENT');

      for (const sess of openSessions ?? []) {
        // Idempotent: skip if reminder already sent today.
        const { data: existingNotif } = await admin
          .from('notifications').select('id')
          .eq('organization_id', org.id)
          .eq('type', 'ATTENDANCE')
          .eq('reference_id', `checkout_reminder_${orgLocalDate}_${sess.employee_id}`)
          .maybeSingle();

        if (existingNotif) continue;

        const { data: empProfile } = await admin
          .from('profiles').select('id')
          .eq('employee_id', sess.employee_id).eq('organization_id', org.id).maybeSingle();
        if (!empProfile) continue;

        await admin.from('notifications').insert({
          user_id: empProfile.id,
          organization_id: org.id,
          type: 'ATTENDANCE',
          title: 'Don\'t forget to check out!',
          message: `You have an open session from ${orgLocalDate}. Please check out.`,
          is_read: false,
          priority: 'HIGH',
          action_url: 'attendance',
          reference_id: `checkout_reminder_${orgLocalDate}_${sess.employee_id}`,
          reference_type: 'ATTENDANCE_REMINDER',
        });

        checkoutReminders++;
      }
    }

    // ── Tomorrow holiday alerts ──────────────────────────────────────────────
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = toLocalDateStr(tomorrowDate, timezone);

    const { data: holRow } = await admin
      .from('settings').select('value')
      .eq('organization_id', org.id).eq('key', 'holidays').maybeSingle();

    let holidays: Array<{ date: string; name: string }> = [];
    try { holidays = holRow ? JSON.parse(holRow.value) : []; } catch { /* none */ }

    const tomorrowHoliday = holidays.find((h) => h.date === tomorrowStr);
    if (!tomorrowHoliday) continue;

    // Check if already alerted.
    const { data: existingAlert } = await admin
      .from('notifications').select('id')
      .eq('organization_id', org.id)
      .eq('reference_id', `holiday_alert_${tomorrowStr}`)
      .maybeSingle();
    if (existingAlert) continue;

    const { data: allProfiles } = await admin
      .from('profiles').select('id')
      .eq('organization_id', org.id).eq('status', 'ACTIVE');

    for (const p of allProfiles ?? []) {
      await admin.from('notifications').insert({
        user_id: p.id,
        organization_id: org.id,
        type: 'ATTENDANCE',
        title: `Holiday Tomorrow: ${tomorrowHoliday.name}`,
        message: `Tomorrow (${tomorrowStr}) is ${tomorrowHoliday.name}. Office will be closed.`,
        is_read: false,
        priority: 'NORMAL',
        action_url: 'attendance',
        reference_id: `holiday_alert_${tomorrowStr}`,
        reference_type: 'HOLIDAY_ALERT',
      });
      holidayAlerts++;
    }
  }

  console.log(`[cron-attendance-reminders] Done. checkoutReminders=${checkoutReminders} holidayAlerts=${holidayAlerts}`);
  return jsonResponse(200, { success: true, checkoutReminders, holidayAlerts });
});
