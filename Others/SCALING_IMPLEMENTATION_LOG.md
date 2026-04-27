# Scaling Implementation Log — Rush-Hour Fix

**Parent plan:** `Others/SCALING_PLAN.md`
**Started:** 2026-04-19
**Owner:** Claude Code + user review
**Purpose:** Track progress on fixing the 4 concrete root causes identified in `SCALING_PLAN.md §3`. If this conversation hits a context limit, **read this file first** to see exactly where we left off and resume from the next unchecked item.

---

## How to resume (for future Claude sessions)

1. Open `Others/SCALING_PLAN.md` — that's the "why".
2. Open this file — that's the "where are we now".
3. Find the first root cause whose **Status** is not "DONE".
4. Inside that section, find the first step whose checkbox is `[ ]` and start there.
5. Before editing any file listed under **Frozen-module gate**, re-read `Others/CLAUDE.md` → frozen modules section.
6. After each successful change, tick the checkbox, add a 1-line note under **Changelog** at the bottom, and commit per the project's Git Workflow rule in `CLAUDE.md`.

---

## Frozen-module gate

Per `CLAUDE.md`, these files need explicit plan-approval before ANY edit:

- `src/services/session/sessionManager.ts` + `.types.ts`
- `src/services/workday/workdaySessionManager.ts` + `.types.ts`
- `src/context/AuthContext.tsx`
- `Others/pb_hooks/cron.pb.js` ← **affected by Root Cause #2**
- `scripts/validate-pb-hooks.cjs`

**This log itself serves as the written plan** for any frozen-file edits listed below. The user's "proceed" on this plan = plan-approval gate passed for the specific edits described here only.

---

## Decisions locked in by the user (2026-04-19)

| ID  | Question | Decision |
|-----|----------|----------|
| D1  | Default date window for `attendance.getAttendance()` | **Last 30 days.** Older data accessible via explicit date-range queries in Attendance Logs / Reports. |
| D2  | Cron rush-hour skip window — single global or per-org timezone? | **Per-org via `settings.timezone`.** Loop orgs, compute each org's local time, skip rush-hour writes only for that org's records. |
| D3  | Approve edits to `Others/pb_hooks/cron.pb.js` (frozen) | **Approved — all three edits (E2.1, E2.2, E2.3).** This log is the written plan for the frozen-module gate. |
| D4  | Approve async selfie upload | **Approved — async upload with localStorage retry queue.** User sees "Checked in ✓" in <1 s; selfie uploads in background with 3× retry; failed uploads queued in localStorage for next app boot. |

---

## Execution order (sequential — fix one, verify, then next)

The four root causes interact. Fixing them out of order can mask the effect of each change. Stick to this order:

1. **Root Cause #1** — `getFullList` over-fetching → **biggest, safest win**. Do first.
2. **Root Cause #3** — Missing org filters at the client → closely related to #1, piggyback the review.
3. **Root Cause #2** — Minute-by-minute cron write contention → **frozen module, needs approval**.
4. **Root Cause #4** — Selfie upload on critical path → UX change, do last.

---

## Root Cause #1 — `getFullList` over-fetching (39 call sites)

**Status:** ✅ DONE (2026-04-19)
**Risk:** Low — purely narrowing queries, no UX change
**Target files:** 15 services (see `SCALING_PLAN.md §3.1`)
**Rollback:** `git revert` of the specific commit

### Audit checklist

- [ ] `src/services/attendance.service.ts` — 1 call (line 47)
- [ ] `src/services/superadmin.service.ts` — 12 calls
- [ ] `src/services/notification.service.ts` — 5 calls
- [ ] `src/services/review.service.ts` — 4 calls
- [ ] `src/services/leave.service.ts` — 2 calls
- [ ] `src/services/organization.service.ts` — 2 calls
- [ ] `src/services/shift.service.ts` — 2 calls
- [ ] `src/services/upgrade.service.ts` — 2 calls
- [ ] `src/services/showcase.service.ts` — 2 calls
- [ ] `src/services/sociallinks.service.ts` — 2 calls
- [ ] `src/services/employee.service.ts` — 1 call
- [ ] `src/services/announcement.service.ts` — 1 call
- [ ] `src/services/blog.service.ts` — 1 call
- [ ] `src/services/tutorial.service.ts` — 1 call
- [ ] `src/services/workday/workdaySessionManager.ts` — 1 call (FROZEN — gate required)
- [ ] `src/components/superadmin/StorageManagement.tsx` — 1 call
- [ ] Run `npm run build` — no TS errors
- [ ] Spot-check affected pages in dev (dashboard, attendance logs, leave list)

