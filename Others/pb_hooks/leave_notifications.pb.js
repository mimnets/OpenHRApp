/**
 * OpenHR - Leave Workflow Email Notifications
 * ============================================
 * SEPARATED from main.pb.js to prevent accidental loss during development.
 * PocketBase auto-loads ALL .pb.js files from pb_hooks/ folder.
 *
 * Email Flow:
 *   1. Employee submits leave   → Employee gets confirmation + Manager gets alert + Admin gets alert
 *   2. Manager approves         → HR gets escalation + Employee gets update + Admin gets update
 *   3. Manager rejects          → Employee gets rejection + Admin gets notification
 *   4. HR/Admin final approves  → Employee gets approval + Manager gets notification
 *   5. HR/Admin final rejects   → Employee gets rejection + Manager gets notification
 *
 * Depends on: "reports_queue" collection (email processor in main.pb.js)
 */

console.log("[HOOKS] Loading Leave Notification Hooks...");

/* ============================================================
   HELPER: Queue an email via reports_queue
   ============================================================ */
function queueLeaveEmail(leave, recipient, subject, htmlBody, type) {
    if (!recipient || !recipient.includes("@")) {
        console.log("[LEAVE-EMAIL] Skipped - invalid recipient: " + recipient);
        return;
    }
    try {
        const col = $app.findCollectionByNameOrId("reports_queue");
        const rec = new Record(col);
        rec.set("recipient_email", recipient);
        rec.set("subject", subject);
        rec.set("html_content", htmlBody);
        rec.set("status", "PENDING");
        rec.set("type", type);
        rec.set("organization_id", leave.getString("organization_id"));
        $app.save(rec);
        console.log("[LEAVE-EMAIL] Queued (" + type + ") to: " + recipient);
    } catch (err) {
        console.log("[LEAVE-EMAIL] Failed to queue (" + type + "): " + err.toString());
    }
}

/* ============================================================
   HELPER: Get org admins (ADMIN + HR roles) for an organization
   ============================================================ */
function getOrgAdmins(orgId) {
    try {
        return $app.findRecordsByFilter(
            "users",
            "organization_id = '" + orgId + "' && (role = 'ADMIN' || role = 'HR')"
        );
    } catch (e) {
        return [];
    }
}

/* ============================================================
   HELPER: Format leave details as HTML table
   ============================================================ */
function leaveDetailsTable(empName, type, days, startDate, endDate, reason) {
    return '<table style="width:100%;border-collapse:collapse;margin:15px 0;">' +
        '<tr style="background:#f8fafc;"><td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">Employee</td><td style="padding:10px;border:1px solid #e2e8f0;">' + empName + '</td></tr>' +
        '<tr><td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">Leave Type</td><td style="padding:10px;border:1px solid #e2e8f0;">' + type + '</td></tr>' +
        '<tr style="background:#f8fafc;"><td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">Duration</td><td style="padding:10px;border:1px solid #e2e8f0;">' + days + ' Day' + (days > 1 ? 's' : '') + '</td></tr>' +
        '<tr><td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">From</td><td style="padding:10px;border:1px solid #e2e8f0;">' + startDate + '</td></tr>' +
        '<tr style="background:#f8fafc;"><td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">To</td><td style="padding:10px;border:1px solid #e2e8f0;">' + endDate + '</td></tr>' +
        '<tr><td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">Reason</td><td style="padding:10px;border:1px solid #e2e8f0;">' + (reason || 'Not provided') + '</td></tr>' +
        '</table>';
}

/* ============================================================
   HELPER: Wrap content in email template
   ============================================================ */
function emailWrap(title, titleColor, borderColor, bodyHtml) {
    return '<div style="font-family:Arial,sans-serif;padding:24px;border:1px solid #e2e8f0;border-left:5px solid ' + borderColor + ';border-radius:8px;max-width:600px;">' +
        '<h2 style="color:' + titleColor + ';margin-top:0;">' + title + '</h2>' +
        bodyHtml +
        '<p style="font-size:11px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;">OpenHR Notification System</p>' +
        '</div>';
}


/* ============================================================
   1. LEAVE CREATED - Notify Employee + Manager + Admin
   ============================================================ */
