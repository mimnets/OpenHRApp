# Employee Verification Email System

## Overview
Enhanced email notification system for employee account verification with automatic emails sent at key moments in the employee lifecycle.

## ✨ Features Implemented

### 1. **Automatic Verification Email on Employee Creation**
When an admin creates a new employee account, the system automatically sends a verification email to the employee.

**Trigger:** Admin creates a new employee via Employee Directory
**Email Sent:** Verification email with secure token link
**Action Required:** Employee clicks the verification link to activate their account

### 2. **Admin Manual Verification with Professional Email**
Admins can manually verify employees, and the system sends a beautiful, professional confirmation email.

**Trigger:** Admin manually verifies a user from the admin panel
**Email Sent:** Professional HTML email confirming account verification
**Action Required:** None - employee can now log in

---

## 🔄 How It Works

### Flow 1: Admin Creates New Employee

1. **Admin Action:**
   - Goes to Employee Directory
   - Clicks "Add Employee"
   - Fills in employee details (name, email, role, etc.)
   - Submits the form

2. **Backend Processing:**
   - User record created in PocketBase with `verified: false`
   - Hook triggers: `onRecordAfterCreateSuccess` on "users" collection
   - System checks: Is this a regular employee? (not ADMIN or SUPER_ADMIN)
   - System checks: Is user unverified? (verified === false)

3. **Email Sent:**
   - PocketBase's built-in verification email sent
   - Contains secure token link
   - Email subject: "Verify your email"
   - Link format: `https://yourapp.com/verify?token=SECURE_TOKEN`

4. **Employee Action:**
   - Employee receives email
   - Clicks verification link
   - Account activated
   - Can now log in

### Flow 2: Admin Manually Verifies Employee

1. **Admin Action:**
   - Goes to admin panel / unverified users list
   - Clicks "Verify" on an employee
   - API call to `/api/openhr/admin-verify-user`

2. **Backend Processing:**
   - User's `verified` field set to `true`
   - Professional HTML email generated with:
     - Organization name
     - Employee name
     - Success icon and branding
     - Login button
     - Next steps instructions

3. **Email Sent:**
   - Subject: "✓ Your Account Has Been Verified - [Organization Name]"
   - Beautiful HTML template with:
     - Success confirmation
     - What's next instructions
     - Direct login link
     - Contact info

4. **Employee Action:**
   - Employee receives confirmation
   - Can now log in
   - Full access granted

---

## 📧 Email Templates

### Template 1: Verification Email (Built-in)
Uses PocketBase's default verification email template configured in PocketBase Admin UI.

**Customization Location:**
1. Open PocketBase Admin UI
2. Go to Settings → Mail templates
3. Edit "Verification" template
4. Customize subject, body, and styling

### Template 2: Admin Verification Confirmation (Custom)
Professional HTML email with modern design.

**Features:**
- Gradient header with success icon
- Personalized greeting
- Organization name included
- Clear next steps
- Login button
- Responsive design
- Professional footer

**Customization:**
Edit the HTML template in `main.pb.js` at the `admin-verify-user` endpoint (around line 400).

---

## 🧪 Testing

### Test 1: Employee Creation Email

1. **Setup:**
   - Log in as Admin
   - Have a test email address ready (use a real email or a test service like Mailtrap)

2. **Steps:**
   ```bash
   # 1. Create new employee
   - Go to Employee Directory
   - Click "Add Employee"
   - Enter:
     - Name: Test Employee
     - Email: test.employee@example.com (use real email for testing)
     - Employee ID: EMP-001
     - Department: Engineering
     - Role: EMPLOYEE
     - Password: (set a password)
   - Submit
   ```

3. **Expected Result:**
   - Employee created successfully
   - Backend console log: `[EMPLOYEE-CREATE] Sending verification email to new employee: test.employee@example.com`
   - Backend console log: `[EMPLOYEE-CREATE] Verification email sent successfully to: test.employee@example.com`
   - Email received with verification link

4. **Verify:**
   - Check test email inbox
   - Click verification link
   - Account should be verified
   - Can now log in

### Test 2: Admin Manual Verification Email

1. **Setup:**
   - Have an unverified employee in the system
   - Or create one following Test 1 but don't click the verification link

2. **Steps:**
   ```bash
   # 1. Call admin-verify-user endpoint
   curl -X POST https://yourapp.com/api/openhr/admin-verify-user \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"userId": "USER_ID_HERE"}'
   ```

   Or use the frontend UI if available:
   - Go to Admin → Unverified Users
   - Click "Verify" on an employee

3. **Expected Result:**
   - User verified successfully
   - Backend console log: `[ADMIN-VERIFY] Verification confirmation email sent to: test.employee@example.com`
   - Professional HTML email received

4. **Verify:**
   - Check email inbox
   - Email has:
     - Subject: "✓ Your Account Has Been Verified - [Org Name]"
     - Beautiful HTML design
     - Success icon
     - Organization name
     - Login button
     - Next steps

### Test 3: Edge Cases

**Test 3.1: Admin Account Creation (Should NOT Send Email)**
- Create a new ADMIN user
- Verify no verification email is sent (admins verify through registration flow)

**Test 3.2: Already Verified User**
- Try to verify an already verified user
- Should return error: "User is already verified"

**Test 3.3: Email Failure (Non-Fatal)**
- Disconnect internet or use invalid SMTP settings
- Create employee
- Employee created successfully but email fails
- Check console for error log
- Employee can request verification resend

---

## 🔧 Configuration

### Email Settings (PocketBase Admin UI)