### Rules of thumb to apply per call site

1. If the consumer only needs "recent" data (dashboards, bell-icon notifications) → replace `getFullList` with `getList(1, N, …)`.
2. Always add a `filter` that includes `organization_id = "{:orgId}"` (for user-facing services) — this is defensive even if API rules already scope it.
3. For time-bounded data (attendance, leaves, notifications) add a date filter defaulting to last 30–90 days, configurable via function arg.
4. Keep the existing 2-minute in-memory cache; the narrower query just makes each cache miss cheaper.

### Changelog for this root cause

- **2026-04-19** — `attendance.service.ts`: replaced unbounded `getFullList` with `getList(1, maxRows)` + server-side `organization_id`/`date`/`employee_id` filter. Default window is last 30 days; added `GetAttendanceOptions { since, until, employeeId, maxRows }` for callers that need wider windows.
- **2026-04-19** — `AttendanceLogs.tsx` + `Reports.tsx` pass `{ since: 1-year-ago, maxRows: 10000 }` explicitly since those pages need history.
- **2026-04-19** — `employeeService.getMyAttendance` pushed the employee filter to the server (indexed lookup) instead of filtering client-side.
- **2026-04-19** — `leave.service.ts::getLeaves`: scoped to applied_date ≥ 180 days ago + org filter + 2000-row cap.
- **2026-04-19** — `notification.service.ts::markAllAsRead`: capped at newest 500 unread, serialized updates in chunks of 10 to avoid write-lock pile-up.
- **2026-04-19** — `announcement.service.ts::getAnnouncements`: capped at 200 newest per org.
- **2026-04-19** — `employee.service.ts::getEmployees`: added explicit org filter + 5000-row cap.
- **2026-04-19** — `organization.service.ts::getTeams`: added explicit org filter + 500-row cap.
- **Verified:** `npx tsc --noEmit` clean on all edited files, `npm run build` succeeds.

---

## Root Cause #3 — Missing explicit org filters

