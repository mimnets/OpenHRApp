# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. **ALL contributors (human or AI) MUST read and follow these instructions.**

---

## Build & Development Commands

```bash
npm run dev      # Start Vite dev server on port 3000
npm run build    # Production build
npm run preview  # Serve production build locally
npx cap sync android        # Sync web build to Android native project
npx cap run android         # Build and run on connected Android device
npx cap doctor              # Verify all Capacitor versions match
```

Backend: PocketBase server must be running. Deploy ALL `.pb.js` files from `Others/pb_hooks/` to PocketBase's `pb_hooks/` folder (see PocketBase Hooks section below).

---

## Architecture Overview

OpenHR is a React 19 + TypeScript HR management system using PocketBase as the backend. It runs as a **PWA on web** and as a **native Android APK via Capacitor v8**.

Key characteristics:
- **No React Router** — Uses local state routing in `App.tsx` via `currentPath` state
- **Context + Event Bus** for state management (no Redux)
- **Service layer facade** — All API calls go through `hrService` which aggregates domain services
- **Multi-tenant** — Every query includes `org_id` filtering via `apiClient.getOrganizationId()`
- **PWA-enabled** with service worker support
- **Capacitor v8** for Android native build (camera, geolocation, filesystem)

### Data Flow Pattern

```
Pages/Components → Hooks → hrService (facade) → Domain Services → apiClient → PocketBase SDK
```

### Directory Structure

```
src/
├── components/          # UI components organized by feature
│   ├── admin/           # Admin verification panel
│   ├── ads/             # Ad banner components (AdBanner, PublicAdBanner)
│   ├── announcements/   # Announcement cards + form modal
│   ├── attendance/      # Camera feed, location display, attendance actions
│   ├── blog/            # Blog navbar, footer, sidebar, rich text editor
│   ├── dashboard/       # Admin/Manager/Employee dashboards, stats, widgets
│   ├── landing/         # Landing page sections (Hero, Features, FAQ, CTA, etc.)
│   ├── leave/           # Leave flows (Employee, Manager, Admin, HR modules)
│   ├── notifications/   # Notification bell + admin form modal
│   ├── organization/    # Org config (holidays, leaves, placement, shifts, teams, workflow)
│   ├── registration/    # Registration verification page
│   ├── review/          # Performance review modules (Employee, Manager, HR, Admin)
│   ├── settings/        # Theme selector
│   ├── subscription/    # Subscription banner, guard, suspended page
│   ├── superadmin/      # Super admin panels (ads, appearance, blog, storage, etc.)
│   └── tutorials/       # Tutorial navbar + footer
├── config/              # database.ts (PocketBase URL resolution)
├── context/             # AuthContext, ThemeContext, SubscriptionContext
├── data/                # countries.ts (country list)
├── hooks/               # Data fetching hooks by feature
│   ├── announcements/   # useAnnouncements
│   ├── attendance/      # useAttendance, useCamera, useGeoLocation
│   ├── dashboard/       # useDashboard
│   ├── notifications/   # useNotifications
│   ├── organization/    # useOrganization
│   └── review/          # usePerformanceReview
├── layouts/             # MainLayout (sidebar + header + content)
├── pages/               # Full-page components (route targets)
├── services/            # Domain services (all PocketBase API interactions)
└── utils/               # attendanceUtils, imageConvert, sanitize
```

---

## Routing System

**Type:** State-based routing — NO React Router. Navigation uses `currentPath` state in `App.tsx`.

### Public Routes (No Auth Required)

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `<LandingPage />` | Landing page for unauthenticated users |
| `/privacy` | `<PrivacyPolicyPage />` | Clean URL via pushState |
| `/terms` | `<TermsOfServicePage />` | Clean URL via pushState |
| `/download` | `<DownloadPage />` | Clean URL via pushState |
| `#/blog` | `<BlogPage />` | Hash-based navigation |
| `#/blog/{slug}` | `<BlogPostPage />` | Hash-based navigation |
| `#/how-to-use` | `<TutorialsPage />` | Hash-based navigation |
| `#/how-to-use/{slug}` | `<TutorialPage />` | Hash-based navigation |
| `/?token={TOKEN}` | `<VerifyAccount />` | Email verification |

### Authenticated Routes (State-based `currentPath`)