try {
    onRecordAfterCreateSuccess((e) => {
        const leave = e.record;
        const empId = leave.getString("employee_id");
        const managerId = leave.getString("line_manager_id");
        const orgId = leave.getString("organization_id");

        try {
            const employee = $app.findRecordById("users", empId);
            const empName = employee.getString("name");
            const empEmail = employee.getString("email");
            const type = leave.getString("type");
            const days = leave.getString("total_days");
            const startDate = (leave.getString("start_date") || "").split(" ")[0];
            const endDate = (leave.getString("end_date") || "").split(" ")[0];
            const reason = leave.getString("reason");
            const initialStatus = leave.getString("status");

            var detailsTable = leaveDetailsTable(empName, type, days, startDate, endDate, reason);

            // A. Notify Employee (Confirmation)
            queueLeaveEmail(
                leave,
                empEmail,
                "Leave Application Submitted: " + type,
                emailWrap(
                    "Application Received", "#2563eb", "#2563eb",
                    "<p>Hi " + empName + ",</p>" +
                    "<p>Your leave request has been submitted successfully and is now <strong>" + (initialStatus === "PENDING_HR" ? "pending HR review" : "pending manager review") + "</strong>.</p>" +
                    detailsTable
                ),
                "LEAVE_SUBMIT_CONFIRM"
            );

            // B. Notify Manager (Action Required)
            if (managerId && initialStatus === "PENDING_MANAGER") {
                try {
                    const manager = $app.findRecordById("users", managerId);
                    queueLeaveEmail(
                        leave,
                        manager.getString("email"),
                        "Action Required: " + type + " Leave - " + empName,
                        emailWrap(
                            "Leave Approval Required", "#d97706", "#f59e0b",
                            "<p><strong>" + empName + "</strong> has submitted a leave request that requires your approval.</p>" +
                            detailsTable +
                            '<p style="margin-top:16px;">Please log in to the <strong>OpenHR</strong> portal to Approve or Reject this request.</p>'
                        ),
                        "LEAVE_MANAGER_ALERT"
                    );
                } catch (mErr) {
                    console.log("[LEAVE-EMAIL] Could not find manager: " + mErr.toString());
                }
            }

            // C. Notify Organization Admin(s)
            var admins = getOrgAdmins(orgId);
            for (var i = 0; i < admins.length; i++) {
                var adminEmail = admins[i].getString("email");
                // Skip if admin is the applicant or the manager (they already got notified)
                if (adminEmail === empEmail) continue;
                if (managerId) {
                    try {
                        var mgr = $app.findRecordById("users", managerId);
                        if (adminEmail === mgr.getString("email")) continue;
                    } catch(x) {}
                }
                queueLeaveEmail(
                    leave,
                    adminEmail,
                    "New Leave Request: " + empName + " - " + type,
                    emailWrap(
                        "New Leave Application", "#475569", "#64748b",
                        "<p>A new leave request has been submitted in your organization.</p>" +
                        detailsTable +
                        "<p>Current Status: <strong>" + initialStatus + "</strong></p>"
                    ),
                    "LEAVE_ADMIN_ALERT"
                );
            }

        } catch (err) {
            console.log("[LEAVE-EMAIL] Error in leave create hook: " + err.toString());
        }
    }, "leaves");
} catch(e) {
    console.log("[HOOKS] Could not register leave create hook: " + e.toString());
}


/* ============================================================
   2. LEAVE UPDATED - Notify based on status change
   ============================================================ */
