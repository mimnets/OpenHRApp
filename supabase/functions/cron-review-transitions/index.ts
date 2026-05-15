// OpenHR — Review Cycle Transition Cron
// Schedule: 0 0 * * * (daily midnight UTC)
//
// 1. Opens cycles where start_date <= today and is_active = false → sets is_active = true.
//    Notifies employees + managers + HR.
// 2. Closes cycles where end_date < today and is_active = true → sets is_active = false.
//    Notifies relevant parties.
// 3. Sends deadline reminders (3d, 1d before review_end_date) to employees with DRAFT
//    reviews and managers with pending reviews.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FROM_EMAIL = 'OpenHR <noreply@openhrapp.com>';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function sendEmail(resendKey: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) console.error(`[cron-review] Resend ${res.status}: ${await res.text()}`);
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

  const todayStr = new Date().toISOString().slice(0, 10);
  let opened = 0, closed = 0, reminded = 0;

  const { data: authData } = await admin.auth.admin.listUsers();
  const authMap = new Map(authData?.users?.map((u) => [u.id, u.email]) ?? []);

  // ── 1. Open cycles that should start ────────────────────────────────────────
  const { data: toOpen } = await admin
    .from('review_cycles')
    .select('id, organization_id, name')
    .eq('is_active', false)
    .lte('start_date', todayStr)
    .gte('end_date', todayStr);

  for (const cycle of toOpen ?? []) {
    await admin.from('review_cycles').update({ is_active: true, updated: new Date().toISOString() }).eq('id', cycle.id);
    opened++;
    console.log(`[cron-review] Opened cycle: ${cycle.name}`);

    // Notify all active employees + HR/ADMIN in org.
    const { data: profiles } = await admin
      .from('profiles').select('id, name, role')
      .eq('organization_id', cycle.organization_id)
      .eq('status', 'ACTIVE');

    for (const p of profiles ?? []) {
      const isHR = p.role === 'ADMIN' || p.role === 'HR';
      await admin.from('notifications').insert({
        user_id: p.id,
        organization_id: cycle.organization_id,
        type: 'REVIEW',
        title: 'Performance Review Cycle Open',
        message: isHR
          ? `Review cycle "${cycle.name}" is now open. Manage employee reviews.`
          : `Review cycle "${cycle.name}" is open. Please complete your self-assessment.`,
        is_read: false,
        priority: isHR ? 'HIGH' : 'NORMAL',
        action_url: 'performance-review',
      });
    }
  }

  // ── 2. Close cycles that have ended ─────────────────────────────────────────
  const { data: toClose } = await admin
    .from('review_cycles')
    .select('id, organization_id, name')
    .eq('is_active', true)
    .lt('end_date', todayStr);

  for (const cycle of toClose ?? []) {
    await admin.from('review_cycles').update({ is_active: false, updated: new Date().toISOString() }).eq('id', cycle.id);
    closed++;
    console.log(`[cron-review] Closed cycle: ${cycle.name}`);

    // Notify employees with incomplete (DRAFT) reviews.
    const { data: draftReviews } = await admin
      .from('performance_reviews')
      .select('employee_id')
      .eq('cycle_id', cycle.id)
      .eq('status', 'PENDING');

    for (const rev of draftReviews ?? []) {
      const { data: empProfile } = await admin
        .from('profiles').select('id').eq('employee_id', rev.employee_id)
        .eq('organization_id', cycle.organization_id).maybeSingle();
      if (!empProfile) continue;

      await admin.from('notifications').insert({
        user_id: empProfile.id,
        organization_id: cycle.organization_id,
        type: 'REVIEW',
        title: 'Review Cycle Closed',
        message: `Review cycle "${cycle.name}" has closed. Your self-assessment was not submitted.`,
        is_read: false,
        priority: 'HIGH',
        action_url: 'performance-review',
      });
    }

    // Notify HR/ADMIN.
    const { data: hrProfiles } = await admin
      .from('profiles').select('id').eq('organization_id', cycle.organization_id).in('role', ['ADMIN', 'HR']);
    for (const p of hrProfiles ?? []) {
      await admin.from('notifications').insert({
        user_id: p.id,
        organization_id: cycle.organization_id,
        type: 'REVIEW',
        title: 'Review Cycle Closed',
        message: `Review cycle "${cycle.name}" has ended.`,
        is_read: false,
        priority: 'NORMAL',
        action_url: 'performance-review',
      });
    }
  }

  // ── 3. Deadline reminders: 3d and 1d before review_end_date ─────────────────
  for (const daysLeft of [3, 1]) {
    const targetDate = new Date();
    targetDate.setUTCDate(targetDate.getUTCDate() + daysLeft);
    const targetStr = targetDate.toISOString().slice(0, 10);

    const { data: nearDeadlineCycles } = await admin
      .from('review_cycles')
      .select('id, organization_id, name')
      .eq('is_active', true)
      .eq('review_end_date', targetStr);

    for (const cycle of nearDeadlineCycles ?? []) {
      // Remind employees with PENDING (draft) reviews.
      const { data: pendingReviews } = await admin
        .from('performance_reviews').select('employee_id')
        .eq('cycle_id', cycle.id).eq('status', 'PENDING');

      for (const rev of pendingReviews ?? []) {
        const { data: empProfile } = await admin
          .from('profiles').select('id, name')
          .eq('employee_id', rev.employee_id).eq('organization_id', cycle.organization_id).maybeSingle();
        if (!empProfile) continue;

        await admin.from('notifications').insert({
          user_id: empProfile.id,
          organization_id: cycle.organization_id,
          type: 'REVIEW',
          title: `Review deadline in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
          message: `Self-assessment for "${cycle.name}" is due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`,
          is_read: false,
          priority: daysLeft === 1 ? 'URGENT' : 'HIGH',
          action_url: 'performance-review',
        });

        if (resendKey) {
          const email = authMap.get(empProfile.id);
          if (email) {
            await sendEmail(
              resendKey, email,
              `Review deadline in ${daysLeft} day${daysLeft > 1 ? 's' : ''} — ${cycle.name}`,
              `<p>Dear ${empProfile.name || 'Team Member'},</p>
               <p>Your self-assessment for <strong>${cycle.name}</strong> is due in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>. Please log in to complete it.</p>`,
            );
          }
        }
        reminded++;
      }

      // Remind managers with SELF_REVIEW_SUBMITTED reviews pending their action.
      const { data: managerPending } = await admin
        .from('performance_reviews').select('line_manager_id')
        .eq('cycle_id', cycle.id).eq('status', 'SELF_REVIEW_SUBMITTED');

      const managerIds = [...new Set((managerPending ?? []).map((r) => r.line_manager_id).filter(Boolean))];
      for (const mgr of managerIds) {
        const { data: mgrProfile } = await admin
          .from('profiles').select('id, name')
          .eq('employee_id', mgr).eq('organization_id', cycle.organization_id).maybeSingle();
        if (!mgrProfile) continue;

        await admin.from('notifications').insert({
          user_id: mgrProfile.id,
          organization_id: cycle.organization_id,
          type: 'REVIEW',
          title: `Review deadline in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
          message: `You have pending manager reviews for "${cycle.name}" due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`,
          is_read: false,
          priority: daysLeft === 1 ? 'URGENT' : 'HIGH',
          action_url: 'performance-review',
        });
        reminded++;
      }
    }
  }

  console.log(`[cron-review] Done. opened=${opened} closed=${closed} reminded=${reminded}`);
  return jsonResponse(200, { success: true, opened, closed, reminded });
});
