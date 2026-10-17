import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ADVERTISING_REVOKED_MESSAGE,
  AD_DENY_SESSION_KEY,
  CONSENT_MAX_AGE_DAYS,
  CONSENT_SYNC_CHANNEL,
  CONSENT_V1_KEY,
  LEGACY_COOKIE_KEY,
  STORAGE_PROBE_KEY,
  __resetInMemoryRevocationForTests,
  advertisingAuthorization,
  applyRemoteAdvertisingRevocation,
  assessStorageCapability,
  durableAdvertisingState,
  hasAdvertisingConsent,
  parseConsentRecord,
  readConsent,
  revokeAdvertising,
  saveAnalyticsChoice,
  saveConsentChoice,
  subscribeConsentSync,
  withdrawAdvertisingConsent,
} from '../utils/adConsent';

/** Minimal BroadcastChannel double; the real one is not guaranteed in jsdom. */
class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  static unsupported = false;
  listeners: Array<(event: MessageEvent) => void> = [];
  closed = false;

  constructor(public name: string) {
    if (FakeBroadcastChannel.unsupported) throw new Error('BroadcastChannel unavailable');
    FakeBroadcastChannel.instances.push(this);
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener);
  }

  removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners = this.listeners.filter((entry) => entry !== listener);
  }

  postMessage(_data: string) {
    /* same-tab delivery is not a browser behaviour, and nothing here depends on it */
  }

  close() {
    this.closed = true;
  }

  /** Simulates a message arriving from another same-origin tab. */
  static emit(data: unknown) {
    for (const instance of FakeBroadcastChannel.instances) {
      if (instance.closed || instance.name !== CONSENT_SYNC_CHANNEL) continue;
      for (const listener of instance.listeners) listener({ data } as MessageEvent);
    }
  }
}

/**
 * Builds a `storage` event the way the platform delivers one to *other* tabs.
 *
 * `storageArea` is intentionally omitted: the constructor requires a native
 * `Storage` instance, and the controlled double that stands in for it is not one.
 * That costs nothing here — `subscribeConsentSync()` decides solely from `key` and
 * `newValue`, and the event still travels the real `window` listener path, so these
 * tests exercise the production handler rather than calling into it directly.
 */
const storageEvent = (
  key: string | null,
  newValue: string | null,
  oldValue: string | null = null,
) =>
  new StorageEvent('storage', {
    key,
    newValue,
    oldValue,
    url: 'https://openhrapp.com/blog',
  });

/**
 * Consent storage state machine (M-10).
 *
 * Every case here runs against local mocks only: no provider is contacted, no network is
 * involved, and the failure modes are produced by a `TestStorage` double that refuses the
 * named operations for real — see the note above it. Refusals are armed per key, which is
 * what lets a case say "the durable write fails while the tab-scoped one succeeds", the
 * precise M-08 edge case.
 */

/**
 * A storage double that genuinely refuses the operations a test names.
 *
 * M-13 found that `vi.spyOn(Storage.prototype, 'removeItem')` never intercepted jsdom's
 * `localStorage`: the methods live on the object, not on the prototype, so the "blocked
 * removal" cases were silently performing a real deletion and asserting against a state
 * that never existed. Spying is therefore abandoned here in favour of replacing
 * `window.localStorage` / `window.sessionStorage` with instances of this class, which the
 * module under test reads through `window` on every call. Failure flags are held in sets
 * that stay live, so a test can arm a refusal part-way through exactly as before.
 */
class TestStorage implements Storage {
  readonly data = new Map<string, string>();
  readonly failSet = new Set<string>();
  readonly failRemove = new Set<string>();
  failGet = false;
  /**
   * Removal "succeeds" without deleting anything — a store that lies. M-19 needs this
   * separate from `failRemove`, which throws: a capability probe must report the first as
   * ambiguous rather than treating a returned-without-error call as a confirmed deletion.
   */
  removeSilentlyFails = false;
  readonly declaredKeys = new Set<string>();

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  getItem(name: string): string | null {
    if (this.failGet) throw new Error('read blocked');
    return this.data.get(name) ?? null;
  }

  setItem(name: string, value: string): void {
    if (this.failSet.has(name)) throw new Error('QuotaExceededError');
    this.data.set(name, value);
  }

  removeItem(name: string): void {
    if (this.failRemove.has(name)) throw new Error('SecurityError');
    if (this.removeSilentlyFails) return;
    this.data.delete(name);
  }

  clear(): void {
    this.data.clear();
    this.failSet.clear();
    this.failRemove.clear();
    this.failGet = false;
    this.removeSilentlyFails = false;
  }

  /** Test-only seeding that ignores armed failures, to establish a starting state. */
  seed(name: string, value: string): void {
    this.data.set(name, value);
  }

  [name: string]: unknown;
}

