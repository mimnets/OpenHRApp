# Attendance & Workday Standards — Industry Reference + OpenHR Gap Analysis

**Status:** Reference document. Last reviewed 2026-04-18.
**Audience:** OpenHR product owner and any future contributor (human or AI)
making decisions about workday, session, and check-in/check-out behavior.
**Why this exists:** The "forgotten check-out leaves the session active
forever" bug has been re-introduced three times during refactors. Before
the next change, future decisions need to be measured against established
industry norms instead of being re-litigated from scratch.

---

## 1. Purpose & Scope

This document captures:

1. The legal and compliance backdrop for online/app-based time tracking.
2. The patterns commercial vendors actually ship for workday handling
   and forgotten check-outs.
3. A point-by-point comparison of OpenHR's current behavior to those
   patterns, with an honest gap analysis.
4. A recommended roadmap, tiered Now / Next / Later.

This is **not** legal advice. It is a product reference rooted in publicly
documented vendor behavior and US Department of Labor (FLSA) guidance.

---

## 2. Vocabulary

| Term | Meaning |
|---|---|
| **Workday** | The calendar day in the employee's local timezone. Boundaries are set by org/shift configuration, not the JS Date object. |
| **Shift** | The scheduled window the employee is expected to work (e.g. 09:00–18:00). |
| **Session** (a.k.a. **punch pair**) | One check-in event + the matching check-out event. A session is "open" until check_out is recorded. |
| **Punch** | A single clock event (in or out). |
| **Missed punch** | An expected punch that never happened. The most common case is a missed check-out (forgot to punch out). |
| **Auto clock-out** | A system-initiated check-out that closes a session the employee did not close themselves. |
| **Grace period** | A small buffer (typically 5–10 min) added to the scheduled boundary before late/early/auto rules trigger. |
| **Reconciliation** | The act of bringing an open session to a final, defensible state — either by closing it, zeroing it, or routing it for manager approval. |

---

## 3. Legal & Compliance Backdrop

### 3.1 FLSA timekeeping (US)

- The **Fair Labor Standards Act** requires employers to keep accurate
  time records for all non-exempt employees. There is no federal
  requirement to use a particular timekeeping method — punch clock,
  biometric, mobile app, SMS, and PC clocking are all acceptable —
  **as long as records are complete and accurate.**
- Required fields per record: date, start time, end time, total hours
  per day, total hours per week.
- **Retention:** time records (e.g. time cards) must be kept for **at
  least two years**.
- **Rounding** is permitted to a quarter hour: round down for 1–7 min,
  round up for 8–14 min.
- **"Off the clock" work is illegal**: an employer must pay for all
  time actually worked, including small amounts performed before clock-in
  or after clock-out, if the pattern is regular.

### 3.2 Audit-trail expectations

The cross-vendor consensus (UKG, Truein, OpenTimeClock, Connecteam) is
that any modification to a time record must capture:

- Original value (what the timesheet said before)
- New value (what it says after)
- Timestamp of the change
- **Identity** of who made the change — a user ID, not just "system" or
  "supervisor"
- A stated reason

When the system itself makes the change (e.g. auto clock-out), the actor
must still be identifiable as the system, and the reason must be
machine-readable (e.g. `MAX_TIME_REACHED`, `PAST_DATE_NO_CHECKOUT`),
not free text.

### 3.3 Notification requirement

Employees must be **notified of any edits to their timesheet before
payroll is processed**, so they have an opportunity to dispute.

### 3.4 Non-US deployments

OpenHR is sold to organizations outside the US (default config is
Asia/Dhaka). The general principles transfer — accurate records, audit
trail, employee notification — but jurisdictions vary on:

- Maximum allowable working hours per day/week (EU Working Time
  Directive: 48-hour weekly cap by default).
- Mandatory rest breaks.
- Data minimization and retention (GDPR Art. 5: keep no longer than
  necessary).
- Subject access rights (GDPR Art. 15: an employee can request their
  attendance records).

