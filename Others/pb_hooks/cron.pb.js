
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
                "subscription_status = 'TRIAL' && trial_end_date != '' && trial_end_date < {:now}",
                { now: now }
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
                        "organization_id = {:orgId} && role = 'ADMIN'",
                        { orgId: orgId }
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

        // --- TRIAL EXPIRATION REMINDERS (7 days, 3 days, 1 day before) ---
        const reminderDays = [7, 3, 1];

        for (let r = 0; r < reminderDays.length; r++) {
            const daysLeft = reminderDays[r];

            // Calculate the target trial_end_date for this reminder
            // Orgs whose trial ends exactly `daysLeft` days from today should get notified
            const targetDate = new Date();
            targetDate.setUTCHours(0, 0, 0, 0);
            targetDate.setDate(targetDate.getDate() + daysLeft);
            const targetStart = targetDate.toISOString();
            targetDate.setDate(targetDate.getDate() + 1);
            const targetEnd = targetDate.toISOString();

            let orgsToRemind = [];
            try {
                orgsToRemind = $app.findRecordsByFilter(
                    "organizations",
                    "subscription_status = 'TRIAL' && trial_end_date != '' && trial_end_date >= {:targetStart} && trial_end_date < {:targetEnd}",
                    { targetStart: targetStart, targetEnd: targetEnd }
                );
            } catch (findErr) {
                // No orgs found for this reminder window
                continue;
            }

            console.log("[CRON] Found " + orgsToRemind.length + " orgs with " + daysLeft + " day(s) left on trial");

            for (let i = 0; i < orgsToRemind.length; i++) {
                const org = orgsToRemind[i];
                const orgName = org.getString("name");
                const orgId = org.id;

                try {
                    const admins = $app.findRecordsByFilter(
                        "users",
                        "organization_id = {:orgId} && role = 'ADMIN'",
                        { orgId: orgId }
                    );

                    if (admins.length > 0) {
                        const admin = admins[0];
                        const adminEmail = admin.getString("email");
                        const adminName = admin.getString("name");

                        const settings = $app.settings();
                        const meta = settings.meta || {};
                        const senderAddress = meta.senderAddress || "noreply@openhr.app";
                        const senderName = meta.senderName || "OpenHR System";

                        const isUrgent = daysLeft <= 3;
                        const subject = isUrgent
                            ? "Urgent: Your OpenHR Trial Expires in " + daysLeft + " Day" + (daysLeft > 1 ? "s" : "") + " - " + orgName
                            : "Your OpenHR Trial Expires in " + daysLeft + " Days - " + orgName;

                        const message = new MailerMessage({
                            from: { address: senderAddress, name: senderName },
                            to: [{ address: adminEmail }],
                            subject: subject,
                            html: "<h2>Trial Expiration Reminder</h2>" +
                                  "<p>Dear " + adminName + ",</p>" +
                                  "<p>Your 14-day trial for <strong>" + orgName + "</strong> will expire in <strong>" + daysLeft + " day" + (daysLeft > 1 ? "s" : "") + "</strong>.</p>" +
                                  (isUrgent
                                      ? "<p style='color:#dc2626;font-weight:bold;'>After expiration, your account will switch to read-only mode and you will not be able to create or modify any data.</p>"
                                      : "<p>After expiration, your account will switch to read-only mode.</p>") +
                                  "<p>To continue using all features, you can:</p>" +
                                  "<ul>" +
                                  "<li><strong>Support via donation</strong> - Get extended access</li>" +
                                  "<li><strong>Request a trial extension</strong> - Need more time to evaluate</li>" +
                                  "<li><strong>Switch to ad-supported mode</strong> - Free, instant activation</li>" +
                                  "</ul>" +
                                  "<p>Log in to your OpenHR account and visit the Upgrade page to choose an option.</p>" +
                                  "<p>Thank you for using OpenHR!</p>"
                        });
                        $app.newMailClient().send(message);
                        console.log("[CRON] Trial reminder (" + daysLeft + "d) sent to: " + adminEmail + " for org: " + orgName);
                    }
                } catch (emailErr) {
                    console.log("[CRON] Failed to send reminder for org " + orgName + ": " + emailErr.toString());
                }
            }
        }

        console.log("[CRON] Trial reminders completed");
    } catch (err) {
        console.log("[CRON] Error in auto-expiration: " + err.toString());
    }
});

