# Check-In Sync Queue — Feature Record

**Date:** 2026-04-21
**Branch:** `localdev`
**Trigger:** Design + implementation of a local sync queue for check-in data that survives offline / 5xx rush-hour failures.
**Scope:** Frontend only (`src/services/attendance/*`, `src/services/attendance.service.ts`, `src/services/hrService.ts`, `src/hooks/attendance/useAttendance.ts`). No backend / `pb_hooks` changes. No frozen-module changes — `session/sessionManager.ts`, `workday/workdaySessionManager.ts`, `AuthContext.tsx`, `pb_hooks/cron.pb.js`, `validate-pb-hooks.cjs` are all untouched.

---

## Why this exists

Before this change, a failed check-in (offline, network blip, PocketBase 503 during the 9 AM rush) was lost. The UI showed "Failed to submit attendance. Please try again." and the user had to re-tap through the camera + location flow. Two problems:

1. Users gave up after 1–2 tries on flaky networks, leading to missing attendance records for legitimate presences.
2. The existing `PendingSelfie` queue only covers the *post-create* selfie PATCH. If the core `create` itself failed, there was nothing to retry.

The check-in sync queue fills this gap. It runs alongside the selfie queue, not in its place.

---

## What's in this commit

### New files

- `src/services/attendance/syncQueue.types.ts` — the public interface:
  - `CheckInSyncEntry` — the persisted shape, with client-generated `id`, `kind`, `payload`, `occurredAt`, `queuedAt`, mutable status/attempts/nextEligibleAt/lastError, and a `schemaVersion` on every entry.
  - `CheckInSyncQueue` — the narrow public API (`enqueue`, `pickNext`, `markSuccess`, `markFailure`, `list`, `size`, `remove`, `requeueDeadLetter`, `clear`).
  - `SyncError` — `{ status, code, message, retryable }`. Same retryable predicate as `withRetry` in `api.client.ts`.
  - `QUEUE_DEFAULTS` — storageKey, maxAttempts=5, backoffMs=[250, 750, 2000, 10000, 60000], deadLetterTtlMs=14 days, maxEntries=500.

- `src/services/attendance/syncQueue.ts` — localStorage-backed implementation:
  - `createCheckInSyncQueue()` factory so tests can build isolated instances.
  - `checkInSyncQueue` shared singleton for app code.
  - `classifySyncError()` — turns a PocketBase/fetch error into a `SyncError`. Mirrors `withRetry`'s classifier so both paths agree on transience.
  - Schema-versioned envelope. `readEnvelope` discards incompatible formats rather than crashing on `JSON.parse`.
  - DEAD_LETTER entries evicted past the 14-day TTL on every read.

### Modified files

- `src/services/attendance.service.ts`
  - Factored the PocketBase payload builder out into `buildAttendancePayload(data, orgId)` so the inline create path and the queue-drain path can't drift.
  - `saveAttendance` wraps the `create` call in try/catch; on any failure, enqueues the payload and rethrows so the existing UI toast still shows. The happy path is unchanged (same calls in the same order).
  - New `drainCheckInQueue()` — walks up to 10 eligible entries per tick, replays them through the same payload builder, hands queued selfies off to the existing `uploadSelfieWithRetry` ladder, and stops on the first failure so one dead network doesn't burn the entire backoff budget in one tick.

- `src/services/hrService.ts` — exposes `drainCheckInQueue`.

- `src/hooks/attendance/useAttendance.ts` — `refreshData()` now fires `drainCheckInQueue()` alongside `retryPendingSelfies()`. Fire-and-forget, same pattern.

---

## Interface at a glance

```
enqueue({ kind, payload, occurredAt })  →  entry
pickNext()                               →  entry | null  (flips PENDING → IN_FLIGHT)
markSuccess(id)                          →  void          (removes entry)
markFailure(id, err)                     →  void          (PENDING+backoff, or DEAD_LETTER)
list({ status? })                        →  readonly entry[]
size({ status? })                        →  number
remove(id)  requeueDeadLetter(id)  clear()
```