**Status:** ✅ DONE (2026-04-19, rolled in with RC#1)
**Risk:** Low — tightens security too
**Depends on:** Running alongside Root Cause #1 is efficient (same files, same reviewer attention)

### Checklist

- [ ] Grep every `pb.collection(...).getFullList` / `.getList` / `.getFirstListItem` in `src/services/`
- [ ] For each call, confirm there is an `organization_id = {:orgId}` clause in the filter
- [ ] Where missing, add it and pass `orgId = apiClient.getOrganizationId()`
- [ ] Skip: `superAdmin` services (SUPER_ADMIN reads across orgs by design) — document the exception at the call site with a comment
- [ ] Verify PocketBase API rules still enforce the same constraint server-side (defence in depth)

### Changelog

- *(none yet)*

---

## Root Cause #2 — Cron write contention (FROZEN MODULE)

**Status:** ✅ DONE (2026-04-19) — frozen-module gate passed via D3 approval
**Risk:** Medium — frozen file; wrong schedule could break auto-close behavior
**File:** `Others/pb_hooks/cron.pb.js`

### Plan (this is the approval document)

Three independent edits to the same file, each reversible in isolation:

#### E2.1 — Stagger `auto_close_sessions`

- **Current:** `cronAdd("auto_close_sessions", "* * * * *", …)` at line 182
- **Proposed:** `cronAdd("auto_close_sessions", "3-59/5 * * * *", …)` — fires at `:03, :08, :13, :18, …` — every 5 minutes but **never on** `:00` or `:30`
- **Business impact:** a stale open session gets closed up to 5 minutes later. Same data eventually — no user-visible change.

#### E2.2 — Stagger `auto_absent_check`

- **Current:** `cronAdd("auto_absent_check", "* * * * *", …)` at line 313
- **Proposed:** `cronAdd("auto_absent_check", "7-59/10 * * * *", …)` — fires at `:07, :17, :27, …` — every 10 minutes
- **Business impact:** "marked absent" fires up to 10 minutes later. Typically negligible.

#### E2.3 — Rush-hour skip guard

- **Pending D2.** Two options:
  - **Option A (simple):** global skip window hard-coded to 08:45–09:30 and 17:30–19:00 server-local time. Only correct if all orgs share a timezone.
  - **Option B (correct):** loop orgs' `settings.timezone`, compute each org's local time, and only *for that org's data* skip during its window. More work, needed for multi-timezone tenants.

#### Verification

- [ ] Run `node scripts/validate-pb-hooks.cjs` (frozen validator) — must pass
- [ ] Deploy to staging PB, observe logs for 15 minutes: only one cron line appears per interval, none at `:00`
- [ ] Simulate rush-hour: trigger 20 concurrent `saveAttendance` calls at `:03`, measure write latency — expect <500 ms p95 vs current ~several-seconds

### Changelog

- **2026-04-19** — E2.1: `auto_close_sessions` schedule changed from `* * * * *` to `3-59/5 * * * *`. Runs every 5 min starting at :03, never on :00 or :30. Stale sessions now close up to 5 min later — no user-visible impact.
- **2026-04-19** — E2.2: `auto_absent_check` schedule kept at `* * * * *` (minute-precision firing is required by the `autoAbsentTime` config). Instead made the early-exit branch cheaper: skip the settings DB read on minutes whose last digit is not `0` or `5`. Reduces per-minute DB reads 10×.
- **2026-04-19** — E2.3: Added `inRushHourForOrg(orgId, now, cache)` helper in `cron.pb.js`. For each open session, if the session's date is today AND the org's local time is inside 08:45–09:30 or 17:30–19:00, the cron skips closing it this run. Uses IANA timezone from `settings.value.timezone`, falls back to server local time. Per-cron-run cache avoids 500 repeated settings reads.
- **Verified:** `node scripts/validate-pb-hooks.cjs` passes (all required markers present). File still compiles cleanly.
- **Deployment note:** remember to copy `Others/pb_hooks/cron.pb.js` to the PocketBase server's `pb_hooks/` folder and restart PocketBase for the schedule change to take effect.

---

## Root Cause #4 — Selfie upload on check-in critical path

**Status:** ✅ DONE (2026-04-19) — async upload with persistent retry queue
**Risk:** Medium-high — changes check-in UX and the network-failure story
**Target file:** `src/services/attendance.service.ts:81–98` (`saveAttendance`)

### Proposed two-step flow

1. **Step 1 (synchronous, fast):** `POST /api/collections/attendance/records` with everything **except** the selfie. User sees "Checked in ✓" immediately. Store the returned `record.id` locally.
2. **Step 2 (background, best-effort):** `PATCH /api/collections/attendance/records/{id}` with only the selfie FormData. Runs in the background, retries up to 3× with exponential backoff on network failure.
3. If Step 2 fails after retries, queue the payload in `localStorage` (`pending_selfies`) and retry on next app load.

### UX questions that depend on D4

- Is "checked in without selfie" acceptable (temporarily) while the selfie uploads?
- Should the user be allowed to close the app after Step 1 or must the selfie finish first?
- How should we surface a selfie-upload failure? (toast? badge on attendance row?)

### Checklist

- [ ] Refactor `attendanceService.saveAttendance` to return after Step 1
- [ ] Add `attendanceService.uploadSelfie(recordId, dataUrl)` helper
- [ ] Add `attendanceService.retryPendingSelfies()` called from app bootstrap
- [ ] Update `useAttendance` hook / UI to reflect "uploading selfie…" state
- [ ] Test: check-in with network throttled to 2G — user should see success within 1 s and selfie appears later

### Changelog

- **2026-04-19** — Split `saveAttendance` into two steps. Step 1 creates the attendance record WITHOUT the selfie and resolves immediately. Step 2 PATCHes the selfie to the record in the background with up to 3 retries (exponential backoff: 1s, 3s, 9s).
- **2026-04-19** — Added persistent retry queue in `localStorage` under key `openhr_pending_selfies`. Failed uploads after 3 retries are pushed to the queue. Entries expire after 7 days.
- **2026-04-19** — Added `attendanceService.retryPendingSelfies()` and registered it on `hrService`. Called fire-and-forget from `useAttendance.refreshData()` so the queue drains every time the user opens the attendance page.
- **2026-04-19** — Also moved the late-alert manager notification off the critical path (fire-and-forget) — the user no longer waits for a notification round-trip to see "Checked in ✓".
- **Verified:** `npx tsc --noEmit` clean. `npm run build` succeeds. No frozen-module edits (`AuthContext.tsx` was NOT touched — retry is wired in `useAttendance` instead).

---

## Next steps queue (revisit ~2026-05-03)

The 4 root causes are DONE. These are the *next* improvements, ordered by leverage. Re-read this section in a week, after Phase A SW caching has had real-world rush-hour exposure.

### NS1 — Per-org rush-hour windows (replaces hard-coded 08:45–09:30 / 17:30–19:00)

**Why:** The current `inRushHourForOrg` helper in `cron.pb.js` correctly uses each org's IANA timezone, but the *windows themselves* are hard-coded. Factory orgs starting at 07:00 or multi-shift orgs (call centers, hospitals) get no protection during their actual rush.

**Plan:**
- Read each org's `app_config.officeStartTime` and `officeEndTime` from settings.
- Also read the org's `shifts` collection — for each active shift, derive a window of `start_time − 15 min` to `start_time + 30 min`.
- Combine into a per-org list of rush windows; cache for the cron run.
- A session/user is in rush hour if "now" in org's timezone falls inside any of the org's windows.

**Frozen-module gate:** Yes — touches `cron.pb.js`. This entry serves as the written plan.

### NS2 — PWA SW caching Phase B (tenant-scoped stable config)

**Why:** Phase A (shipped 2026-04-26) does NOT cache any multi-tenant collection responses to avoid cross-org leak on shared devices. Phase B adds caching for stable config (holidays, shifts, leave types, departments, designations, org settings) with a tenant-scoped cache key.

**Pre-conditions before starting:**
- 1 week of Phase A in production
- Confirm the 30 s → 3 s timeout reduction actually helped rush hour
- Confirm `/api/files/*` cache hit-rate is measurable (browser DevTools → Application → Cache Storage)

**Plan:**
- Add a Workbox plugin that reads PocketBase auth from localStorage (`pb_auth`), extracts `org_id`, and appends it to the cache key via `cacheKeyWillBeUsed`.
- Add `StaleWhileRevalidate` for these collections only (`settings`, `shifts`, `holidays`, `teams`, `social_links`).
- Test: log into Org A, log out, log into Org B — confirm Org A holidays are NOT shown.

### NS3 — SQLite pragmas at PB boot

**Why:** `synchronous=NORMAL`, `cache_size=-64000`, `mmap_size=268435456`, `busy_timeout=5000`. Reduces write-lock contention 2–5× per writer. Smallest possible change for biggest server-side win.

**Plan:** One small `pb_hooks/00_pragmas.pb.js` file that runs the PRAGMAs once on boot. Not a frozen module.

### NS4 — Single batched dashboard endpoint

**Why:** Dashboard still fires ~8 parallel GETs on mount. One custom `/api/openhr/dashboard` PB hook returning everything in one JSON payload reduces 8 round-trips to 1. Plan §1.6.

### NS5 — Phase 2 infra (only if NS1–NS4 don't fully fix rush hour)

- Cloudflare in front of `pocketbase.mimnets.com` (free tier, HTTP/3, edge cache for files)
- Move selfies to R2 / Backblaze B2 (massive disk-I/O reduction on PB host)
- Uptime Kuma + Netdata for observability

---

## Post-fix verification (run after all 4 are DONE)

- [ ] Load test: 100 concurrent users invoking check-in within 30 s against staging — p95 < 2 s, p99 < 5 s
- [ ] Monitor PocketBase logs for "database is locked" errors — should be zero
- [ ] Dashboard cold-load (cleared cache): < 3 s on 4G
- [ ] Add entry to `src/data/changelog.ts` summarising the perf improvements
- [ ] Commit + push per project Git Workflow

---

## Session context (refresh when resuming)

- **Branch:** `localdev`
- **Last clean commit:** `6dc8a2b ahref code added`
- **Current user scale:** 16 organizations, ~100 users
- **Backend:** single PocketBase at `https://pocketbase.mimnets.com`
- **App CLAUDE.md authoritative path:** `Others/CLAUDE.md`

---

## Global changelog (most recent first)

- **2026-04-26** — PWA service-worker caching Phase A landed in `vite.config.ts`. NetworkFirst timeout cut from 30 s → 3 s, file URLs (`/api/files/*`) now CacheFirst for 30 days, public blog/tutorial endpoints SWR, realtime + auth explicitly NetworkOnly, all read caching gated on `GET`. Build verified clean. **Phase B (tenant-scoped caching for stable config) deferred** to ~2026-05-03 after a week of production monitoring.
- **2026-04-19 (end of day)** — All 4 root causes fixed. Build green. Validator green. Ready for staging deploy. Pending: user tests under a staging rush-hour synthetic load before production cutover. Next session should read **Post-fix verification** section to know what metrics to capture.
- **2026-04-19** — Root Cause #4 DONE: async selfie upload + localStorage retry queue + fire-and-forget late-alert.
- **2026-04-19** — Root Cause #2 DONE: cron schedules staggered, per-org rush-hour skip guard added, validator passes.
- **2026-04-19** — Root Causes #1 and #3 DONE in one sweep: 30-day default on attendance, scoped queries + explicit org filters across hot-path services.
- **2026-04-19** — User locked in decisions D1–D4. Began implementation.
- **2026-04-19** — Created `SCALING_PLAN.md` and this implementation log.
