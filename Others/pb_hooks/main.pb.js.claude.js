// pb_hooks/main.pb.js
// PocketBase v0.35.1 compatible - using onRecord*Success hooks

// ===== LEAVE MANAGEMENT HOOKS =====

// 1. LEAVE REQUEST CREATED -> EMAIL MANAGER
onRecordAfterCreateSuccess((e) => {
    if (e.collection.name !== "leaves") return;
    
    console.log("[LEAVE_CREATE] Hook triggered");
    const record = e.record;
    const managerId = record.get("line_manager_id");
    
    if (!managerId) {
        console.log("[LEAVE_CREATE] No manager ID found");
        return;
    }

    try {
        console.log("[LEAVE_CREATE] Fetching manager: " + managerId);
        const manager = $app.dao().findRecordById("users", managerId);
        
        if (!manager) {
            console.error("[LEAVE_CREATE] Manager not found: " + managerId);
            return;
        }

        const managerEmail = manager.email();
        console.log("[LEAVE_CREATE] Manager email: " + managerEmail);

        const senderAddress = $app.settings().meta.senderAddress;
        const senderName = $app.settings().meta.senderName;
        console.log("[LEAVE_CREATE] Sender: " + senderAddress + " (" + senderName + ")");

        const message = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: managerEmail }],
            subject: "New Leave Application: " + record.get("employee_name"),
            html: "<h2>New Leave Request</h2>" +
                  "<p><b>Employee:</b> " + record.get("employee_name") + "</p>" +
                  "<p><b>Dates:</b> " + record.get("start_date") + " to " + record.get("end_date") + "</p>" +
                  "<p>Please log in to the OpenHR portal to review this request.</p>",
        });
        
        console.log("[LEAVE_CREATE] Sending email...");
        $app.newMailClient().send(message);
        console.log("[LEAVE_CREATE] ✓ Email sent successfully");
        
    } catch (err) {
        console.error("[LEAVE_CREATE] EXCEPTION: " + err.toString());
    }
}, "leaves");

// 2. LEAVE REQUEST UPDATED (Approved/Rejected) -> EMAIL EMPLOYEE
onRecordAfterUpdateSuccess((e) => {
    if (e.collection.name !== "leaves") return;
    
    console.log("[LEAVE_UPDATE] Hook triggered");
    const record = e.record;
    const status = record.get("status");
    
    console.log("[LEAVE_UPDATE] Status: " + status);
    if (status !== "APPROVED" && status !== "REJECTED") {
        console.log("[LEAVE_UPDATE] Status not APPROVED/REJECTED, skipping");
        return;
    }

    try {
        const employeeId = record.get("employee_id");
        console.log("[LEAVE_UPDATE] Fetching employee: " + employeeId);
        const employee = $app.dao().findRecordById("users", employeeId);
        
        if (!employee) {
            console.error("[LEAVE_UPDATE] Employee not found: " + employeeId);
            return;
        }

        const employeeEmail = employee.email();
        console.log("[LEAVE_UPDATE] Employee email: " + employeeEmail);

        const senderAddress = $app.settings().meta.senderAddress;
        const senderName = $app.settings().meta.senderName;

        const message = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: employeeEmail }],
            subject: "Leave Request Update: " + status,
            html: "<h3>Hello " + record.get("employee_name") + ",</h3>" +
                  "<p>Your leave request has been <b>" + status + "</b>.</p>" +
                  "<p><b>Manager Remarks:</b> " + (record.get("manager_remarks") || "None") + "</p>" +
                  "<p><b>HR Remarks:</b> " + (record.get("approver_remarks") || "None") + "</p>",
        });
        
        console.log("[LEAVE_UPDATE] Sending email...");
        $app.newMailClient().send(message);
        console.log("[LEAVE_UPDATE] ✓ Email sent successfully");
        
    } catch (err) {
        console.error("[LEAVE_UPDATE] EXCEPTION: " + err.toString());
    }
}, "leaves");

// ===== REPORTS QUEUE HOOKS =====

// 3. TRIGGER REPORTS VIA COLLECTION
onRecordAfterCreateSuccess((e) => {
    if (e.collection.name !== "reports_queue") return;
    
    console.log("[REPORTS_QUEUE] ===== HOOK STARTED =====");
    const record = e.record;
    console.log("[REPORTS_QUEUE] Record ID: " + record.id);

    try {
        const recipientEmail = record.get("recipient_email");
        const subject = record.get("subject");
        const htmlContent = record.get("html_content");

        console.log("[REPORTS_QUEUE] Recipient: " + recipientEmail);
        console.log("[REPORTS_QUEUE] Subject: " + subject);
        console.log("[REPORTS_QUEUE] HTML content length: " + (htmlContent ? htmlContent.length : 0));

        if (!recipientEmail || !subject || !htmlContent) {
            console.error("[REPORTS_QUEUE] Missing required fields!");
            console.error("[REPORTS_QUEUE]   - recipient_email: " + (recipientEmail ? "✓" : "✗"));
            console.error("[REPORTS_QUEUE]   - subject: " + (subject ? "✓" : "✗"));
            console.error("[REPORTS_QUEUE]   - html_content: " + (htmlContent ? "✓" : "✗"));
            return;
        }

        const senderAddress = $app.settings().meta.senderAddress;
        const senderName = $app.settings().meta.senderName;
        
        console.log("[REPORTS_QUEUE] Sender address: " + senderAddress);
        console.log("[REPORTS_QUEUE] Sender name: " + senderName);

        console.log("[REPORTS_QUEUE] Creating MailerMessage...");
        const message = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: recipientEmail }],
            subject: subject,
            html: htmlContent,
        });
        
        console.log("[REPORTS_QUEUE] MailerMessage created, initializing mail client...");
        const mailer = $app.newMailClient();
        
        console.log("[REPORTS_QUEUE] Sending email...");
        mailer.send(message);
        
        console.log("[REPORTS_QUEUE] Email sent, updating record status...");
        record.set("sent_at", new Date().toISOString());
        record.set("status", "SENT");
        $app.dao().saveRecord(record);
        
        console.log("[REPORTS_QUEUE] ===== ✓ HOOK COMPLETED SUCCESSFULLY =====");
        
    } catch (err) {
        console.error("[REPORTS_QUEUE] ===== ✗ EXCEPTION CAUGHT =====");
        console.error("[REPORTS_QUEUE] Error: " + err.toString());
        
        try {
            console.log("[REPORTS_QUEUE] Updating record with error status...");
            record.set("status", "FAILED");
            record.set("error_message", err.toString());
            record.set("failed_at", new Date().toISOString());
            $app.dao().saveRecord(record);
            console.log("[REPORTS_QUEUE] Error record updated");
        } catch (updateErr) {
            console.error("[REPORTS_QUEUE] Failed to save error record: " + updateErr.toString());
        }
        console.log("[REPORTS_QUEUE] ===== HOOK COMPLETED WITH ERROR =====");
    }
}, "reports_queue");