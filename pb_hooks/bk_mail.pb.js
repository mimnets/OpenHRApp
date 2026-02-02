/**
 * OpenHR Central Automation Hook
 * --------------------------------
 * This file handles ALL server-side automation:
 * 1. Email Delivery (Processing 'reports_queue')
 * 2. Leave Workflow Triggers (Watching 'leaves')
 */

/* ============================================================
   1. REPORT EMAIL PROCESSOR (The Mailman)
   Watches 'reports_queue' for new PENDING records.
   ============================================================ */
onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    
    // Only process if status is PENDING.
    if (record.get("status") !== "PENDING") return;

    console.log("[HOOK_LOG] Processing email queue item: " + record.id);

    try {
        // 1. Fetch Organization Meta for "From" address
        const appName = "OpenHR System"; 
        const senderAddress = $app.settings().meta.senderAddress;
        const senderName = $app.settings().meta.senderName || appName;

        // 2. Construct the Email
        const message = new MailerMessage({
            from: {
                address: senderAddress,
                name: senderName,
            },
            to: [{ address: record.get("recipient_email") }],
            subject: record.get("subject"),
            html: record.get("html_content"),
        });

        // 3. Send via SMTP
        $app.newMailClient().send(message);

        // 4. Update Record on Success
        record.set("status", "SENT");
        record.set("sent_at", new Date().toISOString());
        $app.save(record);
        
        console.log("[HOOK_SUCCESS] Email sent to " + record.get("recipient_email"));

    } catch (err) {
        // 5. Handle Failure
        console.error("[HOOK_ERROR] Failed to send email: " + err.toString());
        
        record.set("status", "FAILED");
        record.set("error_message", err.toString());
        $app.save(record);
    }
}, "reports_queue");


/* ============================================================
   2. LEAVE WORKFLOW NOTIFICATIONS
   Watches 'leaves' for changes and queues emails.
   ============================================================ */

// -- A. When a Leave is Applied --
onRecordAfterCreateSuccess((e) => {
    const leave = e.record;
    const empId = leave.getString("employee_id");
    const managerId = leave.getString("line_manager_id");

    // Local helper to ensure scope availability
    const queueEmail = (recipient, subject, htmlBody, type) => {
        if (!recipient || !recipient.includes("@")) return;
        try {
            const queueCollection = $app.findCollectionByNameOrId("reports_queue");
            const record = new Record(queueCollection);
            record.set("recipient_email", recipient);
            record.set("subject", subject);
            record.set("html_content", htmlBody);
            record.set("status", "PENDING"); 
            record.set("type", type);
            $app.save(record);
        } catch (err) {
            console.error("[HOOK_WARN] Could not queue email: " + err.toString());
        }
    };

    try {
        const employee = $app.findRecordById("users", empId);
        const type = leave.getString("type");
        const days = leave.getString("total_days");
        const start = leave.getString("start_date").split(" ")[0]; 
        
        // 1. Notify Employee (Confirmation)
        queueEmail(
            employee.email(), 
            "Leave Application Submitted: " + type, 
            `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
                <h2 style="color: #2563eb; margin-top:0;">Application Received</h2>
                <p>Hi ${employee.getString("name")},</p>
                <p>Your request has been submitted successfully and is pending manager review.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                    <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;">Type</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${type}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #e2e8f0;">Start Date</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${start}</td></tr>
                    <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;">Duration</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${days} Days</td></tr>
                </table>
                <p style="font-size: 12px; color: #64748b; margin-top: 20px;">OpenHR Notification System</p>
            </div>`,
            "LEAVE_SUBMIT_CONFIRM"
        );

        // 2. Notify Manager (Action Required)
        if (managerId) {
            const manager = $app.findRecordById("users", managerId);
            queueEmail(
                manager.email(),
                "Action Required: " + type + " Leave - " + employee.getString("name"),
                `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #f59e0b; border-radius: 8px; max-width: 600px;">
                    <h2 style="color: #d97706; margin-top:0;">Approval Required</h2>
                    <p><strong>${employee.getString("name")}</strong> has requested leave.</p>
                    <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <strong>Request Details:</strong><br>
                        ${type} • ${days} Days<br>
                        Starting: ${start}<br>
                        Reason: "<em>${leave.getString("reason")}</em>"
                    </div>
                    <p>Please log in to the OpenHR portal to Approve or Reject this request.</p>
                </div>`,
                "LEAVE_MANAGER_ALERT"
            );
        }
    } catch (err) {
        console.error("[HOOK_ERROR] Leave Create Workflow: " + err.toString());
    }
}, "leaves");


// -- B. When Leave Status Updates --
onRecordAfterUpdateSuccess((e) => {
    const leave = e.record;
    const status = leave.getString("status");
    const empId = leave.getString("employee_id");

    // Local helper to ensure scope availability
    const queueEmail = (recipient, subject, htmlBody, type) => {
        if (!recipient || !recipient.includes("@")) return;
        try {
            const queueCollection = $app.findCollectionByNameOrId("reports_queue");
            const record = new Record(queueCollection);
            record.set("recipient_email", recipient);
            record.set("subject", subject);
            record.set("html_content", htmlBody);
            record.set("status", "PENDING"); 
            record.set("type", type);
            $app.save(record);
        } catch (err) {
            console.error("[HOOK_WARN] Could not queue email: " + err.toString());
        }
    };

    try {
        const employee = $app.findRecordById("users", empId);
        
        // 1. Escalation to HR (if Manager Approved)
        if (status === "PENDING_HR") {
            // Find HR Email from App Config
            let hrEmail = "hr@openhr.app"; 
            try {
                const configRecord = $app.findFirstRecordByFilter("settings", "key = 'app_config'");
                const config = configRecord.get("value");
                if (config && config.defaultReportRecipient) {
                    hrEmail = config.defaultReportRecipient;
                }
            } catch(ignore) {}

            queueEmail(
                hrEmail,
                "HR Verification: " + employee.getString("name"),
                `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; border-left: 4px solid #2563eb; max-width: 600px;">
                    <h2 style="color: #1e293b; margin-top:0;">Manager Approved</h2>
                    <p>The leave request for <strong>${employee.getString("name")}</strong> has been approved by their manager and awaits final HR verification.</p>
                    <p><strong>Manager Remarks:</strong> ${leave.getString("manager_remarks") || "None"}</p>
                </div>`,
                "LEAVE_HR_ESCALATION"
            );
        }

        // 2. Final Decision Notification
        if (status === "APPROVED" || status === "REJECTED") {
            const isApproved = status === "APPROVED";
            const color = isApproved ? "#059669" : "#dc2626"; // Green or Red
            const decisionText = isApproved ? "Approved" : "Rejected";
            const remarks = isApproved ? leave.getString("approver_remarks") : (leave.getString("approver_remarks") || leave.getString("manager_remarks"));
            
            queueEmail(
                employee.email(),
                "Leave Request " + decisionText,
                `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; border-left: 5px solid ${color}; max-width: 600px;">
                    <h2 style="color: ${color}; margin-top:0;">Request ${decisionText}</h2>
                    <p>Your leave request starting <strong>${leave.getString("start_date").split(" ")[0]}</strong> has been processed.</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 15px;">
                        <strong>Remarks:</strong><br>
                        ${remarks || "No additional remarks."}
                    </div>
                </div>`,
                "LEAVE_DECISION"
            );
        }
    } catch (err) {
        console.error("[HOOK_ERROR] Leave Update Workflow: " + err.toString());
    }
}, "leaves");