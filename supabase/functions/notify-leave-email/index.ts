// OpenHR — Notify Leave Email Edge Function
// Sends email notifications for leave application lifecycle events:
//   SUBMITTED → employee confirmation + manager action-required + HR FYI
//   MANAGER_APPROVED → employee update + HR action-required
//   MANAGER_REJECTED → employee notice + HR FYI
//   HR_APPROVED → employee confirmation + manager FYI + HR record
//   HR_REJECTED → employee notice + manager FYI + HR record
//
// Called from client-side leave.service.ts after leave status changes.
// Deno runtime (Supabase Edge Functions)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FROM_EMAIL = 'OpenHR <noreply@openhrapp.com>';
const APP_URL = 'https://app.openhr.app';

// ── Types ──────────────────────────────────────────────────────────────────────

type LeaveAction = 'SUBMITTED' | 'MANAGER_APPROVED' | 'MANAGER_REJECTED' | 'HR_APPROVED' | 'HR_REJECTED';

interface LeaveRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  line_manager_id: string | null;
  type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  manager_remarks: string | null;
  approver_remarks: string | null;
  organization_id: string;
}

interface Profile {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

// ── Email HTML templates ───────────────────────────────────────────────────────

function baseTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background-color:#4f46e5;padding:24px 32px;text-align:center;">
            <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0;">OpenHR</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111827;font-size:18px;font-weight:600;margin:0 0 8px 0;">${title}</h2>
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#6b7280;font-size:12px;margin:0;">
              This is an automated message from OpenHR.
              <br><a href="${APP_URL}" style="color:#4f46e5;text-decoration:none;">${APP_URL}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function leaveDetailsTable(leave: LeaveRecord): string {
  return `
<table cellpadding="8" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:8px;margin:16px 0;">
  <tr><td style="color:#6b7280;font-size:13px;width:120px;">Employee</td><td style="color:#111827;font-size:14px;font-weight:500;">${escapeHtml(leave.employee_name)}</td></tr>
  <tr style="background-color:#f9fafb;"><td style="color:#6b7280;font-size:13px;">Leave Type</td><td style="color:#111827;font-size:14px;">${escapeHtml(leave.type)}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;">Start Date</td><td style="color:#111827;font-size:14px;">${formatDate(leave.start_date)}</td></tr>
  <tr style="background-color:#f9fafb;"><td style="color:#6b7280;font-size:13px;">End Date</td><td style="color:#111827;font-size:14px;">${formatDate(leave.end_date)}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;">Total Days</td><td style="color:#111827;font-size:14px;font-weight:500;">${leave.total_days}</td></tr>
  <tr style="background-color:#f9fafb;"><td style="color:#6b7280;font-size:13px;">Reason</td><td style="color:#111827;font-size:14px;">${escapeHtml(leave.reason || '—')}</td></tr>
</table>`;
}

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    'PENDING_MANAGER': '#f59e0b',
    'PENDING_HR': '#f59e0b',
    'APPROVED': '#10b981',
    'REJECTED': '#ef4444',
  };
  const labels: Record<string, string> = {
    'PENDING_MANAGER': 'Pending Manager Approval',
    'PENDING_HR': 'Pending HR Approval',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected',
  };
  const color = colors[status] || '#6b7280';
  const label = labels[status] || status;
  return `<span style="display:inline-block;background-color:${color}15;color:${color};border:1px solid ${color}30;padding:2px 10px;border-radius:9999px;font-size:13px;font-weight:500;">${label}</span>`;
}

