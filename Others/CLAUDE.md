# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **No React Router** - Uses local state routing in `App.tsx` via `currentPath` state
- **Context + Event Bus** for state management (no Redux)
- **Service layer facade** - All API calls go through `hrService` which aggregates domain services
- **Multi-tenant** - Every query includes `org_id` filtering via `apiClient.getOrganizationId()`
- **PWA-enabled** with service worker support
- **Capacitor v8** for Android native build (camera, geolocation, filesystem)

### Data Flow Pattern

```
Pages/Components → Hooks → hrService (facade) → Domain Services → apiClient → PocketBase SDK
```

### Key Directories

- `src/services/` - Domain services (auth, attendance, leave, employee, organization, superadmin)
- `src/hooks/` - Data fetching hooks organized by feature (dashboard/, attendance/)
- `src/pages/` - Full-page components (route targets)
- `src/components/` - Reusable UI organized by feature (dashboard/, attendance/, leave/, organization/, subscription/)
- `src/context/` - AuthContext, ThemeContext, SubscriptionContext
- `src/config/database.ts` - PocketBase URL resolution
- `android/` - Capacitor Android native project (do not manually edit generated files)

---

## Role-Based Access Control

Roles: `SUPER_ADMIN`, `ADMIN`, `HR`, `MANAGER`, `TEAM_LEAD`, `EMPLOYEE`

- Sidebar menu items filtered by `role.roles` array
- Dashboard dispatches to role-specific components (AdminDashboard, ManagerDashboard, EmployeeDashboard)
- Services filter data by org_id for multi-org isolation

---

## Service Layer

| Service | Purpose |
|---------|---------|
| `hrService.ts` | Facade aggregating all domain services |
| `auth.service.ts` | Login, registration, password reset, email verification |
| `attendance.service.ts` | Punch in/out, active session tracking, auto-close logic |
| `leave.service.ts` | Leave requests, balance calculation, workflow routing |
| `employee.service.ts` | Employee CRUD with role-based filtering |
| `organization.service.ts` | Config/settings with in-memory caching |
| `api.client.ts` | PocketBase wrapper + event bus for cross-component sync |

### Key Patterns

**Attendance Auto-Close**: `attendanceService.getActiveAttendance()` automatically closes past-date or time-exceeded sessions.

**Leave Workflow Routing**: Initial status (PENDING_MANAGER vs PENDING_HR) determined by department workflow config and line manager availability.

**Type Mapping**: Services handle snake_case (DB) ↔ camelCase (TypeScript) conversion.

**Caching**: `organizationService` caches settings in memory; call `clearCache()` on logout.

---

## Configuration

- `vite.config.ts` - Port 3000, path alias `@/` → `./src/`
- `capacitor.config.ts` - Capacitor app config (appId, appName, webDir)
- `src/config/database.ts` - PocketBase URL from env or hardcoded fallback
- `src/constants.tsx` - Default config, departments, office locations, holidays

---

## Types

All entity interfaces in `src/types.ts`: User, Employee, Attendance, LeaveRequest, Team, Organization, AppConfig, LeavePolicy, LeaveWorkflow, SubscriptionInfo.

---

## Subscription System

Organizations have subscription statuses: `TRIAL`, `ACTIVE`, `EXPIRED`, `SUSPENDED`

- **TRIAL**: 14 days from registration, full access, countdown shown in UI
- **ACTIVE**: Full access, no restrictions (set by Super Admin after payment)
- **EXPIRED**: Read-only mode - can view data but not create/modify (auto-transitions from TRIAL)
- **SUSPENDED**: Complete lockout - cannot login (set by Super Admin)

Key files:
- `src/context/SubscriptionContext.tsx` - Subscription state and `canPerformAction()` check
- `src/components/subscription/` - SubscriptionGuard, SubscriptionBanner, SuspendedPage
- `Others/pb_hooks/cron.pb.js` - Auto-expiration cron job (runs daily at midnight)
- `Others/pb_hooks/main.pb.js` - `/api/openhr/subscription-status` endpoint

