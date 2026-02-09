
console.log("[HOOKS] Loading OpenHR System Hooks (v0.36+)...");

/* ============================================================
   1. SECURE REGISTRATION ENDPOINT (Public)
   Method: POST /api/openhr/register
   Body: JSON { orgName, adminName, email, password }
   ============================================================ */
routerAdd("POST", "/api/openhr/register", (e) => {
    try {
        console.log("[REGISTER] Request received.");

        // FIX for v0.36+: Use $apis.requestInfo(e) to parse body
        // The 'e' argument is a core.RequestEvent which may not have .bind() directly exposed in JSVM
        const info = $apis.requestInfo(e);
        const data = info.data || {};

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
            
        } catch (err) {
            console.error("[REGISTER] Settings Init Failed (Non-fatal): " + err);
        }
        
        // 6. Send Verification Email
        try {
            $app.newMailClient().sendUserVerification(user);
        } catch (err) {
            console.error("[REGISTER] Email Send Failed: " + err);
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
    onRecordBeforeAuthWithPasswordRequest((e) => {
        // v0.36 check: e.record might be nil if auth fails before this?
        // Usually e.record is the user record attempting to login.
        if (e.record && !e.record.get("verified")) {
            // Throwing error returns 400 to client
            throw new BadRequestError("Account not verified. Please check your email.");
        }
    }, "users");
} catch (e) {
    console.log("[HOOKS] Verification hook registration warning: " + e);
}

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
} catch(e) { console.log("Email hook error: " + e); }

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
            } catch (err) { console.error("[LEAVE_HOOK] Queue failed: " + err.toString()); }
        }

        try {
            const employee = $app.findRecordById("users", empId);
            const type = leave.getString("type");
            
            if (managerId) {
                const manager = $app.findRecordById("users", managerId);
                queueEmail(manager.email(), "New Leave Request: " + type, "<p><strong>" + employee.getString("name") + "</strong> has requested " + type + " leave.</p>");
            }
        } catch (err) { console.error("[LEAVE_HOOK] Error: " + err.toString()); }
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
                rec.set("recipient_email", employee.email());
                rec.set("subject", "Leave Request " + status);
                rec.set("html_content", "<p>Your leave request has been <strong>" + status + "</strong>.</p>");
                rec.set("status", "PENDING");
                rec.set("type", "LEAVE_DECISION");
                rec.set("organization_id", leave.getString("organization_id"));
                $app.save(rec);
            } catch(err) { console.error(err); }
        }
    }, "leaves");
} catch(e) { console.log("Leave hooks error: " + e); }
