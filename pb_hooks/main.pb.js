
// pb_hooks/main.pb.js
// Optimized for PocketBase v0.23+

/**
 * Helper to queue an email for background processing.
 * Using a local function to avoid scope/ReferenceErrors.
 */
function queueEmail(recipient, subject, html) {
    try {
        const queueCollection = $app.findCollectionByNameOrId("reports_queue");
        const record = new Record(queueCollection);
        
        record.set("recipient_email", recipient);
        record.set("subject", subject);
        record.set("html_content", html);
        record.set("status", "PENDING");
        
        $app.save(record);
        console.log("[QUEUE] Task created for: " + recipient);
    } catch (err) {
        console.error("[QUEUE_ERROR] Failed to insert task: " + err.toString());
    }
}

/**
 * Helper to get HR Email from settings collection
 */
function fetchHrEmail() {
    try {
        const record = $app.findFirstRecordByFilter("settings", "key = 'hr_email'");
        let val = record.get("value");
        // If it's a JSON string, clean it
        if (typeof val === 'string') return val.replace(/^"|"$/g, '');
        return val || "hr@vclbd.net";
    } catch (e) {
        return "hr@vclbd.net";
    }
}

// 1. TRIGGER: When a new Leave Request is submitted (Notify Manager)
onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    const employeeId = record.getString("employee_id");
    const managerId = record.getString("line_manager_id");
    
    if (!managerId) return;

    try {
        const employee = $app.findRecordById("users", employeeId);
        const manager = $app.findRecordById("users", managerId);

        // Notify Manager
        const managerSubject = `Action Required: New Leave Request - ${record.getString("employee_name")}`;
        const managerHtml = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #4f46e5;">New Leave Application</h2>
                <p><b>Employee:</b> ${record.getString("employee_name")}</p>
                <p><b>Type:</b> ${record.getString("type")}</p>
                <p><b>Dates:</b> ${record.getString("start_date")} to ${record.getString("end_date")}</p>
                <p><b>Reason:</b> ${record.getString("reason") || "N/A"}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p>Please log in to the portal to review.</p>
            </div>
        `;
        queueEmail(manager.email(), managerSubject, managerHtml);

        // Notify Employee
        queueEmail(employee.email(), "Leave Request Submitted", `<p>Hi ${record.getString("employee_name")}, your request is now with your manager for review.</p>`);

    } catch (err) {
        console.error("[LEAVE_CREATE_HOOK] Error: " + err.toString());
    }
}, "leaves");

// 2. TRIGGER: When a Manager or HR updates the request
onRecordAfterUpdateSuccess((e) => {
    const record = e.record;
    const status = record.getString("status");
    const employeeId = record.getString("employee_id");
    const employeeName = record.getString("employee_name");

    try {
        const employee = $app.findRecordById("users", employeeId);
        const hrEmail = fetchHrEmail();

        // SCENARIO A: Manager Approved (Moves to PENDING_HR)
        if (status === "PENDING_HR") {
            // Notify Employee
            const empSubject = `Update: Manager Approved your Leave`;
            const empHtml = `
                <p>Hi ${employeeName},</p>
                <p>Your Line Manager has <b>approved</b> your request. It has now been sent to HR for final documentation.</p>
                <p><b>Manager Remarks:</b> ${record.getString("manager_remarks") || "None"}</p>
            `;
            queueEmail(employee.email(), empSubject, empHtml);

            // Notify HR
            const hrSubject = `Action Required: HR Review for ${employeeName}`;
            const hrHtml = `<p>Line Manager has approved leave for ${employeeName}. Final HR verification required.</p>`;
            queueEmail(hrEmail, hrSubject, hrHtml);
        }

        // SCENARIO B: Final HR Decision (APPROVED or REJECTED)
        if (status === "APPROVED" || status === "REJECTED") {
            const color = status === "APPROVED" ? "#10b981" : "#ef4444";
            const subject = `Final Decision: Your Leave Request is ${status}`;
            const html = `
                <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px;">
                    <h2 style="color: ${color};">${status}</h2>
                    <p>Hi ${employeeName}, final review is complete.</p>
                    <p><b>HR Remarks:</b> ${record.getString("approver_remarks") || "N/A"}</p>
                </div>
            `;
            queueEmail(employee.email(), subject, html);
            
            // Log for HR if final approved
            if (status === "APPROVED") {
                queueEmail(hrEmail, `[LOG] Final Approved: ${employeeName}`, `<p>Leave officially logged for payroll.</p>`);
            }
        }
    } catch (err) {
        console.error("[LEAVE_UPDATE_HOOK] Error: " + err.toString());
    }
}, "leaves");

// 3. TRIGGER: The Background SMTP Worker
onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    if (record.get("status") !== "PENDING") return;

    try {
        const meta = $app.settings().meta;
        const message = new MailerMessage({
            from: { address: meta.senderAddress, name: meta.senderName },
            to: [{ address: record.get("recipient_email") }],
            subject: record.get("subject"),
            html: record.get("html_content"),
        });
        
        $app.newMailClient().send(message);
        
        record.set("status", "SENT");
        record.set("sent_at", new Date().toISOString());
        $app.save(record);
    } catch (err) {
        console.error("[SMTP_ERROR] " + err.toString());
        record.set("status", "FAILED");
        record.set("error_message", err.toString());
        $app.save(record);
    }
}, "reports_queue");
