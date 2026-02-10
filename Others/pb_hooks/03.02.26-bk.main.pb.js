
console.log("[HOOKS] Loading Main Workflows (Email & Leaves)...");

/* ============================================================
   1. REPORT EMAIL PROCESSOR
   ============================================================ */
onRecordAfterCreateSuccess(function(e) {
    var record = e.record;
    
    if (record.get("status") !== "PENDING") return;

    try {
        var appName = "OpenHR System"; 
        var settings = $app.settings();
        var meta = settings.meta || {};
        var senderAddress = meta.senderAddress || "hr@vclbd.net";
        var senderName = meta.senderName || appName;

        var message = new MailerMessage({
            from: {
                address: senderAddress,
                name: senderName,
            },
            to: [{ address: record.getString("recipient_email") }],
            subject: record.getString("subject"),
            html: record.getString("html_content"),
        });

        $app.newMailClient().send(message);

        record.set("status", "SENT");
        record.set("sent_at", new Date().toISOString());
        $app.save(record);

    } catch (err) {
        console.error("[EMAIL_HOOK] Failed: " + err.toString());
        record.set("status", "FAILED");
        record.set("error_message", err.toString());
        $app.save(record);
    }
}, "reports_queue");


/* ============================================================
   2. LEAVE WORKFLOW NOTIFICATIONS
   ============================================================ */
onRecordAfterCreateSuccess(function(e) {
    var leave = e.record;
    var empId = leave.getString("employee_id");
    var managerId = leave.getString("line_manager_id");
    var MONITOR_EMAIL = "hr@vclbd.net"; // Default Admin Monitor

    function queueEmail(recipient, subject, htmlBody, type) {
        if (!recipient || !recipient.includes("@")) return;
        try {
            var queueCollection = $app.findCollectionByNameOrId("reports_queue");
            var record = new Record(queueCollection);
            record.set("recipient_email", recipient);
            record.set("subject", subject);
            record.set("html_content", htmlBody);
            record.set("status", "PENDING"); 
            record.set("type", type);
            $app.save(record);
        } catch (err) {
            console.error("[LEAVE_HOOK] Queue failed: " + err.toString());
        }
    }

    try {
        var employee = $app.findRecordById("users", empId);
        var type = leave.getString("type");
        var days = leave.getInt("total_days");
        var start = leave.getString("start_date").split(" ")[0]; 
        var reason = leave.getString("reason");
        
        // 1. Notify Employee
        queueEmail(
            employee.email(), 
            "Leave Submitted: " + type, 
            "<p>Hi " + employee.getString("name") + ",</p><p>Your request for <strong>" + type + "</strong> (" + days + " days) starting " + start + " has been submitted.</p>",
            "LEAVE_SUBMIT_CONFIRM"
        );

        // 2. Notify Manager
        if (managerId) {
            var manager = $app.findRecordById("users", managerId);
            queueEmail(
                manager.email(),
                "Action Required: " + type + " Leave",
                "<p><strong>" + employee.getString("name") + "</strong> has requested leave.</p><p>Reason: " + reason + "</p>",
                "LEAVE_MANAGER_ALERT"
            );
        }

        // 3. Notify Admin/HR Monitor (New Request)
        queueEmail(
            MONITOR_EMAIL,
            "[Admin] New Leave Request: " + employee.getString("name"),
            "<div style='font-family: sans-serif; color: #333;'>" +
            "<h3>New Leave Application</h3>" +
            "<p><strong>Employee:</strong> " + employee.getString("name") + " (" + employee.getString("employee_id") + ")</p>" +
            "<p><strong>Type:</strong> " + type + "</p>" +
            "<p><strong>Duration:</strong> " + days + " Days (Starts " + start + ")</p>" +
            "<p><strong>Reason:</strong> " + reason + "</p>" +
            "<p style='color: #666; font-size: 12px;'>This is an automated monitoring alert.</p>" +
            "</div>",
            "LEAVE_ADMIN_MONITOR"
        );

    } catch (err) {
        console.error("[LEAVE_HOOK] Create error: " + err.toString());
    }
}, "leaves");


onRecordAfterUpdateSuccess(function(e) {
    var leave = e.record;
    var status = leave.getString("status");
    var empId = leave.getString("employee_id");
    var MONITOR_EMAIL = "hr@vclbd.net"; // Default Admin Monitor

    function queueEmail(recipient, subject, htmlBody, type) {
        if (!recipient || !recipient.includes("@")) return;
        try {
            var queueCollection = $app.findCollectionByNameOrId("reports_queue");
            var record = new Record(queueCollection);
            record.set("recipient_email", recipient);
            record.set("subject", subject);
            record.set("html_content", htmlBody);
            record.set("status", "PENDING"); 
            record.set("type", type);
            $app.save(record);
        } catch (err) {
            console.error("[LEAVE_HOOK] Queue failed: " + err.toString());
        }
    }

    try {
        var employee = $app.findRecordById("users", empId);
        
        // 1. Escalation to HR
        if (status === "PENDING_HR") {
            var hrEmail = "hr@vclbd.net"; 
            try {
                var configRecord = $app.findFirstRecordByFilter("settings", "key = 'app_config'");
                var config = configRecord.get("value");
                if (config && config.defaultReportRecipient) {
                    hrEmail = config.defaultReportRecipient;
                }
            } catch(ignore) {}

            queueEmail(
                hrEmail,
                "HR Verification: " + employee.getString("name"),
                "<p>Manager has approved leave for <strong>" + employee.getString("name") + "</strong>. Please finalize.</p>",
                "LEAVE_HR_ESCALATION"
            );
        }

        // 2. Final Decision
        if (status === "APPROVED" || status === "REJECTED") {
            queueEmail(
                employee.email(),
                "Leave Request " + status,
                "<p>Your leave request has been <strong>" + status + "</strong>.</p>",
                "LEAVE_DECISION"
            );
        }

        // 3. Notify Admin/HR Monitor (Status Change)
        var remarks = leave.getString("manager_remarks") || leave.getString("approver_remarks") || "No remarks";
        var statusColor = status === "APPROVED" ? "green" : (status === "REJECTED" ? "red" : "orange");

        queueEmail(
            MONITOR_EMAIL,
            "[Admin] Leave Update: " + employee.getString("name") + " -> " + status,
            "<div style='font-family: sans-serif; color: #333;'>" +
            "<h3>Leave Status Update</h3>" +
            "<p><strong>Employee:</strong> " + employee.getString("name") + "</p>" +
            "<p><strong>New Status:</strong> <span style='color:" + statusColor + "; font-weight:bold;'>" + status + "</span></p>" +
            "<p><strong>Evaluator Remarks:</strong> " + remarks + "</p>" +
            "<p style='color: #666; font-size: 12px;'>Monitoring Alert</p>" +
            "</div>",
            "LEAVE_ADMIN_MONITOR"
        );

    } catch (err) {
        console.error("[LEAVE_HOOK] Update error: " + err.toString());
    }
}, "leaves");