| currentPath | Component | Roles Allowed |
|-------------|-----------|---------------|
| `dashboard` | `<Dashboard />` | ALL |
| `super-admin` | `<SuperAdmin />` | SUPER_ADMIN |
| `upgrade` | `<Upgrade />` | ADMIN, HR |
| `profile` | `<Settings />` | ALL |
| `employees` | `<EmployeeDirectory />` | ADMIN, HR, MANAGER |
| `attendance` | `<Attendance />` | ALL (renders outside MainLayout) |
| `attendance-logs` | `<AttendanceLogs viewMode="MY" />` | ALL |
| `attendance-audit` | `<AttendanceLogs viewMode="AUDIT" />` | ADMIN, HR, MANAGER |
| `leave` | `<Leave />` | ALL |
| `announcements` | `<Announcements />` | ALL |
| `admin-notifications` | `<AdminNotifications />` | ADMIN, HR |
| `performance-review` | `<PerformanceReview />` | ALL |
| `reports` | `<Reports />` | ADMIN, HR |
| `organization` | `<Organization />` | ADMIN, HR |
| `settings` | `<Settings />` | ALL |

### Sidebar Menu Items

| Menu Item | Route | Roles |
|-----------|-------|-------|
| Dashboard | `dashboard` | ADMIN, HR, MANAGER, EMPLOYEE |
| My Profile | `profile` | ALL |
| My Attendance | `attendance-logs` | ALL |
| Attendance Audit | `attendance-audit` | ADMIN, HR, MANAGER |
| Leave | `leave` | ALL |
| Announcements | `announcements` | ALL |
| Notifications | `admin-notifications` | ADMIN, HR |
| Team Directory | `employees` | ADMIN, HR, MANAGER |
| Performance | `performance-review` | ALL |
| Organization | `organization` | ADMIN, HR |
| Reports | `reports` | ADMIN, HR |
| Settings | `settings` | ADMIN, HR |

Super Admin has a separate menu: Organizations (`super-admin`) + My Profile (`profile`).

### Special Navigation Parameters

```typescript
handleNavigate('attendance', { autoStart: 'OFFICE' })   // Quick clock-in office
handleNavigate('attendance', { autoStart: 'FACTORY' })   // Quick clock-in factory
handleNavigate('attendance', { autoStart: 'FINISH' })    // Quick clock-out
handleNavigate('leave', { autoOpen: true })               // Auto-open leave form
```

---

## Role-Based Access Control

**Roles:** `SUPER_ADMIN`, `ADMIN`, `HR`, `MANAGER`, `TEAM_LEAD`, `EMPLOYEE`

- Sidebar menu items filtered by `role.roles` array in `Sidebar.tsx`
- Dashboard dispatches to role-specific components (AdminDashboard, ManagerDashboard, EmployeeDashboard)
- Services filter data by `organization_id` for multi-org isolation
- SUPER_ADMIN bypasses all subscription checks

### Role Visibility for Data

| Data | ADMIN/HR | MANAGER/TEAM_LEAD | EMPLOYEE |
|------|----------|-------------------|----------|
| Employees | All in org | Direct reports + team | Team peers only |
| Attendance | All in org | Team members | Own only |
| Leaves | All in org | Team + own | Own only |
| Reviews | All in org | Direct reports + own | Own only |

---

## Service Layer — COMPLETE REFERENCE

### Service Facade

`hrService.ts` re-exports ALL methods from domain services as a single unified interface. **Always use `hrService` from components/hooks**, never import domain services directly (except `employeeService.applyForLeave` and `apiClient`).

### All Services