try {
    onRecordAfterUpdateSuccess((e) => {
        const leave = e.record;
        const status = leave.getString("status");
        const empId = leave.getString("employee_id");
        const managerId = leave.getString("line_manager_id");
        const orgId = leave.getString("organization_id");

        try {
            const employee = $app.findRecordById("users", empId);
            const empName = employee.getString("name");
            const empEmail = employee.getString("email");
            const type = leave.getString("type");
            const days = leave.getString("total_days");
            const startDate = (leave.getString("start_date") || "").split(" ")[0];
            const endDate = (leave.getString("end_date") || "").split(" ")[0];
            const reason = leave.getString("reason");

            var detailsTable = leaveDetailsTable(empName, type, days, startDate, endDate, reason);

            // -------------------------------------------------------
            // A. Manager Approved → Escalated to HR (PENDING_HR)
            // -------------------------------------------------------
            if (status === "PENDING_HR") {
                var managerRemarks = leave.getString("manager_remarks") || "No remarks";

                // A1. Notify HR/Admin - needs final approval
                var admins = getOrgAdmins(orgId);
                for (var i = 0; i < admins.length; i++) {
                    queueLeaveEmail(
                        leave,
                        admins[i].getString("email"),
                        "HR Approval Required: " + empName + " - " + type + " Leave",
                        emailWrap(
                            "Manager Approved - HR Review Required", "#2563eb", "#2563eb",
                            "<p>The leave request for <strong>" + empName + "</strong> has been approved by their line manager and now awaits final HR approval.</p>" +
                            detailsTable +
                            '<div style="background:#f0fdf4;padding:12px;border-radius:8px;margin-top:12px;">' +
                                '<strong>Manager Remarks:</strong> ' + managerRemarks +
                            '</div>' +
                            '<p style="margin-top:16px;">Please log in to the <strong>OpenHR</strong> portal to give final approval.</p>'
                        ),
                        "LEAVE_HR_ESCALATION"
                    );
                }

                // A2. Notify Employee - manager approved, waiting for HR
                queueLeaveEmail(
                    leave,
                    empEmail,
                    "Leave Update: Manager Approved - Pending HR",
                    emailWrap(
                        "Manager Approved", "#059669", "#10b981",
                        "<p>Hi " + empName + ",</p>" +
                        "<p>Your leave request has been <strong>approved by your manager</strong> and is now pending final HR approval.</p>" +
                        detailsTable +
                        '<div style="background:#f0fdf4;padding:12px;border-radius:8px;margin-top:12px;">' +
                            '<strong>Manager Remarks:</strong> ' + managerRemarks +
                        '</div>'
                    ),
                    "LEAVE_MANAGER_APPROVED"
                );
            }

            // -------------------------------------------------------
            // B. Final Decision: APPROVED
            // -------------------------------------------------------
            if (status === "APPROVED") {
                var approverRemarks = leave.getString("approver_remarks") || "No remarks";

                // B1. Notify Employee - final approval
                queueLeaveEmail(
                    leave,
                    empEmail,
                    "Leave Approved: " + type + " (" + startDate + " to " + endDate + ")",
                    emailWrap(
                        "Leave Request Approved", "#059669", "#059669",
                        "<p>Hi " + empName + ",</p>" +
                        "<p>Your leave request has been <strong>approved</strong>.</p>" +
                        detailsTable +
                        '<div style="background:#f0fdf4;padding:12px;border-radius:8px;margin-top:12px;">' +
                            '<strong>Remarks:</strong> ' + approverRemarks +
                        '</div>'
                    ),
                    "LEAVE_FINAL_APPROVED"
                );

                // B2. Notify Manager - final approval (if manager exists and is not the final approver)
                if (managerId) {
                    try {
                        var manager = $app.findRecordById("users", managerId);
                        queueLeaveEmail(
                            leave,
                            manager.getString("email"),
                            "Leave Approved: " + empName + " - " + type,
                            emailWrap(
                                "Leave Approved (Final)", "#059669", "#059669",
                                "<p>The leave request you reviewed for <strong>" + empName + "</strong> has received final approval.</p>" +
                                detailsTable +
                                '<div style="background:#f0fdf4;padding:12px;border-radius:8px;margin-top:12px;">' +
                                    '<strong>Final Remarks:</strong> ' + approverRemarks +
                                '</div>'
                            ),
                            "LEAVE_MANAGER_NOTIFY_APPROVED"
                        );
                    } catch(mErr) {}
                }
            }

            // -------------------------------------------------------
            // C. Final Decision: REJECTED
            // -------------------------------------------------------
            if (status === "REJECTED") {
                var rejectRemarks = leave.getString("approver_remarks") || leave.getString("manager_remarks") || "No remarks";

                // C1. Notify Employee - rejection
                queueLeaveEmail(
                    leave,
                    empEmail,
                    "Leave Rejected: " + type + " (" + startDate + ")",
                    emailWrap(
                        "Leave Request Rejected", "#dc2626", "#dc2626",
                        "<p>Hi " + empName + ",</p>" +
                        "<p>Your leave request has been <strong>rejected</strong>.</p>" +
                        detailsTable +
                        '<div style="background:#fef2f2;padding:12px;border-radius:8px;margin-top:12px;">' +
                            '<strong>Remarks:</strong> ' + rejectRemarks +
                        '</div>' +
                        '<p style="margin-top:12px;">If you have questions, please contact your manager or HR.</p>'
                    ),
                    "LEAVE_FINAL_REJECTED"
                );

                // C2. Notify Manager - rejection (if HR rejected after manager approved)
                if (managerId) {
                    try {
                        var manager = $app.findRecordById("users", managerId);
                        queueLeaveEmail(
                            leave,
                            manager.getString("email"),
                            "Leave Rejected by HR: " + empName + " - " + type,
                            emailWrap(
                                "Leave Rejected (HR Decision)", "#dc2626", "#dc2626",
                                "<p>The leave request for <strong>" + empName + "</strong> that you reviewed has been <strong>rejected</strong> by HR.</p>" +
                                detailsTable +
                                '<div style="background:#fef2f2;padding:12px;border-radius:8px;margin-top:12px;">' +
                                    '<strong>HR Remarks:</strong> ' + rejectRemarks +
                                '</div>'
                            ),
                            "LEAVE_MANAGER_NOTIFY_REJECTED"
                        );
                    } catch(mErr) {}
                }

                // C3. Notify Admin(s) - rejection
                var admins = getOrgAdmins(orgId);
                for (var i = 0; i < admins.length; i++) {
                    queueLeaveEmail(
                        leave,
                        admins[i].getString("email"),
                        "Leave Rejected: " + empName + " - " + type,
                        emailWrap(
                            "Leave Request Rejected", "#dc2626", "#ef4444",
                            "<p>A leave request in your organization has been rejected.</p>" +
                            detailsTable +
                            '<div style="background:#fef2f2;padding:12px;border-radius:8px;margin-top:12px;">' +
                                '<strong>Remarks:</strong> ' + rejectRemarks +
                            '</div>'
                        ),
                        "LEAVE_ADMIN_REJECT_NOTIFY"
                    );
                }
            }

        } catch (err) {
            console.log("[LEAVE-EMAIL] Error in leave update hook: " + err.toString());
        }
    }, "leaves");
} catch(e) {
    console.log("[HOOKS] Could not register leave update hook: " + e.toString());
}

console.log("[HOOKS] Leave Notification Hooks loaded successfully.");
