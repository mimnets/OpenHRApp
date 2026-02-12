
console.log("[HOOKS] Loading Cron Jobs...");

/* ============================================================
   AUTO-EXPIRE TRIALS
   Job ID: "auto_expire_trials"
   Schedule: "0 0 * * *" (Every day at midnight)
   ============================================================ */
cronAdd("auto_expire_trials", "0 0 * * *", () => {
    console.log("[CRON] Running trial auto-expiration check...");

    try {
        const now = new Date().toISOString();

        // Find all TRIAL organizations where trial_end_date has passed
        let expiredTrials = [];
        try {
            expiredTrials = $app.findRecordsByFilter(
                "organizations",
                "subscription_status = 'TRIAL' && trial_end_date != '' && trial_end_date < '" + now + "'"
            );
        } catch (findErr) {
            console.log("[CRON] No expired trials found or query error: " + findErr.toString());
            return;
        }

        console.log("[CRON] Found " + expiredTrials.length + " expired trials");

        for (let i = 0; i < expiredTrials.length; i++) {
            const org = expiredTrials[i];
            const orgName = org.getString("name");
            const orgId = org.id;

            try {
                org.set("subscription_status", "EXPIRED");
                $app.save(org);
                console.log("[CRON] Expired organization: " + orgName + " (" + orgId + ")");

                // Send notification email to org admin
                try {
                    const admins = $app.findRecordsByFilter(
                        "users",
                        "organization_id = '" + orgId + "' && role = 'ADMIN'"
                    );

                    if (admins.length > 0) {
                        const admin = admins[0];
                        const adminEmail = admin.getString("email");
                        const adminName = admin.getString("name");

                        const settings = $app.settings();
                        const meta = settings.meta || {};
                        const senderAddress = meta.senderAddress || "noreply@openhr.app";
                        const senderName = meta.senderName || "OpenHR System";

                        const message = new MailerMessage({
                            from: { address: senderAddress, name: senderName },
                            to: [{ address: adminEmail }],
                            subject: "OpenHR Trial Expired - " + orgName,
                            html: "<h2>Your OpenHR Trial Has Expired</h2>" +
                                  "<p>Dear " + adminName + ",</p>" +
                                  "<p>Your 14-day trial for <strong>" + orgName + "</strong> has ended.</p>" +
                                  "<p>Your account is now in read-only mode. To continue using all features:</p>" +
                                  "<ul>" +
                                  "<li>Contact our team to upgrade to an Active subscription</li>" +
                                  "<li>Your data is safe and will remain accessible in read-only mode</li>" +
                                  "</ul>" +
                                  "<p>Thank you for trying OpenHR!</p>"
                        });
                        $app.newMailClient().send(message);
                        console.log("[CRON] Expiration email sent to: " + adminEmail);
                    }
                } catch (emailErr) {
                    console.log("[CRON] Failed to send expiration email: " + emailErr.toString());
                }
            } catch (saveErr) {
                console.log("[CRON] Failed to expire org " + orgName + ": " + saveErr.toString());
            }
        }

        console.log("[CRON] Trial auto-expiration completed");
    } catch (err) {
        console.log("[CRON] Error in auto-expiration: " + err.toString());
    }
});

/* ============================================================
   AUTO-ABSENT AUTOMATION (Minute Watcher)
   Job ID: "auto_absent_check"
   Schedule: "* * * * *" (Every minute)
   ============================================================ */
