
console.log("[HOOKS] Loading OpenHR System Hooks (v0.43 - Clean Verification URLs)...");

// ────────────────────────────────────────────────────────────────
// Rewrite verification email URLs before PocketBase sends them.
// PocketBase generates: {appUrl}/_/#/auth/confirm-verification/{TOKEN}
// We rewrite to:        {appUrl}/?token={TOKEN}
// This runs for both registration and "Resend Verification" flows.
// ────────────────────────────────────────────────────────────────
try {
    onMailerRecordVerificationSend((e) => {
        try {
            var html = e.message.html;
            // Match PocketBase's default verification URL pattern and extract the token
            // Pattern: {appUrl}/_/#/auth/confirm-verification/{TOKEN}
            var regex = /href="([^"]*\/_\/#\/auth\/confirm-verification\/([^"?&#]+))"/g;
            var match = regex.exec(html);
            if (match) {
                var fullOldUrl = match[1];
                var token = match[2];
                var settings = $app.settings();
                var meta = settings.meta || {};
                var appUrl = (meta.appUrl || "https://www.openhrapp.com").replace(/\/+$/, "");
                var cleanUrl = appUrl + "/?token=" + token;
                // Replace all occurrences of the old URL (href and plain text links)
                e.message.html = html.split(fullOldUrl).join(cleanUrl);
                console.log("[HOOKS] Rewrote verification URL to clean format for: " + (e.record ? e.record.getString("email") : "unknown"));
            }
        } catch (err) {
            console.log("[HOOKS] URL rewrite failed (sending default): " + err.toString());
        }
        // MUST call e.next() to continue the hook chain and actually send the email
        e.next();
    });
} catch (e) {
    console.log("[HOOKS] Mailer hook not available: " + e.toString());
}

/* ============================================================
   1. SECURE REGISTRATION ENDPOINT (Public)
   Method: POST /api/openhr/register
   Body: FormData { orgName, adminName, email, password, country, address (optional), logo (optional) }
   ============================================================ */
routerAdd("POST", "/api/openhr/register", (e) => {
    try {
        console.log("[REGISTER] Request received.");

        let data = {};
        try {
            const requestInfo = e.requestInfo();
            if (requestInfo && requestInfo.body && typeof requestInfo.body === 'object') {
                data = requestInfo.body;
            } else if (requestInfo && requestInfo.data) {
                // FormData comes through requestInfo.data
                data = requestInfo.data;
            } else {
                return e.json(400, { message: "Invalid request body structure" });
            }
        } catch (parseErr) {
            return e.json(400, { message: "Invalid request body: " + parseErr.toString() });
        }

        const orgName = data.orgName;
        const adminName = data.adminName;
        const email = data.email;
        const password = data.password;
        const country = data.country || 'BD'; // Default to Bangladesh
        const address = data.address || '';

        if (!email || !password || !orgName) {
            return e.json(400, { message: "Missing required fields: orgName, email, or password." });
        }
        if (password.length < 8) {
            return e.json(400, { message: "Password must be at least 8 characters." });
        }
        if (!country) {
            return e.json(400, { message: "Country is required." });
        }
        if (country.length !== 2) {
            return e.json(400, { message: "Invalid country code. Must be 2-letter ISO code (e.g., BD, US, IN)." });
        }

        // 2. Check if email exists
        try {
            const u = $app.findFirstRecordByFilter("users", "email = {:email}", { email: email });
            if (u) {
                return e.json(400, { message: "Email already in use." });
            }
        } catch (err) {
            // User not found (Good), proceed.
        }

        // 3. Create Organization
        const orgCollection = $app.findCollectionByNameOrId("organizations");
        const org = new Record(orgCollection);
        org.set("name", orgName);
        org.set("country", country);
        org.set("address", address);
        org.set("subscription_status", "TRIAL");

        // Handle logo file upload if provided
        try {
            const requestInfo = e.requestInfo();
            if (requestInfo && requestInfo.files && requestInfo.files.logo && requestInfo.files.logo.length > 0) {
                org.set("logo", requestInfo.files.logo[0]);
                console.log("[REGISTER] Logo uploaded for org:", orgName);
            }
        } catch (logoErr) {
            console.log("[REGISTER] Logo upload skipped or failed (non-fatal):", logoErr.toString());
        }

        // Set trial end date to 14 days from now (normalized to start of day for consistent day counting)
        const trialEndDate = new Date();
        trialEndDate.setUTCHours(0, 0, 0, 0); // normalize today to midnight UTC
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        org.set("trial_end_date", trialEndDate.toISOString());

        try {
            $app.save(org);
            console.log("[REGISTER] Organization created:", org.id, "Country:", country);
        } catch (err) {
            return e.json(400, { message: "Database Error (Organization): " + err.message });
        }

        // 4. Create Admin User
        const randId = Math.floor(1000 + Math.random() * 9000);
        const timestamp = new Date().getTime().toString().slice(-4);
        const adminId = "ADM-" + timestamp + "-" + randId;

        const usersCollection = $app.findCollectionByNameOrId("users");
        const user = new Record(usersCollection);
        user.set("email", email);
        user.setPassword(password);
        user.set("name", adminName);
        user.set("role", "ADMIN");
        user.set("organization_id", org.id);
        user.set("employee_id", adminId);
        user.set("designation", "System Admin");
        user.set("department", "Management");
        user.set("verified", false); 
        
        try {
            $app.save(user);
        } catch (err) {
            try { $app.delete(org); } catch(_) {} // Rollback org
            return e.json(400, { message: "Database Error (User): " + err.message });
        }

        // 5. Initialize Default Settings with Country-Based Defaults
        try {
            const settingsCollection = $app.findCollectionByNameOrId("settings");

            function createSetting(key, val) {
                const s = new Record(settingsCollection);
                s.set("key", key);
                s.set("value", val);
                s.set("organization_id", org.id);
                $app.save(s);
            }

            // Get country-based defaults
            const countryDefaults = getCountryDefaults(country);

            // Initialize app_config with country-specific settings
            createSetting("app_config", {
                companyName: orgName,
                currency: countryDefaults.currency,
                timezone: countryDefaults.timezone,
                dateFormat: countryDefaults.dateFormat,
                workingDays: countryDefaults.workingDays,
                officeStartTime: "09:00",
                officeEndTime: "18:00",
                lateGracePeriod: 15,
                earlyOutGracePeriod: 15,
                earliestCheckIn: "06:00",
                autoSessionCloseTime: "23:59",
                autoAbsentEnabled: true,
                autoAbsentTime: "23:55"
            });

            // Initialize country-based holidays
            const holidays = loadHolidaysForCountry(country);
            if (holidays && holidays.length > 0) {
                createSetting("holidays", holidays);
                console.log("[REGISTER] Initialized", holidays.length, "holidays for country:", country);
            } else {
                createSetting("holidays", []);
                console.log("[REGISTER] No predefined holidays for country:", country);
            }

            createSetting("departments", ["Engineering", "HR", "Sales", "Marketing", "Operations", "Finance", "Management"]);
            createSetting("designations", ["Manager", "Lead", "Senior", "Associate", "Junior", "Intern"]);
            createSetting("leave_policy", {
                defaults: { ANNUAL: 15, CASUAL: 10, SICK: 14 },
                overrides: {}
            });

            console.log("[REGISTER] Settings initialized with country defaults for:", country);
        } catch (err) {
            console.error("[REGISTER] Settings Init Failed (Non-fatal): " + err);
        }
        
        // 6. Send Verification Email using PocketBase's built-in method
        // This ensures proper token generation and uses the configured email template
        try {
            console.log("[REGISTER] Sending verification email to: " + email);

            // Re-fetch the user record to ensure it's fully saved before sending email
            const savedUser = $app.findRecordById("users", user.id);

            // Use PocketBase's built-in verification email (URL rewritten by onMailerRecordVerificationSend hook)
            $mails.sendRecordVerification($app, savedUser);

            console.log("[REGISTER] Verification email sent successfully to: " + email);
        } catch (err) {
            // Non-fatal: User is created, they can request resend from login page
            console.error("[REGISTER] Email Send Failed (user created, can resend): " + err.toString());
        }

        // 7. Notify Super Admin about new registration
        try {
            const superAdmins = $app.findRecordsByFilter("users", "role = 'SUPER_ADMIN'");
            if (superAdmins.length > 0) {
                const settings = $app.settings();
                const meta = settings.meta || {};
                const senderAddress = meta.senderAddress || "noreply@openhr.app";
                const senderName = meta.senderName || "OpenHR System";

                for (let i = 0; i < superAdmins.length; i++) {
                    const sa = superAdmins[i];
                    const saEmail = sa.getString("email");

                    try {
                        const message = new MailerMessage({
                            from: { address: senderAddress, name: senderName },
                            to: [{ address: saEmail }],
                            subject: "New Organization Registered: " + orgName,
                            html: "<h2>New Organization Registration</h2>" +
                                  "<p>A new organization has registered on OpenHR:</p>" +
                                  "<table style='border-collapse:collapse;'>" +
                                  "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Organization</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + orgName + "</td></tr>" +
                                  "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Admin Name</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + adminName + "</td></tr>" +
                                  "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Admin Email</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + email + "</td></tr>" +
                                  "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Trial Ends</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + trialEndDate.toISOString().split('T')[0] + "</td></tr>" +
                                  "</table>" +
                                  "<p style='margin-top:16px;'>Login to the Super Admin dashboard to manage this organization.</p>"
                        });
                        $app.newMailClient().send(message);
                        console.log("[REGISTER] Super Admin notified: " + saEmail);
                    } catch (saEmailErr) {
                        console.log("[REGISTER] Failed to notify Super Admin: " + saEmailErr.toString());
                    }
                }
            }
        } catch (saErr) {
            console.log("[REGISTER] Could not notify Super Admins: " + saErr.toString());
        }

        return e.json(200, { success: true, message: "Organization created. Please verify your email." });

    } catch (globalErr) {
        return e.json(500, { message: "Internal Server Error: " + globalErr.toString() });
    }
});

/* ============================================================
   2. ENFORCE EMAIL VERIFICATION & SUBSCRIPTION CHECK
   ============================================================ */
try {
    onRecordBeforeAuthWithPasswordRequest((e) => {
        // Allow SUPER_ADMIN to bypass all checks
        const role = e.record?.getString("role");
        if (role === "SUPER_ADMIN") {
            return; // Allow login
        }

        // Check email verification
        if (e.record && !e.record.get("verified")) {
            throw new BadRequestError("Account not verified. Please check your email.");
        }

        // Check organization subscription status
        const orgId = e.record?.getString("organization_id");
        if (orgId) {
            try {
                const org = $app.findRecordById("organizations", orgId);
                const subscriptionStatus = org.getString("subscription_status");

                if (subscriptionStatus === "SUSPENDED") {
                    throw new BadRequestError("ACCOUNT_SUSPENDED: Your organization account has been suspended. Please contact support.");
                }
            } catch (orgErr) {
                // If error message contains SUSPENDED, rethrow
                if (orgErr.message && orgErr.message.includes("SUSPENDED")) {
                    throw orgErr;
                }
                // Otherwise, allow login if org lookup fails (org might be deleted)
                console.log("[AUTH] Could not verify org subscription: " + orgErr.toString());
            }
        }
    }, "users");
} catch (e) {}

/* ============================================================
   2A. SUBSCRIPTION STATUS CHECK ENDPOINT
   ============================================================ */
routerAdd("GET", "/api/openhr/subscription-status", (e) => {
    try {
        // Get auth info from request
        const authRecord = e.auth;

        console.log("[SUBSCRIPTION] Auth check - authRecord:", authRecord ? "exists" : "null");

        if (!authRecord) {
            return e.json(401, { message: "Unauthorized - no auth record" });
        }

        const orgId = authRecord.getString("organization_id");
        const role = authRecord.getString("role");

        console.log("[SUBSCRIPTION] User role:", role, "orgId:", orgId);

        // Super Admin has no org - always active
        if (role === "SUPER_ADMIN" || !orgId) {
            return e.json(200, {
                status: "ACTIVE",
                isSuperAdmin: true,
                daysRemaining: null,
                trialEndDate: null,
                showAds: false
            });
        }

        try {
            const org = $app.findRecordById("organizations", orgId);
            const status = org.getString("subscription_status") || "TRIAL";
            const trialEndDate = org.getString("trial_end_date");

            console.log("[SUBSCRIPTION] Org status:", status, "trialEndDate:", trialEndDate);

            let daysRemaining = null;
            if (status === "TRIAL" && trialEndDate) {
                const endDate = new Date(trialEndDate);
                const now = new Date();
                // Compare calendar dates only (ignore time) for consistent day counting
                const endDay = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
                const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
                daysRemaining = Math.round((endDay - today) / (1000 * 60 * 60 * 24));
                if (daysRemaining < 0) daysRemaining = 0;
            }

            return e.json(200, {
                status: status,
                trialEndDate: trialEndDate,
                daysRemaining: daysRemaining,
                isSuperAdmin: false,
                showAds: status === "AD_SUPPORTED"
            });
        } catch (err) {
            console.log("[SUBSCRIPTION] Error fetching org:", err.toString());
            return e.json(500, { message: "Failed to fetch subscription status: " + err.toString() });
        }
    } catch (globalErr) {
        console.log("[SUBSCRIPTION] Global error:", globalErr.toString());
        return e.json(500, { message: "Internal error: " + globalErr.toString() });
    }
});

/* ============================================================
   2B. TEST EMAIL ENDPOINT
   ============================================================ */
routerAdd("POST", "/api/openhr/test-email", (e) => {
    try {
        const data = e.requestInfo().body || {};
        const testEmail = data.email || "test@example.com";
        
        try {
            var meta = $app.settings().meta || {};
            var senderAddr = meta.senderAddress || "noreply@openhr.app";
            var senderName = meta.senderName || "OpenHR System";
            const message = new MailerMessage({
                from: { address: senderAddr, name: senderName },
                to: [{ address: testEmail }],
                subject: "Test Email from OpenHR",
                html: "<h1>Test Email</h1><p>If you see this, email is configured correctly!</p>" +
                      "<p style='color:#6b7280;font-size:12px;'>Sent from: " + senderAddr + "</p>",
            });
            $app.newMailClient().send(message);
            return e.json(200, { success: true, message: "Test email sent to " + testEmail + " from " + senderAddr });
        } catch (mailErr) {
            return e.json(400, { message: "Email test failed: " + mailErr.toString() });
        }
    } catch (globalErr) {
        return e.json(500, { message: "Test failed: " + globalErr.toString() });
    }
});

/* ============================================================
   2B-2. LEAVE NOTIFICATION DIAGNOSTIC (Auth required)
   GET /api/openhr/diagnose-leave?leaveId=XXXXX
   Tests every step of the leave notification flow and reports
   exactly which step fails.
   ============================================================ */
routerAdd("GET", "/api/openhr/diagnose-leave", (e) => {
    var results = [];
    function log(step, ok, detail) {
        results.push({ step: step, ok: ok, detail: detail });
    }

    try {
        // Auth check
        if (!e.auth || !e.auth.record) {
            return e.json(401, { message: "Login required" });
        }
        log("1. Auth", true, "Authenticated as: " + e.auth.record.getString("email"));

        // SMTP / sender config
        var sender = {};
        try {
            var meta = $app.settings().meta || {};
            sender = { address: meta.senderAddress || "", name: meta.senderName || "" };
            var smtpEnabled = $app.settings().smtp && $app.settings().smtp.enabled;
            log("2. SMTP Config", !!sender.address, "senderAddress=" + sender.address + ", senderName=" + sender.name + ", smtp.enabled=" + smtpEnabled);
            if ($app.settings().smtp) {
                log("2a. SMTP Details", true, "host=" + ($app.settings().smtp.host || "NOT SET") + ", port=" + ($app.settings().smtp.port || "NOT SET"));
            }
        } catch (err) {
            log("2. SMTP Config", false, "Error: " + err.toString());
        }

        // Get leave record
        var leaveId = "";
        try {
            var qi = e.request.url.query;
            if (qi && qi.get) {
                leaveId = qi.get("leaveId") || "";
            }
        } catch (err) {
            // Try alternative query parsing
            try {
                var url = e.request.url.string();
                var match = url.match(/leaveId=([^&]+)/);
                if (match) leaveId = match[1];
            } catch (err2) {}
        }

        if (!leaveId) {
            // Find most recent leave
            try {
                var recent = $app.findRecordsByFilter("leaves", "id != ''", "-created", 1, 0);
                if (recent && recent.length > 0) {
                    leaveId = recent[0].id;
                    log("3. Leave Record", true, "No leaveId param — using most recent: " + leaveId);
                } else {
                    log("3. Leave Record", false, "No leaves found in database");
                    return e.json(200, { results: results });
                }
            } catch (err) {
                log("3. Leave Record", false, "Could not find any leaves: " + err.toString());
                return e.json(200, { results: results });
            }
        }

        var leave;
        try {
            leave = $app.findRecordById("leaves", leaveId);
            log("3. Leave Record", true, "Found leave id=" + leaveId +
                " | employee_id=" + leave.getString("employee_id") +
                " | line_manager_id=" + leave.getString("line_manager_id") +
                " | status=" + leave.getString("status") +
                " | org_id=" + leave.getString("organization_id"));
        } catch (err) {
            log("3. Leave Record", false, "Leave not found (id=" + leaveId + "): " + err.toString());
            return e.json(200, { results: results });
        }

        // Look up employee
        var empId = leave.getString("employee_id");
        var employee;
        try {
            employee = $app.findRecordById("users", empId);
            log("4. Employee Lookup", true, "Found: " + employee.getString("name") + " <" + employee.getString("email") + ">");
        } catch (err) {
            log("4. Employee Lookup", false, "Employee NOT found (id=" + empId + "): " + err.toString());
        }

        // Look up manager
        var managerId = leave.getString("line_manager_id");
        if (managerId) {
            try {
                var manager = $app.findRecordById("users", managerId);
                log("5. Manager Lookup", true, "Found: " + manager.getString("name") + " <" + manager.getString("email") + ">");
            } catch (err) {
                log("5. Manager Lookup", false, "Manager NOT found (id=" + managerId + "): " + err.toString());
            }
        } else {
            log("5. Manager Lookup", false, "No line_manager_id set on this leave record");
        }

        // Look up admins
        var orgId = leave.getString("organization_id");
        try {
            var admins = $app.findRecordsByFilter(
                "users",
                "organization_id = {:orgId} && (role = 'ADMIN' || role = 'HR')",
                { orgId: orgId }
            );
            var adminList = [];
            for (var i = 0; i < admins.length; i++) {
                adminList.push(admins[i].getString("name") + " <" + admins[i].getString("email") + ">");
            }
            log("6. Admin/HR Lookup", admins.length > 0, "Found " + admins.length + ": " + adminList.join(", "));
        } catch (err) {
            log("6. Admin/HR Lookup", false, "Query failed: " + err.toString());
        }

        // Test notification creation
        try {
            var notifCollection = $app.findCollectionByNameOrId("notifications");
            log("7. Notifications Collection", true, "Collection exists (id=" + notifCollection.id + ")");

            // Actually create a test notification
            var testNotif = new Record(notifCollection);
            testNotif.set("user_id", e.auth.record.id);
            testNotif.set("organization_id", orgId);
            testNotif.set("type", "LEAVE");
            testNotif.set("title", "DIAGNOSTIC TEST — Leave Notification");
            testNotif.set("message", "This is a test notification from the diagnostic endpoint. You can delete it.");
            testNotif.set("is_read", false);
            testNotif.set("priority", "NORMAL");
            testNotif.set("reference_id", leaveId);
            testNotif.set("reference_type", "leave");
            testNotif.set("action_url", "leaves");
            $app.save(testNotif);
            log("7a. Create Test Notification", true, "Created notification id=" + testNotif.id + " — check your bell icon!");
        } catch (err) {
            log("7. Notifications", false, "FAILED: " + err.toString());
        }

        // Test email sending
        if (employee && sender.address) {
            try {
                var empEmail = employee.getString("email");
                $app.newMailClient().send(new MailerMessage({
                    from: sender,
                    to: [{ address: empEmail }],
                    subject: "DIAGNOSTIC TEST — Leave Email",
                    html: "<h2>Leave Notification Diagnostic</h2>" +
                          "<p>If you see this email, SMTP is working correctly for leave notifications!</p>" +
                          "<p>Leave ID: " + leaveId + "</p>" +
                          "<p style='color:#6b7280;'>This is a test. You can ignore this email.</p>",
                }));
                log("8. Send Test Email", true, "Email sent to " + empEmail + " from " + sender.address);
            } catch (err) {
                log("8. Send Test Email", false, "FAILED: " + err.toString());
            }
        } else {
            log("8. Send Test Email", false, "Skipped — " + (!employee ? "employee not found" : "no sender address configured"));
        }

        return e.json(200, { results: results });
    } catch (err) {
        log("FATAL", false, err.toString());
        return e.json(500, { results: results, error: err.toString() });
    }
});

