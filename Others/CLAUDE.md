# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. **ALL contributors (human or AI) MUST read and follow these instructions.**

---

## gstack — Web Browsing & Skills

For all web browsing, use the **`/browse`** skill from gstack. Never use `mcp__claude-in-chrome__*` tools for browsing.

**First-time setup** (all contributors must run once):
```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-gstack.ps1
```
Prerequisites: [bun](https://bun.sh) must be installed. The script clones gstack to `~/.claude/skills/gstack/` and runs `./setup`.

Available gstack skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`.

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

---

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