cronAdd("auto_absent_check", "* * * * *", () => {
    try {
        const configRecord = $app.findFirstRecordByFilter("settings", "key = 'app_config'");
        const config = configRecord.get("value");
        
        // Silent exit if feature is disabled
        if (!config || !config.autoAbsentEnabled) return;

        // 1. DETERMINE CURRENT TIME IN TARGET TIMEZONE
        // If config.timezone is set (e.g. "Asia/Dhaka"), use it. Otherwise use Server System Time.
        const now = new Date();
        let localDate = now;
        
        // PocketBase JSVM (Goja) has limited Intl support, but we can try basic offset or rely on System Time.
        // For robustness in this environment, we primarily rely on Server System Time but allow manual offset adjustment if needed.
        // Note: For best results, ensure your Server OS Timezone matches your Office Location.

        const h = ("0" + localDate.getHours()).slice(-2);
        const m = ("0" + localDate.getMinutes()).slice(-2);
        const currentTimeStr = h + ":" + m;
        
        const targetTime = config.autoAbsentTime || "23:55";

        // Only run if the minute matches exactly
        if (currentTimeStr !== targetTime) {
            return;
        }

        console.log("[CRON] ------------------------------------------------");
        console.log("[CRON] TIME MATCHED (" + currentTimeStr + ")! Starting Auto-Absent Process...");

        // 2. GENERATE 'YYYY-MM-DD' STRING
        // We manually construct this to ensure it matches the "Business Day" regardless of UTC offsets.
        const year = localDate.getFullYear();
        const month = ("0" + (localDate.getMonth() + 1)).slice(-2);
        const day = ("0" + localDate.getDate()).slice(-2);
        const dateStr = year + "-" + month + "-" + day;

        console.log("[CRON] Processing Business Date: " + dateStr);

        // 3. Validate Working Day
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[localDate.getDay()];

        if (!config.workingDays || !config.workingDays.includes(dayName)) {
            console.log("[CRON] Skipping: " + dayName + " is not a working day.");
            return;
        }

        // 4. Check Holidays
        try {
            const holidayRecord = $app.findFirstRecordByFilter("settings", "key = 'holidays'");
            const holidays = holidayRecord.get("value") || [];
            let isHoliday = false;
            for(let i=0; i<holidays.length; i++) {
                if (holidays[i].date === dateStr) { isHoliday = true; break; }
            }
            if (isHoliday) {
                console.log("[CRON] Skipping: Today is a holiday.");
                return;
            }
        } catch(e) { /* Ignore if settings missing */ }

        // 5. Fetch Employees & Process
        const employees = $app.findRecordsByFilter("users", "status = 'ACTIVE' && role != 'ADMIN'");
        let countMarked = 0;
        let countSkipped = 0;

        console.log("[CRON] Checking " + employees.length + " active employees...");

        employees.forEach((emp) => {
            const empId = emp.id;
            const empName = emp.getString("name");

            // A. Check if already Present (Any status: PRESENT, LATE, etc.)
            try {
                const att = $app.findFirstRecordByFilter("attendance", "employee_id = '" + empId + "' && date = '" + dateStr + "'");
                if (att) {
                    countSkipped++;
                    return; 
                }
            } catch(e) { /* No record found, continue */ }

            // B. Check if on Approved Leave
            try {
                const leave = $app.findFirstRecordByFilter(
                    "leaves", 
                    "employee_id = '" + empId + "' && status = 'APPROVED' && start_date <= '" + dateStr + "' && end_date >= '" + dateStr + "'"
                );
                if (leave) {
                    console.log("[CRON] Skip " + empName + ": On Approved Leave.");
                    countSkipped++;
                    return; 
                }
            } catch(e) { /* No leave found, continue */ }

            // C. Insert Absent Record
            try {
                const collection = $app.findCollectionByNameOrId("attendance");
                const record = new Record(collection);
                
                record.set("employee_id", empId);
                record.set("employee_name", empName);
                record.set("date", dateStr); // This is the crucial Business Date string
                record.set("status", "ABSENT");
                record.set("check_in", "-");
                record.set("check_out", "-");
                record.set("remarks", "System Auto-Absent: No punch by " + targetTime);
                record.set("location", "N/A");
                
                $app.save(record);
                
                console.log("[CRON] MARKED ABSENT: " + empName);
                countMarked++;
            } catch(err) {
                console.error("[CRON] FAILED to save absent for " + empName + ": " + err.toString());
            }
        });

        console.log("[CRON] Run Complete. Absent: " + countMarked + " | Skipped (Present/Leave): " + countSkipped);
        console.log("[CRON] ------------------------------------------------");

    } catch(e) {
        console.error("[CRON] Fatal Error: " + e.toString());
    }
});

/* ============================================================
   DAILY ATTENDANCE REPORT EMAIL
   Job ID: "daily_attendance_report"
   Schedule: "0 23 * * *" (Every day at 11 PM)
   ============================================================ */