const local = new TestStorage();
const session = new TestStorage();

function installStorageDoubles(): void {
  Object.defineProperty(window, 'localStorage', { configurable: true, writable: true, value: local });
  Object.defineProperty(window, 'sessionStorage', { configurable: true, writable: true, value: session });
}

const blockWritesFor = (keys: string[]) => {
  for (const key of keys) {
    local.failSet.add(key);
    session.failSet.add(key);
  }
};

/**
 * Arms removal failures for a chosen store.
 *
 * The target defaults to `local`, which is what every existing call site means. It
 * exists because M-15 caught a test that claimed to simulate a `sessionStorage`
 * removal failure while only the durable store was ever armed, so the denial marker
 * was in fact deleted and the assertion proved nothing.
 */
const blockRemovalFor = (
  keys: string[],
  target: 'local' | 'session' | 'both' = 'local',
) => {
  for (const key of keys) {
    if (target === 'local' || target === 'both') local.failRemove.add(key);
    if (target === 'session' || target === 'both') session.failRemove.add(key);
  }
};

const blockReadsFor = (store: TestStorage) => {
  store.failGet = true;
};

const writeDurable = (purposes: { analytics: boolean; advertising: boolean }, updatedAt: string, advertisingAsked?: boolean) => {
  local.seed(
    CONSENT_V1_KEY,
    JSON.stringify({ version: 1, updatedAt, purposes, ...(advertisingAsked === undefined ? {} : { advertisingAsked }) }),
  );
};

const freshTimestamp = () => new Date().toISOString();

beforeEach(() => {
  installStorageDoubles();
  local.clear();
  session.clear();
  __resetInMemoryRevocationForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  __resetInMemoryRevocationForTests();
});

describe('a visitor who has decided nothing', () => {
  it('denies advertising and records no source', () => {
    const state = readConsent();
    expect(state).toEqual({
      analytics: false,
      advertising: false,
      advertisingDecided: false,
      advertisingDecision: 'not-asked',
      analyticsDecided: false,
      source: 'none',
      updatedAt: null,
    });
    expect(hasAdvertisingConsent()).toBe(false);
    expect(advertisingAuthorization()).toMatchObject({ authorized: false, revokedInMemory: false });
  });

  it('treats unreadable storage as denial rather than as an error', () => {
    blockReadsFor(local);
    expect(readConsent().advertising).toBe(false);
    expect(hasAdvertisingConsent()).toBe(false);
  });
});

describe('legacy analytics consent is never advertising consent', () => {
  it('maps "accepted" to analytics only, and does not write anything', () => {
    window.localStorage.setItem(LEGACY_COOKIE_KEY, 'accepted');
    const state = readConsent();
    expect(state.analytics).toBe(true);
    expect(state.advertising).toBe(false);
    expect(state.advertisingDecided).toBe(false);
    expect(state.source).toBe('legacy');
    expect(hasAdvertisingConsent()).toBe(false);
    expect(window.localStorage.getItem(CONSENT_V1_KEY)).toBeNull();
  });

  it('maps "declined" to nothing at all', () => {
    window.localStorage.setItem(LEGACY_COOKIE_KEY, 'declined');
    const state = readConsent();
    expect(state.analytics).toBe(false);
    expect(state.advertising).toBe(false);
  });

  it('leaves an unrecognised legacy value treated as no decision', () => {
    window.localStorage.setItem(LEGACY_COOKIE_KEY, 'maybe');
    expect(readConsent().source).toBe('none');
  });
});

describe('explicit choices', () => {
  it('records advertising approval only when it is given explicitly', () => {
    expect(saveConsentChoice({ analytics: true, advertising: true })).toBe(true);
    expect(hasAdvertisingConsent()).toBe(true);
    expect(readConsent().advertisingDecided).toBe(true);
    expect(window.sessionStorage.getItem(AD_DENY_SESSION_KEY)).toBeNull();
  });

  it('records advertising refusal and keeps analytics intact', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    expect(saveConsentChoice({ analytics: true, advertising: false })).toBe(true);
    expect(hasAdvertisingConsent()).toBe(false);
    expect(readConsent().analytics).toBe(true);
    expect(window.sessionStorage.getItem(AD_DENY_SESSION_KEY)).not.toBeNull();
  });

  it('never reads a missing purpose field as permission', () => {
    writeDurable({} as { analytics: boolean; advertising: boolean }, freshTimestamp());
    expect(readConsent().advertising).toBe(false);
    expect(hasAdvertisingConsent()).toBe(false);
  });
});

describe('a successful withdrawal', () => {
  it('revokes in memory, persists, and is safe to reset the document', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    const result = revokeAdvertising();
    expect(result).toMatchObject({
      authorized: false,
      revokedInMemory: true,
      revokedForTab: true,
      persisted: true,
      safeToResetDocument: true,
    });
    expect(withdrawAdvertisingConsent()).toBe(true);
    expect(readConsent().advertising).toBe(false);
  });

  it('does not touch the analytics choice', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    revokeAdvertising();
    expect(readConsent().analytics).toBe(true);
  });
});

