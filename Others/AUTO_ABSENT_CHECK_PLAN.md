# Auto-Absent Check — Bug Analysis & Fix Plan

**Date:** 2026-05-05  
**Status:** Pending approval  
**Affected file (frozen):** `Others/pb_hooks/cron.pb.js`

---

## 1. Current Behaviour

`auto_absent_check` runs every minute. Logic:

1. Build `currentTimeStr` from server clock (`now.getHours()`)
2. Early-exit if minute digit is not `0` or `5` (perf guard)
3. Load ONE `app_config` (no `organization_id` filter) — gets whichever row DB returns first
4. Compare `currentTimeStr` against that config's `autoAbsentTime`
5. If match: fetch ALL active employees across ALL orgs
6. For each employee: check if attendance record or approved leave exists for `dateStr`
7. If neither: insert ABSENT record

---

## 2. Two Bugs

### Bug A — Multi-tenant isolation broken (critical)

Line 471:
```js
const configRecord = $app.findFirstRecordByFilter("settings", "key = 'app_config'");
```

No `organization_id` filter. PocketBase returns whichever org's config comes first.

**Impact:**
- Only one org's `autoAbsentTime`, `workingDays`, `holidays`, `autoAbsentEnabled` are used
- All 9 other orgs get absent-marked using that one org's settings
- If the "winning" org has `autoAbsentEnabled = false` → nobody ever gets absent-marked
- If org A works Sunday–Thursday but org B works Monday–Friday, org B employees get absent-marked on Sundays

### Bug B — Server timezone used (same as auto_close_sessions had)

Lines 456–458, 488–491, 497:
```js
const h = ("0" + localDate.getHours()).slice(-2);   // server UTC
const m = ("0" + localDate.getMinutes()).slice(-2);  // server UTC
const dateStr = year + "-" + month + "-" + day;      // server UTC date
const dayName = dayNames[localDate.getDay()];         // server UTC day-of-week
```

**Impact:** For a Bangladesh org (UTC+6), server midnight UTC = 6 AM Dhaka. If `autoAbsentTime = "23:55"`, match fires at 23:55 UTC = 05:55 Dhaka next day — employees get absent-marked for yesterday's date.

---

## 3. The Fix — Per-Org Rewrite

Restructure the cron to loop over all active orgs (same pattern as `daily_attendance_report` already does correctly at line 589+).

### New logic:

```
1. Build server currentTimeStr (cheap, no DB) — used only as a pre-filter
2. Early-exit if minute digit not 0 or 5 (unchanged perf guard)
3. Load ALL active orgs (non-SUSPENDED)
4. For each org:
   a. Load that org's app_config (with org_id filter)
   b. Skip if autoAbsentEnabled != true
   c. Convert server clock to org-local time using getOrgLocalTime()
   d. Skip if org-local time != org's autoAbsentTime
   e. Build org-local dateStr and dayName
   f. Skip if dayName not in org's workingDays
   g. Load that org's holidays, skip if today is holiday
   h. Fetch only that org's ACTIVE employees (add organization_id filter)
   i. For each employee: check attendance + leave for org-local dateStr
   j. Mark absent if neither found
```

### What stays the same:
- Every-minute schedule (minute-precision requirement unchanged)
- The `:0` or `:5` suffix early-exit perf guard (unchanged)
- Attendance record structure (same fields)
- Notification sent on absent-mark (unchanged)
- Leave check logic (same filter, different dateStr)

### Performance note:
Current: 1 DB read (config) + N reads (employees across all orgs).  
After fix: 1 org list read + per-org: 1 config read + 1 holiday read + N employee reads.  
For most minutes the early-exit fires before org loop. For the matching minute, cost increases proportionally to org count — acceptable since it runs once per org per day.

---

## 4. Code — New `auto_absent_check` Block

