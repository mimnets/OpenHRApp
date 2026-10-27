/**
 * Purpose-specific consent, with fail-closed withdrawal and same-origin revocation sync
 * (M-12).
 *
 * Why this file exists: the banner that used to live here recorded one string,
 * `openhr-cookie-consent`, whose only effect in the whole application was whether Google
 * Analytics loaded. Nothing in the ad code read it. Accepting that banner has never meant
 * "show me advertising", and this module does not pretend otherwise.
 *
 * Ezoic's Gatekeeper CMP was removed in M-10. There is no second consent system on this
 * site, and nothing here reads, writes, or emulates a TCF string. Monetag is never presented
 * as an IAB Framework participant.
 *
 * ── The three advertising states (M-12) ──────────────────────────────────────────
 *   'not-asked'   never shown a control   → denied, and still eligible to be asked
 *   'declined'    said no explicitly      → denied, not asked again unless they open it
 *   'granted'     said yes explicitly     → the only state that can authorize
 *
 * An analytics-only answer must never be recorded as an advertising decision, in either
 * direction: stamping it 'declined' would fabricate a refusal the visitor never made, and
 * stamping it 'granted' would be far worse. Both would also wrongly suppress the future
 * advertising question.
 *
 * ── Migration of records written before M-12 ─────────────────────────────────────
 * Those records carry no `advertisingAsked` marker. The rule is: `advertising: true` is
 * always a grant; a stored `false` counts as a real refusal **only** when the record says it
 * was asked; otherwise it is `not-asked`. So pre-M-12 records that say `false` are read as
 * never asked, which is the conservative direction — it grants nothing and only re-asks.
 *
 * The ambiguity is real and is not papered over: a genuine explicit refusal saved before
 * M-12 is indistinguishable in storage from the analytics-only write M-11 identified, so it
 * is reclassified as 'not-asked'. That is lossless in practice today because the flag-off
 * banner rendered no advertising control at all (see `CookieConsent`), so no visitor has yet
 * had the opportunity to answer either way while the feature was off — but the storage layer
 * itself cannot prove that, and does not claim to. Records that do carry `advertisingAsked`
 * are honoured exactly as written.
 *
 * ── Same-origin synchronization ─────────────────────────────────────────────────
 * Other tabs are told about a revocation, via BroadcastChannel where available and via the
 * `storage` event which is part of the web platform. Both paths are **deny-only**: a remote
 * message can remove advertising authorization and nothing else. A grant only ever comes
 * from a valid, unexpired, explicit durable record read in the tab that is about to use it,
 * and a message that says "granted" is ignored by design — otherwise a same-origin script or
 * a stale tab could talk a page into serving ads.
 *
 * ── What sessionStorage does and does not give you ───────────────────────────────
 * The tab-scoped denial marker survives a reload of the same tab, and nothing more: not
 * another tab, not a new session. It can only deny. Nothing here reports durable success it
 * did not read back.
 */

export const CONSENT_V1_KEY = 'openhr-consent-v1';
/** Read-only compatibility source. Never written by this module. */
export const LEGACY_COOKIE_KEY = 'openhr-cookie-consent';
/** Tab-scoped advertising denial. sessionStorage, so it cannot outlive the tab. */
export const AD_DENY_SESSION_KEY = 'openhr-consent-ad-denied';
/** A durable grant older than this is treated as no decision at all. */
export const CONSENT_MAX_AGE_DAYS = 365;

/**
 * Dispatched by the public-page footers to reopen the consent panel. A named constant so the
 * footers and the panel cannot drift apart; no store, router, or new dependency involved.
 */
export const CONSENT_PREFERENCES_EVENT = 'openhr:consent-preferences';

/** Off worldwide for now. Set true to show the consent banner and the footer "Cookie & Ad Preferences" link again. */
export const COOKIE_CONSENT_ENABLED = false;

/** Same-origin-only channel name; the only payload is the fixed literal below. */
export const CONSENT_SYNC_CHANNEL = 'openhr-consent-sync';
/** A revocation-only message. There is deliberately no corresponding grant message. */
export const ADVERTISING_REVOKED_MESSAGE = 'advertising-revoked';

export type ConsentSource = 'v1' | 'legacy' | 'none';
export type AdvertisingDecision = 'not-asked' | 'declined' | 'granted';

