// pb_hooks/review_notifications.pb.js
// Performance Review Cycle — Auto-Transition + Notifications + Email Alerts
//
// ⚠️  Each .pb.js file runs in its own isolated JS scope.
//     Functions defined in other hook files are NOT available here.

console.log("[HOOKS] Loading Review Cycle Notifications (v1.0)...");

// ────────────────────────────────────────────────────────────────
// Helper: Create an in-app notification record
// ────────────────────────────────────────────────────────────────
function createNotification(userId, orgId, type, title, message, priority, referenceId, referenceType) {
    try {
        const collection = $app.findCollectionByNameOrId("notifications");
        const record = new Record(collection);
        record.set("user_id", userId);
        record.set("organization_id", orgId);
        record.set("type", type || "REVIEW");
        record.set("title", title);
        record.set("message", message || "");
        record.set("is_read", false);
        record.set("priority", priority || "NORMAL");
        record.set("reference_id", referenceId || "");
        record.set("reference_type", referenceType || "review_cycle");
        $app.save(record);
    } catch (err) {
        console.log("[REVIEW-NOTIF] Failed to create notification for user " + userId + ": " + err.toString());
    }
}

// ────────────────────────────────────────────────────────────────
// Helper: Send an email
// ────────────────────────────────────────────────────────────────
function sendEmail(toAddress, subject, htmlBody) {
    try {
        const meta = $app.settings().meta || {};
        const senderAddress = meta.senderAddress || "noreply@openhr.app";
        const senderName = meta.senderName || "OpenHR System";

        const message = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: toAddress }],
            subject: subject,
            html: htmlBody,
        });
        $app.newMailClient().send(message);
        return true;
    } catch (err) {
        console.log("[REVIEW-NOTIF] Failed to send email to " + toAddress + ": " + err.toString());
        return false;
    }
}

// ────────────────────────────────────────────────────────────────
// Helper: Get org employees by role filter
// ────────────────────────────────────────────────────────────────
function getOrgUsers(orgId, roleFilter) {
    try {
        return $app.findRecordsByFilter(
            "users",
            "organization_id = {:orgId} && " + roleFilter,
            { orgId: orgId }
        );
    } catch (e) {
        return [];
    }
}

// ────────────────────────────────────────────────────────────────
// Helper: Format date string for display
// ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    return (dateStr || "").split(" ")[0].split("T")[0];
}