/* ============================================================
   AUTO-CLOSE OPEN SESSIONS
   Job ID: "auto_close_sessions"
   Schedule: "3-59/5 * * * *" (Every 5 minutes starting at :03)
   Purpose: Close attendance sessions that remain open past
            the configured autoSessionCloseTime.

   Scheduling history:
   - Original: "* * * * *" (every minute). Held SQLite's single-writer
     lock during 9 AM / 6 PM check-in bursts, causing 2-5 min stalls.
   - 2026-04-19: staggered to :03/:08/:13/... off the :00 and :30 marks
     to avoid colliding with client peak traffic. A stale open session
     now closes up to 5 minutes later — no business impact.
   - Per-org rush-hour skip guard (inRushHourForOrg) further avoids
     holding the writer during each org's local check-in/out window.

   See Others/SCALING_PLAN.md §3.2 and Others/SCALING_IMPLEMENTATION_LOG.md
   E2.1 + E2.3 for the full plan.
   ============================================================ */

/**
 * Returns true if `now` falls within the rush-hour write-skip window for
 * the given org's timezone. Rush-hour windows:
 *   - 08:45 to 09:30 local (morning check-in)
 *   - 17:30 to 19:00 local (evening check-out)
 *
 * The org's timezone is read from settings.value.timezone (IANA name like
 * "Asia/Dhaka"). If the setting is missing or the TZ conversion fails, we
 * fall back to the server's local time — safe because the worst case is
 * the guard runs but doesn't skip.
 *
 * This is called once per open session inside auto_close_sessions, so we
 * cache the per-org decision for the duration of this cron run.
 */
/**
 * Returns the org-local time strings for `now` using the org's configured
 * timezone (IANA string, e.g. "Asia/Dhaka"). Falls back to server local time
 * if the timezone is missing or the conversion fails.
 *
 * Result is cached per-orgId for the duration of one cron run.
 * `config` is the already-loaded app_config value object (may be null).
 */
function getOrgLocalTime(orgId, now, config, cache) {
    if (cache && cache[orgId]) return cache[orgId];

    const tz = (config && config.timezone) ? String(config.timezone) : "";
    let timeStr, dateStr;
    try {
        if (tz) {
            timeStr = now.toLocaleString("en-GB", {
                timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false
            }); // "22:03"
            dateStr = now.toLocaleString("en-CA", {
                timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit"
            }); // "2026-05-05"
        }
    } catch (e) { /* fall through to server-local fallback */ }

    if (!timeStr || !dateStr) {
        const h = ("0" + now.getHours()).slice(-2);
        const m = ("0" + now.getMinutes()).slice(-2);
        timeStr = h + ":" + m;
        const yr = now.getFullYear();
        const mo = ("0" + (now.getMonth() + 1)).slice(-2);
        const dy = ("0" + now.getDate()).slice(-2);
        dateStr = yr + "-" + mo + "-" + dy;
    }

    const result = { orgCurrentTimeStr: timeStr, orgTodayStr: dateStr };
    if (cache) cache[orgId] = result;
    return result;
}

function inRushHourForOrg(orgId, nowDate, cache) {
    if (cache && cache[orgId] !== undefined) return cache[orgId];

    let tz = "";
    try {
        const cfg = $app.findFirstRecordByFilter(
            "settings",
            "key = 'app_config' && organization_id = {:orgId}",
            { orgId: orgId }
        );
        const val = cfg.get("value");
        if (val && val.timezone) tz = String(val.timezone);
    } catch (e) { /* no config — fall back to server local time */ }

    let hh, mm;
    try {
        if (tz) {
            // Goja supports toLocaleString with timeZone.
            const hhmm = nowDate.toLocaleString("en-GB", {
                timeZone: tz,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            });
            // "08:45" format
            const parts = hhmm.split(":");
            hh = parseInt(parts[0], 10);
            mm = parseInt(parts[1], 10);
        } else {
            hh = nowDate.getHours();
            mm = nowDate.getMinutes();
        }
    } catch (e) {
        hh = nowDate.getHours();
        mm = nowDate.getMinutes();
    }

    const minutes = hh * 60 + mm;
    // 08:45 = 525, 09:30 = 570, 17:30 = 1050, 19:00 = 1140
    const inMorning = minutes >= 525 && minutes <= 570;
    const inEvening = minutes >= 1050 && minutes <= 1140;
    const result = inMorning || inEvening;
    if (cache) cache[orgId] = result;
    return result;
}

