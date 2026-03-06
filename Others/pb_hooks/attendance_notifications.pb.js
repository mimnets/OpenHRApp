// pb_hooks/attendance_notifications.pb.js
// Attendance — Late Alerts, Checkout Reminders, Auto-Absent Notifications, Holiday Alerts
//
// ⚠️  Each .pb.js file runs in its own isolated JS scope.
//     Functions defined in other hook files are NOT available here.

console.log("[HOOKS] Loading Attendance Notifications (v1.0)...");

// ────────────────────────────────────────────────────────────────
// Helper: Create an in-app notification record
// ────────────────────────────────────────────────────────────────
function createNotification(userId, orgId, type, title, message, priority, referenceId, referenceType, actionUrl) {
    try {
        var collection = $app.findCollectionByNameOrId("notifications");
        var record = new Record(collection);
        record.set("user_id", userId);
        record.set("organization_id", orgId);
        record.set("type", type || "ATTENDANCE");
        record.set("title", title);
        record.set("message", message || "");
        record.set("is_read", false);
        record.set("priority", priority || "NORMAL");
        record.set("reference_id", referenceId || "");
        record.set("reference_type", referenceType || "attendance");
        record.set("action_url", actionUrl || "attendance");
        $app.save(record);
    } catch (err) {
        console.log("[ATTEND-NOTIF] Failed to create notification for user " + userId + ": " + err.toString());
    }
}

// ────────────────────────────────────────────────────────────────
// Helper: Send an email
// ────────────────────────────────────────────────────────────────
function sendEmail(toAddress, subject, htmlBody) {
    try {
        var meta = $app.settings().meta || {};
        var senderAddress = meta.senderAddress || "noreply@openhr.app";
        var senderName = meta.senderName || "OpenHR System";

        var message = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: toAddress }],
            subject: subject,
            html: htmlBody,
        });
        $app.newMailClient().send(message);
        return true;
    } catch (err) {
        console.log("[ATTEND-NOTIF] Failed to send email to " + toAddress + ": " + err.toString());
        return false;
    }
}

// ────────────────────────────────────────────────────────────────
// Helper: Format date for display
// ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    return (dateStr || "").split(" ")[0].split("T")[0];
}

// ────────────────────────────────────────────────────────────────
// Helper: Check if ATTENDANCE notifications are enabled for an org
// ────────────────────────────────────────────────────────────────
function isAttendanceNotifEnabled(orgId) {
    try {
        var configRecord = $app.findFirstRecordByFilter(
            "settings",
            "key = 'notification_config' && organization_id = {:orgId}",
            { orgId: orgId }
        );
        var config = configRecord.get("value");
        if (config && config.enabledTypes) {
            return config.enabledTypes.indexOf("ATTENDANCE") !== -1;
        }
    } catch (e) {}
    // Default: enabled
    return true;
}

// ────────────────────────────────────────────────────────────────
// Helper: Get org's app config
// ────────────────────────────────────────────────────────────────
function getOrgAppConfig(orgId) {
    try {
        var configRecord = $app.findFirstRecordByFilter(
            "settings",
            "key = 'app_config' && organization_id = {:orgId}",
            { orgId: orgId }
        );
        return configRecord.get("value") || null;
    } catch (e) {
        return null;
    }
}

// ────────────────────────────────────────────────────────────────
// Helper: Get org holidays
// ────────────────────────────────────────────────────────────────
function getOrgHolidays(orgId) {
    try {
        var holidayRecord = $app.findFirstRecordByFilter(
            "settings",
            "key = 'holidays' && organization_id = {:orgId}",
            { orgId: orgId }
        );
        return holidayRecord.get("value") || [];
    } catch (e) {
        return [];
    }
}

