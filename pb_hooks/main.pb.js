console.log("[HOOKS] Loading OpenHR System Hooks (v0.36+)...");

/* ============================================================
   1. SECURE REGISTRATION ENDPOINT (Public)
   Method: POST /api/openhr/register
   Body: JSON { orgName, adminName, email, password }
   ============================================================ */
routerAdd("POST", "/api/openhr/register", (e) => {
    try {
        console.log("[REGISTER] Request received.");

        // CORRECT: e.requestInfo() returns full request info, actual body is in .body property
        let data = {};
        try {
            const requestInfo = e.requestInfo();
            console.log("[REGISTER] RequestInfo keys: query, headers, body, auth, method, context");
            
            // The actual body data is nested inside requestInfo.body
            if (requestInfo && requestInfo.body && typeof requestInfo.body === 'object') {
                data = requestInfo.body;
                console.log("[REGISTER] Successfully extracted body data");
            } else {
                console.error("[REGISTER] Body data not found in expected location");
                return e.json(400, { message: "Invalid request body structure" });
            }
            
            console.log("[REGISTER] Extracted data keys: " + Object.keys(data).join(", "));
        } catch (parseErr) {
            console.error("[REGISTER] Error extracting body: " + parseErr.toString());
            return e.json(400, { message: "Invalid request body: " + parseErr.toString() });
        }

        const orgName = data.orgName;
        const adminName = data.adminName;
        const email = data.email;
        const password = data.password;

        console.log("[REGISTER] Extracted fields - Org: " + orgName + ", Email: " + email);

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
        
        try {
            $app.save(org);
            console.log("[REGISTER] Organization created with ID: " + org.id);
        } catch (err) {
            console.error("[REGISTER] Org Save Failed: " + err);
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
            console.log("[REGISTER] Admin user created with ID: " + user.id);
        } catch (err) {
            console.error("[REGISTER] User Save Failed: " + err);
            try { $app.delete(org); } catch(_) {} // Rollback org
            return e.json(400, { message: "Database Error (User): " + err.message });
        }

        // 5. Initialize Default Settings
        try {
            const settingsCollection = $app.findCollectionByNameOrId("settings");
            
            // Helper to create setting
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
            
            console.log("[REGISTER] Settings initialized");
        } catch (err) {
            console.error("[REGISTER] Settings Init Failed (Non-fatal): " + err);
        }
        
        // 6. Send Verification Email
        try {
            console.log("[REGISTER] Attempting to send verification email to: " + email);
            
            // Check if mail client is configured
            const mailClient = $app.newMailClient();
            console.log("[REGISTER] Mail client initialized");
            
            mailClient.sendUserVerification(user);
            console.log("[REGISTER] Verification email sent successfully to: " + email);
        } catch (err) {
            console.error("[REGISTER] Email Send Failed: " + err.toString());
            console.error("[REGISTER] Mail might not be configured. Check PocketBase Settings → Mail");
            
            // Don't fail registration if email fails - user can still be verified manually
            // But warn the user
        }

        return e.json(200, { success: true, message: "Organization created. Please verify your email." });

    } catch (globalErr) {
        console.error("[REGISTER] CRITICAL SERVER ERROR: " + globalErr);
        return e.json(500, { message: "Internal Server Error: " + globalErr.toString() });
    }
});

/* ============================================================
   2. ENFORCE EMAIL VERIFICATION
   ============================================================ */
try {
    // Using onRecordBeforeAuthWithPasswordRequest with correct syntax
    onRecordBeforeAuthWithPasswordRequest((e) => {
        // Check if the user record exists and is verified
        if (e.record && !e.record.get("verified")) {
            // Throw error to prevent login
            throw new BadRequestError("Account not verified. Please check your email.");
        }
    }, "users");
    console.log("[HOOKS] Email verification hook registered successfully.");
} catch (e) {
    console.log("[HOOKS] Verification hook registration warning: " + e.toString());
}

/* ============================================================
   2B. TEST EMAIL ENDPOINT (For debugging mail configuration)
   Method: POST /api/openhr/test-email
   Body: JSON { email: "test@example.com" }
   ============================================================ */
routerAdd("POST", "/api/openhr/test-email", (e) => {
    try {
        console.log("[EMAIL_TEST] Test email request received");
        
        const data = e.requestInfo().body || {};
        const testEmail = data.email || "test@example.com";
        
        console.log("[EMAIL_TEST] Attempting to send test email to: " + testEmail);
        
        try {
            const message = new MailerMessage({
                from: { address: "noreply@yourdomain.com", name: "OpenHR System" },
                to: [{ address: testEmail }],
                subject: "Test Email from OpenHR",
                html: "<h1>Test Email</h1><p>If you see this, email is configured correctly!</p><p>Sent at: " + new Date().toISOString() + "</p>",
            });
            
            $app.newMailClient().send(message);
            console.log("[EMAIL_TEST] Test email sent successfully");
            
            return e.json(200, { 
                success: true, 
                message: "Test email sent to " + testEmail + ". Check your inbox!" 
            });
        } catch (mailErr) {
            console.error("[EMAIL_TEST] Mail send failed: " + mailErr.toString());
            return e.json(400, { 
                message: "Email test failed: " + mailErr.toString() + ". Check PocketBase Settings → Mail Configuration."
            });
        }
        
    } catch (globalErr) {
        console.error("[EMAIL_TEST] Critical error: " + globalErr.toString());
        return e.json(500, { message: "Test failed: " + globalErr.toString() });
    }
});