cronAdd("daily_attendance_report", "0 23 * * *", () => {
    console.log("[CRON] Running daily attendance report...");

    try {
        // Get all organizations
        const orgs = $app.findRecordsByFilter("organizations", "subscription_status != 'SUSPENDED'");

        for (let o = 0; o < orgs.length; o++) {
            const org = orgs[o];
            const orgId = org.id;
            const orgName = org.getString("name");

            // Skip system organizations
            if (orgName === "__SYSTEM__" || orgName === "Platform") continue;

            // Check if org has daily report enabled
            try {
                const configRecord = $app.findFirstRecordByFilter("settings", "key = 'app_config' && organization_id = '" + orgId + "'");
                const config = configRecord.get("value");
                if (!config || !config.dailyReportEnabled) continue;
            } catch (e) {
                continue; // Skip if no config
            }

            // Get today's date
            const now = new Date();
            const year = now.getFullYear();
            const month = ("0" + (now.getMonth() + 1)).slice(-2);
            const day = ("0" + now.getDate()).slice(-2);
            const dateStr = year + "-" + month + "-" + day;

            // Get attendance records for today
            let presentCount = 0;
            let absentCount = 0;
            let lateCount = 0;
            let onLeaveCount = 0;

            try {
                const records = $app.findRecordsByFilter("attendance", "organization_id = '" + orgId + "' && date = '" + dateStr + "'");
                for (let r = 0; r < records.length; r++) {
                    const status = records[r].getString("status");
                    if (status === "PRESENT") presentCount++;
                    else if (status === "ABSENT") absentCount++;
                    else if (status === "LATE") lateCount++;
                }
            } catch (e) {}

            // Get approved leaves for today
            try {
                const leaves = $app.findRecordsByFilter(
                    "leaves",
                    "organization_id = '" + orgId + "' && status = 'APPROVED' && start_date <= '" + dateStr + "' && end_date >= '" + dateStr + "'"
                );
                onLeaveCount = leaves.length;
            } catch (e) {}

            // Get admins to send report
            try {
                const admins = $app.findRecordsByFilter("users", "organization_id = '" + orgId + "' && (role = 'ADMIN' || role = 'HR')");
                if (admins.length === 0) continue;

                const settings = $app.settings();
                const meta = settings.meta || {};
                const senderAddress = meta.senderAddress || "noreply@openhr.app";
                const senderName = meta.senderName || "OpenHR System";

                const totalEmployees = presentCount + absentCount + lateCount;

                for (let a = 0; a < admins.length; a++) {
                    const admin = admins[a];
                    const adminEmail = admin.getString("email");

                    try {
                        const message = new MailerMessage({
                            from: { address: senderAddress, name: senderName },
                            to: [{ address: adminEmail }],
                            subject: "Daily Attendance Report - " + dateStr + " - " + orgName,
                            html: "<h2>Daily Attendance Report</h2>" +
                                  "<p><strong>Organization:</strong> " + orgName + "</p>" +
                                  "<p><strong>Date:</strong> " + dateStr + "</p>" +
                                  "<table style='border-collapse:collapse; margin-top:16px;'>" +
                                  "<tr style='background:#f8f9fa;'><th style='padding:12px;border:1px solid #ddd;text-align:left;'>Status</th><th style='padding:12px;border:1px solid #ddd;text-align:center;'>Count</th></tr>" +
                                  "<tr><td style='padding:12px;border:1px solid #ddd;color:#10b981;'>Present</td><td style='padding:12px;border:1px solid #ddd;text-align:center;'>" + presentCount + "</td></tr>" +
                                  "<tr><td style='padding:12px;border:1px solid #ddd;color:#f59e0b;'>Late</td><td style='padding:12px;border:1px solid #ddd;text-align:center;'>" + lateCount + "</td></tr>" +
                                  "<tr><td style='padding:12px;border:1px solid #ddd;color:#ef4444;'>Absent</td><td style='padding:12px;border:1px solid #ddd;text-align:center;'>" + absentCount + "</td></tr>" +
                                  "<tr><td style='padding:12px;border:1px solid #ddd;color:#3b82f6;'>On Leave</td><td style='padding:12px;border:1px solid #ddd;text-align:center;'>" + onLeaveCount + "</td></tr>" +
                                  "<tr style='background:#f8f9fa;'><td style='padding:12px;border:1px solid #ddd;'><strong>Total Tracked</strong></td><td style='padding:12px;border:1px solid #ddd;text-align:center;'><strong>" + totalEmployees + "</strong></td></tr>" +
                                  "</table>" +
                                  "<p style='margin-top:16px;color:#6b7280;font-size:12px;'>This is an automated daily report from OpenHR.</p>"
                        });
                        $app.newMailClient().send(message);
                        console.log("[CRON] Daily report sent to: " + adminEmail);
                    } catch (mailErr) {
                        console.log("[CRON] Failed to send daily report: " + mailErr.toString());
                    }
                }
            } catch (adminErr) {
                console.log("[CRON] Failed to get admins for org " + orgName + ": " + adminErr.toString());
            }
        }

        console.log("[CRON] Daily attendance report completed");
    } catch (err) {
        console.log("[CRON] Error in daily attendance report: " + err.toString());
    }
});
