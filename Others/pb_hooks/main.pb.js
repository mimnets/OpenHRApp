
console.log("[HOOKS] Loading OpenHR System Hooks (v0.36+)...");

/* ============================================================
   1. SECURE REGISTRATION ENDPOINT (Public)
   Method: POST /api/openhr/register
   Body: JSON { orgName, adminName, email, password }
   ============================================================ */
routerAdd("POST", "/api/openhr/register", (e) => {
    try {
        console.log("[REGISTER] Request received.");

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

        const orgName = data.orgName;
        const adminName = data.adminName;
        const email = data.email;
        const password = data.password;

        if (!email || !password || !orgName) {
            return e.json(400, { message: "Missing required fields: orgName, email, or password." });
        }
        if (password.length < 8) {
            return e.json(400, { message: "Password must be at least 8 characters." });
        }

        // 2. Check if email exists
        try {
            const u = $app.findFirstRecordByFilter("users", "email='" + email + "'");
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
        org.set("subscription_status", "TRIAL");

        // Set trial end date to 14 days from now
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        org.set("trial_end_date", trialEndDate.toISOString());

        try {
            $app.save(org);
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

        // 5. Initialize Default Settings
        try {
            const settingsCollection = $app.findCollectionByNameOrId("settings");
            
            function createSetting(key, val) {
                const s = new Record(settingsCollection);
                s.set("key", key);
                s.set("value", val);
                s.set("organization_id", org.id);
                $app.save(s);
            }

            createSetting("app_config", { 
                companyName: orgName, 
                workingDays: ["Monday","Tuesday","Wednesday","Thursday","Sunday"],
                officeStartTime: "09:00",
                officeEndTime: "18:00"
            });
            createSetting("departments", ["Engineering", "HR", "Sales", "Marketing"]);
            createSetting("designations", ["Manager", "Lead", "Associate", "Intern"]);
        } catch (err) {
            console.error("[REGISTER] Settings Init Failed (Non-fatal): " + err);
        }
        
        // 6. Send Verification Email using PocketBase's built-in method
        // This ensures proper token generation and uses the configured email template
        try {
            console.log("[REGISTER] Sending verification email to: " + email);

            // Re-fetch the user record to ensure it's fully saved before sending email
            const savedUser = $app.findRecordById("users", user.id);

            // Use PocketBase's mails helper to send verification email
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
                daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
            const message = new MailerMessage({
                from: { address: "noreply@yourdomain.com", name: "OpenHR System" },
                to: [{ address: testEmail }],
                subject: "Test Email from OpenHR",
                html: "<h1>Test Email</h1><p>If you see this, email is configured correctly!</p>",
            });
            $app.newMailClient().send(message);
            return e.json(200, { success: true, message: "Test email sent!" });
        } catch (mailErr) {
            return e.json(400, { message: "Email test failed: " + mailErr.toString() });
        }
    } catch (globalErr) {
        return e.json(500, { message: "Test failed: " + globalErr.toString() });
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
            
            try {
                const message = new MailerMessage({
                    from: { address: "noreply@openhr.app", name: "OpenHR System" },
                    to: [{ address: user.getString("email") }],
                    subject: "Account Verified",
                    html: "<p>Your account has been verified by your admin.</p>",
                });
                $app.newMailClient().send(message);
            } catch (notifyErr) {}
            
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
            const records = $app.findAllRecordsByFilter("users", "organization_id='" + adminOrgId + "' && verified=false");
            
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
                const admins = $app.findRecordsByFilter("users", "organization_id = '" + orgId + "' && role = 'ADMIN'");

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
                "key = 'ad_config_" + slot + "' && organization_id = '" + adConfigOrgId + "'"
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
                const admins = $app.findRecordsByFilter("users", "organization_id = '" + orgId + "' && role = 'ADMIN'");
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
            const admins = $app.findRecordsByFilter("users", "organization_id = '" + orgId + "' && role = 'ADMIN'");
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
   ============================================================ */
try {
    onRecordAfterCreateSuccess((e) => {
        const leave = e.record;
        const empId = leave.getString("employee_id");
        const managerId = leave.getString("line_manager_id");
        
        function queueEmail(recipient, subject, htmlBody) {
            if (!recipient || !recipient.includes("@")) return;
            try {
                const col = $app.findCollectionByNameOrId("reports_queue");
                const rec = new Record(col);
                rec.set("recipient_email", recipient);
                rec.set("subject", subject);
                rec.set("html_content", htmlBody);
                rec.set("status", "PENDING"); 
                rec.set("type", "LEAVE_ALERT");
                rec.set("organization_id", leave.getString("organization_id"));
                $app.save(rec);
            } catch (err) {}
        }

        try {
            const employee = $app.findRecordById("users", empId);
            const type = leave.getString("type");
            
            if (managerId) {
                const manager = $app.findRecordById("users", managerId);
                queueEmail(manager.getString("email"), "New Leave Request: " + type, "<p><strong>" + employee.getString("name") + "</strong> has requested " + type + " leave.</p>");
            }
        } catch (err) {}
    }, "leaves");

    onRecordAfterUpdateSuccess((e) => {
        const leave = e.record;
        const status = leave.getString("status");
        const empId = leave.getString("employee_id");

        if (status === "APPROVED" || status === "REJECTED") {
            try {
                const employee = $app.findRecordById("users", empId);
                const col = $app.findCollectionByNameOrId("reports_queue");
                const rec = new Record(col);
                rec.set("recipient_email", employee.getString("email"));
                rec.set("subject", "Leave Request " + status);
                rec.set("html_content", "<p>Your leave request has been <strong>" + status + "</strong>.</p>");
                rec.set("status", "PENDING");
                rec.set("type", "LEAVE_DECISION");
                rec.set("organization_id", leave.getString("organization_id"));
                $app.save(rec);
            } catch(err) {}
        }
    }, "leaves");
} catch(e) {}
