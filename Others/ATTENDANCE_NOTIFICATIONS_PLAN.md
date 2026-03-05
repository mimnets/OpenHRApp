# Attendance Notifications — Implementation Plan

## Current Status

**Implemented (Phase 1):**
- Late Alerts — event-driven, fires on punch-in
- Missed Check-Out Alerts — event-driven, fires on auto-close

**Deferred:**
- Check-In Reminders — requires scheduled infrastructure

---

## Implemented: Late Alert

**Trigger:** `attendance.service.ts → saveAttendance()` — after creating a record with `status: 'LATE'`

**Action:** Notify the employee's line manager (via `lineManagerId`)

**Notification payload:**
- type: `ATTENDANCE`
- title: `"{employeeName}" checked in late`
- message: `Checked in at {checkIn} (shift starts {shiftStart})`
- priority: `NORMAL`
- referenceType: `attendance`

---

## Implemented: Missed Check-Out Alert

**Trigger:** `attendance.service.ts → getActiveAttendance()` — when auto-closing a past-date or max-time-exceeded session

**Action:** Notify the employee whose session was auto-closed

**Notification payload:**
- type: `ATTENDANCE`
- title: `Your session was auto-closed`
- message: `Check-out was missing for {date}. Session closed at {autoCloseTime}.`
- priority: `NORMAL`
- referenceType: `attendance`

---

## Deferred: Check-In Reminder

Three approaches evaluated:

### Option A: Dashboard-Triggered (Client-Side)

When an employee opens the dashboard, if it's past their shift start time and they have no attendance record for today, create a one-time reminder notification.

**Trigger point:** `useDashboard.ts → loadDashboard()` — after loading active attendance

**Logic:**
1. If `activeRecord` is undefined AND current time > shift start + grace period
2. Check if a reminder notification already exists for today (avoid duplicates)
3. If not, create: `{ type: 'ATTENDANCE', title: 'Check-in reminder', ... }`

**Pros:** Zero infrastructure, works immediately
**Cons:** Only fires when user opens the app (defeats the purpose if they forgot)

### Option B: PocketBase Cron Hook (Server-Side)

Add a new cron job in `Others/pb_hooks/` similar to `cron.pb.js` (subscription expiry).

**Schedule:** Daily at configurable time (e.g., shift start + 30 min)

**Logic:**
1. Query all employees with no attendance record for today
2. For each, resolve their shift start time
3. If current time > shift start + grace, create a notification record directly in PB
4. Optionally send email digest

**File:** `Others/pb_hooks/attendance_cron.pb.js`

**Pros:** Server-side, reliable, runs even if nobody opens the app
**Cons:** Requires PB hook deployment, queries all employees daily, needs shift resolution logic in JS (duplicated from TS)

### Option C: Browser Push Notifications (Service Worker)

Use the existing PWA service worker to schedule local notifications.

**Logic:**
1. On app load, register a periodic sync or use `setTimeout` for next shift start
2. At trigger time, check attendance via API
3. If no punch, show browser push notification

**Pros:** Works even when app is in background (on supported browsers)
**Cons:** Requires notification permission, unreliable on mobile browsers, doesn't work if browser is closed

### Recommendation

**Option B (PocketBase Cron)** is the most reliable for production use. It can also handle:
- Batch check-in reminders for all employees at once
- Integration with email digest system
- Manager summaries ("3 team members haven't checked in")

Implement when the email digest system is built, so reminders can be bundled.