| Service | File | Purpose | PocketBase Collections |
|---------|------|---------|----------------------|
| `apiClient` | `api.client.ts` | PocketBase wrapper + event bus + WebP FormData | All (via pb instance) |
| `authService` | `auth.service.ts` | Login, logout, registration, password reset, verification | `users` |
| `employeeService` | `employee.service.ts` | Employee CRUD, profile updates, avatar upload | `users` |
| `employeeService` | `employeeService.ts` | Leave application wrapper (calls hrService) | `users`, `leaves` |
| `attendanceService` | `attendance.service.ts` | Punch in/out, session auto-close, late notifications | `attendance`, `users` |
| `leaveService` | `leave.service.ts` | Leave CRUD, workflow routing, balance calculation | `leaves`, `users` |
| `organizationService` | `organization.service.ts` | Config, departments, holidays, teams, workflows, policies | `settings`, `teams`, `organizations` |
| `shiftService` | `shift.service.ts` | Shift CRUD, override management, resolution logic | `shifts` |
| `reviewService` | `review.service.ts` | Review cycles, self-assessment, manager review, HR finalize | `review_cycles`, `performance_reviews`, `attendance`, `leaves` |
| `announcementService` | `announcement.service.ts` | Announcement CRUD + bulk notification broadcast | `announcements`, `notifications` |
| `notificationService` | `notification.service.ts` | Notification CRUD, preferences, bulk create | `notifications`, `settings` |
| `superAdminService` | `superadmin.service.ts` | Org management, user management, platform stats | `organizations`, `users`, `settings`, `teams`, `attendance`, `leaves` |
| `upgradeService` | `upgrade.service.ts` | Donation, trial extension, ad-supported requests | `upgrade_requests` |
| `blogService` | `blog.service.ts` | Blog post CRUD (public + admin) | `blog_posts` |
| `tutorialService` | `tutorial.service.ts` | Tutorial CRUD (public + admin) | `tutorials` |
| `showcaseService` | `showcase.service.ts` | Showcase org management | `showcase_organizations` |
| `socialLinksService` | `sociallinks.service.ts` | Social media links management | `social_links` |
| `contactService` | `contact.service.ts` | Contact form submission | Custom endpoint |
| `verificationService` | `verification.service.ts` | Email verification, test email, manual verify | Custom endpoints |
| `emailService` | `emailService.ts` | Daily attendance summary email formatting | `reports_queue` |

### Key Business Logic

**Leave Workflow Routing** (`leave.service.ts`):
1. Employee submits leave
2. System checks department workflow config (`organizationService.getWorkflows()`)
3. If workflow `approverRole` = HR/ADMIN → status = `PENDING_HR` (skip manager)
4. If employee has no `lineManagerId` → status = `PENDING_HR`
5. Otherwise → status = `PENDING_MANAGER`
6. Manager approves → status changes to `PENDING_HR`
7. HR/Admin approves → status = `APPROVED` (final)
8. Leave balance = quota[type] - sum(approved_days[type])

**Attendance Auto-Close** (`attendance.service.ts`):
- On `getActiveAttendance()`, checks for open sessions (no check_out)
- Past-date sessions: auto-closes with `autoSessionCloseTime` + remark
- Same-day expired: auto-closes if `currentTime >= autoSessionCloseTime`
- Sends ATTENDANCE notification on auto-close

**Shift Resolution** (`shift.service.ts`):
1. Check overrides for active date range
2. Use employee's assigned shift (`shiftId`)
3. Use organization default shift
4. Return null

**Performance Review Lifecycle** (`review.service.ts`):
- `DRAFT` → `SELF_REVIEW_SUBMITTED` (employee) → `MANAGER_REVIEWED` (manager) → `COMPLETED` (HR)
- Auto-calculates attendance + leave summaries from cycle period
- Supports both JSON fields and legacy individual competency columns

**Caching** (`organization.service.ts`):
- Caches: config, departments, designations, holidays, leavePolicy, reviewConfig, leaveTypes, notificationConfig
- `prefetchMetadata()` called on login for performance
- `clearCache()` called on logout

**Image Handling**:
- All images auto-converted to WebP via `convertToWebP()` utility
- Applies to: avatars, selfies, blog covers, tutorial covers, showcase logos, upgrade screenshots
- `apiClient.toFormData()` handles data URL → WebP Blob conversion

---

## Custom Hooks — COMPLETE REFERENCE

| Hook | File | Purpose | Key Returns |
|------|------|---------|-------------|
| `useAttendance` | `hooks/attendance/useAttendance.ts` | Clock in/out, late calculation, shift resolution | `{currentTime, activeRecord, submitPunch, status, employeeShift}` |
| `useCamera` | `hooks/attendance/useCamera.ts` | Live video stream, selfie capture, torch, gallery picker | `{videoRef, stream, takeSelfie, takePhoto, selectFromGallery}` |
| `useGeoLocation` | `hooks/attendance/useGeoLocation.ts` | GPS location, reverse geocoding, geofence matching | `{location, detectLocation, watchLocation, geoFences}` |
| `useDashboard` | `hooks/dashboard/useDashboard.ts` | Role-based dashboard data aggregation | `{data: DashboardData, isLoading}` |
| `useAnnouncements` | `hooks/announcements/useAnnouncements.ts` | Fetch + filter announcements by role/expiry | `{announcements, visibleAnnouncements, refresh}` |
| `useNotifications` | `hooks/notifications/useNotifications.ts` | Notifications + user preferences + muted filtering | `{notifications, unreadCount, markAsRead, updatePreferences}` |
| `useOrganization` | `hooks/organization/useOrganization.ts` | All org config CRUD (departments, teams, shifts, etc.) | `{departments, teams, config, workflows, leavePolicy, ...setters}` |
| `usePerformanceReview` | `hooks/review/usePerformanceReview.ts` | Review cycles, auto-transitions, role-filtered reviews | `{data: PerformanceReviewData, refreshData}` |