Lifecycle:

```
PENDING ──pickNext()──▶ IN_FLIGHT ──success──▶ (removed)
   ▲                        │
   │                        ├──retryable & attempts < max──▶ PENDING (nextEligibleAt = now + backoff)
   │                        │
   │                        └──non-retryable OR attempts ≥ max──▶ DEAD_LETTER (TTL 14 days)
   │                                                                   │
   └──────────────────── requeueDeadLetter(id) ────────────────────────┘
```

---

## Key design choices

1. **Separate from `PendingSelfie`.** Different failure mode (record never created vs. file PATCH failed), different payload, different idempotency story. Merging them would push complexity into both.

2. **Client-generated `id` + business `occurredAt`.** The server `id` only exists *after* a successful POST — exactly the thing that might not happen. The client `id` gives a stable dedupe key across retries; `occurredAt` preserves ordering even if replay happens hours later. `pickNext` sorts by `occurredAt` not `queuedAt`, so an offline-backfilled event doesn't jump the queue.

3. **Three-state status with IN_FLIGHT hand-off.** Prevents double-send across tabs. Not truly atomic against a hostile reload mid-write, but the client `id` is the idempotency key when the backend grows one.

4. **`retryable` lives on the error, not inferred by the queue.** The caller who made the HTTP request already has the classification (via `classifySyncError`); don't re-derive it. Keeps the queue stupid and the classifier single-source-of-truth.

5. **`nextEligibleAt` field instead of sorting by `lastAttemptAt + backoff`.** The drain loop iterates once and skips; no resort on each tick.

6. **`schemaVersion` on entry AND envelope.** A future format change won't wipe queued entries — `readEnvelope` either migrates or discards, never crashes.

7. **DEAD_LETTER stays visible, with a 14-day TTL.** Silently dropping a user's check-in on the final retry is worse than surfacing it. `requeueDeadLetter` lets manual intervention bring it back to PENDING.

8. **Drain stops on first failure.** If the network is wedged for one entry it's wedged for all. Stops us from burning 10 retries in 2 seconds right after a reconnect attempt fails.

9. **Drain is capped at 10 per tick.** Rush-hour reconnects mean many users' queues drain at once — capping per-tick prevents one user's 50-entry queue from monopolizing the check-in screen's mount.

10. **Payload builder is shared.** Inline save and queue drain call the same `buildAttendancePayload`. Can't drift.

11. **Queued selfies flow through the existing ladder.** The `PendingSelfie` queue is untouched; `drainCheckInQueue` just hands successful creates off to `uploadSelfieWithRetry` the same way `saveAttendance` does. No duplication.

---

## What deliberately did NOT change

- **No UI surface for DEAD_LETTER entries yet.** The queue stores them (keyed by `status: 'DEAD_LETTER'`, queryable via `list({ status: 'DEAD_LETTER' })`) but no screen surfaces them. Adding a "review failed check-ins" banner is a natural follow-up; excluded from this commit to keep blast radius small.

- **No IndexedDB backend.** localStorage is fine at 500-entry cap × ~1 KB/entry. Switching backends later only touches `syncQueue.ts` — the public interface is unchanged.

- **No cross-tab `storage` event listener.** If you enqueue in tab A and drain in tab B, tab B only learns about the new entry on its next `refreshData()`. Acceptable for now; most check-ins happen in a single tab.

- **`withRetry` not applied to the inline `create`.** If we retry inline AND enqueue on failure, we'd retry twice. The queue *is* the retry mechanism for check-ins; the inline call stays single-shot.

- **No change to `updateAttendance` (check-out path).** Check-outs that fail still bubble directly. The design supports `kind: 'CHECK_OUT'`, but wiring it requires handling "which record to PATCH" — the stored record id might not exist if the check-in is still queued. That's a solvable ordering problem, deferred until we see it in production.