/* ============================================================
   2C. ADMIN VERIFICATION ENDPOINT (Secure)
   ============================================================ */
routerAdd("POST", "/api/openhr/admin-verify-user", (e) => {
    try {
        if (!e.auth || !e.auth.record) {
            return e.json(401, { message: "Unauthorized: Admin authentication required" });
        }
        
        const adminRole = e.auth.record.getString("role");
        const adminOrgId = e.auth.record.getString("organization_id");

        if (adminRole !== "ADMIN") {
            return e.json(403, { message: "Forbidden: Admin access required" });
        }
        
        const data = e.requestInfo().body || {};
        const userId = data.userId;
        
        if (!userId) {
            return e.json(400, { message: "userId is required" });
        }
        
        try {
            const user = $app.findRecordById("users", userId);
            
            // SECURITY: Ensure admin can only verify users in THEIR organization
            if (user.getString("organization_id") !== adminOrgId) {
                return e.json(404, { message: "User not found" });
            }
            
            if (user.get("verified")) {
                return e.json(400, { message: "User is already verified" });
            }
            
            user.set("verified", true);
            $app.save(user);

            // Send professional verification confirmation email
            try {
                const userName = user.getString("name") || "Team Member";
                const userEmail = user.getString("email");
                const settings = $app.settings();
                const meta = settings.meta || {};
                const senderAddress = meta.senderAddress || "noreply@openhr.app";
                const senderName = meta.senderName || "OpenHR System";

                // Get organization details for better email context
                let orgName = "Your Organization";
                try {
                    const org = $app.findRecordById("organizations", adminOrgId);
                    orgName = org.getString("name") || orgName;
                } catch(e) {}

                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                            .success-icon { font-size: 48px; margin-bottom: 10px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <div class="success-icon">✓</div>
                                <h1 style="margin: 0;">Account Verified!</h1>
                            </div>
                            <div class="content">
                                <p>Hello <strong>${userName}</strong>,</p>

                                <p>Great news! Your account has been verified by your administrator at <strong>${orgName}</strong>.</p>

                                <p><strong>What's next?</strong></p>
                                <ul>
                                    <li>You now have full access to all features</li>
                                    <li>You can log in and start using the system</li>
                                    <li>Your manager can assign you to teams and projects</li>
                                </ul>

                                <div style="text-align: center;">
                                    <a href="${$app.settings().meta.appUrl || 'https://app.openhr.com'}/login" class="button">Log In Now</a>
                                </div>

                                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                                    If you have any questions, please contact your HR administrator.
                                </p>
                            </div>
                            <div class="footer">
                                <p>This is an automated message from OpenHR System.<br/>Please do not reply to this email.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                const message = new MailerMessage({
                    from: { address: senderAddress, name: senderName },
                    to: [{ address: userEmail }],
                    subject: "✓ Your Account Has Been Verified - " + orgName,
                    html: htmlContent,
                });
                $app.newMailClient().send(message);
                console.log("[ADMIN-VERIFY] Verification confirmation email sent to:", userEmail);
            } catch (notifyErr) {
                console.error("[ADMIN-VERIFY] Failed to send confirmation email:", notifyErr.toString());
            }
            
            return e.json(200, { success: true, message: "Verified successfully." });
        } catch (dbErr) {
            return e.json(400, { message: "Verification failed: " + dbErr.toString() });
        }
        
    } catch (globalErr) {
        return e.json(500, { message: "Internal error: " + globalErr.toString() });
    }
});

/* ============================================================
   2D. LIST UNVERIFIED USERS
   ============================================================ */
routerAdd("GET", "/api/openhr/unverified-users", (e) => {
    try {
        if (!e.auth || !e.auth.record) return e.json(401, { message: "Unauthorized" });
        
        const adminRole = e.auth.record.getString("role");
        const adminOrgId = e.auth.record.getString("organization_id");

        if (adminRole !== "ADMIN") return e.json(403, { message: "Forbidden" });
        
        try {
            const records = $app.findAllRecordsByFilter("users", "organization_id = {:orgId} && verified = false", { orgId: adminOrgId });
            
            const unverifiedUsers = [];
            for (let i = 0; i < records.length; i++) {
                const rec = records[i];
                unverifiedUsers.push({
                    id: rec.id,
                    email: rec.getString("email"),
                    name: rec.getString("name"),
                    role: rec.getString("role"),
                    created: rec.get("created"),
                    updated: rec.get("updated")
                });
            }
            
            return e.json(200, { success: true, count: unverifiedUsers.length, users: unverifiedUsers });
        } catch (err) {
            return e.json(400, { message: "Failed to fetch users" });
        }
        
    } catch (globalErr) {
        return e.json(500, { message: "Internal error" });
    }
});

/* ============================================================
   2D-bis. PUBLIC VERIFICATION-STATUS CHECK
   Method: GET /api/openhr/check-verification?email=<address>
   Auth:   Public (called from the post-registration page while the
           user is still unauthenticated). Returns ONLY a boolean —
           never any other user data — so it cannot be used as a
           user-existence oracle beyond what registration already exposes.
   ============================================================ */
try {
    routerAdd("GET", "/api/openhr/check-verification", (e) => {
        try {
            const email = (e.requestInfo().query && e.requestInfo().query.email) || "";
            if (!email) return e.json(400, { verified: false, message: "Email required" });

            try {
                const rec = $app.findFirstRecordByFilter(
                    "users",
                    "email = {:email}",
                    { email: email }
                );
                return e.json(200, { verified: !!rec.get("verified") });
            } catch (notFound) {
                // No record yet — treat as not verified rather than 404, so the
                // client polls quietly without UI errors during the brief window
                // before the user is fully persisted.
                return e.json(200, { verified: false });
            }
        } catch (err) {
            console.log("[CHECK-VERIFICATION] Error: " + err.toString());
            return e.json(500, { verified: false, message: "Internal error" });
        }
    });
} catch (e) {
    console.log("[HOOKS] check-verification route registration failed: " + e.toString());
}

/* ============================================================
   2E. ACCEPT AD-SUPPORTED MODE ENDPOINT
   ============================================================ */
routerAdd("POST", "/api/openhr/accept-ads", (e) => {
    try {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { message: "Unauthorized" });
        }

        const orgId = authRecord.getString("organization_id");
        if (!orgId) {
            return e.json(400, { message: "No organization found" });
        }

        try {
            const org = $app.findRecordById("organizations", orgId);
            org.set("subscription_status", "AD_SUPPORTED");
            org.set("ad_consent", true);
            $app.save(org);

            console.log("[UPGRADE] Organization " + org.getString("name") + " activated AD_SUPPORTED mode");

            return e.json(200, { success: true, message: "Ad-supported mode activated" });
        } catch (err) {
            return e.json(500, { message: "Failed to activate: " + err.toString() });
        }
    } catch (globalErr) {
        return e.json(500, { message: "Internal error: " + globalErr.toString() });
    }
});

/* ============================================================
   2F. PROCESS UPGRADE REQUEST ENDPOINT (Super Admin)
   ============================================================ */
routerAdd("POST", "/api/openhr/process-upgrade-request", (e) => {
    try {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { message: "Unauthorized" });
        }

        const role = authRecord.getString("role");
        if (role !== "SUPER_ADMIN") {
            return e.json(403, { message: "Super Admin access required" });
        }

        let data = {};
        try {
            const requestInfo = e.requestInfo();
            if (requestInfo && requestInfo.body) {
                data = requestInfo.body;
            }
        } catch (parseErr) {
            return e.json(400, { message: "Invalid request body" });
        }

        const requestId = data.requestId;
        const action = data.action; // APPROVED or REJECTED
        const adminNotes = data.adminNotes || "";
        const extensionDays = data.extensionDays || 14;

        if (!requestId || !action) {
            return e.json(400, { message: "Missing requestId or action" });
        }

        try {
            const request = $app.findRecordById("upgrade_requests", requestId);
            const orgId = request.getString("organization_id");
            const requestType = request.getString("request_type");

            // Update request status
            request.set("status", action);
            request.set("admin_notes", adminNotes);
            request.set("processed_by", authRecord.id);
            request.set("processed_at", new Date().toISOString());
            $app.save(request);

            // If approved, update organization
            if (action === "APPROVED") {
                const org = $app.findRecordById("organizations", orgId);

                if (requestType === "DONATION") {
                    // Set to ACTIVE based on donation tier
                    const tier = request.getString("donation_tier");
                    let expiresAt = new Date();

                    if (tier === "TIER_3MO") {
                        expiresAt.setMonth(expiresAt.getMonth() + 3);
                    } else if (tier === "TIER_6MO") {
                        expiresAt.setMonth(expiresAt.getMonth() + 6);
                    } else if (tier === "TIER_1YR") {
                        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                    } else if (tier === "TIER_LIFETIME") {
                        expiresAt = null; // No expiry
                    }

                    org.set("subscription_status", "ACTIVE");
                    if (expiresAt) {
                        org.set("subscription_expires", expiresAt.toISOString());
                    }
                    org.set("trial_end_date", ""); // Clear trial

                } else if (requestType === "TRIAL_EXTENSION") {
                    // Extend trial
                    const days = request.getInt("extension_days") || extensionDays;
                    const newEndDate = new Date();
                    newEndDate.setDate(newEndDate.getDate() + days);

                    org.set("subscription_status", "TRIAL");
                    org.set("trial_end_date", newEndDate.toISOString());

                } else if (requestType === "AD_SUPPORTED") {
                    org.set("subscription_status", "AD_SUPPORTED");
                    org.set("ad_consent", true);
                }

                $app.save(org);
                console.log("[UPGRADE] Processed " + requestType + " request for org: " + org.getString("name"));
            }

            // Send notification email to organization admin about the decision
            try {
                const org = $app.findRecordById("organizations", orgId);
                const orgName = org.getString("name");
                const admins = $app.findRecordsByFilter("users", "organization_id = {:orgId} && role = 'ADMIN'", { orgId: orgId });

                if (admins.length > 0) {
                    const admin = admins[0];
                    const adminEmail = admin.getString("email");
                    const adminName = admin.getString("name");

                    const settings = $app.settings();
                    const meta = settings.meta || {};
                    const senderAddress = meta.senderAddress || "noreply@openhr.app";
                    const senderName = meta.senderName || "OpenHR System";

                    let statusMessage = "";
                    let newStatus = "";
                    if (action === "APPROVED") {
                        if (requestType === "DONATION") {
                            newStatus = "ACTIVE";
                            statusMessage = "Your donation has been verified and your subscription is now <strong>ACTIVE</strong>. Thank you for supporting OpenHR!";
                        } else if (requestType === "TRIAL_EXTENSION") {
                            newStatus = "TRIAL (Extended)";
                            statusMessage = "Your trial extension request has been approved. Your trial has been extended by " + (request.getInt("extension_days") || extensionDays) + " days.";
                        } else if (requestType === "AD_SUPPORTED") {
                            newStatus = "AD_SUPPORTED";
                            statusMessage = "Your ad-supported mode request has been approved. You now have full access with ads.";
                        }
                    } else {
                        statusMessage = "Unfortunately, your request has been <strong>rejected</strong>.";
                        if (adminNotes) {
                            statusMessage += "<br><br><strong>Reason:</strong> " + adminNotes;
                        }
                    }

                    const message = new MailerMessage({
                        from: { address: senderAddress, name: senderName },
                        to: [{ address: adminEmail }],
                        subject: "OpenHR Subscription Update - " + orgName,
                        html: "<h2>Subscription Status Update</h2>" +
                              "<p>Dear " + adminName + ",</p>" +
                              "<p>" + statusMessage + "</p>" +
                              (newStatus ? "<p><strong>New Status:</strong> " + newStatus + "</p>" : "") +
                              "<p>Thank you for using OpenHR!</p>"
                    });
                    $app.newMailClient().send(message);
                    console.log("[UPGRADE] Admin notified: " + adminEmail);
                }
            } catch (emailErr) {
                console.log("[UPGRADE] Failed to send admin notification: " + emailErr.toString());
            }

            return e.json(200, { success: true, message: "Request " + action.toLowerCase() });
        } catch (err) {
            return e.json(500, { message: "Failed to process: " + err.toString() });
        }
    } catch (globalErr) {
        return e.json(500, { message: "Internal error: " + globalErr.toString() });
    }
});

/* ============================================================
   2G. GET AD CONFIG ENDPOINT (For AD_SUPPORTED users)
   ============================================================ */
console.log("[HOOKS] Registering ad-config endpoint...");
routerAdd("GET", "/api/openhr/ad-config/{slot}", (e) => {
    try {
        console.log("[AD-CONFIG] Request received for slot:", e.request.pathValue("slot"));
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { message: "Unauthorized" });
        }

        const slot = e.request.pathValue("slot");
        if (!slot) {
            return e.json(400, { message: "Slot parameter required" });
        }

        // Check if user's org is AD_SUPPORTED
        const orgId = authRecord.getString("organization_id");
        if (orgId) {
            try {
                const org = $app.findRecordById("organizations", orgId);
                const status = org.getString("subscription_status");
                if (status !== "AD_SUPPORTED") {
                    return e.json(200, { enabled: false, reason: "Not ad-supported" });
                }
            } catch (err) {
                return e.json(200, { enabled: false, reason: "Org not found" });
            }
        }

        // Find ad config organization (where Super Admin stores ad configs)
        // Priority: 1) __SYSTEM__ org, 2) Platform org, 3) Any org with ad_config settings
        let adConfigOrgId = null;

        // Try __SYSTEM__ first (created by AdManagement when Super Admin has no org)
        try {
            const systemOrg = $app.findFirstRecordByFilter("organizations", "name = '__SYSTEM__'");
            if (systemOrg) {
                adConfigOrgId = systemOrg.id;
                console.log("[AD-CONFIG] Found __SYSTEM__ org:", adConfigOrgId);
            }
        } catch (err) {
            // Not found, continue
        }

        // Try Platform org as fallback
        if (!adConfigOrgId) {
            try {
                const platformOrg = $app.findFirstRecordByFilter("organizations", "name = 'Platform'");
                if (platformOrg) {
                    adConfigOrgId = platformOrg.id;
                    console.log("[AD-CONFIG] Found Platform org:", adConfigOrgId);
                }
            } catch (err) {
                // Not found, continue
            }
        }

        // Last resort: Find any org that has ad_config settings (Super Admin's own org)
        if (!adConfigOrgId) {
            try {
                const adSetting = $app.findFirstRecordByFilter("settings", "key ~ 'ad_config_%'");
                if (adSetting) {
                    adConfigOrgId = adSetting.getString("organization_id");
                    console.log("[AD-CONFIG] Found ad config in org:", adConfigOrgId);
                }
            } catch (err) {
                return e.json(200, { enabled: false, reason: "No ad config org" });
            }
        }

        if (!adConfigOrgId) {
            return e.json(200, { enabled: false, reason: "No ad config org found" });
        }

        // Fetch ad config
        try {
            const setting = $app.findFirstRecordByFilter(
                "settings",
                "key = {:key} && organization_id = {:orgId}",
                { key: "ad_config_" + slot, orgId: adConfigOrgId }
            );

            if (setting) {
                const config = setting.get("value");
                return e.json(200, config || { enabled: false });
            }
        } catch (err) {
            // Config not found
        }

        return e.json(200, { enabled: false, reason: "Config not found" });
    } catch (globalErr) {
        console.log("[AD-CONFIG] Error:", globalErr.toString());
        return e.json(500, { message: "Internal error" });
    }
});

/* ============================================================
   2G-PUBLIC. GET PUBLIC AD CONFIG ENDPOINT (No auth required)
   For landing page, blog, and other public pages.
   Only serves whitelisted public slots to prevent data leakage.
   ============================================================ */
console.log("[HOOKS] Registering public-ad-config endpoint...");
routerAdd("GET", "/api/openhr/public-ad-config/{slot}", (e) => {
    try {
        const slot = e.request.pathValue("slot");
        console.log("[PUBLIC-AD-CONFIG] Request received for slot:", slot);

        if (!slot) {
            return e.json(400, { message: "Slot parameter required" });
        }

        // Only allow public-facing ad slots
        const PUBLIC_SLOTS = [
            "landing-hero", "landing-mid",
            "blog-header", "blog-feed",
            "blog-post-top", "blog-post-content"
        ];

        if (PUBLIC_SLOTS.indexOf(slot) === -1) {
            return e.json(403, { message: "Slot not available publicly" });
        }

        // Find ad config organization (same logic as authenticated endpoint)
        let adConfigOrgId = null;

        try {
            const systemOrg = $app.findFirstRecordByFilter("organizations", "name = '__SYSTEM__'");
            if (systemOrg) {
                adConfigOrgId = systemOrg.id;
            }
        } catch (err) {}

        if (!adConfigOrgId) {
            try {
                const platformOrg = $app.findFirstRecordByFilter("organizations", "name = 'Platform'");
                if (platformOrg) {
                    adConfigOrgId = platformOrg.id;
                }
            } catch (err) {}
        }

        if (!adConfigOrgId) {
            try {
                const adSetting = $app.findFirstRecordByFilter("settings", "key ~ 'ad_config_%'");
                if (adSetting) {
                    adConfigOrgId = adSetting.getString("organization_id");
                }
            } catch (err) {
                return e.json(200, { enabled: false, reason: "No ad config org" });
            }
        }

        if (!adConfigOrgId) {
            return e.json(200, { enabled: false, reason: "No ad config org found" });
        }

        // Fetch ad config
        try {
            const setting = $app.findFirstRecordByFilter(
                "settings",
                "key = {:key} && organization_id = {:orgId}",
                { key: "ad_config_" + slot, orgId: adConfigOrgId }
            );

            if (setting) {
                const config = setting.get("value");
                return e.json(200, config || { enabled: false });
            }
        } catch (err) {
            // Config not found
        }

        return e.json(200, { enabled: false, reason: "Config not found" });
    } catch (globalErr) {
        console.log("[PUBLIC-AD-CONFIG] Error:", globalErr.toString());
        return e.json(500, { message: "Internal error" });
    }
});

/* ============================================================
   2H. CONTACT FORM ENDPOINT (Public)
   Method: POST /api/openhr/contact
   Body: JSON { name, email, subject, message }
   ============================================================ */