describe('storage failures', () => {
  it('reports no durable persistence when the write throws, but still denies', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    blockWritesFor([CONSENT_V1_KEY]);

    const result = revokeAdvertising();
    expect(result.persisted).toBe(false);
    expect(result.authorized).toBe(false);
    expect(result.revokedInMemory).toBe(true);
    // The tab-scoped mirror landed, so a reload in this tab stays denied.
    expect(result.safeToResetDocument).toBe(true);
    expect(window.sessionStorage.getItem(AD_DENY_SESSION_KEY)).not.toBeNull();
  });

  it('still denies after a reload-like reset of in-memory state when the tab mirror survived', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    blockWritesFor([CONSENT_V1_KEY]);
    revokeAdvertising();

    // Simulate the document being thrown away and re-created: the in-memory flag is gone,
    // but the tab-scoped denial is not. This is what makes the document reset meaningful.
    __resetInMemoryRevocationForTests();
    expect(hasAdvertisingConsent()).toBe(false);
    expect(advertisingAuthorization().revokedForTab).toBe(true);
  });

  it('refuses to claim the tab is safe when both writes fail', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    blockWritesFor([CONSENT_V1_KEY, AD_DENY_SESSION_KEY]);
    // This is the negative case: nothing at all may change on disk, so the grant has to
    // survive and be shown as still readable. Without this line the delete-and-confirm
    // path succeeds and the test would silently describe a different scenario.
    blockRemovalFor([CONSENT_V1_KEY]);

    const result = revokeAdvertising();
    expect(result.persisted).toBe(false);
    expect(result.tabDenied).toBe(false);
    expect(result.durableCleared).toBe(false);
    expect(result.durableState).toBe('granted');
    expect(readConsent().advertising).toBe(true);
    expect(result.authorized).toBe(false);
    // In memory only: a reload would fall back to the surviving stale grant, so resetting
    // the document is NOT safe and the UI must say so instead of implying completion.
    expect(result.safeToResetDocument).toBe(false);
  });

  it('keeps denying when a denial marker could not be removed', () => {
    blockWritesFor([CONSENT_V1_KEY]);
    revokeAdvertising();
    // The marker lives in sessionStorage, so that is the store whose removal must fail.
    blockRemovalFor([AD_DENY_SESSION_KEY], 'session');

    // An explicit grant cannot clear a marker that is still stuck in place.
    saveConsentChoice({ analytics: true, advertising: true });
    expect(window.sessionStorage.getItem(AD_DENY_SESSION_KEY)).not.toBeNull();
    expect(hasAdvertisingConsent()).toBe(false);
    expect(advertisingAuthorization().revokedForTab).toBe(true);
  });

  it('reports failure rather than success when writes throw but reads still work', () => {
    writeDurable({ analytics: true, advertising: true }, freshTimestamp());
    expect(hasAdvertisingConsent()).toBe(true);

    blockWritesFor([CONSENT_V1_KEY, AD_DENY_SESSION_KEY]);
    blockRemovalFor([CONSENT_V1_KEY]);
    expect(withdrawAdvertisingConsent()).toBe(false);
    expect(readConsent().advertising).toBe(true); // stale record still on disk
    expect(hasAdvertisingConsent()).toBe(false); // but in-memory revocation outranks it
  });
});

describe('revocation precedence', () => {
  it('a previous grant never overrides a revocation', () => {
    writeDurable({ analytics: true, advertising: true }, freshTimestamp());
    window.sessionStorage.setItem(AD_DENY_SESSION_KEY, '1');
    expect(hasAdvertisingConsent()).toBe(false);
    expect(advertisingAuthorization()).toMatchObject({
      authorized: false,
      revokedForTab: true,
      hasDurableRecord: true,
    });
  });

  it('an in-memory revocation outranks even a durable grant', () => {
    writeDurable({ analytics: true, advertising: true }, freshTimestamp());
    blockWritesFor([CONSENT_V1_KEY, AD_DENY_SESSION_KEY]);
    blockRemovalFor([CONSENT_V1_KEY]);
    const result = revokeAdvertising();
    expect(result.safeToResetDocument).toBe(false);
    __resetInMemoryRevocationForTests();
    // With both layers gone the stale grant would authorise again — which is exactly why a
    // document reset must not be attempted in that state.
    expect(hasAdvertisingConsent()).toBe(true);
  });
});

