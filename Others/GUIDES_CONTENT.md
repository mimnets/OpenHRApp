# OpenHR Guides — Content for Tutorials Section

> Use this as a reference to create tutorials in the Guides section of OpenHR.
> Each section below is a suggested tutorial. Copy, modify, and paste the content into the admin panel (SuperAdmin > Tutorials tab).
> Recommended categories: **Getting Started**, **Attendance**, **Leave**, **Employees**, **Organization**, **Reports**, **Settings**, **Performance Reviews**, **Announcements**

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

#### Exporting Employee Data

Admins can export the employee directory in two formats:

- **CSV** — Download a spreadsheet with employee IDs, names, departments, roles, and contact details. Ideal for data analysis.
- **PDF** — Generate a branded document with your organization's logo, employee summary statistics, and a complete employee listing. Ideal for sharing with stakeholders.

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

The settings page has 9 tabs:

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

#### 8. Notifications

Configure how notifications are handled in your organization:

- **Enabled Notification Types** — Choose which events trigger bell and email notifications (Leave, Attendance, Review, Announcement, System).
- **Digest Frequency** — Set how often notification digests are sent (Immediate or batched).
- **Quiet Hours** — Optionally disable notifications during off-hours.
- **Retention** — Notifications are automatically cleaned up after 30 days.

#### 9. System

Configure application-level settings like your company name, office/factory labels, and other global preferences.

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

Customize the app's appearance using the Theme Selector:

- Choose from **14 color themes** to change the app's accent color across all pages.
- Switch between **Light Mode**, **Dark Mode**, or **System** (follows your device preference).
- Your theme preference is saved to your profile and persists across devices.

