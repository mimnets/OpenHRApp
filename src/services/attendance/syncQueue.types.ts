import { Attendance } from '../../types';

/**
 * Local sync queue for check-in / check-out events that couldn't reach
 * PocketBase on the first try (offline, 5xx during rush hour, etc.).
 *
 * Sibling to — NOT a replacement for — the `PendingSelfie` queue in
 * `attendance.service.ts`. The selfie queue covers "record created,
 * file PATCH failed". This queue covers "record was never created."
 *
 * See Others/CHECKIN_SYNC_QUEUE_RECORD.md for rationale, lifecycle,
 * and risks.
 */

export type CheckInSyncStatus =
  | 'PENDING'      // waiting to be picked up by the drain loop
  | 'IN_FLIGHT'    // drain loop has taken ownership; don't double-send
  | 'DEAD_LETTER'; // gave up; UI should show this to the user

export interface SyncError {
  /** HTTP status if the error reached the server, else null for network
   *  / offline / CORS failures. */
  status: number | null;
  /** PocketBase error code, or a synthetic 'NETWORK' / 'ABORT' / 'UNKNOWN'. */
  code: string;
  message: string;
  /** true → drain loop should retry after backoff; false → move to
   *  DEAD_LETTER now. Set by the same classifier as `withRetry()` in
   *  `api.client.ts` so both paths agree on what's transient. */
  retryable: boolean;
}

/**
 * A single event waiting to be replayed against PocketBase.
 *
 * Lifecycle:
 *   PENDING → IN_FLIGHT → (success → removed)
 *                      → (retryable failure → PENDING, attempts++)
 *                      → (attempts ≥ maxAttempts → DEAD_LETTER)
 *                      → (non-retryable failure → DEAD_LETTER immediately)
 */
export interface CheckInSyncEntry {
  /** Client-generated id. Stable across retries — serves as an
   *  idempotency key if/when the backend supports one. */
  readonly id: string;

  /** Event kind. Open for CHECK_OUT so one queue can replay a whole
   *  day in order. */
  readonly kind: 'CHECK_IN' | 'CHECK_OUT';

  /** The payload to POST. Omits the server-assigned `id`. */
  readonly payload: Omit<Attendance, 'id'>;

  /** Wall-clock time the event happened on the device, ms since epoch.
   *  The *business* timestamp — preserves ordering even if the replay
   *  happens hours later. */
  readonly occurredAt: number;

  /** ms since epoch this entry was first added to the queue. */
  readonly queuedAt: number;

  /** Mutable — updated on each attempt. */
  status: CheckInSyncStatus;
  attempts: number;
  lastAttemptAt: number | null;
  /** Earliest ms-since-epoch at which the next retry is allowed. Lets
   *  the drain loop skip entries still in backoff without resorting. */
  nextEligibleAt: number;
  lastError: SyncError | null;

  /** Per-entry ceiling; defaults to QUEUE_DEFAULTS.maxAttempts. */
  readonly maxAttempts: number;

  /** Schema version for the serialized shape. Bump on interface change
   *  so `readQueue()` can migrate or discard old entries instead of
   *  crashing on JSON.parse. */
  readonly schemaVersion: 1;
}

/**
 * Persisted envelope. Wrapping the array in an object means we can
 * evolve the format (add a cursor, rotation marker, etc.) without
 * another migration.
 */
export interface CheckInSyncQueueEnvelope {
  schemaVersion: 1;
  entries: CheckInSyncEntry[];
}

export interface EnqueueInput {
  kind: CheckInSyncEntry['kind'];
  payload: CheckInSyncEntry['payload'];
  occurredAt: number;
  /** Optional per-entry override of maxAttempts. */
  maxAttempts?: number;
}

/**
 * Public API. Kept narrow so the storage backend (localStorage today,
 * IndexedDB later for large queues) can be swapped without touching
 * callers.
 */
export interface CheckInSyncQueue {
  /** Add a new event. Returns the generated entry so the caller can
   *  show it optimistically in the UI. */
  enqueue(input: EnqueueInput): CheckInSyncEntry;

  /** Atomically flip one eligible PENDING entry to IN_FLIGHT and return
   *  it (null if none eligible). Two-step hand-off with mark*() is
   *  what prevents two tabs from double-sending the same entry. */
  pickNext(now?: number): CheckInSyncEntry | null;

  markSuccess(id: string): void;
  markFailure(id: string, err: SyncError, now?: number): void;

  /** Read-only views for UI. */
  list(filter?: { status?: CheckInSyncStatus }): readonly CheckInSyncEntry[];
  size(filter?: { status?: CheckInSyncStatus }): number;

  /** Manual intervention. */
  remove(id: string): void;
  requeueDeadLetter(id: string): void;
  clear(): void;
}

export const QUEUE_DEFAULTS = {
  storageKey: 'openhr_checkin_sync_queue',
  maxAttempts: 5,
  /** Same backoff shape as `withRetry` in api.client.ts, extended for
   *  long outages. */
  backoffMs: [250, 750, 2_000, 10_000, 60_000],
  /** DEAD_LETTER entries older than this are dropped on the next
   *  read — prevents unbounded growth on wedged clients. */
  deadLetterTtlMs: 14 * 24 * 60 * 60 * 1000,
  /** Soft cap on total entries. Above this, enqueue throws so the UI
   *  surfaces the problem instead of silently losing old work. */
  maxEntries: 500,
} as const;
