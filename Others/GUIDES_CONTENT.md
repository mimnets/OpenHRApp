# OpenHR Guides — Content for Tutorials Section

> Use this as a reference to create tutorials in the Guides section of OpenHR.
> Each section below is a suggested tutorial. Copy, modify, and paste the content into the admin panel (SuperAdmin > Tutorials tab).
> Recommended categories: **Getting Started**, **Attendance**, **Leave**, **Employees**, **Organization**, **Reports**, **Settings**

---

## Category: Getting Started

---

### Tutorial 1: Welcome to OpenHR — Your First Steps

**Slug:** `welcome-to-openhr`
**Category:** Getting Started
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** Learn what OpenHR is, how it works, and what you can do with it right from day one.

---

**Content:**

Welcome to OpenHR — a modern, open-source HR management system built for growing teams.

Whether you're an Admin setting up your organization, a Manager overseeing your team, or an Employee tracking your daily work, this guide will help you get started.

#### What Can You Do with OpenHR?

- **Track Attendance** — Clock in and out with selfie verification and GPS location tagging. Supports both Office and Factory/Field modes.
- **Manage Leaves** — Apply for leave, check your balance, and get approvals through a smart multi-step workflow.
- **Organize Your Team** — Set up departments, teams, shifts, office locations, and leave policies all from one place.
- **Generate Reports** — Export attendance and leave reports as CSV or send them via email to stakeholders.
- **Role-Based Access** — Different roles (Admin, HR, Manager, Team Lead, Employee) see different dashboards and have different permissions.

#### How OpenHR Works

1. **Admin registers the organization** and invites employees.
2. **Employees log in** and clock in/out daily using their device camera and GPS.
3. **Leave requests** flow through a configurable approval chain (Manager → HR).
4. **Admins and HR** can view reports, manage policies, and configure the system.

#### Your Dashboard

When you log in, you'll see a personalized dashboard based on your role:

- **Admin/HR:** Full organization stats, quick action buttons, global employee directory, and leave allocation overview.
- **Manager:** Team-scoped stats, direct reports directory, and a team attendance summary.
- **Employee:** Personal stats, team info, reporting manager details, and quick actions like "Apply for Leave."

#### Quick Actions on the Dashboard

Your dashboard includes shortcut buttons for common tasks:

