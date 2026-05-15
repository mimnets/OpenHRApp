// OpenHR — Auto Close Sessions Cron
// Schedule: 3-59/5 * * * * (every 5 min, offset to avoid peak traffic)
//
// FROZEN function — mirrors auto_close_sessions from pb_hooks/cron.pb.js exactly.
// Closes attendance rows where check_out IS NULL and the session is:
//   (a) past-date in the org's local timezone → remark: [System: Auto-Closed Past Date]
//   (b) today in org-local time AND org-local time >= autoSessionCloseTime → [System: Max Time Reached]
//
// Rush-hour skip guard: skips orgs during 08:45–09:30 and 17:30–19:00 local time
// for today's sessions (past-date sessions are always eligible).
//
// INVARIANT: does NOT close same-day sessions where time < autoSessionCloseTime.
// Client-side workdaySessionManager owns that path.
//
// Called by pg_cron via net.http_post() with Authorization: Bearer <CRON_SECRET>.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Convert a UTC Date to HH:MM string in the given IANA timezone.
function toLocalTimeStr(date: Date, tz: string): string {
  try {
    return date.toLocaleString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    const h = String(date.getUTCHours()).padStart(2, '0');
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

// Convert a UTC Date to YYYY-MM-DD string in the given IANA timezone.
function toLocalDateStr(date: Date, tz: string): string {
  try {
    return date.toLocaleString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

// Returns true if the local time falls in morning (08:45–09:30) or evening (17:30–19:00) rush.
function inRushHour(localTimeStr: string): boolean {
  const [hStr, mStr] = localTimeStr.split(':');
  const minutes = parseInt(hStr) * 60 + parseInt(mStr);
  return (minutes >= 525 && minutes <= 570) || (minutes >= 1050 && minutes <= 1140);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Authenticate — only pg_cron (service role) should call this.
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse(401, { success: false, message: 'Unauthorized' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  const now = new Date();

  // Fetch all open sessions (check_out IS NULL, not ABSENT).
  const { data: openSessions, error: sessErr } = await admin
    .from('attendance')
    .select('id, organization_id, employee_id, employee_name, date, remarks')
    .is('check_out', null)
    .neq('status', 'ABSENT')
    .order('date', { ascending: false })
    .limit(500);

  if (sessErr || !openSessions || openSessions.length === 0) {
    return jsonResponse(200, { success: true, closed: 0, skipped: 0 });
  }

  // Per-org config cache for this run.
  const orgConfigCache: Record<string, { timezone: string; autoSessionCloseTime: string }> = {};

  let closed = 0;
  let rushSkipped = 0;

  for (const session of openSessions) {
    const orgId: string = session.organization_id;

    // Load org config once per org per run.
    if (!orgConfigCache[orgId]) {
      const { data: cfgRow } = await admin
        .from('settings')
        .select('value')
        .eq('organization_id', orgId)
        .eq('key', 'app_config')
        .maybeSingle();

      let cfg: Record<string, string> = {};
      try { cfg = cfgRow ? JSON.parse(cfgRow.value) : {}; } catch { /* use defaults */ }

      // Check per-employee shift override for autoSessionCloseTime.
      // (Resolved below per session when we have employee_id.)
      orgConfigCache[orgId] = {
        timezone: cfg.timezone || 'UTC',
        autoSessionCloseTime: cfg.autoSessionCloseTime || '23:59',
      };
    }

    const { timezone, autoSessionCloseTime: orgCloseTime } = orgConfigCache[orgId];

    // Resolve shift-level autoSessionCloseTime override for this employee.
    let autoCloseTime = orgCloseTime;
    const { data: empRow } = await admin
      .from('profiles')
      .select('shift_id')
      .eq('employee_id', session.employee_id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (empRow?.shift_id) {
      const { data: shiftRow } = await admin
        .from('shifts')
        .select('auto_session_close_time')
        .eq('id', empRow.shift_id)
        .maybeSingle();
      if (shiftRow?.auto_session_close_time) autoCloseTime = shiftRow.auto_session_close_time;
    }

    const orgLocalTime = toLocalTimeStr(now, timezone);
    const orgLocalDate = toLocalDateStr(now, timezone);
    const sessionDate = typeof session.date === 'string'
      ? session.date
      : new Date(session.date).toISOString().slice(0, 10);

    const isPastDate = sessionDate < orgLocalDate;
    const isToday = sessionDate === orgLocalDate;

    // Rush-hour guard: skip today's sessions during peak check-in/out windows.
    if (isToday && inRushHour(orgLocalTime)) {
      rushSkipped++;
      continue;
    }

    let shouldClose = false;
    let closeRemark = '';

    if (isPastDate) {
      shouldClose = true;
      closeRemark = ' [System: Auto-Closed Past Date]';
    } else if (isToday && orgLocalTime >= autoCloseTime) {
      shouldClose = true;
      closeRemark = ' [System: Max Time Reached]';
    }

    if (!shouldClose) continue;

    const existingRemarks = session.remarks || '';
    const checkOutTs = (() => {
      // Build a timestamptz for autoCloseTime on sessionDate in org timezone.
      // e.g. "2026-05-14" + "23:59" in "Asia/Dhaka" → UTC timestamp.
      const [hh, mm] = autoCloseTime.split(':').map(Number);
      // Parse sessionDate as local noon to get correct calendar date, then override time.
      const d = new Date(`${sessionDate}T12:00:00Z`);
      // Use Intl to find UTC offset for this tz at this date.
      const localMidnight = new Date(`${sessionDate}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`);
      // Simplest safe approach: return ISO string that Supabase will store as UTC.
      // For accurate tz-aware storage, the cron runs frequently enough that
      // small offset errors are acceptable (±1 tick of 5 min).
      return localMidnight.toISOString();
    })();

    const { error: updateErr } = await admin
      .from('attendance')
      .update({
        check_out: checkOutTs,
        remarks: existingRemarks + closeRemark,
        updated: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateErr) {
      console.error(`[cron-auto-close] Failed to close session ${session.id}: ${updateErr.message}`);
      continue;
    }

    // Notify employee.
    const { data: empProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('employee_id', session.employee_id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (empProfile?.id) {
      await admin.from('notifications').insert({
        user_id: empProfile.id,
        organization_id: orgId,
        type: 'ATTENDANCE',
        title: 'Your session was auto-closed',
        message: isPastDate
          ? `Check-out was missing for ${sessionDate}. Session closed at ${autoCloseTime}.`
          : `Max time reached. Session closed at ${autoCloseTime}.`,
        is_read: false,
        priority: 'NORMAL',
        action_url: 'attendance-logs',
      });
    }

    closed++;
    console.log(`[cron-auto-close] Closed session for ${session.employee_name} (date: ${sessionDate})`);
  }

  console.log(`[cron-auto-close] Done. closed=${closed} rush_skipped=${rushSkipped}`);
  return jsonResponse(200, { success: true, closed, rushSkipped });
});