// ────────────────────────────────────────────────────────────────
// Helper: Resolve shift for an employee
// Returns { startTime, endTime, autoSessionCloseTime } or null
// ────────────────────────────────────────────────────────────────
function resolveEmployeeShift(empRecord, orgId) {
    var shiftId = empRecord.getString("shift_id") || "";

    // Try employee's assigned shift
    if (shiftId) {
        try {
            var shift = $app.findRecordById("shifts", shiftId);
            return {
                startTime: shift.getString("startTime") || "09:00",
                endTime: shift.getString("endTime") || "18:00",
                autoSessionCloseTime: shift.getString("autoSessionCloseTime") || "23:59"
            };
        } catch (e) {}
    }

    // Try org's default shift
    try {
        var defaultShift = $app.findFirstRecordByFilter(
            "shifts",
            "organization_id = {:orgId} && isDefault = true",
            { orgId: orgId }
        );
        return {
            startTime: defaultShift.getString("startTime") || "09:00",
            endTime: defaultShift.getString("endTime") || "18:00",
            autoSessionCloseTime: defaultShift.getString("autoSessionCloseTime") || "23:59"
        };
    } catch (e) {}

    // Fallback to app config
    var config = getOrgAppConfig(orgId);
    if (config) {
        return {
            startTime: config.officeStartTime || "09:00",
            endTime: config.officeEndTime || "18:00",
            autoSessionCloseTime: config.autoSessionCloseTime || "23:59"
        };
    }

    return { startTime: "09:00", endTime: "18:00", autoSessionCloseTime: "23:59" };
}

/* ============================================================
   1. LATE CHECK-IN NOTIFICATIONS
      Trigger: attendance record created with status = 'LATE'
      Notify: Line Manager (email + bell) + Admin/HR (bell)
   ============================================================ */
onRecordAfterCreateSuccess((e) => {
    var record = e.record;
    var status = record.getString("status");

    if (status !== "LATE") return;

    var empId = record.getString("employee_id");
    var empName = record.getString("employee_name");
    var orgId = record.getString("organization_id");
    var checkIn = record.getString("check_in") || "N/A";
    var date = formatDate(record.getString("date"));

    if (!orgId || !isAttendanceNotifEnabled(orgId)) return;

    console.log("[ATTEND-NOTIF] Late check-in detected: " + empName + " at " + checkIn + " on " + date);

    try {
        // Get employee record for manager ID
        var emp = $app.findRecordById("users", empId);
        var managerId = emp.getString("line_manager_id") || "";

        // Get org name
        var orgName = "your organization";
        try {
            var org = $app.findRecordById("organizations", orgId);
            orgName = org.getString("name") || orgName;
        } catch (e) {}

        // ── Notify Line Manager (email + bell) ──
        if (managerId) {
            try {
                var manager = $app.findRecordById("users", managerId);
                var managerEmail = manager.getString("email");
                var managerName = manager.getString("name");

                createNotification(
                    managerId, orgId, "ATTENDANCE",
                    empName + " checked in late",
                    empName + " checked in at " + checkIn + " on " + date + ".",
                    "NORMAL", record.id, "attendance", "attendance"
                );

                sendEmail(managerEmail,
                    "Late Check-In Alert: " + empName + " — " + date,
                    "<h2>Late Check-In Alert</h2>" +
                    "<p>Dear " + managerName + ",</p>" +
                    "<p>Your team member <strong>" + empName + "</strong> has checked in late.</p>" +
                    "<table style='border-collapse:collapse;margin:12px 0;'>" +
                    "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Employee</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + empName + "</td></tr>" +
                    "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Date</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + date + "</td></tr>" +
                    "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Check-In Time</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'><strong style='color:#f59e0b;'>" + checkIn + "</strong></td></tr>" +
                    "</table>" +
                    "<p>Log in to <strong>OpenHR</strong> to view attendance details.</p>"
                );

                console.log("[ATTEND-NOTIF] Late alert sent to manager: " + managerEmail);
            } catch (err) {
                console.log("[ATTEND-NOTIF] Failed to notify manager: " + err.toString());
            }
        }

        // ── Notify Admin/HR (bell only — email would be noisy for every late) ──
        try {
            var admins = $app.findRecordsByFilter(
                "users",
                "organization_id = {:orgId} && (role = 'ADMIN' || role = 'HR') && status = 'ACTIVE'",
                { orgId: orgId }
            );
            for (var a = 0; a < admins.length; a++) {
                if (admins[a].id === empId) continue;
                createNotification(
                    admins[a].id, orgId, "ATTENDANCE",
                    empName + " checked in late",
                    empName + " checked in at " + checkIn + " on " + date + ".",
                    "NORMAL", record.id, "attendance", "attendance"
                );
            }
        } catch (err) {}

    } catch (err) {
        console.log("[ATTEND-NOTIF] Error in late check-in hook: " + err.toString());
    }
}, "attendance");