export interface ConsentPurposes {
  analytics: boolean;
  advertising: boolean;
}

export interface ConsentState extends ConsentPurposes {
  /** True only for 'granted' or 'declined' — never for 'not-asked'. */
  advertisingDecided: boolean;
  advertisingDecision: AdvertisingDecision;
  /** Any durable or legacy record answers the analytics question. */
  analyticsDecided: boolean;
  source: ConsentSource;
  updatedAt: string | null;
}

export interface AdvertisingAuthorization {
  /** May advertising run right now, in this document? */
  authorized: boolean;
  advertisingDecision: AdvertisingDecision;
  /** A withdrawal was attempted in this document; outranks everything else. */
  revokedInMemory: boolean;
  /**
   * This tab denies advertising right now, by either layer. It says nothing about whether
   * the denial survives a reload — for that, use `WithdrawalResult.tabDenied`, which is set
   * only when the tab-scoped write actually landed.
   */
  revokedForTab: boolean;
  /** A readable, unexpired durable record exists — regardless of which way it points. */
  hasDurableRecord: boolean;
}

/** What durable storage can be *shown* to say right now. See `classifyDurableRead`. */
export type DurableAdvertisingState = 'granted' | 'denied' | 'absent' | 'indeterminate';

export interface WithdrawalResult extends AdvertisingAuthorization {
  /** The revocation was written to durable storage and read back from it. */
  persisted: boolean;
  /**
   * A grant that was readable beforehand is verifiably no longer granting afterwards.
   * Requires a successful read on both sides, so it is never inferred from a failed read.
   */
  durableCleared: boolean;
  /** The denial was written to `sessionStorage`, so it survives a reload of this tab. */
  tabDenied: boolean;
  /** The durable layer's verified condition; `indeterminate` when storage could not be read. */
  durableState: DurableAdvertisingState;
  /** A revocation was posted to other same-origin tabs, or observed from one. */
  synchronized: boolean;
  /**
   * A full-document reload of this tab cannot restore advertising. Derived only from the
   * layers that survive navigation — a tab-scoped marker or a durable state that verifiably
   * does not grant. Never from in-memory revocation, which dies with the document.
   */
  safeToResetDocument: boolean;
}

interface StoredRecord {
  version: 1;
  updatedAt: string;
  purposes: ConsentPurposes;
  advertisingAsked?: boolean;
}

const DENIED_DECISION: ConsentState = {
  analytics: false,
  advertising: false,
  advertisingDecided: false,
  advertisingDecision: 'not-asked',
  analyticsDecided: false,
  source: 'none',
  updatedAt: null,
};

let revokedInMemory = false;