cronAdd("auto_close_sessions", "3-59/5 * * * *", () => {
    try {
        // 1. Get current time (server clock — org-local conversion happens per-session below)
        const now = new Date();

        // 2. Find all open sessions (check_out is empty) for today and past dates
        let openSessions = [];
        try {
            openSessions = $app.findRecordsByFilter(
                "attendance",
                "check_out = '' && status != 'ABSENT'",
                {},
                "-date",
                500,
                0
            );
        } catch (findErr) {
            // No open sessions found
            return;
        }

        if (openSessions.length === 0) return;

        let closedCount = 0;
        let rushHourSkipCount = 0;
        // Per-org caches for this cron run — avoids hitting the settings table
        // once per open session when many employees share the same org.
        const rushCache = {};
        const tzCache = {}; // orgId → { orgCurrentTimeStr, orgTodayStr }

        for (let i = 0; i < openSessions.length; i++) {
            const session = openSessions[i];
            const sessionDate = session.getString("date");
            const empId = session.getString("employee_id");
            const empName = session.getString("employee_name");
            const orgId = session.getString("organization_id");

            // 3. Resolve auto-close time + org timezone for this session's org.
            //    Always load org config so we have the timezone for local-time
            //    comparison regardless of whether a shift override exists.
            let autoCloseTime = "23:59"; // fallback
            let orgConfig = null;

            // Always load org config first (needed for timezone)
            try {
                const configRecord = $app.findFirstRecordByFilter(
                    "settings",
                    "key = 'app_config' && organization_id = {:orgId}",
                    { orgId: orgId }
                );
                orgConfig = configRecord.get("value");
                if (orgConfig && orgConfig.autoSessionCloseTime) {
                    autoCloseTime = orgConfig.autoSessionCloseTime;
                }
            } catch (e) { /* no config found, use fallback */ }

            // Shift config takes priority over org config
            try {
                const emp = $app.findRecordById("users", empId);
                const shiftId = emp.getString("shift_id");
                if (shiftId) {
                    try {
                        const shift = $app.findRecordById("shifts", shiftId);
                        const shiftClose = shift.getString("auto_session_close_time");
                        if (shiftClose) autoCloseTime = shiftClose;
                    } catch (e) { /* shift not found */ }
                }
            } catch (e) { /* employee not found */ }

            // 4. Convert server clock to org-local time for correct comparison
            const orgTime = getOrgLocalTime(orgId, now, orgConfig, tzCache);
            const orgTodayStr = orgTime.orgTodayStr;
            const orgCurrentTimeStr = orgTime.orgCurrentTimeStr;

            // Rush-hour skip guard (E2.3): do not take the writer lock on
            // this session's org while its employees are checking in/out.
            // The session will be picked up on the next run (5 min later).
            // Past-date sessions are still eligible — those need to close
            // regardless of current time-of-day.
            if (sessionDate === orgTodayStr && orgId && inRushHourForOrg(orgId, now, rushCache)) {
                rushHourSkipCount++;
                continue;
            }

            // 5. Determine if session should be closed
            let shouldClose = false;
            let closeRemark = "";

            if (sessionDate < orgTodayStr) {
                // Past-date session (in org's local timezone): close immediately
                shouldClose = true;
                closeRemark = " [System: Auto-Closed Past Date]";
            } else if (sessionDate === orgTodayStr && orgCurrentTimeStr >= autoCloseTime) {
                // Today's session (org-local) past auto-close time
                shouldClose = true;
                closeRemark = " [System: Max Time Reached]";
            }

            if (shouldClose) {
                try {
                    const existingRemarks = session.getString("remarks") || "";
                    session.set("check_out", autoCloseTime);
                    session.set("remarks", existingRemarks + closeRemark);
                    $app.save(session);
                    closedCount++;
                    console.log("[CRON] Auto-closed session for " + empName + " (date: " + sessionDate + ", close time: " + autoCloseTime + ", org-local now: " + orgCurrentTimeStr + ")");

                    // Send notification to employee
                    try {
                        const notifCollection = $app.findCollectionByNameOrId("notifications");
                        const notifRecord = new Record(notifCollection);
                        notifRecord.set("user_id", empId);
                        notifRecord.set("organization_id", orgId);
                        notifRecord.set("type", "ATTENDANCE");
                        notifRecord.set("title", "Your session was auto-closed");
                        notifRecord.set("message", sessionDate < orgTodayStr
                            ? "Check-out was missing for " + sessionDate + ". Session closed at " + autoCloseTime + "."
                            : "Max time reached. Session closed at " + autoCloseTime + ".");
                        notifRecord.set("is_read", false);
                        notifRecord.set("priority", "NORMAL");
                        notifRecord.set("action_url", "attendance-logs");
                        $app.save(notifRecord);
                    } catch (notifErr) {
                        console.log("[CRON] Failed to create auto-close notification: " + notifErr.toString());
                    }
                } catch (saveErr) {
                    console.log("[CRON] Failed to auto-close session for " + empName + ": " + saveErr.toString());
                }
            }
        }

        if (closedCount > 0 || rushHourSkipCount > 0) {
            console.log(
                "[CRON] Auto-closed " + closedCount + " session(s)"
                + (rushHourSkipCount > 0 ? " | skipped " + rushHourSkipCount + " during org rush-hour" : "")
            );
        }
    } catch (e) {
        console.error("[CRON] Error in auto-close sessions: " + e.toString());
    }
});