routerAdd("POST", "/api/openhr/contact", (e) => {
    try {
        console.log("[CONTACT] Request received.");

        let data = {};
        try {
            const requestInfo = e.requestInfo();
            if (requestInfo && requestInfo.body && typeof requestInfo.body === 'object') {
                data = requestInfo.body;
            } else {
                return e.json(400, { message: "Invalid request body structure" });
            }
        } catch (parseErr) {
            return e.json(400, { message: "Invalid request body: " + parseErr.toString() });
        }

        const name = (data.name || "").trim();
        const email = (data.email || "").trim();
        const subject = (data.subject || "").trim();
        const message = (data.message || "").trim();

        // Validate required fields
        if (!name) {
            return e.json(400, { message: "Name is required." });
        }
        if (!email) {
            return e.json(400, { message: "Email is required." });
        }
        if (!message) {
            return e.json(400, { message: "Message is required." });
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return e.json(400, { message: "Please provide a valid email address." });
        }

        // Find all Super Admins
        let superAdmins = [];
        try {
            superAdmins = $app.findRecordsByFilter("users", "role = 'SUPER_ADMIN'");
        } catch (err) {
            console.log("[CONTACT] No super admins found: " + err.toString());
            return e.json(500, { message: "Unable to process your message at this time. Please try again later." });
        }

        if (superAdmins.length === 0) {
            console.log("[CONTACT] No super admin users exist.");
            return e.json(500, { message: "Unable to process your message at this time. Please try again later." });
        }

        // Send email to each Super Admin
        const settings = $app.settings();
        const meta = settings.meta || {};
        const senderAddress = meta.senderAddress || "noreply@openhr.app";
        const senderName = meta.senderName || "OpenHR System";

        const displaySubject = subject || "No Subject";
        const emailSubject = "Contact Form: " + displaySubject;

        let sentCount = 0;
        for (let i = 0; i < superAdmins.length; i++) {
            const sa = superAdmins[i];
            const saEmail = sa.getString("email");

            try {
                const mailMessage = new MailerMessage({
                    from: { address: senderAddress, name: senderName },
                    to: [{ address: saEmail }],
                    subject: emailSubject,
                    html: "<h2>New Contact Form Message</h2>" +
                          "<p>A message was submitted via the contact form:</p>" +
                          "<table style='border-collapse:collapse; margin:16px 0;'>" +
                          "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Name</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + name + "</td></tr>" +
                          "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Email</strong></td><td style='padding:8px;border:1px solid #ddd;'><a href='mailto:" + email + "'>" + email + "</a></td></tr>" +
                          "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Subject</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + displaySubject + "</td></tr>" +
                          "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Message</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + message.replace(/\n/g, "<br>") + "</td></tr>" +
                          "</table>" +
                          "<p style='margin-top:16px; color:#666; font-size:12px;'>You can reply directly to <a href='mailto:" + email + "'>" + email + "</a></p>"
                });
                $app.newMailClient().send(mailMessage);
                sentCount++;
                console.log("[CONTACT] Super Admin notified: " + saEmail);
            } catch (mailErr) {
                console.log("[CONTACT] Failed to notify Super Admin " + saEmail + ": " + mailErr.toString());
            }
        }

        if (sentCount === 0) {
            return e.json(500, { message: "Failed to send your message. Please try again later." });
        }

        console.log("[CONTACT] Message sent to " + sentCount + " super admin(s).");
        return e.json(200, { success: true, message: "Your message has been sent successfully. We'll get back to you soon!" });

    } catch (globalErr) {
        console.log("[CONTACT] Global error: " + globalErr.toString());
        return e.json(500, { message: "Internal Server Error: " + globalErr.toString() });
    }
});

/* ============================================================
   2I. PUBLIC BLOG ENDPOINTS (No Auth Required)
   ============================================================ */

// GET /api/openhr/blog/posts - List all published blog posts
routerAdd("GET", "/api/openhr/blog/posts", (e) => {
    try {
        console.log("[BLOG] Fetching published posts...");

        const requestInfo = e.requestInfo();
        const page = parseInt(requestInfo.query.page || "1") || 1;
        const limit = parseInt(requestInfo.query.limit || "10") || 10;
        const offset = (page - 1) * limit;

        let posts = [];
        try {
            const records = $app.findRecordsByFilter(
                "blog_posts",
                "status = 'PUBLISHED'",
                "-published_at",
                limit,
                offset
            );

            for (let i = 0; i < records.length; i++) {
                const r = records[i];
                let coverUrl = "";
                const coverFile = r.getString("cover_image");
                if (coverFile) {
                    try {
                        const appURL = $app.settings().meta.appURL || "";
                        coverUrl = appURL + "/api/files/" + r.collection().name + "/" + r.id + "/" + coverFile;
                    } catch (urlErr) {
                        console.log("[BLOG] Cover URL error:", urlErr.toString());
                    }
                }

                posts.push({
                    id: r.id,
                    title: r.getString("title"),
                    slug: r.getString("slug"),
                    excerpt: r.getString("excerpt"),
                    cover_image: coverUrl,
                    author_name: r.getString("author_name"),
                    published_at: r.getString("published_at"),
                    created: r.get("created"),
                    updated: r.get("updated")
                });
            }
        } catch (err) {
            // No records found is not an error
            console.log("[BLOG] No published posts found or error:", err.toString());
        }

        // Get total count for pagination
        let totalPosts = 0;
        try {
            const allPublished = $app.findRecordsByFilter("blog_posts", "status = 'PUBLISHED'", "-published_at", 0, 0);
            totalPosts = allPublished.length;
        } catch (countErr) {
            totalPosts = posts.length;
        }

        return e.json(200, {
            success: true,
            posts: posts,
            page: page,
            limit: limit,
            totalPosts: totalPosts,
            totalPages: Math.ceil(totalPosts / limit)
        });

    } catch (globalErr) {
        console.log("[BLOG] Global error:", globalErr.toString());
        return e.json(500, { message: "Internal Server Error: " + globalErr.toString() });
    }
});

// GET /api/openhr/blog/posts/:slug - Get single published blog post by slug
routerAdd("GET", "/api/openhr/blog/posts/{slug}", (e) => {
    try {
        const slug = e.request.pathValue("slug");
        console.log("[BLOG] Fetching post by slug:", slug);

        if (!slug) {
            return e.json(400, { message: "Slug parameter is required" });
        }

        let post = null;
        try {
            const r = $app.findFirstRecordByFilter(
                "blog_posts",
                "slug = {:slug} && status = 'PUBLISHED'",
                { slug: slug }
            );

            let coverUrl = "";
            const coverFile = r.getString("cover_image");
            if (coverFile) {
                try {
                    const appURL = $app.settings().meta.appURL || "";
                    coverUrl = appURL + "/api/files/" + r.collection().name + "/" + r.id + "/" + coverFile;
                } catch (urlErr) {
                    console.log("[BLOG] Cover URL error:", urlErr.toString());
                }
            }

            post = {
                id: r.id,
                title: r.getString("title"),
                slug: r.getString("slug"),
                content: r.getString("content"),
                excerpt: r.getString("excerpt"),
                cover_image: coverUrl,
                author_name: r.getString("author_name"),
                published_at: r.getString("published_at"),
                created: r.get("created"),
                updated: r.get("updated")
            };

        } catch (err) {
            console.log("[BLOG] Post not found for slug:", slug);
            return e.json(404, { success: false, message: "Blog post not found" });
        }

        return e.json(200, { success: true, post: post });

    } catch (globalErr) {
        console.log("[BLOG] Global error:", globalErr.toString());
        return e.json(500, { message: "Internal Server Error: " + globalErr.toString() });
    }
});

/* ============================================================
   2J. PUBLIC TUTORIAL ENDPOINTS (No Auth Required)
   ============================================================ */

// GET /api/openhr/tutorials/posts - List all published tutorials
routerAdd("GET", "/api/openhr/tutorials/posts", (e) => {
    try {
        console.log("[TUTORIALS] Fetching published tutorials...");

        const requestInfo = e.requestInfo();
        const page = parseInt(requestInfo.query.page || "1") || 1;
        const limit = parseInt(requestInfo.query.limit || "100") || 100;
        const offset = (page - 1) * limit;

        let tutorials = [];
        try {
            const records = $app.findRecordsByFilter(
                "tutorials",
                "status = 'PUBLISHED'",
                "display_order,-published_at",
                limit,
                offset
            );

            for (let i = 0; i < records.length; i++) {
                const r = records[i];
                let coverUrl = "";
                const coverFile = r.getString("cover_image");
                if (coverFile) {
                    try {
                        const appURL = $app.settings().meta.appURL || "";
                        coverUrl = appURL + "/api/files/" + r.collection().name + "/" + r.id + "/" + coverFile;
                    } catch (urlErr) {
                        console.log("[TUTORIALS] Cover URL error:", urlErr.toString());
                    }
                }

                tutorials.push({
                    id: r.id,
                    title: r.getString("title"),
                    slug: r.getString("slug"),
                    excerpt: r.getString("excerpt"),
                    cover_image: coverUrl,
                    category: r.getString("category"),
                    parent_id: r.getString("parent_id"),
                    display_order: r.getInt("display_order"),
                    author_name: r.getString("author_name"),
                    published_at: r.getString("published_at"),
                    created: r.get("created"),
                    updated: r.get("updated")
                });
            }
        } catch (err) {
            console.log("[TUTORIALS] No published tutorials found or error:", err.toString());
        }

        // Get total count for pagination
        let totalTutorials = 0;
        try {
            const allPublished = $app.findRecordsByFilter("tutorials", "status = 'PUBLISHED'", "display_order,-published_at", 0, 0);
            totalTutorials = allPublished.length;
        } catch (countErr) {
            totalTutorials = tutorials.length;
        }

        return e.json(200, {
            success: true,
            tutorials: tutorials,
            page: page,
            limit: limit,
            totalTutorials: totalTutorials,
            totalPages: Math.ceil(totalTutorials / limit)
        });

    } catch (globalErr) {
        console.log("[TUTORIALS] Global error:", globalErr.toString());
        return e.json(500, { message: "Internal Server Error: " + globalErr.toString() });
    }
});

// GET /api/openhr/tutorials/posts/:slug - Get single published tutorial by slug
routerAdd("GET", "/api/openhr/tutorials/posts/{slug}", (e) => {
    try {
        const slug = e.request.pathValue("slug");
        console.log("[TUTORIALS] Fetching tutorial by slug:", slug);

        if (!slug) {
            return e.json(400, { message: "Slug parameter is required" });
        }

        let tutorial = null;
        try {
            const r = $app.findFirstRecordByFilter(
                "tutorials",
                "slug = {:slug} && status = 'PUBLISHED'",
                { slug: slug }
            );

            let coverUrl = "";
            const coverFile = r.getString("cover_image");
            if (coverFile) {
                try {
                    const appURL = $app.settings().meta.appURL || "";
                    coverUrl = appURL + "/api/files/" + r.collection().name + "/" + r.id + "/" + coverFile;
                } catch (urlErr) {
                    console.log("[TUTORIALS] Cover URL error:", urlErr.toString());
                }
            }

            tutorial = {
                id: r.id,
                title: r.getString("title"),
                slug: r.getString("slug"),
                content: r.getString("content"),
                excerpt: r.getString("excerpt"),
                cover_image: coverUrl,
                category: r.getString("category"),
                parent_id: r.getString("parent_id"),
                display_order: r.getInt("display_order"),
                author_name: r.getString("author_name"),
                published_at: r.getString("published_at"),
                created: r.get("created"),
                updated: r.get("updated")
            };

        } catch (err) {
            console.log("[TUTORIALS] Tutorial not found for slug:", slug);
            return e.json(404, { success: false, message: "Tutorial not found" });
        }

        return e.json(200, { success: true, tutorial: tutorial });

    } catch (globalErr) {
        console.log("[TUTORIALS] Global error:", globalErr.toString());
        return e.json(500, { message: "Internal Server Error: " + globalErr.toString() });
    }
});

/* ============================================================
   3. EMAIL NOTIFICATIONS (Queued)
   ============================================================ */
try {
    onRecordAfterCreateSuccess((e) => {
        const record = e.record;
        if (record.get("status") !== "PENDING") return;

        try {
            const appName = "OpenHR System"; 
            const settings = $app.settings(); 
            const meta = settings.meta || {};
            const senderAddress = meta.senderAddress || "noreply@openhr.app";
            const senderName = meta.senderName || appName;

            const message = new MailerMessage({
                from: { address: senderAddress, name: senderName },
                to: [{ address: record.getString("recipient_email") }],
                subject: record.getString("subject"),
                html: record.getString("html_content"),
            });

            $app.newMailClient().send(message);

            record.set("status", "SENT");
            record.set("sent_at", new Date().toISOString());
            $app.save(record);

        } catch (err) {
            record.set("status", "FAILED");
            record.set("error_message", err.toString());
            $app.save(record);
        }
    }, "reports_queue");
} catch(e) {}

/* ============================================================
   4. UPGRADE REQUEST NOTIFICATIONS (To Super Admin)
   ============================================================ */
try {
    onRecordAfterCreateSuccess((e) => {
        const request = e.record;
        const orgId = request.getString("organization_id");
        const requestType = request.getString("request_type");

        try {
            // Get organization details
            const org = $app.findRecordById("organizations", orgId);
            const orgName = org.getString("name");

            // Get requesting admin
            let adminName = "Unknown";
            let adminEmail = "Unknown";
            try {
                const admins = $app.findRecordsByFilter("users", "organization_id = {:orgId} && role = 'ADMIN'", { orgId: orgId });
                if (admins.length > 0) {
                    adminName = admins[0].getString("name");
                    adminEmail = admins[0].getString("email");
                }
            } catch (e) {}

            // Find all Super Admins and notify them
            const superAdmins = $app.findRecordsByFilter("users", "role = 'SUPER_ADMIN'");
            if (superAdmins.length > 0) {
                const settings = $app.settings();
                const meta = settings.meta || {};
                const senderAddress = meta.senderAddress || "noreply@openhr.app";
                const senderName = meta.senderName || "OpenHR System";

                let requestDetails = "";
                if (requestType === "DONATION") {
                    const tier = request.getString("donation_tier") || "N/A";
                    const amount = request.getInt("donation_amount") || 0;
                    const ref = request.getString("donation_reference") || "N/A";
                    requestDetails = "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Type</strong></td><td style='padding:8px;border:1px solid #ddd;'>Donation Activation</td></tr>" +
                                    "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Tier</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + tier + "</td></tr>" +
                                    "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Amount</strong></td><td style='padding:8px;border:1px solid #ddd;'>$" + amount + "</td></tr>" +
                                    "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Reference</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + ref + "</td></tr>";
                } else if (requestType === "TRIAL_EXTENSION") {
                    const days = request.getInt("extension_days") || 14;
                    const reason = request.getString("extension_reason") || "N/A";
                    requestDetails = "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Type</strong></td><td style='padding:8px;border:1px solid #ddd;'>Trial Extension</td></tr>" +
                                    "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Days Requested</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + days + " days</td></tr>" +
                                    "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Reason</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + reason + "</td></tr>";
                } else if (requestType === "AD_SUPPORTED") {
                    requestDetails = "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Type</strong></td><td style='padding:8px;border:1px solid #ddd;'>Ad-Supported Mode</td></tr>";
                }

                for (let i = 0; i < superAdmins.length; i++) {
                    const sa = superAdmins[i];
                    const saEmail = sa.getString("email");

                    try {
                        const message = new MailerMessage({
                            from: { address: senderAddress, name: senderName },
                            to: [{ address: saEmail }],
                            subject: "New Upgrade Request: " + orgName,
                            html: "<h2>New Upgrade Request</h2>" +
                                  "<p>A new upgrade request has been submitted:</p>" +
                                  "<table style='border-collapse:collapse;'>" +
                                  "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Organization</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + orgName + "</td></tr>" +
                                  "<tr><td style='padding:8px;border:1px solid #ddd;'><strong>Admin</strong></td><td style='padding:8px;border:1px solid #ddd;'>" + adminName + " (" + adminEmail + ")</td></tr>" +
                                  requestDetails +
                                  "</table>" +
                                  "<p style='margin-top:16px;'>Login to the Super Admin dashboard to review and process this request.</p>"
                        });
                        $app.newMailClient().send(message);
                        console.log("[UPGRADE-REQUEST] Super Admin notified: " + saEmail);
                    } catch (mailErr) {
                        console.log("[UPGRADE-REQUEST] Failed to notify Super Admin: " + mailErr.toString());
                    }
                }
            }
        } catch (err) {
            console.log("[UPGRADE-REQUEST] Notification error: " + err.toString());
        }
    }, "upgrade_requests");
} catch(e) {
    console.log("[HOOKS] Could not register upgrade_requests hook: " + e.toString());
}

/* ============================================================
   5. ORGANIZATION SUBSCRIPTION STATUS CHANGE NOTIFICATIONS
   ============================================================ */
try {
    onRecordAfterUpdateSuccess((e) => {
        const org = e.record;
        const orgName = org.getString("name");
        const orgId = org.id;

        // Skip system organizations
        if (orgName === "__SYSTEM__" || orgName === "Platform") return;

        // Check if subscription_status changed
        const newStatus = org.getString("subscription_status");
        const oldStatus = e.record.original()?.getString("subscription_status");

        // If status didn't change, skip
        if (!oldStatus || oldStatus === newStatus) return;

        console.log("[ORG-UPDATE] Subscription status changed for " + orgName + ": " + oldStatus + " -> " + newStatus);

        try {
            // Find org admins
            const admins = $app.findRecordsByFilter("users", "organization_id = {:orgId} && role = 'ADMIN'", { orgId: orgId });
            if (admins.length === 0) return;

            const settings = $app.settings();
            const meta = settings.meta || {};
            const senderAddress = meta.senderAddress || "noreply@openhr.app";
            const senderName = meta.senderName || "OpenHR System";

            let statusMessage = "";
            let statusColor = "#3b82f6"; // blue default

            switch (newStatus) {
                case "ACTIVE":
                    statusMessage = "Your organization now has <strong>full access</strong> to all OpenHR features.";
                    statusColor = "#10b981"; // green
                    break;
                case "TRIAL":
                    const trialEnd = org.getString("trial_end_date");
                    const endDate = trialEnd ? trialEnd.split("T")[0] : "N/A";
                    statusMessage = "Your organization is in <strong>trial mode</strong>. Trial ends on " + endDate + ".";
                    statusColor = "#f59e0b"; // amber
                    break;
                case "EXPIRED":
                    statusMessage = "Your trial has <strong>expired</strong>. Your account is now in read-only mode. Please upgrade to continue using all features.";
                    statusColor = "#ef4444"; // red
                    break;
                case "SUSPENDED":
                    statusMessage = "Your organization has been <strong>suspended</strong>. Please contact support for assistance.";
                    statusColor = "#ef4444"; // red
                    break;
                case "AD_SUPPORTED":
                    statusMessage = "Your organization is now in <strong>ad-supported mode</strong>. You have full access with advertisements.";
                    statusColor = "#8b5cf6"; // purple
                    break;
            }

            for (let i = 0; i < admins.length; i++) {
                const admin = admins[i];
                const adminEmail = admin.getString("email");
                const adminName = admin.getString("name");

                try {
                    const message = new MailerMessage({
                        from: { address: senderAddress, name: senderName },
                        to: [{ address: adminEmail }],
                        subject: "Subscription Status Changed - " + orgName,
                        html: "<h2>Subscription Status Update</h2>" +
                              "<p>Dear " + adminName + ",</p>" +
                              "<p>Your organization's subscription status has been updated:</p>" +
                              "<table style='border-collapse:collapse; margin:16px 0;'>" +
                              "<tr><td style='padding:12px;border:1px solid #ddd;'><strong>Organization</strong></td><td style='padding:12px;border:1px solid #ddd;'>" + orgName + "</td></tr>" +
                              "<tr><td style='padding:12px;border:1px solid #ddd;'><strong>Previous Status</strong></td><td style='padding:12px;border:1px solid #ddd;'>" + oldStatus + "</td></tr>" +
                              "<tr><td style='padding:12px;border:1px solid #ddd;'><strong>New Status</strong></td><td style='padding:12px;border:1px solid #ddd;color:" + statusColor + ";font-weight:bold;'>" + newStatus + "</td></tr>" +
                              "</table>" +
                              "<p>" + statusMessage + "</p>" +
                              "<p>Thank you for using OpenHR!</p>"
                    });
                    $app.newMailClient().send(message);
                    console.log("[ORG-UPDATE] Admin notified of status change: " + adminEmail);
                } catch (mailErr) {
                    console.log("[ORG-UPDATE] Failed to send notification: " + mailErr.toString());
                }
            }
        } catch (err) {
            console.log("[ORG-UPDATE] Error sending notifications: " + err.toString());
        }
    }, "organizations");
} catch(e) {
    console.log("[HOOKS] Could not register organizations update hook: " + e.toString());
}