describe('an analytics answer is never an advertising answer', () => {
  it('records no advertising decision when analytics is accepted while Monetag is off', () => {
    expect(saveAnalyticsChoice(true)).toBe(true);
    const state = readConsent();
    expect(state.analytics).toBe(true);
    expect(state.analyticsDecided).toBe(true);
    expect(state.advertisingDecision).toBe('not-asked');
    expect(state.advertisingDecided).toBe(false);
    expect(hasAdvertisingConsent()).toBe(false);
    // Declining nothing is not the same as declining something.
    expect(window.sessionStorage.getItem(AD_DENY_SESSION_KEY)).toBeNull();
  });

  it('records no advertising decision when analytics is declined', () => {
    expect(saveAnalyticsChoice(false)).toBe(true);
    const state = readConsent();
    expect(state.analytics).toBe(false);
    expect(state.advertisingDecision).toBe('not-asked');
    expect(state.advertisingDecided).toBe(false);
  });

  it('leaves an existing revocation in place when analytics preferences are saved', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    revokeAdvertising();
    expect(hasAdvertisingConsent()).toBe(false);
    expect(saveAnalyticsChoice(false)).toBe(true);
    expect(hasAdvertisingConsent()).toBe(false);
    expect(window.sessionStorage.getItem(AD_DENY_SESSION_KEY)).not.toBeNull();
  });

  it('does not turn a stored grant into live consent when analytics is re-saved', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    revokeAdvertising();
    saveAnalyticsChoice(true);
    // The durable grant may still exist; what must not change is that this tab denies.
    expect(hasAdvertisingConsent()).toBe(false);
    expect(advertisingAuthorization().revokedForTab).toBe(true);
  });

  it('records an explicit refusal as a refusal', () => {
    saveConsentChoice({ analytics: true, advertising: false }, { advertisingAsked: true });
    expect(readConsent().advertisingDecision).toBe('declined');
    expect(readConsent().advertisingDecided).toBe(true);
  });

  it('records an explicit grant as a grant', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    expect(readConsent().advertisingDecision).toBe('granted');
    expect(hasAdvertisingConsent()).toBe(true);
  });
});

describe('migration of records written before the three-state model', () => {
  it('treats a stored false with no asked marker as never asked, never as a refusal', () => {
    writeDurable({ analytics: true, advertising: false }, freshTimestamp());
    const state = readConsent();
    expect(state.advertisingDecision).toBe('not-asked');
    expect(state.advertisingDecided).toBe(false);
    // Reclassifying as "not asked" can only ever withhold consent, never grant it.
    expect(hasAdvertisingConsent()).toBe(false);
  });

  it('honours the same record as a refusal once it says the question was asked', () => {
    writeDurable({ analytics: true, advertising: false }, freshTimestamp(), true);
    expect(readConsent().advertisingDecision).toBe('declined');
  });

  it('reads a stored grant as a grant with or without the marker', () => {
    writeDurable({ analytics: true, advertising: true }, freshTimestamp());
    expect(readConsent().advertisingDecision).toBe('granted');
    expect(hasAdvertisingConsent()).toBe(true);
  });

  it('never parses malformed input into a grant', () => {
    expect(parseConsentRecord(null)).toBeNull();
    expect(parseConsentRecord('nope')).toBeNull();
    expect(parseConsentRecord('[]')).toBeNull();
    expect(parseConsentRecord('{"version":2,"purposes":{"advertising":true}}')).toBeNull();
    expect(parseConsentRecord('{"version":1,"purposes":{"advertising":"true"}}')).toEqual(
      expect.objectContaining({ purposes: { analytics: false, advertising: false } }),
    );
  });
});