---

## Capacitor (Android) Rules — MUST FOLLOW

### Stack
- Capacitor v8
- `@capacitor/camera` — employee photo, document scan (hybrid: live stream + Capacitor fallback)
- `@capacitor/geolocation` — attendance location tracking (native plugin on Android, browser API on web)
- `@capacitor/filesystem` — file downloads/exports

### All Capacitor package versions must match exactly
```bash
npx cap doctor   # run this and fix any version mismatch before building
```

### Permissions — declare in `android/app/src/main/AndroidManifest.xml`
```xml
<!-- Camera -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- Location -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<!-- Android 10+ background location -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

### Permissions — always request at runtime (never assume granted)
```ts
// Camera
const perm = await Camera.requestPermissions();
if (perm.camera !== 'granted') {
  // show user-friendly denied message — never silently fail
  return;
}

// Location
const perm = await Geolocation.requestPermissions();
if (perm.location !== 'granted') {
  // show user-friendly denied message — never silently fail
  return;
}
```

### Platform Detection — always separate web vs native logic
```ts
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // use Capacitor plugin
} else {
  // use PWA / browser fallback
}
```

### Custom Hooks — always use these, never call plugins directly in components
- `src/hooks/useCamera.ts` — wraps `@capacitor/camera` with permission handling
- `src/hooks/useLocation.ts` — wraps `@capacitor/geolocation` with permission handling

### Rules
- NEVER use `navigator.geolocation` or `navigator.mediaDevices` directly — always use Capacitor plugins on native
- NEVER commit `android/` build artifacts — only source files
- ALL native feature components must have an `<ErrorBoundary>` wrapper
- Run `npx cap sync android` after every plugin install or web build change before testing on device

### Camera Hook — Hybrid Approach
- `src/hooks/attendance/useCamera.ts` uses `getUserMedia()` for live video preview
- If `getUserMedia` fails on native, `takePhoto()` fallback uses `Camera.getPhoto()` from `@capacitor/camera`
- `CameraFeed` component shows live stream when available, or a "Take Photo" button when only fallback is available
- `Attendance` page accepts either live selfie or fallback photo for punch submission

### Components Using Native Hooks
- `src/pages/Attendance.tsx` — uses both `useCamera` and `useGeoLocation`, wrapped in `<ErrorBoundary>`
- `src/components/attendance/CameraFeed.tsx` — handles live stream and fallback photo display

### Android Build Config
- `minSdkVersion`: 24
- `targetSdkVersion`: 36
- `android:usesCleartextTraffic="true"` — debug builds only, never production

---

## PWA Requirements

- `manifest.json` must include: `name`, `short_name`, `icons` (192px + 512px), `theme_color`, `background_color`, `display: standalone`
- Service worker (via `vite-plugin-pwa` + Workbox) must cache: app shell, fonts, and API responses
- App must be installable on Android and iOS from browser
- Run Lighthouse PWA audit before every release — score must be **> 90**

---

## Code Standards

- One responsibility per component
- All native feature components must have an `<ErrorBoundary>` wrapper
- Use custom hooks for camera (`useCamera`) and location (`useLocation`)
- No direct use of `navigator.geolocation` or `navigator.mediaDevices` — always use Capacitor plugins
- All user-facing errors must show a readable message, never a raw JS error

---

## Debugging Capacitor Crashes

```bash
# Live crash log from connected Android device (USB)
adb logcat | grep -i "openhr\|capacitor\|error"

