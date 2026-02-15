// pb_hooks/leave_notifications.pb.js
// Leave Workflow Email Notifications
//
// ⚠️  IMPORTANT: Each .pb.js file runs in its own isolated JS scope.
//     Functions defined in other hook files (e.g. main.pb.js) are NOT
//     available here. Always inline any shared logic.

// ============================================================
// 1. LEAVE CREATED → Notify Employee + Manager + Admin/HR
// ============================================================
onRecordAfterCreateSuccess((e) => {
    const record    = e.record;
    const empId     = record.getString("employee_id");
    const managerId = record.getString("line_manager_id");
    const orgId     = record.getString("organization_id");

    try {
        // Sender — inlined (cannot call functions from other .pb.js files)
        const meta          = $app.settings().meta || {};
        const senderAddress = meta.senderAddress || "noreply@openhr.app";
        const senderName    = meta.senderName    || "OpenHR System";
        const sender        = { address: senderAddress, name: senderName };

        // Fetch employee record
        let employee;
        try {
            employee = $app.findRecordById("users", empId);
        } catch (err) {
            console.log("[LEAVE-EMAIL] Employee not found: " + empId);
            return;
        }

        const empName   = record.getString("employee_name") || employee.getString("name");
        const empEmail  = employee.getString("email"); // ✅ getString, NOT .email()
        const type      = record.getString("type");
        const days      = record.getString("total_days");
        const startDate = (record.getString("start_date") || "").split(" ")[0];
        const endDate   = (record.getString("end_date")   || "").split(" ")[0];
        const reason    = record.getString("reason") || "Not provided";
        const status    = record.getString("status");

        const detailsHtml =
            "<table style='border-collapse:collapse;margin:12px 0;'>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Employee</b></td>  <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + empName   + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Leave Type</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + type      + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Duration</b></td>  <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + days      + " Day(s)</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>From</b></td>      <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + startDate + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>To</b></td>        <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + endDate   + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Reason</b></td>    <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + reason    + "</td></tr>" +
            "</table>";

        // A. Notify Employee — submission confirmation
        try {
            const pendingLabel = (status === "PENDING_HR") ? "pending HR review" : "pending manager review";
            $app.newMailClient().send(new MailerMessage({
                from: sender,
                to:   [{ address: empEmail }],
                subject: "Leave Application Submitted: " + type,
                html: "<h2>Leave Application Received</h2>" +
                      "<p>Hi <b>" + empName + "</b>,</p>" +
                      "<p>Your leave request has been submitted and is now <b>" + pendingLabel + "</b>.</p>" +
                      detailsHtml +
                      "<p style='color:#6b7280;font-size:13px;'>You will receive another email when the status changes.</p>",
            }));
            console.log("[LEAVE-EMAIL] Employee notified on submit: " + empEmail);
        } catch (err) {
            console.log("[LEAVE-EMAIL] Failed to notify employee on submit: " + err.toString());
        }

        // B. Notify Manager — action required
        if (managerId && status === "PENDING_MANAGER") {
            try {
                const manager      = $app.findRecordById("users", managerId);
                const managerEmail = manager.getString("email"); // ✅
                $app.newMailClient().send(new MailerMessage({
                    from: sender,
                    to:   [{ address: managerEmail }],
                    subject: "Action Required: " + type + " Leave — " + empName,
                    html: "<h2>Leave Approval Required</h2>" +
                          "<p><b>" + empName + "</b> has submitted a leave request that requires your approval.</p>" +
                          detailsHtml +
                          "<p>Please log in to the <b>OpenHR portal</b> to Approve or Reject this request.</p>",
                }));
                console.log("[LEAVE-EMAIL] Manager notified on submit: " + managerEmail);
            } catch (err) {
                console.log("[LEAVE-EMAIL] Failed to notify manager on submit: " + err.toString());
            }
        }

        // C. Notify Admin/HR — FYI on new submission
        try {
            const admins = $app.findRecordsByFilter(
                "users",
                "organization_id = '" + orgId + "' && (role = 'ADMIN' || role = 'HR')"
            );
            for (let i = 0; i < admins.length; i++) {
                const adminEmail = admins[i].getString("email"); // ✅
                if (adminEmail === empEmail) continue;
                try {
                    $app.newMailClient().send(new MailerMessage({
                        from: sender,
                        to:   [{ address: adminEmail }],
                        subject: "New Leave Request: " + empName + " — " + type,
                        html: "<h2>New Leave Application</h2>" +
                              "<p>A new leave request has been submitted in your organisation.</p>" +
                              detailsHtml +
                              "<p>Current Status: <b>" + status + "</b></p>",
                    }));
                    console.log("[LEAVE-EMAIL] Admin/HR notified on submit: " + adminEmail);
                } catch (err) {
                    console.log("[LEAVE-EMAIL] Failed to notify admin on submit: " + err.toString());
                }
            }
        } catch (err) {
            console.log("[LEAVE-EMAIL] Could not find Admin/HR users: " + err.toString());
        }

    } catch (err) {
        console.log("[LEAVE-EMAIL] Error in leave create hook: " + err.toString());
    }
}, "leaves");