---

## React Contexts

| Context | File | Purpose |
|---------|------|---------|
| `AuthContext` | `context/AuthContext.tsx` | User session state, login/logout, PocketBase auth store sync |
| `SubscriptionContext` | `context/SubscriptionContext.tsx` | Subscription status, `canPerformAction()`, periodic refresh (2min) |
| `ThemeContext` | `context/ThemeContext.tsx` | 13+ themes, dark mode (light/dark/system), CSS variable injection, realtime sync |

---

## Utilities

| Utility | File | Purpose |
|---------|------|---------|
| `consolidateAttendance` | `utils/attendanceUtils.ts` | Merge multiple daily punches into single record per employee/day |
| `calculatePunctuality` | `utils/attendanceUtils.ts` | Determine PRESENT/LATE based on shift + grace period |
| `calculateDuration` | `utils/attendanceUtils.ts` | Calculate work hours between check-in and check-out |
| `convertToWebP` | `utils/imageConvert.ts` | Convert any image (data URL or Blob) to WebP format |
| `convertFileToWebP` | `utils/imageConvert.ts` | Convert File to WebP with renamed extension |
| `sanitizeHtml` | `utils/sanitize.ts` | DOMPurify-based HTML sanitization (XSS prevention) |

---

## Constants & Defaults (`src/constants.tsx`)

| Constant | Value |
|----------|-------|
| `DEPARTMENTS` | Engineering, HR, Finance, Operations, Marketing, Sales, Product, Factory |
| `DESIGNATIONS` | Senior/Junior Developer, HR Manager, Operations Lead, etc. (9 values) |
| `OFFICE_LOCATIONS` | Dhaka HQ, Chittagong, Sylhet, Factory Zone, Remote Office (with lat/lng/radius) |
| `BD_HOLIDAYS` | 9 Bangladesh holidays (national + festival + Islamic) |
| `DEFAULT_COMPETENCIES` | Agility, Collaboration, Customer Focus, Developing Others, Global Mindset, Innovation Mindset |
| `DEFAULT_RATING_SCALE` | 1-5 (Needs Improvement → Outstanding) |
| `DEFAULT_LEAVE_TYPES` | ANNUAL, CASUAL, SICK (with balance), MATERNITY, PATERNITY, EARNED, UNPAID (no balance) |
| `DEFAULT_CONFIG` | Timezone: Asia/Dhaka, Currency: BDT, Working Days: Mon-Thu+Sun, Office: 09:00-18:00 |
| `DEFAULT_NOTIFICATION_CONFIG` | All types enabled, IMMEDIATE digest, quiet hours disabled |

---

## PocketBase Collections — COMPLETE REFERENCE

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | Employee/user accounts | email, name, role, department, designation, organization_id, line_manager_id, team_id, shift_id, avatar, verified |
| `organizations` | Multi-tenant orgs | name, country, address, logo, subscription_status, trial_end_date, ad_consent |
| `attendance` | Daily attendance records | employee_id, employee_name, date, check_in, check_out, status, location, selfie, duty_type, remarks, organization_id |
| `leaves` | Leave requests | employee_id, employee_name, line_manager_id, type, start_date, end_date, total_days, reason, status, manager_remarks, approver_remarks, organization_id |
| `shifts` | Work shift definitions | name, start_time, end_time, late_grace_period, earliest_check_in, auto_session_close_time, working_days, is_default, organization_id |
| `teams` | Team records | name, leader_id, department, organization_id |
| `settings` | Key-value org settings | key, value (JSON), organization_id |
| `announcements` | Organization announcements | title, content, author_id, author_name, priority, target_roles, expires_at, organization_id |
| `notifications` | User notifications | user_id, type, title, message, is_read, priority, reference_id, reference_type, action_url, organization_id |
| `review_cycles` | Performance review cycles | name, cycle_type, start_date, end_date, review_start_date, review_end_date, active_competencies, is_active, status, organization_id |
| `performance_reviews` | Individual reviews | employee_id, cycle_id, line_manager_id, status, self_ratings, manager_ratings, attendance_summary, leave_summary, hr_final_remarks, hr_overall_rating, organization_id |
| `blog_posts` | Blog articles | title, slug, content, excerpt, cover_image, author_name, status, published_at |
| `tutorials` | Tutorial content | title, slug, content, excerpt, cover_image, category, parent_id, display_order, status, published_at |
| `showcase_organizations` | Featured orgs | name, logo, website_url, description, is_active, display_order |
| `social_links` | Social media links | platform, url, is_active, display_order |
| `upgrade_requests` | Upgrade/donation requests | organization_id, request_type, status, donation_tier, donation_amount, donation_reference, extension_days |
| `reports_queue` | Email queue | recipient_email, subject, html_content, status, sent_at, error_message |