describe('same-origin revocation signalling', () => {
  let received: number;

  // Every subscription taken in this block is registered here and torn down afterwards,
  // so a leaked listener cannot inflate another test's counts — which is exactly what
  // M-13's "expected 0, received 1" / "expected 4, received 16" failures were.
  const cleanups: Array<() => void> = [];
  const subscribe = (handler: () => void) => {
    const unsubscribeSync = subscribeConsentSync(handler);
    cleanups.push(unsubscribeSync);
    return unsubscribeSync;
  };

  beforeEach(() => {
    received = 0;
    FakeBroadcastChannel.instances = [];
    FakeBroadcastChannel.unsupported = false;
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
  });

  afterEach(() => {
    while (cleanups.length > 0) {
      const dispose = cleanups.pop();
      try {
        dispose?.();
      } catch {
        /* teardown must not mask the assertion that failed */
      }
    }
  });

  it('uses the documented same-origin channel name only', () => {
    const unsubscribe = subscribe(() => { received += 1; });
    expect(FakeBroadcastChannel.instances[0]?.name).toBe(CONSENT_SYNC_CHANNEL);
    unsubscribe();
  });

  it('denies advertising when another tab revokes it', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    expect(hasAdvertisingConsent()).toBe(true);
    __resetInMemoryRevocationForTests();
    window.sessionStorage.clear();

    const unsubscribe = subscribe(() => {
      received += 1;
      applyRemoteAdvertisingRevocation();
    });
    FakeBroadcastChannel.emit(ADVERTISING_REVOKED_MESSAGE);

    expect(received).toBe(1);
    expect(hasAdvertisingConsent()).toBe(false);
    expect(window.sessionStorage.getItem(AD_DENY_SESSION_KEY)).not.toBeNull();
    unsubscribe();
  });

  it('ignores a message that appears to grant consent', () => {
    const unsubscribe = subscribe(() => { received += 1; });
    FakeBroadcastChannel.emit('advertising-granted');
    FakeBroadcastChannel.emit({ pretend: 'object payload' });
    FakeBroadcastChannel.emit(undefined);
    expect(received).toBe(0);
    expect(hasAdvertisingConsent()).toBe(false);
    unsubscribe();
  });

  it('treats repeat notifications as repeat denials, not as anything stronger', () => {
    const unsubscribe = subscribe(() => {
      received += 1;
      applyRemoteAdvertisingRevocation();
    });
    FakeBroadcastChannel.emit(ADVERTISING_REVOKED_MESSAGE);
    FakeBroadcastChannel.emit(ADVERTISING_REVOKED_MESSAGE);
    expect(received).toBe(2);
    expect(advertisingAuthorization().revokedForTab).toBe(true);
    unsubscribe();
  });

  it('survives a BroadcastChannel that cannot be constructed', () => {
    FakeBroadcastChannel.unsupported = true;
    expect(() => subscribe(() => { received += 1; })).not.toThrow();
    // The storage path still works on its own.
    window.dispatchEvent(storageEvent(CONSENT_V1_KEY, null));
    expect(received).toBe(1);
  });

  it('removes both listeners on cleanup', () => {
    const unsubscribe = subscribe(() => { received += 1; });
    unsubscribe();
    unsubscribe(); // idempotent
    window.dispatchEvent(storageEvent(CONSENT_V1_KEY, null));
    FakeBroadcastChannel.emit(ADVERTISING_REVOKED_MESSAGE);
    expect(received).toBe(0);
  });

  it('survives being subscribed more than once, as StrictMode does', () => {
    const first = subscribe(() => { received += 1; });
    const second = subscribe(() => { received += 1; });
    window.dispatchEvent(storageEvent(CONSENT_V1_KEY, null));
    expect(received).toBe(2);
    first();
    second();
  });

  it('is unaffected by storage changes to other keys', () => {
    const unsubscribe = subscribe(() => { received += 1; });
    window.dispatchEvent(storageEvent(LEGACY_COOKIE_KEY, 'accepted'));
    window.dispatchEvent(storageEvent('unrelated', 'anything'));
    expect(received).toBe(0);
    unsubscribe();
  });

  it('reacts to deletion, refusal and corruption, and ignores a fresh grant', () => {
    const unsubscribe = subscribe(() => { received += 1; });
    window.dispatchEvent(storageEvent(CONSENT_V1_KEY, null));
    window.dispatchEvent(storageEvent(CONSENT_V1_KEY, '{corrupt'));
    window.dispatchEvent(
      storageEvent(CONSENT_V1_KEY, JSON.stringify({ version: 1, purposes: { analytics: true, advertising: false }, advertisingAsked: true })),
    );
    window.dispatchEvent(
      storageEvent(CONSENT_V1_KEY, JSON.stringify({ version: 1, purposes: { analytics: true, advertising: true } })),
    );
    window.dispatchEvent(storageEvent(null, null)); // whole-area clear
    // Four denials, and the grant in the middle is not one of them.
    expect(received).toBe(4);
    unsubscribe();
  });
});

describe('withdrawal when storage cannot be trusted', () => {
  it('clears a stale grant by removal when the write is refused, making a reload safe', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    expect(hasAdvertisingConsent()).toBe(true);
    __resetInMemoryRevocationForTests();

    blockWritesFor([CONSENT_V1_KEY]);
    const result = revokeAdvertising();

    expect(result.persisted).toBe(false);
    expect(result.durableCleared).toBe(true);
    expect(result.safeToResetDocument).toBe(true);
    expect(readConsent().advertisingDecision).toBe('not-asked');
    // A cleared record is not the same guarantee as a written refusal, so the narrow
    // "did the durable write land" answer stays false. withdrawAdvertisingConsent() keeps
    // that meaning deliberately.
    expect(withdrawAdvertisingConsent()).toBe(false);
  });

  it('refuses to call a reload safe when write and removal are both refused', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    __resetInMemoryRevocationForTests();

    blockWritesFor([CONSENT_V1_KEY, AD_DENY_SESSION_KEY]);
    blockRemovalFor([CONSENT_V1_KEY]);
    const result = revokeAdvertising();

    expect(result.persisted).toBe(false);
    expect(result.durableCleared).toBe(false);
    // A reload here would read the surviving grant, so nothing may navigate on that promise.
    expect(result.safeToResetDocument).toBe(false);
    expect(result.authorized).toBe(false);
    expect(readConsent().advertisingDecision).toBe('granted');
  });

  it('reports no durable persistence on unwritable but readable storage', () => {
    blockWritesFor([CONSENT_V1_KEY]);
    expect(saveConsentChoice({ analytics: true, advertising: true })).toBe(false);
    expect(hasAdvertisingConsent()).toBe(false);
    expect(readConsent().advertisingDecision).toBe('not-asked');
  });

  it('denies rather than grants when sessionStorage is unavailable', () => {
    const original = window.sessionStorage;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    try {
      saveConsentChoice({ analytics: true, advertising: false }, { advertisingAsked: true });
      expect(hasAdvertisingConsent()).toBe(false);
      expect(advertisingAuthorization().revokedInMemory).toBe(true);
    } finally {
      Object.defineProperty(window, 'sessionStorage', { configurable: true, value: original });
    }
  });
});

