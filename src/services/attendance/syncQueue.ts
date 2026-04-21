import {
  CheckInSyncEntry,
  CheckInSyncQueue,
  CheckInSyncQueueEnvelope,
  CheckInSyncStatus,
  EnqueueInput,
  QUEUE_DEFAULTS,
  SyncError,
} from './syncQueue.types';

/**
 * localStorage-backed implementation of `CheckInSyncQueue`.
 *
 * Persistence is read-modify-write on every mutation. That is NOT truly
 * atomic across browser tabs, but the IN_FLIGHT marker plus the
 * client-generated stable `id` give the backend enough to dedupe if it
 * ever grows an idempotency key. For a single-tab user on one device
 * (the 99% case) the two-step hand-off is race-free.
 *
 * See Others/CHECKIN_SYNC_QUEUE_RECORD.md for the full design doc.
 */

const SCHEMA_VERSION = 1 as const;

// ─── id generation ─────────────────────────────────────────────────────
// Prefer crypto.randomUUID; fall back to a time+random composite for
// older browsers. The queue doesn't need UUID-strength uniqueness, just
// collision-free within one device.
const genId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* ignore */ }
  return `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

// ─── storage envelope ──────────────────────────────────────────────────
const emptyEnvelope = (): CheckInSyncQueueEnvelope => ({
  schemaVersion: SCHEMA_VERSION,
  entries: [],
});

const readEnvelope = (storageKey: string): CheckInSyncQueueEnvelope => {
  try {
    if (typeof localStorage === 'undefined') return emptyEnvelope();
    const raw = localStorage.getItem(storageKey);
    if (!raw) return emptyEnvelope();
    const parsed = JSON.parse(raw);

    // Forward-compat: discard anything with a different schemaVersion
    // rather than crashing on a format change. Losing a queued entry
    // is better than wedging the whole check-in flow.
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.entries)) {
      console.warn('[SyncQueue] Incompatible envelope, discarding');
      return emptyEnvelope();
    }
    return parsed as CheckInSyncQueueEnvelope;
  } catch (e) {
    console.warn('[SyncQueue] Could not read envelope:', e);
    return emptyEnvelope();
  }
};

const writeEnvelope = (storageKey: string, env: CheckInSyncQueueEnvelope): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    if (env.entries.length === 0) {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(env));
  } catch (e) {
    // Quota exceeded / private browsing — warn but don't throw, the
    // check-in itself already succeeded or failed independently.
    console.warn('[SyncQueue] Could not persist envelope:', e);
  }
};

// ─── housekeeping ──────────────────────────────────────────────────────
/** Drop DEAD_LETTER entries past the TTL. Mutates in place. */
const evictExpiredDeadLetters = (
  entries: CheckInSyncEntry[],
  now: number,
  ttlMs: number,
): CheckInSyncEntry[] => {
  const cutoff = now - ttlMs;
  return entries.filter(e => !(e.status === 'DEAD_LETTER' && e.queuedAt < cutoff));
};

const nextBackoffMs = (attempts: number, backoff: readonly number[]): number => {
  // attempts is 1-based after the first failure. Clamp to the last slot
  // so long outages don't index past the array.
  const idx = Math.min(Math.max(attempts - 1, 0), backoff.length - 1);
  return backoff[idx];
};

// ─── factory ───────────────────────────────────────────────────────────
export interface CreateCheckInSyncQueueOptions {
  storageKey?: string;
  maxAttempts?: number;
  backoffMs?: readonly number[];
  deadLetterTtlMs?: number;
  maxEntries?: number;
}

export const createCheckInSyncQueue = (
  opts: CreateCheckInSyncQueueOptions = {},
): CheckInSyncQueue => {
  const storageKey = opts.storageKey ?? QUEUE_DEFAULTS.storageKey;
  const defaultMaxAttempts = opts.maxAttempts ?? QUEUE_DEFAULTS.maxAttempts;
  const backoffMs = opts.backoffMs ?? QUEUE_DEFAULTS.backoffMs;
  const deadLetterTtlMs = opts.deadLetterTtlMs ?? QUEUE_DEFAULTS.deadLetterTtlMs;
  const maxEntries = opts.maxEntries ?? QUEUE_DEFAULTS.maxEntries;

  // Helper: read → evict expired DL → return. Every public mutator
  // routes through this so evictions are automatic and lazy.
  const loadFresh = (now: number): CheckInSyncEntry[] => {
    const env = readEnvelope(storageKey);
    return evictExpiredDeadLetters(env.entries, now, deadLetterTtlMs);
  };

  const save = (entries: CheckInSyncEntry[]) => {
    writeEnvelope(storageKey, { schemaVersion: SCHEMA_VERSION, entries });
  };

  return {
    enqueue(input: EnqueueInput): CheckInSyncEntry {
      const now = Date.now();
      const entries = loadFresh(now);

      if (entries.length >= maxEntries) {
        // Don't silently drop old work. The UI can catch this and
        // surface a "sync queue full, please reconnect" message.
        throw new Error(`[SyncQueue] Queue full (${entries.length} entries)`);
      }

      const entry: CheckInSyncEntry = {
        id: genId(),
        kind: input.kind,
        payload: input.payload,
        occurredAt: input.occurredAt,
        queuedAt: now,
        status: 'PENDING',
        attempts: 0,
        lastAttemptAt: null,
        nextEligibleAt: now,
        lastError: null,
        maxAttempts: input.maxAttempts ?? defaultMaxAttempts,
        schemaVersion: SCHEMA_VERSION,
      };

      entries.push(entry);
      save(entries);
      return entry;
    },

    pickNext(now = Date.now()): CheckInSyncEntry | null {
      const entries = loadFresh(now);

      // Oldest-eligible-first preserves business ordering. `occurredAt`
      // — not `queuedAt` — so an offline-backfilled event doesn't jump
      // the line just because it was enqueued later.
      const sorted = [...entries].sort((a, b) => a.occurredAt - b.occurredAt);

      for (const e of sorted) {
        if (e.status !== 'PENDING') continue;
        if (e.nextEligibleAt > now) continue;

        // Flip to IN_FLIGHT in the *original* array so the mutation
        // survives the save.
        const target = entries.find(x => x.id === e.id)!;
        target.status = 'IN_FLIGHT';
        target.lastAttemptAt = now;
        target.attempts += 1;
        save(entries);
        return target;
      }
      return null;
    },

    markSuccess(id: string): void {
      const entries = loadFresh(Date.now());
      const idx = entries.findIndex(e => e.id === id);
      if (idx === -1) return;
      entries.splice(idx, 1);
      save(entries);
    },

    markFailure(id: string, err: SyncError, now = Date.now()): void {
      const entries = loadFresh(now);
      const target = entries.find(e => e.id === id);
      if (!target) return;

      target.lastError = err;

      // Non-retryable → DEAD_LETTER right away, don't burn attempts.
      if (!err.retryable) {
        target.status = 'DEAD_LETTER';
        save(entries);
        return;
      }

      // Retryable but we're out of attempts → DEAD_LETTER.
      if (target.attempts >= target.maxAttempts) {
        target.status = 'DEAD_LETTER';
        save(entries);
        return;
      }

      // Retryable and budget remaining → back to PENDING with backoff.
      target.status = 'PENDING';
      target.nextEligibleAt = now + nextBackoffMs(target.attempts, backoffMs);
      save(entries);
    },

    list(filter?: { status?: CheckInSyncStatus }): readonly CheckInSyncEntry[] {
      const entries = loadFresh(Date.now());
      if (!filter?.status) return entries;
      return entries.filter(e => e.status === filter.status);
    },

    size(filter?: { status?: CheckInSyncStatus }): number {
      return this.list(filter).length;
    },

    remove(id: string): void {
      const entries = loadFresh(Date.now()).filter(e => e.id !== id);
      save(entries);
    },

    requeueDeadLetter(id: string): void {
      const now = Date.now();
      const entries = loadFresh(now);
      const target = entries.find(e => e.id === id);
      if (!target || target.status !== 'DEAD_LETTER') return;
      target.status = 'PENDING';
      target.attempts = 0;
      target.nextEligibleAt = now;
      target.lastError = null;
      save(entries);
    },

    clear(): void {
      save([]);
    },
  };
};

/** Shared singleton for the app. Tests can build their own via the
 *  factory with a different storageKey. */
export const checkInSyncQueue: CheckInSyncQueue = createCheckInSyncQueue();

/**
 * Classifier that turns a PocketBase / fetch error into a `SyncError`.
 * Mirrors the retry predicate in `api.client.ts#withRetry` so both
 * paths agree on what's transient.
 */
export const classifySyncError = (err: any): SyncError => {
  // PocketBase auto-cancellation — not really a failure.
  if (err?.isAbort) {
    return { status: null, code: 'ABORT', message: 'request aborted', retryable: false };
  }
  const status: number | null = err?.status ?? err?.response?.status ?? null;
  const message: string =
    err?.response?.message || err?.data?.message || err?.message || 'Unknown error';

  // Network-level failure → no status. Retryable.
  if (status === null || status === 0) {
    return { status: null, code: 'NETWORK', message, retryable: true };
  }
  // Transient upstream / rate-limit.
  if (status === 429 || status === 502 || status === 503 || status === 504) {
    return { status, code: `HTTP_${status}`, message, retryable: true };
  }
  // Everything else (4xx business errors, 500) → don't retry.
  return { status, code: `HTTP_${status}`, message, retryable: false };
};