/* ============================================================
   6. LEAVE NOTIFICATIONS
   → MOVED to leave_notifications.pb.js (separate file for safety)
   ============================================================ */

/* ============================================================
   6. EMPLOYEE VERIFICATION EMAIL (When Admin Creates Employee)
   ============================================================ */
try {
    onRecordAfterCreateSuccess((e) => {
        const user = e.record;
        const role = user.getString("role");
        const email = user.getString("email");
        const isVerified = user.get("verified");

        // Skip if user is already verified (e.g., during registration)
        // Only send verification email for newly created employees by admin
        if (isVerified) {
            return;
        }

        // Skip if this is an admin or super admin (they verify during registration flow)
        if (role === "ADMIN" || role === "SUPER_ADMIN") {
            return;
        }

        try {
            console.log("[EMPLOYEE-CREATE] Sending verification email to new employee:", email);

            // Use PocketBase's built-in verification email (URL rewritten by onMailerRecordVerificationSend hook)
            $mails.sendRecordVerification($app, user);

            console.log("[EMPLOYEE-CREATE] Verification email sent successfully to:", email);
        } catch (emailErr) {
            console.error("[EMPLOYEE-CREATE] Failed to send verification email:", emailErr.toString());
            // Non-fatal: Employee can request verification email resend
        }
    }, "users");
} catch(e) {
    console.error("[EMPLOYEE-CREATE-HOOK] Failed to register hook:", e.toString());
}

/* ============================================================
   HELPER FUNCTIONS - Country-Based Defaults
   ============================================================ */