describe('M-14 durable-state verification', () => {
  it('1. durable write refused, tab-scoped denial succeeds: safe to reset, honestly reported', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    __resetInMemoryRevocationForTests();
    blockWritesFor([CONSENT_V1_KEY]);

    const result = revokeAdvertising();
    // Only the durable *write* was refused. The grant was then removed and its absence
    // confirmed on a successful re-read, so navigation safety here derives from verified
    // absence — and `persisted` must stay false, because nothing was ever written.
    expect(result.persisted).toBe(false);
    expect(result.tabDenied).toBe(true);
    expect(result.durableState).toBe('absent');
    expect(result.durableCleared).toBe(true);
    expect(readConsent().advertising).toBe(false);
    expect(result.safeToResetDocument).toBe(true);
    expect(result.authorized).toBe(false);
  });

  it('2. durable and tab-scoped writes both refused: no reset is authorised', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    __resetInMemoryRevocationForTests();
    blockWritesFor([CONSENT_V1_KEY, AD_DENY_SESSION_KEY]);
    blockRemovalFor([CONSENT_V1_KEY]);

    const result = revokeAdvertising();
    expect(result.persisted).toBe(false);
    expect(result.tabDenied).toBe(false);
    expect(result.durableCleared).toBe(false);
    expect(result.durableState).toBe('granted');
    expect(result.safeToResetDocument).toBe(false);
    expect(result.authorized).toBe(false);
  });

  it('3. removal refused while a grant stays readable: nothing is reported as cleared', () => {
    writeDurable({ analytics: true, advertising: true }, freshTimestamp());
    blockWritesFor([CONSENT_V1_KEY, AD_DENY_SESSION_KEY]);
    blockRemovalFor([CONSENT_V1_KEY]);

    const result = revokeAdvertising();
    expect(result.durableState).toBe('granted');
    expect(result.durableCleared).toBe(false);
    expect(result.safeToResetDocument).toBe(false);
  });

  it('4. removal succeeded and absence is confirmed: the grant is verifiably cleared', () => {
    writeDurable({ analytics: true, advertising: true }, freshTimestamp());
    blockWritesFor([CONSENT_V1_KEY, AD_DENY_SESSION_KEY]);

    const result = revokeAdvertising();
    expect(result.durableState).toBe('absent');
    expect(result.durableCleared).toBe(true);
    expect(result.tabDenied).toBe(false);
    expect(result.safeToResetDocument).toBe(true);
    // A removed record is not the same guarantee as a written refusal.
    expect(result.persisted).toBe(false);
    expect(withdrawAdvertisingConsent()).toBe(false);
  });

  it('5. a storage read failure is never taken for confirmed deletion', () => {
    writeDurable({ analytics: true, advertising: true }, freshTimestamp());
    blockWritesFor([CONSENT_V1_KEY, AD_DENY_SESSION_KEY]);
    blockRemovalFor([CONSENT_V1_KEY]);
    // Reads start failing after the removal attempt, exactly the state in which a naive
    // `getItem() === null` check would claim the grant had gone.
    blockReadsFor(local);

    const result = revokeAdvertising();
    expect(result.durableState).toBe('indeterminate');
    expect(result.durableCleared).toBe(false);
    expect(result.safeToResetDocument).toBe(false);
    expect(result.authorized).toBe(false);
  });

  it('6. current-document denial holds even when nothing could be stored anywhere', () => {
    writeDurable({ analytics: true, advertising: true }, freshTimestamp());
    blockWritesFor([CONSENT_V1_KEY, AD_DENY_SESSION_KEY]);
    blockRemovalFor([CONSENT_V1_KEY]);
    blockReadsFor(local);
    expect(revokeAdvertising().authorized).toBe(false);
    expect(hasAdvertisingConsent()).toBe(false);
  });

  it('7. a fresh visitor is not treated as a cleared grant', () => {
    blockWritesFor([CONSENT_V1_KEY]);
    const result = revokeAdvertising();
    // Nothing was ever granted, so `durableCleared` must not claim a removal happened.
    expect(result.durableCleared).toBe(false);
    expect(result.durableState).not.toBe('granted');
  });

  it('a valid existing durable denial is a safe state to reload into', () => {
    writeDurable({ analytics: true, advertising: false }, freshTimestamp(), true);
    blockWritesFor([CONSENT_V1_KEY, AD_DENY_SESSION_KEY]);
    blockRemovalFor([CONSENT_V1_KEY]);
    const result = revokeAdvertising();
    // Nothing had to change on disk: the record is readable and already grants nothing.
    expect(result.durableState).toBe('denied');
    expect(result.durableCleared).toBe(false);
    expect(result.tabDenied).toBe(false);
    expect(result.safeToResetDocument).toBe(true);
  });
});