// ────────────────────────────────────────────────────────────────
// Helper: Calculate days between two date strings
// ────────────────────────────────────────────────────────────────
function daysBetween(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

/* ============================================================
   REVIEW CYCLE AUTO-TRANSITION + NOTIFICATIONS
   Job ID: "review_cycle_transition"
   Schedule: "0 0 * * *" (Every day at midnight)

   Processes all organizations:
   1. UPCOMING → OPEN   (when review_start_date is reached)
   2. OPEN → CLOSED     (when review_end_date has passed)
   3. Reminders          (3 days and 1 day before close)
   ============================================================ */
cronAdd("review_cycle_transition", "0 0 * * *", () => {
    console.log("[REVIEW-CRON] Running review cycle transition check...");

    try {
        const now = new Date();
        const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

        // ──────────────────────────────────────────────────────
        // 1. UPCOMING → OPEN
        //    Cycles whose review_start_date <= today
        // ──────────────────────────────────────────────────────
        let upcomingCycles = [];
        try {
            upcomingCycles = $app.findRecordsByFilter(
                "review_cycles",
                "status = 'UPCOMING' && review_start_date <= {:today}",
                { today: today + " 23:59:59" }
            );
        } catch (e) {
            // No matching cycles
        }

        console.log("[REVIEW-CRON] Found " + upcomingCycles.length + " UPCOMING cycles to open");

        for (let i = 0; i < upcomingCycles.length; i++) {
            const cycle = upcomingCycles[i];
            const cycleName = cycle.getString("name");
            const orgId = cycle.getString("organization_id");
            const reviewEndDate = formatDate(cycle.getString("review_end_date"));
            const startDate = formatDate(cycle.getString("start_date"));
            const endDate = formatDate(cycle.getString("end_date"));

            try {
                // Transition to OPEN
                cycle.set("status", "OPEN");
                cycle.set("is_active", true);
                $app.save(cycle);
                console.log("[REVIEW-CRON] Opened cycle: " + cycleName + " (org: " + orgId + ")");

                // Get org name for emails
                let orgName = "your organization";
                try {
                    const org = $app.findRecordById("organizations", orgId);
                    orgName = org.getString("name") || orgName;
                } catch (e) {}

                // ── Notify ALL active employees ──
                const allEmployees = getOrgUsers(orgId, "status = 'ACTIVE'");
                console.log("[REVIEW-CRON] Notifying " + allEmployees.length + " employees for cycle: " + cycleName);

                for (let e = 0; e < allEmployees.length; e++) {
                    const emp = allEmployees[e];
                    const empId = emp.id;
                    const empName = emp.getString("name");
                    const empEmail = emp.getString("email");
                    const empRole = emp.getString("role");

                    // ── In-app notification (everyone gets one) ──
                    if (empRole === "ADMIN" || empRole === "HR") {
                        createNotification(
                            empId, orgId, "REVIEW",
                            "Review Cycle Open: " + cycleName,
                            "Performance review cycle '" + cycleName + "' is now open. " +
                            allEmployees.length + " employees are eligible. Review period: " + startDate + " to " + endDate + ". " +
                            "Submissions due by " + reviewEndDate + ".",
                            "URGENT", cycle.id, "review_cycle"
                        );
                    } else if (empRole === "MANAGER" || empRole === "TEAM_LEAD") {
                        createNotification(
                            empId, orgId, "REVIEW",
                            "Review Cycle Open: " + cycleName,
                            "Performance review cycle '" + cycleName + "' is now open. " +
                            "Complete your self-assessment and review your direct reports by " + reviewEndDate + ".",
                            "NORMAL", cycle.id, "review_cycle"
                        );
                    } else {
                        createNotification(
                            empId, orgId, "REVIEW",
                            "Review Cycle Open: " + cycleName,
                            "Performance review cycle '" + cycleName + "' is now open. " +
                            "Please complete your self-assessment by " + reviewEndDate + ".",
                            "NORMAL", cycle.id, "review_cycle"
                        );
                    }

                    // ── Email notification ──
                    if (empRole === "ADMIN" || empRole === "HR") {
                        sendEmail(empEmail,
                            "Performance Review Cycle Open: " + cycleName + " — " + orgName,
                            "<h2>Review Cycle Now Open</h2>" +
                            "<p>Dear " + empName + ",</p>" +
                            "<p>The performance review cycle <strong>" + cycleName + "</strong> is now open for <strong>" + orgName + "</strong>.</p>" +
                            "<table style='border-collapse:collapse;margin:12px 0;'>" +
                            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Review Period</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + startDate + " to " + endDate + "</td></tr>" +
                            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Submission Deadline</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + reviewEndDate + "</td></tr>" +
                            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Eligible Employees</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + allEmployees.length + "</td></tr>" +
                            "</table>" +
                            "<p>Please log in to the <strong>OpenHR portal</strong> to manage the review process.</p>"
                        );
                    } else if (empRole === "MANAGER" || empRole === "TEAM_LEAD") {
                        sendEmail(empEmail,
                            "Performance Review Open: " + cycleName + " — Action Required",
                            "<h2>Performance Review Cycle Open</h2>" +
                            "<p>Dear " + empName + ",</p>" +
                            "<p>The performance review cycle <strong>" + cycleName + "</strong> is now open.</p>" +
                            "<p><strong>As a " + empRole.replace("_", " ").toLowerCase() + ", you need to:</strong></p>" +
                            "<ol>" +
                            "<li>Complete your own self-assessment</li>" +
                            "<li>Review and rate your direct reports after they submit</li>" +
                            "</ol>" +
                            "<table style='border-collapse:collapse;margin:12px 0;'>" +
                            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Review Period</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + startDate + " to " + endDate + "</td></tr>" +
                            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Deadline</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + reviewEndDate + "</td></tr>" +
                            "</table>" +
                            "<p>Log in to <strong>OpenHR</strong> to begin.</p>"
                        );
                    } else {
                        sendEmail(empEmail,
                            "Performance Review Open: " + cycleName + " — Complete Your Self-Assessment",
                            "<h2>Performance Review Cycle Open</h2>" +
                            "<p>Dear " + empName + ",</p>" +
                            "<p>The performance review cycle <strong>" + cycleName + "</strong> is now open.</p>" +
                            "<p><strong>Please complete your self-assessment</strong> by <strong>" + reviewEndDate + "</strong>.</p>" +
                            "<table style='border-collapse:collapse;margin:12px 0;'>" +
                            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Review Period</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + startDate + " to " + endDate + "</td></tr>" +
                            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Deadline</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + reviewEndDate + "</td></tr>" +
                            "</table>" +
                            "<p>Log in to <strong>OpenHR</strong> to begin your self-assessment.</p>"
                        );
                    }
                }

                console.log("[REVIEW-CRON] Cycle OPEN notifications sent for: " + cycleName);

            } catch (saveErr) {
                console.log("[REVIEW-CRON] Failed to open cycle " + cycleName + ": " + saveErr.toString());
            }
        }

        // ──────────────────────────────────────────────────────
        // 2. OPEN → CLOSED
        //    Cycles whose review_end_date < today
        // ──────────────────────────────────────────────────────
        let openCycles = [];
        try {
            openCycles = $app.findRecordsByFilter(
                "review_cycles",
                "status = 'OPEN' && review_end_date < {:today}",
                { today: today + " 00:00:00" }
            );
        } catch (e) {
            // No matching cycles
        }

        console.log("[REVIEW-CRON] Found " + openCycles.length + " OPEN cycles to close");

        for (let i = 0; i < openCycles.length; i++) {
            const cycle = openCycles[i];
            const cycleName = cycle.getString("name");
            const orgId = cycle.getString("organization_id");

            try {
                // Transition to CLOSED
                cycle.set("status", "CLOSED");
                cycle.set("is_active", false);
                $app.save(cycle);
                console.log("[REVIEW-CRON] Closed cycle: " + cycleName + " (org: " + orgId + ")");

                // Get org name
                let orgName = "your organization";
                try {
                    const org = $app.findRecordById("organizations", orgId);
                    orgName = org.getString("name") || orgName;
                } catch (e) {}

                // Get review stats for this cycle
                let totalReviews = 0;
                let completedReviews = 0;
                let submittedReviews = 0;
                let draftReviews = 0;
                let draftEmployeeIds = [];

                try {
                    const reviews = $app.findRecordsByFilter(
                        "performance_reviews",
                        "cycle_id = {:cycleId} && organization_id = {:orgId}",
                        { cycleId: cycle.id, orgId: orgId }
                    );
                    totalReviews = reviews.length;
                    for (let r = 0; r < reviews.length; r++) {
                        const status = reviews[r].getString("status");
                        if (status === "COMPLETED") completedReviews++;
                        else if (status === "SELF_REVIEW_SUBMITTED" || status === "MANAGER_REVIEWED") submittedReviews++;
                        else if (status === "DRAFT") {
                            draftReviews++;
                            draftEmployeeIds.push(reviews[r].getString("employee_id"));
                        }
                    }
                } catch (e) {}

                // ── Notify HR/Admin with summary ──
                const adminHr = getOrgUsers(orgId, "(role = 'ADMIN' || role = 'HR')");
                for (let a = 0; a < adminHr.length; a++) {
                    const admin = adminHr[a];
                    createNotification(
                        admin.id, orgId, "REVIEW",
                        "Review Cycle Closed: " + cycleName,
                        "Cycle '" + cycleName + "' has closed. " +
                        completedReviews + "/" + totalReviews + " reviews completed, " +
                        submittedReviews + " in progress, " + draftReviews + " not submitted.",
                        "URGENT", cycle.id, "review_cycle"
                    );

                    sendEmail(admin.getString("email"),
                        "Review Cycle Closed: " + cycleName + " — " + orgName,
                        "<h2>Review Cycle Closed</h2>" +
                        "<p>Dear " + admin.getString("name") + ",</p>" +
                        "<p>The performance review cycle <strong>" + cycleName + "</strong> has closed.</p>" +
                        "<table style='border-collapse:collapse;margin:12px 0;'>" +
                        "<tr style='background:#f8f9fa;'><th style='padding:8px 12px;border:1px solid #e5e7eb;text-align:left;'>Status</th><th style='padding:8px 12px;border:1px solid #e5e7eb;text-align:center;'>Count</th></tr>" +
                        "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;color:#10b981;'>Completed</td><td style='padding:8px 12px;border:1px solid #e5e7eb;text-align:center;'>" + completedReviews + "</td></tr>" +
                        "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;color:#f59e0b;'>In Progress</td><td style='padding:8px 12px;border:1px solid #e5e7eb;text-align:center;'>" + submittedReviews + "</td></tr>" +
                        "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;color:#ef4444;'>Not Submitted</td><td style='padding:8px 12px;border:1px solid #e5e7eb;text-align:center;'>" + draftReviews + "</td></tr>" +
                        "<tr style='background:#f8f9fa;'><td style='padding:8px 12px;border:1px solid #e5e7eb;'><strong>Total</strong></td><td style='padding:8px 12px;border:1px solid #e5e7eb;text-align:center;'><strong>" + totalReviews + "</strong></td></tr>" +
                        "</table>" +
                        "<p>Log in to <strong>OpenHR</strong> to finalize remaining reviews.</p>"
                    );
                }

                // ── Notify employees who did NOT submit (DRAFT status) ──
                for (let d = 0; d < draftEmployeeIds.length; d++) {
                    try {
                        const emp = $app.findRecordById("users", draftEmployeeIds[d]);
                        createNotification(
                            emp.id, orgId, "REVIEW",
                            "Review Cycle Closed: " + cycleName,
                            "The review cycle '" + cycleName + "' has closed. You did not submit your self-assessment.",
                            "URGENT", cycle.id, "review_cycle"
                        );

                        sendEmail(emp.getString("email"),
                            "Review Cycle Closed — Self-Assessment Not Submitted",
                            "<h2>Review Cycle Closed</h2>" +
                            "<p>Dear " + emp.getString("name") + ",</p>" +
                            "<p>The performance review cycle <strong>" + cycleName + "</strong> has closed.</p>" +
                            "<p style='color:#ef4444;font-weight:bold;'>You did not submit your self-assessment before the deadline.</p>" +
                            "<p>Please contact your HR department if you have any questions.</p>"
                        );
                    } catch (e) {}
                }

                console.log("[REVIEW-CRON] Cycle CLOSED notifications sent for: " + cycleName);

            } catch (saveErr) {
                console.log("[REVIEW-CRON] Failed to close cycle " + cycleName + ": " + saveErr.toString());
            }
        }

        // ──────────────────────────────────────────────────────
        // 3. REMINDERS for OPEN cycles closing soon (3 days, 1 day)
        // ──────────────────────────────────────────────────────
        const reminderDays = [3, 1];

        for (let r = 0; r < reminderDays.length; r++) {
            const daysLeft = reminderDays[r];

            // Target: cycles whose review_end_date is exactly daysLeft from today
            const targetDate = new Date();
            targetDate.setUTCHours(0, 0, 0, 0);
            targetDate.setDate(targetDate.getDate() + daysLeft);
            const targetStart = targetDate.toISOString().split("T")[0] + " 00:00:00";
            targetDate.setDate(targetDate.getDate() + 1);
            const targetEnd = targetDate.toISOString().split("T")[0] + " 00:00:00";

            let closingSoonCycles = [];
            try {
                closingSoonCycles = $app.findRecordsByFilter(
                    "review_cycles",
                    "status = 'OPEN' && review_end_date >= {:targetStart} && review_end_date < {:targetEnd}",
                    { targetStart: targetStart, targetEnd: targetEnd }
                );
            } catch (e) {
                continue;
            }

            console.log("[REVIEW-CRON] Found " + closingSoonCycles.length + " cycles closing in " + daysLeft + " day(s)");

            for (let c = 0; c < closingSoonCycles.length; c++) {
                const cycle = closingSoonCycles[c];
                const cycleName = cycle.getString("name");
                const orgId = cycle.getString("organization_id");
                const reviewEndDate = formatDate(cycle.getString("review_end_date"));
                const isUrgent = daysLeft <= 1;

                // Find employees with incomplete reviews (DRAFT) for this cycle
                let incompleteEmployeeIds = [];
                try {
                    const reviews = $app.findRecordsByFilter(
                        "performance_reviews",
                        "cycle_id = {:cycleId} && organization_id = {:orgId} && status = 'DRAFT'",
                        { cycleId: cycle.id, orgId: orgId }
                    );
                    for (let rv = 0; rv < reviews.length; rv++) {
                        incompleteEmployeeIds.push(reviews[rv].getString("employee_id"));
                    }
                } catch (e) {}

                // Find managers with pending reviews (SELF_REVIEW_SUBMITTED) waiting for their review
                let pendingManagerIds = [];
                try {
                    const pendingReviews = $app.findRecordsByFilter(
                        "performance_reviews",
                        "cycle_id = {:cycleId} && organization_id = {:orgId} && status = 'SELF_REVIEW_SUBMITTED'",
                        { cycleId: cycle.id, orgId: orgId }
                    );
                    for (let rv = 0; rv < pendingReviews.length; rv++) {
                        const mgId = pendingReviews[rv].getString("line_manager_id");
                        if (mgId && pendingManagerIds.indexOf(mgId) === -1) {
                            pendingManagerIds.push(mgId);
                        }
                    }
                } catch (e) {}

                // ── Remind employees with DRAFT reviews ──
                for (let e = 0; e < incompleteEmployeeIds.length; e++) {
                    try {
                        const emp = $app.findRecordById("users", incompleteEmployeeIds[e]);
                        createNotification(
                            emp.id, orgId, "REVIEW",
                            (isUrgent ? "URGENT: " : "") + "Self-Assessment Due in " + daysLeft + " Day" + (daysLeft > 1 ? "s" : ""),
                            "Your self-assessment for '" + cycleName + "' is due by " + reviewEndDate + ". Please submit it before the deadline.",
                            isUrgent ? "URGENT" : "NORMAL", cycle.id, "review_cycle"
                        );

                        sendEmail(emp.getString("email"),
                            (isUrgent ? "URGENT: " : "Reminder: ") + "Self-Assessment Due in " + daysLeft + " Day" + (daysLeft > 1 ? "s" : "") + " — " + cycleName,
                            "<h2>" + (isUrgent ? "Urgent Reminder" : "Reminder") + ": Self-Assessment Due</h2>" +
                            "<p>Dear " + emp.getString("name") + ",</p>" +
                            "<p>Your self-assessment for <strong>" + cycleName + "</strong> is due in " +
                            "<strong>" + daysLeft + " day" + (daysLeft > 1 ? "s" : "") + "</strong> (by " + reviewEndDate + ").</p>" +
                            (isUrgent
                                ? "<p style='color:#ef4444;font-weight:bold;'>This is your final reminder. Please submit your self-assessment today to avoid missing the deadline.</p>"
                                : "<p>Please log in to <strong>OpenHR</strong> and complete your self-assessment before the deadline.</p>")
                        );
                    } catch (err) {}
                }

                // ── Remind managers with pending reviews ──
                for (let m = 0; m < pendingManagerIds.length; m++) {
                    try {
                        const mgr = $app.findRecordById("users", pendingManagerIds[m]);

                        // Count how many reviews are pending for this manager
                        let pendingCount = 0;
                        try {
                            const mgrReviews = $app.findRecordsByFilter(
                                "performance_reviews",
                                "cycle_id = {:cycleId} && line_manager_id = {:mgrId} && status = 'SELF_REVIEW_SUBMITTED'",
                                { cycleId: cycle.id, mgrId: pendingManagerIds[m] }
                            );
                            pendingCount = mgrReviews.length;
                        } catch (e) {}

                        createNotification(
                            mgr.id, orgId, "REVIEW",
                            (isUrgent ? "URGENT: " : "") + pendingCount + " Manager Review" + (pendingCount > 1 ? "s" : "") + " Pending",
                            "You have " + pendingCount + " direct report review" + (pendingCount > 1 ? "s" : "") + " to complete for '" + cycleName + "' by " + reviewEndDate + ".",
                            isUrgent ? "URGENT" : "NORMAL", cycle.id, "review_cycle"
                        );

                        sendEmail(mgr.getString("email"),
                            (isUrgent ? "URGENT: " : "Reminder: ") + pendingCount + " Pending Manager Review" + (pendingCount > 1 ? "s" : "") + " — " + cycleName,
                            "<h2>" + (isUrgent ? "Urgent Reminder" : "Reminder") + ": Pending Manager Reviews</h2>" +
                            "<p>Dear " + mgr.getString("name") + ",</p>" +
                            "<p>You have <strong>" + pendingCount + "</strong> direct report review" + (pendingCount > 1 ? "s" : "") +
                            " to complete for <strong>" + cycleName + "</strong>.</p>" +
                            "<p>Deadline: <strong>" + reviewEndDate + "</strong> (" + daysLeft + " day" + (daysLeft > 1 ? "s" : "") + " remaining)</p>" +
                            (isUrgent
                                ? "<p style='color:#ef4444;font-weight:bold;'>This is your final reminder. Please complete your reviews today.</p>"
                                : "<p>Please log in to <strong>OpenHR</strong> to complete your reviews.</p>")
                        );
                    } catch (err) {}
                }

                // ── Remind HR/Admin about overall progress ──
                if (incompleteEmployeeIds.length > 0 || pendingManagerIds.length > 0) {
                    const adminHr = getOrgUsers(orgId, "(role = 'ADMIN' || role = 'HR')");
                    for (let a = 0; a < adminHr.length; a++) {
                        createNotification(
                            adminHr[a].id, orgId, "REVIEW",
                            "Review Deadline in " + daysLeft + " Day" + (daysLeft > 1 ? "s" : "") + ": " + cycleName,
                            incompleteEmployeeIds.length + " employee" + (incompleteEmployeeIds.length > 1 ? "s have" : " has") +
                            " not submitted self-assessments. " + pendingManagerIds.length + " manager" + (pendingManagerIds.length > 1 ? "s have" : " has") +
                            " pending reviews. Deadline: " + reviewEndDate + ".",
                            isUrgent ? "URGENT" : "NORMAL", cycle.id, "review_cycle"
                        );
                    }
                }

                console.log("[REVIEW-CRON] Reminder (" + daysLeft + "d) sent for cycle: " + cycleName +
                    " (" + incompleteEmployeeIds.length + " incomplete, " + pendingManagerIds.length + " pending manager reviews)");
            }
        }

        console.log("[REVIEW-CRON] Review cycle transition check completed");

    } catch (err) {
        console.log("[REVIEW-CRON] Fatal error: " + err.toString());
    }
});

console.log("[HOOKS] Review Cycle Notifications loaded successfully.");