### Settings Collection Keys

| Key | Value Type | Purpose |
|-----|-----------|---------|
| `app_config` | JSON (AppConfig) | Company name, timezone, currency, working days, office hours, grace periods |
| `departments` | JSON (string[]) | Department list |
| `designations` | JSON (string[]) | Designation list |
| `holidays` | JSON (Holiday[]) | Holiday calendar |
| `leave_policy` | JSON ({defaults, overrides}) | Leave quota per type + per-employee overrides |
| `leave_workflows` | JSON (LeaveWorkflow[]) | Department → approver role mapping |
| `leave_types` | JSON (CustomLeaveType[]) | Custom leave type definitions |
| `review_config` | JSON (OrgReviewConfig) | Competencies, rating scales |
| `notification_config` | JSON | Enabled notification types, digest settings |
| `notification_prefs_{userId}` | JSON | Per-user notification preferences |
| `ad_config_{slot}` | JSON | Ad slot configuration |
| `platform_theme` | JSON | Platform default theme (Super Admin) |

---

## Subscription System

Statuses: `TRIAL`, `ACTIVE`, `EXPIRED`, `SUSPENDED`, `AD_SUPPORTED`

| Status | Access | UI |
|--------|--------|-----|
| TRIAL | Full access | Countdown banner |
| ACTIVE | Full access | No restrictions |
| EXPIRED | Read-only | Upgrade prompt, write actions blocked |
| SUSPENDED | Complete lockout | SuspendedPage, cannot login |
| AD_SUPPORTED | Full access | Ad banners shown |

Key files:
- `src/context/SubscriptionContext.tsx` — State, `canPerformAction()`, 2-min refresh
- `src/components/subscription/` — SubscriptionGuard, SubscriptionBanner, SuspendedPage
- `Others/pb_hooks/cron.pb.js` — Auto-expiration + trial reminders (7d, 3d, 1d)
- `Others/pb_hooks/main.pb.js` — `/api/openhr/subscription-status` endpoint

---

## PocketBase Hooks — MUST FOLLOW

### Deployment
ALL files in `Others/pb_hooks/` (except files prefixed with `bk` or `bk_`) must be deployed to the PocketBase server's `pb_hooks/` directory. Missing any file will silently disable that feature.

**Required files on server:**

| File | Purpose | Hooks/Endpoints |
|------|---------|-----------------|
| `main.pb.js` | Core system | Registration, auth, subscription, blog, tutorials, contact, ads, WebP validation, email queue |
| `leave_notifications.pb.js` | Leave emails + bells | onRecordAfterCreate/UpdateSuccess for `leaves` |
| `attendance_notifications.pb.js` | Attendance emails + bells | Late check-in alerts, checkout reminders, holiday alerts, auto-absent notifications |
| `review_notifications.pb.js` | Review emails + bells | Cycle open/close, self-assessment reminders, status change notifications |
| `cron.pb.js` | Scheduled jobs | Trial expiration, auto-absent, daily attendance report, selfie cleanup, notification cleanup |
| `setup_collections.pb.js` | DB setup | Creates/updates upgrade_requests + organizations fields |