The product should make these knobs configurable rather than US-only.

---

## 4. Industry Standard Patterns

The market has converged on six recognizable patterns for handling the
end of a workday and the missed-check-out case. Most products ship
**two or three** of them and let the org pick.

### 4.1 Reminder-first (no auto-close)

**Vendors:** Connecteam, BambooHR, QuickBooks Time

- Trigger: scheduled end of shift (or N minutes before).
- Action: push notification / email to the employee — "Don't forget to
  clock out."
- If still open: another reminder, then escalate to manager.
- The session is **never auto-closed**. The employee must clock out
  themselves or file a missed-punch correction.

**Pros:** keeps the source of truth in the employee's hands, satisfies
"off-the-clock" liability, fewer disputes.
**Cons:** open sessions can persist for days, making real-time dashboards
inaccurate; relies on the employee acting on the reminder.

### 4.2 Auto clock-out at scheduled shift end (with grace)

**Vendors:** Connecteam (configurable), Workforce.com

- Trigger: `shift.endTime + grace` (e.g. 18:00 + 30 min).
- Action: system inserts a check-out at `shift.endTime` (not the
  current time — paying for unworked time would inflate payroll), and
  flags the record for review.
- A notification fires to both employee and manager.

**Pros:** accurate dashboards; payroll always has a closed session.
**Cons:** if the employee was actually working overtime, the auto-close
truncates real work — illegal under FLSA unless the manager corrects it.
The flag-for-review step is therefore **mandatory**, not optional.

### 4.3 Auto clock-out at max-hours threshold

**Vendors:** Connecteam (Operations Hub Advanced plan)

- Trigger: elapsed session duration ≥ N hours (e.g. 12.6 hours,
  decimals supported).
- Action: clock out at the threshold time, mark the shift with a red
  exclamation point.
- Often paired with overtime-prevention rules.

**Pros:** safety net against runaway sessions; bounded overtime
exposure.
**Cons:** same FLSA risk as 4.2 — the cut-off time may not equal real
worked time. Must allow manager edit + employee acknowledgment.

### 4.4 Auto clock-out at fixed daily cutoff

- Trigger: wall-clock time ≥ a single org-wide cutoff
  (e.g. 23:59).
- Action: same as 4.3.

This is the simplest pattern and the default fallback for orgs that
haven't configured shift-aware rules.

### 4.5 Zero-out / require manager approval

**Vendors:** UKG / Kronos heritage, large enterprise time systems

- Trigger: session still open at end-of-day batch run (typically 2–3 AM
  the next morning).
- Action: the session is **flagged with zero hours** until a manager
  edits it. The employee cannot be paid for that day until the missing
  punch is resolved.
- Pairs with a mandatory **missed-punch correction request** workflow:
  employee fills a form ("I worked until 18:30, forgot to punch"),
  supervisor approves with a stated reason, and the audit trail records
  every step.

**Pros:** strongest compliance posture; payroll never sees a fabricated
time. Strong audit story.
**Cons:** highest friction; requires a real approval workflow on both
the employee and manager side.

### 4.6 Pure manual correction with audit trail

**Vendors:** Deputy (compliance mode)

- Trigger: none — the system never modifies a record on its own.
- Action: open sessions stay open; dashboards surface them as
  exceptions; managers must close or correct each one.

**Pros:** zero risk of system-fabricated time.
**Cons:** operationally heavy for any org with more than a handful of
employees.

---

## 5. Forgotten Check-Out — Vendor Comparison Matrix