See the [Theme Customization](#) tutorial for more details.

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

## Category: Performance Reviews

---

### Tutorial 15: Performance Reviews — Employee Self-Assessment

**Slug:** `performance-review-self-assessment`
**Category:** Performance Reviews
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** How to complete your self-assessment during a performance review cycle, rate your competencies, and submit for manager review.

---

**Content:**

OpenHR includes a built-in performance review system that guides employees, managers, and HR through a structured review process each cycle.

#### How Performance Reviews Work

The review process has three stages:

1. **Self-Assessment** — You rate yourself on each competency and add comments.
2. **Manager Review** — Your manager reviews your self-assessment, adds their own ratings, and provides feedback.
3. **HR Calibration** — HR reviews the final assessment, adds overall remarks, and completes the review.

#### Checking for Active Review Cycles

Navigate to **Performance** from the sidebar menu. You'll see one of the following:

- **Active Cycle** — A review cycle is currently open. You'll see the cycle name, date range, and your review status.
- **Upcoming Cycle** — A cycle is scheduled but hasn't started yet. You'll see when it opens.
- **No Active Cycle** — No reviews are currently in progress. Check back later.

#### Completing Your Self-Assessment

When a review cycle is active:

1. You'll see a list of **competencies** configured by your organization (e.g., Agility, Collaboration, Customer Focus, Innovation Mindset).
2. For each competency, select a **rating** on the configured scale (typically 1–5):
   - 1 — Needs Improvement
   - 2 — Below Expectations
   - 3 — Meets Expectations
   - 4 — Exceeds Expectations
   - 5 — Outstanding
3. Add a **comment** for each competency explaining why you chose that rating. Be specific — mention projects, achievements, or areas for growth.
4. Review the auto-generated **Attendance Summary** and **Leave Summary** cards. These are calculated from your records during the review period and are included for reference.

#### Submitting Your Self-Assessment

Once you've rated all competencies and added your comments:

1. Click **"Submit Self-Assessment"**.
2. Your review status changes from **DRAFT** to **SELF_REVIEW_SUBMITTED**.
3. Your manager is notified (via email and bell notification) that your review is ready for their input.

**Important:** Once submitted, you cannot edit your self-assessment. Make sure everything is accurate before submitting.

#### Viewing Manager Feedback

After your manager completes their review:

- Your status changes to **MANAGER_REVIEWED**.
- You can see your manager's ratings and comments alongside your own self-assessment.
- The review is then forwarded to HR for final calibration.

#### Review Completion

When HR completes the review:

- Your status changes to **COMPLETED**.
- You can see the final overall rating and HR remarks.
- The completed review is archived in your **Past Reviews** section.

#### Downloading Your Review as PDF

Once a review is completed, you can download it as a PDF:

1. Go to your **Past Reviews** section.
2. Click the **Download** icon next to any completed review.
3. The PDF includes your organization's branding, all competency ratings (self and manager), attendance/leave summaries, and final HR remarks.

#### Past Reviews

Click **"View Past Reviews"** to expand your review history. Each past review shows:

- Cycle name and date range
- Your final overall rating
- Status badge (COMPLETED, MANAGER_REVIEWED, etc.)
- Option to expand and view full details
- Download as PDF

---

### Tutorial 16: Performance Reviews — For Managers

**Slug:** `performance-review-for-managers`
**Category:** Performance Reviews
**Display Order:** 2
**Parent:** Performance Reviews — Employee Self-Assessment
**Excerpt:** How to review your direct reports' self-assessments, provide ratings and feedback, and forward to HR.

---

**Content:**

As a Manager, you play a critical role in the performance review process. After your direct reports submit their self-assessments, it's your turn to evaluate them.

#### Accessing Pending Reviews

Navigate to **Performance** from the sidebar. In the **Manager Review** section, you'll see:

- A list of your direct reports who have submitted their self-assessments (status: **SELF_REVIEW_SUBMITTED**).
- Each card shows the employee's name, department, and current review status.

#### Reviewing an Employee

Click on an employee's review card to open the review form:

1. **View Self-Assessment** — See the employee's self-ratings and comments for each competency.
2. **Attendance & Leave Summary** — Review the employee's attendance record and leave usage during the review period.
3. **Add Your Ratings** — For each competency, provide your own rating (1–5) and comments. Consider:
   - How the employee's work aligns with each competency
   - Specific examples of strengths or improvement areas
   - Whether the employee's self-assessment is accurate
4. **Overall Comments** — Add any general feedback about the employee's performance.

#### Submitting Your Review

Once you've completed all ratings:

1. Click **"Submit Manager Review"**.
2. The review status changes to **MANAGER_REVIEWED**.
3. HR is notified that the review is ready for final calibration.
4. The employee can now see your feedback alongside their self-assessment.

#### Tips for Effective Reviews

- Be **specific** — reference actual projects, deliverables, or incidents.
- Be **balanced** — acknowledge strengths while constructively addressing areas for improvement.
- Be **fair** — base ratings on observable performance, not personal preferences.
- Complete reviews **promptly** — you'll receive deadline reminders at 3 days and 1 day before the cycle closes.

---

### Tutorial 17: Performance Reviews — HR Calibration

**Slug:** `performance-review-hr-calibration`
**Category:** Performance Reviews
**Display Order:** 3
**Parent:** Performance Reviews — Employee Self-Assessment
**Excerpt:** How HR calibrates performance reviews, assigns final ratings, and completes the review cycle.

---

**Content:**

HR has the final say in the performance review process. After managers submit their reviews, HR calibrates the results and completes the cycle.

#### Accessing Reviews for Calibration

Navigate to **Performance** from the sidebar. In the **HR Calibration** section, you'll see reviews with status **MANAGER_REVIEWED** that are waiting for your input.

#### Calibrating a Review

Open a review to see:

1. **Employee's Self-Assessment** — Their self-ratings and comments.
2. **Manager's Review** — The manager's ratings and feedback.
3. **Attendance & Leave Summary** — Objective data about the employee's presence and leave usage.

#### Completing the Review

1. Review both self-assessment and manager ratings side by side.
2. Add **HR Final Remarks** — Your overall assessment and any calibration notes.
3. Assign an **Overall Rating** — The final performance rating for this employee.
4. Click **"Complete Review"** to finalize.

The review status changes to **COMPLETED**, and both the employee and manager are notified.

#### Managing Review Cycles (Admin)

Admins can manage review cycles from the Performance page:

- **Create Cycle** — Set up a new review cycle with name, type (Quarterly, Mid-Year, Annual), start/end dates, and review window dates.
- **Configure Competencies** — Choose which competencies to include in the cycle.
- **Activate/Deactivate** — Control when the cycle is open for submissions.
- **View Progress** — Track how many employees have completed each stage.

---

---

## Category: Announcements

---

### Tutorial 18: Announcements — Viewing and Creating

**Slug:** `announcements-guide`
**Category:** Announcements
**Display Order:** 1
**Parent:** None (Top-level)
**Excerpt:** How to view organization announcements and how Admins can create, edit, and manage them.

---

**Content:**

Announcements in OpenHR let admins and HR communicate important information to the entire organization or specific groups.

#### Viewing Announcements

Navigate to **Announcements** from the sidebar menu. You'll see a list of active announcements with:

- **Title** — The announcement headline
- **Content** — Full message text
- **Priority Badge** — NORMAL (default) or URGENT (highlighted for attention)
- **Author** — Who posted the announcement
- **Date** — When it was posted
- **Expiry** — When the announcement will be automatically hidden (if set)

**Urgent announcements** always appear at the top of the list and are visually highlighted so they stand out.

Announcements also appear as a widget on your **Dashboard** so you stay informed without having to navigate to the announcements page.

#### Creating Announcements (Admin/HR)

If you're an Admin or HR user:

1. Click the **"Create Announcement"** button.
2. Fill in the form:
   - **Title** — A clear, concise headline (required).
   - **Content** — The full announcement message (required).
   - **Priority** — Choose NORMAL or URGENT. Urgent announcements are highlighted and appear first.
   - **Target Roles** — Select which roles should see this announcement (Admin, HR, Manager, Team Lead, Employee). Leave empty to show to everyone.
   - **Expiry Date** — Optional. The announcement will automatically hide after this date.
3. Click **"Save"** to publish.

All targeted employees receive a **bell notification** when a new announcement is posted.

#### Editing and Deleting Announcements

- Click the **edit** icon on any announcement to update its title, content, priority, target audience, or expiry.
- Click the **delete** icon to permanently remove an announcement. A confirmation dialog is shown before deletion.

#### Tips

- Use **URGENT** priority sparingly — reserve it for critical updates like policy changes, emergency notices, or system downtime.
- Set **expiry dates** for time-sensitive announcements (e.g., event reminders, holiday notices) so old content doesn't clutter the page.
- Use **role targeting** to avoid sending irrelevant announcements to the entire organization.

---

---

## Category: Settings

---

### Tutorial 19: Notifications — Bell Notifications and Admin Management

**Slug:** `notifications-guide`
**Category:** Settings
**Display Order:** 2
**Parent:** Managing Your Profile and Settings
**Excerpt:** How bell notifications work, what triggers them, and how admins can send and manage notifications.

---

**Content:**

OpenHR has a built-in notification system that keeps you informed about important events via bell notifications and email.

#### The Notification Bell

You'll see a **bell icon** in the top header bar. A red badge shows your **unread notification count**.

Click the bell to see your recent notifications. Each notification shows:

- **Type icon** — Color-coded by category (Leave, Attendance, Announcement, Review, System)
- **Title** — A brief description of the event
- **Message** — Details about what happened
- **Timestamp** — When the notification was created
- **Read/Unread status** — Unread notifications are highlighted

Notifications are automatically **marked as read** when you view them.

#### What Triggers Notifications?

| Event | Who Gets Notified |
|-------|-------------------|
| **Leave submitted** | Employee (confirmation), Manager (action required), Admin/HR (new request) |
| **Leave approved by manager** | Employee (manager approved), Admin/HR (HR review required) |
| **Leave fully approved** | Employee (approved), Manager (FYI) |
| **Leave rejected** | Employee (rejected), Manager (FYI) |
| **Late check-in** | Manager (late alert), Admin/HR (late alert) |
| **Auto-marked absent** | Employee (marked absent), Manager (FYI) |
| **Checkout reminder** | Employee (reminder to clock out) |
| **Daily attendance report** | Admin/HR (end-of-day summary) |
| **Review cycle opened** | All employees (cycle open), Managers (action required) |
| **Self-assessment submitted** | Manager (review ready) |
| **Manager review completed** | Employee (feedback available), HR (calibration needed) |
| **Review finalized by HR** | Employee (review complete), Manager (FYI) |
| **New announcement** | Targeted roles (based on announcement settings) |

#### Admin Notification Management

Admins and HR can access the **Notifications** page from the sidebar to:

##### Sending Notifications

1. Click **"Send Notification"** to open the form.
2. Select the **notification type** (Announcement, Leave, Attendance, Review, System).
3. Choose **recipients** — select specific employees from the dropdown.
4. Enter a **title** and **message**.
5. Set **priority** — Normal or Urgent.
6. Click **"Send"** to deliver the notification instantly.

##### Viewing Notification History

- See all notifications sent across the organization (up to 100 most recent).
- **Search** notifications by title or message content.
- **Filter** by notification type (Announcement, Leave, Attendance, Review, System).
- Each notification shows the recipient, type badge, title, message, and timestamp.

##### Managing Notifications

- **Delete individual** notifications by clicking the delete button on each card.
- **Delete all** notifications at once using the "Delete All" button (confirmation required).

---

---

## Category: Settings

---

### Tutorial 20: Theme Customization

**Slug:** `theme-customization`
**Category:** Settings
**Display Order:** 3
**Parent:** Managing Your Profile and Settings
**Excerpt:** Personalize OpenHR's appearance with 14 color themes and light/dark mode.

---

**Content:**

OpenHR offers extensive visual customization so you can make the app look and feel just right.

#### Choosing a Theme

Navigate to **Settings** from the sidebar. In the **Theme** section, you'll see a grid of available color themes:

Each theme changes the primary accent color used across the entire application — buttons, links, badges, sidebar highlights, and more.

Simply click on a theme to apply it instantly. Your selection is saved to your profile and persists across devices and sessions.

#### Light and Dark Mode

Use the **mode toggle** to switch between:

- **Light Mode** — Bright background with dark text. Best for well-lit environments.
- **Dark Mode** — Dark background with light text. Reduces eye strain in low-light conditions and saves battery on OLED screens.
- **System** — Automatically follows your device's system preference.

#### Organization Default Theme

Super Admins can set a **default theme** for the entire organization. When a new user logs in for the first time, they'll see the organization's default theme. Users can then customize their own preference.

---

---

## Category: Leave

---

### Tutorial 21: Custom Leave Types and Special Leave

**Slug:** `custom-leave-types`
**Category:** Leave
**Display Order:** 5
**Parent:** How to Apply for Leave
**Excerpt:** Understanding all leave types including Maternity, Paternity, Earned, Unpaid, and custom-configured leave types.

---

**Content:**

Beyond the standard Annual, Casual, and Sick leave, OpenHR supports several additional leave types and allows admins to configure custom ones.

#### Standard Leave Types

These are the leave types employees can apply for directly through the self-service form:

| Type | Description | Has Balance |
|------|-------------|-------------|
| **Annual** | Vacation / annual leave | Yes — deducted from allocation |
| **Casual** | Short-notice personal leave | Yes — deducted from allocation |
| **Sick** | Medical / health-related leave | Yes — deducted from allocation |

#### Special Leave Types

These types are typically created by Admin/HR on behalf of employees:

| Type | Description | Has Balance |
|------|-------------|-------------|
| **Maternity** | Leave for expectant or new mothers | No — duration set per case |
| **Paternity** | Leave for new fathers | No — duration set per case |
| **Earned** | Accrued leave earned through extra work | No — managed manually |
| **Unpaid** | Leave without pay | No — no balance deduction |

#### Half-Day Leave

OpenHR supports half-day leave. When an Admin or HR creates a leave record manually, the **total days** field can be set to decimal values like **0.5** for a half day. This allows precise tracking of partial leave days.

#### Custom Leave Types (Admin Configuration)

Admins can create entirely new leave types from **Organization > Leaves**:

1. Navigate to **Organization** from the sidebar.
2. Go to the **Leaves** tab.
3. In the leave types section, click **"Add Leave Type"**.
4. Configure:
   - **Name** — The display name (e.g., "Compensatory Off," "Study Leave")
   - **Has Balance** — Whether this type tracks a quota
   - **Description** — A brief explanation of when this leave type applies
5. Save.

Custom leave types will appear in the Admin leave creation form and can be assigned to any employee.

---

---

## Category: Organization

---

### Tutorial 22: Configuring Notification Settings

**Slug:** `notification-settings`
**Category:** Organization
**Display Order:** 2
**Parent:** Setting Up Your Organization
**Excerpt:** How to configure email notification settings, enabled notification types, and notification retention policies.

---

**Content:**

OpenHR sends automatic email and bell notifications for important events. Admins can control what gets sent and how.

#### Accessing Notification Settings

Navigate to **Organization** from the sidebar, then click the **Notifications** tab (or the **System** tab, depending on your version).

#### Configuring Email Notifications

The notification system automatically sends emails for:

- **Leave events** — Submission confirmations, approval/rejection notices, workflow forwards
- **Attendance events** — Late check-in alerts, absent notifications, checkout reminders, daily summaries
- **Review events** — Cycle open/close, submission confirmations, deadline reminders

Each email includes the relevant details (employee name, dates, status) and is sent to the appropriate parties based on the event type.

#### Notification Retention

The system automatically cleans up old notifications:

- **Bell notifications** are retained for **30 days** and then automatically deleted by the nightly cleanup job.
- **Selfie photos** from attendance records are retained for **30 days** and then cleared to save storage.

#### Email Delivery

Emails are sent through PocketBase's configured SMTP settings. The admin should ensure:

1. **SMTP is configured** in PocketBase admin panel (Settings > Mail settings).
2. **Sender address** is set (defaults to noreply@openhr.app).
3. **Test email** can be sent from the Settings page to verify the configuration.

---

---

## Category: Getting Started

---

### Tutorial 23: Understanding the Dashboard

**Slug:** `understanding-dashboard`
**Category:** Getting Started
**Display Order:** 4
**Parent:** Welcome to OpenHR — Your First Steps
**Excerpt:** A detailed tour of your role-based dashboard — what each widget shows and how to use it effectively.

---

**Content:**

Your Dashboard is the first thing you see after logging in. It's personalized based on your role and shows the most relevant information at a glance.

#### Employee Dashboard

As an Employee, your dashboard shows:

- **Quick Actions** — Buttons for Office Check-In, Factory Check-In, Finish Session, and Apply for Leave. These are shortcuts to the most common tasks.
- **Today's Status** — Whether you've clocked in today, your check-in time, and current session status.
- **Leave Balance Summary** — Your remaining Annual, Casual, and Sick leave days.
- **Recent Announcements** — The latest announcements from your organization.
- **Team Information** — Your team name, team lead, and reporting manager.
- **Upcoming Holiday** — The next public/company holiday.

#### Manager Dashboard

As a Manager, you see everything an Employee sees, plus:

- **Team Attendance Summary** — How many of your direct reports are present, late, or absent today.
- **Pending Leave Approvals** — Leave requests from your team that need your action. A count badge highlights how many are waiting.
- **Team Member Cards** — Quick view of your direct reports with their current attendance status.

#### Admin/HR Dashboard

As an Admin or HR user, you see the full organizational picture:

- **Organization-Wide Stats** — Total employees, today's attendance rate, pending leave requests, active review cycles.
- **Department Breakdown** — Attendance and leave statistics by department.
- **System Health** — Active sessions, pending items, and recent activity.
- **Quick Links** — Navigate to all management modules (Employees, Organization, Reports, etc.).
- **Recent Activity Feed** — Latest attendance check-ins, leave requests, and review submissions across the organization.

#### Tips

- Use the **quick action buttons** to save time — they take you directly to the clock-in screen or leave form.
- Check your dashboard **at the start of each workday** to see any pending approvals or important announcements.
- Managers: Keep an eye on the **pending approvals** count — responding quickly helps your team.

---

---

## Category: Getting Started

---

### Tutorial 24: Subscription and Upgrade Options

**Slug:** `subscription-upgrade-options`
**Category:** Getting Started
**Display Order:** 5
**Parent:** Welcome to OpenHR — Your First Steps
**Excerpt:** Understanding OpenHR's subscription model — Trial, Donation, Ad-Supported, and what happens when your trial expires.

---

**Content:**

OpenHR is an open-source project that offers several ways to keep using the platform after your trial period.

#### Subscription States

| Status | Description | Access Level |
|--------|-------------|--------------|
| **Trial** | Your initial evaluation period | Full access with countdown banner |
| **Active** | Activated via donation | Full access, no restrictions |
| **Ad-Supported** | Free tier with ads | Full access, non-intrusive ads shown |
| **Expired** | Trial ended, no action taken | Read-only — cannot create/edit records |
| **Suspended** | Account suspended | Complete lockout — contact support |

#### What Happens When Your Trial Expires?

When your trial expires, your account switches to **read-only mode**:

- You can still **view** all your data — attendance logs, leave history, employee records.
- You **cannot** create new records, clock in/out, apply for leave, or make any changes.
- A banner prompts you to choose an upgrade option.

You'll receive email reminders at **7 days**, **3 days**, and **1 day** before your trial expires.

#### Upgrade Options

Navigate to the **Upgrade** page (available to Admins and HR) to choose from three options:

##### Option 1: Donate (Support Open Source)

Support the project with a one-time donation and get full access:

| Tier | Amount | Duration |
|------|--------|----------|
| Starter | $5 | 3 months |
| Supporter | $10 | 6 months |
| Champion | $20 | 1 year |
| Lifetime | $50 | Lifetime access |

**How it works:**
1. Choose a donation tier.
2. Make your payment via Ko-fi, Buy Me a Coffee, or PayPal.
3. Enter your **transaction reference** and upload a **screenshot** of the payment.
4. Submit your activation request.
5. The OpenHR team verifies and activates your subscription.

##### Option 2: Extend Trial

Need more time to evaluate? Request a trial extension:

1. Select an **extension reason** (evaluating features, budget approval, setup in progress, training team, non-profit organization, educational institution, or other).
2. Choose the **extension period** — 7, 14, or 30 days.
3. Add any **additional details**.
4. Submit the request for review.

##### Option 3: Ad-Supported (Free Forever)

Get **full feature access for free** with non-intrusive ads:

- **Ads are shown** in the sidebar and dashboard areas only.
- **No ads** in critical workflows — attendance clock-in/out remains completely ad-free.
- You can **upgrade anytime** to remove ads by making a donation.

Click **"Accept Ad-Supported Mode"** to activate immediately — no approval needed.

---

---

## Category: Reports

---

### Tutorial 25: Exporting Employee Data

**Slug:** `exporting-employee-data`
**Category:** Reports
**Display Order:** 2
**Parent:** Generating Reports
**Excerpt:** How to export employee directory data as CSV or PDF with organization branding.

---

**Content:**

In addition to attendance and leave reports, OpenHR allows you to export your employee directory.

#### Exporting from Employee Directory

Navigate to **Employees** from the sidebar. You'll find export options at the top of the page.

##### CSV Export

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

The CSV file can be opened in Excel, Google Sheets, or any spreadsheet application.

##### PDF Export

Click **"Export PDF"** to generate a formatted document that includes:

- Your organization's **logo and name** at the top
- A **summary table** with total employee count, department breakdown
- **Employee listing** with all key fields
- **Generation date** for record-keeping

The PDF is ideal for printing or sharing with stakeholders who need an official employee roster.

#### Tips

- Use **search filters** before exporting to narrow down to specific departments or roles.
- PDF exports include organization branding automatically — no manual formatting needed.
- CSV exports are best for data analysis; PDF exports are best for sharing and archiving.

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
