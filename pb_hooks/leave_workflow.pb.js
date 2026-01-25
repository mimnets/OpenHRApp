// 📬 INTERNAL QUEUE HELPER
function pushToEmailQueue(recipient, subject, html, type) {
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
        console.error("[QUEUE_ERROR] " + err.toString());
    }
}

// 🟢 SUBMISSION PHASE
onRecordAfterCreateSuccess((e) => {
    const leave = e.record;
    const empId = leave.getString("employee_id");
    const managerId = leave.getString("line_manager_id");

    try {
        const employee = $app.findRecordById("users", empId);
        
        // Notify Employee
        pushToEmailQueue(
            employee.email(), 
            "Leave Application Received", 
            `<h3>Application Confirmation</h3><p>Hi ${employee.getString("name")}, your request for ${leave.getString("start_date")} is under review.</p>`,
            "EMPLOYEE_SUBMISSION"
        );

        // Notify Manager
        if (managerId) {
            const manager = $app.findRecordById("users", managerId);
            pushToEmailQueue(
                manager.email(),
                `Action Required: Leave - ${employee.getString("name")}`,
                `<h3>Review Required</h3><p>Employee: ${employee.getString("name")}<br>Dates: ${leave.getString("start_date")} to ${leave.getString("end_date")}</p>`,
                "MANAGER_REVIEW"
            );
        }
    } catch (err) { console.error("[PB_WF_CREATE] " + err.toString()); }
}, "leaves");

// 🔵 TRANSITION PHASE (Approvals)
onRecordAfterUpdateSuccess((e) => {
    const leave = e.record;
    const status = leave.getString("status");
    const empId = leave.getString("employee_id");

    try {
        const employee = $app.findRecordById("users", empId);
        
        // Escalation to HR
        if (status === "PENDING_HR") {
            const configRecord = $app.findFirstRecordByFilter("settings", "key = 'app_config'");
            const hrEmail = configRecord.get("value").defaultReportRecipient || "hr@vclbd.net";
            pushToEmailQueue(
                hrEmail,
                `HR Verification: ${employee.getString("name")}`,
                `<h3>Manager Approved</h3><p>Leave for ${employee.getString("name")} requires final HR verification.</p>`,
                "HR_VERIFICATION"
            );
        }

        // Final Decision notification to Employee
        if (status === "APPROVED" || status === "REJECTED") {
            pushToEmailQueue(
                employee.email(),
                `Leave Request Result: ${status}`,
                `<h3>Final Decision: ${status}</h3><p>Your request for ${leave.getString("start_date")} has been processed.</p>`,
                "EMPLOYEE_DECISION"
            );
        }
    } catch (err) { console.error("[PB_WF_UPDATE] " + err.toString()); }
}, "leaves");