1. **SMTP Configuration:**
   ```
   Settings → Mail settings
   - SMTP host: smtp.gmail.com (or your provider)
   - SMTP port: 587
   - Username: your-email@gmail.com
   - Password: your-app-password
   - Sender name: OpenHR System
   - Sender address: noreply@openhr.app
   ```

2. **App URL (for email links):**
   ```javascript
   // Set in PocketBase Admin UI → Settings → Application
   meta.appUrl = "https://yourapp.com"
   ```

### Hook Configuration

The hooks are automatically registered in `main.pb.js`:

```javascript
// Line 1325+: Employee verification email hook
onRecordAfterCreateSuccess((e) => {
  // Triggers when new employee is created
  // Sends verification email automatically
}, "users");

// Line 358+: Admin-verify-user endpoint
// Improved email template for admin verification
```

---

## 📊 Backend Logs

### Successful Employee Creation:
```
[EMPLOYEE-CREATE] Sending verification email to new employee: john@example.com
[EMPLOYEE-CREATE] Verification email sent successfully to: john@example.com
```

### Successful Admin Verification:
```
[ADMIN-VERIFY] Verification confirmation email sent to: john@example.com
```

### Email Send Failure (Non-Fatal):
```
[EMPLOYEE-CREATE] Failed to send verification email: SMTP connection failed
```

### Hook Registration:
```
[HOOKS] Loading OpenHR System Hooks (v0.37 - Employee Verification Email Support)...
```

---

## 🐛 Troubleshooting

### Email Not Received

1. **Check SMTP Settings:**
   - Go to PocketBase Admin → Settings → Mail settings
   - Test email configuration
   - Verify SMTP credentials

2. **Check Backend Logs:**
   - Look for `[EMPLOYEE-CREATE]` or `[ADMIN-VERIFY]` logs
   - Check for error messages

3. **Check Spam Folder:**
   - Verification emails might be in spam
   - Add sender to whitelist

4. **Check Email Service:**
   - Some email providers (Gmail) require app-specific passwords
   - Enable "Less secure app access" if needed

### Verification Link Doesn't Work

1. **Check App URL:**
   - Verify `meta.appUrl` is set correctly in PocketBase settings
   - Should match your actual app domain

2. **Check Token Expiry:**
   - Verification tokens expire after 7 days by default
   - Request new verification email if expired

3. **Check Frontend Route:**
   - Verify `/verify` route exists in frontend
   - Verify route handles token parameter

### Hook Not Triggering

1. **Check Hook Registration:**
   - Look for hook registration errors in console
   - Verify `main.pb.js` is in `pb_data/pb_hooks/` directory

2. **Restart PocketBase:**
   ```bash
   # Stop PocketBase (Ctrl+C)
   # Restart
   ./pocketbase serve
   ```

3. **Check User Role:**
   - Hook skips ADMIN and SUPER_ADMIN roles
   - Only triggers for regular employees

---

## 🔒 Security Features

1. **Organization Isolation:**
   - Admin can only verify users in their own organization
   - Security check: `user.organization_id === admin.organization_id`

2. **Authentication Required:**
   - Admin-verify endpoint requires authentication
   - Only admins can verify users

3. **Secure Token Generation:**
   - Uses PocketBase's built-in token system
   - Tokens are cryptographically secure
   - Tokens expire after 7 days

4. **Email Validation:**
   - Email addresses validated before sending
   - Invalid emails logged but don't break flow

---

## 📝 Implementation Details

### Files Modified:

1. **`Others/pb_hooks/main.pb.js`**
   - Line 1: Updated version to v0.37
   - Line 358-460: Improved admin-verify-user email template
   - Line 1325-1360: Added employee creation verification hook

### Hook Details:

```javascript
// Employee Creation Hook
onRecordAfterCreateSuccess((e) => {
  const user = e.record;
  const isVerified = user.get("verified");
  const role = user.getString("role");

  // Skip if already verified or is admin
  if (isVerified || role === "ADMIN" || role === "SUPER_ADMIN") {
    return;
  }

  // Send verification email
  $mails.sendRecordVerification($app, user);
}, "users");
```

### Email Template Structure:

- **Header:** Gradient background with success icon
- **Content:** Personalized message with organization context
- **CTA Button:** Direct login link
- **Footer:** System information and disclaimers
- **Responsive:** Works on mobile and desktop

---

## 🚀 Deployment

1. **Backup Current Hooks:**
   ```bash
   cp pb_data/pb_hooks/main.pb.js pb_data/pb_hooks/main.pb.js.backup
   ```

2. **Deploy Updated Hook File:**
   ```bash
   cp Others/pb_hooks/main.pb.js pb_data/pb_hooks/main.pb.js
   ```

3. **Restart PocketBase:**
   ```bash
   # Stop PocketBase (Ctrl+C)
   ./pocketbase serve
   ```

4. **Verify Deployment:**
   - Check console for: `[HOOKS] Loading OpenHR System Hooks (v0.37 - Employee Verification Email Support)...`
   - No errors should appear

5. **Test:**
   - Create a test employee
   - Verify email is sent
   - Click verification link
   - Verify account activated

---

## 📚 Additional Resources

- [PocketBase Email Templates](https://pocketbase.io/docs/mail-templates/)
- [PocketBase Hooks Documentation](https://pocketbase.io/docs/js-hooks/)
- [SMTP Configuration Guide](https://pocketbase.io/docs/mail-settings/)

---

**Version:** 0.37
**Last Updated:** February 14, 2026
**Status:** ✅ Ready for Production
