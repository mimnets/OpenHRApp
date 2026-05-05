# Auto-Close Session System — Analysis, Bug Report & Fix Plan

**Date:** 2026-05-05  
**Status:** Pending approval to implement  
**Affected file (frozen):** `Others/pb_hooks/cron.pb.js`

---

## 1. How the Auto-Close System Currently Works

There are **two layers** that can close a forgotten session. Understanding both is essential.

### Layer 1 — Server-Side Cron (cron.pb.js)

**Job:** `auto_close_sessions`  
**Schedule:** Every 5 minutes, starting at :03 past the hour (e.g. 10:03, 10:08, 10:13…)  
**What it does:**

1. Finds ALL open attendance records (no `check_out`) across every organisation.
2. For each open session, resolves the correct close time using this **priority chain**:
   - **Shift config first** → reads `auto_session_close_time` from the employee's assigned shift
   - **Org config second** → reads `autoSessionCloseTime` from `app_config` settings
   - **Fallback** → `"23:59"` if neither is set
3. Decides whether to close using two rules:
   - **Past-date rule**: If the session date is before today → close immediately (employee forgot yesterday or earlier)
   - **Today rule**: If session date is today AND current time ≥ resolved close time → close

When a session is closed it:
- Sets `check_out` to the configured close time
- Appends a remark: `[System: Auto-Closed Past Date]` or `[System: Max Time Reached]`
- Sends a bell notification to the employee

### Layer 2 — Client-Side Fallback (workdaySessionManager.ts)

This runs **when the employee opens the app**. It checks for open sessions from previous days and closes them on the client side before the user sees their dashboard. It appends the remark `[System: Auto-closed — no check-out recorded]` (different wording from server cron, intentionally distinguishable).

**This is the safety net** for when the server cron hasn't run yet or the employee opens the app before the cron fires.

---

## 2. Do You Still Need Both the Shift-Level and Org-Level Close Time?

**Yes. Both serve different purposes and should both exist.**

| Setting | Where set | Who it applies to | Typical use case |
|---|---|---|---|
| `auto_session_close_time` on a **Shift** | Shift configuration | Employees assigned to that shift | Night shift ends at 6 AM, day shift ends at 9 PM |
| `autoSessionCloseTime` in **Org Config** | Organisation settings | All employees with NO shift assigned + acts as org-wide default | Simple orgs that don't use shifts, or as a safety net |

**Priority is: Shift > Org > "23:59" fallback.**

If an employee has a shift with close time `21:00`, their session will be closed at 9 PM regardless of the org's setting. If they have no shift, the org's close time is used. If the org hasn't configured anything, sessions fall back to closing at 23:59.

---

## 3. What Happens When an Org Sets 10:00 PM (22:00)?

### What SHOULD happen (correct behaviour):

```
Org timezone: Asia/Dhaka (UTC+6)
Configured close time: 22:00

At 22:00 Dhaka time (= 16:00 UTC):
  → Cron fires (e.g. at 22:03 Dhaka time)
  → Finds open sessions for employees of this org
  → Compares 22:03 (Dhaka local) >= 22:00 → TRUE
  → Closes all open sessions, sets check_out = "22:00"
  → Sends notification to each employee
```

Sessions from the day before would already have been closed by the "past-date rule" within 5 minutes of midnight Dhaka time.

### What ACTUALLY happens today (the bug):

```
Server timezone: UTC (typical cloud server)
Org timezone: Asia/Dhaka (UTC+6)
Configured close time: 22:00

At 22:00 Dhaka time (= 16:00 UTC):
  → Cron fires
  → now.getHours() = 16  (server UTC clock)
  → currentTimeStr = "16:00"
  → Compares "16:00" >= "22:00" → FALSE → session NOT closed ❌

At 23:59 Dhaka time (= 17:59 UTC):
  → currentTimeStr = "17:59"
  → Compares "17:59" >= "22:00" → FALSE → still not closed ❌

Server midnight UTC = 06:00 Dhaka:
  → todayStr flips to next day at 06:00 Dhaka time
  → At 06:03 Dhaka time the session's date < todayStr (past-date rule)
  → Session finally closes at 06:03 Dhaka time — 8 hours late ❌
```

