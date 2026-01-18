// pb_hooks/main.pb.js
// Optimized for PocketBase JS VM (v0.22+)

// 1. LEAVE REQUEST CREATED -> EMAIL MANAGER
onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    const managerId = record.get("line_manager_id");
    
    if (!managerId) return;

    try {
        const dao = e.app.dao();
        const manager = dao.findRecordById("users", managerId);
        
        if (!manager) return;

        const message = new MailerMessage({
            from: { address: e.app.settings().meta.senderAddress, name: e.app.settings().meta.senderName },
            to: [{ address: manager.email() }],
            subject: "New Leave Application: " + record.get("employee_name"),
            html: "<h2>New Leave Request Received</h2>" +
                  "<p><b>Employee:</b> " + record.get("employee_name") + "</p>" +
                  "<p><b>Dates:</b> " + record.get("start_date") + " to " + record.get("end_date") + "</p>" +
                  "<p><b>Reason:</b> " + (record.get("reason") || "N/A") + "</p>" +
                  "<p>Please log in to the portal to review this request.</p>",
        });
        
        e.app.newMailClient().send(message);
    } catch (err) {
        console.error("[LEAVE_CREATE_HOOK] Error: " + err.toString());
    }
}, "leaves");

// 2. LEAVE REQUEST UPDATED -> WORKFLOW ALERTS
onRecordAfterUpdateSuccess((e) => {
    const record = e.record;
    const status = record.get("status");
    
    try {
        const dao = e.app.dao();
        const employeeId = record.get("employee_id");
        if (!employeeId) return;

        const employee = dao.findRecordById("users", employeeId);
        if (!employee) return;

        // STAGE A: Manager Verified -> Notify HR/Admin
        if (status === "PENDING_HR") {
            const hrStaff = dao.findRecordsByFilter("users", 'role = "HR" || role = "ADMIN"', '-created', 10);
            const hrEmails = hrStaff.map(u => ({ address: u.email() }));
            
            if (hrEmails.length > 0) {
                const hrMessage = new MailerMessage({
                    from: { address: e.app.settings().meta.senderAddress, name: e.app.settings().meta.senderName },
                    to: hrEmails,
                    subject: "Action Required: Leave Approval Stage 2 (" + record.get("employee_name") + ")",
                    html: "<h3>Management Approval Recorded</h3>" +
                          "<p>The line manager has approved the leave for <b>" + record.get("employee_name") + "</b>.</p>" +
                          "<p><b>Manager Remarks:</b> " + (record.get("manager_remarks") || "N/A") + "</p>" +
                          "<p>Final HR verification is now required.</p>",
                });
                e.app.newMailClient().send(hrMessage);
            }
        }

        // STAGE B: Final Decision (Approved or Rejected) -> Notify Employee
        if (status === "APPROVED" || status === "REJECTED") {
            const message = new MailerMessage({
                from: { address: e.app.settings().meta.senderAddress, name: e.app.settings().meta.senderName },
                to: [{ address: employee.email() }],
                subject: "Leave Request Final Decision: " + status,
                html: "<h3>Hello " + record.get("employee_name") + ",</h3>" +
                      "<p>A final decision has been made on your leave request.</p>" +
                      "<p><b>Status:</b> <span style='font-weight:bold; color:" + (status === "APPROVED" ? "#10b981" : "#ef4444") + "'>" + status + "</span></p>" +
                      "<p><b>Manager Notes:</b> " + (record.get("manager_remarks") || "No notes") + "</p>" +
                      "<p><b>HR/Admin Notes:</b> " + (record.get("approver_remarks") || "No notes") + "</p>",
            });
            e.app.newMailClient().send(message);
        }
    } catch (err) {
        console.error("[LEAVE_UPDATE_HOOK] Error: " + err.toString());
    }
}, "leaves");

// 3. GENERIC REPORT QUEUE HANDLER
onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    try {
        const message = new MailerMessage({
            from: { address: e.app.settings().meta.senderAddress, name: e.app.settings().meta.senderName },
            to: [{ address: record.get("recipient_email") }],
            subject: record.get("subject"),
            html: record.get("html_content"),
        });
        e.app.newMailClient().send(message);
        record.set("status", "SENT");
        record.set("sent_at", new Date().toISOString());
        e.app.dao().saveRecord(record);
    } catch (err) {
        record.set("status", "FAILED");
        record.set("error_message", err.toString());
        e.app.dao().saveRecord(record);
    }
}, "reports_queue");