describe('staleness and malformed records', () => {
  it('treats a grant older than the consent window as no decision', () => {
    const old = new Date(Date.now() - (CONSENT_MAX_AGE_DAYS + 30) * 86_400_000).toISOString();
    writeDurable({ analytics: true, advertising: true }, old);
    const state = readConsent();
    expect(state.advertisingDecided).toBe(false);
    expect(hasAdvertisingConsent()).toBe(false);
  });

  it.each([
    ['not json at all', '{{{' ],
    ['a bare array', '[]'],
    ['a null document', 'null'],
    ['the wrong version', JSON.stringify({ version: 2, purposes: { analytics: true, advertising: true } })],
    ['missing purposes', JSON.stringify({ version: 1, updatedAt: '2026-01-01T00:00:00.000Z' })],
    ['a non-boolean advertising flag', JSON.stringify({ version: 1, updatedAt: '2026-01-01T00:00:00.000Z', purposes: { analytics: true, advertising: 'yes' } })],
    ['an unparseable timestamp', JSON.stringify({ version: 1, updatedAt: 'last tuesday', purposes: { analytics: true, advertising: true } })],
    ['a timestamp in the future', JSON.stringify({ version: 1, updatedAt: new Date(Date.now() + 86_400_000).toISOString(), purposes: { analytics: true, advertising: true } })],
  ])('denies on %s', (_label, raw) => {
    window.localStorage.setItem(CONSENT_V1_KEY, raw);
    expect(readConsent().advertising).toBe(false);
    expect(hasAdvertisingConsent()).toBe(false);
  });
});

/**
 * M-19 storage capability assessment.
 *
 * The claim under test is narrow, and these cases are written to keep it narrow: a probe
 * reports what storage could do *while it was being measured*. It is not evidence about a
 * withdrawal attempted later, which is why case 7 proves the probe passing and the withdrawal
 * failing in the same test rather than assuming the two are unrelated.
 *
 * Failure flags are armed on a named store (`local.failSet.add(...)`) wherever a case needs
 * one layer to work while the other does not. `blockWritesFor` arms both, which is exactly
 * what M-15 caught a test doing wrong, so it is only used where both layers are meant to fail.
 */
