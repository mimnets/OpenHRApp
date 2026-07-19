# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. **ALL contributors (human or AI) MUST read and follow these instructions.**

---

## Build & Development Commands

```bash
npm run dev      # Start Vite dev server on port 3000
npm run build    # Production build
npm run preview  # Serve production build locally
```

Backend: Supabase project must be running. Edge Functions are deployed via `supabase functions deploy`. Database schema is managed through migrations in `supabase/migrations/`.

---

## Architecture Overview

OpenHR is a React 19 + TypeScript HR management system using Supabase as the backend. It runs as a **PWA on web** (installable on desktop, iOS, and Android via the browser).

Key characteristics:
- **No React Router** — Uses local state routing in `App.tsx` via `currentPath` state
- **Context + Event Bus** for state management (no Redux)
- **Service layer facade** — All API calls go through `hrService` which aggregates domain services
- **Multi-tenant** — Every query includes `org_id` filtering via `apiClient.getOrganizationId()`
- **PWA-enabled** with service worker support, install-to-homescreen on iOS/Android, and offline caching

### Data Flow Pattern

```
Pages/Components → Hooks → hrService (facade) → Domain Services → apiClient → Supabase SDK (via `src/services/supabase.ts`)
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
├── config/              # database.ts (Supabase URL resolution)
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
├── services/            # Domain services (all Supabase API interactions)
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

| Service | File | Purpose |
|---------|------|---------|
| `apiClient` | `api.client.ts` | Supabase wrapper + event bus + WebP FormData |
| `authService` | `auth.service.ts` | Login, logout, registration, password reset, verification |
| `employeeService` | `employee.service.ts` | Employee CRUD, profile updates, avatar upload |
| `employeeService` | `employeeService.ts` | Leave application wrapper (calls hrService) |
| `attendanceService` | `attendance.service.ts` | Punch in/out, session auto-close, late notifications |
| `leaveService` | `leave.service.ts` | Leave CRUD, workflow routing, balance calculation |
| `organizationService` | `organization.service.ts` | Config, departments, holidays, teams, workflows, policies |
| `shiftService` | `shift.service.ts` | Shift CRUD, override management, resolution logic |
| `reviewService` | `review.service.ts` | Review cycles, self-assessment, manager review, HR finalize |
| `announcementService` | `announcement.service.ts` | Announcement CRUD + bulk notification broadcast |
| `notificationService` | `notification.service.ts` | Notification CRUD, preferences, bulk create |
| `superAdminService` | `superadmin.service.ts` | Org management, user management, platform stats |
| `upgradeService` | `upgrade.service.ts` | Donation, trial extension, ad-supported requests |
| `blogService` | `blog.service.ts` | Blog post CRUD (public + admin) |
| `tutorialService` | `tutorial.service.ts` | Tutorial CRUD (public + admin) |
| `showcaseService` | `showcase.service.ts` | Showcase org management |
| `socialLinksService` | `sociallinks.service.ts` | Social media links management |
| `contactService` | `contact.service.ts` | Contact form submission |
| `verificationService` | `verification.service.ts` | Email verification, test email, manual verify |
| `emailService` | `emailService.ts` | Daily attendance summary email formatting |

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
- `supabase/functions/cron-expire-trials/` — Auto-expiration + trial reminders (7d, 3d, 1d)
- `supabase/functions/` — `/api/openhr/subscription-status` endpoint

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

## Camera & Geolocation — Web APIs

The app is PWA-only. All native-feature hooks use standard browser APIs:

- `src/hooks/attendance/useCamera.ts` — `navigator.mediaDevices.getUserMedia()` for live stream; `<input type="file" accept="image/*" capture="user">` fallback for iOS PWA / blocked stream. WebP output via `convertToWebP()`.
- `src/hooks/attendance/useGeoLocation.ts` — `navigator.geolocation.getCurrentPosition()` / `watchPosition()` with high-accuracy → network fallback, plus OpenStreetMap Nominatim reverse geocoding.

Rules:
- ALL native-feature components MUST have an `<ErrorBoundary>` wrapper
- Always handle permission-denied / no-geolocation errors with readable messages
- Test camera + location on real iOS Safari and Android Chrome before shipping (PWA standalone mode is stricter than the browser tab)

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
- snake_case for database fields, camelCase for TypeScript properties
- Services handle the conversion between the two naming conventions

---

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Port 3000, path alias `@/` → `./src/`, PWA plugin |
| `src/config/database.ts` | Supabase URL from env or hardcoded fallback |
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
| `src/config/database.ts` | Supabase URL resolution |
| `src/context/AuthContext.tsx` | Authentication state management |
| `src/context/SubscriptionContext.tsx` | Subscription state + access control |
| `src/context/ThemeContext.tsx` | Theme management (13+ themes, dark mode) |
| `src/services/hrService.ts` | Unified service facade |
| `src/services/api.client.ts` | Supabase client + event bus |
| `src/hooks/attendance/useCamera.ts` | Camera hook (live stream + file-input fallback) |
| `src/hooks/attendance/useGeoLocation.ts` | Location hook (browser geolocation + OSM geocoding) |
| `src/components/ErrorBoundary.tsx` | Error boundary for native features |
| `src/services/supabase.ts` | Supabase client SDK + auth + storage helpers |
| `supabase/functions/` | Edge Functions (auth, cron jobs, notifications, admin operations) |
| `supabase/migrations/` | Database schema migrations |

---

## Git Workflow — MUST FOLLOW

After completing any code changes:
1. Stage the changed files: `git add <specific files>` (never use `git add .` or `git add -A`)
2. Commit with a descriptive message: `git commit -m "description of changes"`
3. Push to the current branch: `git push origin <current-branch>`

Always push immediately after committing. Never leave unpushed commits.

---

## Pre-Commit Checklist

- [ ] Camera and location tested on real iOS Safari + Android Chrome (and PWA standalone) — not just desktop
- [ ] Permission-denied UI shows readable messages
- [ ] Lighthouse PWA score > 90
- [ ] No hardcoded credentials, API keys, or Supabase URLs
- [ ] All notification hooks intact (leave, attendance, review)
- [ ] Edge Functions deployed via `supabase functions deploy`

---

## Debugging

```bash
# Test camera/location on a phone against the dev server:
#   1. Start dev: npm run dev (Vite serves on port 3000)
#   2. Expose via HTTPS tunnel (ngrok / cloudflared / Vite + cert)
#   3. Open the tunnel URL on the phone — getUserMedia / geolocation
#      require HTTPS (or localhost) to work.