| Vendor | Trigger | Recorded check-out value | Visual flag | Who is notified | Override path |
|---|---|---|---|---|---|
| **Connecteam** | Max hours OR end-of-shift+N (configurable) | Threshold time, not current time | Red exclamation icon | Employee + admin (per docs) | Admin or employee edits the timesheet entry |
| **BambooHR / QuickBooks Time** | None — reminders only | Session stays open | "Open" indicator on timesheet | Employee push/email | Employee corrects via missed-punch form |
| **Deputy** | None (compliance mode) — open sessions surface as exceptions | Session stays open | Exception list | Manager dashboard | Manager edits or closes |
| **UKG / Kronos heritage** | Overnight batch | Zero / null until corrected | Mandatory exception flag | Employee + manager + payroll | Missed-punch correction form → supervisor approval |
| **Workforce.com / Paycom** | End-of-shift cutoff or per-policy | Cutoff time | Highlighted on timesheet | Manager review queue | Manager approves or edits before payroll |
| **OpenHR (current)** | Past-date OR same-day past `autoSessionCloseTime` | `autoSessionCloseTime` (e.g. 18:30) or 23:59 fallback | Remark suffix on the record | Employee in-app bell | Manual edit via attendance audit page |

---

## 6. Audit-Trail & Notification Requirements (consensus)

Across every source consulted, six requirements appear in some form:

1. **Distinguish system actions from human actions.** A system-closed
   record must be traceable to the rule that closed it
   (`AUTO_CLOSE_SHIFT_END`, `AUTO_CLOSE_MAX_HOURS`, `PAST_DATE_NO_CHECKOUT`).
2. **Capture before/after values.** Storing only the final check-out is
   insufficient — the original empty/wrong value must remain inspectable.
3. **Record the actor.** A user ID for human edits; an explicit system
   identifier for automated edits.
4. **Notify the affected employee** before payroll runs, with enough
   detail to dispute (date, original state, new state, reason).
5. **Surface exceptions to a manager.** Auto-closed sessions should not
   silently flow to payroll; they should land on a manager review queue.
6. **Provide a correction workflow.** Employees need a "missed punch"
   form that routes to their manager and updates the audit log.

---

## 7. OpenHR Today — How We Compare

This section references real files in the repo so a reader can verify.

### 7.1 What we currently do

**Server-side cron** (`Others/pb_hooks/cron.pb.js`, job
`auto_close_sessions`, scheduled `* * * * *`):

- Every minute, scans `attendance` for rows with `check_out = ''` and
  `status != 'ABSENT'`.
- For each open session, resolves close time in priority order:
  - the employee's shift `auto_session_close_time`, then
  - the org's `app_config.autoSessionCloseTime`, then
  - the hardcoded fallback `23:59`.
- Closes sessions older than today immediately, with remark
  `[System: Auto-Closed Past Date]`.
- Closes today's sessions if `currentTime >= autoCloseTime`, with
  remark `[System: Max Time Reached]`.
- Writes the chosen close time as `check_out` (not the current
  wall-clock time).
- Sends an in-app notification of type `ATTENDANCE` to the employee.

**Client-side fallback** (`src/services/workday/workdaySessionManager.ts`):