# Or open Android Studio → Logcat → filter by your package name
# Live reload dev build on device
npx cap run android --livereload
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `android/app/src/main/AndroidManifest.xml` | Android permissions declaration |
| `capacitor.config.ts` | Capacitor app ID, name, webDir |
| `vite.config.ts` | Vite + PWA plugin config, port 3000 |
| `public/manifest.json` | PWA manifest |
| `src/hooks/attendance/useCamera.ts` | Camera hook (hybrid: live stream + Capacitor fallback) |
| `src/hooks/attendance/useGeoLocation.ts` | Location hook (Capacitor native + browser fallback) |
| `src/components/ErrorBoundary.tsx` | Error boundary for native feature components |
| `src/context/SubscriptionContext.tsx` | Subscription state |
| `src/config/database.ts` | PocketBase URL config |
| `src/types.ts` | All TypeScript entity interfaces |
| `Others/pb_hooks/main.pb.js` | PocketBase hooks + subscription API |
| `Others/pb_hooks/leave_notifications.pb.js` | Leave email + bell notifications |
| `Others/pb_hooks/attendance_notifications.pb.js` | Attendance email + bell notifications |
| `Others/pb_hooks/review_notifications.pb.js` | Performance review notifications |
| `Others/pb_hooks/cron.pb.js` | Daily subscription expiration cron |

---

## PocketBase Hooks — MUST FOLLOW

### Deployment
ALL files in `Others/pb_hooks/` (except files prefixed with `bk` or `bk_`) must be deployed to the PocketBase server's `pb_hooks/` directory. Missing any file will silently disable that feature (no emails, no notifications).

**Required files on server:**
- `main.pb.js` — Registration, auth, subscription, contact form, WebP validation
- `leave_notifications.pb.js` — Leave email + in-app (bell) notifications
- `attendance_notifications.pb.js` — Attendance notifications
- `review_notifications.pb.js` — Performance review notifications
- `cron.pb.js` — Daily subscription expiration cron
- `setup_collections.pb.js` — Collection setup helper

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
4. **Always add console.log at file load** — e.g., `console.log("[HOOKS] Loading Feature X...")` at the top and `console.log("[HOOKS] Feature X loaded successfully.")` at the bottom to confirm the file loaded.
5. **Update hooks must check if the relevant field actually changed** before sending notifications, to prevent duplicates:
   ```js
   var oldStatus = e.record.original().getString("status");
   if (oldStatus === newStatus) return; // skip if unchanged
   ```
6. **Sender config must be inlined** in every file (not shared across files):
   ```js
   const meta = $app.settings().meta || {};
   const sender = { address: meta.senderAddress || "noreply@openhr.app", name: meta.senderName || "OpenHR System" };
   ```
7. **Never delete or remove notification hooks** without explicit approval — they are critical for user communication.

### Email + Notification Matrix (Leave Workflow)

| Event | Employee | Manager | Admin/HR |
|-------|----------|---------|----------|
| Leave Created (pending) | Email + Bell: "Submitted" | Email + Bell: "Action Required" | Email + Bell: "New Request" |
| Leave Created (direct APPROVED) | Email + Bell: "Approved" | Email + Bell: "FYI Approved" | Email + Bell: "Approved" |
| Manager Approved → PENDING_HR | Email + Bell: "Manager Approved" | — | Email + Bell: "HR Review Required" |
| Final APPROVED | Email + Bell: "Fully Approved" | Email + Bell: "Final Approved" | Email + Bell: "Fully Approved" |
| REJECTED | Email + Bell: "Rejected" | Email + Bell: "Rejected" | Email + Bell: "Rejected" |

### Notification Collection Fields
The `notifications` collection must have these fields:
- `user_id` (relation → users) — recipient
- `organization_id` (relation → organizations) — org scoping
- `type` (text) — e.g., "LEAVE", "ATTENDANCE", "REVIEW"
- `title` (text) — short title for bell display
- `message` (text) — detailed message
- `is_read` (bool) — read status
- `priority` (text) — "NORMAL" or "URGENT"
- `reference_id` (text) — ID of the related record
- `reference_type` (text) — e.g., "leave", "attendance"
- `action_url` (text) — navigation target in the app

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