/* ============================================================
   2C. ADMIN VERIFICATION ENDPOINT (Manual fallback)
   Method: POST /api/openhr/admin-verify-user
   Body: JSON { userId: "user_id" }
   Auth: Requires authenticated admin token
   ============================================================ */
routerAdd("POST", "/api/openhr/admin-verify-user", (e) => {
    try {
        console.log("[ADMIN_VERIFY] Admin verification request received");
        
        // Check if user is authenticated and is ADMIN
        if (!e.auth || !e.auth.record) {
            return e.json(401, { message: "Unauthorized: Admin authentication required" });
        }
        
        const adminRole = e.auth.record.getString("role");
        if (adminRole !== "ADMIN") {
            console.error("[ADMIN_VERIFY] Unauthorized: User is not admin, role: " + adminRole);
            return e.json(403, { message: "Forbidden: Admin access required" });
        }
        
        const data = e.requestInfo().body || {};
        const userId = data.userId;
        
        if (!userId) {
            return e.json(400, { message: "userId is required" });
        }
        
        try {
            const user = $app.findRecordById("users", userId);
            
            if (!user) {
                return e.json(404, { message: "User not found" });
            }
            
            // Check if already verified
            if (user.get("verified")) {
                return e.json(400, { message: "User is already verified" });
            }
            
            // Verify the user
            user.set("verified", true);
            $app.save(user);
            
            console.log("[ADMIN_VERIFY] User verified by admin: " + user.getString("email"));
            
            // Send notification email to user
            try {
                const message = new MailerMessage({
                    from: { address: "noreply@yourdomain.com", name: "OpenHR System" },
                    to: [{ address: user.getString("email") }],
                    subject: "Account Verified - OpenHR System",
                    html: "<h2>Account Verified</h2><p>Your OpenHR account has been verified by an administrator.</p><p>You can now log in to the system.</p>",
                });
                
                $app.newMailClient().send(message);
            } catch (notifyErr) {
                console.warn("[ADMIN_VERIFY] Could not send notification email: " + notifyErr.toString());
            }
            
            return e.json(200, { 
                success: true, 
                message: "User " + user.getString("email") + " verified successfully. Notification email sent." 
            });
        } catch (dbErr) {
            console.error("[ADMIN_VERIFY] Database error: " + dbErr.toString());
            return e.json(400, { message: "Verification failed: " + dbErr.toString() });
        }
        
    } catch (globalErr) {
        console.error("[ADMIN_VERIFY] Critical error: " + globalErr.toString());
        return e.json(500, { message: "Internal error: " + globalErr.toString() });
    }
});

/* ============================================================
   2D. LIST UNVERIFIED USERS (For admin dashboard)
   Method: GET /api/openhr/unverified-users
   Auth: Requires authenticated admin token
   ============================================================ */
routerAdd("GET", "/api/openhr/unverified-users", (e) => {
    try {
        // Check if user is authenticated and is ADMIN
        if (!e.auth || !e.auth.record) {
            return e.json(401, { message: "Unauthorized" });
        }
        
        const adminRole = e.auth.record.getString("role");
        if (adminRole !== "ADMIN") {
            return e.json(403, { message: "Forbidden: Admin access required" });
        }
        
        const adminOrgId = e.auth.record.getString("organization_id");
        
        try {
            // Get all unverified users in admin's organization
            const records = $app.findAllRecordsByFilter(
                "users", 
                "organization_id='" + adminOrgId + "' && verified=false"
            );
            
            console.log("[ADMIN] Retrieved " + records.length + " unverified users");
            
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
            
            return e.json(200, { 
                success: true,
                count: unverifiedUsers.length,
                users: unverifiedUsers
            });
        } catch (err) {
            console.error("[ADMIN] Error fetching unverified users: " + err.toString());
            return e.json(400, { message: "Failed to fetch users: " + err.toString() });
        }
        
    } catch (globalErr) {
        console.error("[ADMIN] Critical error: " + globalErr.toString());
        return e.json(500, { message: "Internal error: " + globalErr.toString() });
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
            const settings = $app.settings(); // v0.36+ access to app settings
            const meta = settings.meta || {};
            const senderAddress = meta.senderAddress || "hr@vclbd.net";
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
            console.error("[EMAIL] Failed: " + err.toString());
            record.set("status", "FAILED");
            record.set("error_message", err.toString());
            $app.save(record);
        }
    }, "reports_queue");
    console.log("[HOOKS] Email notification hook registered.");
} catch(e) { 
    console.log("[HOOKS] Email hook error: " + e.toString()); 
}

/* ============================================================
   4. LEAVE NOTIFICATIONS
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
                // Ensure we copy the org ID to the email queue for visibility rules (if any)
                rec.set("organization_id", leave.getString("organization_id"));
                $app.save(rec);
            } catch (err) { 
                console.error("[LEAVE_HOOK] Queue failed: " + err.toString()); 
            }
        }

        try {
            const employee = $app.findRecordById("users", empId);
            const type = leave.getString("type");
            
            if (managerId) {
                const manager = $app.findRecordById("users", managerId);
                queueEmail(manager.getString("email"), "New Leave Request: " + type, "<p><strong>" + employee.getString("name") + "</strong> has requested " + type + " leave.</p>");
            }
        } catch (err) { 
            console.error("[LEAVE_HOOK] Error: " + err.toString()); 
        }
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
            } catch(err) { 
                console.error("[LEAVE_HOOK] Update error: " + err.toString()); 
            }
        }
    }, "leaves");
    console.log("[HOOKS] Leave notification hooks registered.");
} catch(e) { 
    console.log("[HOOKS] Leave hooks error: " + e.toString()); 
}

console.log("[HOOKS] OpenHR System Hooks loaded successfully!");