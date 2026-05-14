# Frozen Module Change Plan — workdaySessionManager.ts

**Target:** `src/services/workday/workdaySessionManager.ts`
**Status:** FROZEN (per `Others/CLAUDE.md` → "Frozen Modules — Change-Control")
**Date:** 2026-05-14
**Author:** Claude (pending user approval)

---

## Why Edit a Frozen Module

Two post-migration bugs in `workdaySessionManager.ts` directly affect end-user UX
on the production deploy:

### Bug 1 — Active session selfie thumbnail broken (HTTP 403)

**Location:** `workdaySessionManager.ts:55`

```ts
selfie: r.selfie ? getSupabaseStorageUrl('selfies', r.selfie) : undefined,
```

The `selfies` bucket is **private**. `getSupabaseStorageUrl` constructs a
public URL → Supabase returns 403. As a result, the Dashboard / Attendance
"active session" widget shows a broken image icon as soon as the user checks
in. Historical logs go through `attendance.service.getAttendance` which
already resolves signed URLs correctly — so this bug is isolated to the
active-session read path.

### Bug 2 — Auto-close writes HH:mm to timestamptz column

**Location:** `workdaySessionManager.ts:144`

```ts
.update({ check_out: closeTime, remarks: existingRemarks + CLIENT_CLOSE_REMARK })
```

`resolveCloseTime` returns a bare `HH:mm` string (e.g. `"23:59"`). The
`attendance.check_out` column is `timestamptz`. Postgres silently rejects
the update, so the past-date open session stays open forever — defeating
the entire purpose of the client-side auto-close fallback (this was the
exact regression the freeze was designed to prevent).

Mirrors the bug already fixed in `attendance.service.updateAttendance`
in commit `085144b`.

---

## Frozen-Module Invariants (must preserve)

From `Others/CLAUDE.md`:

1. Auto-logout / forgotten check-out behaviour must remain correct.
2. `reconcileOpenSessions` contract: returns `{ active, closedPast }`
   exactly as today.
3. `mapAttendance` shape unchanged (callers depend on the `Attendance`
   type field-for-field).
4. RLS-safe — no new privilege escalation.
5. No new logic branches in the close path — only data-shape fixes.

---

## Proposed Changes

### Change 1 — Strip public-URL builder from `mapAttendance`

Match `attendance.service.ts` pattern: return raw storage path, let caller
resolve signed URL.

**File:** `src/services/workday/workdaySessionManager.ts`

```diff
- import { supabase, isSupabaseConfigured, getSupabaseStorageUrl } from '../supabase';
+ import { supabase, isSupabaseConfigured } from '../supabase';
```

```diff
  function mapAttendance(r: any): Attendance {
    return {
      ...
-     selfie: r.selfie ? getSupabaseStorageUrl('selfies', r.selfie) : undefined,
+     // selfie stores the storage path; signed URLs resolved by the caller
+     // (private bucket — same convention as attendance.service.ts).
+     selfie: r.selfie || undefined,
      ...
    };
  }
```

Then add signed-URL resolution to `reconcileOpenSessions` just before
returning, so the active record's selfie field becomes a signed URL the
UI can render directly:

```diff
    if (closedPast.length > 0) {
      apiClient.notify();
    }

+   // Resolve signed URLs for any selfies on the records we are returning.
+   // Private bucket — public URLs return 403.
+   const toSign: Attendance[] = [];
+   if (active?.selfie) toSign.push(active);
+   for (const r of closedPast) if (r.selfie) toSign.push(r);
+   if (toSign.length > 0) {
+     try {
+       const paths = toSign.map(r => r.selfie as string);
+       const { data: signed } = await supabase.storage
+         .from('selfies')
+         .createSignedUrls(paths, 3600);
+       if (signed) {
+         const urlMap = new Map(signed.map(s => [s.path, s.signedUrl]));
+         toSign.forEach(r => { if (r.selfie) r.selfie = urlMap.get(r.selfie) ?? r.selfie; });
+       }
+     } catch (e: any) {
+       console.warn('[WorkdaySessionManager] Selfie sign failed:', e?.message || e);
+     }
+   }
+
    return { active, closedPast };
```

**Invariant impact:** none. Output type unchanged. Failure mode is graceful
(broken image, not crash) — same as today's 403.

### Change 2 — Auto-close uses ISO timestamp

Convert `closeTime` (HH:mm) to ISO using the row's date.

```diff
      try {
        const closeTime = await resolveCloseTime(employeeId, date);
+       const closeIso = new Date(`${date}T${closeTime}:00`).toISOString();
        const existingRemarks = (rec.remarks as string) || '';
        const { data: updated, error: closeErr } = await supabase
          .from('attendance')
-         .update({ check_out: closeTime, remarks: existingRemarks + CLIENT_CLOSE_REMARK })
+         .update({ check_out: closeIso, remarks: existingRemarks + CLIENT_CLOSE_REMARK })
          .eq('id', rec.id)
          .select()
          .single();
```

**Invariant impact:** none. `resolveCloseTime` contract unchanged. Only the
shape written to Postgres is corrected. Auto-close now actually persists.

---

## Test Plan

Manual, on Vercel preview branch:

1. **Active-session selfie**
   - Check in with selfie.
   - Confirm Dashboard "Today" widget renders selfie thumbnail (no 403 in
     Network tab; `?token=...` present on the URL).
   - Reload page → still renders.

2. **Auto-close past-date open session**
   - In Supabase Studio, manually insert an attendance row with
     `date = yesterday`, `check_in = some ISO`, `check_out = NULL`.
   - Reload the app as that employee.
   - Confirm: row gets `check_out` populated with full ISO timestamp at
     `<yesterday>T<resolveCloseTime>:00Z`, remarks string contains the
     auto-close suffix, "we auto-closed your forgotten check-out" toast
     appears.
   - Confirm: today's "Check In" button shows (active = undefined).

3. **Regression — check-in / check-out / history**
   - Normal check-in → row appears, active widget shows live elapsed time.
   - Normal check-out (after the `085144b` + `0007` fixes) → button switches
     to "Checked Out", persists after reload.
   - AttendanceLogs page → row appears with correct HH:mm display, selfie
     thumbnail loads.

## Rollout

1. Apply migration `0007_attendance_self_update.sql` to production
   (separate from this plan — already needed regardless).
2. Commit `085144b` is already in `localdev`.
3. After approval of this plan, apply changes 1 + 2 as a single commit,
   update `changelog.ts`, push.
4. Verify on Vercel preview before merging to main.

## Rollback

Single commit; `git revert` restores prior state cleanly. No DB shape
change, no data migration.