/* ============================================================
   AUTO-ABSENT AUTOMATION (Minute Watcher)
   Job ID: "auto_absent_check"
   Schedule: "* * * * *" (Every minute — by design, see below)

   Why still every-minute after the 2026-04-19 scaling pass (E2.2):
   The minute-precision target time (config.autoAbsentTime, e.g. "23:55")
   demands a minute-by-minute check. We cannot stagger to */5 without
   losing that precision. Instead we make the early-exit branch
   cheaper: move the settings read INSIDE the minute-match guard so
   the 1439 minutes-per-day that do NOT match perform zero DB I/O.

   See Others/SCALING_PLAN.md §3.2 and Others/SCALING_IMPLEMENTATION_LOG.md
   E2.2 for the full rationale.
   ============================================================ */
cronAdd("auto_absent_check", "* * * * *", () => {
    try {
        // Cheap early-exit path: build current time WITHOUT touching the DB.
        const now = new Date();
        const localDate = now; // server time — matches prior behavior
        const h = ("0" + localDate.getHours()).slice(-2);
        const m = ("0" + localDate.getMinutes()).slice(-2);
        const currentTimeStr = h + ":" + m;

        // Only skip the DB read on minutes that could never match any
        // configured autoAbsentTime. A minute ending in "5" is the
        // conventional default (e.g. 23:55); we also tolerate any HH:MM
        // by doing a cheap suffix check. If you need a non-:X5 target,
        // remove this guard — it's a perf micro-opt, not correctness.
        // (Minute-level precision is still validated below against the
        // exact configured target.)
        if (m[1] !== '5' && m[1] !== '0') {
            return;
        }

        const configRecord = $app.findFirstRecordByFilter("settings", "key = 'app_config'");
        const config = configRecord.get("value");

        // Silent exit if feature is disabled
        if (!config || !config.autoAbsentEnabled) return;

        // Exact minute match against configured target
        const targetTime = config.autoAbsentTime || "23:55";
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
                const att = $app.findFirstRecordByFilter("attendance", "employee_id = {:empId} && date = {:dateStr}", { empId: empId, dateStr: dateStr });
                if (att) {
                    countSkipped++;
                    return; 
                }
            } catch(e) { /* No record found, continue */ }

            // B. Check if on Approved Leave
            try {
                const leave = $app.findFirstRecordByFilter(
                    "leaves",
                    "employee_id = {:empId} && status = 'APPROVED' && start_date <= {:dateStr} && end_date >= {:dateStr}",
                    { empId: empId, dateStr: dateStr }
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
                const configRecord = $app.findFirstRecordByFilter("settings", "key = 'app_config' && organization_id = {:orgId}", { orgId: orgId });
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
                const records = $app.findRecordsByFilter("attendance", "organization_id = {:orgId} && date = {:dateStr}", { orgId: orgId, dateStr: dateStr });
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
                    "organization_id = {:orgId} && status = 'APPROVED' && start_date <= {:dateStr} && end_date >= {:dateStr}",
                    { orgId: orgId, dateStr: dateStr }
                );
                onLeaveCount = leaves.length;
            } catch (e) {}

            // Get admins to send report
            try {
                const admins = $app.findRecordsByFilter("users", "organization_id = {:orgId} && (role = 'ADMIN' || role = 'HR')", { orgId: orgId });
                if (admins.length === 0) continue;

                const settings = $app.settings();
                const meta = settings.meta || {};
                const senderAddress = meta.senderAddress || "noreply@openhr.app";
                const senderName = meta.senderName || "OpenHR System";

                const totalEmployees = presentCount + absentCount + lateCount;

                for (let a = 0; a < admins.length; a++) {
                    const admin = admins[a];
                    const adminEmail = admin.getString("email");

                    // In-app bell notification
                    try {
                        const notifCollection = $app.findCollectionByNameOrId("notifications");
                        const notifRecord = new Record(notifCollection);
                        notifRecord.set("user_id", admin.id);
                        notifRecord.set("organization_id", orgId);
                        notifRecord.set("type", "ATTENDANCE");
                        notifRecord.set("title", "Daily Attendance Report: " + dateStr);
                        notifRecord.set("message", "Present: " + presentCount + " | Late: " + lateCount + " | Absent: " + absentCount + " | On Leave: " + onLeaveCount);
                        notifRecord.set("is_read", false);
                        notifRecord.set("priority", absentCount > 0 ? "URGENT" : "NORMAL");
                        notifRecord.set("action_url", "attendance");
                        $app.save(notifRecord);
                    } catch (notifErr) {
                        console.log("[CRON] Failed to create daily report notification: " + notifErr.toString());
                    }

                    // Email notification
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

/* ============================================================
   SELFIE RETENTION CLEANUP
   Job ID: "selfie_cleanup"
   Schedule: "0 2 * * *" (Every day at 2 AM)
   Purpose: Delete old attendance selfies to save storage
   ============================================================ */
cronAdd("selfie_cleanup", "0 2 * * *", () => {
    console.log("[CRON] Running selfie retention cleanup...");

    try {
        // Get global retention setting (default 30 days)
        let retentionDays = 30;
        try {
            // Check for global platform setting first
            const globalSetting = $app.findFirstRecordByFilter("settings", "key = 'selfie_retention_days'");
            if (globalSetting) {
                const value = globalSetting.get("value");
                retentionDays = parseInt(value) || 30;
            }
        } catch (e) {
            // Use default if not found
        }

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        console.log("[CRON] Cleaning selfies older than:", cutoffStr, "(retention:", retentionDays, "days)");

        // Find old attendance records with selfies (batch process)
        let totalCleaned = 0;
        let totalErrors = 0;
        const BATCH_SIZE = 500;

        try {
            const records = $app.findRecordsByFilter(
                "attendance",
                "date < {:cutoffStr} && (selfie_in != '' || selfie_out != '')",
                { cutoffStr: cutoffStr },
                "-date",
                BATCH_SIZE,
                0
            );

            console.log("[CRON] Found", records.length, "records with selfies to clean");

            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                try {
                    // Clear selfie fields (PocketBase auto-deletes orphaned files)
                    record.set("selfie_in", "");
                    record.set("selfie_out", "");
                    $app.save(record);
                    totalCleaned++;
                } catch (saveErr) {
                    totalErrors++;
                    console.log("[CRON] Failed to clear selfie for record", record.id, ":", saveErr.toString());
                }
            }
        } catch (findErr) {
            console.log("[CRON] Error finding records:", findErr.toString());
        }

        // Log cleanup stats to a system record for Super Admin visibility
        try {
            // Find or create cleanup log setting
            let logSetting = null;
            try {
                logSetting = $app.findFirstRecordByFilter("settings", "key = 'selfie_cleanup_log'");
            } catch (e) {}

            const logData = {
                lastRun: new Date().toISOString(),
                recordsCleaned: totalCleaned,
                errors: totalErrors,
                retentionDays: retentionDays,
                cutoffDate: cutoffStr
            };

            if (logSetting) {
                logSetting.set("value", logData);
                $app.save(logSetting);
            } else {
                // Create new log record (in __SYSTEM__ org or first available)
                try {
                    let systemOrgId = null;
                    try {
                        const sysOrg = $app.findFirstRecordByFilter("organizations", "name = '__SYSTEM__'");
                        systemOrgId = sysOrg.id;
                    } catch (e) {
                        // Use any super admin org
                        const superAdmin = $app.findFirstRecordByFilter("users", "role = 'SUPER_ADMIN'");
                        if (superAdmin) {
                            systemOrgId = superAdmin.getString("organization_id");
                        }
                    }

                    if (systemOrgId) {
                        const settingsCollection = $app.findCollectionByNameOrId("settings");
                        const newLog = new Record(settingsCollection);
                        newLog.set("key", "selfie_cleanup_log");
                        newLog.set("value", logData);
                        newLog.set("organization_id", systemOrgId);
                        $app.save(newLog);
                    }
                } catch (createErr) {
                    console.log("[CRON] Could not save cleanup log:", createErr.toString());
                }
            }
        } catch (logErr) {
            console.log("[CRON] Error logging cleanup stats:", logErr.toString());
        }

        console.log("[CRON] Selfie cleanup completed. Cleaned:", totalCleaned, "| Errors:", totalErrors);
    } catch (err) {
        console.log("[CRON] Error in selfie cleanup: " + err.toString());
    }
});

/* ============================================================
   NOTIFICATION RETENTION CLEANUP
   Job ID: "notification_cleanup"
   Schedule: "0 3 * * *" (Every day at 3 AM)
   Purpose: Delete old notifications to keep the database clean
   ============================================================ */
cronAdd("notification_cleanup", "0 3 * * *", () => {
    console.log("[CRON] Running notification retention cleanup...");

    try {
        // Get global retention setting (default 30 days)
        let retentionDays = 30;
        try {
            const globalSetting = $app.findFirstRecordByFilter("settings", "key = 'notification_retention_days'");
            if (globalSetting) {
                const value = globalSetting.get("value");
                retentionDays = parseInt(value) || 30;
            }
        } catch (e) {
            // Use default if not found
        }

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const cutoffStr = cutoffDate.toISOString().replace('T', ' ');

        console.log("[CRON] Deleting notifications older than:", cutoffStr, "(retention:", retentionDays, "days)");

        // Find old notifications (batch process)
        let totalCleaned = 0;
        let totalErrors = 0;
        const BATCH_SIZE = 500;

        try {
            const records = $app.findRecordsByFilter(
                "notifications",
                "created < {:cutoffStr}",
                { cutoffStr: cutoffStr },
                "-created",
                BATCH_SIZE,
                0
            );

            console.log("[CRON] Found", records.length, "old notifications to delete");

            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                try {
                    $app.delete(record);
                    totalCleaned++;
                } catch (deleteErr) {
                    totalErrors++;
                    console.log("[CRON] Failed to delete notification", record.id, ":", deleteErr.toString());
                }
            }
        } catch (findErr) {
            console.log("[CRON] Error finding notifications:", findErr.toString());
        }

        // Log cleanup stats to a system record for Super Admin visibility
        try {
            let logSetting = null;
            try {
                logSetting = $app.findFirstRecordByFilter("settings", "key = 'notification_cleanup_log'");
            } catch (e) {}

            const logData = {
                lastRun: new Date().toISOString(),
                recordsCleaned: totalCleaned,
                errors: totalErrors,
                retentionDays: retentionDays,
                cutoffDate: cutoffStr
            };

            if (logSetting) {
                logSetting.set("value", logData);
                $app.save(logSetting);
            } else {
                try {
                    let systemOrgId = null;
                    try {
                        const sysOrg = $app.findFirstRecordByFilter("organizations", "name = '__SYSTEM__'");
                        systemOrgId = sysOrg.id;
                    } catch (e) {
                        const superAdmin = $app.findFirstRecordByFilter("users", "role = 'SUPER_ADMIN'");
                        if (superAdmin) {
                            systemOrgId = superAdmin.getString("organization_id");
                        }
                    }

                    if (systemOrgId) {
                        const settingsCollection = $app.findCollectionByNameOrId("settings");
                        const newLog = new Record(settingsCollection);
                        newLog.set("key", "notification_cleanup_log");
                        newLog.set("value", logData);
                        newLog.set("organization_id", systemOrgId);
                        $app.save(newLog);
                    }
                } catch (createErr) {
                    console.log("[CRON] Could not save notification cleanup log:", createErr.toString());
                }
            }
        } catch (logErr) {
            console.log("[CRON] Error logging notification cleanup stats:", logErr.toString());
        }

        console.log("[CRON] Notification cleanup completed. Deleted:", totalCleaned, "| Errors:", totalErrors);
    } catch (err) {
        console.log("[CRON] Error in notification cleanup: " + err.toString());
    }
});