**Result:** Sessions are not closed at 10 PM as configured. They only close around 6 AM the next morning (Dhaka time) when the server's date rolls over. For an org in a timezone like UTC-5 (New York), the delay could be even worse.

The rush-hour skip guard (`inRushHourForOrg`) already uses the org's timezone correctly — it calls `toLocaleString("en-GB", { timeZone: tz })`. The auto-close comparison just needs the same treatment.

---

## 4. Root Cause Summary

In `cron.pb.js`, the `auto_close_sessions` cron uses **two server-local values**:

```js
const h = ("0" + now.getHours()).slice(-2);   // ← SERVER timezone
const m = ("0" + now.getMinutes()).slice(-2);  // ← SERVER timezone
const currentTimeStr = h + ":" + m;           // wrong for any org not in server TZ

const todayStr = year + "-" + month + "-" + day; // ← also SERVER timezone
```

These are then compared against close times that mean "local business time" in the org's country. The fix is to compute both values in the org's timezone — exactly as `inRushHourForOrg()` already does.

The `auto_absent_check` cron has the same timezone blindness but that is a separate issue.

---

## 5. The Fix — What Will Change

Only **one function needs to change** inside the frozen `auto_close_sessions` block in `cron.pb.js`.

### New logic (per-session, after resolving org config):

```
1. Read org timezone from app_config (already loaded when resolving autoCloseTime)
2. Convert `now` to org-local time using Intl.DateTimeFormat (same API inRushHourForOrg uses)
3. Build orgCurrentTimeStr and orgTodayStr from org-local values
4. Use orgCurrentTimeStr for the >= comparison
5. Use orgTodayStr for the past-date vs today decision
```

### What stays the same:
- The 5-minute schedule does not change
- The shift > org > fallback priority chain does not change
- Both shift-level and org-level close time fields remain as-is
- The rush-hour skip guard is already correct — no change needed there
- The notification sent to employees does not change

### Caching (performance):
The current code already caches rush-hour decisions per-org to avoid 500 DB reads per run. We will add the same per-org cache for `{ tz, orgTodayStr, orgCurrentTimeStr }` so the timezone conversion is computed once per org per cron run, not once per open session.

---

## 6. Scenario Walkthrough After Fix

### Scenario A — Bangladesh org, 10 PM close, server in UTC

```
Org timezone: Asia/Dhaka (UTC+6)  
Close time: 22:00  
Server time: UTC  

At 22:03 Dhaka time (= 16:03 UTC):
  → Cron fires
  → Converts now → Dhaka → orgCurrentTimeStr = "22:03", orgTodayStr = "2026-05-05"
  → "22:03" >= "22:00" → TRUE ✅
  → Session closed, check_out = "22:00", notification sent
```

### Scenario B — New York org, 6 PM close, server in UTC

```
Org timezone: America/New_York (UTC-4 in summer)
Close time: 18:00  
Server time: UTC

At 18:03 New York time (= 22:03 UTC):
  → orgCurrentTimeStr = "18:03", orgTodayStr = "2026-05-05"
  → "18:03" >= "18:00" → TRUE ✅
  → Session closed correctly
```

### Scenario C — Employee with Night Shift (close at 06:00 next day)

```
Shift auto_session_close_time: "06:00"
Org close time: "22:00"
Priority: shift wins → 06:00

At 06:03 org-local time the next morning:
  → orgCurrentTimeStr = "06:03", orgTodayStr = "2026-05-06"
  → Session date = "2026-05-05" < "2026-05-06" → past-date rule fires
  → Session closed ✅
```

Note: "06:00 next day" sessions close via the past-date rule (the session date is yesterday by the time 6 AM arrives), which is correct.

### Scenario D — Employee forgets to check out, opens app next morning

```
Stale session date: "2026-05-05", check_out: ""
Employee opens app at 09:00 on 2026-05-06

→ workdaySessionManager (client-side) detects past-date open session
→ Closes it immediately on client with remark "[System: Auto-closed — no check-out recorded]"
→ Employee sees a toast notification
→ Server cron would also close it within 5 minutes, but client beats it
```

Both close it — client wins if the app is opened first. No double-close risk (client sets check_out and saves; cron skips sessions where check_out is already populated).