/* ============================================================
   2. CHECKOUT REMINDER + HOLIDAY ALERTS + AUTO-ABSENT ALERTS
      Job ID: "attendance_reminders"
      Schedule: "*/5 * * * *" (Every 5 minutes)

      Runs every 5 minutes and checks:
      A. Employees who haven't checked out and shift is ending in 15 min
      B. (At 09:00) Upcoming holidays tomorrow
      C. (After auto-absent time) Notify absent-marked employees
   ============================================================ */
cronAdd("attendance_reminders", "*/5 * * * *", () => {
    try {
        var now = new Date();
        var h = ("0" + now.getHours()).slice(-2);
        var m = ("0" + now.getMinutes()).slice(-2);
        var currentTime = h + ":" + m;
        var year = now.getFullYear();
        var month = ("0" + (now.getMonth() + 1)).slice(-2);
        var day = ("0" + now.getDate()).slice(-2);
        var todayStr = year + "-" + month + "-" + day;

        // Get all active organizations
        var orgs = [];
        try {
            orgs = $app.findRecordsByFilter("organizations", "subscription_status != 'SUSPENDED'");
        } catch (e) { return; }

        for (var o = 0; o < orgs.length; o++) {
            var org = orgs[o];
            var orgId = org.id;
            var orgName = org.getString("name");
            if (orgName === "__SYSTEM__" || orgName === "Platform") continue;

            if (!isAttendanceNotifEnabled(orgId)) continue;

            // ─────────────────────────────────────────────
            // A. CHECKOUT REMINDERS (shift ending in ~15 min)
            // ─────────────────────────────────────────────
            try {
                // Find employees who are checked in but haven't checked out today
                var activeAttendance = [];
                try {
                    activeAttendance = $app.findRecordsByFilter(
                        "attendance",
                        "organization_id = {:orgId} && date = {:todayStr} && check_out = '' && status != 'ABSENT'",
                        { orgId: orgId, todayStr: todayStr }
                    );
                } catch (e) {}

                for (var i = 0; i < activeAttendance.length; i++) {
                    var att = activeAttendance[i];
                    var empId = att.getString("employee_id");
                    var empName = att.getString("employee_name");

                    try {
                        var emp = $app.findRecordById("users", empId);
                        var shift = resolveEmployeeShift(emp, orgId);
                        if (!shift) continue;

                        var endTime = shift.endTime; // e.g. "18:00"

                        // Calculate 15 minutes before end time
                        var endParts = endTime.split(":");
                        var endHour = parseInt(endParts[0]);
                        var endMin = parseInt(endParts[1]);
                        var totalEndMin = endHour * 60 + endMin;
                        var reminderMin = totalEndMin - 15;
                        if (reminderMin < 0) reminderMin = 0;
                        var reminderHour = Math.floor(reminderMin / 60);
                        var reminderMinPart = reminderMin % 60;
                        var reminderTime = ("0" + reminderHour).slice(-2) + ":" + ("0" + reminderMinPart).slice(-2);

                        // Check if current time matches the reminder window (within 5 min since cron runs every 5 min)
                        var curParts = currentTime.split(":");
                        var curTotalMin = parseInt(curParts[0]) * 60 + parseInt(curParts[1]);
                        var remTotalMin = reminderHour * 60 + reminderMinPart;

                        if (curTotalMin >= remTotalMin && curTotalMin < remTotalMin + 5) {
                            // Check we haven't already sent a reminder today for this employee
                            var alreadySent = false;
                            try {
                                $app.findFirstRecordByFilter(
                                    "notifications",
                                    "user_id = {:empId} && type = 'ATTENDANCE' && title ~ 'check out' && created >= {:todayStr}",
                                    { empId: empId, todayStr: todayStr + " 00:00:00" }
                                );
                                alreadySent = true;
                            } catch (e) {}

                            if (!alreadySent) {
                                createNotification(
                                    empId, orgId, "ATTENDANCE",
                                    "Reminder: Please check out",
                                    "Your shift ends at " + endTime + ". Please remember to check out before leaving.",
                                    "NORMAL", att.id, "attendance", "attendance"
                                );

                                sendEmail(emp.getString("email"),
                                    "Reminder: Please Check Out — Shift Ends at " + endTime,
                                    "<h2>Checkout Reminder</h2>" +
                                    "<p>Dear " + empName + ",</p>" +
                                    "<p>Your shift is ending soon at <strong>" + endTime + "</strong>.</p>" +
                                    "<p>Please remember to <strong>check out</strong> before you leave to ensure accurate attendance records.</p>" +
                                    "<p style='color:#6b7280;font-size:13px;'>If you have already checked out, please disregard this message.</p>"
                                );

                                console.log("[ATTEND-NOTIF] Checkout reminder sent to: " + empName + " (shift ends " + endTime + ")");
                            }
                        }
                    } catch (empErr) {
                        // Skip this employee silently
                    }
                }
            } catch (err) {
                console.log("[ATTEND-NOTIF] Checkout reminder error for org " + orgName + ": " + err.toString());
            }

            // ─────────────────────────────────────────────
            // B. UPCOMING HOLIDAY NOTIFICATIONS (at 09:00)
            // ─────────────────────────────────────────────
            if (currentTime === "09:00") {
                try {
                    var holidays = getOrgHolidays(orgId);
                    if (holidays.length === 0) continue;

                    // Check for holidays tomorrow
                    var tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    var tomorrowStr = tomorrow.getFullYear() + "-" + ("0" + (tomorrow.getMonth() + 1)).slice(-2) + "-" + ("0" + tomorrow.getDate()).slice(-2);

                    // Check for holidays in 3 days
                    var threeDays = new Date(now);
                    threeDays.setDate(threeDays.getDate() + 3);
                    var threeDaysStr = threeDays.getFullYear() + "-" + ("0" + (threeDays.getMonth() + 1)).slice(-2) + "-" + ("0" + threeDays.getDate()).slice(-2);

                    var upcomingHolidays = [];
                    for (var hi = 0; hi < holidays.length; hi++) {
                        var hDate = (holidays[hi].date || "").split(" ")[0].split("T")[0];
                        if (hDate === tomorrowStr || hDate === threeDaysStr) {
                            var daysUntil = (hDate === tomorrowStr) ? 1 : 3;
                            upcomingHolidays.push({
                                name: holidays[hi].name || "Holiday",
                                date: hDate,
                                daysUntil: daysUntil
                            });
                        }
                    }

                    if (upcomingHolidays.length > 0) {
                        // Get all active employees
                        var allEmployees = [];
                        try {
                            allEmployees = $app.findRecordsByFilter(
                                "users",
                                "organization_id = {:orgId} && status = 'ACTIVE'",
                                { orgId: orgId }
                            );
                        } catch (e) {}

                        for (var ui = 0; ui < upcomingHolidays.length; ui++) {
                            var holiday = upcomingHolidays[ui];
                            var isUrgent = holiday.daysUntil === 1;
                            var dayLabel = isUrgent ? "Tomorrow" : "in 3 Days";

                            // Check we haven't already sent this holiday notification today
                            var holidayAlreadySent = false;
                            try {
                                $app.findFirstRecordByFilter(
                                    "notifications",
                                    "organization_id = {:orgId} && type = 'SYSTEM' && title ~ {:holidayName} && created >= {:todayStr}",
                                    { orgId: orgId, holidayName: holiday.name, todayStr: todayStr + " 00:00:00" }
                                );
                                holidayAlreadySent = true;
                            } catch (e) {}

                            if (holidayAlreadySent) continue;

                            for (var ei = 0; ei < allEmployees.length; ei++) {
                                var emp = allEmployees[ei];

                                createNotification(
                                    emp.id, orgId, "SYSTEM",
                                    "Holiday " + dayLabel + ": " + holiday.name,
                                    holiday.name + " is on " + holiday.date + " (" + dayLabel.toLowerCase() + "). The office will be closed.",
                                    isUrgent ? "URGENT" : "NORMAL", "", "holiday", ""
                                );
                            }

                            // Send email only for tomorrow's holiday (to avoid noise)
                            if (isUrgent) {
                                for (var ej = 0; ej < allEmployees.length; ej++) {
                                    var empH = allEmployees[ej];
                                    sendEmail(empH.getString("email"),
                                        "Holiday Tomorrow: " + holiday.name + " — " + holiday.date,
                                        "<h2>Holiday Reminder</h2>" +
                                        "<p>Dear " + empH.getString("name") + ",</p>" +
                                        "<p>This is a reminder that <strong>tomorrow (" + holiday.date + ")</strong> is a holiday:</p>" +
                                        "<p style='font-size:18px;font-weight:bold;color:#3b82f6;'>" + holiday.name + "</p>" +
                                        "<p>The office will be closed. No attendance is required.</p>" +
                                        "<p>Enjoy your holiday!</p>"
                                    );
                                }
                            }

                            console.log("[ATTEND-NOTIF] Holiday notification (" + dayLabel + ") sent for: " + holiday.name + " (org: " + orgName + ")");
                        }
                    }
                } catch (err) {
                    console.log("[ATTEND-NOTIF] Holiday notification error for org " + orgName + ": " + err.toString());
                }
            }
        }
    } catch (err) {
        console.log("[ATTEND-NOTIF] Fatal error in attendance_reminders: " + err.toString());
    }
});