### Custom API Endpoints (main.pb.js)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/openhr/register` | Public | Organization registration |
| GET | `/api/openhr/subscription-status` | Auth | Check subscription status |
| POST | `/api/openhr/test-email` | Public | Test email configuration |
| POST | `/api/openhr/admin-verify-user` | ADMIN | Manually verify employee |
| GET | `/api/openhr/unverified-users` | ADMIN | List unverified users |
| POST | `/api/openhr/accept-ads` | Auth | Accept ad-supported mode |
| POST | `/api/openhr/process-upgrade-request` | SUPER_ADMIN | Process upgrade request |
| GET | `/api/openhr/ad-config/{slot}` | Auth | Get ad config for slot |
| GET | `/api/openhr/public-ad-config/{slot}` | Public | Get public ad config (whitelisted slots) |
| POST | `/api/openhr/contact` | Public | Contact form submission |
| GET | `/api/openhr/blog/posts` | Public | List published blog posts |
| GET | `/api/openhr/blog/posts/{slug}` | Public | Get blog post by slug |
| GET | `/api/openhr/tutorials/posts` | Public | List published tutorials |
| GET | `/api/openhr/tutorials/posts/{slug}` | Public | Get tutorial by slug |
| GET | `/api/openhr/notification-stats` | SUPER_ADMIN | Platform notification counts |
| POST | `/api/openhr/purge-all-notifications` | SUPER_ADMIN | Delete all notifications |

### Cron Jobs (cron.pb.js)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `auto_expire_trials` | Daily midnight | Expire trials + send reminders (7d, 3d, 1d) |
| `auto_absent_check` | Every minute | Mark absent employees at `autoAbsentTime` |
| `daily_attendance_report` | Daily 11 PM | Email + bell attendance summary to admins |
| `selfie_cleanup` | Daily 2 AM | Clear old selfie files (30-day retention) |
| `notification_cleanup` | Daily 3 AM | Delete old notifications (30-day retention) |

### Cron Jobs (attendance_notifications.pb.js)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `attendance_reminders` | Every 5 min | Checkout reminders, holiday alerts |

### Cron Jobs (review_notifications.pb.js)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `review_cycle_transition` | Daily midnight | Auto-open/close cycles, deadline reminders |

### Email + Notification Matrix

**Leave Events:**

| Event | Employee | Manager | Admin/HR |
|-------|----------|---------|----------|
| Created (pending) | Email + Bell: "Submitted" | Email + Bell: "Action Required" | Email + Bell: "New Request" |
| Created (direct APPROVED) | Email + Bell: "Approved" | Email + Bell: "FYI Approved" | Email + Bell: "Approved" |
| Manager Approved → PENDING_HR | Email + Bell: "Manager Approved" | — | Email + Bell: "HR Review Required" |
| Final APPROVED | Email + Bell: "Fully Approved" | Email + Bell: "Final Approved" | Email + Bell: "Fully Approved" |
| REJECTED | Email + Bell: "Rejected" | Email + Bell: "Rejected" | Email + Bell: "Rejected" |

**Attendance Events:**

| Event | Employee | Manager | Admin/HR |
|-------|----------|---------|----------|
| Late check-in | — | Email + Bell: "Late Alert" | Bell: "Late Alert" |
| Auto-absent | Email + Bell: "Marked Absent" | Bell: "Employee Absent" | — |
| Checkout reminder | Email + Bell: "Checkout Reminder" | — | — |
| Daily report | — | — | Email + Bell: "Daily Summary" |

**Review Events:**

| Event | Employee | Manager | Admin/HR |
|-------|----------|---------|----------|
| Cycle opened | Bell: "Review Cycle Open" | Email + Bell: "Action Required" | Email + Bell: "Cycle Open" |
| Cycle closed | Email + Bell (if DRAFT) | — | Email + Bell: "Cycle Closed" |
| Self-assessment submitted | — | Email + Bell: "Review Submitted" | Email + Bell: "FYI" |
| Manager reviewed | Email + Bell: "Review Complete" | — | Email + Bell: "Action Required" |
| HR finalized | Email + Bell: "Review Completed" | Email + Bell: "Finalized" | — |
| Deadline reminders (3d, 1d) | Email + Bell (if DRAFT) | Email + Bell (if pending) | Bell: "Deadline" |

### Hook Coding Standards — MUST FOLLOW

1. **Always wrap hook registrations in try-catch** — prevents one failed hook from crashing the entire file:
   ```js
   try {
       onRecordAfterCreateSuccess((e) => { ... }, "collection_name");
   } catch(e) {
       console.log("[HOOKS] Could not register hook: " + e.toString());
   }
   ```