- **Office Check-In** — Start an attendance session for office work.
- **Factory Check-In** — Start an attendance session for field/factory work (requires location remarks).
- **Finish Session** — End your active attendance session (appears when you're clocked in).
- **Apply for Leave** — Open the leave application form directly.

#### Next Steps

- [How to Clock In and Out](#) — Learn the attendance process step by step.
- [How to Apply for Leave](#) — Submit your first leave request.
- [Setting Up Your Organization](#) — For admins: configure departments, shifts, and policies.

---

---

## Category: Attendance

---

### Tutorial 2: How to Clock In and Out

**Slug:** `how-to-clock-in-and-out`
**Category:** Attendance
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** A complete guide to clocking in and out of work using OpenHR's selfie and GPS-based attendance system.

---

**Content:**

OpenHR uses a smart attendance system that combines a **live selfie**, **GPS location**, and **time tracking** to create a verified attendance record.

#### Before You Start

Make sure you have:

1. **Camera access** — Your browser will ask for camera permission. Allow it.
2. **Location access** — GPS must be enabled on your device. Allow location permission when prompted.
3. **HTTPS connection** — The app must be accessed over a secure connection for camera and GPS to work.

#### Step 1: Navigate to Attendance

From your dashboard, you have two ways to start:

- Click the **"Office Check-In"** or **"Factory Check-In"** quick action button on your dashboard.
- Or, go to the **Attendance** page from the sidebar menu.

#### Step 2: Choose Your Mode

- **Office Mode** — For regular office work. Your GPS location will be matched against configured office locations.
- **Factory Mode** — For field or factory work. You **must** add remarks (e.g., factory name, site details) before clocking in.

#### Step 3: Wait for Camera and GPS

The attendance screen will show:

- A **live camera feed** in a circular frame (front-facing camera by default).
- A **"Face Ready"** indicator at the top when the camera is active (green, pulsing).
- Your **GPS location** below the camera — it will show the matched office name (e.g., "Head Office") or "Remote Area" if you're not near a configured location.

**Mobile users:** You can toggle between front and back cameras using the camera switch button. If your device supports it, you can also toggle the flashlight.

#### Step 4: Clock In

Once both camera and GPS are ready:

1. Review your location tag — make sure it shows the correct office or area.
2. For **Factory mode**, enter your remarks (factory name, project details, etc.).
3. Click **"Check In"**.
4. The system captures your selfie automatically.
5. A success animation (checkmark + "Verified") confirms your clock-in.

**What gets recorded:**
- Your selfie photo
- GPS coordinates (latitude, longitude)
- Office/location name
- Check-in time
- Date
- Duty type (OFFICE or FACTORY)
- Status: **PRESENT** or **LATE** (calculated based on your shift start time + grace period)

#### Step 5: Clock Out

When your work is done:

1. Go back to the **Attendance** page (or click "Finish Session" from the dashboard).
2. The button now shows **"Check Out"** instead of "Check In."
3. Your camera and GPS will activate again.
4. Optionally add end-of-day remarks.
5. Click **"Check Out"** to clock out.

Your check-out time is recorded, and the session is marked as completed.

#### Late Status Calculation

Your attendance status is automatically calculated:

- If you clock in **before** (shift start time + grace period) → **PRESENT**
- If you clock in **after** (shift start time + grace period) → **LATE**
- Grace period is configured by your admin (e.g., 15 minutes)

#### Auto-Close Sessions

If you forget to clock out, the system will automatically close your session:

- **Past-date sessions** — Closed automatically when you next log in. Remarks will show "[System: Auto-Closed Past Date]."
- **Same-day sessions** — Closed at the configured auto-close time (default: 11:59 PM). Remarks will show "[System: Max Time Reached]."

#### Tips

- Always make sure your GPS shows the correct location before clocking in.
- If GPS shows "Locating..." — wait a few seconds or tap the location indicator to refresh.
- Factory mode remarks are mandatory — be specific about your work site.
- Your selfie is stored securely and used for attendance verification.

---

### Tutorial 3: Understanding Your Attendance Logs

**Slug:** `understanding-attendance-logs`
**Category:** Attendance
**Display Order:** 2
**Parent:** How to Clock In and Out
**Excerpt:** Learn how to view your personal attendance history and understand what each field means.

---

**Content:**

After you start clocking in daily, you can review your complete attendance history from the Attendance Logs page.

#### Accessing Your Logs

Navigate to **"My Attendance History"** from the sidebar menu. This shows your personal attendance records.

#### What You'll See

Each record displays:

| Field | Description |
|-------|-------------|
| **Selfie** | Your check-in photo thumbnail |
| **Date** | The date of the attendance record (e.g., "17 Feb 2026") |
| **Status** | Color-coded badge: PRESENT (green), LATE (amber), ABSENT (red) |
| **Check-In Time** | When you clocked in (24-hour format) |
| **Check-Out Time** | When you clocked out, or "Active" if session is ongoing |
| **Location** | Office name or "Remote Area" |
| **Remarks** | Any notes (yours or system-generated) |

#### Multiple Punches in a Day

If you clock in and out multiple times on the same day (e.g., stepped out for lunch), the system consolidates your records:

- **Check-In** = Earliest clock-in time of the day
- **Check-Out** = Latest clock-out time of the day
- **Remarks** = Combined from all sessions (separated by "|")

#### Sorting Your Logs

You can sort records by date — newest first or oldest first — using the sort toggle.

---

### Tutorial 4: Attendance for Admins — Audit and Manual Entries

**Slug:** `attendance-admin-audit`
**Category:** Attendance
**Display Order:** 3
**Parent:** How to Clock In and Out
**Excerpt:** Admins can audit, edit, and manually create attendance records for any employee.

---

**Content:**

As an Admin or HR user, you have full visibility into the organization's attendance data.

#### Viewing All Attendance Records

Navigate to **Attendance Audit** from the sidebar. This shows attendance records for all employees in your organization.

**Managers** will see records only for their direct reports and team members.

#### Filtering Records

Use the filters to narrow down:

- **Employee name or ID** — Search for a specific person
- **Department** — Filter by department (Admin only)
- **Date range** — View records within a specific period
- **Status** — Filter by PRESENT, LATE, ABSENT, etc.

#### Editing an Attendance Record

Click on any record to open the detail modal. You can edit:

- **Check-in time** — Correct the clock-in time
- **Check-out time** — Correct the clock-out time
- **Status** — Change to PRESENT, LATE, ABSENT, EARLY_OUT, or LEAVE
- **Remarks** — Add admin notes
- **Date** — Change the log date

You can also use the **"Recalculate Status"** button which will auto-calculate the status based on the employee's shift configuration and the edited times.

#### Marking an Employee as Absent

Click the **"Mark Absent"** button (Admin only) to create a manual absence record:

1. Select the employee from the dropdown.
2. Choose the date of absence.
3. Enter a reason (optional).
4. Submit.

This creates a record with check-in and check-out set to "-", status set to "ABSENT", and remarks prefixed with "[Manual Entry]."

#### Deleting Records

Admins can permanently delete attendance records. A confirmation dialog is shown before deletion. Use this carefully — deleted records cannot be recovered.

#### GPS Verification

Each attendance record shows the exact GPS coordinates. Click the coordinates to open the location in Google Maps for verification.

---

---

## Category: Leave

---

### Tutorial 5: How to Apply for Leave

**Slug:** `how-to-apply-for-leave`
**Category:** Leave
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** Step-by-step guide to submitting a leave request, checking your balance, and tracking approval status.

---

**Content:**

OpenHR makes it easy to apply for leave, track your balance, and follow your request through the approval process.

#### Step 1: Check Your Leave Balance

Go to the **Leave** page from the sidebar. At the top, you'll see three cards showing your remaining balance:

- **Annual Leave** — Your vacation/annual days remaining
- **Casual Leave** — Your casual leave days remaining
- **Sick Leave** — Your sick leave days remaining

These balances are calculated automatically: your total allocation minus all approved leaves.

#### Step 2: Click "Apply Leave"

Click the **"Apply Leave"** button on the Leave page. A form will open asking for:

1. **Leave Type** — Select from:
   - Annual Leave
   - Casual Leave
   - Sick Leave

2. **Start Date** — When your leave begins.

3. **End Date** — When your leave ends.

4. **Reason** — A mandatory explanation for your absence.

#### Smart Day Calculation

As you select your dates, the system automatically calculates the total working days:

- **Weekends are excluded** — Based on your shift's working days (e.g., if you work Mon–Fri, Saturday and Sunday are excluded).
- **Public holidays are excluded** — Any company holidays falling within your leave period are deducted.
- A breakdown is shown: *"X Weekend(s) excluded. Y Holiday(s) excluded."*

#### Step 3: Review and Submit

Before submitting, verify:

- Your balance is sufficient (the system will block you if it's not)
- The dates and leave type are correct
- Your reason clearly explains the absence

Click **Submit** to send your request for approval.

#### Step 4: Track Your Request

After submitting, your request appears in the **Application History** section on the Leave page. Each request shows:

- **Status badge:**
  - **PENDING_MANAGER** (amber) — Awaiting your manager's approval
  - **PENDING_HR** (amber/orange) — Manager approved, awaiting HR verification
  - **APPROVED** (green) — Leave approved and balance deducted
  - **REJECTED** (red) — Leave denied
- **Leave type** and date range
- **Total days** requested

#### What Happens Next?

Your request follows the approval workflow configured by your organization:

1. **Manager Review** — Your line manager evaluates and either approves (forwarding to HR) or rejects.
2. **HR Verification** — HR gives final approval or rejection.
3. **Balance Update** — Once fully approved, the days are deducted from your balance.

If your department is configured to skip the manager step, your request goes directly to HR.

#### Tips

- Apply for leave **in advance** whenever possible.
- For sick leave exceeding 3 days, attach medical documentation (mention in the reason field).
- Half-day leaves are supported — ask your HR to set this up for you.
- You can view all your past leave requests in the Application History section.

---

### Tutorial 6: Leave Approval — For Managers

**Slug:** `leave-approval-for-managers`
**Category:** Leave
**Display Order:** 2
**Parent:** How to Apply for Leave
**Excerpt:** How to review, approve, or reject leave requests from your direct reports as a Manager.

---

**Content:**

As a Manager, you are the first step in the leave approval process. Leave requests from your direct reports will land in your approval queue.

#### Accessing Pending Requests

Go to the **Leave** page. You'll see the **"Manager Approval Hub"** section showing:

- A list of leave requests with status **PENDING_MANAGER** from your team members.
- Each card shows: employee name, leave type, days requested, and start date.

#### Reviewing a Request

Click **"Evaluate"** on any pending request to open the review modal:

- **Employee's reason** for the leave is displayed (read-only).
- You can add your **"Managerial Remarks"** — notes about team coverage, your assessment, etc.

#### Taking Action

You have two options:

1. **Approve & Forward** — Approves the request at the manager level and forwards it to HR for final verification. Status changes to **PENDING_HR**.

2. **Reject** — Denies the request. Status changes to **REJECTED**. The employee is notified. Provide a clear reason in your remarks.

#### Best Practices

- Review requests **within 24 hours** to avoid delays.
- Check team coverage before approving — make sure critical work is covered.
- Add meaningful remarks — they help HR make their decision and serve as documentation.
- If you're unavailable, HR/Admin can override and process the request directly.

---

### Tutorial 7: Leave Approval — For HR and Admins

**Slug:** `leave-approval-for-hr`
**Category:** Leave
**Display Order:** 3
**Parent:** How to Apply for Leave
**Excerpt:** How HR and Admin users verify, approve, or reject leave requests and manage leave records.

---

**Content:**

HR and Admin users have the final say in the leave approval process. You also have tools to manage leave records directly.

#### HR Administration Panel

Go to the **Leave** page. You'll see the **"HR Administration"** section with two tabs:

##### Pending Approval Tab

Shows all requests waiting for your action:

- **PENDING_HR** requests (green badge) — Already approved by the manager, waiting for your verification.
- **PENDING_MANAGER** requests (orange badge) — If the workflow skips the manager step or if you want to override.

Click **"Verify"** or **"Review"** to open the request details.

**What you'll see in the review modal:**
- Employee name and leave details
- The employee's original reason
- Manager's remarks (if the request was forwarded from a manager)
- A field for your **"Admin Remarks"**

**Your actions:**
- **Approve** — Final approval. Status changes to **APPROVED**. Leave balance is deducted automatically.
- **Decline** — Rejection. Status changes to **REJECTED**. Employee is notified.

##### All Leaves Tab

A comprehensive view of all leave records in the organization:

- **Search** by employee name, leave type, or status.
- View full leave history with status, dates, and duration.
- **Quick actions** on each record:
  - **Review** — Approve or reject pending requests inline.
  - **Edit** — Modify leave details (dates, type, days, status, remarks).
  - **Delete** — Permanently remove a leave record.

#### Creating Leave Records Manually

Admins can create leave records on behalf of employees:

1. Click the **"Add Leave"** button.
2. Select the **employee** from the dropdown.
3. Choose **leave type** (all 7 types available: Annual, Casual, Sick, Maternity, Paternity, Earned, Unpaid).
4. Set **start and end dates**.
5. Total days are auto-calculated (editable — supports half days like 0.5).
6. Set the **status** directly (you can set it to APPROVED to skip the workflow).
7. Add admin remarks.
8. Submit.

#### Admin Override

If a leave request is stuck at **PENDING_MANAGER** (manager hasn't responded), you can:

- Click **"Review"** on the request.
- The modal will show as an **"Admin Override"** action.
- You can approve or reject directly without waiting for the manager.

---

### Tutorial 8: Understanding Leave Policies

**Slug:** `understanding-leave-policies`
**Category:** Leave
**Display Order:** 4
**Parent:** How to Apply for Leave
**Excerpt:** Learn how leave types, balances, policies, and workflows are configured in your organization.

---

**Content:**

Your leave allocation and approval process are determined by your organization's leave policies.

#### Leave Types

OpenHR supports 7 leave types:

| Type | Description |
|------|-------------|
| **Annual** | Vacation / annual leave |
| **Casual** | Short-notice casual leave |
| **Sick** | Medical / sick leave |
| **Maternity** | Maternity leave |
| **Paternity** | Paternity leave |
| **Earned** | Earned / accrued leave |
| **Unpaid** | Leave without pay |

Employees can apply for Annual, Casual, and Sick leave through the self-service form. Admins can create records for all 7 types.

#### Default Leave Allocations

Your organization has default quotas:

- **Annual Leave:** typically 15 days/year
- **Casual Leave:** typically 10 days/year
- **Sick Leave:** typically 14 days/year

These defaults are set by your Admin/HR in Organization Settings > Leaves.

#### Custom Allocations

HR can set custom allocations for specific employees. For example, a senior employee might get 20 Annual Leave days instead of the default 15.

Check with your HR if you believe your allocation should be different.

#### Approval Workflow

Each department has a configured approval path:

- **Standard:** Employee → Manager → HR → Approved
- **Direct to HR:** Employee → HR → Approved (manager step skipped)

The workflow is configured per department in Organization Settings > Workflow.

#### Holidays and Weekends

When calculating leave days:

- **Weekends** (based on your shift schedule) are automatically excluded.
- **Public/company holidays** are automatically excluded.
- Only working days are counted against your balance.

---

---

## Category: Employees

---

### Tutorial 9: Managing Employees — Adding and Editing Staff

**Slug:** `managing-employees`
**Category:** Employees
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** For Admins: how to add new employees, assign roles, and manage the employee directory.

---

**Content:**

The Employee Directory is where you manage your organization's people. Admins and HR have full access to add, edit, and remove employees.

#### Accessing the Employee Directory

Go to **Employees** from the sidebar menu. You'll see a grid of employee cards with search functionality.

#### Adding a New Employee

Click **"Provision New User"** to open the employee creation form.

**Required Information:**

| Section | Fields |
|---------|--------|
| **Personal** | Full Name, Email, Phone, Emergency Contact |
| **Professional** | Employee ID, Role, Department, Designation |
| **Organization** | Team Assignment, Line Manager, Shift Assignment |
| **Employment** | Status (Active/Inactive), Type (Permanent/Contract), Location, Work Type (Office/Remote) |
| **Additional** | Joining Date, Salary, National ID |

**Role Options:**
- **EMPLOYEE** — Standard employee access
- **TEAM_LEAD** — Can lead a team
- **MANAGER** — Can manage teams, approve leaves, view team reports
- **HR** — Can manage leaves, policies, and employee records
- **ADMIN** — Full system access

When you save, the system automatically:
- Generates a username from the Employee ID
- Creates login credentials
- Assigns the default shift (if configured)
- Sends account verification email (if email is configured)

#### Editing an Employee

Click on any employee card to view their profile. Click **"Edit"** to modify any field.

Common edits:
- Changing department or team assignment
- Updating role (e.g., promoting to Manager)
- Assigning a different shift
- Updating contact information

#### Assigning Teams and Managers

When you assign an employee to a team:
- The team's leader is automatically set as their line manager
- You can override this by manually selecting a different line manager
- Team assignment determines which manager sees their leave requests

#### Uploading Profile Photos

Click the avatar area in the employee form to upload a profile picture. Supported formats: JPEG, PNG, WebP.

#### Searching and Filtering

Use the search bar at the top to find employees by:
- Name
- Employee ID
- Designation
- Email address

Results update in real-time with a 300ms delay for smooth searching.

#### Deleting an Employee

Click **"Delete"** on an employee card. A confirmation dialog will appear — **this action is permanent** and removes:
- The employee's user account
- Their attendance records
- Their leave records

#### Who Can See What?

| Role | Can See | Can Edit |
|------|---------|----------|
| **Admin/HR** | All employees | Yes — add, edit, delete |
| **Manager** | Team members and direct reports only | No |
| **Employee** | Teammates only | No |

---

---

## Category: Organization

---

### Tutorial 10: Setting Up Your Organization

**Slug:** `setting-up-organization`
**Category:** Organization
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** A complete guide to configuring departments, teams, shifts, locations, leave policies, and workflows.

---

**Content:**

Organization Settings is where Admins configure the structure and policies of their company. Access it from the sidebar by clicking **"Organization."**

The settings page has 8 tabs:

#### 1. Structure — Departments and Designations

**Departments:**
- Add departments like "Engineering," "Sales," "HR," "Finance"
- Departments are used for employee assignment, leave workflow routing, and report filtering

**Designations:**
- Add job titles like "Software Engineer," "HR Manager," "Accountant"
- Designations appear on employee profiles and reports

Click **"Add"** to create, or use the edit/delete icons on existing items.

#### 2. Teams

Create teams within departments:

1. Click **"Add Team"**
2. Enter a **team name** (e.g., "Frontend Team")
3. Select the **department** it belongs to
4. Choose a **Team Lead** from your employees
5. Select **team members** using the multi-select checkboxes
6. Save

Team assignment is important because:
- It determines which manager approves leave requests
- Managers can only see attendance/leave for their team
- Dashboard shows team-based statistics

#### 3. Placement — Office Locations

Define your physical office locations for GPS-based attendance verification:

1. Click **"Add Location"**
2. Enter the **location name** (e.g., "Head Office")
3. Enter **GPS coordinates** (latitude and longitude)
4. Set the **geofence radius** in meters (how far from the coordinates an employee can be and still match this location)

**Finding GPS coordinates:** Use Google Maps — right-click on your office location and copy the coordinates.

When employees clock in, their GPS is matched against these locations. If they're within the radius, the location name is recorded. Otherwise, they're marked as "Remote Area."

#### 4. Shifts

Configure work schedules:

1. Click **"Add Shift"**
2. Set the **shift name** (e.g., "Morning Shift," "Night Shift")
3. Define **start time** and **end time**
4. Set **late grace period** (minutes after start time before marking as LATE)
5. Set **early out grace period** (minutes before end time for acceptable early departure)
6. Set **earliest check-in time** (when employees can start clocking in)
7. Set **auto session close time** (when to automatically end sessions — default 11:59 PM)
8. Select **working days** (e.g., Monday through Friday)
9. Mark as **default shift** if it should be auto-assigned to new employees

**Shift Overrides:**
Need to temporarily change an employee's shift? (e.g., Ramadan hours, project deadlines)
- Go to the shift section
- Click **"Add Override"**
- Select the employee, date range, and the temporary shift
- Add a reason
- The override will take precedence during that date range

#### 5. Workflow — Leave Approval Routing

Configure how leave requests are routed per department:

1. Select a **department**
2. Choose the **approver role:** Manager, Team Lead, Admin, or HR
3. Save

This determines whether leave requests go through the manager first or directly to HR.

#### 6. Leaves — Leave Policy

**Global Defaults:**
Set the standard leave allocation for all employees:
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

#### 7. Holidays

Manage your organization's holiday calendar:

1. Click **"Add Holiday"**
2. Enter the **date** and **holiday name**
3. Select the **type:** National, Festival, or Islamic
4. Mark if it's a **government holiday**
5. Save

Holidays are:
- Excluded from leave day calculations
- Excluded from absence reports (employees aren't marked absent on holidays)
- Displayed on the holiday calendar

#### 8. System

Configure application-level settings like your company name and other global preferences.

---

---

## Category: Reports

---

### Tutorial 11: Generating Reports

**Slug:** `generating-reports`
**Category:** Reports
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** How to generate attendance and leave reports, export to CSV, and email reports to stakeholders.

---

**Content:**

OpenHR's Reports module lets you generate detailed attendance and leave reports for your organization.

#### Accessing Reports

Navigate to **Reports** from the sidebar menu. You'll see two tabs: **Generator** and **Columns**.

#### Report Types

Choose from 4 report types:

| Type | Description |
|------|-------------|
| **Attendance** | All attendance records for the selected period |
| **Absent** | Only days where employees were absent or had no check-in |
| **Late** | Only records where employees were marked as LATE |
| **Leave** | Leave request records for the selected period |

#### Setting Up Your Report

1. **Select Report Type** — Choose Attendance, Absent, Late, or Leave.

2. **Select Departments** — Use the multi-select to choose which departments to include. Use "Select All" for the entire organization.

3. **Set Date Range** — Choose the start and end dates for your report.

4. **Employee Scope** — Generate for all employees or select a specific individual.

5. **Recipients (for email)** — Enter comma-separated email addresses if you want to send the report via email.

#### Exporting to CSV

Click **"Export CSV"** to download the report as a CSV file. The file includes:
- Employee ID and name
- Date and status
- Check-in and check-out times
- GPS location and coordinates
- Remarks

#### Emailing Reports

Click **"Email Summary"** to send the report to the specified recipients. The system:
- Splits large reports into batches of 350 records per email
- Tracks delivery status (Sent, Failed, Pending)
- Shows a live status panel with email delivery updates

#### Configuring Columns

Switch to the **Columns** tab to choose which fields to include in your report:

- Employee ID
- Full Name
- Entry Date
- Status Type
- Clock In / Clock Out times
- GPS Address
- Latitude / Longitude
- Notes / Remarks

Toggle columns on/off based on what you need. Your selection applies to both CSV export and email reports.

#### Smart Calculations

Reports include intelligent processing:

- **Consolidated records:** Multiple clock-ins on the same day are merged (earliest check-in, latest check-out).
- **Gap analysis:** The Absent report identifies days where employees had no attendance record on working days.
- **Holiday exclusion:** Employees aren't counted as absent on holidays.
- **Shift-aware:** Uses each employee's assigned shift to determine their working days.

#### Live Preview

The right-side panel shows:
- How many records will be exported
- Which departments are included
- Recent email activity and delivery status
- Technical details about the export format

---

---

## Category: Settings

---

### Tutorial 12: Managing Your Profile and Settings

**Slug:** `managing-profile-settings`
**Category:** Settings
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** How to update your profile information, change your password, and customize your experience.

---

**Content:**

The Settings page lets you view your profile information, update your details, and change your password.

#### Viewing Your Profile

Navigate to **Settings** from the sidebar. You'll see your profile information:

- **Employee ID** — Your official ID in the organization
- **Reporting Manager** — Who you report to
- **Team** — Your team assignment
- **Shift** — Your assigned work shift and timing
- **Department and Designation** — Your organizational placement

These fields are read-only and managed by your Admin/HR.

#### Updating Your Information

You can update:

- **Full Name** — Your display name across the system
- **Work Email** — Your email address

Click **"Save"** after making changes.

#### Changing Your Password

1. Scroll to the **Security** section.
2. Enter your **new password** (minimum 8 characters).
3. Confirm the password.
4. Click **"Update Password."**

#### Theme Selection

Customize the app's appearance using the Theme Selector. Choose from available color themes to personalize your experience.

#### Contact Support

Need help? Use the **Contact Support** form at the bottom of the Settings page:

1. Your name and email are pre-filled.
2. Enter a **subject** for your query.
3. Write your **message** with details about your issue.
4. Click **"Send"** to submit your support request.

---

---

## Category: Getting Started

---

### Tutorial 13: Roles and Permissions in OpenHR

**Slug:** `roles-and-permissions`
**Category:** Getting Started
**Display Order:** 2
**Parent:** Welcome to OpenHR — Your First Steps
**Excerpt:** Understand what each role can do — from Admin to Employee — and how permissions work.

---

**Content:**

OpenHR uses role-based access control (RBAC) to ensure each user sees only what they need and can only perform actions appropriate to their role.

#### Available Roles

| Role | Description |
|------|-------------|
| **ADMIN** | Full system access. Can configure everything. |
| **HR** | Manage employees, leaves, and policies. Similar to Admin but focused on HR functions. |
| **MANAGER** | Oversee team attendance and approve leaves for direct reports. |
| **TEAM_LEAD** | Lead a team. Can be configured as a leave approver. |
| **EMPLOYEE** | Standard user. Can clock in/out, apply for leave, and view personal data. |

#### Permission Matrix

| Feature | Admin | HR | Manager | Team Lead | Employee |
|---------|-------|----|---------|-----------|----------|
| Dashboard (full stats) | Yes | Yes | Team only | Team only | Personal |
| Employee Directory | Full CRUD | Full CRUD | View team | View team | View teammates |
| Organization Settings | Full access | Full access | No | No | No |
| Attendance Clock In/Out | Yes | Yes | Yes | Yes | Yes |
| Attendance Audit (all records) | Yes | Yes | Team only | No | Own only |
| Leave Apply | Yes | Yes | Yes | Yes | Yes |
| Leave Approve (Manager step) | Override | Override | Direct reports | If configured | No |
| Leave Approve (HR step) | Yes | Yes | No | No | No |
| Leave Create/Edit/Delete | Yes | Yes | No | No | No |
| Reports | All | All | Team scope | No | No |
| Profile/Settings | Yes + Admin tools | Yes | Yes | Yes | Yes |

#### Key Access Rules

- **Managers** can only see employees in their teams and their direct reports. They cannot access other departments.
- **Employees** can see their teammates but cannot edit anyone's information.
- **Admin and HR** have organization-wide visibility.
- **Leave approval** follows the configured workflow — Managers approve first, then HR gives final approval.

---

---

## Category: Getting Started

---

### Tutorial 14: Install OpenHR as an App (PWA) on Android and iOS

**Slug:** `install-openhr-pwa`
**Category:** Getting Started
**Display Order:** 3
**Parent:** Welcome to OpenHR — Your First Steps
**Excerpt:** Install OpenHR on your phone's home screen for a native app-like experience — no app store needed.

---

**Content:**

OpenHR is a Progressive Web App (PWA), which means you can install it directly on your Android or iOS device and use it just like a native app — with its own icon, full-screen mode, and offline-ready capabilities. No app store download required.

#### What is a PWA?

A Progressive Web App is a website that behaves like a native mobile app. Once installed, OpenHR will:

- Appear on your **home screen** with its own icon
- Open in **full-screen mode** (no browser address bar)
- Load **faster** thanks to cached resources
- Work even with **poor network connectivity**
- Receive **push notifications** (if enabled by your admin)

#### Installing on Android (Chrome)

1. Open **Google Chrome** on your Android device.
2. Navigate to your organization's OpenHR URL (e.g., `https://hr.yourcompany.com`).
3. Log in with your credentials.
4. You should see a **"Add to Home Screen"** banner at the bottom — tap **Install**.
5. If the banner doesn't appear:
   - Tap the **three-dot menu** (⋮) in the top-right corner.
   - Select **"Add to Home screen"** or **"Install app"**.
6. Confirm by tapping **"Install"** or **"Add"**.
7. OpenHR will now appear on your home screen as a standalone app.

#### Installing on iPhone / iPad (Safari)

1. Open **Safari** on your iPhone or iPad (this only works in Safari, not Chrome or Firefox on iOS).
2. Navigate to your organization's OpenHR URL.
3. Log in with your credentials.
4. Tap the **Share button** (the square with an upward arrow) at the bottom of the screen.
5. Scroll down in the share menu and tap **"Add to Home Screen"**.
6. You can rename the app if you want, then tap **"Add"** in the top-right corner.
7. OpenHR will now appear on your home screen as an app icon.

#### Installing on Desktop (Chrome / Edge)

1. Open **Google Chrome** or **Microsoft Edge** on your computer.
2. Navigate to your OpenHR URL and log in.
3. Look for the **install icon** (a small ⊕ or monitor icon) in the address bar on the right side.
4. Click it and confirm **"Install"**.
5. OpenHR will open in its own window and appear in your Start Menu (Windows) or Applications folder (Mac).

#### Using the Installed App

Once installed, OpenHR behaves like any other app on your device:

- **Launch** it from your home screen or app drawer — no need to open a browser first.
- **Switch** between OpenHR and other apps normally.
- **Notifications** will come through as system notifications (if supported by your organization).
- **Updates** happen automatically — you always get the latest version without reinstalling.

#### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Add to Home Screen" option not showing (Android) | Make sure you're using **Chrome**. Clear your browser cache and reload the page. |
| "Add to Home Screen" option not showing (iOS) | You must use **Safari** — this feature is not available in Chrome or Firefox on iOS. |
| App opens in browser instead of full-screen | Remove the shortcut and reinstall using the steps above. Make sure you use the browser's install/share feature, not a simple bookmark. |
| App looks outdated after an update | Close the app completely and reopen it. On Android, you can also go to Chrome > Settings > Site Settings > find OpenHR > Clear & Reset. |
| App not loading offline | Ensure you've visited the app at least once while online so resources can be cached. |

#### Uninstalling

- **Android:** Long-press the OpenHR icon > Uninstall (or drag to Remove).
- **iOS:** Long-press the OpenHR icon > Remove App > Delete from Home Screen.
- **Desktop (Chrome):** Open the app > click the three-dot menu in the title bar > Uninstall.

---

---

## Additional Tutorial Ideas

Below are additional tutorials you can create later:

### Quick Reference Guides (Category: Getting Started)
- **Navigating the Dashboard** — A visual tour of dashboard elements
- **Mobile vs Desktop Experience** — Tips for using OpenHR on your phone

### Advanced Attendance (Category: Attendance)
- **Setting Up Geofencing for Your Offices** — Detailed GPS configuration guide
- **Configuring Shifts and Schedules** — Deep dive into shift management
- **Understanding Attendance Statuses** — PRESENT, LATE, ABSENT, EARLY_OUT, LEAVE explained

### Advanced Leave (Category: Leave)
- **Configuring Leave Workflows by Department** — Detailed workflow setup
- **Half-Day and Special Leave Types** — Maternity, Paternity, Earned, Unpaid
- **Year-End Leave Balance Reset** — How to handle annual resets

### Admin Guides (Category: Organization)
- **Multi-Location Setup** — Managing offices across different cities
- **Holiday Calendar Management** — Setting up holidays for the year
- **Subscription Management** — Understanding Trial, Active, Expired, Suspended states