/* ============================================================
   3. AUTO-ABSENT NOTIFICATIONS
      Trigger: attendance record created with status = 'ABSENT'
      (Fired when the auto_absent_check cron in cron.pb.js creates
       an ABSENT attendance record)
      Notify: Employee (email + bell) + Line Manager (bell)
   ============================================================ */
onRecordAfterCreateSuccess((e) => {
    var record = e.record;
    var status = record.getString("status");

    if (status !== "ABSENT") return;

    var empId = record.getString("employee_id");
    var empName = record.getString("employee_name");
    var orgId = record.getString("organization_id");
    var date = formatDate(record.getString("date"));
    var remarks = record.getString("remarks") || "";

    // Only trigger for system auto-absent (not manual entries)
    if (remarks.indexOf("Auto-Absent") === -1) return;

    if (!orgId || !isAttendanceNotifEnabled(orgId)) return;

    console.log("[ATTEND-NOTIF] Auto-absent recorded: " + empName + " on " + date);

    try {
        var emp = $app.findRecordById("users", empId);
        var empEmail = emp.getString("email");
        var managerId = emp.getString("line_manager_id") || "";

        // ── Notify Employee (email + bell) ──
        createNotification(
            empId, orgId, "ATTENDANCE",
            "Marked Absent: " + date,
            "You were marked absent on " + date + " as no attendance was recorded. If this is incorrect, please contact HR.",
            "URGENT", record.id, "attendance", "attendance"
        );

        sendEmail(empEmail,
            "Attendance Alert: Marked Absent on " + date,
            "<h2>Absent Notification</h2>" +
            "<p>Dear " + empName + ",</p>" +
            "<p>You have been <strong style='color:#ef4444;'>marked absent</strong> on <strong>" + date + "</strong> as no check-in was recorded.</p>" +
            "<p>If you believe this is an error, please contact your manager or HR department to correct your attendance record.</p>" +
            "<p style='color:#6b7280;font-size:13px;'>This is an automated notification from OpenHR.</p>"
        );

        // ── Notify Line Manager (bell only) ──
        if (managerId) {
            try {
                createNotification(
                    managerId, orgId, "ATTENDANCE",
                    empName + " marked absent",
                    empName + " was marked absent on " + date + " (no check-in recorded).",
                    "NORMAL", record.id, "attendance", "attendance"
                );
            } catch (err) {}
        }

        console.log("[ATTEND-NOTIF] Auto-absent notifications sent for: " + empName);

    } catch (err) {
        console.log("[ATTEND-NOTIF] Error in auto-absent hook: " + err.toString());
    }
}, "attendance");


console.log("[HOOKS] Attendance Notifications loaded successfully.");
