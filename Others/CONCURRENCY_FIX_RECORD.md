# PocketBase Concurrency Fix — Change Record

**Date:** 2026-04-21
**Branch:** `localdev`
**Trigger:** Review of PocketBase connection logic for high-concurrency failures.
**Scope:** Frontend PocketBase SDK client only (`src/services/*`). No backend / `pb_hooks` changes. No frozen-module changes (see `Others/CLAUDE.md` → Frozen Modules).

---

## Why

During peak load (9 AM rush-hour check-ins, admin dashboards mounting on multiple tabs), the frontend surfaces PocketBase errors that look like server problems but are actually client-side amplification:

1. Identical GETs fire N times when multiple components mount in the same tick (no request dedupe on most services).
2. Transient network blips (4xx/5xx spikes, mobile-network packet loss) surface as user-facing errors because only two paths have retry logic (`sessionManager` auth-refresh and `attendance` selfie upload). Every other read/write fails through to the UI on the first blip.
3. The two read paths that *do* dedupe (`employeeService.getEmployees`, `leaveService.getLeaves`) use bare string keys (`'employees'`, `'leaves'`) with no org scoping. Under superadmin org-switching this could theoretically return another org's promise.

The full review is in the chat log; this record captures only the code that changed.

---

## What changed

### 1. `src/services/api.client.ts` — add `withRetry` helper (NEW export)

A small, opt-in retry wrapper. **No existing call sites are modified by this commit** — callers opt in explicitly. This means the helper can ship safely and be rolled out one service at a time, and can be reverted by simply not using it.

Characteristics:
- 3 attempts total, exponential backoff (250 ms, 750 ms, 2000 ms).
- Retries **only** on:
  - Network errors (no `status` on the error — fetch failures, aborted connections).
  - HTTP 429 (rate-limited).
  - HTTP 502 / 503 / 504 (transient upstream).
- Does **not** retry on:
  - 400, 401, 403, 404, 409, 422 — these are intentional / final.
  - Any error whose `isAbort` flag is true (PocketBase auto-cancellation — caller's choice, don't second-guess).

Auth errors are explicitly excluded so this never masks a real logout condition — that responsibility stays in `sessionManager` (frozen module).

### 2. `src/services/employee.service.ts` — scope dedupe key by org

Before: `dedupe('employees', ...)`
After: `dedupe(\`employees:${orgId}\`, ...)`

Prevents a theoretical cross-org promise collision if two org scopes call this within the same tick (e.g., superadmin impersonation flows).

### 3. `src/services/leave.service.ts` — scope dedupe key by org

Before: `dedupe('leaves', ...)`
After: `dedupe(\`leaves:${orgId}\`, ...)`

Same reasoning.

`attendance.service.ts` already scopes its dedupe key (`attendance:${cacheKey}` where `cacheKey` includes orgId) — no change needed there.

---

## What deliberately did NOT change

Documenting these so future-me (or whoever reviews after a regression) knows these were considered and deferred.

1. **`pb.autoCancellation(false)` at `src/services/pocketbase.ts:38` — left ON.**
   Removing it globally is tempting but high-risk: many components currently rely on being able to fire parallel identical requests without the SDK cancelling them. The correct fix is to restore auto-cancellation selectively by passing `{ requestKey: null }` on calls that genuinely need to run in parallel. That's a sweep across 28 files and belongs in its own change.

2. **No expansion of `dedupe()` into `organization.service`, `shift.service`, `notification.service`, `announcement.service`, `review.service`, `subscription`.**
   `organization` and `shift` already have module-level TTL caches that mostly absorb the duplication. `notification` polls on a timer and deduping the poll could mask a stuck state. Safer to add these one at a time with targeted telemetry, not as a bulk change.

3. **No global concurrency cap (p-limit).**
   Would affect every network call in the app. Needs observability (how many in-flight at p95 today?) before picking a cap. Deferred.

4. **No change to `getFullList` call sites.**
   Several services paginate in 500-row batches, which multiplies round-trips. But they were *deliberately* switched from `getList(1, N, ...)` because the server's default max-per-page is 500 and `getList` was silently truncating (see commit `fb74175`). Reversing that would re-introduce the truncation bug. A cursor/ETag cache is the right fix, deferred.

5. **No changes to any frozen module.**
   `sessionManager.ts`, `workdaySessionManager.ts`, `AuthContext.tsx`, `pb_hooks/cron.pb.js`, `validate-pb-hooks.cjs` — untouched. The retry helper deliberately does NOT retry auth errors, so it cannot interact with the frozen auth-refresh retry ladder.

---

## Risks & how to tell if the fix regressed something

| Risk | Symptom | Where to look |
|---|---|---|
| `withRetry` accidentally retries an auth error | User gets "session expired" toasts repeatedly even after re-login | `api.client.ts` — the `shouldRetry` predicate. Should return `false` for 401/403. If it doesn't, revert the helper. |
| Org-scoped dedupe key breaks when `orgId` is undefined (pre-auth) | `getEmployees` / `getLeaves` return empty on first paint, then work after refresh | Both services check `apiClient.getOrganizationId()` and fall back to `undefined` — verify the dedupe key becomes `employees:undefined` consistently, not a mix of keys |
| Dedupe collision with a *different* user in the same org but different role | One user's filtered response leaks to another user in the same browser tab | Both services filter server-side by `organization_id`, not by user. No role-based filtering on these endpoints. Low risk — but if seen, widen key to include `pb.authStore.model?.id`. |
| Selfie retry ladder (RC#4) disturbed | Selfies silently fail to upload after check-in | `attendance.service.ts` not modified — its retry is independent. |
| Auth-refresh ladder (frozen) disturbed | Users logged out on flaky networks | `session/sessionManager.ts` not modified. Retries there are unchanged. |

---

## How to revert

Each change is local to one file. To roll back:

```bash
git revert <commit-sha>
```

Or manually:

1. `api.client.ts` — delete the `withRetry` export and its types. Nothing imports it yet (opt-in).
2. `employee.service.ts:73` — change `\`employees:${orgId}\`` back to `'employees'`.
3. `leave.service.ts:18` — change `\`leaves:${orgId}\`` back to `'leaves'`.

Revert order doesn't matter — the three changes are independent.

---

## Follow-ups (not in this commit)

- Add opt-in retry on 2-3 non-critical reads (settings, announcements) and measure if error toasts drop.
- Decide on selective `requestKey` usage and remove the global `autoCancellation(false)`.
- Instrument in-flight request count so the concurrency cap decision is data-driven.
- Add the retry helper to `notification.service` polling loops — lowest-risk place to prove it out.