- **No frozen-module changes.** Verified: `session/sessionManager.ts`, `workday/workdaySessionManager.ts`, `AuthContext.tsx`, `pb_hooks/cron.pb.js`, `validate-pb-hooks.cjs` — untouched.

---

## Risks and how to tell if something regressed

| Risk | Symptom | Where to look |
|---|---|---|
| Queue grows unbounded | localStorage quota errors; console `[SyncQueue] Queue full` | `syncQueue.ts` — `maxEntries` check in `enqueue()`. If seen, investigate why drain isn't running (check `useAttendance.refreshData` is firing). |
| Double-send across tabs | Duplicate attendance records on the same day for the same user at ~the same check_in time | IN_FLIGHT marker — verify the stored envelope flips status before the HTTP call resolves. Backend idempotency key would be the robust fix. |
| Queued retry after org switch | Attendance record saved under the wrong `organization_id` | `drainCheckInQueue` uses `entry.payload.organizationId` in preference to the current `orgId` — the stored org wins, so switching orgs mid-session is safe. |
| Non-retryable error silently lost | User taps Check In, sees "Failed", nothing in the queue to retry | By design: non-retryable (4xx business errors) still enqueue but land straight in DEAD_LETTER. Until there's a UI surface, they're invisible. Follow-up: add a banner. |
| `JSON.parse` crash on format change | Check-in screen crashes on mount after deploy | `readEnvelope` discards incompatible `schemaVersion`. If this ever crashes, it means the try/catch was removed. |
| Selfie uploads from queued entries fail silently | Queued check-in syncs but the selfie never attaches | Same `uploadSelfieWithRetry` ladder as the inline path, which has its own localStorage queue with 7-day TTL. Two queues compose; selfie queue owns its own recovery. |
| Drain monopolizes network on boot | Check-in screen hangs for seconds after login on a large queue | 10-per-tick cap in `drainCheckInQueue`. If seen, lower the cap or switch to `setTimeout` between drains. |
| Sessions/auth affected | Users logged out during queue drain | Drain only calls `pb.collection('attendance').create` and the selfie ladder — neither touches `authStore`. `classifySyncError` also does not retry on 401/403, so auth errors go straight to DEAD_LETTER and never touch `sessionManager`. |

---

## How to revert

Changes are localized. To fully roll back:

1. `src/hooks/attendance/useAttendance.ts` — remove the `drainCheckInQueue` fire-and-forget block (lines added after `retryPendingSelfies`).
2. `src/services/hrService.ts` — remove the `drainCheckInQueue` export.
3. `src/services/attendance.service.ts` — revert `saveAttendance` to its previous inline `create` (no try/catch+enqueue) and delete the `drainCheckInQueue` method + `buildAttendancePayload` helper + the two new imports.
4. Delete `src/services/attendance/syncQueue.ts` and `src/services/attendance/syncQueue.types.ts`.

Or simply `git revert <commit-sha>`.

No backend changes to unwind. Users with entries in `localStorage['openhr_checkin_sync_queue']` at revert time will keep that data (it becomes orphaned until localStorage is cleared), which is harmless.

---

## Follow-ups (not in this commit)

- Add a UI surface for DEAD_LETTER entries — probably a small banner on the attendance screen: "N check-ins couldn't sync. Review."
- Support `CHECK_OUT` replay once we decide how to handle the "record id might be a queued id, not a server id" ordering problem.
- Cross-tab sync via the `storage` event so a drain in tab B can trigger a UI refresh in tab A.
- Telemetry: count of `enqueue`, `markSuccess`, `markFailure`-to-DEAD_LETTER transitions, emitted to the observability dashboard so we know how often this path is actually used.
- Wire `withRetry` from the concurrency fix onto non-critical reads that don't go through this queue (settings, announcements).