// Helper function to load country-based holidays
// NOTE: Lunar / Islamic / Hijri-calendar holidays shift each year. Where dates
// are calendar-dependent (Eid, Diwali, Lunar New Year, etc.) we either omit
// them or include conservative 2026 estimates — admins can adjust via the
// Organization → HOLIDAYS tab. Fixed-date national holidays are authoritative.
function loadHolidaysForCountry(countryCode) {
    const holidayData = {
        // ─────────────── ASIA ───────────────
        "BD": [
            { id: "bd-h1", date: "2026-02-21", name: "International Mother Language Day", isGovernment: true, type: "NATIONAL" },
            { id: "bd-h2", date: "2026-03-17", name: "Sheikh Mujibur Rahman's Birthday", isGovernment: true, type: "NATIONAL" },
            { id: "bd-h3", date: "2026-03-26", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "bd-h4", date: "2026-04-14", name: "Pohela Boishakh (Bengali New Year)", isGovernment: true, type: "FESTIVAL" },
            { id: "bd-h5", date: "2026-05-01", name: "May Day", isGovernment: true, type: "NATIONAL" },
            { id: "bd-h6", date: "2026-08-15", name: "National Mourning Day", isGovernment: true, type: "NATIONAL" },
            { id: "bd-h7", date: "2026-12-16", name: "Victory Day", isGovernment: true, type: "NATIONAL" },
            { id: "bd-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "IN": [
            { id: "in-h1", date: "2026-01-26", name: "Republic Day", isGovernment: true, type: "NATIONAL" },
            { id: "in-h2", date: "2026-03-04", name: "Holi", isGovernment: true, type: "FESTIVAL" },
            { id: "in-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "in-h4", date: "2026-08-15", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "in-h5", date: "2026-10-02", name: "Gandhi Jayanti", isGovernment: true, type: "NATIONAL" },
            { id: "in-h6", date: "2026-10-20", name: "Dussehra", isGovernment: true, type: "FESTIVAL" },
            { id: "in-h7", date: "2026-11-08", name: "Diwali", isGovernment: true, type: "FESTIVAL" },
            { id: "in-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "NP": [
            { id: "np-h1", date: "2026-01-11", name: "Prithvi Jayanti", isGovernment: true, type: "NATIONAL" },
            { id: "np-h2", date: "2026-01-30", name: "Martyrs' Day", isGovernment: true, type: "NATIONAL" },
            { id: "np-h3", date: "2026-02-19", name: "Democracy Day", isGovernment: true, type: "NATIONAL" },
            { id: "np-h4", date: "2026-03-04", name: "Holi (Phagu Purnima)", isGovernment: true, type: "FESTIVAL" },
            { id: "np-h5", date: "2026-04-14", name: "Nepali New Year", isGovernment: true, type: "FESTIVAL" },
            { id: "np-h6", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "np-h7", date: "2026-05-28", name: "Republic Day", isGovernment: true, type: "NATIONAL" },
            { id: "np-h8", date: "2026-09-20", name: "Constitution Day", isGovernment: true, type: "NATIONAL" },
            { id: "np-h9", date: "2026-10-19", name: "Dashain (Vijaya Dashami)", isGovernment: true, type: "FESTIVAL" },
            { id: "np-h10", date: "2026-11-09", name: "Tihar (Deepawali)", isGovernment: true, type: "FESTIVAL" },
            { id: "np-h11", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "PK": [
            { id: "pk-h1", date: "2026-02-05", name: "Kashmir Solidarity Day", isGovernment: true, type: "NATIONAL" },
            { id: "pk-h2", date: "2026-03-23", name: "Pakistan Day", isGovernment: true, type: "NATIONAL" },
            { id: "pk-h3", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "pk-h4", date: "2026-08-14", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "pk-h5", date: "2026-11-09", name: "Iqbal Day", isGovernment: true, type: "NATIONAL" },
            { id: "pk-h6", date: "2026-12-25", name: "Quaid-e-Azam Day", isGovernment: true, type: "NATIONAL" }
        ],
        "LK": [
            { id: "lk-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "lk-h2", date: "2026-02-04", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "lk-h3", date: "2026-04-13", name: "Sinhala & Tamil New Year's Eve", isGovernment: true, type: "FESTIVAL" },
            { id: "lk-h4", date: "2026-04-14", name: "Sinhala & Tamil New Year's Day", isGovernment: true, type: "FESTIVAL" },
            { id: "lk-h5", date: "2026-05-01", name: "May Day", isGovernment: true, type: "NATIONAL" },
            { id: "lk-h6", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "MY": [
            { id: "my-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "my-h2", date: "2026-02-01", name: "Federal Territory Day", isGovernment: true, type: "NATIONAL" },
            { id: "my-h3", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "my-h4", date: "2026-06-01", name: "Agong's Birthday", isGovernment: true, type: "NATIONAL" },
            { id: "my-h5", date: "2026-08-31", name: "Merdeka (National Day)", isGovernment: true, type: "NATIONAL" },
            { id: "my-h6", date: "2026-09-16", name: "Malaysia Day", isGovernment: true, type: "NATIONAL" },
            { id: "my-h7", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "SG": [
            { id: "sg-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "sg-h2", date: "2026-02-17", name: "Chinese New Year", isGovernment: true, type: "FESTIVAL" },
            { id: "sg-h3", date: "2026-02-18", name: "Chinese New Year (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "sg-h4", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "sg-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "sg-h6", date: "2026-08-09", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "sg-h7", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "ID": [
            { id: "id-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "id-h2", date: "2026-02-17", name: "Lunar New Year", isGovernment: true, type: "FESTIVAL" },
            { id: "id-h3", date: "2026-03-19", name: "Day of Silence (Nyepi)", isGovernment: true, type: "FESTIVAL" },
            { id: "id-h4", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "id-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "id-h6", date: "2026-06-01", name: "Pancasila Day", isGovernment: true, type: "NATIONAL" },
            { id: "id-h7", date: "2026-08-17", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "id-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "TH": [
            { id: "th-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "th-h2", date: "2026-04-06", name: "Chakri Memorial Day", isGovernment: true, type: "NATIONAL" },
            { id: "th-h3", date: "2026-04-13", name: "Songkran Festival", isGovernment: true, type: "FESTIVAL" },
            { id: "th-h4", date: "2026-04-14", name: "Songkran Festival (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "th-h5", date: "2026-04-15", name: "Songkran Festival (Day 3)", isGovernment: true, type: "FESTIVAL" },
            { id: "th-h6", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "th-h7", date: "2026-05-04", name: "Coronation Day", isGovernment: true, type: "NATIONAL" },
            { id: "th-h8", date: "2026-07-28", name: "King Vajiralongkorn's Birthday", isGovernment: true, type: "NATIONAL" },
            { id: "th-h9", date: "2026-08-12", name: "Mother's Day", isGovernment: true, type: "NATIONAL" },
            { id: "th-h10", date: "2026-12-05", name: "Father's Day", isGovernment: true, type: "NATIONAL" },
            { id: "th-h11", date: "2026-12-10", name: "Constitution Day", isGovernment: true, type: "NATIONAL" },
            { id: "th-h12", date: "2026-12-31", name: "New Year's Eve", isGovernment: true, type: "NATIONAL" }
        ],
        "VN": [
            { id: "vn-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "vn-h2", date: "2026-02-17", name: "Lunar New Year (Tet)", isGovernment: true, type: "FESTIVAL" },
            { id: "vn-h3", date: "2026-04-26", name: "Hung Kings' Festival", isGovernment: true, type: "FESTIVAL" },
            { id: "vn-h4", date: "2026-04-30", name: "Reunification Day", isGovernment: true, type: "NATIONAL" },
            { id: "vn-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "vn-h6", date: "2026-09-02", name: "National Day", isGovernment: true, type: "NATIONAL" }
        ],
        "PH": [
            { id: "ph-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ph-h2", date: "2026-04-02", name: "Maundy Thursday", isGovernment: true, type: "FESTIVAL" },
            { id: "ph-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "ph-h4", date: "2026-04-09", name: "Day of Valor", isGovernment: true, type: "NATIONAL" },
            { id: "ph-h5", date: "2026-05-01", name: "Labor Day", isGovernment: true, type: "NATIONAL" },
            { id: "ph-h6", date: "2026-06-12", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "ph-h7", date: "2026-08-31", name: "National Heroes Day", isGovernment: true, type: "NATIONAL" },
            { id: "ph-h8", date: "2026-11-30", name: "Bonifacio Day", isGovernment: true, type: "NATIONAL" },
            { id: "ph-h9", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "ph-h10", date: "2026-12-30", name: "Rizal Day", isGovernment: true, type: "NATIONAL" }
        ],
        "JP": [
            { id: "jp-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "jp-h2", date: "2026-01-12", name: "Coming of Age Day", isGovernment: true, type: "NATIONAL" },
            { id: "jp-h3", date: "2026-02-11", name: "National Foundation Day", isGovernment: true, type: "NATIONAL" },
            { id: "jp-h4", date: "2026-02-23", name: "Emperor's Birthday", isGovernment: true, type: "NATIONAL" },
            { id: "jp-h5", date: "2026-04-29", name: "Showa Day", isGovernment: true, type: "NATIONAL" },
            { id: "jp-h6", date: "2026-05-03", name: "Constitution Memorial Day", isGovernment: true, type: "NATIONAL" },
            { id: "jp-h7", date: "2026-05-04", name: "Greenery Day", isGovernment: true, type: "NATIONAL" },
            { id: "jp-h8", date: "2026-05-05", name: "Children's Day", isGovernment: true, type: "NATIONAL" },
            { id: "jp-h9", date: "2026-08-11", name: "Mountain Day", isGovernment: true, type: "NATIONAL" },
            { id: "jp-h10", date: "2026-11-03", name: "Culture Day", isGovernment: true, type: "NATIONAL" },
            { id: "jp-h11", date: "2026-11-23", name: "Labour Thanksgiving Day", isGovernment: true, type: "NATIONAL" }
        ],
        "KR": [
            { id: "kr-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "kr-h2", date: "2026-02-16", name: "Seollal (Lunar New Year)", isGovernment: true, type: "FESTIVAL" },
            { id: "kr-h3", date: "2026-03-01", name: "Independence Movement Day", isGovernment: true, type: "NATIONAL" },
            { id: "kr-h4", date: "2026-05-05", name: "Children's Day", isGovernment: true, type: "NATIONAL" },
            { id: "kr-h5", date: "2026-06-06", name: "Memorial Day", isGovernment: true, type: "NATIONAL" },
            { id: "kr-h6", date: "2026-08-15", name: "Liberation Day", isGovernment: true, type: "NATIONAL" },
            { id: "kr-h7", date: "2026-09-25", name: "Chuseok (Mid-Autumn)", isGovernment: true, type: "FESTIVAL" },
            { id: "kr-h8", date: "2026-10-03", name: "National Foundation Day", isGovernment: true, type: "NATIONAL" },
            { id: "kr-h9", date: "2026-10-09", name: "Hangul Day", isGovernment: true, type: "NATIONAL" },
            { id: "kr-h10", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "CN": [
            { id: "cn-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "cn-h2", date: "2026-02-17", name: "Spring Festival", isGovernment: true, type: "FESTIVAL" },
            { id: "cn-h3", date: "2026-04-05", name: "Qingming Festival", isGovernment: true, type: "FESTIVAL" },
            { id: "cn-h4", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "cn-h5", date: "2026-06-19", name: "Dragon Boat Festival", isGovernment: true, type: "FESTIVAL" },
            { id: "cn-h6", date: "2026-09-25", name: "Mid-Autumn Festival", isGovernment: true, type: "FESTIVAL" },
            { id: "cn-h7", date: "2026-10-01", name: "National Day", isGovernment: true, type: "NATIONAL" }
        ],
        "HK": [
            { id: "hk-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "hk-h2", date: "2026-02-17", name: "Lunar New Year", isGovernment: true, type: "FESTIVAL" },
            { id: "hk-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "hk-h4", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "hk-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "hk-h6", date: "2026-07-01", name: "HKSAR Establishment Day", isGovernment: true, type: "NATIONAL" },
            { id: "hk-h7", date: "2026-10-01", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "hk-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "hk-h9", date: "2026-12-26", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "TW": [
            { id: "tw-h1", date: "2026-01-01", name: "Founding Day", isGovernment: true, type: "NATIONAL" },
            { id: "tw-h2", date: "2026-02-17", name: "Lunar New Year", isGovernment: true, type: "FESTIVAL" },
            { id: "tw-h3", date: "2026-02-28", name: "228 Peace Memorial Day", isGovernment: true, type: "NATIONAL" },
            { id: "tw-h4", date: "2026-04-04", name: "Tomb Sweeping Day", isGovernment: true, type: "FESTIVAL" },
            { id: "tw-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "tw-h6", date: "2026-06-19", name: "Dragon Boat Festival", isGovernment: true, type: "FESTIVAL" },
            { id: "tw-h7", date: "2026-09-25", name: "Mid-Autumn Festival", isGovernment: true, type: "FESTIVAL" },
            { id: "tw-h8", date: "2026-10-10", name: "National Day", isGovernment: true, type: "NATIONAL" }
        ],

        // ─────────────── MIDDLE EAST ───────────────
        "AE": [
            { id: "ae-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ae-h2", date: "2026-12-01", name: "Commemoration Day", isGovernment: true, type: "NATIONAL" },
            { id: "ae-h3", date: "2026-12-02", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "ae-h4", date: "2026-12-03", name: "National Day Holiday", isGovernment: true, type: "NATIONAL" }
        ],
        "SA": [
            { id: "sa-h1", date: "2026-02-22", name: "Foundation Day", isGovernment: true, type: "NATIONAL" },
            { id: "sa-h2", date: "2026-09-23", name: "Saudi National Day", isGovernment: true, type: "NATIONAL" }
        ],
        "QA": [
            { id: "qa-h1", date: "2026-02-10", name: "National Sport Day", isGovernment: true, type: "NATIONAL" },
            { id: "qa-h2", date: "2026-12-18", name: "Qatar National Day", isGovernment: true, type: "NATIONAL" }
        ],
        "KW": [
            { id: "kw-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "kw-h2", date: "2026-02-25", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "kw-h3", date: "2026-02-26", name: "Liberation Day", isGovernment: true, type: "NATIONAL" }
        ],
        "BH": [
            { id: "bh-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "bh-h2", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "bh-h3", date: "2026-12-16", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "bh-h4", date: "2026-12-17", name: "National Day Holiday", isGovernment: true, type: "NATIONAL" }
        ],
        "OM": [
            { id: "om-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "om-h2", date: "2026-11-18", name: "National Day", isGovernment: true, type: "NATIONAL" }
        ],
        "IL": [
            { id: "il-h1", date: "2026-04-22", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "il-h2", date: "2026-04-02", name: "Passover (Pesach)", isGovernment: true, type: "FESTIVAL" },
            { id: "il-h3", date: "2026-05-22", name: "Shavuot", isGovernment: true, type: "FESTIVAL" },
            { id: "il-h4", date: "2026-09-12", name: "Rosh Hashanah", isGovernment: true, type: "FESTIVAL" },
            { id: "il-h5", date: "2026-09-21", name: "Yom Kippur", isGovernment: true, type: "FESTIVAL" }
        ],
        "TR": [
            { id: "tr-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "tr-h2", date: "2026-04-23", name: "National Sovereignty Day", isGovernment: true, type: "NATIONAL" },
            { id: "tr-h3", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "tr-h4", date: "2026-05-19", name: "Atatürk Memorial / Youth Day", isGovernment: true, type: "NATIONAL" },
            { id: "tr-h5", date: "2026-07-15", name: "Democracy & National Unity Day", isGovernment: true, type: "NATIONAL" },
            { id: "tr-h6", date: "2026-08-30", name: "Victory Day", isGovernment: true, type: "NATIONAL" },
            { id: "tr-h7", date: "2026-10-29", name: "Republic Day", isGovernment: true, type: "NATIONAL" }
        ],

        // ─────────────── EUROPE ───────────────
        "GB": [
            { id: "gb-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "gb-h2", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "gb-h3", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "gb-h4", date: "2026-05-04", name: "Early May Bank Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "gb-h5", date: "2026-05-25", name: "Spring Bank Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "gb-h6", date: "2026-08-31", name: "Summer Bank Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "gb-h7", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "gb-h8", date: "2026-12-28", name: "Boxing Day (Substitute)", isGovernment: true, type: "FESTIVAL" }
        ],
        "IE": [
            { id: "ie-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ie-h2", date: "2026-02-02", name: "St. Brigid's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ie-h3", date: "2026-03-17", name: "St. Patrick's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ie-h4", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "ie-h5", date: "2026-05-04", name: "May Bank Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "ie-h6", date: "2026-06-01", name: "June Bank Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "ie-h7", date: "2026-08-03", name: "August Bank Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "ie-h8", date: "2026-10-26", name: "October Bank Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "ie-h9", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "ie-h10", date: "2026-12-26", name: "St. Stephen's Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "DE": [
            { id: "de-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "de-h2", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "de-h3", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "de-h4", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "de-h5", date: "2026-05-14", name: "Ascension Day", isGovernment: true, type: "FESTIVAL" },
            { id: "de-h6", date: "2026-05-25", name: "Whit Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "de-h7", date: "2026-10-03", name: "German Unity Day", isGovernment: true, type: "NATIONAL" },
            { id: "de-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "de-h9", date: "2026-12-26", name: "St. Stephen's Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "FR": [
            { id: "fr-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "fr-h2", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "fr-h3", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "fr-h4", date: "2026-05-08", name: "Victory in Europe Day", isGovernment: true, type: "NATIONAL" },
            { id: "fr-h5", date: "2026-05-14", name: "Ascension Day", isGovernment: true, type: "FESTIVAL" },
            { id: "fr-h6", date: "2026-05-25", name: "Whit Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "fr-h7", date: "2026-07-14", name: "Bastille Day", isGovernment: true, type: "NATIONAL" },
            { id: "fr-h8", date: "2026-08-15", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "fr-h9", date: "2026-11-01", name: "All Saints' Day", isGovernment: true, type: "FESTIVAL" },
            { id: "fr-h10", date: "2026-11-11", name: "Armistice Day", isGovernment: true, type: "NATIONAL" },
            { id: "fr-h11", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "IT": [
            { id: "it-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "it-h2", date: "2026-01-06", name: "Epiphany", isGovernment: true, type: "FESTIVAL" },
            { id: "it-h3", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "it-h4", date: "2026-04-25", name: "Liberation Day", isGovernment: true, type: "NATIONAL" },
            { id: "it-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "it-h6", date: "2026-06-02", name: "Republic Day", isGovernment: true, type: "NATIONAL" },
            { id: "it-h7", date: "2026-08-15", name: "Ferragosto", isGovernment: true, type: "FESTIVAL" },
            { id: "it-h8", date: "2026-11-01", name: "All Saints' Day", isGovernment: true, type: "FESTIVAL" },
            { id: "it-h9", date: "2026-12-08", name: "Immaculate Conception", isGovernment: true, type: "FESTIVAL" },
            { id: "it-h10", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "it-h11", date: "2026-12-26", name: "St. Stephen's Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "ES": [
            { id: "es-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "es-h2", date: "2026-01-06", name: "Epiphany", isGovernment: true, type: "FESTIVAL" },
            { id: "es-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "es-h4", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "es-h5", date: "2026-08-15", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "es-h6", date: "2026-10-12", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "es-h7", date: "2026-11-01", name: "All Saints' Day", isGovernment: true, type: "FESTIVAL" },
            { id: "es-h8", date: "2026-12-06", name: "Constitution Day", isGovernment: true, type: "NATIONAL" },
            { id: "es-h9", date: "2026-12-08", name: "Immaculate Conception", isGovernment: true, type: "FESTIVAL" },
            { id: "es-h10", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "NL": [
            { id: "nl-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "nl-h2", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "nl-h3", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "nl-h4", date: "2026-04-27", name: "King's Day", isGovernment: true, type: "NATIONAL" },
            { id: "nl-h5", date: "2026-05-05", name: "Liberation Day", isGovernment: true, type: "NATIONAL" },
            { id: "nl-h6", date: "2026-05-14", name: "Ascension Day", isGovernment: true, type: "FESTIVAL" },
            { id: "nl-h7", date: "2026-05-25", name: "Whit Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "nl-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "nl-h9", date: "2026-12-26", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "BE": [
            { id: "be-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "be-h2", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "be-h3", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "be-h4", date: "2026-05-14", name: "Ascension Day", isGovernment: true, type: "FESTIVAL" },
            { id: "be-h5", date: "2026-05-25", name: "Whit Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "be-h6", date: "2026-07-21", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "be-h7", date: "2026-08-15", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "be-h8", date: "2026-11-01", name: "All Saints' Day", isGovernment: true, type: "FESTIVAL" },
            { id: "be-h9", date: "2026-11-11", name: "Armistice Day", isGovernment: true, type: "NATIONAL" },
            { id: "be-h10", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "AT": [
            { id: "at-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "at-h2", date: "2026-01-06", name: "Epiphany", isGovernment: true, type: "FESTIVAL" },
            { id: "at-h3", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "at-h4", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "at-h5", date: "2026-05-14", name: "Ascension Day", isGovernment: true, type: "FESTIVAL" },
            { id: "at-h6", date: "2026-05-25", name: "Whit Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "at-h7", date: "2026-08-15", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "at-h8", date: "2026-10-26", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "at-h9", date: "2026-11-01", name: "All Saints' Day", isGovernment: true, type: "FESTIVAL" },
            { id: "at-h10", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "at-h11", date: "2026-12-26", name: "St. Stephen's Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "CH": [
            { id: "ch-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ch-h2", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "ch-h3", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "ch-h4", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "ch-h5", date: "2026-05-14", name: "Ascension Day", isGovernment: true, type: "FESTIVAL" },
            { id: "ch-h6", date: "2026-08-01", name: "Swiss National Day", isGovernment: true, type: "NATIONAL" },
            { id: "ch-h7", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "ch-h8", date: "2026-12-26", name: "St. Stephen's Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "SE": [
            { id: "se-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "se-h2", date: "2026-01-06", name: "Epiphany", isGovernment: true, type: "FESTIVAL" },
            { id: "se-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "se-h4", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "se-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "se-h6", date: "2026-05-14", name: "Ascension Day", isGovernment: true, type: "FESTIVAL" },
            { id: "se-h7", date: "2026-06-06", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "se-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "se-h9", date: "2026-12-26", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "NO": [
            { id: "no-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "no-h2", date: "2026-04-02", name: "Maundy Thursday", isGovernment: true, type: "FESTIVAL" },
            { id: "no-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "no-h4", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "no-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "no-h6", date: "2026-05-14", name: "Ascension Day", isGovernment: true, type: "FESTIVAL" },
            { id: "no-h7", date: "2026-05-17", name: "Constitution Day", isGovernment: true, type: "NATIONAL" },
            { id: "no-h8", date: "2026-05-25", name: "Whit Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "no-h9", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "no-h10", date: "2026-12-26", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "DK": [
            { id: "dk-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "dk-h2", date: "2026-04-02", name: "Maundy Thursday", isGovernment: true, type: "FESTIVAL" },
            { id: "dk-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "dk-h4", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "dk-h5", date: "2026-05-14", name: "Ascension Day", isGovernment: true, type: "FESTIVAL" },
            { id: "dk-h6", date: "2026-05-25", name: "Whit Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "dk-h7", date: "2026-12-24", name: "Christmas Eve", isGovernment: true, type: "FESTIVAL" },
            { id: "dk-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "dk-h9", date: "2026-12-26", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "FI": [
            { id: "fi-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "fi-h2", date: "2026-01-06", name: "Epiphany", isGovernment: true, type: "FESTIVAL" },
            { id: "fi-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "fi-h4", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "fi-h5", date: "2026-05-01", name: "May Day", isGovernment: true, type: "NATIONAL" },
            { id: "fi-h6", date: "2026-05-14", name: "Ascension Day", isGovernment: true, type: "FESTIVAL" },
            { id: "fi-h7", date: "2026-06-19", name: "Midsummer Eve", isGovernment: true, type: "FESTIVAL" },
            { id: "fi-h8", date: "2026-12-06", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "fi-h9", date: "2026-12-24", name: "Christmas Eve", isGovernment: true, type: "FESTIVAL" },
            { id: "fi-h10", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "fi-h11", date: "2026-12-26", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
        ],

        // ─────────────── AMERICAS ───────────────
        "US": [
            { id: "us-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "us-h2", date: "2026-01-19", name: "Martin Luther King Jr. Day", isGovernment: true, type: "NATIONAL" },
            { id: "us-h3", date: "2026-02-16", name: "Presidents' Day", isGovernment: true, type: "NATIONAL" },
            { id: "us-h4", date: "2026-05-25", name: "Memorial Day", isGovernment: true, type: "NATIONAL" },
            { id: "us-h5", date: "2026-06-19", name: "Juneteenth", isGovernment: true, type: "NATIONAL" },
            { id: "us-h6", date: "2026-07-04", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "us-h7", date: "2026-09-07", name: "Labor Day", isGovernment: true, type: "NATIONAL" },
            { id: "us-h8", date: "2026-10-12", name: "Columbus Day", isGovernment: true, type: "NATIONAL" },
            { id: "us-h9", date: "2026-11-11", name: "Veterans Day", isGovernment: true, type: "NATIONAL" },
            { id: "us-h10", date: "2026-11-26", name: "Thanksgiving Day", isGovernment: true, type: "NATIONAL" },
            { id: "us-h11", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "CA": [
            { id: "ca-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ca-h2", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "ca-h3", date: "2026-05-18", name: "Victoria Day", isGovernment: true, type: "NATIONAL" },
            { id: "ca-h4", date: "2026-07-01", name: "Canada Day", isGovernment: true, type: "NATIONAL" },
            { id: "ca-h5", date: "2026-09-07", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "ca-h6", date: "2026-10-12", name: "Thanksgiving", isGovernment: true, type: "NATIONAL" },
            { id: "ca-h7", date: "2026-11-11", name: "Remembrance Day", isGovernment: true, type: "NATIONAL" },
            { id: "ca-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "ca-h9", date: "2026-12-28", name: "Boxing Day (Substitute)", isGovernment: true, type: "FESTIVAL" }
        ],
        "MX": [
            { id: "mx-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "mx-h2", date: "2026-02-02", name: "Constitution Day", isGovernment: true, type: "NATIONAL" },
            { id: "mx-h3", date: "2026-03-16", name: "Benito Juárez Day", isGovernment: true, type: "NATIONAL" },
            { id: "mx-h4", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "mx-h5", date: "2026-09-16", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "mx-h6", date: "2026-11-16", name: "Revolution Day", isGovernment: true, type: "NATIONAL" },
            { id: "mx-h7", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "BR": [
            { id: "br-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "br-h2", date: "2026-02-16", name: "Carnival Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "br-h3", date: "2026-02-17", name: "Carnival Tuesday", isGovernment: true, type: "FESTIVAL" },
            { id: "br-h4", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "br-h5", date: "2026-04-21", name: "Tiradentes Day", isGovernment: true, type: "NATIONAL" },
            { id: "br-h6", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "br-h7", date: "2026-09-07", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "br-h8", date: "2026-10-12", name: "Our Lady of Aparecida", isGovernment: true, type: "FESTIVAL" },
            { id: "br-h9", date: "2026-11-02", name: "All Souls' Day", isGovernment: true, type: "FESTIVAL" },
            { id: "br-h10", date: "2026-11-15", name: "Republic Proclamation Day", isGovernment: true, type: "NATIONAL" },
            { id: "br-h11", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "AR": [
            { id: "ar-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ar-h2", date: "2026-03-24", name: "Day of Remembrance", isGovernment: true, type: "NATIONAL" },
            { id: "ar-h3", date: "2026-04-02", name: "Malvinas Day", isGovernment: true, type: "NATIONAL" },
            { id: "ar-h4", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "ar-h5", date: "2026-05-25", name: "May Revolution Day", isGovernment: true, type: "NATIONAL" },
            { id: "ar-h6", date: "2026-07-09", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "ar-h7", date: "2026-12-08", name: "Immaculate Conception", isGovernment: true, type: "FESTIVAL" },
            { id: "ar-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],

        // ─────────────── OCEANIA ───────────────
        "AU": [
            { id: "au-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "au-h2", date: "2026-01-26", name: "Australia Day", isGovernment: true, type: "NATIONAL" },
            { id: "au-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "au-h4", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "au-h5", date: "2026-04-25", name: "Anzac Day", isGovernment: true, type: "NATIONAL" },
            { id: "au-h6", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "au-h7", date: "2026-12-28", name: "Boxing Day (Substitute)", isGovernment: true, type: "FESTIVAL" }
        ],
        "NZ": [
            { id: "nz-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "nz-h2", date: "2026-01-02", name: "Day after New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "nz-h3", date: "2026-02-06", name: "Waitangi Day", isGovernment: true, type: "NATIONAL" },
            { id: "nz-h4", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "nz-h5", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "nz-h6", date: "2026-04-27", name: "Anzac Day (Observed)", isGovernment: true, type: "NATIONAL" },
            { id: "nz-h7", date: "2026-06-01", name: "King's Birthday", isGovernment: true, type: "NATIONAL" },
            { id: "nz-h8", date: "2026-07-10", name: "Matariki", isGovernment: true, type: "NATIONAL" },
            { id: "nz-h9", date: "2026-10-26", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "nz-h10", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "nz-h11", date: "2026-12-28", name: "Boxing Day (Substitute)", isGovernment: true, type: "FESTIVAL" }
        ],

        // ─────────────── AFRICA ───────────────
        "NG": [
            { id: "ng-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ng-h2", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "ng-h3", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "ng-h4", date: "2026-05-01", name: "Workers' Day", isGovernment: true, type: "NATIONAL" },
            { id: "ng-h5", date: "2026-06-12", name: "Democracy Day", isGovernment: true, type: "NATIONAL" },
            { id: "ng-h6", date: "2026-10-01", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "ng-h7", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "ng-h8", date: "2026-12-26", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "EG": [
            { id: "eg-h1", date: "2026-01-07", name: "Coptic Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "eg-h2", date: "2026-01-25", name: "Revolution Day (Police Day)", isGovernment: true, type: "NATIONAL" },
            { id: "eg-h3", date: "2026-04-25", name: "Sinai Liberation Day", isGovernment: true, type: "NATIONAL" },
            { id: "eg-h4", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "eg-h5", date: "2026-07-23", name: "Revolution Day", isGovernment: true, type: "NATIONAL" },
            { id: "eg-h6", date: "2026-10-06", name: "Armed Forces Day", isGovernment: true, type: "NATIONAL" }
        ],
        "ZA": [
            { id: "za-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "za-h2", date: "2026-03-21", name: "Human Rights Day", isGovernment: true, type: "NATIONAL" },
            { id: "za-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "za-h4", date: "2026-04-06", name: "Family Day", isGovernment: true, type: "NATIONAL" },
            { id: "za-h5", date: "2026-04-27", name: "Freedom Day", isGovernment: true, type: "NATIONAL" },
            { id: "za-h6", date: "2026-05-01", name: "Workers' Day", isGovernment: true, type: "NATIONAL" },
            { id: "za-h7", date: "2026-06-16", name: "Youth Day", isGovernment: true, type: "NATIONAL" },
            { id: "za-h8", date: "2026-08-09", name: "National Women's Day", isGovernment: true, type: "NATIONAL" },
            { id: "za-h9", date: "2026-09-24", name: "Heritage Day", isGovernment: true, type: "NATIONAL" },
            { id: "za-h10", date: "2026-12-16", name: "Day of Reconciliation", isGovernment: true, type: "NATIONAL" },
            { id: "za-h11", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "za-h12", date: "2026-12-26", name: "Day of Goodwill", isGovernment: true, type: "FESTIVAL" }
        ],
        "KE": [
            { id: "ke-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ke-h2", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "ke-h3", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "ke-h4", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "ke-h5", date: "2026-06-01", name: "Madaraka Day", isGovernment: true, type: "NATIONAL" },
            { id: "ke-h6", date: "2026-10-20", name: "Mashujaa Day", isGovernment: true, type: "NATIONAL" },
            { id: "ke-h7", date: "2026-12-12", name: "Jamhuri Day", isGovernment: true, type: "NATIONAL" },
            { id: "ke-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "ke-h9", date: "2026-12-26", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "AF": [
            { id: "af-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "af-h2", date: "2026-03-21", name: "Afghan New Year (Nawroz)", isGovernment: true, type: "NATIONAL" },
            { id: "af-h3", date: "2026-03-31", name: "Eid al-Fitr (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "af-h4", date: "2026-04-01", name: "Eid al-Fitr (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "af-h5", date: "2026-04-02", name: "Eid al-Fitr (Day 3)", isGovernment: true, type: "FESTIVAL" },
            { id: "af-h6", date: "2026-04-28", name: "Liberation Day", isGovernment: true, type: "NATIONAL" },
            { id: "af-h7", date: "2026-05-01", name: "Workers Day", isGovernment: true, type: "NATIONAL" },
            { id: "af-h8", date: "2026-06-06", name: "Eid al-Adha (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "af-h9", date: "2026-06-07", name: "Eid al-Adha (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "af-h10", date: "2026-06-08", name: "Eid al-Adha (Day 3)", isGovernment: true, type: "FESTIVAL" },
            { id: "af-h11", date: "2026-06-27", name: "Islamic New Year", isGovernment: true, type: "FESTIVAL" },
            { id: "af-h12", date: "2026-07-06", name: "Ashura", isGovernment: true, type: "FESTIVAL" },
            { id: "af-h13", date: "2026-08-19", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "af-h14", date: "2026-09-04", name: "Mawlid al-Nabi", isGovernment: true, type: "FESTIVAL" }
        ],
        "AL": [
            { id: "al-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "al-h2", date: "2026-01-02", name: "New Year Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "al-h3", date: "2026-03-14", name: "Summer Day (Dita e Verës)", isGovernment: true, type: "NATIONAL" },
            { id: "al-h4", date: "2026-03-22", name: "Nevruz", isGovernment: true, type: "NATIONAL" },
            { id: "al-h5", date: "2026-03-31", name: "Eid al-Fitr", isGovernment: true, type: "FESTIVAL" },
            { id: "al-h6", date: "2026-04-05", name: "Catholic Easter", isGovernment: true, type: "FESTIVAL" },
            { id: "al-h7", date: "2026-04-06", name: "Catholic Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "al-h8", date: "2026-04-12", name: "Orthodox Easter", isGovernment: true, type: "FESTIVAL" },
            { id: "al-h9", date: "2026-04-13", name: "Orthodox Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "al-h10", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "al-h11", date: "2026-06-06", name: "Eid al-Adha", isGovernment: true, type: "FESTIVAL" },
            { id: "al-h12", date: "2026-09-05", name: "Mother Teresa Day", isGovernment: true, type: "NATIONAL" },
            { id: "al-h13", date: "2026-11-28", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "al-h14", date: "2026-11-29", name: "Liberation Day", isGovernment: true, type: "NATIONAL" },
            { id: "al-h15", date: "2026-12-08", name: "National Youth Day", isGovernment: true, type: "NATIONAL" },
            { id: "al-h16", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "BN": [
            { id: "bn-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "bn-h2", date: "2026-01-27", name: "Isra Mi'raj", isGovernment: true, type: "FESTIVAL" },
            { id: "bn-h3", date: "2026-01-29", name: "Chinese New Year", isGovernment: true, type: "FESTIVAL" },
            { id: "bn-h4", date: "2026-02-23", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "bn-h5", date: "2026-03-31", name: "Eid al-Fitr (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "bn-h6", date: "2026-04-01", name: "Eid al-Fitr (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "bn-h7", date: "2026-05-31", name: "Royal Brunei Armed Forces Day", isGovernment: true, type: "NATIONAL" },
            { id: "bn-h8", date: "2026-06-06", name: "Eid al-Adha", isGovernment: true, type: "FESTIVAL" },
            { id: "bn-h9", date: "2026-06-27", name: "First Day of Muharram", isGovernment: true, type: "FESTIVAL" },
            { id: "bn-h10", date: "2026-07-06", name: "Ashura", isGovernment: true, type: "FESTIVAL" },
            { id: "bn-h11", date: "2026-07-15", name: "Sultan's Birthday", isGovernment: true, type: "NATIONAL" },
            { id: "bn-h12", date: "2026-09-04", name: "Mawlid al-Nabi", isGovernment: true, type: "FESTIVAL" },
            { id: "bn-h13", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "CL": [
            { id: "cl-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "cl-h2", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "cl-h3", date: "2026-04-04", name: "Holy Saturday", isGovernment: true, type: "FESTIVAL" },
            { id: "cl-h4", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "cl-h5", date: "2026-05-21", name: "Navy Day", isGovernment: true, type: "NATIONAL" },
            { id: "cl-h6", date: "2026-06-21", name: "Day of Indigenous Peoples", isGovernment: true, type: "NATIONAL" },
            { id: "cl-h7", date: "2026-06-29", name: "Saints Peter and Paul", isGovernment: true, type: "FESTIVAL" },
            { id: "cl-h8", date: "2026-07-16", name: "Our Lady of Mount Carmel", isGovernment: true, type: "FESTIVAL" },
            { id: "cl-h9", date: "2026-08-15", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "cl-h10", date: "2026-09-18", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "cl-h11", date: "2026-09-19", name: "Army Day", isGovernment: true, type: "NATIONAL" },
            { id: "cl-h12", date: "2026-10-12", name: "Encounter of Two Worlds", isGovernment: true, type: "NATIONAL" },
            { id: "cl-h13", date: "2026-11-01", name: "All Saints Day", isGovernment: true, type: "FESTIVAL" },
            { id: "cl-h14", date: "2026-12-08", name: "Immaculate Conception", isGovernment: true, type: "FESTIVAL" },
            { id: "cl-h15", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "CO": [
            { id: "co-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "co-h2", date: "2026-01-12", name: "Epiphany", isGovernment: true, type: "FESTIVAL" },
            { id: "co-h3", date: "2026-03-23", name: "St. Joseph's Day", isGovernment: true, type: "FESTIVAL" },
            { id: "co-h4", date: "2026-04-02", name: "Maundy Thursday", isGovernment: true, type: "FESTIVAL" },
            { id: "co-h5", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "co-h6", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "co-h7", date: "2026-05-18", name: "Ascension Day", isGovernment: true, type: "FESTIVAL" },
            { id: "co-h8", date: "2026-06-08", name: "Corpus Christi", isGovernment: true, type: "FESTIVAL" },
            { id: "co-h9", date: "2026-06-15", name: "Sacred Heart", isGovernment: true, type: "FESTIVAL" },
            { id: "co-h10", date: "2026-06-29", name: "Saints Peter and Paul", isGovernment: true, type: "FESTIVAL" },
            { id: "co-h11", date: "2026-07-20", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "co-h12", date: "2026-08-07", name: "Battle of Boyacá", isGovernment: true, type: "NATIONAL" },
            { id: "co-h13", date: "2026-08-17", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "co-h14", date: "2026-10-12", name: "Columbus Day", isGovernment: true, type: "NATIONAL" },
            { id: "co-h15", date: "2026-11-02", name: "All Saints Day", isGovernment: true, type: "FESTIVAL" },
            { id: "co-h16", date: "2026-11-16", name: "Independence of Cartagena", isGovernment: true, type: "NATIONAL" },
            { id: "co-h17", date: "2026-12-08", name: "Immaculate Conception", isGovernment: true, type: "FESTIVAL" },
            { id: "co-h18", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "CZ": [
            { id: "cz-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "cz-h2", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "cz-h3", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "cz-h4", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "cz-h5", date: "2026-05-08", name: "Liberation Day", isGovernment: true, type: "NATIONAL" },
            { id: "cz-h6", date: "2026-07-05", name: "Saints Cyril and Methodius Day", isGovernment: true, type: "NATIONAL" },
            { id: "cz-h7", date: "2026-07-06", name: "Jan Hus Day", isGovernment: true, type: "NATIONAL" },
            { id: "cz-h8", date: "2026-09-28", name: "Czech Statehood Day", isGovernment: true, type: "NATIONAL" },
            { id: "cz-h9", date: "2026-10-28", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "cz-h10", date: "2026-11-17", name: "Freedom and Democracy Day", isGovernment: true, type: "NATIONAL" },
            { id: "cz-h11", date: "2026-12-24", name: "Christmas Eve", isGovernment: true, type: "FESTIVAL" },
            { id: "cz-h12", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "cz-h13", date: "2026-12-26", name: "St. Stephen's Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "DZ": [
            { id: "dz-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "dz-h2", date: "2026-01-12", name: "Amazigh New Year (Yennayer)", isGovernment: true, type: "NATIONAL" },
            { id: "dz-h3", date: "2026-03-31", name: "Eid al-Fitr (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "dz-h4", date: "2026-04-01", name: "Eid al-Fitr (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "dz-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "dz-h6", date: "2026-06-06", name: "Eid al-Adha (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "dz-h7", date: "2026-06-07", name: "Eid al-Adha (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "dz-h8", date: "2026-06-27", name: "Islamic New Year", isGovernment: true, type: "FESTIVAL" },
            { id: "dz-h9", date: "2026-07-05", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "dz-h10", date: "2026-07-06", name: "Ashura", isGovernment: true, type: "FESTIVAL" },
            { id: "dz-h11", date: "2026-09-04", name: "Mawlid al-Nabi", isGovernment: true, type: "FESTIVAL" },
            { id: "dz-h12", date: "2026-11-01", name: "Revolution Day", isGovernment: true, type: "NATIONAL" }
        ],
        "ET": [
            { id: "et-h1", date: "2026-01-07", name: "Ethiopian Christmas (Genna)", isGovernment: true, type: "FESTIVAL" },
            { id: "et-h2", date: "2026-01-19", name: "Epiphany (Timkat)", isGovernment: true, type: "FESTIVAL" },
            { id: "et-h3", date: "2026-03-02", name: "Adwa Victory Day", isGovernment: true, type: "NATIONAL" },
            { id: "et-h4", date: "2026-03-31", name: "Eid al-Fitr", isGovernment: true, type: "FESTIVAL" },
            { id: "et-h5", date: "2026-04-10", name: "Ethiopian Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "et-h6", date: "2026-04-12", name: "Ethiopian Easter (Fasika)", isGovernment: true, type: "FESTIVAL" },
            { id: "et-h7", date: "2026-05-01", name: "Workers Day", isGovernment: true, type: "NATIONAL" },
            { id: "et-h8", date: "2026-05-05", name: "Patriots' Victory Day", isGovernment: true, type: "NATIONAL" },
            { id: "et-h9", date: "2026-05-28", name: "Downfall of the Derg", isGovernment: true, type: "NATIONAL" },
            { id: "et-h10", date: "2026-06-06", name: "Eid al-Adha", isGovernment: true, type: "FESTIVAL" },
            { id: "et-h11", date: "2026-09-11", name: "Ethiopian New Year (Enkutatash)", isGovernment: true, type: "NATIONAL" },
            { id: "et-h12", date: "2026-09-27", name: "Finding of the True Cross (Meskel)", isGovernment: true, type: "FESTIVAL" }
        ],
        "GH": [
            { id: "gh-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "gh-h2", date: "2026-01-07", name: "Constitution Day", isGovernment: true, type: "NATIONAL" },
            { id: "gh-h3", date: "2026-03-06", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "gh-h4", date: "2026-03-31", name: "Eid al-Fitr", isGovernment: true, type: "FESTIVAL" },
            { id: "gh-h5", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "gh-h6", date: "2026-04-04", name: "Holy Saturday", isGovernment: true, type: "FESTIVAL" },
            { id: "gh-h7", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "gh-h8", date: "2026-05-01", name: "Workers Day", isGovernment: true, type: "NATIONAL" },
            { id: "gh-h9", date: "2026-06-06", name: "Eid al-Adha", isGovernment: true, type: "FESTIVAL" },
            { id: "gh-h10", date: "2026-07-01", name: "Republic Day", isGovernment: true, type: "NATIONAL" },
            { id: "gh-h11", date: "2026-08-04", name: "Founders Day", isGovernment: true, type: "NATIONAL" },
            { id: "gh-h12", date: "2026-09-21", name: "Kwame Nkrumah Memorial Day", isGovernment: true, type: "NATIONAL" },
            { id: "gh-h13", date: "2026-12-04", name: "Farmer's Day", isGovernment: true, type: "NATIONAL" },
            { id: "gh-h14", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "gh-h15", date: "2026-12-26", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "GR": [
            { id: "gr-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "gr-h2", date: "2026-01-06", name: "Epiphany", isGovernment: true, type: "FESTIVAL" },
            { id: "gr-h3", date: "2026-02-23", name: "Clean Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "gr-h4", date: "2026-03-25", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "gr-h5", date: "2026-04-10", name: "Orthodox Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "gr-h6", date: "2026-04-11", name: "Orthodox Holy Saturday", isGovernment: true, type: "FESTIVAL" },
            { id: "gr-h7", date: "2026-04-12", name: "Orthodox Easter Sunday", isGovernment: true, type: "FESTIVAL" },
            { id: "gr-h8", date: "2026-04-13", name: "Orthodox Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "gr-h9", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "gr-h10", date: "2026-06-01", name: "Orthodox Whit Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "gr-h11", date: "2026-08-15", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "gr-h12", date: "2026-10-28", name: "Oxi Day", isGovernment: true, type: "NATIONAL" },
            { id: "gr-h13", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "gr-h14", date: "2026-12-26", name: "St. Stephen's Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "HR": [
            { id: "hr-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "hr-h2", date: "2026-01-06", name: "Epiphany", isGovernment: true, type: "FESTIVAL" },
            { id: "hr-h3", date: "2026-04-05", name: "Easter Sunday", isGovernment: true, type: "FESTIVAL" },
            { id: "hr-h4", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "hr-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "hr-h6", date: "2026-05-30", name: "Statehood Day", isGovernment: true, type: "NATIONAL" },
            { id: "hr-h7", date: "2026-06-04", name: "Corpus Christi", isGovernment: true, type: "FESTIVAL" },
            { id: "hr-h8", date: "2026-06-22", name: "Anti-Fascist Struggle Day", isGovernment: true, type: "NATIONAL" },
            { id: "hr-h9", date: "2026-08-05", name: "Victory and Homeland Thanksgiving Day", isGovernment: true, type: "NATIONAL" },
            { id: "hr-h10", date: "2026-08-15", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "hr-h11", date: "2026-11-01", name: "All Saints Day", isGovernment: true, type: "FESTIVAL" },
            { id: "hr-h12", date: "2026-11-18", name: "Remembrance Day", isGovernment: true, type: "NATIONAL" },
            { id: "hr-h13", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "hr-h14", date: "2026-12-26", name: "St. Stephen's Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "HU": [
            { id: "hu-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "hu-h2", date: "2026-03-15", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "hu-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "hu-h4", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "hu-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "hu-h6", date: "2026-05-25", name: "Whit Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "hu-h7", date: "2026-08-20", name: "St. Stephen's Day", isGovernment: true, type: "NATIONAL" },
            { id: "hu-h8", date: "2026-10-23", name: "Revolution and Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "hu-h9", date: "2026-11-01", name: "All Saints Day", isGovernment: true, type: "FESTIVAL" },
            { id: "hu-h10", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "hu-h11", date: "2026-12-26", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "IQ": [
            { id: "iq-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "iq-h2", date: "2026-01-06", name: "Army Day", isGovernment: true, type: "NATIONAL" },
            { id: "iq-h3", date: "2026-03-21", name: "Nowruz (Kurdish New Year)", isGovernment: true, type: "NATIONAL" },
            { id: "iq-h4", date: "2026-03-31", name: "Eid al-Fitr (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "iq-h5", date: "2026-04-01", name: "Eid al-Fitr (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "iq-h6", date: "2026-04-02", name: "Eid al-Fitr (Day 3)", isGovernment: true, type: "FESTIVAL" },
            { id: "iq-h7", date: "2026-04-09", name: "Liberation Day", isGovernment: true, type: "NATIONAL" },
            { id: "iq-h8", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "iq-h9", date: "2026-06-06", name: "Eid al-Adha (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "iq-h10", date: "2026-06-07", name: "Eid al-Adha (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "iq-h11", date: "2026-06-08", name: "Eid al-Adha (Day 3)", isGovernment: true, type: "FESTIVAL" },
            { id: "iq-h12", date: "2026-06-27", name: "Islamic New Year", isGovernment: true, type: "FESTIVAL" },
            { id: "iq-h13", date: "2026-07-06", name: "Ashura", isGovernment: true, type: "FESTIVAL" },
            { id: "iq-h14", date: "2026-07-14", name: "Republic Day", isGovernment: true, type: "NATIONAL" },
            { id: "iq-h15", date: "2026-09-04", name: "Mawlid al-Nabi", isGovernment: true, type: "FESTIVAL" },
            { id: "iq-h16", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "JO": [
            { id: "jo-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "jo-h2", date: "2026-03-31", name: "Eid al-Fitr (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "jo-h3", date: "2026-04-01", name: "Eid al-Fitr (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "jo-h4", date: "2026-04-02", name: "Eid al-Fitr (Day 3)", isGovernment: true, type: "FESTIVAL" },
            { id: "jo-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "jo-h6", date: "2026-05-25", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "jo-h7", date: "2026-06-06", name: "Eid al-Adha (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "jo-h8", date: "2026-06-07", name: "Eid al-Adha (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "jo-h9", date: "2026-06-08", name: "Eid al-Adha (Day 3)", isGovernment: true, type: "FESTIVAL" },
            { id: "jo-h10", date: "2026-06-10", name: "Army Day", isGovernment: true, type: "NATIONAL" },
            { id: "jo-h11", date: "2026-06-27", name: "Islamic New Year", isGovernment: true, type: "FESTIVAL" },
            { id: "jo-h12", date: "2026-09-04", name: "Mawlid al-Nabi", isGovernment: true, type: "FESTIVAL" },
            { id: "jo-h13", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "KH": [
            { id: "kh-h1", date: "2026-01-01", name: "International New Year", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h2", date: "2026-01-07", name: "Victory Day", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h3", date: "2026-03-08", name: "International Women's Day", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h4", date: "2026-04-14", name: "Khmer New Year (Day 1)", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h5", date: "2026-04-15", name: "Khmer New Year (Day 2)", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h6", date: "2026-04-16", name: "Khmer New Year (Day 3)", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h7", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h8", date: "2026-05-13", name: "King's Birthday", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h9", date: "2026-05-14", name: "King's Birthday (Day 2)", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h10", date: "2026-05-15", name: "King's Birthday (Day 3)", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h11", date: "2026-06-18", name: "King's Mother Day", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h12", date: "2026-09-24", name: "Constitution Day", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h13", date: "2026-10-15", name: "Commemoration Day of King-Father", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h14", date: "2026-10-23", name: "Paris Peace Agreement Day", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h15", date: "2026-10-29", name: "King's Coronation Day", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h16", date: "2026-11-09", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "kh-h17", date: "2026-12-10", name: "Human Rights Day", isGovernment: true, type: "NATIONAL" }
        ],
        "LB": [
            { id: "lb-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "lb-h2", date: "2026-02-09", name: "St. Maron Day", isGovernment: true, type: "FESTIVAL" },
            { id: "lb-h3", date: "2026-03-31", name: "Eid al-Fitr", isGovernment: true, type: "FESTIVAL" },
            { id: "lb-h4", date: "2026-04-03", name: "Good Friday (Western)", isGovernment: true, type: "FESTIVAL" },
            { id: "lb-h5", date: "2026-04-05", name: "Easter Sunday (Western)", isGovernment: true, type: "FESTIVAL" },
            { id: "lb-h6", date: "2026-04-10", name: "Good Friday (Orthodox)", isGovernment: true, type: "FESTIVAL" },
            { id: "lb-h7", date: "2026-04-12", name: "Easter Sunday (Orthodox)", isGovernment: true, type: "FESTIVAL" },
            { id: "lb-h8", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "lb-h9", date: "2026-05-06", name: "Martyrs' Day", isGovernment: true, type: "NATIONAL" },
            { id: "lb-h10", date: "2026-05-25", name: "Liberation Day", isGovernment: true, type: "NATIONAL" },
            { id: "lb-h11", date: "2026-06-06", name: "Eid al-Adha", isGovernment: true, type: "FESTIVAL" },
            { id: "lb-h12", date: "2026-07-06", name: "Ashura", isGovernment: true, type: "FESTIVAL" },
            { id: "lb-h13", date: "2026-08-15", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "lb-h14", date: "2026-09-04", name: "Mawlid al-Nabi", isGovernment: true, type: "FESTIVAL" },
            { id: "lb-h15", date: "2026-11-01", name: "All Saints Day", isGovernment: true, type: "FESTIVAL" },
            { id: "lb-h16", date: "2026-11-22", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "lb-h17", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "MA": [
            { id: "ma-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ma-h2", date: "2026-01-11", name: "Proclamation of Independence", isGovernment: true, type: "NATIONAL" },
            { id: "ma-h3", date: "2026-03-31", name: "Eid al-Fitr (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "ma-h4", date: "2026-04-01", name: "Eid al-Fitr (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "ma-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "ma-h6", date: "2026-06-06", name: "Eid al-Adha (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "ma-h7", date: "2026-06-07", name: "Eid al-Adha (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "ma-h8", date: "2026-06-27", name: "Islamic New Year", isGovernment: true, type: "FESTIVAL" },
            { id: "ma-h9", date: "2026-07-06", name: "Ashura", isGovernment: true, type: "FESTIVAL" },
            { id: "ma-h10", date: "2026-07-30", name: "Throne Day", isGovernment: true, type: "NATIONAL" },
            { id: "ma-h11", date: "2026-08-14", name: "Oued Ed-Dahab Day", isGovernment: true, type: "NATIONAL" },
            { id: "ma-h12", date: "2026-08-20", name: "Revolution of the King and People", isGovernment: true, type: "NATIONAL" },
            { id: "ma-h13", date: "2026-08-21", name: "Youth Day", isGovernment: true, type: "NATIONAL" },
            { id: "ma-h14", date: "2026-09-04", name: "Mawlid al-Nabi", isGovernment: true, type: "FESTIVAL" },
            { id: "ma-h15", date: "2026-11-06", name: "Green March", isGovernment: true, type: "NATIONAL" },
            { id: "ma-h16", date: "2026-11-18", name: "Independence Day", isGovernment: true, type: "NATIONAL" }
        ],
        "MM": [
            { id: "mm-h1", date: "2026-01-04", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "mm-h2", date: "2026-02-12", name: "Union Day", isGovernment: true, type: "NATIONAL" },
            { id: "mm-h3", date: "2026-03-02", name: "Peasants' Day", isGovernment: true, type: "NATIONAL" },
            { id: "mm-h4", date: "2026-03-27", name: "Armed Forces Day", isGovernment: true, type: "NATIONAL" },
            { id: "mm-h5", date: "2026-04-13", name: "Thingyan (Water Festival Day 1)", isGovernment: true, type: "NATIONAL" },
            { id: "mm-h6", date: "2026-04-14", name: "Thingyan (Water Festival Day 2)", isGovernment: true, type: "NATIONAL" },
            { id: "mm-h7", date: "2026-04-15", name: "Thingyan (Water Festival Day 3)", isGovernment: true, type: "NATIONAL" },
            { id: "mm-h8", date: "2026-04-16", name: "Myanmar New Year", isGovernment: true, type: "NATIONAL" },
            { id: "mm-h9", date: "2026-05-01", name: "Workers' Day", isGovernment: true, type: "NATIONAL" },
            { id: "mm-h10", date: "2026-05-11", name: "Full Moon of Kason (Vesak)", isGovernment: true, type: "FESTIVAL" },
            { id: "mm-h11", date: "2026-06-06", name: "Eid al-Adha", isGovernment: true, type: "FESTIVAL" },
            { id: "mm-h12", date: "2026-07-19", name: "Martyrs' Day", isGovernment: true, type: "NATIONAL" },
            { id: "mm-h13", date: "2026-10-11", name: "End of Buddhist Lent (Thadingyut)", isGovernment: true, type: "FESTIVAL" },
            { id: "mm-h14", date: "2026-11-10", name: "Tazaungdaing Festival", isGovernment: true, type: "FESTIVAL" },
            { id: "mm-h15", date: "2026-11-19", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "mm-h16", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "MV": [
            { id: "mv-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "mv-h2", date: "2026-02-17", name: "Huravee Day", isGovernment: true, type: "NATIONAL" },
            { id: "mv-h3", date: "2026-03-31", name: "Eid al-Fitr (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "mv-h4", date: "2026-04-01", name: "Eid al-Fitr (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "mv-h5", date: "2026-04-02", name: "Eid al-Fitr (Day 3)", isGovernment: true, type: "FESTIVAL" },
            { id: "mv-h6", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "mv-h7", date: "2026-06-06", name: "Eid al-Adha (Day 1)", isGovernment: true, type: "FESTIVAL" },
            { id: "mv-h8", date: "2026-06-07", name: "Eid al-Adha (Day 2)", isGovernment: true, type: "FESTIVAL" },
            { id: "mv-h9", date: "2026-06-08", name: "Eid al-Adha (Day 3)", isGovernment: true, type: "FESTIVAL" },
            { id: "mv-h10", date: "2026-07-26", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "mv-h11", date: "2026-09-04", name: "Mawlid al-Nabi", isGovernment: true, type: "FESTIVAL" },
            { id: "mv-h12", date: "2026-09-30", name: "Martyrs' Day", isGovernment: true, type: "NATIONAL" },
            { id: "mv-h13", date: "2026-11-03", name: "Victory Day", isGovernment: true, type: "NATIONAL" },
            { id: "mv-h14", date: "2026-11-11", name: "Republic Day", isGovernment: true, type: "NATIONAL" }
        ],
        "PL": [
            { id: "pl-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "pl-h2", date: "2026-01-06", name: "Epiphany", isGovernment: true, type: "FESTIVAL" },
            { id: "pl-h3", date: "2026-04-05", name: "Easter Sunday", isGovernment: true, type: "FESTIVAL" },
            { id: "pl-h4", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "pl-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "pl-h6", date: "2026-05-03", name: "Constitution Day", isGovernment: true, type: "NATIONAL" },
            { id: "pl-h7", date: "2026-05-24", name: "Whit Sunday", isGovernment: true, type: "FESTIVAL" },
            { id: "pl-h8", date: "2026-06-04", name: "Corpus Christi", isGovernment: true, type: "FESTIVAL" },
            { id: "pl-h9", date: "2026-08-15", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "pl-h10", date: "2026-11-01", name: "All Saints Day", isGovernment: true, type: "FESTIVAL" },
            { id: "pl-h11", date: "2026-11-11", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "pl-h12", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "pl-h13", date: "2026-12-26", name: "St. Stephen's Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "PT": [
            { id: "pt-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "pt-h2", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "pt-h3", date: "2026-04-05", name: "Easter Sunday", isGovernment: true, type: "FESTIVAL" },
            { id: "pt-h4", date: "2026-04-25", name: "Freedom Day", isGovernment: true, type: "NATIONAL" },
            { id: "pt-h5", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "pt-h6", date: "2026-06-04", name: "Corpus Christi", isGovernment: true, type: "FESTIVAL" },
            { id: "pt-h7", date: "2026-06-10", name: "Portugal Day", isGovernment: true, type: "NATIONAL" },
            { id: "pt-h8", date: "2026-08-15", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "pt-h9", date: "2026-10-05", name: "Republic Day", isGovernment: true, type: "NATIONAL" },
            { id: "pt-h10", date: "2026-11-01", name: "All Saints Day", isGovernment: true, type: "FESTIVAL" },
            { id: "pt-h11", date: "2026-12-01", name: "Restoration of Independence", isGovernment: true, type: "NATIONAL" },
            { id: "pt-h12", date: "2026-12-08", name: "Immaculate Conception", isGovernment: true, type: "FESTIVAL" },
            { id: "pt-h13", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
        ],
        "RO": [
            { id: "ro-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ro-h2", date: "2026-01-02", name: "New Year Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "ro-h3", date: "2026-01-06", name: "Epiphany", isGovernment: true, type: "FESTIVAL" },
            { id: "ro-h4", date: "2026-01-07", name: "St. John the Baptist", isGovernment: true, type: "FESTIVAL" },
            { id: "ro-h5", date: "2026-01-24", name: "Unification Day", isGovernment: true, type: "NATIONAL" },
            { id: "ro-h6", date: "2026-04-10", name: "Orthodox Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "ro-h7", date: "2026-04-12", name: "Orthodox Easter Sunday", isGovernment: true, type: "FESTIVAL" },
            { id: "ro-h8", date: "2026-04-13", name: "Orthodox Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "ro-h9", date: "2026-05-01", name: "Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "ro-h10", date: "2026-06-01", name: "Children's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ro-h11", date: "2026-06-01", name: "Orthodox Whit Sunday", isGovernment: true, type: "FESTIVAL" },
            { id: "ro-h12", date: "2026-06-02", name: "Orthodox Whit Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "ro-h13", date: "2026-08-15", name: "Assumption of Mary", isGovernment: true, type: "FESTIVAL" },
            { id: "ro-h14", date: "2026-11-30", name: "St. Andrew's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ro-h15", date: "2026-12-01", name: "National Day", isGovernment: true, type: "NATIONAL" },
            { id: "ro-h16", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "ro-h17", date: "2026-12-26", name: "Christmas Holiday", isGovernment: true, type: "FESTIVAL" }
        ],
        "RU": [
            { id: "ru-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h2", date: "2026-01-02", name: "New Year Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h3", date: "2026-01-03", name: "New Year Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h4", date: "2026-01-04", name: "New Year Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h5", date: "2026-01-05", name: "New Year Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h6", date: "2026-01-06", name: "New Year Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h7", date: "2026-01-07", name: "Orthodox Christmas", isGovernment: true, type: "FESTIVAL" },
            { id: "ru-h8", date: "2026-01-08", name: "New Year Holiday", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h9", date: "2026-02-23", name: "Defender of the Fatherland Day", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h10", date: "2026-03-08", name: "International Women's Day", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h11", date: "2026-05-01", name: "Spring and Labour Day", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h12", date: "2026-05-09", name: "Victory Day", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h13", date: "2026-06-12", name: "Russia Day", isGovernment: true, type: "NATIONAL" },
            { id: "ru-h14", date: "2026-11-04", name: "National Unity Day", isGovernment: true, type: "NATIONAL" }
        ],
        "ZW": [
            { id: "zw-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
            { id: "zw-h2", date: "2026-02-21", name: "Robert Mugabe Day", isGovernment: true, type: "NATIONAL" },
            { id: "zw-h3", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
            { id: "zw-h4", date: "2026-04-04", name: "Holy Saturday", isGovernment: true, type: "FESTIVAL" },
            { id: "zw-h5", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
            { id: "zw-h6", date: "2026-04-18", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
            { id: "zw-h7", date: "2026-05-01", name: "Workers' Day", isGovernment: true, type: "NATIONAL" },
            { id: "zw-h8", date: "2026-05-25", name: "Africa Day", isGovernment: true, type: "NATIONAL" },
            { id: "zw-h9", date: "2026-08-10", name: "Heroes' Day", isGovernment: true, type: "NATIONAL" },
            { id: "zw-h10", date: "2026-08-11", name: "Defence Forces Day", isGovernment: true, type: "NATIONAL" },
            { id: "zw-h11", date: "2026-12-22", name: "Unity Day", isGovernment: true, type: "NATIONAL" },
            { id: "zw-h12", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
            { id: "zw-h13", date: "2026-12-26", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
        ]
    };

    return holidayData[countryCode] || [];
}

// Helper function to get country defaults
function getCountryDefaults(countryCode) {
    const defaults = {
        // Asia
        "BD": { currency: "BDT", timezone: "Asia/Dhaka", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
        "IN": { currency: "INR", timezone: "Asia/Kolkata", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], dateFormat: "DD/MM/YYYY" },
        "NP": { currency: "NPR", timezone: "Asia/Kathmandu", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "PK": { currency: "PKR", timezone: "Asia/Karachi", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], dateFormat: "DD/MM/YYYY" },
        "LK": { currency: "LKR", timezone: "Asia/Colombo", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "MY": { currency: "MYR", timezone: "Asia/Kuala_Lumpur", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "SG": { currency: "SGD", timezone: "Asia/Singapore", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "ID": { currency: "IDR", timezone: "Asia/Jakarta", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "TH": { currency: "THB", timezone: "Asia/Bangkok", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "VN": { currency: "VND", timezone: "Asia/Ho_Chi_Minh", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "PH": { currency: "PHP", timezone: "Asia/Manila", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "MM/DD/YYYY" },
        "JP": { currency: "JPY", timezone: "Asia/Tokyo", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "YYYY/MM/DD" },
        "KR": { currency: "KRW", timezone: "Asia/Seoul", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "YYYY/MM/DD" },
        "CN": { currency: "CNY", timezone: "Asia/Shanghai", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "YYYY/MM/DD" },
        "HK": { currency: "HKD", timezone: "Asia/Hong_Kong", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "TW": { currency: "TWD", timezone: "Asia/Taipei", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "YYYY/MM/DD" },

        // Middle East
        "AE": { currency: "AED", timezone: "Asia/Dubai", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "SA": { currency: "SAR", timezone: "Asia/Riyadh", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
        "QA": { currency: "QAR", timezone: "Asia/Qatar", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
        "KW": { currency: "KWD", timezone: "Asia/Kuwait", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
        "BH": { currency: "BHD", timezone: "Asia/Bahrain", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
        "OM": { currency: "OMR", timezone: "Asia/Muscat", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
        "IL": { currency: "ILS", timezone: "Asia/Jerusalem", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
        "TR": { currency: "TRY", timezone: "Europe/Istanbul", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },

        // Europe
        "GB": { currency: "GBP", timezone: "Europe/London", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "IE": { currency: "EUR", timezone: "Europe/Dublin", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "DE": { currency: "EUR", timezone: "Europe/Berlin", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD.MM.YYYY" },
        "FR": { currency: "EUR", timezone: "Europe/Paris", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "IT": { currency: "EUR", timezone: "Europe/Rome", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "ES": { currency: "EUR", timezone: "Europe/Madrid", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "NL": { currency: "EUR", timezone: "Europe/Amsterdam", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD-MM-YYYY" },
        "BE": { currency: "EUR", timezone: "Europe/Brussels", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "AT": { currency: "EUR", timezone: "Europe/Vienna", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD.MM.YYYY" },
        "CH": { currency: "CHF", timezone: "Europe/Zurich", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD.MM.YYYY" },
        "SE": { currency: "SEK", timezone: "Europe/Stockholm", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "YYYY-MM-DD" },
        "NO": { currency: "NOK", timezone: "Europe/Oslo", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD.MM.YYYY" },
        "DK": { currency: "DKK", timezone: "Europe/Copenhagen", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD-MM-YYYY" },
        "FI": { currency: "EUR", timezone: "Europe/Helsinki", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD.MM.YYYY" },

        // Americas
        "US": { currency: "USD", timezone: "America/New_York", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "MM/DD/YYYY" },
        "CA": { currency: "CAD", timezone: "America/Toronto", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "MM/DD/YYYY" },
        "MX": { currency: "MXN", timezone: "America/Mexico_City", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "BR": { currency: "BRL", timezone: "America/Sao_Paulo", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "AR": { currency: "ARS", timezone: "America/Argentina/Buenos_Aires", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },

        // Oceania
        "AU": { currency: "AUD", timezone: "Australia/Sydney", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "NZ": { currency: "NZD", timezone: "Pacific/Auckland", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },

        // Africa
        "NG": { currency: "NGN", timezone: "Africa/Lagos", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
        "EG": { currency: "EGP", timezone: "Africa/Cairo", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
        "ZA": { currency: "ZAR", timezone: "Africa/Johannesburg", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "YYYY/MM/DD" },
        "KE": { currency: "KES", timezone: "Africa/Nairobi", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" }
    };

    return defaults[countryCode] || {
        currency: "USD",
        timezone: "UTC",
        workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
        dateFormat: "DD/MM/YYYY"
    };
}

/* ============================================================
   ONE-TIME BACKFILL — Seed holidays for orgs with empty/missing
   holiday settings. Idempotent: skips orgs that already have a
   non-empty holiday list. Runs on every PocketBase boot but the
   work after first run is just a quick scan + skip.
   ============================================================ */
try {
    onBootstrap((e) => {
        e.next();
        try {
            const orgs = $app.findRecordsByFilter("organizations", "id != ''", "", 1000, 0);
            if (!orgs || orgs.length === 0) {
                console.log("[HOLIDAY-BACKFILL] No organizations found — nothing to seed.");
                return;
            }

            const settingsCol = $app.findCollectionByNameOrId("settings");
            let seeded = 0;
            let skipped = 0;

            for (let i = 0; i < orgs.length; i++) {
                const org = orgs[i];
                const country = (org.getString("country") || "").toUpperCase();
                if (!country) {
                    skipped++;
                    continue;
                }

                const countryHolidays = loadHolidaysForCountry(country);
                if (!countryHolidays || countryHolidays.length === 0) {
                    // Country has no bundled data — leave empty list, admin adds manually
                    skipped++;
                    continue;
                }

                let existing = null;
                try {
                    existing = $app.findFirstRecordByFilter(
                        "settings",
                        "key = 'holidays' && organization_id = {:orgId}",
                        { orgId: org.id }
                    );
                } catch (notFound) {
                    existing = null;
                }

                if (existing) {
                    const currentValue = existing.get("value");
                    if (Array.isArray(currentValue) && currentValue.length > 0) {
                        // Already populated — never overwrite admin-curated lists
                        skipped++;
                        continue;
                    }
                    existing.set("value", countryHolidays);
                    $app.save(existing);
                } else {
                    const rec = new Record(settingsCol);
                    rec.set("key", "holidays");
                    rec.set("value", countryHolidays);
                    rec.set("organization_id", org.id);
                    $app.save(rec);
                }
                seeded++;
                console.log("[HOLIDAY-BACKFILL] Seeded " + countryHolidays.length + " holidays for org " + org.id + " (country: " + country + ")");
            }

            if (seeded > 0) {
                console.log("[HOLIDAY-BACKFILL] Complete — seeded " + seeded + " org(s), skipped " + skipped);
            }
        } catch (err) {
            console.log("[HOLIDAY-BACKFILL] Skipped (non-fatal): " + err.toString());
        }
    });
} catch (e) {
    console.log("[HOOKS] Could not register holiday backfill hook: " + e.toString());
}

/* ============================================================
   SUPER ADMIN: NOTIFICATION MANAGEMENT ENDPOINTS
   ============================================================ */

// GET /api/openhr/notification-stats — Platform-wide notification counts (bypasses API rules)
routerAdd("GET", "/api/openhr/notification-stats", (e) => {
    try {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { message: "Unauthorized" });
        }
        const role = authRecord.getString("role");
        if (role !== "SUPER_ADMIN") {
            return e.json(403, { message: "Super Admin access required" });
        }

        let total = 0;
        let read = 0;
        let unread = 0;

        try {
            const allRecords = $app.findRecordsByFilter("notifications", "id != ''", "-created", 10000, 0);
            total = allRecords.length;

            for (let i = 0; i < allRecords.length; i++) {
                if (allRecords[i].getBool("is_read")) {
                    read++;
                } else {
                    unread++;
                }
            }
        } catch (findErr) {
            // Collection might be empty
            console.log("[NOTIF-STATS] Find error (likely empty):", findErr.toString());
        }

        return e.json(200, { total: total, read: read, unread: unread });
    } catch (err) {
        console.log("[NOTIF-STATS] Error:", err.toString());
        return e.json(500, { message: "Internal Server Error" });
    }
});

// POST /api/openhr/purge-all-notifications — Delete ALL notifications platform-wide (bypasses API rules)
routerAdd("POST", "/api/openhr/purge-all-notifications", (e) => {
    try {
        const authRecord = e.auth;
        if (!authRecord) {
            return e.json(401, { message: "Unauthorized" });
        }
        const role = authRecord.getString("role");
        if (role !== "SUPER_ADMIN") {
            return e.json(403, { message: "Super Admin access required" });
        }

        let deleted = 0;
        let errors = 0;

        try {
            // Delete in batches - fetch 500 at a time, keep going until none remain
            let hasMore = true;
            while (hasMore) {
                const records = $app.findRecordsByFilter("notifications", "id != ''", "-created", 500, 0);
                if (!records || records.length === 0) {
                    hasMore = false;
                    break;
                }
                console.log("[PURGE-NOTIF] Deleting batch of", records.length, "notifications");
                for (let i = 0; i < records.length; i++) {
                    try {
                        $app.delete(records[i]);
                        deleted++;
                    } catch (delErr) {
                        errors++;
                        console.log("[PURGE-NOTIF] Delete error for", records[i].id, ":", delErr.toString());
                    }
                }
                if (records.length < 500) {
                    hasMore = false;
                }
            }
        } catch (findErr) {
            console.log("[PURGE-NOTIF] Find error:", findErr.toString());
        }

        console.log("[PURGE-NOTIF] Purge complete. Deleted:", deleted, "| Errors:", errors);
        return e.json(200, { deleted: deleted, errors: errors });
    } catch (err) {
        console.log("[PURGE-NOTIF] Error:", err.toString());
        return e.json(500, { message: "Internal Server Error" });
    }
});

// POST /api/openhr/delete-organization — Cascade-delete an org and all
// its data, bypassing per-collection API rules. Required because some
// child collections (reports_queue etc.) deny `list` even to SUPER_ADMIN
// from the client SDK, so the frontend can't sweep them itself.
routerAdd("POST", "/api/openhr/delete-organization", (e) => {
    try {
        const authRecord = e.auth;
        if (!authRecord) return e.json(401, { message: "Unauthorized" });
        if (authRecord.getString("role") !== "SUPER_ADMIN") {
            return e.json(403, { message: "Super Admin access required" });
        }

        const body = e.requestInfo().body || {};
        const orgId = body.organizationId || body.organization_id;
        if (!orgId || typeof orgId !== "string") {
            return e.json(400, { message: "organizationId is required" });
        }

        // Verify the org exists before doing anything destructive.
        try {
            $app.findRecordById("organizations", orgId);
        } catch (notFound) {
            return e.json(404, { message: "Organization not found" });
        }

        // Auto-discover every collection that has an `organization_id` field
        // so future org-scoped tables are swept automatically. Skip system,
        // view, and the `organizations` collection itself.
        const allCollections = $app.findAllCollections();
        const orgScoped = [];
        for (let i = 0; i < allCollections.length; i++) {
            const c = allCollections[i];
            if (c.name === "organizations") continue;
            if (c.system) continue;
            if (c.type === "view") continue;
            const fields = c.fields || [];
            let hasOrgField = false;
            for (let j = 0; j < fields.length; j++) {
                if (fields[j].name === "organization_id") { hasOrgField = true; break; }
            }
            if (hasOrgField) orgScoped.push(c.name);
        }

        // Dependency-ordered priority — children of users/teams must be
        // deleted before users/teams themselves to avoid required-relation
        // failures. Anything else gets swept after.
        const priority = [
            "attendance", "leaves", "performance_reviews", "review_cycles",
            "notifications", "announcements", "reports_queue",
            "upgrade_requests", "shifts", "teams", "settings", "users",
        ];
        const ordered = [];
        for (let i = 0; i < priority.length; i++) {
            if (orgScoped.indexOf(priority[i]) !== -1) ordered.push(priority[i]);
        }
        for (let i = 0; i < orgScoped.length; i++) {
            if (ordered.indexOf(orgScoped[i]) === -1) ordered.push(orgScoped[i]);
        }

        const summary = {};
        const filter = 'organization_id = "' + orgId + '"';

        for (let i = 0; i < ordered.length; i++) {
            const collName = ordered[i];
            let deleted = 0, errors = 0;
            try {
                // Loop in batches until empty — findRecordsByFilter caps at the
                // limit arg, so a large org might need multiple passes.
                let pass = 0;
                while (pass < 20) {
                    const records = $app.findRecordsByFilter(collName, filter, "", 500, 0);
                    if (!records || records.length === 0) break;
                    for (let k = 0; k < records.length; k++) {
                        try {
                            $app.delete(records[k]);
                            deleted++;
                        } catch (delErr) {
                            errors++;
                            console.log("[DELETE-ORG] " + collName + "/" + records[k].id + ": " + delErr.toString());
                        }
                    }
                    if (records.length < 500) break;
                    pass++;
                }
            } catch (findErr) {
                console.log("[DELETE-ORG] find " + collName + " failed: " + findErr.toString());
            }
            summary[collName] = { deleted: deleted, errors: errors };
        }

        // Finally delete the organization itself.
        try {
            const orgRecord = $app.findRecordById("organizations", orgId);
            $app.delete(orgRecord);
        } catch (orgErr) {
            console.log("[DELETE-ORG] Final org delete failed: " + orgErr.toString());
            return e.json(500, {
                message: "Cascade succeeded but organization delete failed: " + orgErr.toString(),
                summary: summary
            });
        }

        console.log("[DELETE-ORG] Deleted org " + orgId + " — summary: " + JSON.stringify(summary));
        return e.json(200, { success: true, organizationId: orgId, summary: summary });
    } catch (err) {
        console.log("[DELETE-ORG] Error: " + err.toString());
        return e.json(500, { message: "Internal Server Error: " + err.toString() });
    }
});

// ════════════════════════════════════════════════════════════════
// LEAVE NOTIFICATION HOOKS (Email only)
// Restored to proven working version with string concatenation
// for findRecordsByFilter queries.
// ════════════════════════════════════════════════════════════════

// ============================================================
// 1. LEAVE CREATED → Notify Employee + Manager + Admin/HR
// ============================================================
onRecordAfterCreateSuccess((e) => {
    const record    = e.record;
    const empId     = record.getString("employee_id");
    const managerId = record.getString("line_manager_id");
    const orgId     = record.getString("organization_id");

    try {
        // Sender — inlined (cannot call functions from other .pb.js files)
        const meta          = $app.settings().meta || {};
        const senderAddress = meta.senderAddress || "noreply@openhr.app";
        const senderName    = meta.senderName    || "OpenHR System";
        const sender        = { address: senderAddress, name: senderName };

        // Fetch employee record
        let employee;
        try {
            employee = $app.findRecordById("users", empId);
        } catch (err) {
            console.log("[LEAVE-EMAIL] Employee not found: " + empId);
            return;
        }

        const empName   = record.getString("employee_name") || employee.getString("name");
        const empEmail  = employee.getString("email"); // ✅ getString, NOT .email()
        const type      = record.getString("type");
        const days      = record.getString("total_days");
        const startDate = (record.getString("start_date") || "").split(" ")[0];
        const endDate   = (record.getString("end_date")   || "").split(" ")[0];
        const reason    = record.getString("reason") || "Not provided";
        const status    = record.getString("status");

        const detailsHtml =
            "<table style='border-collapse:collapse;margin:12px 0;'>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Employee</b></td>  <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + empName   + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Leave Type</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + type      + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Duration</b></td>  <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + days      + " Day(s)</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>From</b></td>      <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + startDate + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>To</b></td>        <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + endDate   + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Reason</b></td>    <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + reason    + "</td></tr>" +
            "</table>";

        // A. Notify Employee — submission confirmation
        try {
            const pendingLabel = (status === "PENDING_HR") ? "pending HR review" : "pending manager review";
            $app.newMailClient().send(new MailerMessage({
                from: sender,
                to:   [{ address: empEmail }],
                subject: "Leave Application Submitted: " + type,
                html: "<h2>Leave Application Received</h2>" +
                      "<p>Hi <b>" + empName + "</b>,</p>" +
                      "<p>Your leave request has been submitted and is now <b>" + pendingLabel + "</b>.</p>" +
                      detailsHtml +
                      "<p style='color:#6b7280;font-size:13px;'>You will receive another email when the status changes.</p>",
            }));
            console.log("[LEAVE-EMAIL] Employee notified on submit: " + empEmail);
        } catch (err) {
            console.log("[LEAVE-EMAIL] Failed to notify employee on submit: " + err.toString());
        }

        // B. Notify Manager — action required
        if (managerId && status === "PENDING_MANAGER") {
            try {
                const manager      = $app.findRecordById("users", managerId);
                const managerEmail = manager.getString("email"); // ✅
                $app.newMailClient().send(new MailerMessage({
                    from: sender,
                    to:   [{ address: managerEmail }],
                    subject: "Action Required: " + type + " Leave — " + empName,
                    html: "<h2>Leave Approval Required</h2>" +
                          "<p><b>" + empName + "</b> has submitted a leave request that requires your approval.</p>" +
                          detailsHtml +
                          "<p>Please log in to the <b>OpenHR portal</b> to Approve or Reject this request.</p>",
                }));
                console.log("[LEAVE-EMAIL] Manager notified on submit: " + managerEmail);
            } catch (err) {
                console.log("[LEAVE-EMAIL] Failed to notify manager on submit: " + err.toString());
            }
        }

        // C. Notify Admin/HR — FYI on new submission
        try {
            const admins = $app.findRecordsByFilter(
                "users",
                "organization_id = '" + orgId + "' && (role = 'ADMIN' || role = 'HR')"
            );
            for (let i = 0; i < admins.length; i++) {
                const adminEmail = admins[i].getString("email"); // ✅
                if (adminEmail === empEmail) continue;
                try {
                    $app.newMailClient().send(new MailerMessage({
                        from: sender,
                        to:   [{ address: adminEmail }],
                        subject: "New Leave Request: " + empName + " — " + type,
                        html: "<h2>New Leave Application</h2>" +
                              "<p>A new leave request has been submitted in your organisation.</p>" +
                              detailsHtml +
                              "<p>Current Status: <b>" + status + "</b></p>",
                    }));
                    console.log("[LEAVE-EMAIL] Admin/HR notified on submit: " + adminEmail);
                } catch (err) {
                    console.log("[LEAVE-EMAIL] Failed to notify admin on submit: " + err.toString());
                }
            }
        } catch (err) {
            console.log("[LEAVE-EMAIL] Could not find Admin/HR users: " + err.toString());
        }

    } catch (err) {
        console.log("[LEAVE-EMAIL] Error in leave create hook: " + err.toString());
    }
}, "leaves");


// ============================================================
// 2. LEAVE UPDATED → Notify based on status transition
// ============================================================
onRecordAfterUpdateSuccess((e) => {
    const record    = e.record;
    const status    = record.getString("status");
    const empId     = record.getString("employee_id");
    const managerId = record.getString("line_manager_id");
    const orgId     = record.getString("organization_id");

    if (!status) return;

    try {
        // Sender — inlined
        const meta          = $app.settings().meta || {};
        const senderAddress = meta.senderAddress || "noreply@openhr.app";
        const senderName    = meta.senderName    || "OpenHR System";
        const sender        = { address: senderAddress, name: senderName };

        // Fetch employee record
        let employee;
        try {
            employee = $app.findRecordById("users", empId);
        } catch (err) {
            console.log("[LEAVE-EMAIL] Employee not found on update: " + empId);
            return;
        }

        const empName   = record.getString("employee_name") || employee.getString("name");
        const empEmail  = employee.getString("email"); // ✅
        const type      = record.getString("type");
        const days      = record.getString("total_days");
        const startDate = (record.getString("start_date") || "").split(" ")[0];
        const endDate   = (record.getString("end_date")   || "").split(" ")[0];
        const reason    = record.getString("reason") || "Not provided";

        const detailsHtml =
            "<table style='border-collapse:collapse;margin:12px 0;'>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Employee</b></td>  <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + empName   + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Leave Type</b></td><td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + type      + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Duration</b></td>  <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + days      + " Day(s)</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>From</b></td>      <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + startDate + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>To</b></td>        <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + endDate   + "</td></tr>" +
            "<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;'><b>Reason</b></td>    <td style='padding:8px 12px;border:1px solid #e5e7eb;'>" + reason    + "</td></tr>" +
            "</table>";

        // ── SCENARIO A: Manager approved → PENDING_HR ──────────────────────
        // Recipients: HR/Admin (action required) + Employee (FYI)
        if (status === "PENDING_HR") {
            const managerRemarks = record.getString("manager_remarks") || "No remarks";

            // Notify HR/Admin — action required
            try {
                const hrStaff = $app.findRecordsByFilter(
                    "users",
                    "organization_id = '" + orgId + "' && (role = 'HR' || role = 'ADMIN')"
                );
                for (let i = 0; i < hrStaff.length; i++) {
                    const hrEmail = hrStaff[i].getString("email"); // ✅
                    try {
                        $app.newMailClient().send(new MailerMessage({
                            from: sender,
                            to:   [{ address: hrEmail }],
                            subject: "HR Approval Required: " + empName + " — " + type + " Leave",
                            html: "<h2>Manager Approved — HR Review Required</h2>" +
                                  "<p>The leave request for <b>" + empName + "</b> has been " +
                                  "<b style='color:#f59e0b;'>approved by their manager</b> and awaits your final decision.</p>" +
                                  detailsHtml +
                                  "<p><b>Manager Remarks:</b> " + managerRemarks + "</p>" +
                                  "<p>Please log in to the <b>OpenHR portal</b> to approve or reject.</p>",
                        }));
                        console.log("[LEAVE-EMAIL] HR/Admin notified (pending_hr): " + hrEmail);
                    } catch (err) {
                        console.log("[LEAVE-EMAIL] Failed to notify HR (pending_hr): " + err.toString());
                    }
                }
            } catch (err) {
                console.log("[LEAVE-EMAIL] Could not find HR staff: " + err.toString());
            }

            // Notify Employee — waiting on HR
            try {
                $app.newMailClient().send(new MailerMessage({
                    from: sender,
                    to:   [{ address: empEmail }],
                    subject: "Leave Update: Manager Approved — Pending HR Review",
                    html: "<h2>Manager Approved Your Leave</h2>" +
                          "<p>Hi <b>" + empName + "</b>,</p>" +
                          "<p>Your leave request has been <b style='color:#f59e0b;'>approved by your manager</b> " +
                          "and is now pending final HR approval.</p>" +
                          detailsHtml +
                          "<p><b>Manager Remarks:</b> " + managerRemarks + "</p>" +
                          "<p style='color:#6b7280;font-size:13px;'>You will receive another email once HR makes a final decision.</p>",
                }));
                console.log("[LEAVE-EMAIL] Employee notified (pending_hr): " + empEmail);
            } catch (err) {
                console.log("[LEAVE-EMAIL] Failed to notify employee (pending_hr): " + err.toString());
            }
        }

        // ── SCENARIO B: Final APPROVED ──────────────────────────────────────
        // Recipients: Employee + Manager + HR/Admin (all get confirmation)
        if (status === "APPROVED") {
            const managerRemarks  = record.getString("manager_remarks")  || "No remarks";
            const approverRemarks = record.getString("approver_remarks") || "No remarks";

            // Notify Employee
            try {
                $app.newMailClient().send(new MailerMessage({
                    from: sender,
                    to:   [{ address: empEmail }],
                    subject: "✅ Leave Approved: " + type + " (" + startDate + " to " + endDate + ")",
                    html: "<h2>Leave Request Approved</h2>" +
                          "<p>Hi <b>" + empName + "</b>,</p>" +
                          "<p>Your leave request has been <b style='color:#10b981;'>fully approved</b>.</p>" +
                          detailsHtml +
                          "<p><b>Manager Remarks:</b> " + managerRemarks + "</p>" +
                          "<p><b>HR/Admin Remarks:</b> " + approverRemarks + "</p>" +
                          "<p style='color:#6b7280;font-size:13px;'>Enjoy your time off!</p>",
                }));
                console.log("[LEAVE-EMAIL] Employee notified (approved): " + empEmail);
            } catch (err) {
                console.log("[LEAVE-EMAIL] Failed to notify employee (approved): " + err.toString());
            }

            // Notify Manager
            if (managerId) {
                try {
                    const manager      = $app.findRecordById("users", managerId);
                    const managerEmail = manager.getString("email"); // ✅
                    $app.newMailClient().send(new MailerMessage({
                        from: sender,
                        to:   [{ address: managerEmail }],
                        subject: "Leave Approved (Final): " + empName + " — " + type,
                        html: "<h2>Leave Approved — Final Decision</h2>" +
                              "<p>The leave request you reviewed for <b>" + empName + "</b> has received " +
                              "<b style='color:#10b981;'>final HR/Admin approval</b>.</p>" +
                              detailsHtml +
                              "<p><b>HR/Admin Remarks:</b> " + approverRemarks + "</p>",
                    }));
                    console.log("[LEAVE-EMAIL] Manager notified (approved): " + managerEmail);
                } catch (err) {
                    console.log("[LEAVE-EMAIL] Failed to notify manager (approved): " + err.toString());
                }
            }

            // Notify HR/Admin — record confirmation
            try {
                const admins = $app.findRecordsByFilter(
                    "users",
                    "organization_id = '" + orgId + "' && (role = 'ADMIN' || role = 'HR')"
                );
                for (let i = 0; i < admins.length; i++) {
                    const adminEmail = admins[i].getString("email"); // ✅
                    try {
                        $app.newMailClient().send(new MailerMessage({
                            from: sender,
                            to:   [{ address: adminEmail }],
                            subject: "Leave Approved: " + empName + " — " + type,
                            html: "<h2>Leave Request — Fully Approved</h2>" +
                                  "<p>This leave request has been fully approved.</p>" +
                                  detailsHtml +
                                  "<p><b>HR/Admin Remarks:</b> " + approverRemarks + "</p>",
                        }));
                        console.log("[LEAVE-EMAIL] Admin/HR notified (approved): " + adminEmail);
                    } catch (err) {
                        console.log("[LEAVE-EMAIL] Failed to notify admin (approved): " + err.toString());
                    }
                }
            } catch (err) {
                console.log("[LEAVE-EMAIL] Could not find admins (approved): " + err.toString());
            }
        }

        // ── SCENARIO C: REJECTED (by Manager or HR/Admin) ──────────────────
        // Recipients: Employee + Manager + HR/Admin
        if (status === "REJECTED") {
            const managerRemarks  = record.getString("manager_remarks")  || "No remarks";
            const approverRemarks = record.getString("approver_remarks") || "No remarks";
            const rejectRemarks   = (approverRemarks !== "No remarks") ? approverRemarks : managerRemarks;

            // Notify Employee
            try {
                $app.newMailClient().send(new MailerMessage({
                    from: sender,
                    to:   [{ address: empEmail }],
                    subject: "❌ Leave Rejected: " + type + " (" + startDate + ")",
                    html: "<h2>Leave Request Rejected</h2>" +
                          "<p>Hi <b>" + empName + "</b>,</p>" +
                          "<p>Your leave request has been <b style='color:#ef4444;'>rejected</b>.</p>" +
                          detailsHtml +
                          "<p><b>Manager Remarks:</b> " + managerRemarks + "</p>" +
                          "<p><b>HR/Admin Remarks:</b> " + approverRemarks + "</p>" +
                          "<p style='color:#6b7280;font-size:13px;'>If you have questions, please contact your manager or HR department.</p>",
                }));
                console.log("[LEAVE-EMAIL] Employee notified (rejected): " + empEmail);
            } catch (err) {
                console.log("[LEAVE-EMAIL] Failed to notify employee (rejected): " + err.toString());
            }

            // Notify Manager
            if (managerId) {
                try {
                    const manager      = $app.findRecordById("users", managerId);
                    const managerEmail = manager.getString("email"); // ✅
                    $app.newMailClient().send(new MailerMessage({
                        from: sender,
                        to:   [{ address: managerEmail }],
                        subject: "Leave Rejected: " + empName + " — " + type,
                        html: "<h2>Leave Rejected — Final Decision</h2>" +
                              "<p>The leave request for <b>" + empName + "</b> has been <b style='color:#ef4444;'>rejected</b>.</p>" +
                              detailsHtml +
                              "<p><b>Rejection Reason:</b> " + rejectRemarks + "</p>",
                    }));
                    console.log("[LEAVE-EMAIL] Manager notified (rejected): " + managerEmail);
                } catch (err) {
                    console.log("[LEAVE-EMAIL] Failed to notify manager (rejected): " + err.toString());
                }
            }

            // Notify HR/Admin
            try {
                const admins = $app.findRecordsByFilter(
                    "users",
                    "organization_id = '" + orgId + "' && (role = 'ADMIN' || role = 'HR')"
                );
                for (let i = 0; i < admins.length; i++) {
                    const adminEmail = admins[i].getString("email"); // ✅
                    try {
                        $app.newMailClient().send(new MailerMessage({
                            from: sender,
                            to:   [{ address: adminEmail }],
                            subject: "Leave Rejected: " + empName + " — " + type,
                            html: "<h2>Leave Request — Rejected</h2>" +
                                  "<p>The following leave request has been rejected.</p>" +
                                  detailsHtml +
                                  "<p><b>Rejection Reason:</b> " + rejectRemarks + "</p>",
                        }));
                        console.log("[LEAVE-EMAIL] Admin/HR notified (rejected): " + adminEmail);
                    } catch (err) {
                        console.log("[LEAVE-EMAIL] Failed to notify admin (rejected): " + err.toString());
                    }
                }
            } catch (err) {
                console.log("[LEAVE-EMAIL] Could not find admins (rejected): " + err.toString());
            }
        }

    } catch (err) {
        console.log("[LEAVE-EMAIL] Error in leave update hook: " + err.toString());
    }
}, "leaves");

// ────────────────────────────────────────────────────────────────
// WebP image format validation (lenient — log only, don't reject)
// Warns when non-webp images are uploaded so we can track adoption.
// ────────────────────────────────────────────────────────────────
(function() {
    var imageFieldMap = {
        "users": ["avatar"],
        "attendance": ["selfie"],
        "organizations": ["logo"],
        "blog_posts": ["cover_image"],
        "tutorials": ["cover_image"],
        "showcase_organizations": ["logo"],
        "upgrade_requests": ["donation_screenshot"],
        "content_images": ["image"]
    };

    var collections = Object.keys(imageFieldMap);
    for (var i = 0; i < collections.length; i++) {
        (function(collectionName) {
            var fields = imageFieldMap[collectionName];

            onRecordCreateRequest(function(e) {
                try {
                    var fm = e.filesMap || {};
                    for (var f = 0; f < fields.length; f++) {
                        var files = fm[fields[f]];
                        if (files && files.length > 0) {
                            for (var j = 0; j < files.length; j++) {
                                var hdr = files[j].header || {};
                                var ctArr = hdr["Content-Type"] || [];
                                var ct = ctArr.length > 0 ? ctArr[0] : "";
                                var name = files[j].name || "";
                                if (ct && ct !== "image/webp" && ct.indexOf("image/") === 0) {
                                    console.log("[WEBP-WARN] Non-webp upload on " + collectionName + "." + fields[f] + ": " + name + " (" + ct + ")");
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.log("[WEBP-WARN] Check failed (non-blocking): " + err.toString());
                }
                return e.next();
            }, collectionName);

            onRecordUpdateRequest(function(e) {
                try {
                    var fm = e.filesMap || {};
                    for (var f = 0; f < fields.length; f++) {
                        var files = fm[fields[f]];
                        if (files && files.length > 0) {
                            for (var j = 0; j < files.length; j++) {
                                var hdr = files[j].header || {};
                                var ctArr = hdr["Content-Type"] || [];
                                var ct = ctArr.length > 0 ? ctArr[0] : "";
                                var name = files[j].name || "";
                                if (ct && ct !== "image/webp" && ct.indexOf("image/") === 0) {
                                    console.log("[WEBP-WARN] Non-webp upload on " + collectionName + "." + fields[f] + ": " + name + " (" + ct + ")");
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.log("[WEBP-WARN] Check failed (non-blocking): " + err.toString());
                }
                return e.next();
            }, collectionName);
        })(collections[i]);
    }
    console.log("[HOOKS] WebP validation hooks registered (lenient mode).");
})();

console.log("[HOOKS] OpenHR System Hooks loaded successfully with country-based registration support.");