function ctaButton(text: string, url: string): string {
  return `
<div style="text-align:center;margin:24px 0;">
  <a href="${url}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
    ${text}
  </a>
</div>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Scenario-specific email builders ────────────────────────────────────────────

function buildEmployeeEmail(leave: LeaveRecord, action: LeaveAction): { subject: string; html: string } | null {
  const details = leaveDetailsTable(leave);

  switch (action) {
    case 'SUBMITTED': {
      const nextStep = leave.status === 'PENDING_MANAGER'
        ? '<p style="color:#4b5563;font-size:14px;">Your line manager will review your request. You will be notified when there is an update.</p>'
        : '<p style="color:#4b5563;font-size:14px;">The HR team will review your request. You will be notified when there is an update.</p>';
      return {
        subject: `Leave Request Submitted — ${leave.type} (${formatDate(leave.start_date)} — ${formatDate(leave.end_date)})`,
        html: baseTemplate('Leave Request Submitted', `
          <p style="color:#4b5563;font-size:14px;">Your leave request has been submitted successfully.</p>
          ${details}
          <p style="color:#111827;font-size:14px;font-weight:500;">Status: ${statusBadge(leave.status)}</p>
          ${nextStep}
          ${ctaButton('View Leave Status', `${APP_URL}/dashboard`)}
        `),
      };
    }

    case 'MANAGER_APPROVED':
      return {
        subject: `Leave Approved by Manager — ${leave.type} (${formatDate(leave.start_date)} — ${formatDate(leave.end_date)})`,
        html: baseTemplate('Manager Approved — Pending HR Review', `
          <p style="color:#4b5563;font-size:14px;">Your line manager has <strong style="color:#10b981;">approved</strong> your leave request. It is now pending final review by HR.</p>
          ${details}
          <p style="color:#111827;font-size:14px;font-weight:500;">Status: ${statusBadge('PENDING_HR')}</p>
          ${leave.manager_remarks ? `<p style="color:#4b5563;font-size:13px;background-color:#f9fafb;padding:12px;border-radius:6px;border-left:3px solid #4f46e5;"><strong>Manager Remarks:</strong> ${escapeHtml(leave.manager_remarks)}</p>` : ''}
          ${ctaButton('View Leave Status', `${APP_URL}/dashboard`)}
        `),
      };

    case 'MANAGER_REJECTED':
      return {
        subject: `Leave Request Rejected — ${leave.type} (${formatDate(leave.start_date)} — ${formatDate(leave.end_date)})`,
        html: baseTemplate('Leave Request Rejected', `
          <p style="color:#4b5563;font-size:14px;">Your leave request has been <strong style="color:#ef4444;">rejected</strong> by your line manager.</p>
          ${details}
          <p style="color:#111827;font-size:14px;font-weight:500;">Status: ${statusBadge('REJECTED')}</p>
          ${leave.manager_remarks ? `<p style="color:#4b5563;font-size:13px;background-color:#fef2f2;padding:12px;border-radius:6px;border-left:3px solid #ef4444;"><strong>Reason:</strong> ${escapeHtml(leave.manager_remarks)}</p>` : ''}
          ${ctaButton('View Dashboard', `${APP_URL}/dashboard`)}
        `),
      };

    case 'HR_APPROVED':
      return {
        subject: `Leave Approved! — ${leave.type} (${formatDate(leave.start_date)} — ${formatDate(leave.end_date)})`,
        html: baseTemplate('Leave Approved! 🎉', `
          <p style="color:#4b5563;font-size:14px;">Your leave request has been <strong style="color:#10b981;">fully approved</strong>.</p>
          ${details}
          <p style="color:#111827;font-size:14px;font-weight:500;">Status: ${statusBadge('APPROVED')}</p>
          ${leave.approver_remarks ? `<p style="color:#4b5563;font-size:13px;background-color:#f0fdf4;padding:12px;border-radius:6px;border-left:3px solid #10b981;"><strong>HR Remarks:</strong> ${escapeHtml(leave.approver_remarks)}</p>` : ''}
          <p style="color:#4b5563;font-size:14px;margin-top:16px;">Enjoy your time off!</p>
          ${ctaButton('View Dashboard', `${APP_URL}/dashboard`)}
        `),
      };

    case 'HR_REJECTED':
      return {
        subject: `Leave Request Rejected — ${leave.type} (${formatDate(leave.start_date)} — ${formatDate(leave.end_date)})`,
        html: baseTemplate('Leave Request Rejected', `
          <p style="color:#4b5563;font-size:14px;">Your leave request has been <strong style="color:#ef4444;">rejected</strong> by HR.</p>
          ${details}
          <p style="color:#111827;font-size:14px;font-weight:500;">Status: ${statusBadge('REJECTED')}</p>
          ${leave.approver_remarks ? `<p style="color:#4b5563;font-size:13px;background-color:#fef2f2;padding:12px;border-radius:6px;border-left:3px solid #ef4444;"><strong>Reason:</strong> ${escapeHtml(leave.approver_remarks)}</p>` : ''}
          ${ctaButton('View Dashboard', `${APP_URL}/dashboard`)}
        `),
      };

    default:
      return null;
  }
}

function buildManagerEmail(leave: LeaveRecord, action: LeaveAction, employeeName: string): { subject: string; html: string } | null {
  const details = leaveDetailsTable(leave);

  switch (action) {
    case 'SUBMITTED':
      if (leave.status !== 'PENDING_MANAGER') return null; // Only email manager if leave needs their approval
      return {
        subject: `Action Required: Leave Request from ${escapeHtml(employeeName)} — ${leave.type}`,
        html: baseTemplate('New Leave Request Needs Your Approval', `
          <p style="color:#4b5563;font-size:14px;"><strong>${escapeHtml(employeeName)}</strong> has submitted a leave request and requires your approval.</p>
          ${details}
          <p style="color:#111827;font-size:14px;font-weight:500;">Status: ${statusBadge('PENDING_MANAGER')}</p>
          ${ctaButton('Review Leave Request', `${APP_URL}/dashboard`)}
        `),
      };

    case 'HR_APPROVED':
      return {
        subject: `Leave Approved: ${escapeHtml(employeeName)} — ${leave.type}`,
        html: baseTemplate('Leave Request Fully Approved', `
          <p style="color:#4b5563;font-size:14px;">The leave request from <strong>${escapeHtml(employeeName)}</strong> has been <strong style="color:#10b981;">fully approved</strong> by HR.</p>
          ${details}
          <p style="color:#111827;font-size:14px;font-weight:500;">Status: ${statusBadge('APPROVED')}</p>
          ${ctaButton('View Dashboard', `${APP_URL}/dashboard`)}
        `),
      };

    case 'HR_REJECTED':
      return {
        subject: `Leave Rejected: ${escapeHtml(employeeName)} — ${leave.type}`,
        html: baseTemplate('Leave Request Rejected by HR', `
          <p style="color:#4b5563;font-size:14px;">The leave request from <strong>${escapeHtml(employeeName)}</strong> has been <strong style="color:#ef4444;">rejected</strong> by HR.</p>
          ${details}
          ${leave.approver_remarks ? `<p style="color:#4b5563;font-size:13px;background-color:#fef2f2;padding:12px;border-radius:6px;border-left:3px solid #ef4444;"><strong>Reason:</strong> ${escapeHtml(leave.approver_remarks)}</p>` : ''}
          ${ctaButton('View Dashboard', `${APP_URL}/dashboard`)}
        `),
      };

    default:
      return null;
  }
}

function buildHrEmail(leave: LeaveRecord, action: LeaveAction, employeeName: string, managerName: string | null): { subject: string; html: string } | null {
  const details = leaveDetailsTable(leave);

  switch (action) {
    case 'SUBMITTED': {
      const route = leave.status === 'PENDING_HR'
        ? '<p style="color:#4b5563;font-size:14px;">This request has been routed <strong>directly to HR</strong> for approval (no line manager or department workflow bypasses manager).</p>'
        : `<p style="color:#4b5563;font-size:14px;">This request is currently pending approval from the line manager${managerName ? ` (<strong>${escapeHtml(managerName)}</strong>)` : ''}.</p>`;
      return {
        subject: `New Leave Submission: ${escapeHtml(employeeName)} — ${leave.type}`,
        html: baseTemplate('New Leave Request Submitted', `
          <p style="color:#4b5563;font-size:14px;"><strong>${escapeHtml(employeeName)}</strong> has submitted a new leave request.</p>
          ${details}
          <p style="color:#111827;font-size:14px;font-weight:500;">Status: ${statusBadge(leave.status)}</p>
          ${route}
          ${ctaButton('View All Leaves', `${APP_URL}/dashboard`)}
        `),
      };
    }

    case 'MANAGER_APPROVED':
      return {
        subject: `Manager Approved — Action Required: ${escapeHtml(employeeName)} — ${leave.type}`,
        html: baseTemplate('Leave Request Needs HR Approval', `
          <p style="color:#4b5563;font-size:14px;">The leave request from <strong>${escapeHtml(employeeName)}</strong> has been approved by the line manager${managerName ? ` (<strong>${escapeHtml(managerName)}</strong>)` : ''} and now requires <strong>HR approval</strong>.</p>
          ${details}
          <p style="color:#111827;font-size:14px;font-weight:500;">Status: ${statusBadge('PENDING_HR')}</p>
          ${leave.manager_remarks ? `<p style="color:#4b5563;font-size:13px;background-color:#f9fafb;padding:12px;border-radius:6px;border-left:3px solid #4f46e5;"><strong>Manager Remarks:</strong> ${escapeHtml(leave.manager_remarks)}</p>` : ''}
          ${ctaButton('Review & Approve', `${APP_URL}/dashboard`)}
        `),
      };

    case 'MANAGER_REJECTED':
      return {
        subject: `Manager Rejected: ${escapeHtml(employeeName)} — ${leave.type}`,
        html: baseTemplate('Leave Request Rejected by Manager', `
          <p style="color:#4b5563;font-size:14px;">The leave request from <strong>${escapeHtml(employeeName)}</strong> has been <strong style="color:#ef4444;">rejected</strong> by the line manager${managerName ? ` (<strong>${escapeHtml(managerName)}</strong>)` : ''}. No further action is needed.</p>
          ${details}
          <p style="color:#111827;font-size:14px;font-weight:500;">Status: ${statusBadge('REJECTED')}</p>
          ${leave.manager_remarks ? `<p style="color:#4b5563;font-size:13px;background-color:#fef2f2;padding:12px;border-radius:6px;border-left:3px solid #ef4444;"><strong>Reason:</strong> ${escapeHtml(leave.manager_remarks)}</p>` : ''}
          ${ctaButton('View All Leaves', `${APP_URL}/dashboard`)}
        `),
      };

    case 'HR_APPROVED':
    case 'HR_REJECTED': {
      const verb = action === 'HR_APPROVED' ? 'approved' : 'rejected';
      const color = action === 'HR_APPROVED' ? '#10b981' : '#ef4444';
      const bg = action === 'HR_APPROVED' ? '#f0fdf4' : '#fef2f2';
      return {
        subject: `Leave ${verb.charAt(0).toUpperCase() + verb.slice(1)}: ${escapeHtml(employeeName)} — ${leave.type}`,
        html: baseTemplate(`Leave Request ${verb.charAt(0).toUpperCase() + verb.slice(1)}`, `
          <p style="color:#4b5563;font-size:14px;">The leave request from <strong>${escapeHtml(employeeName)}</strong> has been <strong style="color:${color};">${verb}</strong> by HR. This is for your records.</p>
          ${details}
          <p style="color:#111827;font-size:14px;font-weight:500;">Status: ${statusBadge(leave.status)}</p>
          ${leave.approver_remarks ? `<p style="color:#4b5563;font-size:13px;background-color:${bg};padding:12px;border-radius:6px;border-left:3px solid ${color};"><strong>HR Remarks:</strong> ${escapeHtml(leave.approver_remarks)}</p>` : ''}
          ${ctaButton('View All Leaves', `${APP_URL}/dashboard`)}
        `),
      };
    }

    default:
      return null;
  }
}

// ── Main handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.error('[NotifyLeaveEmail] RESEND_API_KEY not configured');
    return new Response(JSON.stringify({ message: 'Email not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ message: 'Missing Authorization header' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRole);

  // Verify the caller's JWT
  const token = authHeader.replace('Bearer ', '');
  const { data: { user: caller }, error: authErr } = await adminClient.auth.getUser(token);
  if (authErr || !caller) {
    return new Response(JSON.stringify({ message: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const leaveId = body.leaveId as string;
    const action  = body.action as LeaveAction;
    const orgId   = body.orgId as string | undefined;

    if (!leaveId || !action) {
      return new Response(JSON.stringify({ message: 'Missing required fields: leaveId, action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validActions: LeaveAction[] = ['SUBMITTED', 'MANAGER_APPROVED', 'MANAGER_REJECTED', 'HR_APPROVED', 'HR_REJECTED'];
    if (!validActions.includes(action)) {
      return new Response(JSON.stringify({ message: `Invalid action: ${action}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Fetch leave record ──────────────────────────────────────────────────
    const { data: leave, error: leaveErr } = await adminClient
      .from('leaves')
      .select('*')
      .eq('id', leaveId)
      .single();

    if (leaveErr || !leave) {
      console.error('[NotifyLeaveEmail] Leave not found:', leaveId, leaveErr);
      return new Response(JSON.stringify({ message: 'Leave record not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const leaveRecord: LeaveRecord = leave as any;

    // ── Resolve profiles ────────────────────────────────────────────────────

    // Employee
    const { data: employeeProfile } = await adminClient
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', leaveRecord.employee_id)
      .single();

    // Manager (if line_manager_id is set)
    let managerProfile: Profile | null = null;
    if (leaveRecord.line_manager_id) {
      const { data: mgr } = await adminClient
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', leaveRecord.line_manager_id)
        .single();
      managerProfile = mgr as Profile | null;
    }

    // HR / Admins in the organization
    const { data: hrProfiles } = await adminClient
      .from('profiles')
      .select('id, name, email, role')
      .eq('organization_id', leaveRecord.organization_id)
      .in('role', ['ADMIN', 'HR']);

    const hrAdmins: Profile[] = (hrProfiles as Profile[] | null) ?? [];

    // ── Build and send emails ───────────────────────────────────────────────
    const emails: Array<{ to: string; subject: string; html: string }> = [];

    const empName = employeeProfile?.name || leaveRecord.employee_name || 'Employee';
    const mgrName = managerProfile?.name || null;
    const empEmail = employeeProfile?.email;

    // 1. Email to employee
    if (empEmail) {
      const empTmpl = buildEmployeeEmail(leaveRecord, action);
      if (empTmpl) emails.push({ to: empEmail, ...empTmpl });
    } else {
      console.warn('[NotifyLeaveEmail] Employee has no email — skipping employee notification');
    }

    // 2. Email to manager (if applicable for this action)
    if (managerProfile?.email) {
      const mgrTmpl = buildManagerEmail(leaveRecord, action, empName);
      if (mgrTmpl) emails.push({ to: managerProfile.email, ...mgrTmpl });
    }

    // 3. Email to HR/Admins
    for (const admin of hrAdmins) {
      if (!admin.email) continue;
      // Don't duplicate if the manager is also an admin/HR
      if (admin.id === managerProfile?.id) continue;
      // Don't duplicate if the employee is also admin/HR
      if (admin.id === employeeProfile?.id) continue;

      const hrTmpl = buildHrEmail(leaveRecord, action, empName, mgrName);
      if (hrTmpl) emails.push({ to: admin.email, ...hrTmpl });
    }

    // If HR/Admins list was empty, we still might want to notify org-level recipients.
    // For SUBMITTED with PENDING_HR (no manager), HR notification is critical.
    // Log a warning so operators can investigate.
    if (hrAdmins.length === 0 && (action === 'SUBMITTED' || action === 'MANAGER_APPROVED')) {
      console.warn(
        `[NotifyLeaveEmail] No HR/Admin profiles found for org ${leaveRecord.organization_id}. ` +
        `Leave ${leaveId} (${action}) has no HR recipients.`
      );
    }

    if (emails.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No recipients with email addresses found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Send via Resend ─────────────────────────────────────────────────────
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [email.to],
            subject: email.subject,
            html: email.html,
          }),
        });
        if (res.ok) {
          sent++;
        } else {
          failed++;
          const errBody = await res.text();
          console.error(`[NotifyLeaveEmail] Resend failed for ${email.to}: ${res.status} ${errBody}`);
        }
      } catch (e) {
        failed++;
        console.error(`[NotifyLeaveEmail] Network error for ${email.to}:`, e);
      }
    }

    console.log(`[NotifyLeaveEmail] Action=${action} leaveId=${leaveId} — sent ${sent}, failed ${failed}`);

    return new Response(
      JSON.stringify({ sent, failed, message: `Sent ${sent}, failed ${failed}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[NotifyLeaveEmail] Unhandled error:', err);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
