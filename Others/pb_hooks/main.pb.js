
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

            // Use PocketBase's built-in requestVerification
            // This generates a proper token and sends email using admin-configured template
            $app.newMailClient().sendUserVerification(user);

            console.log("[REGISTER] Verification email sent successfully to: " + email);
        } catch (err) {
            // Non-fatal: User is created, they can request resend from login page
            console.error("[REGISTER] Email Send Failed (user created, can resend): " + err.toString());
        }

        return e.json(200, { success: true, message: "Organization created. Please verify your email." });

    } catch (globalErr) {
        return e.json(500, { message: "Internal Server Error: " + globalErr.toString() });
    }
});

/* ============================================================
   2. ENFORCE EMAIL VERIFICATION
   ============================================================ */
try {
    onRecordBeforeAuthWithPasswordRequest((e) => {
        if (e.record && !e.record.get("verified")) {
            throw new BadRequestError("Account not verified. Please check your email.");
        }
    }, "users");
} catch (e) {}

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