// ============================================================
// 2. LEAVE UPDATED → Notify based on status transition
// ============================================================
onRecordAfterUpdateSuccess((e) => {
    const record    = e.record;
    const status    = record.getString("status");
    const empId     = record.getString("employee_id");
    const managerId = record.getString("line_manager_id");
    const orgId     = record.getString("organization_id");

    if (!status) return;

    try {
        // Sender — inlined
        const meta          = $app.settings().meta || {};
        const senderAddress = meta.senderAddress || "noreply@openhr.app";
        const senderName    = meta.senderName    || "OpenHR System";
        const sender        = { address: senderAddress, name: senderName };

        // Fetch employee record
        let employee;
        try {
            employee = $app.findRecordById("users", empId);
        } catch (err) {
            console.log("[LEAVE-EMAIL] Employee not found on update: " + empId);
            return;
        }

        const empName   = record.getString("employee_name") || employee.getString("name");
        const empEmail  = employee.getString("email"); // ✅
        const type      = record.getString("type");
        const days      = record.getString("total_days");
        const startDate = (record.getString("start_date") || "").split(" ")[0];
        const endDate   = (record.getString("end_date")   || "").split(" ")[0];
        const reason    = record.getString("reason") || "Not provided";

        const detailsHtml =
            "<table style='border-collapse:collapse;margin:12px 0;'>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Employee</b></td>  <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + empName   + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Leave Type</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + type      + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Duration</b></td>  <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + days      + " Day(s)</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>From</b></td>      <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + startDate + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>To</b></td>        <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + endDate   + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Reason</b></td>    <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + reason    + "</td></tr>" +
            "</table>";

        // ── SCENARIO A: Manager approved → PENDING_HR ──────────────────────
        // Recipients: HR/Admin (action required) + Employee (FYI)
        if (status === "PENDING_HR") {
            const managerRemarks = record.getString("manager_remarks") || "No remarks";

            // Notify HR/Admin — action required
            try {
                const hrStaff = $app.findRecordsByFilter(
                    "users",
                    "organization_id = '" + orgId + "' && (role = 'HR' || role = 'ADMIN')"
                );
                for (let i = 0; i < hrStaff.length; i++) {
                    const hrEmail = hrStaff[i].getString("email"); // ✅
                    try {
                        $app.newMailClient().send(new MailerMessage({
                            from: sender,
                            to:   [{ address: hrEmail }],
                            subject: "HR Approval Required: " + empName + " — " + type + " Leave",
                            html: "<h2>Manager Approved — HR Review Required</h2>" +
                                  "<p>The leave request for <b>" + empName + "</b> has been " +
                                  "<b style='color:#f59e0b;'>approved by their manager</b> and awaits your final decision.</p>" +
                                  detailsHtml +
                                  "<p><b>Manager Remarks:</b> " + managerRemarks + "</p>" +
                                  "<p>Please log in to the <b>OpenHR portal</b> to approve or reject.</p>",
                        }));
                        console.log("[LEAVE-EMAIL] HR/Admin notified (pending_hr): " + hrEmail);
                    } catch (err) {
                        console.log("[LEAVE-EMAIL] Failed to notify HR (pending_hr): " + err.toString());
                    }
                }
            } catch (err) {
                console.log("[LEAVE-EMAIL] Could not find HR staff: " + err.toString());
            }

            // Notify Employee — waiting on HR
            try {
                $app.newMailClient().send(new MailerMessage({
                    from: sender,
                    to:   [{ address: empEmail }],
                    subject: "Leave Update: Manager Approved — Pending HR Review",
                    html: "<h2>Manager Approved Your Leave</h2>" +
                          "<p>Hi <b>" + empName + "</b>,</p>" +
                          "<p>Your leave request has been <b style='color:#f59e0b;'>approved by your manager</b> " +
                          "and is now pending final HR approval.</p>" +
                          detailsHtml +
                          "<p><b>Manager Remarks:</b> " + managerRemarks + "</p>" +
                          "<p style='color:#6b7280;font-size:13px;'>You will receive another email once HR makes a final decision.</p>",
                }));
                console.log("[LEAVE-EMAIL] Employee notified (pending_hr): " + empEmail);
            } catch (err) {
                console.log("[LEAVE-EMAIL] Failed to notify employee (pending_hr): " + err.toString());
            }
        }

        // ── SCENARIO B: Final APPROVED ──────────────────────────────────────
        // Recipients: Employee + Manager + HR/Admin (all get confirmation)
        if (status === "APPROVED") {
            const managerRemarks  = record.getString("manager_remarks")  || "No remarks";
            const approverRemarks = record.getString("approver_remarks") || "No remarks";

            // Notify Employee
            try {
                $app.newMailClient().send(new MailerMessage({
                    from: sender,
                    to:   [{ address: empEmail }],
                    subject: "✅ Leave Approved: " + type + " (" + startDate + " to " + endDate + ")",
                    html: "<h2>Leave Request Approved</h2>" +
                          "<p>Hi <b>" + empName + "</b>,</p>" +
                          "<p>Your leave request has been <b style='color:#10b981;'>fully approved</b>.</p>" +
                          detailsHtml +
                          "<p><b>Manager Remarks:</b> " + managerRemarks + "</p>" +
                          "<p><b>HR/Admin Remarks:</b> " + approverRemarks + "</p>" +
                          "<p style='color:#6b7280;font-size:13px;'>Enjoy your time off!</p>",
                }));
                console.log("[LEAVE-EMAIL] Employee notified (approved): " + empEmail);
            } catch (err) {
                console.log("[LEAVE-EMAIL] Failed to notify employee (approved): " + err.toString());
            }

            // Notify Manager
            if (managerId) {
                try {
                    const manager      = $app.findRecordById("users", managerId);
                    const managerEmail = manager.getString("email"); // ✅
                    $app.newMailClient().send(new MailerMessage({
                        from: sender,
                        to:   [{ address: managerEmail }],
                        subject: "Leave Approved (Final): " + empName + " — " + type,
                        html: "<h2>Leave Approved — Final Decision</h2>" +
                              "<p>The leave request you reviewed for <b>" + empName + "</b> has received " +
                              "<b style='color:#10b981;'>final HR/Admin approval</b>.</p>" +
                              detailsHtml +
                              "<p><b>HR/Admin Remarks:</b> " + approverRemarks + "</p>",
                    }));
                    console.log("[LEAVE-EMAIL] Manager notified (approved): " + managerEmail);
                } catch (err) {
                    console.log("[LEAVE-EMAIL] Failed to notify manager (approved): " + err.toString());
                }
            }

            // Notify HR/Admin — record confirmation
            try {
                const admins = $app.findRecordsByFilter(
                    "users",
                    "organization_id = '" + orgId + "' && (role = 'ADMIN' || role = 'HR')"
                );
                for (let i = 0; i < admins.length; i++) {
                    const adminEmail = admins[i].getString("email"); // ✅
                    try {
                        $app.newMailClient().send(new MailerMessage({
                            from: sender,
                            to:   [{ address: adminEmail }],
                            subject: "Leave Approved: " + empName + " — " + type,
                            html: "<h2>Leave Request — Fully Approved</h2>" +
                                  "<p>This leave request has been fully approved.</p>" +
                                  detailsHtml +
                                  "<p><b>HR/Admin Remarks:</b> " + approverRemarks + "</p>",
                        }));
                        console.log("[LEAVE-EMAIL] Admin/HR notified (approved): " + adminEmail);
                    } catch (err) {
                        console.log("[LEAVE-EMAIL] Failed to notify admin (approved): " + err.toString());
                    }
                }
            } catch (err) {
                console.log("[LEAVE-EMAIL] Could not find admins (approved): " + err.toString());
            }
        }

        // ── SCENARIO C: REJECTED (by Manager or HR/Admin) ──────────────────
        // Recipients: Employee + Manager + HR/Admin
        if (status === "REJECTED") {
            const managerRemarks  = record.getString("manager_remarks")  || "No remarks";
            const approverRemarks = record.getString("approver_remarks") || "No remarks";
            const rejectRemarks   = (approverRemarks !== "No remarks") ? approverRemarks : managerRemarks;

            // Notify Employee
            try {
                $app.newMailClient().send(new MailerMessage({
                    from: sender,
                    to:   [{ address: empEmail }],
                    subject: "❌ Leave Rejected: " + type + " (" + startDate + ")",
                    html: "<h2>Leave Request Rejected</h2>" +
                          "<p>Hi <b>" + empName + "</b>,</p>" +
                          "<p>Your leave request has been <b style='color:#ef4444;'>rejected</b>.</p>" +
                          detailsHtml +
                          "<p><b>Manager Remarks:</b> " + managerRemarks + "</p>" +
                          "<p><b>HR/Admin Remarks:</b> " + approverRemarks + "</p>" +
                          "<p style='color:#6b7280;font-size:13px;'>If you have questions, please contact your manager or HR department.</p>",
                }));
                console.log("[LEAVE-EMAIL] Employee notified (rejected): " + empEmail);
            } catch (err) {
                console.log("[LEAVE-EMAIL] Failed to notify employee (rejected): " + err.toString());
            }

            // Notify Manager
            if (managerId) {
                try {
                    const manager      = $app.findRecordById("users", managerId);
                    const managerEmail = manager.getString("email"); // ✅
                    $app.newMailClient().send(new MailerMessage({
                        from: sender,
                        to:   [{ address: managerEmail }],
                        subject: "Leave Rejected: " + empName + " — " + type,
                        html: "<h2>Leave Rejected — Final Decision</h2>" +
                              "<p>The leave request for <b>" + empName + "</b> has been <b style='color:#ef4444;'>rejected</b>.</p>" +
                              detailsHtml +
                              "<p><b>Rejection Reason:</b> " + rejectRemarks + "</p>",
                    }));
                    console.log("[LEAVE-EMAIL] Manager notified (rejected): " + managerEmail);
                } catch (err) {
                    console.log("[LEAVE-EMAIL] Failed to notify manager (rejected): " + err.toString());
                }
            }

            // Notify HR/Admin
            try {
                const admins = $app.findRecordsByFilter(
                    "users",
                    "organization_id = '" + orgId + "' && (role = 'ADMIN' || role = 'HR')"
                );
                for (let i = 0; i < admins.length; i++) {
                    const adminEmail = admins[i].getString("email"); // ✅
                    try {
                        $app.newMailClient().send(new MailerMessage({
                            from: sender,
                            to:   [{ address: adminEmail }],
                            subject: "Leave Rejected: " + empName + " — " + type,
                            html: "<h2>Leave Request — Rejected</h2>" +
                                  "<p>The following leave request has been rejected.</p>" +
                                  detailsHtml +
                                  "<p><b>Rejection Reason:</b> " + rejectRemarks + "</p>",
                        }));
                        console.log("[LEAVE-EMAIL] Admin/HR notified (rejected): " + adminEmail);
                    } catch (err) {
                        console.log("[LEAVE-EMAIL] Failed to notify admin (rejected): " + err.toString());
                    }
                }
            } catch (err) {
                console.log("[LEAVE-EMAIL] Could not find admins (rejected): " + err.toString());
            }
        }

    } catch (err) {
        console.log("[LEAVE-EMAIL] Error in leave update hook: " + err.toString());
    }
}, "leaves");
