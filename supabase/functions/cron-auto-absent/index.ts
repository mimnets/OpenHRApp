// OpenHR — Auto Absent Check Cron
// Schedule: * * * * * (every minute)
//
// For each org with autoAbsentEnabled in app_config:
//   - Converts server UTC to org-local time using stored IANA timezone.
//   - If org-local time exactly matches autoAbsentTime AND today is a working day
//     AND not a holiday → marks absent all active non-ADMIN employees with no
//     attendance record and no approved leave for today.
//   - Inserts ATTENDANCE notification for each absent employee.
//
// Minute-precision is best-effort: Edge Function cold start may add ~1s latency.
// Early-exit guard: only runs on :X0 and :X5 minutes (standard autoAbsentTime values).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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

function toLocalDayName(dateStr: string): string {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[new Date(`${dateStr}T12:00:00Z`).getDay()];
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse(401, { success: false, message: 'Unauthorized' });
  }

  const now = new Date();
  const serverMinute = String(now.getUTCMinutes()).slice(-1);

  // Early exit: autoAbsentTime is always :X0 or :X5 — skip all other minutes.
  if (serverMinute !== '0' && serverMinute !== '5') {
    return jsonResponse(200, { success: true, skipped: true, reason: 'non-target minute' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Load all non-SUSPENDED orgs.
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name')
    .neq('subscription_status', 'SUSPENDED');

  let totalMarked = 0;
  let totalSkipped = 0;

  for (const org of orgs ?? []) {
    if (org.name === '__SYSTEM__' || org.name === 'Platform') continue;

    // Load org app_config.
    const { data: cfgRow } = await admin
      .from('settings')
      .select('value')
      .eq('organization_id', org.id)
      .eq('key', 'app_config')
      .maybeSingle();

    let cfg: Record<string, unknown> = {};
    try { cfg = cfgRow ? JSON.parse(cfgRow.value) : {}; } catch { continue; }

    if (!cfg.autoAbsentEnabled) continue;

    const targetTime = (cfg.autoAbsentTime as string) || '23:55';
    const timezone = (cfg.timezone as string) || 'UTC';
    const workingDays = (cfg.workingDays as string[]) || ['Monday','Tuesday','Wednesday','Thursday','Sunday'];

    const orgLocalTime = toLocalTimeStr(now, timezone);
    if (orgLocalTime !== targetTime) continue;

    const orgLocalDate = toLocalDateStr(now, timezone);
    const orgDayName = toLocalDayName(orgLocalDate);

    if (!workingDays.includes(orgDayName)) {
      console.log(`[cron-auto-absent] ${org.name}: skip — ${orgDayName} not a working day`);
      continue;
    }

    // Check org holiday list.
    const { data: holRow } = await admin
      .from('settings')
      .select('value')
      .eq('organization_id', org.id)
      .eq('key', 'holidays')
      .maybeSingle();

    let holidays: Array<{ date: string }> = [];
    try { holidays = holRow ? JSON.parse(holRow.value) : []; } catch { /* no holidays */ }

    if (holidays.some((h) => h.date === orgLocalDate)) {
      console.log(`[cron-auto-absent] ${org.name}: skip — holiday on ${orgLocalDate}`);
      continue;
    }

    // Load active non-ADMIN employees for this org.
    const { data: employees } = await admin
      .from('profiles')
      .select('id, name, employee_id')
      .eq('organization_id', org.id)
      .eq('status', 'ACTIVE')
      .not('role', 'in', '("ADMIN","SUPER_ADMIN")');

    console.log(`[cron-auto-absent] ${org.name}: TIME MATCHED (${orgLocalTime}). Checking ${employees?.length ?? 0} employees for ${orgLocalDate}`);

    let countMarked = 0;
    let countSkipped = 0;

    for (const emp of employees ?? []) {
      // Already has attendance today?
      const { data: attRow } = await admin
        .from('attendance')
        .select('id')
        .eq('organization_id', org.id)
        .eq('employee_id', emp.employee_id || emp.id)
        .eq('date', orgLocalDate)
        .maybeSingle();

      if (attRow) { countSkipped++; continue; }

      // On approved leave today?
      const { data: leaveRow } = await admin
        .from('leaves')
        .select('id')
        .eq('organization_id', org.id)
        .eq('employee_id', emp.employee_id || emp.id)
        .eq('status', 'APPROVED')
        .lte('start_date', orgLocalDate)
        .gte('end_date', orgLocalDate)
        .maybeSingle();

      if (leaveRow) {
        console.log(`[cron-auto-absent] Skip ${emp.name}: approved leave`);
        countSkipped++;
        continue;
      }

      // Mark absent.
      const { error: insertErr } = await admin.from('attendance').insert({
        organization_id: org.id,
        employee_id: emp.employee_id || emp.id,
        employee_name: emp.name,
        date: orgLocalDate,
        status: 'ABSENT',
        remarks: `System Auto-Absent: No punch by ${targetTime}`,
        location: 'N/A',
      });

      if (insertErr) {
        console.error(`[cron-auto-absent] Failed for ${emp.name}: ${insertErr.message}`);
        continue;
      }

      // Bell notification.
      await admin.from('notifications').insert({
        user_id: emp.id,
        organization_id: org.id,
        type: 'ATTENDANCE',
        title: 'Marked Absent',
        message: `No attendance punch recorded for ${orgLocalDate}. Marked as absent.`,
        is_read: false,
        priority: 'HIGH',
        action_url: 'attendance-logs',
      });

      countMarked++;
      console.log(`[cron-auto-absent] MARKED ABSENT: ${emp.name}`);
    }

    totalMarked += countMarked;
    totalSkipped += countSkipped;
    console.log(`[cron-auto-absent] ${org.name} done. absent=${countMarked} skipped=${countSkipped}`);
  }

  return jsonResponse(200, { success: true, marked: totalMarked, skipped: totalSkipped });
});
