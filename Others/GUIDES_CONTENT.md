# OpenHR Guides — Content for Tutorials Section

> Use this as a reference to create tutorials in the Guides section of OpenHR.
> Each section below is a suggested tutorial. Copy, modify, and paste the content into the admin panel (SuperAdmin > Tutorials tab).
> Recommended categories: **Getting Started**, **Attendance**, **Leave**, **Employees**, **Organization**, **Reports**, **Settings**, **Performance Reviews**, **Announcements**
>
> **Internal links** use the format `/how-to-use/{slug}` and are clickable within the app.
> **Feature links** use `/features/{feature}` and navigate internally within the app.

---

## Category: Getting Started

---

### Tutorial 1: Welcome to OpenHR — Your First Steps

**Slug:** `welcome-to-openhr`
**Category:** Getting Started
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** Get started with OpenHR — the free open source HR management system for attendance tracking, leave management, and employee directory.

---

**Content:**

OpenHR is a free, [open source HR management system](https://openhrapp.com) built for growing teams that need reliable attendance tracking, leave management, performance reviews, and employee directory tools — without enterprise pricing.

Whether you're an Admin setting up your organization, a Manager overseeing your team, or an Employee tracking your daily work, this guide covers everything you need to get started.

#### What You Can Do with OpenHR

- **[Track Attendance with Selfie Verification](/how-to-use/how-to-clock-in-and-out)** — Clock in and out using your device camera and GPS location. Supports both Office and Factory/Field modes with [biometric selfie verification](/features/biometric-selfie-verification).
- **[Manage Leave Requests](/how-to-use/how-to-apply-for-leave)** — Apply for leave, check your balance, and get approvals through a configurable multi-step workflow with [smart leave management](/features/leave-management).
- **[Organize Your Team](/how-to-use/setting-up-organization)** — Set up departments, teams, shifts, office locations, and leave policies all from one place.
- **[Generate HR Reports](/how-to-use/generating-reports)** — Export attendance and leave reports as CSV or PDF, or send them via email to stakeholders.
- **[Role-Based Access Control](/how-to-use/roles-and-permissions)** — Five distinct roles (Admin, HR, Manager, Team Lead, Employee) each see different dashboards and have different permissions.

#### How OpenHR Works

1. **Admin registers the organization** on [openhrapp.com](https://openhrapp.com) and configures company structure.
2. **Employees log in** and [clock in/out daily](/how-to-use/how-to-clock-in-and-out) using their device camera and GPS.
3. **Leave requests** flow through a [configurable approval chain](/how-to-use/understanding-leave-policies) (Manager → HR).
4. **Admins and HR** can [view reports](/how-to-use/generating-reports), [manage employees](/how-to-use/managing-employees), and configure the system.

#### Your Role-Based Dashboard

When you log in, you see a personalized [dashboard](/how-to-use/understanding-dashboard) based on your role:

- **Admin/HR Dashboard:** Full organization stats, quick action buttons, global employee directory, and leave allocation overview.
- **Manager Dashboard:** Team-scoped stats, direct reports directory, and a team attendance summary.
- **Employee Dashboard:** Personal stats, team info, reporting manager details, and quick actions like "Apply for Leave."

#### Quick Actions Available on the Dashboard

Your dashboard includes shortcut buttons for common daily tasks:

- **Office Check-In** — Start an [attendance session](/how-to-use/how-to-clock-in-and-out) for office work.
- **Factory Check-In** — Start an attendance session for field/factory work (requires location remarks).
- **Finish Session** — End your active attendance session (appears when you're clocked in).
- **Apply for Leave** — Open the [leave application form](/how-to-use/how-to-apply-for-leave) directly.

#### Related Guides

- [How to Clock In and Out](/how-to-use/how-to-clock-in-and-out) — Learn the selfie-based attendance process step by step.
- [How to Apply for Leave](/how-to-use/how-to-apply-for-leave) — Submit your first leave request.
- [Setting Up Your Organization](/how-to-use/setting-up-organization) — For admins: configure departments, shifts, and policies.
- [Install OpenHR as a Mobile App (PWA)](/how-to-use/install-openhr-pwa) — Use OpenHR from your phone's home screen.
- [Understanding Roles and Permissions](/how-to-use/roles-and-permissions) — What each role can access.

---

---

## Category: Attendance

---

### Tutorial 2: How to Clock In and Out

**Slug:** `how-to-clock-in-and-out`
**Category:** Attendance
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** Complete guide to OpenHR's selfie-based attendance system with GPS location verification, office and factory clock-in modes.

---

**Content:**

OpenHR uses a smart [attendance tracking system](/features/attendance-tracking) that combines a **live selfie**, **[GPS location verification](/features/gps-geofencing)**, and **time tracking** to create a tamper-proof attendance record — eliminating buddy punching and manual errors.

#### Before You Start Clocking In

Make sure you have:

1. **Camera access** — Your browser will ask for camera permission. Allow it for [selfie-based verification](/features/biometric-selfie-verification).
2. **Location access** — GPS must be enabled on your device. Allow location permission when prompted.
3. **HTTPS connection** — The app must be accessed over a secure connection for camera and GPS to work.

If you're using OpenHR on your phone, make sure you've [installed it as a PWA](/how-to-use/install-openhr-pwa) for the best experience with camera and GPS.

#### Navigate to the Attendance Screen

From your [dashboard](/how-to-use/understanding-dashboard), you have two ways to start:

- Click the **"Office Check-In"** or **"Factory Check-In"** quick action button on your dashboard.
- Or, go to the **Attendance** page from the sidebar menu.

#### Choose Your Attendance Mode — Office or Factory

- **Office Mode** — For regular office work. Your GPS location will be matched against [configured office locations](/how-to-use/setting-up-organization) (geofencing).
- **Factory Mode** — For field or factory work. You **must** add remarks (e.g., factory name, site details) before clocking in.

#### Wait for Camera and GPS Verification

The attendance screen shows:

- A **live camera feed** in a circular frame (front-facing camera by default).
- A **"Face Ready"** indicator at the top when the camera is active (green, pulsing).
- Your **GPS location** below the camera — it shows the matched office name (e.g., "Head Office") or "Remote Area" if you're not near a configured location.

**Mobile users:** You can toggle between front and back cameras using the camera switch button. If your device supports it, you can also toggle the flashlight.

#### How to Clock In with Selfie Verification

Once both camera and GPS are ready:

1. Review your location tag — make sure it shows the correct office or area.
2. For **Factory mode**, enter your remarks (factory name, project details, etc.).
3. Click **"Check In"**.
4. The system captures your selfie automatically.
5. A success animation (checkmark + "Verified") confirms your clock-in.

**What gets recorded in your attendance:**
- Your selfie photo (auto-converted to WebP for efficient storage)
- GPS coordinates (latitude, longitude)
- Office/location name
- Check-in time
- Date
- Duty type (OFFICE or FACTORY)
- Status: **PRESENT** or **LATE** (calculated based on your [shift start time + grace period](/how-to-use/setting-up-organization))

#### How to Clock Out and End Your Session

When your work is done:

1. Go back to the **Attendance** page (or click "Finish Session" from the dashboard).
2. The button now shows **"Check Out"** instead of "Check In."
3. Your camera and GPS will activate again.
4. Optionally add end-of-day remarks.
5. Click **"Check Out"** to complete your session.

Your check-out time is recorded, and the session is marked as completed. You can [review your attendance history](/how-to-use/understanding-attendance-logs) anytime.

#### How Late Status Is Calculated

Your attendance status is automatically determined by your assigned shift:

- Clock in **before** (shift start time + grace period) → **PRESENT**
- Clock in **after** (shift start time + grace period) → **LATE**
- Grace period is configured by your admin in [Organization Settings](/how-to-use/setting-up-organization) (e.g., 15 minutes)

#### What Happens If You Forget to Clock Out — Auto-Close

If you forget to clock out, the system automatically closes your session:

- **Past-date sessions** — Closed automatically when you next log in. Remarks show "[System: Auto-Closed Past Date]."
- **Same-day sessions** — Closed at the configured auto-close time (default: 11:59 PM). Remarks show "[System: Max Time Reached]."

#### Tips for Reliable Attendance Tracking

- Always make sure your GPS shows the correct location before clocking in.
- If GPS shows "Locating..." — wait a few seconds or tap the location indicator to refresh.
- Factory mode remarks are mandatory — be specific about your work site.
- Your selfie is stored securely and used for attendance verification only.

#### Related Guides

- [Understanding Your Attendance Logs](/how-to-use/understanding-attendance-logs) — Review your attendance history and records.
- [Attendance Audit for Admins](/how-to-use/attendance-admin-audit) — Admin tools for editing and managing attendance.
- [Setting Up Your Organization](/how-to-use/setting-up-organization) — Configure shifts, office locations, and geofencing.
- [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — Overview of all features.

---

### Tutorial 3: Understanding Your Attendance Logs

**Slug:** `understanding-attendance-logs`
**Category:** Attendance
**Display Order:** 2
**Parent:** How to Clock In and Out
**Excerpt:** How to view your personal attendance history, understand attendance status badges, and read consolidated daily records.

---

**Content:**

After you start [clocking in daily](/how-to-use/how-to-clock-in-and-out), you can review your complete attendance history from the Attendance Logs page. This guide explains what each field means and how records are consolidated.

#### How to Access Your Attendance History

Navigate to **"My Attendance History"** from the sidebar menu. This shows your personal [attendance records](/features/attendance-tracking) sorted by date.

#### Understanding Each Attendance Record Field

Each record displays the following information:

| Field | Description |
|-------|-------------|
| **Selfie** | Your check-in photo thumbnail (captured during [clock-in](/how-to-use/how-to-clock-in-and-out)) |
| **Date** | The date of the attendance record (e.g., "17 Feb 2026") |
| **Status** | Color-coded badge: PRESENT (green), LATE (amber), ABSENT (red) |
| **Check-In Time** | When you clocked in (24-hour format) |
| **Check-Out Time** | When you clocked out, or "Active" if session is ongoing |
| **Location** | Office name (matched via [GPS geofencing](/features/gps-geofencing)) or "Remote Area" |
| **Remarks** | Any notes — yours or system-generated (e.g., auto-close messages) |

#### How Multiple Punches in a Day Are Consolidated

If you clock in and out multiple times on the same day (e.g., stepped out for lunch), the system consolidates your records:

- **Check-In** = Earliest clock-in time of the day
- **Check-Out** = Latest clock-out time of the day
- **Remarks** = Combined from all sessions (separated by "|")

This ensures each employee has one clean record per day, which is what appears in [attendance reports](/how-to-use/generating-reports).

#### How to Sort and Filter Your Logs

You can sort records by date — newest first or oldest first — using the sort toggle. This makes it easy to find specific days or review recent attendance.

#### Related Guides

- [How to Clock In and Out](/how-to-use/how-to-clock-in-and-out) — The full attendance clock-in process.
- [Attendance Audit for Admins](/how-to-use/attendance-admin-audit) — Admin tools for viewing all employee attendance.
- [Generating HR Reports](/how-to-use/generating-reports) — Export attendance data as CSV or PDF.

---

### Tutorial 4: Attendance for Admins — Audit and Manual Entries

**Slug:** `attendance-admin-audit`
**Category:** Attendance
**Display Order:** 3
**Parent:** How to Clock In and Out
**Excerpt:** How admins can audit attendance records, edit clock-in times, create manual entries, and mark employees as absent.

---

**Content:**

As an Admin or HR user, you have full visibility into the organization's [attendance data](/features/attendance-tracking). This guide covers auditing, editing, and manually creating attendance records for any employee.

#### Viewing All Employee Attendance Records

Navigate to **Attendance Audit** from the sidebar. This shows attendance records for all employees in your organization.

**Managers** will see records only for their direct reports and team members based on [role-based access control](/how-to-use/roles-and-permissions).

#### Filtering Attendance Records by Employee, Department, or Date

Use the filters to narrow down the records:

- **Employee name or ID** — Search for a specific person
- **Department** — Filter by department (Admin/HR only)
- **Date range** — View records within a specific period
- **Status** — Filter by PRESENT, LATE, ABSENT, etc.

#### How to Edit an Attendance Record

Click on any record to open the detail modal. You can edit:

- **Check-in time** — Correct the clock-in time
- **Check-out time** — Correct the clock-out time
- **Status** — Change to PRESENT, LATE, ABSENT, EARLY_OUT, or LEAVE
- **Remarks** — Add admin notes
- **Date** — Change the log date

You can also use the **"Recalculate Status"** button which auto-calculates the status based on the employee's [shift configuration](/how-to-use/setting-up-organization) and the edited times.

#### How to Mark an Employee as Absent

Click the **"Mark Absent"** button (Admin only) to create a manual absence record:

1. Select the employee from the dropdown.
2. Choose the date of absence.
3. Enter a reason (optional).
4. Submit.

This creates a record with check-in and check-out set to "-", status set to "ABSENT", and remarks prefixed with "[Manual Entry]."

#### Deleting Attendance Records

Admins can permanently delete attendance records. A confirmation dialog is shown before deletion. Use this carefully — deleted records cannot be recovered.

#### GPS Location Verification for Attendance

Each attendance record shows the exact GPS coordinates captured during [clock-in](/how-to-use/how-to-clock-in-and-out). Click the coordinates to open the location in Google Maps for verification — useful for confirming [field/factory attendance](/features/gps-geofencing).

#### Related Guides

- [How to Clock In and Out](/how-to-use/how-to-clock-in-and-out) — How the attendance system works for employees.
- [Understanding Attendance Logs](/how-to-use/understanding-attendance-logs) — What each field means.
- [Managing Employees](/how-to-use/managing-employees) — Employee directory and profile management.
- [Generating HR Reports](/how-to-use/generating-reports) — Export attendance data for analysis.
- [Roles and Permissions](/how-to-use/roles-and-permissions) — What each role can access in attendance audit.

---

---

## Category: Leave

---

### Tutorial 5: How to Apply for Leave

**Slug:** `how-to-apply-for-leave`
**Category:** Leave
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** Step-by-step guide to applying for leave in OpenHR — check your balance, submit a request, and track the approval status.

---

**Content:**

OpenHR's [leave management system](/features/leave-management) makes it easy to apply for leave, check your remaining balance, and follow your request through the approval process — all from your browser or phone.

#### Step 1: Check Your Leave Balance

Go to the **Leave** page from the sidebar. At the top, you'll see three cards showing your remaining balance:

- **Annual Leave** — Your vacation/annual days remaining
- **Casual Leave** — Your casual leave days remaining
- **Sick Leave** — Your sick leave days remaining

These balances are calculated automatically: your total allocation (set by your admin in [leave policy settings](/how-to-use/understanding-leave-policies)) minus all approved leaves.

For other leave types like Maternity, Paternity, or Unpaid, see the [Custom Leave Types guide](/how-to-use/custom-leave-types).

#### Step 2: Submit a Leave Request

Click the **"Apply Leave"** button on the Leave page. A form will open asking for:

1. **Leave Type** — Select from Annual, Casual, or Sick leave.
2. **Start Date** — When your leave begins.
3. **End Date** — When your leave ends.
4. **Reason** — A mandatory explanation for your absence.

#### How OpenHR Calculates Leave Days Automatically

As you select your dates, the system automatically calculates the total working days:

- **Weekends are excluded** — Based on your [shift's working days](/how-to-use/setting-up-organization) (e.g., if you work Mon–Fri, Saturday and Sunday are excluded).
- **Public holidays are excluded** — Any [company holidays](/how-to-use/setting-up-organization) falling within your leave period are deducted.
- A breakdown is shown: *"X Weekend(s) excluded. Y Holiday(s) excluded."*

#### Step 3: Review and Submit Your Leave Application

Before submitting, verify:

- Your balance is sufficient (the system will block you if it's not)
- The dates and leave type are correct
- Your reason clearly explains the absence

Click **Submit** to send your request into the [approval workflow](/how-to-use/understanding-leave-policies).

#### Step 4: Track Your Leave Request Status

After submitting, your request appears in the **Application History** section on the Leave page. Each request shows:

- **Status badge:**
  - **PENDING_MANAGER** (amber) — Awaiting your [manager's approval](/how-to-use/leave-approval-for-managers)
  - **PENDING_HR** (amber/orange) — Manager approved, awaiting [HR verification](/how-to-use/leave-approval-for-hr)
  - **APPROVED** (green) — Leave approved and balance deducted
  - **REJECTED** (red) — Leave denied
- **Leave type** and date range
- **Total days** requested

#### How the Leave Approval Workflow Works

Your request follows the approval workflow [configured by your organization](/how-to-use/understanding-leave-policies):

1. **Manager Review** — Your [line manager evaluates](/how-to-use/leave-approval-for-managers) and either approves (forwarding to HR) or rejects.
2. **HR Verification** — [HR gives final approval](/how-to-use/leave-approval-for-hr) or rejection.
3. **Balance Update** — Once fully approved, the days are deducted from your balance.

If your department is configured to skip the manager step, your request goes directly to HR.

#### Tips for Leave Applications

- Apply for leave **in advance** whenever possible.
- For sick leave exceeding 3 days, attach medical documentation (mention in the reason field).
- Half-day leaves are supported — ask your HR to set this up for you.
- You can view all your past leave requests in the Application History section.

#### Related Guides

- [Leave Approval for Managers](/how-to-use/leave-approval-for-managers) — How managers review and approve leave requests.
- [Leave Approval for HR and Admins](/how-to-use/leave-approval-for-hr) — How HR gives final approval.
- [Understanding Leave Policies](/how-to-use/understanding-leave-policies) — Leave types, allocations, and workflow configuration.
- [Custom Leave Types](/how-to-use/custom-leave-types) — Maternity, Paternity, Earned, Unpaid, and custom leave.

---

### Tutorial 6: Leave Approval — For Managers

**Slug:** `leave-approval-for-managers`
**Category:** Leave
**Display Order:** 2
**Parent:** How to Apply for Leave
**Excerpt:** How managers review, approve, or reject leave requests from direct reports in OpenHR's multi-step approval workflow.

---

**Content:**

As a Manager, you are the first step in OpenHR's [leave approval workflow](/features/leave-management). Leave requests from your direct reports land in your approval queue and require your action before moving to HR.

This guide is part of the [leave management system](/how-to-use/how-to-apply-for-leave) — make sure you also understand the [leave policy configuration](/how-to-use/understanding-leave-policies) for your organization.

#### Accessing Pending Leave Requests

Go to the **Leave** page. You'll see the **"Manager Approval Hub"** section showing:

- A list of leave requests with status **PENDING_MANAGER** from your team members.
- Each card shows: employee name, leave type, days requested, and start date.

You'll also receive [bell and email notifications](/how-to-use/notifications-guide) when a new leave request is submitted by your team.

#### Reviewing a Leave Request

Click **"Evaluate"** on any pending request to open the review modal:

- **Employee's reason** for the leave is displayed (read-only).
- You can add your **"Managerial Remarks"** — notes about team coverage, your assessment, etc.

#### Approving or Rejecting Leave

You have two options:

1. **Approve & Forward** — Approves the request at the manager level and forwards it to [HR for final verification](/how-to-use/leave-approval-for-hr). Status changes to **PENDING_HR**.

2. **Reject** — Denies the request. Status changes to **REJECTED**. The employee is notified via bell and email. Provide a clear reason in your remarks.

#### Best Practices for Leave Approvals

- Review requests **within 24 hours** to avoid delays.
- Check team coverage before approving — make sure critical work is covered.
- Add meaningful remarks — they help [HR make their decision](/how-to-use/leave-approval-for-hr) and serve as documentation.
- If you're unavailable, HR/Admin can [override and process the request directly](/how-to-use/leave-approval-for-hr).

#### Related Guides

- [How to Apply for Leave](/how-to-use/how-to-apply-for-leave) — How employees submit leave requests.
- [Leave Approval for HR and Admins](/how-to-use/leave-approval-for-hr) — The final approval step.
- [Understanding Leave Policies](/how-to-use/understanding-leave-policies) — Workflow routing and allocations.
- [Notifications Guide](/how-to-use/notifications-guide) — How leave notifications work.

---

### Tutorial 7: Leave Approval — For HR and Admins

**Slug:** `leave-approval-for-hr`
**Category:** Leave
**Display Order:** 3
**Parent:** How to Apply for Leave
**Excerpt:** How HR and Admin users verify, approve, reject, and manage leave records with admin override capabilities.

---

**Content:**

HR and Admin users have the final say in OpenHR's [leave approval process](/features/leave-management). You also have tools to create, edit, and delete leave records directly — making you the central point of leave administration.

#### HR Leave Administration Panel

Go to the **Leave** page. You'll see the **"HR Administration"** section with two tabs:

##### Pending Leave Approval Tab

Shows all requests waiting for your action:

- **PENDING_HR** requests (green badge) — Already [approved by the manager](/how-to-use/leave-approval-for-managers), waiting for your verification.
- **PENDING_MANAGER** requests (orange badge) — If the workflow skips the manager step or if you want to override.

Click **"Verify"** or **"Review"** to open the request details.

**What you see in the review modal:**
- Employee name and leave details
- The employee's original reason
- Manager's remarks (if the request was [forwarded from a manager](/how-to-use/leave-approval-for-managers))
- A field for your **"Admin Remarks"**

**Your actions:**
- **Approve** — Final approval. Status changes to **APPROVED**. Leave balance is deducted automatically per [leave policy](/how-to-use/understanding-leave-policies).
- **Decline** — Rejection. Status changes to **REJECTED**. Employee is notified.

##### All Leaves Tab — Complete Leave Records

A comprehensive view of all leave records in the organization:

- **Search** by employee name, leave type, or status.
- View full leave history with status, dates, and duration.
- **Quick actions** on each record:
  - **Review** — Approve or reject pending requests inline.
  - **Edit** — Modify leave details (dates, type, days, status, remarks).
  - **Delete** — Permanently remove a leave record.

#### How to Create Leave Records Manually

Admins can create leave records on behalf of employees:

1. Click the **"Add Leave"** button.
2. Select the **employee** from the dropdown.
3. Choose **leave type** — all 7 types available including [Maternity, Paternity, Earned, and Unpaid](/how-to-use/custom-leave-types).
4. Set **start and end dates**.
5. Total days are auto-calculated (editable — supports half days like 0.5).
6. Set the **status** directly (you can set it to APPROVED to skip the workflow).
7. Add admin remarks.
8. Submit.

#### Admin Override — Processing Stuck Leave Requests

If a leave request is stuck at **PENDING_MANAGER** (manager hasn't responded), you can:

- Click **"Review"** on the request.
- The modal shows as an **"Admin Override"** action.
- You can approve or reject directly without waiting for the [manager's approval](/how-to-use/leave-approval-for-managers).

#### Related Guides

- [How to Apply for Leave](/how-to-use/how-to-apply-for-leave) — The employee leave submission process.
- [Leave Approval for Managers](/how-to-use/leave-approval-for-managers) — The first approval step.
- [Understanding Leave Policies](/how-to-use/understanding-leave-policies) — Allocations and workflow configuration.
- [Managing Employees](/how-to-use/managing-employees) — Employee directory and profile management.
- [Custom Leave Types](/how-to-use/custom-leave-types) — Special leave types like Maternity and Paternity.

---

### Tutorial 8: Understanding Leave Policies

**Slug:** `understanding-leave-policies`
**Category:** Leave
**Display Order:** 4
**Parent:** How to Apply for Leave
**Excerpt:** How leave types, balances, quotas, approval workflows, and holiday exclusions are configured in OpenHR.

---

**Content:**

Your leave allocation and approval process in OpenHR are determined by your organization's [leave management](/features/leave-management) policies. This guide explains how everything works together.

#### Leave Types Available in OpenHR

OpenHR supports 7 built-in leave types:

| Type | Description |
|------|-------------|
| **Annual** | Vacation / annual leave |
| **Casual** | Short-notice casual leave |
| **Sick** | Medical / sick leave |
| **Maternity** | Maternity leave |
| **Paternity** | Paternity leave |
| **Earned** | Earned / accrued leave |
| **Unpaid** | Leave without pay |

Employees can [apply for Annual, Casual, and Sick leave](/how-to-use/how-to-apply-for-leave) through the self-service form. Admins can [create records for all 7 types](/how-to-use/leave-approval-for-hr). For more details on special leave types, see the [Custom Leave Types guide](/how-to-use/custom-leave-types).

#### Default Leave Allocations and Quotas

Your organization has default quotas:

- **Annual Leave:** typically 15 days/year
- **Casual Leave:** typically 10 days/year
- **Sick Leave:** typically 14 days/year

These defaults are set by your Admin/HR in [Organization Settings > Leaves](/how-to-use/setting-up-organization).

#### Per-Employee Custom Leave Allocations

HR can set custom allocations for specific employees. For example, a senior employee might get 20 Annual Leave days instead of the default 15.

Check with your HR if you believe your allocation should be different.

#### How the Leave Approval Workflow Routes Requests

Each department has a configured approval path:

- **Standard:** Employee → [Manager](/how-to-use/leave-approval-for-managers) → [HR](/how-to-use/leave-approval-for-hr) → Approved
- **Direct to HR:** Employee → [HR](/how-to-use/leave-approval-for-hr) → Approved (manager step skipped)

The workflow is configured per department in [Organization Settings > Workflow](/how-to-use/setting-up-organization).

#### How Holidays and Weekends Affect Leave Calculations

When calculating leave days:

- **Weekends** (based on your [shift schedule](/how-to-use/setting-up-organization)) are automatically excluded.
- **Public/company holidays** (managed in [Organization Settings > Holidays](/how-to-use/setting-up-organization)) are automatically excluded.
- Only working days are counted against your balance.

#### Related Guides

- [How to Apply for Leave](/how-to-use/how-to-apply-for-leave) — Submit a leave request.
- [Leave Approval for HR and Admins](/how-to-use/leave-approval-for-hr) — How HR manages leave records.
- [Setting Up Your Organization](/how-to-use/setting-up-organization) — Configure leave policies, workflows, and holidays.
- [Custom Leave Types](/how-to-use/custom-leave-types) — Special and custom leave types.

---

---

## Category: Employees

---

### Tutorial 9: Managing Employees — Adding and Editing Staff

**Slug:** `managing-employees`
**Category:** Employees
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** How admins add new employees, assign roles and departments, manage the employee directory, and export staff data.

---

**Content:**

The [Employee Directory](/features/employee-directory) is where you manage your organization's people. Admins and HR have full access to add, edit, and remove employees, while managers and team leads have scoped visibility.

#### Accessing the Employee Directory

Go to **Employees** from the sidebar menu. You'll see a grid of employee cards with search functionality. What you see depends on your [role and permissions](/how-to-use/roles-and-permissions).

#### How to Add a New Employee

Click **"Provision New User"** to open the employee creation form.

**Required employee information:**

| Section | Fields |
|---------|--------|
| **Personal** | Full Name, Email, Phone, Emergency Contact |
| **Professional** | Employee ID, Role, Department, Designation |
| **Organization** | Team Assignment, Line Manager, Shift Assignment |
| **Employment** | Status (Active/Inactive), Type (Permanent/Contract), Location, Work Type (Office/Remote) |
| **Additional** | Joining Date, Salary, National ID |

**Available [roles](/how-to-use/roles-and-permissions):**
- **EMPLOYEE** — Standard employee access
- **TEAM_LEAD** — Can lead a team
- **MANAGER** — Can manage teams, [approve leaves](/how-to-use/leave-approval-for-managers), view team reports
- **HR** — Can manage leaves, policies, and employee records
- **ADMIN** — Full system access

When you save, the system automatically:
- Generates a username from the Employee ID
- Creates login credentials
- Assigns the [default shift](/how-to-use/setting-up-organization) (if configured)
- Sends account verification email (if email is configured)

#### How to Edit an Employee Profile

Click on any employee card to view their profile. Click **"Edit"** to modify any field.

Common edits:
- Changing department or [team assignment](/how-to-use/setting-up-organization)
- Updating role (e.g., promoting to Manager — see [roles guide](/how-to-use/roles-and-permissions))
- Assigning a different shift
- Updating contact information

#### Assigning Teams and Line Managers

When you assign an employee to a team:
- The team's leader is automatically set as their line manager
- You can override this by manually selecting a different line manager
- Team assignment determines which [manager sees their leave requests](/how-to-use/leave-approval-for-managers)

#### Uploading Employee Profile Photos

Click the avatar area in the employee form to upload a profile picture. Supported formats: JPEG, PNG, WebP. Images are automatically converted to WebP for efficient storage.

#### Searching and Filtering the Employee Directory

Use the search bar at the top to find employees by:
- Name
- Employee ID
- Designation
- Email address

Results update in real-time with a 300ms delay for smooth searching.

#### Exporting Employee Data as CSV or PDF

Admins can [export the employee directory](/how-to-use/exporting-employee-data) in two formats:

- **CSV** — Download a spreadsheet with employee IDs, names, departments, roles, and contact details. Ideal for data analysis.
- **PDF** — Generate a branded document with your organization's logo, employee summary statistics, and a complete employee listing. Ideal for sharing with stakeholders.

#### Deleting an Employee Account

Click **"Delete"** on an employee card. A confirmation dialog will appear — **this action is permanent** and removes:
- The employee's user account
- Their attendance records
- Their leave records

#### Employee Directory Visibility by Role

| Role | Can See | Can Edit |
|------|---------|----------|
| **Admin/HR** | All employees | Yes — add, edit, delete |
| **Manager** | Team members and direct reports only | No |
| **Employee** | Teammates only | No |

For full details on what each role can access, see the [Roles and Permissions guide](/how-to-use/roles-and-permissions).

#### Related Guides

- [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — Overview of all OpenHR features.
- [Setting Up Your Organization](/how-to-use/setting-up-organization) — Configure departments, teams, and shifts.
- [Roles and Permissions](/how-to-use/roles-and-permissions) — What each role can access.
- [Exporting Employee Data](/how-to-use/exporting-employee-data) — CSV and PDF export options.

---

---

## Category: Organization

---

### Tutorial 10: Setting Up Your Organization

**Slug:** `setting-up-organization`
**Category:** Organization
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** Complete admin guide to configuring departments, teams, shifts, GPS locations, leave policies, holidays, and workflows in OpenHR.

---

**Content:**

Organization Settings is where Admins configure the structure and policies of their company in OpenHR. This is typically the first thing you do after [registering your organization](https://openhrapp.com). Access it from the sidebar by clicking **"Organization."**

The settings page has 9 tabs covering everything from departments to notification preferences.

#### 1. Structure — Departments and Designations

**Departments:**
- Add departments like "Engineering," "Sales," "HR," "Finance"
- Departments are used for [employee assignment](/how-to-use/managing-employees), [leave workflow routing](/how-to-use/understanding-leave-policies), and [report filtering](/how-to-use/generating-reports)

**Designations:**
- Add job titles like "Software Engineer," "HR Manager," "Accountant"
- Designations appear on employee profiles and [reports](/how-to-use/generating-reports)

Click **"Add"** to create, or use the edit/delete icons on existing items.

#### 2. Teams — Creating and Managing Teams

Create teams within departments:

1. Click **"Add Team"**
2. Enter a **team name** (e.g., "Frontend Team")
3. Select the **department** it belongs to
4. Choose a **Team Lead** from your [employees](/how-to-use/managing-employees)
5. Select **team members** using the multi-select checkboxes
6. Save

Team assignment is important because:
- It determines which [manager approves leave requests](/how-to-use/leave-approval-for-managers)
- Managers can only see [attendance](/how-to-use/attendance-admin-audit)/leave for their team
- [Dashboard](/how-to-use/understanding-dashboard) shows team-based statistics

#### 3. Placement — Office Locations with GPS Geofencing

Define your physical office locations for [GPS-based attendance verification](/features/gps-geofencing):

1. Click **"Add Location"**
2. Enter the **location name** (e.g., "Head Office")
3. Enter **GPS coordinates** (latitude and longitude)
4. Set the **geofence radius** in meters (how far from the coordinates an employee can be and still match this location)

**Finding GPS coordinates:** Use Google Maps — right-click on your office location and copy the coordinates.

When employees [clock in](/how-to-use/how-to-clock-in-and-out), their GPS is matched against these locations. If they're within the radius, the location name is recorded. Otherwise, they're marked as "Remote Area."

#### 4. Shifts — Work Schedule Configuration

Configure work schedules for your organization:

1. Click **"Add Shift"**
2. Set the **shift name** (e.g., "Morning Shift," "Night Shift")
3. Define **start time** and **end time**
4. Set **late grace period** (minutes after start time before marking as LATE in [attendance](/how-to-use/how-to-clock-in-and-out))
5. Set **early out grace period** (minutes before end time for acceptable early departure)
6. Set **earliest check-in time** (when employees can start clocking in)
7. Set **auto session close time** (when to automatically end sessions — default 11:59 PM)
8. Select **working days** (e.g., Monday through Friday)
9. Mark as **default shift** if it should be auto-assigned to [new employees](/how-to-use/managing-employees)

**Shift Overrides for Temporary Schedule Changes:**
Need to temporarily change an employee's shift? (e.g., Ramadan hours, project deadlines)
- Go to the shift section
- Click **"Add Override"**
- Select the employee, date range, and the temporary shift
- Add a reason
- The override takes precedence during that date range, then reverts automatically

#### 5. Workflow — Leave Approval Routing

Configure how [leave requests](/how-to-use/how-to-apply-for-leave) are routed per department:

1. Select a **department**
2. Choose the **approver role:** Manager, Team Lead, Admin, or HR
3. Save

This determines whether leave requests go through the [manager first](/how-to-use/leave-approval-for-managers) or directly to [HR](/how-to-use/leave-approval-for-hr). See the [Leave Policies guide](/how-to-use/understanding-leave-policies) for more details.

#### 6. Leaves — Leave Policy and Allocations

**Global Defaults:**
Set the standard [leave allocation](/how-to-use/understanding-leave-policies) for all employees:
- Annual Leave: e.g., 15 days
- Casual Leave: e.g., 10 days
- Sick Leave: e.g., 14 days

**Employee Overrides:**
Give specific employees different allocations:
1. Click **"Add Override"**
2. Select the employee
3. Set custom values for Annual, Casual, and Sick leave
4. Save

The override takes priority over the global default for that employee.

#### 7. Holidays — Company Holiday Calendar

Manage your organization's holiday calendar:

1. Click **"Add Holiday"**
2. Enter the **date** and **holiday name**
3. Select the **type:** National, Festival, or Islamic
4. Mark if it's a **government holiday**
5. Save

Holidays are:
- Excluded from [leave day calculations](/how-to-use/how-to-apply-for-leave)
- Excluded from absence reports (employees aren't marked absent on holidays)
- Displayed on the holiday calendar

#### 8. Notifications — Notification Settings

Configure how [notifications](/how-to-use/notification-settings) are handled in your organization:

- **Enabled Notification Types** — Choose which events trigger [bell and email notifications](/how-to-use/notifications-guide) (Leave, Attendance, Review, Announcement, System).
- **Digest Frequency** — Set how often notification digests are sent (Immediate or batched).
- **Quiet Hours** — Optionally disable notifications during off-hours.
- **Retention** — Notifications are automatically cleaned up after 30 days.

#### 9. System — Application-Level Settings

Configure application-level settings like your company name, office/factory labels, and other global preferences.

#### Related Guides

- [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — Overview of all features.
- [How to Clock In and Out](/how-to-use/how-to-clock-in-and-out) — How shifts and locations affect attendance.
- [How to Apply for Leave](/how-to-use/how-to-apply-for-leave) — How leave policies affect employees.
- [Managing Employees](/how-to-use/managing-employees) — Adding and assigning employees to teams and shifts.
- [Configuring Notification Settings](/how-to-use/notification-settings) — Detailed notification configuration.

---

---

## Category: Reports

---

### Tutorial 11: Generating Reports

**Slug:** `generating-reports`
**Category:** Reports
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** How to generate attendance and leave reports in OpenHR, export as CSV or PDF, and email summaries to stakeholders.

---

**Content:**

OpenHR's [Reports module](/features/reports-analytics) lets you generate detailed attendance and leave reports for your organization, export them as CSV or branded PDF, and email them directly to stakeholders.

#### Accessing the Reports Page

Navigate to **Reports** from the sidebar menu. You'll see two tabs: **Generator** and **Columns**. Reports are available to Admin, HR, and Manager [roles](/how-to-use/roles-and-permissions).

#### Available Report Types

Choose from 4 report types:

| Type | Description |
|------|-------------|
| **Attendance** | All [attendance records](/how-to-use/understanding-attendance-logs) for the selected period |
| **Absent** | Only days where employees were absent or had no check-in |
| **Late** | Only records where employees were marked as LATE |
| **Leave** | [Leave request](/how-to-use/how-to-apply-for-leave) records for the selected period |

#### How to Configure and Generate a Report

1. **Select Report Type** — Choose Attendance, Absent, Late, or Leave.
2. **Select Departments** — Use the multi-select to choose which departments to include. Use "Select All" for the entire organization.
3. **Set Date Range** — Choose the start and end dates for your report.
4. **Employee Scope** — Generate for all employees or select a specific individual.
5. **Recipients (for email)** — Enter comma-separated email addresses if you want to send the report via email.

#### Exporting Reports to CSV

Click **"Export CSV"** to download the report as a CSV file. The file includes:
- Employee ID and name
- Date and status
- Check-in and check-out times
- GPS location and coordinates
- Remarks

CSV files can be opened in Excel, Google Sheets, or any spreadsheet application for further analysis.

#### Emailing Reports to Stakeholders

Click **"Email Summary"** to send the report to the specified recipients. The system:
- Splits large reports into batches of 350 records per email
- Tracks delivery status (Sent, Failed, Pending)
- Shows a live status panel with email delivery updates

#### Configuring Report Columns

Switch to the **Columns** tab to choose which fields to include in your report:

- Employee ID, Full Name, Entry Date, Status Type
- Clock In / Clock Out times
- GPS Address, Latitude / Longitude
- Notes / Remarks

Toggle columns on/off based on what you need. Your selection applies to both CSV export and email reports.

#### Smart Report Calculations

Reports include intelligent processing:

- **Consolidated records:** Multiple [clock-ins on the same day](/how-to-use/understanding-attendance-logs) are merged (earliest check-in, latest check-out).
- **Gap analysis:** The Absent report identifies days where employees had no attendance record on working days.
- **Holiday exclusion:** Employees aren't counted as absent on [holidays](/how-to-use/setting-up-organization).
- **Shift-aware:** Uses each employee's [assigned shift](/how-to-use/setting-up-organization) to determine their working days.

#### Related Guides

- [Understanding Attendance Logs](/how-to-use/understanding-attendance-logs) — What each attendance field means.
- [Attendance Audit for Admins](/how-to-use/attendance-admin-audit) — Edit and manage attendance records.
- [Exporting Employee Data](/how-to-use/exporting-employee-data) — Export employee directory as CSV or PDF.
- [Managing Employees](/how-to-use/managing-employees) — Employee directory and profiles.

---

---

## Category: Settings

---

### Tutorial 12: Managing Your Profile and Settings

**Slug:** `managing-profile-settings`
**Category:** Settings
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** How to view your employee profile, update your name and email, change your password, and customize your app theme.

---

**Content:**

The Settings page lets you view your profile information, update your details, change your password, and personalize your OpenHR experience.

#### Viewing Your Employee Profile

Navigate to **Settings** from the sidebar. You'll see your profile information:

- **Employee ID** — Your official ID in the organization
- **Reporting Manager** — Who you report to
- **Team** — Your [team assignment](/how-to-use/setting-up-organization)
- **Shift** — Your assigned work shift and timing
- **Department and Designation** — Your organizational placement

These fields are read-only and managed by your Admin/HR through the [Employee Directory](/how-to-use/managing-employees).

#### Updating Your Personal Information

You can update:

- **Full Name** — Your display name across the system
- **Work Email** — Your email address

Click **"Save"** after making changes.

#### How to Change Your Password

1. Scroll to the **Security** section.
2. Enter your **new password** (minimum 8 characters).
3. Confirm the password.
4. Click **"Update Password."**

#### Customizing Your App Theme

Customize the app's appearance using the Theme Selector:

- Choose from **14 color themes** to change the app's accent color across all pages.
- Switch between **Light Mode**, **Dark Mode**, or **System** (follows your device preference).
- Your theme preference is saved to your profile and persists across devices.

See the [Theme Customization guide](/how-to-use/theme-customization) for more details on available themes and dark mode.

#### Contacting Support

Need help? Use the **Contact Support** form at the bottom of the Settings page:

1. Your name and email are pre-filled.
2. Enter a **subject** for your query.
3. Write your **message** with details about your issue.
4. Click **"Send"** to submit your support request.

#### Related Guides

- [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — Overview of all features.
- [Notifications Guide](/how-to-use/notifications-guide) — How bell and email notifications work.
- [Theme Customization](/how-to-use/theme-customization) — Full guide to themes and dark mode.

---

---

## Category: Getting Started

---

### Tutorial 13: Roles and Permissions in OpenHR

**Slug:** `roles-and-permissions`
**Category:** Getting Started
**Display Order:** 2
**Parent:** Welcome to OpenHR — Your First Steps
**Excerpt:** Complete guide to OpenHR's role-based access control — what Admin, HR, Manager, Team Lead, and Employee roles can access.

---

**Content:**

OpenHR uses role-based access control (RBAC) to ensure each user sees only what they need and can only perform actions appropriate to their role. This guide covers every role and its exact permissions.

This is a sub-guide of [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — read that first for a general overview.

#### Available Roles in OpenHR

| Role | Description |
|------|-------------|
| **ADMIN** | Full system access. Can configure everything in [Organization Settings](/how-to-use/setting-up-organization). |
| **HR** | [Manage employees](/how-to-use/managing-employees), [leaves](/how-to-use/leave-approval-for-hr), and policies. Similar to Admin but focused on HR functions. |
| **MANAGER** | Oversee team [attendance](/how-to-use/attendance-admin-audit) and [approve leaves](/how-to-use/leave-approval-for-managers) for direct reports. |
| **TEAM_LEAD** | Lead a team. Can be configured as a leave approver. |
| **EMPLOYEE** | Standard user. Can [clock in/out](/how-to-use/how-to-clock-in-and-out), [apply for leave](/how-to-use/how-to-apply-for-leave), and view personal data. |

#### Complete Permission Matrix

| Feature | Admin | HR | Manager | Team Lead | Employee |
|---------|-------|----|---------|-----------|----------|
| [Dashboard](/how-to-use/understanding-dashboard) (full stats) | Yes | Yes | Team only | Team only | Personal |
| [Employee Directory](/how-to-use/managing-employees) | Full CRUD | Full CRUD | View team | View team | View teammates |
| [Organization Settings](/how-to-use/setting-up-organization) | Full access | Full access | No | No | No |
| [Attendance Clock In/Out](/how-to-use/how-to-clock-in-and-out) | Yes | Yes | Yes | Yes | Yes |
| [Attendance Audit](/how-to-use/attendance-admin-audit) | Yes | Yes | Team only | No | Own only |
| [Leave Apply](/how-to-use/how-to-apply-for-leave) | Yes | Yes | Yes | Yes | Yes |
| [Leave Approve (Manager)](/how-to-use/leave-approval-for-managers) | Override | Override | Direct reports | If configured | No |
| [Leave Approve (HR)](/how-to-use/leave-approval-for-hr) | Yes | Yes | No | No | No |
| Leave Create/Edit/Delete | Yes | Yes | No | No | No |
| [Reports](/how-to-use/generating-reports) | All | All | Team scope | No | No |
| [Profile/Settings](/how-to-use/managing-profile-settings) | Yes + Admin tools | Yes | Yes | Yes | Yes |

#### Key Access Rules to Understand

- **Managers** can only see employees in their teams and their direct reports. They cannot access other departments.
- **Employees** can see their teammates but cannot edit anyone's information.
- **Admin and HR** have organization-wide visibility.
- **Leave approval** follows the [configured workflow](/how-to-use/understanding-leave-policies) — Managers approve first, then HR gives final approval.

#### Related Guides

- [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — Overview of all features.
- [Managing Employees](/how-to-use/managing-employees) — How to add employees and assign roles.
- [Attendance Audit for Admins](/how-to-use/attendance-admin-audit) — Role-scoped attendance visibility.

---

---

## Category: Getting Started

---

### Tutorial 14: Install OpenHR as an App (PWA) on Android and iOS

**Slug:** `install-openhr-pwa`
**Category:** Getting Started
**Display Order:** 3
**Parent:** Welcome to OpenHR — Your First Steps
**Excerpt:** Install OpenHR on your phone or desktop as a Progressive Web App (PWA) — no app store download required.

---

**Content:**

OpenHR is a Progressive Web App (PWA), which means you can install it directly on your Android or iOS device and use it just like a native app — with its own icon, full-screen mode, and fast loading. No app store download required.

This is a sub-guide of [Welcome to OpenHR](/how-to-use/welcome-to-openhr).

#### What is a Progressive Web App (PWA)?

A Progressive Web App is a website that behaves like a native mobile app. Once installed, OpenHR will:

- Appear on your **home screen** with its own icon
- Open in **full-screen mode** (no browser address bar)
- Load **faster** thanks to cached resources
- Work even with **poor network connectivity**
- Receive **push notifications** (if enabled by your admin)

#### Installing OpenHR on Android (Chrome)

1. Open **Google Chrome** on your Android device.
2. Navigate to your organization's OpenHR URL (e.g., `https://hr.yourcompany.com`).
3. Log in with your credentials.
4. You should see a **"Add to Home Screen"** banner at the bottom — tap **Install**.
5. If the banner doesn't appear:
   - Tap the **three-dot menu** (⋮) in the top-right corner.
   - Select **"Add to Home screen"** or **"Install app"**.
6. Confirm by tapping **"Install"** or **"Add"**.
7. OpenHR will now appear on your home screen as a standalone app.

#### Installing OpenHR on iPhone / iPad (Safari)

1. Open **Safari** on your iPhone or iPad (this only works in Safari, not Chrome or Firefox on iOS).
2. Navigate to your organization's OpenHR URL.
3. Log in with your credentials.
4. Tap the **Share button** (the square with an upward arrow) at the bottom of the screen.
5. Scroll down in the share menu and tap **"Add to Home Screen"**.
6. You can rename the app if you want, then tap **"Add"** in the top-right corner.
7. OpenHR will now appear on your home screen as an app icon.

#### Installing OpenHR on Desktop (Chrome / Edge)

1. Open **Google Chrome** or **Microsoft Edge** on your computer.
2. Navigate to your OpenHR URL and log in.
3. Look for the **install icon** (a small + or monitor icon) in the address bar on the right side.
4. Click it and confirm **"Install"**.
5. OpenHR will open in its own window and appear in your Start Menu (Windows) or Applications folder (Mac).

#### Using OpenHR as an Installed App

Once installed, OpenHR behaves like any other app on your device:

- **Launch** it from your home screen or app drawer — no need to open a browser first.
- **Switch** between OpenHR and other apps normally.
- **[Notifications](/how-to-use/notifications-guide)** will come through as system notifications (if supported by your organization).
- **Updates** happen automatically — you always get the latest version without reinstalling.

You can immediately [clock in for attendance](/how-to-use/how-to-clock-in-and-out) from the installed app with full camera and GPS support.

#### Troubleshooting PWA Installation Issues

| Issue | Solution |
|-------|----------|
| "Add to Home Screen" option not showing (Android) | Make sure you're using **Chrome**. Clear your browser cache and reload the page. |
| "Add to Home Screen" option not showing (iOS) | You must use **Safari** — this feature is not available in Chrome or Firefox on iOS. |
| App opens in browser instead of full-screen | Remove the shortcut and reinstall using the steps above. Make sure you use the browser's install/share feature, not a simple bookmark. |
| App looks outdated after an update | Close the app completely and reopen it. On Android, you can also go to Chrome > Settings > Site Settings > find OpenHR > Clear & Reset. |
| App not loading offline | Ensure you've visited the app at least once while online so resources can be cached. |

#### How to Uninstall the PWA

- **Android:** Long-press the OpenHR icon > Uninstall (or drag to Remove).
- **iOS:** Long-press the OpenHR icon > Remove App > Delete from Home Screen.
- **Desktop (Chrome):** Open the app > click the three-dot menu in the title bar > Uninstall.

#### Related Guides

- [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — Overview of all features.
- [How to Clock In and Out](/how-to-use/how-to-clock-in-and-out) — Use attendance from the installed app.
- [Understanding the Dashboard](/how-to-use/understanding-dashboard) — What you see when you open the app.

---

---

## Category: Performance Reviews

---

### Tutorial 15: Performance Reviews — Employee Self-Assessment

**Slug:** `performance-review-self-assessment`
**Category:** Performance Reviews
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** How to complete your self-assessment in OpenHR — rate competencies, add comments, and submit for manager review.

---

**Content:**

OpenHR includes a built-in [performance review system](/features/performance-reviews) that guides employees, managers, and HR through a structured review process each cycle. This guide covers the employee self-assessment step.

#### How the Performance Review Process Works

The review process has three stages:

1. **Self-Assessment** — You rate yourself on each competency and add comments (this guide).
2. **[Manager Review](/how-to-use/performance-review-for-managers)** — Your manager reviews your self-assessment, adds their own ratings, and provides feedback.
3. **[HR Calibration](/how-to-use/performance-review-hr-calibration)** — HR reviews the final assessment, adds overall remarks, and completes the review.

#### Checking for Active Review Cycles

Navigate to **Performance** from the sidebar menu. You'll see one of the following:

- **Active Cycle** — A review cycle is currently open. You'll see the cycle name, date range, and your review status.
- **Upcoming Cycle** — A cycle is scheduled but hasn't started yet. You'll see when it opens.
- **No Active Cycle** — No reviews are currently in progress. Check back later.

#### How to Complete Your Self-Assessment

When a review cycle is active:

1. You'll see a list of **competencies** configured by your organization (e.g., Agility, Collaboration, Customer Focus, Innovation Mindset).
2. For each competency, select a **rating** on the configured scale (typically 1–5):
   - 1 — Needs Improvement
   - 2 — Below Expectations
   - 3 — Meets Expectations
   - 4 — Exceeds Expectations
   - 5 — Outstanding
3. Add a **comment** for each competency explaining why you chose that rating. Be specific — mention projects, achievements, or areas for growth.
4. Review the auto-generated **Attendance Summary** and **Leave Summary** cards. These are calculated from your [attendance](/how-to-use/understanding-attendance-logs) and [leave records](/how-to-use/how-to-apply-for-leave) during the review period and are included for reference.

#### Submitting Your Self-Assessment

Once you've rated all competencies and added your comments:

1. Click **"Submit Self-Assessment"**.
2. Your review status changes from **DRAFT** to **SELF_REVIEW_SUBMITTED**.
3. Your [manager is notified](/how-to-use/notifications-guide) (via email and bell notification) that your review is ready for their input.

**Important:** Once submitted, you cannot edit your self-assessment. Make sure everything is accurate before submitting.

#### Viewing Your Manager's Feedback

After your [manager completes their review](/how-to-use/performance-review-for-managers):

- Your status changes to **MANAGER_REVIEWED**.
- You can see your manager's ratings and comments alongside your own self-assessment.
- The review is then forwarded to [HR for final calibration](/how-to-use/performance-review-hr-calibration).

#### When the Review Is Complete

When [HR completes the review](/how-to-use/performance-review-hr-calibration):

- Your status changes to **COMPLETED**.
- You can see the final overall rating and HR remarks.
- The completed review is archived in your **Past Reviews** section.

#### Downloading Your Review as PDF

Once a review is completed, you can download it as a PDF:

1. Go to your **Past Reviews** section.
2. Click the **Download** icon next to any completed review.
3. The PDF includes your organization's branding, all competency ratings (self and manager), attendance/leave summaries, and final HR remarks.

#### Past Reviews — Your Review History

Click **"View Past Reviews"** to expand your review history. Each past review shows:

- Cycle name and date range
- Your final overall rating
- Status badge (COMPLETED, MANAGER_REVIEWED, etc.)
- Option to expand and view full details
- Download as PDF

#### Related Guides

- [Performance Reviews — For Managers](/how-to-use/performance-review-for-managers) — How managers evaluate employees.
- [Performance Reviews — HR Calibration](/how-to-use/performance-review-hr-calibration) — How HR finalizes reviews.
- [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — Overview of all features.

---

### Tutorial 16: Performance Reviews — For Managers

**Slug:** `performance-review-for-managers`
**Category:** Performance Reviews
**Display Order:** 2
**Parent:** Performance Reviews — Employee Self-Assessment
**Excerpt:** How managers review employee self-assessments, provide competency ratings and feedback, and submit for HR calibration.

---

**Content:**

As a Manager, you play a critical role in OpenHR's [performance review process](/features/performance-reviews). After your direct reports [submit their self-assessments](/how-to-use/performance-review-self-assessment), it's your turn to evaluate them.

#### Accessing Pending Employee Reviews

Navigate to **Performance** from the sidebar. In the **Manager Review** section, you'll see:

- A list of your direct reports who have submitted their self-assessments (status: **SELF_REVIEW_SUBMITTED**).
- Each card shows the employee's name, department, and current review status.

You'll receive [email and bell notifications](/how-to-use/notifications-guide) when employees submit their self-assessments.

#### How to Review an Employee's Performance

Click on an employee's review card to open the review form:

1. **View Self-Assessment** — See the employee's self-ratings and comments for each competency.
2. **Attendance & Leave Summary** — Review the employee's [attendance record](/how-to-use/understanding-attendance-logs) and [leave usage](/how-to-use/how-to-apply-for-leave) during the review period.
3. **Add Your Ratings** — For each competency, provide your own rating (1–5) and comments. Consider:
   - How the employee's work aligns with each competency
   - Specific examples of strengths or improvement areas
   - Whether the employee's self-assessment is accurate
4. **Overall Comments** — Add any general feedback about the employee's performance.

#### Submitting Your Manager Review

Once you've completed all ratings:

1. Click **"Submit Manager Review"**.
2. The review status changes to **MANAGER_REVIEWED**.
3. [HR is notified](/how-to-use/notifications-guide) that the review is ready for [final calibration](/how-to-use/performance-review-hr-calibration).
4. The employee can now see your feedback alongside their self-assessment.

#### Tips for Effective Manager Reviews

- Be **specific** — reference actual projects, deliverables, or incidents.
- Be **balanced** — acknowledge strengths while constructively addressing areas for improvement.
- Be **fair** — base ratings on observable performance, not personal preferences.
- Complete reviews **promptly** — you'll receive deadline reminders at 3 days and 1 day before the cycle closes.

#### Related Guides

- [Performance Reviews — Employee Self-Assessment](/how-to-use/performance-review-self-assessment) — How employees rate themselves.
- [Performance Reviews — HR Calibration](/how-to-use/performance-review-hr-calibration) — The final review step.
- [Leave Approval for Managers](/how-to-use/leave-approval-for-managers) — Your other manager responsibilities.

---

### Tutorial 17: Performance Reviews — HR Calibration

**Slug:** `performance-review-hr-calibration`
**Category:** Performance Reviews
**Display Order:** 3
**Parent:** Performance Reviews — Employee Self-Assessment
**Excerpt:** How HR calibrates performance reviews, assigns final overall ratings, manages review cycles, and completes the process.

---

**Content:**

HR has the final say in OpenHR's [performance review process](/features/performance-reviews). After [managers submit their reviews](/how-to-use/performance-review-for-managers), HR calibrates the results and completes the cycle.

#### Accessing Reviews for HR Calibration

Navigate to **Performance** from the sidebar. In the **HR Calibration** section, you'll see reviews with status **MANAGER_REVIEWED** that are waiting for your input.

#### How to Calibrate a Performance Review

Open a review to see:

1. **Employee's [Self-Assessment](/how-to-use/performance-review-self-assessment)** — Their self-ratings and comments.
2. **[Manager's Review](/how-to-use/performance-review-for-managers)** — The manager's ratings and feedback.
3. **Attendance & Leave Summary** — Objective data about the employee's presence and [leave usage](/how-to-use/how-to-apply-for-leave).

#### Completing and Finalizing the Review

1. Review both self-assessment and manager ratings side by side.
2. Add **HR Final Remarks** — Your overall assessment and any calibration notes.
3. Assign an **Overall Rating** — The final performance rating for this employee.
4. Click **"Complete Review"** to finalize.

The review status changes to **COMPLETED**, and both the employee and [manager are notified](/how-to-use/notifications-guide).

#### Managing Review Cycles (Admin/HR)

Admins can manage review cycles from the Performance page:

- **Create Cycle** — Set up a new review cycle with name, type (Quarterly, Mid-Year, Annual), start/end dates, and review window dates.
- **Configure Competencies** — Choose which competencies to include in the cycle.
- **Activate/Deactivate** — Control when the cycle is open for [employee submissions](/how-to-use/performance-review-self-assessment).
- **View Progress** — Track how many employees have completed each stage.

#### Related Guides

- [Performance Reviews — Employee Self-Assessment](/how-to-use/performance-review-self-assessment) — The first step in the review process.
- [Performance Reviews — For Managers](/how-to-use/performance-review-for-managers) — The manager evaluation step.
- [Leave Approval for HR](/how-to-use/leave-approval-for-hr) — Your other HR responsibilities.

---

---

## Category: Announcements

---

### Tutorial 18: Announcements — Viewing and Creating

**Slug:** `announcements-guide`
**Category:** Announcements
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** How to view organization announcements in OpenHR, and how Admins can create, target, and manage company-wide communications.

---

**Content:**

Announcements in OpenHR let admins and HR communicate important information to the entire organization or specific role groups. They appear both on the announcements page and as a widget on your [dashboard](/how-to-use/understanding-dashboard).

#### Viewing Company Announcements

Navigate to **Announcements** from the sidebar menu. You'll see a list of active announcements with:

- **Title** — The announcement headline
- **Content** — Full message text
- **Priority Badge** — NORMAL (default) or URGENT (highlighted for attention)
- **Author** — Who posted the announcement
- **Date** — When it was posted
- **Expiry** — When the announcement will be automatically hidden (if set)

**Urgent announcements** always appear at the top of the list and are visually highlighted so they stand out.

#### How to Create Announcements (Admin/HR Only)

If you're an Admin or HR user (see [Roles and Permissions](/how-to-use/roles-and-permissions)):

1. Click the **"Create Announcement"** button.
2. Fill in the form:
   - **Title** — A clear, concise headline (required).
   - **Content** — The full announcement message (required).
   - **Priority** — Choose NORMAL or URGENT. Urgent announcements are highlighted and appear first.
   - **Target Roles** — Select which roles should see this announcement (Admin, HR, Manager, Team Lead, Employee). Leave empty to show to everyone.
   - **Expiry Date** — Optional. The announcement will automatically hide after this date.
3. Click **"Save"** to publish.

All targeted employees receive a **[bell notification](/how-to-use/notifications-guide)** when a new announcement is posted.

#### Editing and Deleting Announcements

- Click the **edit** icon on any announcement to update its title, content, priority, target audience, or expiry.
- Click the **delete** icon to permanently remove an announcement. A confirmation dialog is shown before deletion.

#### Tips for Effective Announcements

- Use **URGENT** priority sparingly — reserve it for critical updates like policy changes, emergency notices, or system downtime.
- Set **expiry dates** for time-sensitive announcements (e.g., event reminders, holiday notices) so old content doesn't clutter the page.
- Use **role targeting** to avoid sending irrelevant announcements to the entire organization.

#### Related Guides

- [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — Overview of all features.
- [Notifications Guide](/how-to-use/notifications-guide) — How bell and email notifications work.
- [Roles and Permissions](/how-to-use/roles-and-permissions) — Who can create announcements.

---

---

## Category: Settings

---

### Tutorial 19: Notifications — Bell Notifications and Admin Management

**Slug:** `notifications-guide`
**Category:** Settings
**Display Order:** 2
**Parent:** Managing Your Profile and Settings
**Excerpt:** How OpenHR's bell and email notification system works, what events trigger notifications, and how admins manage them.

---

**Content:**

OpenHR has a built-in notification system that keeps you informed about important events via bell notifications and email. This guide covers how notifications work and how admins can manage them.

This is a sub-guide of [Managing Your Profile and Settings](/how-to-use/managing-profile-settings).

#### Understanding the Notification Bell

You'll see a **bell icon** in the top header bar. A red badge shows your **unread notification count**.

Click the bell to see your recent notifications. Each notification shows:

- **Type icon** — Color-coded by category (Leave, Attendance, Announcement, Review, System)
- **Title** — A brief description of the event
- **Message** — Details about what happened
- **Timestamp** — When the notification was created
- **Read/Unread status** — Unread notifications are highlighted

Notifications are automatically **marked as read** when you view them.

#### Complete Notification Trigger Matrix

| Event | Who Gets Notified |
|-------|-------------------|
| **[Leave submitted](/how-to-use/how-to-apply-for-leave)** | Employee (confirmation), [Manager](/how-to-use/leave-approval-for-managers) (action required), Admin/HR (new request) |
| **Leave approved by manager** | Employee (manager approved), Admin/HR ([HR review](/how-to-use/leave-approval-for-hr) required) |
| **Leave fully approved** | Employee (approved), Manager (FYI) |
| **Leave rejected** | Employee (rejected), Manager (FYI) |
| **Late [check-in](/how-to-use/how-to-clock-in-and-out)** | Manager (late alert), Admin/HR (late alert) |
| **Auto-marked absent** | Employee (marked absent), Manager (FYI) |
| **Checkout reminder** | Employee (reminder to clock out) |
| **Daily [attendance report](/how-to-use/generating-reports)** | Admin/HR (end-of-day summary) |
| **[Review cycle](/how-to-use/performance-review-self-assessment) opened** | All employees (cycle open), Managers (action required) |
| **[Self-assessment](/how-to-use/performance-review-self-assessment) submitted** | [Manager](/how-to-use/performance-review-for-managers) (review ready) |
| **[Manager review](/how-to-use/performance-review-for-managers) completed** | Employee (feedback available), HR (calibration needed) |
| **[Review finalized](/how-to-use/performance-review-hr-calibration) by HR** | Employee (review complete), Manager (FYI) |
| **New [announcement](/how-to-use/announcements-guide)** | Targeted roles (based on announcement settings) |

#### Admin Notification Management

Admins and HR can access the **Notifications** page from the sidebar to send and manage notifications.

##### How to Send Custom Notifications

1. Click **"Send Notification"** to open the form.
2. Select the **notification type** (Announcement, Leave, Attendance, Review, System).
3. Choose **recipients** — select specific [employees](/how-to-use/managing-employees) from the dropdown.
4. Enter a **title** and **message**.
5. Set **priority** — Normal or Urgent.
6. Click **"Send"** to deliver the notification instantly.

##### Viewing Notification History

- See all notifications sent across the organization (up to 100 most recent).
- **Search** notifications by title or message content.
- **Filter** by notification type (Announcement, Leave, Attendance, Review, System).
- Each notification shows the recipient, type badge, title, message, and timestamp.

##### Managing and Deleting Notifications

- **Delete individual** notifications by clicking the delete button on each card.
- **Delete all** notifications at once using the "Delete All" button (confirmation required).

For notification system configuration, see the [Notification Settings guide](/how-to-use/notification-settings).

#### Related Guides

- [Managing Your Profile and Settings](/how-to-use/managing-profile-settings) — Profile and password management.
- [Announcements Guide](/how-to-use/announcements-guide) — Company-wide announcements.
- [Configuring Notification Settings](/how-to-use/notification-settings) — SMTP and notification type configuration.
- [Leave Approval for Managers](/how-to-use/leave-approval-for-managers) — Leave-related notifications.

---

---

## Category: Settings

---

### Tutorial 20: Theme Customization

**Slug:** `theme-customization`
**Category:** Settings
**Display Order:** 3
**Parent:** Managing Your Profile and Settings
**Excerpt:** Personalize OpenHR with 14 color themes, dark mode, light mode, and system preference — saved across devices.

---

**Content:**

OpenHR offers extensive visual customization so you can make the app look and feel just right for your preference. This is a sub-guide of [Managing Your Profile and Settings](/how-to-use/managing-profile-settings).

#### Choosing a Color Theme

Navigate to **Settings** from the sidebar. In the **Theme** section, you'll see a grid of 14 available color themes.

Each theme changes the primary accent color used across the entire application — buttons, links, badges, sidebar highlights, and more.

Simply click on a theme to apply it instantly. Your selection is saved to your profile and persists across devices and sessions.

#### Switching Between Light Mode, Dark Mode, and System Preference

Use the **mode toggle** to switch between:

- **Light Mode** — Bright background with dark text. Best for well-lit environments.
- **Dark Mode** — Dark background with light text. Reduces eye strain in low-light conditions and saves battery on OLED screens.
- **System** — Automatically follows your device's system preference.

#### Organization Default Theme (Super Admin)

Super Admins can set a **default theme** for the entire organization. When a new user logs in for the first time, they'll see the organization's default theme. Users can then customize their own preference from their [Settings page](/how-to-use/managing-profile-settings).

#### Related Guides

- [Managing Your Profile and Settings](/how-to-use/managing-profile-settings) — Profile, password, and app settings.
- [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — Overview of all OpenHR features.
- [Subscription and Upgrade Options](/how-to-use/subscription-upgrade-options) — How Super Admin settings and subscription tiers work.

---

---

## Category: Leave

---

### Tutorial 21: Custom Leave Types and Special Leave

**Slug:** `custom-leave-types`
**Category:** Leave
**Display Order:** 5
**Parent:** How to Apply for Leave
**Excerpt:** Understanding all leave types in OpenHR — Maternity, Paternity, Earned, Unpaid, half-day leave, and custom-configured types.

---

**Content:**

Beyond the standard Annual, Casual, and Sick leave that employees can [apply for directly](/how-to-use/how-to-apply-for-leave), OpenHR's [leave management system](/features/leave-management) supports several additional leave types and allows admins to configure custom ones.

#### Standard Employee Leave Types

These are the leave types employees can apply for through the self-service form:

| Type | Description | Has Balance |
|------|-------------|-------------|
| **Annual** | Vacation / annual leave | Yes — deducted from [allocation](/how-to-use/understanding-leave-policies) |
| **Casual** | Short-notice personal leave | Yes — deducted from allocation |
| **Sick** | Medical / health-related leave | Yes — deducted from allocation |

#### Special Leave Types (Admin-Created)

These types are typically created by [Admin/HR on behalf of employees](/how-to-use/leave-approval-for-hr):

| Type | Description | Has Balance |
|------|-------------|-------------|
| **Maternity** | Leave for expectant or new mothers | No — duration set per case |
| **Paternity** | Leave for new fathers | No — duration set per case |
| **Earned** | Accrued leave earned through extra work | No — managed manually |
| **Unpaid** | Leave without pay | No — no balance deduction |

#### How Half-Day Leave Works

OpenHR supports half-day leave. When an [Admin or HR creates a leave record manually](/how-to-use/leave-approval-for-hr), the **total days** field can be set to decimal values like **0.5** for a half day. This allows precise tracking of partial leave days.

#### How to Create Custom Leave Types (Admin Only)

Admins can create entirely new leave types from [Organization Settings](/how-to-use/setting-up-organization):

1. Navigate to **Organization** from the sidebar.
2. Go to the **Leaves** tab.
3. In the leave types section, click **"Add Leave Type"**.
4. Configure:
   - **Name** — The display name (e.g., "Compensatory Off," "Study Leave")
   - **Has Balance** — Whether this type tracks a quota
   - **Description** — A brief explanation of when this leave type applies
5. Save.

Custom leave types will appear in the Admin leave creation form and can be assigned to any employee.

#### Related Guides

- [How to Apply for Leave](/how-to-use/how-to-apply-for-leave) — Submit standard leave requests.
- [Leave Approval for HR and Admins](/how-to-use/leave-approval-for-hr) — Create leave records for special types.
- [Understanding Leave Policies](/how-to-use/understanding-leave-policies) — Allocations and workflow configuration.
- [Setting Up Your Organization](/how-to-use/setting-up-organization) — Where to configure custom leave types.

---

---

## Category: Organization

---

### Tutorial 22: Configuring Notification Settings

**Slug:** `notification-settings`
**Category:** Organization
**Display Order:** 2
**Parent:** Setting Up Your Organization
**Excerpt:** How to configure email notifications, enable or disable notification types, set up SMTP, and manage notification retention.

---

**Content:**

OpenHR sends automatic email and [bell notifications](/how-to-use/notifications-guide) for important events. Admins can control what gets sent and how from the Organization settings.

This is a sub-guide of [Setting Up Your Organization](/how-to-use/setting-up-organization).

#### Accessing Notification Settings

Navigate to **Organization** from the sidebar, then click the **Notifications** tab.

#### Configuring Which Email Notifications Are Sent

The notification system automatically sends emails for:

- **[Leave events](/how-to-use/how-to-apply-for-leave)** — Submission confirmations, [approval](/how-to-use/leave-approval-for-managers)/rejection notices, workflow forwards
- **[Attendance events](/how-to-use/how-to-clock-in-and-out)** — Late check-in alerts, absent notifications, checkout reminders, daily summaries
- **[Review events](/how-to-use/performance-review-self-assessment)** — Cycle open/close, submission confirmations, deadline reminders

Each email includes the relevant details (employee name, dates, status) and is sent to the appropriate parties based on the event type.

#### Notification Retention and Cleanup

The system automatically cleans up old notifications:

- **Bell notifications** are retained for **30 days** and then automatically deleted by the nightly cleanup job.
- **Selfie photos** from [attendance records](/how-to-use/how-to-clock-in-and-out) are retained for **30 days** and then cleared to save storage.

#### Email Delivery and SMTP Configuration

Emails are sent through PocketBase's configured SMTP settings. The admin should ensure:

1. **SMTP is configured** in PocketBase admin panel (Settings > Mail settings).
2. **Sender address** is set (defaults to noreply@openhr.app).
3. **Test email** can be sent from the Settings page to verify the configuration.

#### Related Guides

- [Setting Up Your Organization](/how-to-use/setting-up-organization) — Complete organization configuration.
- [Notifications Guide](/how-to-use/notifications-guide) — How bell notifications and admin tools work.
- [Announcements Guide](/how-to-use/announcements-guide) — How announcements trigger notifications.

---

---

## Category: Getting Started

---

### Tutorial 23: Understanding the Dashboard

**Slug:** `understanding-dashboard`
**Category:** Getting Started
**Display Order:** 4
**Parent:** Welcome to OpenHR — Your First Steps
**Excerpt:** A detailed tour of OpenHR's role-based dashboard — what each widget shows for Employees, Managers, and Admins.

---

**Content:**

Your Dashboard is the first thing you see after logging into OpenHR. It's personalized based on your [role](/how-to-use/roles-and-permissions) and shows the most relevant information at a glance.

This is a sub-guide of [Welcome to OpenHR](/how-to-use/welcome-to-openhr).

#### Employee Dashboard — Your Personal Overview

As an Employee, your dashboard shows:

- **Quick Actions** — Buttons for [Office Check-In, Factory Check-In](/how-to-use/how-to-clock-in-and-out), Finish Session, and [Apply for Leave](/how-to-use/how-to-apply-for-leave). These are shortcuts to the most common daily tasks.
- **Today's Status** — Whether you've clocked in today, your check-in time, and current session status.
- **Leave Balance Summary** — Your remaining Annual, Casual, and Sick leave days (see [Leave Policies](/how-to-use/understanding-leave-policies)).
- **Recent [Announcements](/how-to-use/announcements-guide)** — The latest announcements from your organization.
- **Team Information** — Your team name, team lead, and reporting manager.
- **Upcoming Holiday** — The next public/company holiday.

#### Manager Dashboard — Team Oversight

As a Manager, you see everything an Employee sees, plus:

- **Team Attendance Summary** — How many of your direct reports are present, late, or absent today.
- **Pending [Leave Approvals](/how-to-use/leave-approval-for-managers)** — Leave requests from your team that need your action. A count badge highlights how many are waiting.
- **Team Member Cards** — Quick view of your direct reports with their current [attendance](/how-to-use/how-to-clock-in-and-out) status.

#### Admin/HR Dashboard — Organization-Wide View

As an Admin or HR user, you see the full organizational picture:

- **Organization-Wide Stats** — Total [employees](/how-to-use/managing-employees), today's attendance rate, pending leave requests, active [review cycles](/how-to-use/performance-review-self-assessment).
- **Department Breakdown** — Attendance and leave statistics by department.
- **System Health** — Active sessions, pending items, and recent activity.
- **Quick Links** — Navigate to all management modules (Employees, Organization, [Reports](/how-to-use/generating-reports), etc.).
- **Recent Activity Feed** — Latest attendance check-ins, leave requests, and review submissions across the organization.

#### Tips for Using Your Dashboard Effectively

- Use the **quick action buttons** to save time — they take you directly to the [clock-in screen](/how-to-use/how-to-clock-in-and-out) or [leave form](/how-to-use/how-to-apply-for-leave).
- Check your dashboard **at the start of each workday** to see any pending approvals or important [announcements](/how-to-use/announcements-guide).
- Managers: Keep an eye on the **pending approvals** count — responding quickly to [leave requests](/how-to-use/leave-approval-for-managers) helps your team.

#### Related Guides

- [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — Overview of all features.
- [How to Clock In and Out](/how-to-use/how-to-clock-in-and-out) — Start your day with attendance.
- [How to Apply for Leave](/how-to-use/how-to-apply-for-leave) — Submit leave requests from the dashboard.
- [Install OpenHR as a Mobile App](/how-to-use/install-openhr-pwa) — Quick access from your phone's home screen.
- [Roles and Permissions](/how-to-use/roles-and-permissions) — Why dashboards differ by role.

---

---

## Category: Getting Started

---

### Tutorial 24: Subscription and Upgrade Options

**Slug:** `subscription-upgrade-options`
**Category:** Getting Started
**Display Order:** 5
**Parent:** Welcome to OpenHR — Your First Steps
**Excerpt:** OpenHR's subscription model explained — Trial, Donation tiers, Ad-Supported free tier, and what happens when your trial expires.

---

**Content:**

OpenHR is an [open-source HR management system](https://openhrapp.com) that offers several ways to keep using the platform after your trial period. This guide explains all your options.

This is a sub-guide of [Welcome to OpenHR](/how-to-use/welcome-to-openhr).

#### Understanding OpenHR Subscription States

| Status | Description | Access Level |
|--------|-------------|--------------|
| **Trial** | Your initial 14-day evaluation period | Full access with countdown banner |
| **Active** | Activated via donation | Full access, no restrictions |
| **Ad-Supported** | Free tier with non-intrusive ads | Full access, small ads shown |
| **Expired** | Trial ended, no action taken | Read-only — cannot create/edit records |
| **Suspended** | Account suspended | Complete lockout — contact support |

#### What Happens When Your Trial Expires

When your trial expires, your account switches to **read-only mode**:

- You can still **view** all your data — [attendance logs](/how-to-use/understanding-attendance-logs), leave history, [employee records](/how-to-use/managing-employees).
- You **cannot** create new records, [clock in/out](/how-to-use/how-to-clock-in-and-out), [apply for leave](/how-to-use/how-to-apply-for-leave), or make any changes.
- A banner prompts you to choose an upgrade option.

You'll receive email reminders at **7 days**, **3 days**, and **1 day** before your trial expires.

#### Upgrade Option 1: Donate (Support Open Source)

Support the project with a one-time donation and get full access:

| Tier | Amount | Duration |
|------|--------|----------|
| Starter | $5 | 3 months |
| Supporter | $10 | 6 months |
| Champion | $20 | 1 year |
| Lifetime | $50 | Lifetime access |

**How donation activation works:**
1. Choose a donation tier.
2. Make your payment via Ko-fi, Buy Me a Coffee, or PayPal.
3. Enter your **transaction reference** and upload a **screenshot** of the payment.
4. Submit your activation request.
5. The OpenHR team verifies and activates your subscription.

#### Upgrade Option 2: Extend Your Trial

Need more time to evaluate? Request a trial extension:

1. Select an **extension reason** (evaluating features, budget approval, setup in progress, training team, non-profit organization, educational institution, or other).
2. Choose the **extension period** — 7, 14, or 30 days.
3. Add any **additional details**.
4. Submit the request for review.

#### Upgrade Option 3: Ad-Supported (Free Forever)

Get **full feature access for free** with non-intrusive ads:

- **Ads are shown** in the sidebar and dashboard areas only.
- **No ads** in critical workflows — [attendance clock-in/out](/how-to-use/how-to-clock-in-and-out) remains completely ad-free.
- You can **upgrade anytime** to remove ads by making a donation.

Click **"Accept Ad-Supported Mode"** to activate immediately — no approval needed.

#### Related Guides

- [Welcome to OpenHR](/how-to-use/welcome-to-openhr) — Overview of all features.
- [Install OpenHR as a Mobile App](/how-to-use/install-openhr-pwa) — Use OpenHR from your phone.
- [Understanding the Dashboard](/how-to-use/understanding-dashboard) — What you see when logged in, including subscription banners.

---

---

## Category: Reports

---

### Tutorial 25: Exporting Employee Data

**Slug:** `exporting-employee-data`
**Category:** Reports
**Display Order:** 2
**Parent:** Generating Reports
**Excerpt:** How to export your employee directory as CSV for data analysis or branded PDF for stakeholder sharing.

---

**Content:**

In addition to [attendance and leave reports](/how-to-use/generating-reports), OpenHR allows you to export your [employee directory](/features/employee-directory) data in two formats.

#### How to Export from the Employee Directory

Navigate to **[Employees](/how-to-use/managing-employees)** from the sidebar. You'll find export options at the top of the page.

##### CSV Export — For Data Analysis

Click **"Export CSV"** to download a spreadsheet containing:

- Employee ID
- Full Name
- Email
- Department
- Designation
- Role
- Team
- Status (Active/Inactive)
- Joining Date
- Contact Information

The CSV file can be opened in Excel, Google Sheets, or any spreadsheet application for data analysis and reporting.

##### PDF Export — For Stakeholder Sharing

Click **"Export PDF"** to generate a formatted document that includes:

- Your organization's **logo and name** at the top
- A **summary table** with total employee count, department breakdown
- **Employee listing** with all key fields
- **Generation date** for record-keeping

The PDF is ideal for printing or sharing with stakeholders who need an official employee roster with organization branding.

#### Tips for Employee Data Export

- Use **search filters** before exporting to narrow down to specific departments or [roles](/how-to-use/roles-and-permissions).
- PDF exports include organization branding automatically — no manual formatting needed.
- CSV exports are best for data analysis; PDF exports are best for sharing and archiving.

#### Related Guides

- [Managing Employees](/how-to-use/managing-employees) — The full employee directory guide.
- [Generating HR Reports](/how-to-use/generating-reports) — Attendance and leave report exports.
- [Roles and Permissions](/how-to-use/roles-and-permissions) — Who can access export features.

---

---

## Additional Tutorial Ideas

Below are additional tutorials you can create later:

### Quick Reference Guides (Category: Getting Started)
- **Mobile vs Desktop Experience** — Tips for using OpenHR on your phone vs desktop

### Advanced Attendance (Category: Attendance)
- **Setting Up Geofencing for Your Offices** — Detailed GPS configuration guide with coordinate finding tips
- **Troubleshooting Camera and Location Issues** — Common problems and solutions for PWA camera/GPS access

### Advanced Organization (Category: Organization)
- **Multi-Location Setup** — Managing offices across different cities with different geofence radii
- **Year-End Leave Balance Reset** — How to handle annual resets and carry-forward policies