2. **Each `.pb.js` file runs in its own isolated JS scope** — you CANNOT call functions defined in other `.pb.js` files. Always inline shared logic.
3. **Use `getString()` to read record fields** — never use `.email()` or direct property access on PocketBase records.
4. **Always add console.log at file load** — e.g., `console.log("[HOOKS] Loading Feature X...")` at the top and `console.log("[HOOKS] Feature X loaded successfully.")` at the bottom.
5. **Update hooks must check if the relevant field actually changed** before sending notifications:
   ```js
   var oldStatus = e.record.original().getString("status");
   if (oldStatus === newStatus) return;
   ```
6. **Sender config must be inlined** in every file (not shared):
   ```js
   const meta = $app.settings().meta || {};
   const sender = { address: meta.senderAddress || "noreply@openhr.app", name: meta.senderName || "OpenHR System" };
   ```
7. **Never delete or remove notification hooks** without explicit approval — they are critical for user communication.
8. **Never remove email notification logic** — each status transition must send appropriate emails to all relevant parties.
9. **Always include `line_manager_id`** when creating leave records — required for manager notifications.
10. **`createNotification()` helper must be inlined** in each hook file that needs it (with the same field structure).

---

## Types (`src/types.ts`) — COMPLETE REFERENCE

### Core Enums
- `Role`: SUPER_ADMIN | ADMIN | MANAGER | HR | EMPLOYEE | TEAM_LEAD | MANAGEMENT
- `WorkType`: OFFICE | FIELD
- `SubscriptionStatus`: ACTIVE | TRIAL | EXPIRED | SUSPENDED | AD_SUPPORTED
- `UpgradeRequestType`: DONATION | TRIAL_EXTENSION | AD_SUPPORTED
- `DonationTier`: TIER_3MO | TIER_6MO | TIER_1YR | TIER_LIFETIME

### Entity Interfaces
- `User` — id, email, role, name, department, designation, avatar, teamId, shiftId, organizationId
- `Employee` extends User — joiningDate, mobile, emergencyContact, salary, status, employmentType, location, nid, lineManagerId, workType
- `Organization` — id, name, address, logo, country, subscriptionStatus, trialEndDate
- `SubscriptionInfo` — status, trialEndDate, daysRemaining, isSuperAdmin, isReadOnly, isBlocked, showAds
- `Team` — id, name, leaderId, department, organizationId
- `Attendance` — id, employeeId, employeeName, date, checkIn, checkOut, status, location, remarks, selfie, dutyType, organizationId
- `LeaveRequest` — id, employeeId, employeeName, lineManagerId, type, startDate, endDate, totalDays, reason, status, appliedDate, approverRemarks, managerRemarks, organizationId
- `LeaveBalance` — employeeId + dynamic key-value pairs per leave type
- `Shift` — id, name, startTime, endTime, lateGracePeriod, earlyOutGracePeriod, earliestCheckIn, autoSessionCloseTime, workingDays[], isDefault
- `PerformanceReview` — id, employeeId, cycleId, lineManagerId, status, selfRatings[], managerRatings[], attendanceSummary, leaveSummary, hrFinalRemarks, hrOverallRating
- `Announcement` — id, title, content, authorId, priority, targetRoles[], expiresAt
- `AppNotification` — id, userId, type, title, message, isRead, priority, referenceId, referenceType, actionUrl
- `AppConfig` — companyName, timezone, currency, dateFormat, workingDays, officeStartTime, officeEndTime, lateGracePeriod, earlyOutGracePeriod, autoSessionCloseTime
- `LeavePolicy` — defaults: Record<string, number>, overrides: Record<employeeId, Record<string, number>>
- `LeaveWorkflow` — department, approverRole
- `Holiday` — id, date, name, isGovernment, type
- `CustomLeaveType` — id, name, hasBalance, description

---

## Capacitor (Android) Rules — MUST FOLLOW

### Stack
- Capacitor v8
- `@capacitor/camera` — employee photo (hybrid: live stream + Capacitor fallback)
- `@capacitor/geolocation` — attendance location tracking (native on Android, browser on web)
- `@capacitor/filesystem` — file downloads/exports

### Rules
- All Capacitor package versions MUST match exactly (`npx cap doctor`)
- NEVER use `navigator.geolocation` or `navigator.mediaDevices` directly — always use Capacitor plugins on native
- NEVER commit `android/` build artifacts
- ALL native feature components MUST have an `<ErrorBoundary>` wrapper
- Always request permissions at runtime (never assume granted)
- Always separate web vs native logic with `Capacitor.isNativePlatform()`
- Run `npx cap sync android` after every plugin install or web build change

