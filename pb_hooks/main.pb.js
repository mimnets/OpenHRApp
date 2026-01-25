// OpenHR Advanced Email Routing Engine
// Specialized logic for 1. Reports, 2. Employee Alerts, 3. Manager Alerts, 4. HR/Admin Alerts

/**
 * 🛠 CORE SMTP WORKER
 * Monitors the reports_queue and dispatches emails.
 * This prevents collision by processing requests sequentially.
 */
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
        console.log(`[CHANNEL_ROUTING] Success: ${record.get("type")} sent to ${record.get("recipient_email")}`);
    } catch (err) {
        console.error(`[CHANNEL_ROUTING] Error: ${err.toString()}`);
        record.set("status", "FAILED");
        record.set("error_message", err.toString());
        $app.save(record);
    }
}, "reports_queue");

/**
 * 📬 INTERNAL QUEUE HELPER
 */
function pushToQueue(recipient, subject, html, type) {
    try {
        const queueCollection = $app.findCollectionByNameOrId("reports_queue");
        const record = new Record(queueCollection);
        record.set("recipient_email", recipient);
        record.set("subject", subject);
        record.set("html_content", html);
        record.set("status", "PENDING");
        record.set("type", type); 
        $app.save(record);
    } catch (err) {
        console.error("[QUEUE_CRITICAL_FAILURE] " + err.toString());
    }
}

/**
 * 🟢 CHANNEL 2 & 3: LEAVE SUBMISSION (Employee & Manager)
 */
onRecordAfterCreateSuccess((e) => {
    const leave = e.record;
    const empId = leave.getString("employee_id");
    const managerId = leave.getString("line_manager_id");

    try {
        const employee = $app.findRecordById("users", empId);
        
        // Channel 2: Employee Submission Confirmation
        pushToQueue(
            employee.email(), 
            "Leave Application Submitted", 
            `<div style="font-family:sans-serif; padding:20px; border:1px solid #eee; border-radius:12px;">
                <h3 style="color:#2563eb;">Submission Received</h3>
                <p>Hi ${employee.getString("name")}, your ${leave.getString("type")} request for <b>${leave.getString("start_date")}</b> is now with your manager for review.</p>
            </div>`,
            "EMPLOYEE_SUBMISSION"
        );

        // Channel 3: Line Manager Action Alert
        if (managerId) {
            const manager = $app.findRecordById("users", managerId);
            pushToQueue(
                manager.email(),
                `Action Required: Leave Request - ${employee.getString("name")}`,
                `<div style="font-family:sans-serif; padding:20px; border:1px solid #eee; border-radius:12px;">
                    <h3 style="color:#f59e0b;">Approval Required</h3>
                    <p><b>Employee:</b> ${employee.getString("name")}</p>
                    <p><b>Period:</b> ${leave.getString("start_date")} to ${leave.getString("end_date")}</p>
                    <p>Please log in to the portal to review this request.</p>
                    <a href="http://localhost:8090/_/" style="background:#2563eb; color:white; padding:10px 20px; text-decoration:none; border-radius:6px; display:inline-block;">Open Dashboard</a>
                </div>`,
                "MANAGER_REVIEW"
            );
        }
    } catch (err) {
        console.error("[WF_SUBMIT_ERROR] " + err.toString());
    }
}, "leaves");

/**
 * 🔵 CHANNEL 4: LEAVE ESCALATION (HR/Admin) & FINAL DECISION
 */
onRecordAfterUpdateSuccess((e) => {
    const leave = e.record;
    const status = leave.getString("status");
    const empId = leave.getString("employee_id");

    try {
        const employee = $app.findRecordById("users", empId);
        const configRecord = $app.findFirstRecordByFilter("settings", "key = 'app_config'");
        const hrEmail = configRecord.get("value").defaultReportRecipient || "hr@vclbd.net";

        // Channel 4: Escalation to HR after Manager Approval
        if (status === "PENDING_HR") {
            pushToQueue(
                hrEmail,
                `HR Verification: ${employee.getString("name")}`,
                `<div style="font-family:sans-serif; padding:20px; border:1px solid #eee; border-radius:12px;">
                    <h3 style="color:#10b981;">Manager Approved</h3>
                    <p>A leave request for <b>${employee.getString("name")}</b> has been approved by their manager and requires final HR verification.</p>
                </div>`,
                "HR_VERIFICATION"
            );
        }

        // Channel 2 (Update): Final Decision to Employee
        if (status === "APPROVED" || status === "REJECTED") {
            const color = status === "APPROVED" ? "#10b981" : "#ef4444";
            pushToQueue(
                employee.email(),
                `Leave Request Update: ${status}`,
                `<div style="font-family:sans-serif; padding:20px; border:1px solid #eee; border-radius:12px;">
                    <h3 style="color:${color};">Request ${status}</h3>
                    <p>Your request for the period <b>${leave.getString("start_date")}</b> has been processed.</p>
                    <p><b>Remarks:</b> ${leave.getString("approver_remarks") || "None"}</p>
                </div>`,
                "EMPLOYEE_DECISION"
            );
        }
    } catch (err) {
        console.error("[WF_TRANSITION_ERROR] " + err.toString());
    }
}, "leaves");