describe('M-19 storage capability assessment', () => {
  it('reports durable storage as adequate when a write reads back and removal confirms', () => {
    const report = assessStorageCapability();
    expect(report.durable).toBe('adequate');
    expect(report.tabScoped).toBe('adequate');
    expect(report.adequate).toBe(true);
  });

  it('leaves no probe key behind after a successful assessment', () => {
    const report = assessStorageCapability();
    expect(report.adequate).toBe(true);
    expect(local.data.has(STORAGE_PROBE_KEY)).toBe(false);
    expect(session.data.has(STORAGE_PROBE_KEY)).toBe(false);
  });

  it('reports a refused write as unavailable, not as a failure to guess', () => {
    local.failSet.add(STORAGE_PROBE_KEY);
    const report = assessStorageCapability();
    expect(report.durable).toBe('unavailable');
    // The tab layer was never armed, so it still reports honestly and the page stays eligible.
    expect(report.tabScoped).toBe('adequate');
    expect(report.adequate).toBe(true);
  });

  it('reports a refused read-back as indeterminate and still cleans up', () => {
    blockReadsFor(local);
    blockReadsFor(session);
    const report = assessStorageCapability();
    expect(report.durable).toBe('indeterminate');
    expect(report.tabScoped).toBe('indeterminate');
    expect(report.adequate).toBe(false);
    // The probe wrote before the read failed, so cleanup must have removed it anyway.
    expect(local.data.has(STORAGE_PROBE_KEY)).toBe(false);
    expect(session.data.has(STORAGE_PROBE_KEY)).toBe(false);
  });

  it('reports a removal that throws as indeterminate rather than adequate', () => {
    local.failRemove.add(STORAGE_PROBE_KEY);
    session.failRemove.add(STORAGE_PROBE_KEY);
    const report = assessStorageCapability();
    expect(report.durable).toBe('indeterminate');
    expect(report.tabScoped).toBe('indeterminate');
    expect(report.adequate).toBe(false);
  });

  it('reports a removal that silently does nothing as indeterminate', () => {
    // A call that returns without error is not a confirmed deletion. This is the case that
    // separates `indeterminate` from `unavailable`: the store lied about cleanup, so nothing
    // may be concluded from it.
    local.removeSilentlyFails = true;
    session.removeSilentlyFails = true;
    const report = assessStorageCapability();
    expect(report.durable).toBe('indeterminate');
    expect(report.tabScoped).toBe('indeterminate');
    expect(report.adequate).toBe(false);
  });

  it('assesses the two layers independently and needs only one of them', () => {
    local.failSet.add(STORAGE_PROBE_KEY);
    const report = assessStorageCapability();
    expect(report.durable).toBe('unavailable');
    expect(report.tabScoped).toBe('adequate');
    // A tab-scoped refusal still survives the reload that terminates the vendor context,
    // which is the specific guarantee injection depends on. It does not carry to other tabs
    // or to the next session, and the banner copy says so.
    expect(report.adequate).toBe(true);
  });

  it('reports no capability at all when neither layer can be trusted', () => {
    blockWritesFor([STORAGE_PROBE_KEY]);
    expect(assessStorageCapability().adequate).toBe(false);
    local.failSet.clear();
    session.failSet.clear();
    blockReadsFor(local);
    blockReadsFor(session);
    const report = assessStorageCapability();
    expect(report.adequate).toBe(false);
    expect(report.durable).not.toBe('adequate');
    expect(report.tabScoped).not.toBe('adequate');
  });

  it('never touches a consent record, a revocation marker or the legacy key', () => {
    writeDurable({ analytics: true, advertising: true }, freshTimestamp());
    session.seed(AD_DENY_SESSION_KEY, '1');
    local.seed(LEGACY_COOKIE_KEY, 'accepted');
    const beforeDurable = local.data.get(CONSENT_V1_KEY);
    const beforeSession = session.data.get(AD_DENY_SESSION_KEY);
    const beforeLegacy = local.data.get(LEGACY_COOKIE_KEY);
    const stateBefore = readConsent();

    expect(assessStorageCapability().adequate).toBe(true);

    expect(local.data.get(CONSENT_V1_KEY)).toBe(beforeDurable);
    expect(session.data.get(AD_DENY_SESSION_KEY)).toBe(beforeSession);
    expect(local.data.get(LEGACY_COOKIE_KEY)).toBe(beforeLegacy);
    expect(readConsent()).toEqual(stateBefore);
  });

  it('grants nothing: a passing probe is not consent, and not a revocation either', () => {
    expect(assessStorageCapability().adequate).toBe(true);
    expect(hasAdvertisingConsent()).toBe(false);
    expect(advertisingAuthorization().authorized).toBe(false);
    expect(readConsent().advertisingDecision).toBe('not-asked');
    expect(readConsent().advertisingDecided).toBe(false);
    // The probe must not have written the marker that keeps a tab denying.
    expect(session.data.get(AD_DENY_SESSION_KEY)).toBeUndefined();
  });

  it('passes, and a withdrawal attempted afterwards still fails — the limitation, in one case', () => {
    expect(assessStorageCapability().adequate).toBe(true);

    writeDurable({ analytics: true, advertising: true }, freshTimestamp());
    __resetInMemoryRevocationForTests();
    // Storage breaks *after* the probe succeeded, which is precisely the gap the probe cannot
    // close. The withdrawal reports it truthfully instead of inheriting the probe's answer.
    blockWritesFor([CONSENT_V1_KEY, AD_DENY_SESSION_KEY]);
    blockRemovalFor([CONSENT_V1_KEY]);

    const result = revokeAdvertising();
    expect(result.persisted).toBe(false);
    expect(result.tabDenied).toBe(false);
    expect(result.safeToResetDocument).toBe(false);
    expect(result.durableState).toBe('granted');
  });

  it('keeps an unreadable durable layer indeterminate instead of calling it absent', () => {
    // `readConsent()` collapses unreadable into a denial, which is right for authorising and
    // wrong for deciding whether a reload is safe. This is the accessor CookieConsent uses so
    // that the second reading cannot happen.
    writeDurable({ analytics: true, advertising: true }, freshTimestamp());
    expect(durableAdvertisingState()).toBe('granted');
    blockReadsFor(local);
    const state = durableAdvertisingState();
    expect(state).toBe('indeterminate');
    // Absence and unreadability are different facts, and only the first one is verified.
    expect(state).not.toBe('absent');
    expect(state).not.toBe('denied');
  });
});