function localStore(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function sessionStore(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function readItem(store: Storage | null, key: string): string | null {
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/**
 * A denial marker is active if the key exists with anything other than an explicit "off".
 * Presence is the signal: a marker we could not remove must keep denying, so that a failed
 * cleanup can never resurrect advertising.
 */
function sessionDenyActive(): boolean {
  const value = readItem(sessionStore(), AD_DENY_SESSION_KEY);
  return value !== null && value !== 'off';
}

function setSessionDeny(): boolean {
  const store = sessionStore();
  if (!store) return false;
  try {
    store.setItem(AD_DENY_SESSION_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

function clearSessionDeny(): void {
  const store = sessionStore();
  if (!store) return;
  try {
    store.removeItem(AD_DENY_SESSION_KEY);
  } catch {
    // Left in place on purpose: an uncleared denial keeps denying. See sessionDenyActive().
  }
}

function readLegacy(): { present: boolean; analytics: boolean } {
  const value = readItem(localStore(), LEGACY_COOKIE_KEY);
  if (value === 'accepted') return { present: true, analytics: true };
  if (value === 'declined') return { present: true, analytics: false };
  return { present: false, analytics: false };
}

function isStale(iso: string): boolean {
  if (!iso) return true;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return true;
  const ageDays = (Date.now() - then) / 86_400_000;
  // A timestamp in the future is as untrustworthy as one from last decade.
  if (!Number.isFinite(ageDays) || ageDays < 0) return true;
  return ageDays > CONSENT_MAX_AGE_DAYS;
}

/** Parses a stored record, or null for anything that cannot be trusted as a grant. */
export function parseConsentRecord(raw: string | null): StoredRecord | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Partial<StoredRecord>;
    if (record.version !== 1) return null;
    const purposes = record.purposes;
    if (!purposes || typeof purposes !== 'object') return null;
    return {
      version: 1,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
      purposes: {
        // Anything that is not exactly `true` is false, so a malformed field denies.
        analytics: purposes.analytics === true,
        advertising: purposes.advertising === true,
      },
      advertisingAsked: purposes.advertising === true ? true : record.advertisingAsked === true,
    };
  } catch {
    return null;
  }
}

function durableRecord(): StoredRecord | null {
  const record = parseConsentRecord(readItem(localStore(), CONSENT_V1_KEY));
  if (!record) return null;
  if (isStale(record.updatedAt)) return null;
  return record;
}

/** Reads the raw durable value while reporting *whether the read itself worked*. */
function readDurableRaw(): { ok: boolean; value: string | null } {
  const store = localStore();
  if (!store) return { ok: false, value: null };
  try {
    return { ok: true, value: store.getItem(CONSENT_V1_KEY) };
  } catch {
    return { ok: false, value: null };
  }
}

/**
 * `durableRecord()` deliberately collapses "absent", "unreadable" and "corrupt" into one
 * null, which is exactly right for authorisation (all three deny) and exactly wrong for
 * deciding whether a reload is safe — where "the read failed" must not be read as "the
 * grant is gone". This keeps them apart.
 *
 * Unparseable or expired content reports `denied` rather than `granted`: it can withhold
 * advertising, and nothing else.
 */
function classifyDurableRead(raw: { ok: boolean; value: string | null }): DurableAdvertisingState {
  if (!raw.ok) return 'indeterminate';
  if (raw.value === null) return 'absent';
  const record = parseConsentRecord(raw.value);
  if (!record || isStale(record.updatedAt)) return 'denied';
  return record.purposes.advertising === true ? 'granted' : 'denied';
}

/**
 * What the durable layer can be *shown* to say right now.
 *
 * `readConsent()` cannot answer the question a caller asking "is a reload safe?" needs,
 * because it collapses unreadable, corrupt, expired and absent into one denial. `indeterminate`
 * is kept separate here on purpose: a storage area that could not be read is not evidence
 * that a grant went away, and must never be used as a basis for replacing a document.
 */
export function durableAdvertisingState(): DurableAdvertisingState {
  return classifyDurableRead(readDurableRaw());
}

/**
 * ── Storage capability (M-19) ─────────────────────────────────────────────────
 *
 * Why this exists: withdrawal is only meaningful if a refusal can be stored somewhere that
 * survives the document replacement that terminates the vendor code. A page where neither
 * storage layer can write, read back and clean up cannot honour a later "stop showing ads",
 * so advertising should never be handed that page in the first place.
 *
 * What it does NOT do, stated plainly because the distinction matters: a successful probe
 * proves storage worked at the instant it ran. It does not guarantee storage will still work
 * when the visitor withdraws minutes later, after a vendor script has been running. This is
 * an additional conservative eligibility check, not a solution to future storage failure —
 * the failure it cannot cover is recorded as an activation blocker.
 *
 * The two layers are assessed independently because they carry different guarantees:
 *   - `durable` (localStorage): a refusal here is honoured in every tab and every future
 *     session.
 *   - `tabScoped` (sessionStorage): a refusal here survives a reload of *this* tab only.
 * Either one alone is enough for a post-withdrawal document replacement to stay ad-free,
 * which is exactly the condition `revokeAdvertising()` reports as `safeToResetDocument`
 * (`tabDenied || durableIsSafe`). Requiring both would refuse browsers where withdrawal is
 * in fact safe; requiring neither is what allowed M-08's false confirmation.
 */

/** Dedicated probe key. Never a consent record, and never read as one by any code path. */
export const STORAGE_PROBE_KEY = 'openhr-consent-capability-probe';
/** A fixed token: no user data, no timestamps, nothing worth logging. */
const STORAGE_PROBE_VALUE = '1';

export type StorageCapability = 'adequate' | 'indeterminate' | 'unavailable';

export interface StorageCapabilityReport {
  /** The durable layer (localStorage). */
  durable: StorageCapability;
  /** The tab-scoped layer (sessionStorage). */
  tabScoped: StorageCapability;
  /** True when at least one layer can store and confirm a refusal. */
  adequate: boolean;
}

/**
 * write -> read back -> remove -> confirm removal, against one store.
 *
 * Every operation is individually guarded, and cleanup is attempted on every path that wrote
 * something, including a path where the read threw: a refusal to delete is reported rather
 * than assumed away, because `revokeAdvertising()` depends on being able to clear a stale
 * grant the same way. Nothing here reads, writes or deletes a consent key, and nothing is
 * reported as functional on the strength of an in-memory value — the confirmation is always
 * a second read of the store.
 */
function probeStore(store: Storage | null): StorageCapability {
  if (!store) return 'unavailable';

  try {
    store.setItem(STORAGE_PROBE_KEY, STORAGE_PROBE_VALUE);
  } catch {
    // A refused write says nothing about reads and cannot have left anything behind.
    return 'unavailable';
  }

  let written: string | null = null;
  let readFailed = false;
  try {
    written = store.getItem(STORAGE_PROBE_KEY);
  } catch {
    readFailed = true;
  }

  let removalFailed = false;
  try {
    store.removeItem(STORAGE_PROBE_KEY);
  } catch {
    removalFailed = true;
  }

  // Ambiguity of any kind resolves to `indeterminate`, which the gate treats as unsafe.
  if (readFailed || written !== STORAGE_PROBE_VALUE) return 'indeterminate';
  if (removalFailed) return 'indeterminate';

  try {
    return store.getItem(STORAGE_PROBE_KEY) === null ? 'adequate' : 'indeterminate';
  } catch {
    return 'indeterminate';
  }
}

/**
 * Assesses both persistence layers. Never throws, grants nothing and writes nothing that
 * outlives the call. Reaches this code only from the injection path, which is unreachable
 * while the kill switch is off — so today it performs no storage writes at all.
 */
export function assessStorageCapability(): StorageCapabilityReport {
  const durable = probeStore(localStore());
  const tabScoped = probeStore(sessionStore());
  return {
    durable,
    tabScoped,
    adequate: durable === 'adequate' || tabScoped === 'adequate',
  };
}

/** The stored advertising decision, before tab and in-memory revocations. */
function decisionFrom(record: StoredRecord | null): AdvertisingDecision {
  if (!record) return 'not-asked';
  if (record.purposes.advertising === true) return 'granted';
  if (record.advertisingAsked === true) return 'declined';
  return 'not-asked';
}

/**
 * The effective consent state. Never throws; every failure path resolves to a denial.
 *
 * `advertising` reports the stored value while `advertisingDecision` and
 * `advertisingAuthorization()` account for the revocation layers. Anything asking "may we
 * advertise" must use `hasAdvertisingConsent()` or `advertisingAuthorization()`.
 */
export function readConsent(): ConsentState {
  const raw = readItem(localStore(), CONSENT_V1_KEY);
  if (raw) {
    const record = parseConsentRecord(raw);
    if (!record) return { ...DENIED_DECISION };
    const decision = decisionFrom(record);
    const stale = isStale(record.updatedAt);
    if (stale) {
      // Expired: no decision at all, so the visitor is asked again rather than assumed.
      const legacy = readLegacy();
      return {
        ...DENIED_DECISION,
        analytics: legacy.analytics,
        analyticsDecided: legacy.present,
      };
    }
    return {
      analytics: record.purposes.analytics,
      advertising: record.purposes.advertising,
      advertisingDecided: decision !== 'not-asked',
      advertisingDecision: decision,
      analyticsDecided: true,
      source: 'v1',
      updatedAt: record.updatedAt,
    };
  }

  const legacy = readLegacy();
  if (legacy.present) {
    return {
      analytics: legacy.analytics,
      advertising: false,
      advertisingDecided: false,
      advertisingDecision: 'not-asked',
      analyticsDecided: true,
      source: 'legacy',
      updatedAt: null,
    };
  }

  return { ...DENIED_DECISION };
}

/**
 * The single question the loader asks. A revocation can never be undone by a record that a
 * failed write left behind.
 */
export function advertisingAuthorization(): AdvertisingAuthorization {
  const revokedForTab = revokedInMemory || sessionDenyActive();
  const record = durableRecord();
  const decision = decisionFrom(record);
  return {
    authorized: !revokedForTab && decision === 'granted',
    advertisingDecision: decision,
    revokedInMemory,
    revokedForTab,
    hasDurableRecord: Boolean(record),
  };
}

/** The predicate the Monetag loader depends on. */
export function hasAdvertisingConsent(): boolean {
  return advertisingAuthorization().authorized;
}

/** True only when the visitor actually answered the advertising question. */
export function hasAdvertisingDecision(): boolean {
  return readConsent().advertisingDecided;
}

export interface SaveOptions {
  /**
   * False for an analytics-only save: the advertising decision, in either direction, is then
   * carried over untouched and no revocation marker is written.
   */
  advertisingAsked?: boolean;
}

/**
 * Persist an explicit choice. Returns whether the durable write landed and was read back.
 *
 * Granting clears the revocation layers; an explicit refusal sets them; an analytics-only
 * save leaves both the stored advertising decision and the revocation markers exactly as
 * they were, which is the property M-11 found missing.
 */
export function saveConsentChoice(purposes: ConsentPurposes, options: SaveOptions = {}): boolean {
  const asked = options.advertisingAsked !== false;
  const previous = durableRecord();
  const previousDecision = decisionFrom(previous);

  const next: ConsentPurposes = {
    analytics: purposes.analytics === true,
    advertising: asked
      ? purposes.advertising === true
      : previousDecision === 'granted',
  };
  const nextAsked = asked || previousDecision === 'declined';

  // Revocation markers move only on an answered advertising question. An analytics-only save
  // must never clear an existing revocation, and must never stamp a denial that was not given.
  if (asked) {
    if (next.advertising) {
      revokedInMemory = false;
      clearSessionDeny();
    } else {
      revokedInMemory = true;
      setSessionDeny();
    }
  }

  const store = localStore();
  if (!store) return false;
  const record: StoredRecord = {
    version: 1,
    updatedAt: new Date().toISOString(),
    purposes: next,
    advertisingAsked: nextAsked,
  };
  try {
    store.setItem(CONSENT_V1_KEY, JSON.stringify(record));
  } catch {
    return false;
  }

  // Read-back: claim persistence only if it is demonstrably on disk, in the same state.
  const confirmed = durableRecord();
  return Boolean(
    confirmed &&
      confirmed.purposes.analytics === next.analytics &&
      confirmed.purposes.advertising === next.advertising &&
      Boolean(confirmed.advertisingAsked) === nextAsked,
  );
}

/**
 * The analytics-only save used by the original two-button banner. It answers the analytics
 * question and nothing else, and therefore records no advertising decision at all.
 */
export function saveAnalyticsChoice(analytics: boolean): boolean {
  const previous = readConsent();
  return saveConsentChoice(
    { analytics, advertising: previous.advertisingDecision === 'granted' },
    { advertisingAsked: false },
  );
}

function notifyOtherTabsOfRevocation(): boolean {
  try {
    if (typeof BroadcastChannel === 'undefined') return false;
    const channel = new BroadcastChannel(CONSENT_SYNC_CHANNEL);
    channel.postMessage(ADVERTISING_REVOKED_MESSAGE);
    // close() asynchronously, but never leave the handle dangling.
    channel.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Withdraw advertising, and nothing else.
 *
 * Order: deny in memory -> deny for the tab -> attempt the durable write -> if that fails,
 * try to clear the durable record and confirm its absence -> tell the other tabs.
 *
 * The delete-and-confirm path exists because a refused write is not the same as a refused
 * read: removing a stale grant is a legitimate way to make a reload safe when the new value
 * cannot be stored. `safeToResetDocument` is the answer to "would reloading restore
 * advertising?", and it must be true before anything navigates.
 */
export function revokeAdvertising(): WithdrawalResult {
  const current = readConsent();
  revokedInMemory = true;
  const tabDenied = setSessionDeny();

  // What the durable layer said *before* anything was attempted. Without this, a later
  // "absent" could just mean there was never a grant, or that the read failed.
  const before = classifyDurableRead(readDurableRaw());

  const persisted = saveConsentChoice(
    { analytics: current.analytics, advertising: false },
    { advertisingAsked: true },
  );

  if (!persisted) {
    // A refused write is not a refused record: try to remove the grant outright. Whether
    // that worked is answered by the re-read below, never assumed here.
    const store = localStore();
    if (store) {
      try {
        store.removeItem(CONSENT_V1_KEY);
      } catch {
        /* reported as `granted` or `indeterminate` by the re-read below */
      }
    }
  }

  const durableState = classifyDurableRead(readDurableRaw());
  const durableIsSafe = durableState === 'absent' || durableState === 'denied';
  const durableCleared = before === 'granted' && durableIsSafe;

  const synchronized = notifyOtherTabsOfRevocation();
  // Read after every mutation so each reported layer reflects what actually holds.
  const authorization = advertisingAuthorization();

  return {
    ...authorization,
    persisted,
    durableCleared,
    tabDenied,
    durableState,
    synchronized,
    // In-memory revocation is absent from this expression on purpose: it cannot survive
    // the navigation it would be used to authorise.
    safeToResetDocument: tabDenied || durableIsSafe,
  };
}

/**
 * Kept for existing callers: whether a **durable rewrite** of the record was confirmed.
 * `false` means the visitor's choice did not become durable, not that it was ignored.
 *
 * Deliberately narrower than "the stale grant is gone": a confirmed deletion
 * (`durableCleared`) is a different and weaker guarantee than a written refusal, and the
 * pre-M-12 meaning of this return value is kept so existing callers and tests read it the
 * same way. Use `revokeAdvertising()` when the distinction matters.
 */
export function withdrawAdvertisingConsent(): boolean {
  return revokeAdvertising().persisted;
}

/**
 * Apply a revocation observed in another same-origin tab or from a storage change.
 *
 * Deny-only by construction: this function has no path that can set a grant, and callers
 * must never invoke it for a positive signal.
 */
export function applyRemoteAdvertisingRevocation(): { revoked: boolean; tabDenied: boolean } {
  revokedInMemory = true;
  const tabDenied = setSessionDeny();
  return { revoked: true, tabDenied };
}

/** Emergency stop for the loader: deny for this document without touching stored preferences. */
export function revokeAdvertisingForThisDocument(): void {
  revokedInMemory = true;
}

/**
 * Subscribe to same-origin consent changes. Returns a cleanup function, so a component can
 * attach it in an effect and StrictMode's double mount cannot leave duplicate listeners.
 *
 * `onRevocation` fires when another tab removed, replaced with a denial, deleted, or
 * corrupted the consent record. A record that says "granted" is deliberately ignored: this
 * channel can take advertising away and can never hand it out.
 */
export function subscribeConsentSync(onRevocation: () => void): () => void {
  const teardown: Array<() => void> = [];

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CONSENT_SYNC_CHANNEL);
      const onMessage = (event: MessageEvent) => {
        if (event.data === ADVERTISING_REVOKED_MESSAGE) onRevocation();
      };
      channel.addEventListener('message', onMessage);
      teardown.push(() => {
        try {
          channel.close();
        } catch {
          /* already closed */
        }
      });
    }
  } catch {
    /* unsupported or blocked: durable consent still governs new documents */
  }

  try {
    if (typeof window !== 'undefined') {
      const onStorage = (event: StorageEvent) => {
        // A cleared storage area: everything is gone, so nothing is granted.
        if (event.key === null) {
          onRevocation();
          return;
        }
        if (event.key !== CONSENT_V1_KEY) return;
        if (event.newValue === null) {
          onRevocation();
          return;
        }
        const record = parseConsentRecord(event.newValue);
        // Unreadable or malformed is a denial, never a grant.
        if (!record || record.purposes.advertising !== true) onRevocation();
      };
      window.addEventListener('storage', onStorage);
      teardown.push(() => window.removeEventListener('storage', onStorage));
    }
  } catch {
    /* no window: nothing to unsubscribe */
  }

  return () => {
    for (const dispose of teardown) {
      try {
        dispose();
      } catch {
        /* best effort */
      }
    }
    teardown.length = 0;
  };
}

/** Test seam: forget in-memory state so cases stay independent. Storage is untouched. */
export function __resetInMemoryRevocationForTests(): void {
  revokedInMemory = false;
}