- Runs whenever the employee opens the attendance flow.
- Closes only **past-date** open sessions (never today's).
- Same close-time priority as the cron.
- Remark suffix: `[System: Auto-closed — no check-out recorded]`.
- Surfaces a one-time toast in the UI on next login.

**Configurable knobs** (per org / per shift):

- `shifts.auto_session_close_time` (HH:MM)
- `app_config.autoSessionCloseTime` (HH:MM)

### 7.2 Mapping to the six industry patterns

| Pattern | OpenHR status |
|---|---|
| 4.1 Reminder-first | **Missing.** No pre-close reminder is sent before the cutoff. |
| 4.2 Auto-close at shift end (with grace) | **Have, partial.** We close at `autoSessionCloseTime`, but the same-day rule fires the moment wall-clock crosses that boundary, with no grace specifically for the close decision. |
| 4.3 Max-hours threshold | **Missing.** Closure is time-of-day-based, not session-duration-based. A 14-hour overnight session that started before midnight is not protected. |
| 4.4 Fixed daily cutoff | **Have.** Falls back to `23:59` if no shift/org config exists. |
| 4.5 Zero-out + manager approval | **Missing.** The system writes a fabricated check-out; payroll sees a "complete" record. |
| 4.6 Manual-only with exceptions queue | **Missing.** Auto-closed records are not surfaced on a manager review queue distinct from normal records. |

### 7.3 Audit-trail compliance

| Requirement | OpenHR status |
|---|---|
| Distinguish system vs human | **Partial.** Achieved via the remark suffix, which is parseable but unstructured. The change reason is not a structured field. |
| Before/after values | **Missing.** We update `check_out` in place without persisting the original empty value. |
| Actor identification | **Missing.** No `modified_by` / `modified_via` field on attendance records. |
| Employee notification | **Have** (in-app bell from the cron path). The client fallback shows a toast but does not currently create a persistent notification. |
| Manager review queue | **Missing.** |
| Missed-punch correction workflow | **Missing.** Employees must rely on an admin to edit via the attendance audit page. |

### 7.4 FLSA-style retention check

PocketBase `attendance` records are not auto-deleted; the only related
cleanup is `selfie_cleanup` (30-day retention on selfie files in
`cron.pb.js`). The textual record itself persists, which **does meet
the FLSA two-year minimum** assuming the database is backed up.

---

## 8. Gap Analysis — Concrete Findings

Ordered by user-visible impact.

1. **No pre-close reminder.** Industry baseline is a 15–30 minute
   warning before auto-close. We send nothing.
2. **No "still working?" extend control.** When the cutoff hits, the
   employee has no one-tap way to keep the session open from the app.
3. **No manager review queue.** Auto-closed sessions are
   indistinguishable from normal ones in the manager UI except by
   reading the remark text.
4. **No missed-punch correction request workflow.** Employees cannot
   self-serve; they must email an admin or wait for the audit page.
5. **No max-hours auto-stop.** A session opened at 23:00 and forgotten
   will be closed at the next configured `autoSessionCloseTime` of the
   following day, which can result in 20+ hour fabricated sessions.
6. **No structured audit log.** All system actions encode their reason
   in a remark string. There is no `attendance_audit` table with
   actor, before, after, timestamp, and reason as first-class fields.
7. **Server cron is a single point of failure.** The client fallback
   we added (`workdaySessionManager`) mitigates this for active
   employees but does nothing for employees on extended leave (their
   open session sits forever until they log in).

---

## 9. Recommended Roadmap for OpenHR

### Now (low effort, high value)

- **Pre-close reminder.** New cron entry that fires 30 minutes before
  each shift's `auto_session_close_time` and pushes a bell + email to
  any employee with an open session. No new schema needed.
- **Manager review surface.** Add a filter chip on the Attendance
  Audit page for "Auto-closed sessions" that grep the remark suffix.
  Pure UI change.
- **Distinguish remarks consistently.** Document the three reason
  codes (`AUTO_CLOSE_PAST_DATE`, `AUTO_CLOSE_MAX_TIME_REACHED`,
  `AUTO_CLOSE_CLIENT_FALLBACK`) and prefer machine-parseable tags
  inside remarks (e.g. `[REASON:AUTO_CLOSE_PAST_DATE]`).

### Next (one or two iterations out)

- **Missed-punch correction request.** Add an
  `attendance_corrections` collection: employee submits date +
  proposed check-in / check-out + reason; routes to line manager;
  approval applies the edit and writes the audit record.
- **Structured audit log.** Add a `modified_by`, `modified_via`
  (`USER` / `SYSTEM` / `MANAGER_EDIT`), and `change_reason` to
  attendance records. Persist the original `check_out` value (or
  `null`) in a side field for system closures.
- **Server-side cron health check.** Add an endpoint
  `GET /api/openhr/health/cron` that returns the last-run
  timestamps of each cron job. Surface a banner in the admin UI if
  `auto_close_sessions` hasn't run in the last 5 minutes.

### Later (larger investments)

- **Max-hours / runaway-session protection.** New rule
  `shifts.max_session_hours` that closes any session exceeding the
  threshold regardless of date.
- **Configurable closure policy per org.** Let the org choose between
  patterns 4.1 / 4.2 / 4.3 / 4.5 instead of hardcoding 4.2 + 4.4.
- **Jurisdictional rule packs.** EU Working Time Directive cap (48h
  weekly), mandatory rest breaks, GDPR retention windows.

---

## 10. Decision-Log Hooks

If you change any of the following, **also update the corresponding
section of this document**:

| If you change… | Update… |
|---|---|
| The cron job in `Others/pb_hooks/cron.pb.js` | §7.1 (server-side cron description) and §7.4 (retention) |
| `src/services/workday/workdaySessionManager.ts` | §7.1 (client-side fallback) |
| Remark format for system closures | §7.3 and §9 (Now bullet "Distinguish remarks") |
| `shifts` schema or `app_config.autoSessionCloseTime` semantics | §7.1 (configurable knobs) and §8 (max-hours gap) |
| Add a manager review queue or correction workflow | §7.3, §8, and §9 — move the relevant items out of "Missing" |

This keeps the gap analysis honest as the product evolves.

---

## 11. Sources

External references consulted, in alphabetical order:

- [BuddyPunch — 6 Must-Know Time Clock Rules for Hourly Employees](https://buddypunch.com/blog/time-clock-rules-for-hourly-employees/)
- [ClockShark — Field Service Guide to Employee Timekeeping and Labor Laws](https://www.clockshark.com/blog/labor-laws-clocking-in-and-out)
- [Connecteam Help Center — Auto Clock Out](https://help.connecteam.com/en/articles/9360668-auto-clock-out)
- [Connecteam Help Center — Can I Prevent Employees From Forgetting to Clock Out?](https://help.connecteam.com/en/articles/8283183-can-i-prevent-employees-from-forgetting-to-clock-out)
- [Connecteam — How to Make Sure Your Employees Don't Forget to Clock In and Out](https://connecteam.com/e-clock-in-clock-out-reminder/)
- [Factorial — USA Legal Requirements of Employee Time Tracking](https://factorialhr.com/blog/employee-time-tracking/)
- [Hourly.io — The Must-Know Time Clock Rules For Hourly Employees](https://www.hourly.io/post/the-must-know-time-clock-rules-for-hourly-employees-so-you-can-protect-your-employees-and-your-business)
- [Moshes Law — Time Clock Rules for Hourly Employees](https://mosheslaw.com/time-clock-rules-for-hourly-employees/)
- [Open Time Clock — How to Create a Missed Punch Policy That Employees Actually Follow](https://www.opentimeclock.com/docs/blog1/january-2026/how-to-create-a-missed-punch-policy-that-employees-actually-follow.)
- [Patriot Software — FLSA Timekeeping Rules: Ensuring Wage and Hour Compliance](https://www.patriotsoftware.com/blog/payroll/flsa-timekeeping-requirements-rules-regulations/)
- [Paycom — Time and Attendance Software](https://www.paycom.com/software/time-and-attendance/)
- [Synerion — Labor Laws: Clocking In & Out Explained For Hourly Employees](https://www.synerion.com/blog/labor-laws-clocking-in-out)
- [Truein — How to Handle Missing Punches in Your Attendance System](https://truein.com/blogs/handling-missing-punches-in-attendance-system)
- [UKG / CloudApper — UKG Pro Missed Punch Policy: Best Practices & HR Guide](https://ukg.cloudapper.ai/time-capture/ukg-pro-missed-punch-policy-best-practices-for-hr/)
- [Workforce.com — Time and Attendance Staffing and Scheduling Software](https://www.workforce.com/software/time-and-attendance)

US Department of Labor primary source for FLSA recordkeeping:
- [DOL Fact Sheet #21: Recordkeeping Requirements under the FLSA](https://www.dol.gov/agencies/whd/fact-sheets/21-flsa-recordkeeping)

---

*End of document. If anything here is wrong or out of date, please fix
it in the same PR as the code change, per §10.*
