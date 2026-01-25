# OpenHR App - Comprehensive HR Management System

OpenHR is a lightweight, open-source Human Resource Management System (HRMS) designed specifically for mid-size organizations (100–500 employees). It provides a high-security, privacy-first approach to attendance tracking, leave management, and organizational structure.

## 🚀 Core Functionalities

### 1. Attendance Audit (Biometric & GPS)
*   **Selfie-Verified Punches**: Every "Clock In/Out" requires a real-time selfie to prevent buddy-punching.
*   **GPS Geofencing**: Validates that the employee is at a designated office or factory location.
*   **Dual Duty Types**: Supports standard **Office** shifts and **Factory/Field** duties with mandatory location remarks.
*   **Auto-Cleanup**: System automatically closes "forgotten" sessions at the end of the workday based on company policy.

### 2. Intelligent Leave Workflows
*   **Multi-Tier Approvals**: Requests flow from Employee → Line Manager → HR for final documentation.
*   **Real-time Balances**: Automated tracking of Annual, Sick, and Casual leave quotas.
*   **Email Notifications**: Automated status updates sent via PocketBase JS Hooks.

### 3. Scoped Management
*   **Manager Oversight**: Managers can only see and audit the attendance/leaves of their *assigned team members* or *direct reports*.
*   **HR/Admin Control**: Full organizational visibility, payroll reporting, and system configuration.

### 4. Organization Setup
*   **Dynamic Structure**: Manage Departments, Designations, and Management Teams.
*   **Holiday Calendar**: Centralized calendar for national and festival holidays.

---

## 🛠 Technology Stack

*   **Frontend**: React 19 (Modern Hooks & Functional Components)
*   **Styling**: Tailwind CSS (Mobile-first, Responsive Design)
*   **Icons**: Lucide React
*   **Backend**: PocketBase (Go-based, Single-file Database & Auth)
*   **PWA**: Service Worker support for "Install to Home Screen" capability on iOS and Android.

---

## 📦 PocketBase Configuration (Backend Setup)

To run OpenHR, you must configure your PocketBase instance with the following collections and rules.

### 1. `users` (System Collection)
Add these custom fields to the default system collection:

| Field | Type | Description |
|-------|------|-------------|
| `role` | Select | `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` |
| `department` | Text | Employee's department |
| `designation` | Text | Professional title |
| `employee_id` | Text | Unique company ID (e.g. EMP-001) |
| `line_manager_id` | Relation | Target: `users` (Single) |
| `team_id` | Text | ID of the assigned team |
| `avatar` | File | Profile picture |

**API Rules:**
*   **List/View:** `@request.auth.id != ""` (Logged in users)
*   **Update:** `id = @request.auth.id || @request.auth.role = "ADMIN" || @request.auth.role = "HR"`

### 2. `attendance`
| Field | Type | Description |
|-------|------|-------------|
| `employee_id` | Relation | Target: `users` |
| `employee_name` | Text | Display name |
| `date` | Text | YYYY-MM-DD |
| `check_in` | Text | HH:mm |
| `check_out` | Text | HH:mm |
| `status` | Text | PRESENT, LATE, ABSENT, etc. |
| `location` | Text | Address string |
| `latitude` | Number | GPS Latitude |
| `longitude` | Number | GPS Longitude |
| `selfie` | File | Verified Image |
| `duty_type` | Text | OFFICE, FACTORY |

**API Rules:**
*   **List/View:** `@request.auth.id = employee_id || @request.auth.role != "EMPLOYEE"`
*   **Create:** `@request.auth.id != ""`

### 3. `leaves`
| Field | Type | Description |
|-------|------|-------------|
| `employee_id` | Relation | Target: `users` |
| `line_manager_id` | Relation | Target: `users` |
| `type` | Text | ANNUAL, SICK, CASUAL |
| `status` | Text | PENDING_MANAGER, PENDING_HR, APPROVED |
| `total_days` | Number | Duration |

**API Rules:**
*   **List/View:** `@request.auth.id = employee_id || @request.auth.role != "EMPLOYEE"`
*   **Update:** `@request.auth.id != ""`

### 4. `teams`
| Field | Type | Description |
|-------|------|-------------|
| `name` | Text | Team Name |
| `leader_id` | Relation | Target: `users` |
| `department` | Text | Associated Dept |

**API Rules:**
*   **List/View:** `@request.auth.id != ""`
*   **Create/Update:** `@request.auth.role = "ADMIN" || @request.auth.role = "HR"`

### 5. `settings`
| Field | Type | Description |
|-------|------|-------------|
| `key` | Text | Config key (unique) |
| `value` | JSON | Config values |

**API Rules:**
*   **List/View:** `@request.auth.id != ""`
*   **Write:** `@request.auth.role = "ADMIN"`

### 6. `reports_queue` (Email Automation)
*   **Status Field**: Set default to `PENDING`.
*   **Rules**: Locked (No Public/User access).

---

## ⚙️ Setup & Connection

1.  **Download PocketBase**: Get the latest binary from [pocketbase.io](https://pocketbase.io).
2.  **Start Server**: Run `./pocketbase serve`.
3.  **Deploy Hooks**: Place `main.pb.js` into the `pb_hooks/` folder to enable email notifications.
4.  **Configure App**:
    *   Open the OpenHR App.
    *   Navigate to the **Setup** screen (usually auto-redirects on first boot).
    *   Enter your PocketBase URL (e.g., `https://your-pb-instance.com`).
5.  **Provision Admin**:
    *   Manually create the first user in the PocketBase Admin UI.
    *   Set their `role` to `ADMIN`.
    *   Log in to the app to start building your organization.

## 🌟 Benefits for Small Organizations
*   **Zero Infrastructure**: PocketBase is a single file; no complex SQL clusters needed.
*   **Compliance Ready**: Pre-configured for local labor laws regarding late grace periods and holiday tracking.
*   **Mobile Workforce**: Native-feeling PWA allows factory workers to punch in from their own devices securely.
*   **Audit-Ready**: Maintains a permanent trail of GPS and selfie data for every attendance record.

---
*Developed for OpenHR Solutions.*