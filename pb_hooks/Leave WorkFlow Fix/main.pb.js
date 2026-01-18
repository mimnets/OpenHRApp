// pb_hooks/main.pb.js
// Optimized for multi-stage leave workflows

// 1. LEAVE REQUEST CREATED -> EMAIL MANAGER
onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    const managerId = record.get("line_manager_id");
    
    if (!managerId) return;

    try {
        const manager = $app.dao().findRecordById("users", managerId);
        if (!manager) return;

        const message = new MailerMessage({
            from: { address: $app.settings().meta.senderAddress, name: $app.settings().meta.senderName },
            to: [{ address: manager.email() }],
            subject: "New Leave Application: " + record.get("employee_name"),
            html: "<h2>New Leave Request Received</h2>" +
                  "<p><b>Employee:</b> " + record.get("employee_name") + "</p>" +
                  "<p><b>Dates:</b> " + record.get("start_date") + " to " + record.get("end_date") + "</p>" +
                  "<p><b>Reason:</b> " + (record.get("reason") || "N/A") + "</p>" +
                  "<p>Please log in to review this request.</p>",
        });
        
        $app.newMailClient().send(message);
    } catch (err) {
        console.error("[LEAVE_CREATE] Email Error: " + err.toString());
    }
}, "leaves");

// 2. LEAVE REQUEST UPDATED (Approval Logic)
onRecordAfterUpdateSuccess((e) => {
    const record = e.record;
    const status = record.get("status");
    
    try {
        const employee = $app.dao().findRecordById("users", record.get("employee_id"));
        if (!employee) return;

        // SCENARIO A: Manager approved -> Notify HR
        if (status === "PENDING_HR") {
            const hrStaff = $app.dao().findRecordsByFilter("users", 'role = "HR" || role = "ADMIN"', '-created', 10);
            const hrEmails = hrStaff.map(u => ({ address: u.email() }));
            
            if (hrEmails.length > 0) {
                const hrMessage = new MailerMessage({
                    from: { address: $app.settings().meta.senderAddress, name: $app.settings().meta.senderName },
                    to: hrEmails,
                    subject: "Action Required: Manager-Approved Leave (" + record.get("employee_name") + ")",
                    html: "<h3>Manager Verification Complete</h3>" +
                          "<p>The line manager has verified the leave for <b>" + record.get("employee_name") + "</b>.</p>" +
                          "<p><b>Manager Remarks:</b> " + (record.get("manager_remarks") || "N/A") + "</p>" +
                          "<p>Please perform final HR verification in the OpenHR portal.</p>",
                });
                $app.newMailClient().send(hrMessage);
            }
        }

        // SCENARIO B: Final Decision (Approved by HR or Rejected at any stage)
        if (status === "APPROVED" || status === "REJECTED") {
            const message = new MailerMessage({
                from: { address: $app.settings().meta.senderAddress, name: $app.settings().meta.senderName },
                to: [{ address: employee.email() }],
                subject: "Leave Request Final Decision: " + status,
                html: "<h3>Hello " + record.get("employee_name") + ",</h3>" +
                      "<p>A final decision has been made on your leave request for <b>" + record.get("start_date") + "</b>.</p>" +
                      "<p><b>Status:</b> <span style='font-weight:bold; color:" + (status === "APPROVED" ? "green" : "red") + "'>" + status + "</span></p>" +
                      "<p><b>Manager Notes:</b> " + (record.get("manager_remarks") || "No remarks") + "</p>" +
                      "<p><b>HR/Admin Notes:</b> " + (record.get("approver_remarks") || "No remarks") + "</p>",
            });
            $app.newMailClient().send(message);
        }
    } catch (err) {
        console.error("[LEAVE_UPDATE] Hook Error: " + err.toString());
    }
}, "leaves");

// 3. TRIGGER REPORTS VIA COLLECTION
onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    try {
        const recipientEmail = record.get("recipient_email");
        const message = new MailerMessage({
            from: { address: $app.settings().meta.senderAddress, name: $app.settings().meta.senderName },
            to: [{ address: recipientEmail }],
            subject: record.get("subject"),
            html: record.get("html_content"),
        });
        $app.newMailClient().send(message);
        record.set("status", "SENT");
        record.set("sent_at", new Date().toISOString());
        $app.dao().saveRecord(record);
    } catch (err) {
        record.set("status", "FAILED");
        record.set("error_message", err.toString());
        $app.dao().saveRecord(record);
    }
}, "reports_queue");