### Custom Hooks — always use these, never call plugins directly
- `src/hooks/attendance/useCamera.ts` — live stream + Capacitor fallback, WebP output
- `src/hooks/attendance/useGeoLocation.ts` — Capacitor native + browser fallback + OpenStreetMap geocoding

### Android Build Config
- minSdkVersion: 24, targetSdkVersion: 36
- `usesCleartextTraffic="true"` — debug builds only

---

## PWA Requirements

- `manifest.json`: name, short_name, icons (192px + 512px), theme_color, background_color, display: standalone
- Service worker via `vite-plugin-pwa` + Workbox
- Lighthouse PWA score must be > 90

---

## Code Standards — MUST FOLLOW

- One responsibility per component
- All native feature components must have `<ErrorBoundary>` wrapper
- Use custom hooks for camera and location — never call plugins directly
- All user-facing errors must show readable messages, never raw JS errors
- All images must be auto-converted to WebP before upload
- Never delete or modify existing notification/email logic without explicit approval
- Always include `organization_id` in new records for multi-tenant isolation
- snake_case for PocketBase fields, camelCase for TypeScript properties
- Services handle the conversion between the two naming conventions

---

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Port 3000, path alias `@/` → `./src/`, PWA plugin |
| `capacitor.config.ts` | appId, appName, webDir |
| `src/config/database.ts` | PocketBase URL from env or hardcoded fallback |
| `src/constants.tsx` | All default config values, departments, locations, holidays, competencies |
| `vercel.json` | Vercel deployment config |
| `tsconfig.json` | TypeScript configuration |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/App.tsx` | State-based routing, auth check, subscription guard |
| `src/layouts/MainLayout.tsx` | Sidebar + header + content + mobile nav |
| `src/components/Sidebar.tsx` | Role-filtered sidebar menu |
| `src/types.ts` | All TypeScript entity interfaces |
| `src/constants.tsx` | All default configuration values |
| `src/config/database.ts` | PocketBase URL resolution |
| `src/context/AuthContext.tsx` | Authentication state management |
| `src/context/SubscriptionContext.tsx` | Subscription state + access control |
| `src/context/ThemeContext.tsx` | Theme management (13+ themes, dark mode) |
| `src/services/hrService.ts` | Unified service facade |
| `src/services/api.client.ts` | PocketBase client + event bus |
| `src/hooks/attendance/useCamera.ts` | Camera hook (hybrid approach) |
| `src/hooks/attendance/useGeoLocation.ts` | Location hook (native + browser) |
| `src/components/ErrorBoundary.tsx` | Error boundary for native features |
| `Others/pb_hooks/main.pb.js` | Core PocketBase hooks + 16 API endpoints |
| `Others/pb_hooks/leave_notifications.pb.js` | Leave email + bell notifications |
| `Others/pb_hooks/attendance_notifications.pb.js` | Attendance notifications + cron reminders |
| `Others/pb_hooks/review_notifications.pb.js` | Performance review notifications + cycle transitions |
| `Others/pb_hooks/cron.pb.js` | 5 scheduled cron jobs |
| `Others/pb_hooks/setup_collections.pb.js` | Collection schema setup |

---

## Git Workflow — MUST FOLLOW

After completing any code changes:
1. Stage the changed files: `git add <specific files>` (never use `git add .` or `git add -A`)
2. Commit with a descriptive message: `git commit -m "description of changes"`
3. Push to the current branch: `git push origin <current-branch>`

Always push immediately after committing. Never leave unpushed commits.

---

## Pre-Commit Checklist

- [ ] `npx cap doctor` — no version mismatches
- [ ] `npx cap sync android` — native project in sync with web build
- [ ] Permissions tested on real Android device (not just emulator)
- [ ] Camera and location show proper denied/granted UI messages
- [ ] Lighthouse PWA score > 90
- [ ] No hardcoded credentials, API keys, or PocketBase URLs
- [ ] All `@capacitor/*` packages on the same version
- [ ] `android/` build artifacts not staged in git
- [ ] All notification hooks intact (leave, attendance, review)
- [ ] All `.pb.js` files deployed to server's `pb_hooks/` directory

---

## Debugging

```bash
# Live crash log from connected Android device
adb logcat | grep -i "openhr\|capacitor\|error"

# Live reload dev build on device
npx cap run android --livereload

# Check PocketBase hook loading
# Look for: [HOOKS] Loading ... and [HOOKS] ... loaded successfully
# in PocketBase server logs
```
