# Handoff — Leave approvals, check-in without location, nightly backup (2026-11-21)

Covers the work since `HANDOFF_2026-11-08_email-and-pwa-speed.md` (`0bbba77..2f0711d`). No frozen module was
edited in this range. All work is on `main`, pushed. `origin/dev` and `origin/feat/admin-verify-employee` are
fully merged into `main` (0 commits ahead) and stale; nothing to push there.

## Status

| Area | State |
|---|---|
| Leave: Reports To, no self-approval, decided-by | Released. Migrations 0052–0054 applied by hand (per commit notes). |
| Check-in reminders removed | Released. Migration 0055 fixed in `bbe02c5`; **confirm it was applied**. |
| Check-in without location | Released. Final behaviour is `a50a5b5` (amber button for every failure). |
| Nightly off-site backup | Running since 2026-11-09. **Restore never tested.** |

## 1. Leave approvals

| Commit | What |
|---|---|
| `64332ba` | Reports To field. A person is never their own line manager. Hand-chosen managers survive team save/delete. Migration 0052 clears existing self-assignments. |
| `b5c65de` | HR/Admin cannot decide, edit, delete or create-as-approved their own leave while another active HR/Admin exists (migration 0053). The only HR/Admin may still act, but not while a boss has yet to review. |
| `9cbfaf6` | Migration 0054: `decided_by`, `decided_by_name`, `decided_at`, set by a DB trigger that overrides client values. Apply after 0053. |
| `c6c9e9a`, `8d16231`, `c93bee5` | Employees see who decided; decider on the leave PDF; "not recorded" line hidden from employees. |

## 2. Check-in reminders and Contact Support removed (`40de05b`, `bbe02c5`)

- Enable Check-in Reminders popup removed; migration 0055 unschedules the reminder cron job.
- 0055 first failed with `could not find valid entry for job` (job owned by another role). `bbe02c5`
  unschedules by job id instead. Re-run it if the first attempt failed.
- Contact Support form removed from System & Profile. Late check-in alerts, Marked Absent, check-out reminders
  and the public contact form are unchanged. Push Broadcast keeps existing subscribers only.

## 3. Check-in without location (`0a81c93` → `a50a5b5`)

Final behaviour:

- Any location failure (permission blocked, timeout, unavailable, unknown) shows an amber notice and an amber
  **Check in without location** button. Tapping it writes `Location not detected` in remarks; the employee then
  taps Check In. It never enables automatically (`9bf7c3a` did, `a50a5b5` reverted that).
- Selfie still required. Factory input stays mandatory; the auto-written text does not count as factory details
  (tests: `e96d84b`).
- Record: location `Not captured`, `[NO LOCATION: <failure>]` tag, `[DIAG: ...]` tag (permission state, error,
  display mode, browser, OS, phone model; 1 s cap, cannot block check-in), No Location flag in Attendance Logs.
- Org setting `allowCheckInWithoutLocation` (on unless `false`).
- Also: check-out no longer needs a location; check-out appends to check-in remarks instead of erasing them;
  address lookup times out at 5 s and falls back to coordinates. No migration.

**Follow-up:** read `[DIAG: ...]` tags on real no-location check-ins to find the common cause.

## 4. Nightly backup (`627902f`, `435b15a`, `2f0711d`)

- `scripts/backup/openhr-backup.sh`, guide in `scripts/backup/BACKUP-GUIDE.md`.
- Root cron 21:00 UTC (03:00 Dhaka) → rclone crypt `openhr-backup:` over `r2:` bucket `openhr-backups`
  (the R2 token only works for that exact name; others give 403).
- Open: first scheduled run and healthchecks.io alert not checked here; OCI boot volume backup unconfirmed;
  **restore never tested** — do not call backups proven. In a restore test, switch restored cron jobs off first,
  or they call the live API.

## Still open from the 2026-11-08 handoff

Not touched in this range; see that file for details and commands.

1. Blocking start for logged-in users — needs a **frozen** `sessionManager.ts` change (plan + owner approval).
2. Random API stalls, cause unknown (shared VM).
3. Server region decision (owner).
4. Super Admin session lost once, not reproduced.
5. `public-ad-config` returned 404 once.
6. Email follow-ups: rotate the exposed Resend key, `CRON_SECRET`, etc.; `ANTHROPIC_API_KEY` placeholder;
   missed emails during the move.

## Not tested

- Check-in without location on a real phone (iOS and Android), installed PWA.
- Leave flows end to end with a real Reports To chain on production.
- Whether 0055 actually removed the cron job on the server:

  ```sql
  select jobid, jobname, active from cron.job order by jobid;
  ```