```js
cronAdd("auto_absent_check", "* * * * *", () => {
    try {
        // Cheap early-exit: build time from server clock (no DB).
        const now = new Date();
        const hh = ("0" + now.getHours()).slice(-2);
        const mm = ("0" + now.getMinutes()).slice(-2);
        const serverTimeStr = hh + ":" + mm;

        // Perf guard: only :X0 and :X5 minutes can match any standard autoAbsentTime.
        if (mm[1] !== '5' && mm[1] !== '0') return;

        // Load all non-suspended orgs.
        let orgs = [];
        try {
            orgs = $app.findRecordsByFilter(
                "organizations",
                "subscription_status != 'SUSPENDED'",
                {}, "", 500, 0
            );
        } catch (e) { return; }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (let o = 0; o < orgs.length; o++) {
            const org = orgs[o];
            const orgId = org.id;
            const orgName = org.getString("name");
            if (orgName === "__SYSTEM__" || orgName === "Platform") continue;

            // Load this org's config.
            let config = null;
            try {
                const cfgRecord = $app.findFirstRecordByFilter(
                    "settings",
                    "key = 'app_config' && organization_id = {:orgId}",
                    { orgId: orgId }
                );
                config = cfgRecord.get("value");
            } catch (e) { continue; }

            if (!config || !config.autoAbsentEnabled) continue;

            const targetTime = config.autoAbsentTime || "23:55";

            // Convert server clock to org-local time.
            const orgTime = getOrgLocalTime(orgId, now, config, {});
            const orgCurrentTimeStr = orgTime.orgCurrentTimeStr;
            const orgTodayStr = orgTime.orgTodayStr;

            // Exact minute match in org-local time.
            if (orgCurrentTimeStr !== targetTime) continue;

            // Check org-local day of week.
            const orgDayIndex = new Date(orgTodayStr + "T12:00:00").getDay();
            const orgDayName = dayNames[orgDayIndex];
            if (!config.workingDays || !config.workingDays.includes(orgDayName)) {
                console.log("[CRON] auto_absent [" + orgName + "] Skip: " + orgDayName + " not a working day.");
                continue;
            }

            // Check org holidays.
            let isHoliday = false;
            try {
                const holRecord = $app.findFirstRecordByFilter(
                    "settings",
                    "key = 'holidays' && organization_id = {:orgId}",
                    { orgId: orgId }
                );
                const holidays = holRecord.get("value") || [];
                for (let h = 0; h < holidays.length; h++) {
                    if (holidays[h].date === orgTodayStr) { isHoliday = true; break; }
                }
            } catch (e) { /* no holidays configured */ }
            if (isHoliday) {
                console.log("[CRON] auto_absent [" + orgName + "] Skip: holiday on " + orgTodayStr);
                continue;
            }

            // Process employees for this org only.
            let employees = [];
            try {
                employees = $app.findRecordsByFilter(
                    "users",
                    "status = 'ACTIVE' && role != 'ADMIN' && organization_id = {:orgId}",
                    { orgId: orgId }
                );
            } catch (e) { continue; }

            console.log("[CRON] auto_absent [" + orgName + "] TIME MATCHED (" + orgCurrentTimeStr + "). Checking " + employees.length + " employees for " + orgTodayStr + "...");

            let countMarked = 0;
            let countSkipped = 0;

            for (let i = 0; i < employees.length; i++) {
                const emp = employees[i];
                const empId = emp.id;
                const empName = emp.getString("name");

                // Already has attendance record?
                try {
                    const att = $app.findFirstRecordByFilter(
                        "attendance",
                        "employee_id = {:empId} && date = {:dateStr}",
                        { empId: empId, dateStr: orgTodayStr }
                    );
                    if (att) { countSkipped++; continue; }
                } catch (e) { /* not found, continue */ }

                // On approved leave?
                try {
                    const leave = $app.findFirstRecordByFilter(
                        "leaves",
                        "employee_id = {:empId} && status = 'APPROVED' && start_date <= {:dateStr} && end_date >= {:dateStr}",
                        { empId: empId, dateStr: orgTodayStr }
                    );
                    if (leave) {
                        console.log("[CRON] auto_absent Skip " + empName + ": approved leave.");
                        countSkipped++; continue;
                    }
                } catch (e) { /* no leave, continue */ }

                // Mark absent.
                try {
                    const col = $app.findCollectionByNameOrId("attendance");
                    const rec = new Record(col);
                    rec.set("employee_id", empId);
                    rec.set("employee_name", empName);
                    rec.set("organization_id", orgId);
                    rec.set("date", orgTodayStr);
                    rec.set("status", "ABSENT");
                    rec.set("check_in", "-");
                    rec.set("check_out", "-");
                    rec.set("remarks", "System Auto-Absent: No punch by " + targetTime);
                    rec.set("location", "N/A");
                    $app.save(rec);
                    countMarked++;
                    console.log("[CRON] auto_absent MARKED ABSENT: " + empName);

                    // Notify employee.
                    try {
                        const notifCol = $app.findCollectionByNameOrId("notifications");
                        const notif = new Record(notifCol);
                        notif.set("user_id", empId);
                        notif.set("organization_id", orgId);
                        notif.set("type", "ATTENDANCE");
                        notif.set("title", "Marked Absent");
                        notif.set("message", "No attendance punch recorded for " + orgTodayStr + ". Marked as absent.");
                        notif.set("is_read", false);
                        notif.set("priority", "HIGH");
                        notif.set("action_url", "attendance-logs");
                        $app.save(notif);
                    } catch (ne) {
                        console.log("[CRON] auto_absent: notify failed for " + empName + ": " + ne.toString());
                    }
                } catch (err) {
                    console.error("[CRON] auto_absent FAILED for " + empName + ": " + err.toString());
                }
            }

            console.log("[CRON] auto_absent [" + orgName + "] Done. Absent: " + countMarked + " | Skipped: " + countSkipped);
        }

    } catch (e) {
        console.error("[CRON] auto_absent Fatal: " + e.toString());
    }
});
```

---

## 5. Day-of-Week Derivation

The new code uses:
```js
const orgDayIndex = new Date(orgTodayStr + "T12:00:00").getDay();
```

`orgTodayStr` is already the org-local date (`"2026-05-05"`). Constructing a Date at noon local avoids any midnight DST edge. `.getDay()` gives 0–6 matching `dayNames`. This is correct and does not introduce server-timezone bias.

---

## 6. What We Are NOT Changing

- Schedule: `"* * * * *"` stays
- Perf guard: minute suffix check stays
- Absent record fields: same as before + adds `organization_id` (was missing before)
- Notification: same content, same type
- `getOrgLocalTime()` helper: already defined above this block, reused as-is

---

## 7. Files to Change

| File | Change | Frozen? | Gate required? |
|---|---|---|---|
| `Others/pb_hooks/cron.pb.js` | Replace `auto_absent_check` block | YES | Plan mode + explicit approval |
| `src/data/changelog.ts` | Add changelog entry | No | None |

---

## 8. Verification Checklist (frozen file)

- [ ] `npm run validate:hooks` passes
- [ ] Create two test orgs with different timezones and different `autoAbsentTime` — confirm each fires at correct org-local time only
- [ ] Confirm employees in org A are NOT absent-marked by org B's trigger
- [ ] Confirm holiday in org A does NOT suppress absent-marking for org B
- [ ] Confirm employees on approved leave are still skipped
- [ ] Login does NOT log out on flaky network (frozen file invariant)
- [ ] Commit message documents frozen file touched + manual checks performed
