// pb_hooks/main.pb.js
// Compatible with PocketBase v0.23+ 

// ===== LEAVE MANAGEMENT HOOKS =====

// 1. LEAVE REQUEST CREATED -> EMAIL MANAGER
onRecordAfterCreateSuccess((e) => {
    console.log("[LEAVE_CREATE] Hook triggered for record: " + e.record.id);
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
            html: "<h2>New Leave Request</h2>" +
                  "<p><b>Employee:</b> " + record.get("employee_name") + "</p>" +
                  "<p><b>Dates:</b> " + record.get("start_date") + " to " + record.get("end_date") + "</p>" +
                  "<p>Please log in to the OpenHR portal to review this request.</p>",
        });
        
        $app.newMailClient().send(message);
        console.log("[LEAVE_CREATE] ✓ Email sent to manager");
    } catch (err) {
        console.error("[LEAVE_CREATE] Error: " + err.toString());
    }
}, "leaves");

// 2. LEAVE REQUEST UPDATED (Approved/Rejected) -> EMAIL EMPLOYEE
onRecordAfterUpdateSuccess((e) => {
    const record = e.record;
    const status = record.get("status");
    
    if (status !== "APPROVED" && status !== "REJECTED") return;

    try {
        const employee = $app.dao().findRecordById("users", record.get("employee_id"));
        if (!employee) return;

        const message = new MailerMessage({
            from: { address: $app.settings().meta.senderAddress, name: $app.settings().meta.senderName },
            to: [{ address: employee.email() }],
            subject: "Leave Request Update: " + status,
            html: "<h3>Hello " + record.get("employee_name") + ",</h3>" +
                  "<p>Your leave request has been <b>" + status + "</b>.</p>" +
                  "<p><b>Manager Remarks:</b> " + (record.get("manager_remarks") || "None") + "</p>" +
                  "<p><b>HR Remarks:</b> " + (record.get("approver_remarks") || "None") + "</p>",
        });
        
        $app.newMailClient().send(message);
        console.log("[LEAVE_UPDATE] ✓ Email sent to employee");
    } catch (err) {
        console.error("[LEAVE_UPDATE] Error: " + err.toString());
    }
}, "leaves");

// ===== REPORTS QUEUE HOOKS =====

// 3. TRIGGER REPORTS VIA COLLECTION
onRecordAfterCreateSuccess((e) => {
    console.log("[REPORTS_QUEUE] Hook triggered for record: " + e.record.id);
    const record = e.record;

    try {
        const recipientEmail = record.get("recipient_email");
        const subject = record.get("subject");
        const htmlContent = record.get("html_content");

        if (!recipientEmail || !subject || !htmlContent) {
            console.error("[REPORTS_QUEUE] Missing required fields");
            return;
        }

        const message = new MailerMessage({
            from: { address: $app.settings().meta.senderAddress, name: $app.settings().meta.senderName },
            to: [{ address: recipientEmail }],
            subject: subject,
            html: htmlContent,
        });
        
        $app.newMailClient().send(message);
        
        // Update record status after successful send
        record.set("status", "SENT");
        record.set("sent_at", new Date().toISOString());
        $app.dao().saveRecord(record);
        
        console.log("[REPORTS_QUEUE] ✓ Email sent successfully");
    } catch (err) {
        console.error("[REPORTS_QUEUE] Error: " + err.toString());
        try {
            record.set("status", "FAILED");
            record.set("error_message", err.toString());
            record.set("failed_at", new Date().toISOString());
            $app.dao().saveRecord(record);
        } catch (updateErr) {}
    }
}, "reports_queue");