---

## 7. Is a "9 AM Morning Flush" Needed?

**No, and here is why.**

After the timezone fix, the every-5-minute cron will correctly close past-date sessions within 5 minutes of midnight in the org's own timezone. Any session left open from yesterday will be closed at approximately 00:03 org-local time, not hours later.

If an employee opens the app the next morning before the cron runs, the client-side `workdaySessionManager` closes it instantly on the device.

A separate "9 AM flush" cron would be redundant. The only reason to add one would be if you want a guaranteed "clean slate before the workday starts" for orgs that don't trust the overnight cron. That is optional and can be added later if needed.

---

## 8. Implementation Plan (Requires Approval — Frozen File)

### Step 1 — Add per-org timezone cache to `auto_close_sessions`

Add a `tzCache` object alongside the existing `rushCache`:

```js
const tzCache = {}; // orgId → { tz, orgTodayStr, orgCurrentTimeStr }
```

### Step 2 — Add helper function `getOrgLocalTime(orgId, now, config, tzCache)`

Inline the timezone conversion (same approach as `inRushHourForOrg`):

```js
function getOrgLocalTime(orgId, now, config, tzCache) {
    if (tzCache[orgId]) return tzCache[orgId];
    const tz = (config && config.timezone) ? String(config.timezone) : "";
    let timeStr, dateStr;
    try {
        if (tz) {
            const timePart = now.toLocaleString("en-GB", {
                timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false
            });
            const datePart = now.toLocaleString("en-CA", {
                timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit"
            });
            timeStr = timePart;   // "22:03"
            dateStr = datePart;   // "2026-05-05"
        }
    } catch (e) { /* fall through */ }
    if (!timeStr) {
        const h = ("0" + now.getHours()).slice(-2);
        const m = ("0" + now.getMinutes()).slice(-2);
        timeStr = h + ":" + m;
        const year = now.getFullYear();
        const month = ("0" + (now.getMonth() + 1)).slice(-2);
        const day = ("0" + now.getDate()).slice(-2);
        dateStr = year + "-" + month + "-" + day;
    }
    const result = { tz, orgCurrentTimeStr: timeStr, orgTodayStr: dateStr };
    tzCache[orgId] = result;
    return result;
}
```

### Step 3 — Replace the hard-coded time comparison

Before (server local time):
```js
} else if (sessionDate === todayStr && currentTimeStr >= autoCloseTime) {
```

After (org local time):
```js
const orgTime = getOrgLocalTime(orgId, now, config, tzCache);
} else if (sessionDate === orgTime.orgTodayStr && orgTime.orgCurrentTimeStr >= autoCloseTime) {
```

And for past-date comparison:
```js
if (sessionDate < orgTime.orgTodayStr) {
```

### Step 4 — Update changelog

Add entry to `src/data/changelog.ts` dated 2026-05-05.

### Step 5 — Manual verification checklist (required for frozen file)

- [ ] Create test attendance record dated yesterday for a test employee whose org timezone differs from server
- [ ] Confirm cron closes it within 5 minutes and remark says `[System: Auto-Closed Past Date]`
- [ ] Set org close time to 2 minutes from now (org local) and confirm session closes within 5 minutes
- [ ] Confirm `npm run validate:hooks` passes after change
- [ ] Login on flaky network still does NOT log out (frozen file invariant)

---

## 9. Files to Change

| File | Change | Frozen? | Gate required? |
|---|---|---|---|
| `Others/pb_hooks/cron.pb.js` | Add `getOrgLocalTime()` helper + replace 2 comparison lines | YES | Plan mode + explicit approval |
| `src/data/changelog.ts` | Add changelog entry | No | None |

No frontend changes. No schema changes. No new fields needed — `timezone` is already in `app_config`.

---

## 10. What We Are NOT Changing

- Shift-level `auto_session_close_time` field — stays, still takes priority
- Org-level `autoSessionCloseTime` in app_config — stays, still the fallback
- The 5-minute cron schedule — stays
- The rush-hour skip guard — already timezone-correct, no change
- `workdaySessionManager.ts` (frozen) — already works correctly for client-side fallback
- `auto_absent_check` cron — has the same timezone bug but is a separate issue, not in scope here