# Check Supabase Edge Function logs
# Use: supabase functions logs --project-ref <ref>
```

---

## Frozen Modules — Change-Control MUST FOLLOW

Two features — login-session stability and the attendance check-in/out
lifecycle — have regressed **three times** during unrelated refactors.
The logic that owns those features is now isolated into dedicated, single-
responsibility modules. Every edit to any file in this list is a FROZEN
change and requires ALL of the following, no exceptions:

1. **Enter plan mode first** (`EnterPlanMode`). No direct edits.
2. **Get explicit user approval** of the plan before executing.
3. State in the plan which frozen file is being touched and why.
4. Add or update a regression check — unit test when the test framework
   lands, or a documented manual verification in the commit message
   until then.
5. Update `src/data/changelog.ts` with a `fix` or `change` entry.
6. Never bypass hooks or skip validation on the commit
   (`--no-verify` is forbidden).

### Frozen files

- `src/services/session/sessionManager.ts`
- `src/services/session/sessionManager.types.ts`
- `src/services/workday/workdaySessionManager.ts`
- `src/services/workday/workdaySessionManager.types.ts`
- `src/context/AuthContext.tsx` — delegation layer only, do not move
  session logic back into it

### Invariants (a violation is a bug)

- **Only `sessionManager.ts` may call `supabase.auth.signOut()`**. The one
  tolerated exception is `auth.service.ts`: the post-login unverified-account
  clear (which runs before the user is considered logged in). Every other
  call site is a regression and must route through
  `sessionManager.forceLogout(reason)`.
- **A transient network error MUST NOT log users out**. The retry +
  classification logic in `sessionManager.ts` is load-bearing; do not
  replace it with a single-shot refresh.
- **Only `workdaySessionManager.ts` may mutate `check_out` from the
  client as a "system auto-close"**. User-initiated check-outs go through
  `attendanceService.updateAttendance` (unchanged). The remark appended
  for client fallback closures is
  `" [System: Auto-closed — no check-out recorded]"` — keep it
  distinguishable from the server cron remark
  (`" [System: Auto-Closed Past Date]"` / `" [System: Max Time Reached]"`).
- **`getActiveAttendance` MUST delegate to
  `workdaySessionManager.reconcileOpenSessions`** — do not add a parallel
  implementation that reads attendance and decides closure rules.
- **The `cron-auto-close-sessions` Edge Function MUST be deployed** and
  the pg_cron schedule that invokes it MUST remain active. This is the
  server-side counterpart to the client-side fallback in
  `workdaySessionManager.ts`.
- **`workdaySessionManager` MUST NOT close today's session**. Same-day
  max-time closure is owned by the server cron; a client-side same-day
  close would race the cron and double-close.

### Deployment checklist for session/attendance changes

Before shipping any change touching frozen files:

- [ ] Manually verified: login does NOT log out on flaky network — set
      DevTools → Network → Offline for ~60 s, return to Online, session
      must survive; a "Reconnecting…" UI banner is acceptable but a
      redirect to login is a regression.
- [ ] Manually verified: hard 401 DOES log the user out (invalidate the
      token server-side or force a password change mid-session).
- [ ] Manually verified: create an attendance record dated yesterday with
      empty `check_out` for a test employee. Log in as that employee. The
      record must be updated with `check_out` populated and remarks
      appended; a one-time toast must appear. The UI must NOT show an
      "active session" card for yesterday.
- [ ] Confirmed `cron-auto-close-sessions` Edge Function is deployed and
      the function log shows successful runs on the expected cadence.
- [ ] Commit message documents which frozen file was touched and the
      manual verification performed.

### Past incidents to learn from

- **Incident 1 & 2** (see `src/data/changelog.ts` 2026-04-13): auto-logout
  after 1–2 days; PWA service-worker update caused logouts. Both were
  caused by refactors that did not preserve the token-refresh contract.
- **Incident 3** (this change, 2026-04-18): forgotten check-outs stayed
  "active" because client-side auto-close was removed and the server
  cron couldn't be guaranteed deployed. Fixed by isolating the lifecycle
  into `workdaySessionManager.ts` with a client-side fallback.
