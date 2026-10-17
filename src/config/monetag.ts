/**
 * Monetag — standalone In-Page Push configuration (zone 12046475).
 *
 * Prepared by M-04 and shipped DISABLED. Nothing in this file loads or activates
 * advertising. `MONETAG_ENABLED` (IPP) and `MONETAG_VIGNETTE_ENABLED` (Vignette) below are
 * the kill switches, one per format: while a switch is false the loader refuses that format
 * before it touches the DOM, so the application behaves exactly as it did before this file
 * existed.
 *
 * Deliberately NOT used here, because they are different identifiers with
 * different meanings that must never be substituted for one another: the Golden
 * Tag / MultiTag common-script identifier, the Golden Tag browser-push member
 * zone, and the legacy Monetag service-worker zone already present in the
 * repository. None of those values appear anywhere in this integration, and
 * `src/test/swOwnershipGuard.test.ts` fails the test suite if one is ever added.
 *
 * This integration is standalone-tag only (In-Page Push and Vignette): no browser Push
 * Notifications, no service worker of any kind, no MultiTag. Provider documentation states
 * that IPP ads "are displayed directly on the publisher's site and do not require
 * subscriptions", and the Vignette tag is likewise a plain script with no worker — which is
 * why the PWA's own /sw.js stays untouched.
 *
 * Two formats, two independent kill switches. Each format has its own zone, script URL,
 * exact host and per-document marker, so enabling one never enables the other and one
 * format's injection can never be mistaken for the other's.
 */

/** The IPP kill switch. False means: never inject, evaluate nothing else, mutate nothing. */
export const MONETAG_ENABLED = false;

/** The Vignette kill switch, independent of the IPP one. Same meaning. */
export const MONETAG_VIGNETTE_ENABLED = false;

/** Owner-supplied, dashboard-confirmed standalone In-Page Push zone. */
export const MONETAG_ZONE_ID = '12046475';
export const MONETAG_TAG_SRC = 'https://nap5k.com/tag.min.js';
/** Exact host of that tag. Vendor domains rotate; a new domain must be an
 * explicit, reviewed config change rather than a URL the code accepts silently. */
export const MONETAG_TAG_HOST = 'nap5k.com';

/** Owner-supplied, dashboard-confirmed standalone Vignette ("Pretty tag") zone. */
export const MONETAG_VIGNETTE_ZONE_ID = '12054036';
export const MONETAG_VIGNETTE_TAG_SRC = 'https://n6wxm.com/vignette.min.js';
/** Same exact-host rule as the IPP tag: n6wxm.com only, never accepted silently. */
export const MONETAG_VIGNETTE_TAG_HOST = 'n6wxm.com';

export type AdRouteClass =
  | 'public-content'
  | 'auth-flow'
  | 'authenticated-app'
  | 'non-public'
  | 'unknown';

/**
 * Everything the classifier needs. It is passed in rather than read from
 * globals so the rule is testable in isolation.
 *
 * The flags after `pathname` exist because this SPA has no distinct URLs for
 * Login, Register, VerifyAccount or ResetPassword — those are React state on
 * "/" (see App.tsx's render priority) — so a pathname allowlist alone would
 * serve ads onto an account flow.
 */
export interface RouteFacts {
  pathname: string;
  hash: string;
  search: string;
  isConfigured: boolean;
  hasVerificationToken: boolean;
  passwordResetRequested: boolean;
  registerViewRequested: boolean;
  /** `showLanding === false` on "/" means the Login card is on screen. */
  landingHidden: boolean;
  hasSession: boolean;
  /** True when React has resolved a public content page (blog / guides / features / changelog / about / contact). */
  publicContentActive: boolean;
}

/**
 * Content pages advertising may appear on (M-19: article-detail routes only).
 *
 * Deliberately narrower than "the public pages of this site":
 *   - A prefix plus a non-empty remainder means *has a slug*, so `/how-to-use/` is not a
 *     detail route and `/how-to-use/attendance-guide` is.
 *   - `/features/*` is product copy, not an article, and is out.
 *   - `/blog/:slug` is out too, even though it is a genuine article page: it renders
 *     `PublicAdBanner` twice (BlogPostPage.tsx), which can produce an embedded frame or
 *     admin-supplied HTML *after* this module has finished inspecting the DOM. Eligibility
 *     decided against a snapshot cannot be trusted on a page that acquires third-party
 *     interactive content later, so the blog stays out until a component-level opt-in
 *     exists. That is an owner decision, not a code detail — the prefix is listed in the
 *     comment below so the change is one line when the owner makes it.
 *   - Index pages, the landing page and every marketing route are refused by name.
 *
 * Nothing else is ever eligible, and unknown paths still fall through to a denial.
 */
const ADVERTISABLE_DETAIL_PREFIXES: readonly string[] = ['/how-to-use/'];
// Candidate for re-admission once BlogPostPage opts in explicitly: '/blog/'.

/**
 * Public URLs that must never carry advertising even though they are anonymous.
 * A visitor reading the privacy policy or the terms is reading about tracking,
 * and `/save-password` is a credential flow that happens to be a clean URL.
 *
 * M-19 adds the pages that used to be allowlisted. Naming them here keeps their
 * classification honest — `non-public`, i.e. refused on purpose — rather than letting a
 * formerly advertised page silently become `unknown`. `/` is included because the landing
 * page shares its URL with the Login card; the auth-flow rule below still wins where a
 * session form is actually on screen.
 */
const NON_ADVERTISING_EXACT: readonly string[] = [
  '/privacy',
  '/privacy/',
  '/terms',
  '/terms/',
  '/download',
  '/save-password',
  '/',
  '/blog',
  '/how-to-use',
  '/features',
  '/changelog',
  '/about',
  '/contact',
];

/**
 * Public content families kept out of first-launch advertising (M-19), named rather than
 * left to fall through as `unknown`. `unknown` means "a path nobody anticipated" and is a
 * denial; these are paths this integration has considered and refused on purpose, and the
 * distinction is what makes the exit route's safety auditable: an exclusion that is written
 * down cannot silently widen when somebody adds a new prefix to the allowlist.
 */
const NON_ADVERTISING_PREFIXES: readonly string[] = ['/blog/', '/features/'];

/** Defense in depth: authenticated HR routes are hash-based here, but if a path
 * form ever appears, refuse it rather than falling through to "unknown". */
const APP_PATH_PREFIXES: readonly string[] = [
  '/dashboard',
  '/attendance',
  '/attendance-logs',
  '/attendance-audit',
  '/leave',
  '/employees',
  '/reports',
  '/organization',
  '/performance-review',
  '/admin-notifications',
  '/announcements',
  '/settings',
  '/profile',
  '/upgrade',
  '/super-admin',
];

/** Query keys that mean "this document is part of an account flow". */
const AUTH_QUERY_KEYS: readonly string[] = ['token', 'type', 'reset', 'code', 'next', 'error'];

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  // Case is preserved: '/Blog' is not an allowlisted route and must fall through
  // to "unknown", which is a denial. Lowercasing would widen what we serve ads on.
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/** Trivial hashes are not deep links. Anything else is the authenticated app. */
export function isAppHash(hash: string | null | undefined): boolean {
  if (!hash) return false;
  const bare = hash.replace(/^#/, '');
  if (bare === '' || bare === '/' ) return false;
  return true;
}

export function hasAuthParam(search: string | null | undefined): boolean {
  if (!search) return false;
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (query === '') return false;
  // URLSearchParams cannot throw on a query string, but the guard keeps the
  // classifier total: an unparsable input must deny, never crash the app.
  try {
    const params = new URLSearchParams(query);
    for (const key of AUTH_QUERY_KEYS) {
      if (params.has(key)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * True only for an article-detail path: an allowlisted prefix carrying exactly one non-empty
 * slug segment. An empty remainder (`/how-to-use/`) normalises away to the index, and a
 * remainder with another slash (`/how-to-use/a/b`) is not a route this app resolves — it would
 * render a not-found page, and an advertisement on a page that does not exist is exactly the
 * low-value inventory policies like AdSense's are written against. Both are refused, so a
 * prefix match alone is never enough to widen eligibility.
 */
function isAdvertisableDetail(path: string): boolean {
  return ADVERTISABLE_DETAIL_PREFIXES.some((prefix) => {
    if (!path.startsWith(prefix)) return false;
    const remainder = path.slice(prefix.length);
    return remainder !== '' && !remainder.includes('/');
  });
}

function isNonAdvertising(path: string): boolean {
  if (NON_ADVERTISING_EXACT.includes(path)) return true;
  const bare = path.replace(/\/+$/, '');
  if (NON_ADVERTISING_EXACT.includes(bare)) return true;
  if (NON_ADVERTISING_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  return bare.startsWith('/downloads');
}

/**
 * Classify one document into an ad-eligibility class.
 *
 * Ordered so that the *refusals* are evaluated first and the only accepting
 * outcomes are explicit. Anything not named returns 'unknown', which the loader
 * treats as a denial — the rule fails closed, including on input nobody
 * anticipated.
 */
export function classifyRoute(facts: RouteFacts): AdRouteClass {
  const path = normalizePath(facts.pathname);

  // 1. Account flows before anything else: Setup, email verification, password
  //    recovery and registration are not content pages.
  if (!facts.isConfigured) return 'auth-flow';
  if (facts.hasVerificationToken) return 'auth-flow';
  if (facts.passwordResetRequested) return 'auth-flow';
  if (facts.registerViewRequested) return 'auth-flow';
  if (hasAuthParam(facts.search)) return 'auth-flow';

  // 2. A session means the HR application, whatever the URL happens to say.
  if (facts.hasSession) return 'authenticated-app';

  // 3. Authenticated routes live in the hash (#/dashboard, #/leave/...). A
  //    document that has deep-linked into the app is not an ad page.
  if (isAppHash(facts.hash)) return 'authenticated-app';

  // 4. On "/" the Login card shares the URL with the landing page, so the React
  //    state is the only way to tell them apart.
  if (path === '/' && facts.landingHidden && !facts.publicContentActive) return 'auth-flow';

  // 5. React resolved a public content page. This flag covers *every* public route the app
  //    resolves — `parseBlogRoute` matches `/blog` as readily as `/blog/slug` — so it cannot
  //    be the whole rule. The path shape decides, and anything that is not an article detail
  //    stays refused even while React calls it public content.
  if (facts.publicContentActive) {
    return isAdvertisableDetail(path) ? 'public-content' : 'non-public';
  }

  // 6. Static allowlist: article-detail paths only, so the rule holds before React has
  //    resolved anything as well as after.
  if (isAdvertisableDetail(path)) return 'public-content';

  // 7. Named public-but-not-advertisable paths.
  if (isNonAdvertising(path)) return 'non-public';

  // 8. Any app-shaped path.
  if (APP_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'))) {
    return 'authenticated-app';
  }

  // 9. Unrecognised. Deny.
  return 'unknown';
}

interface ConfigValidation {
  ok: boolean;
  reason: string;
}

function parseTagUrl(src: string): URL | null {
  try {
    return new URL(src);
  } catch {
    return null;
  }
}

/**
 * The config is validated on every decision rather than trusted at module load,
 * so a corrupted or hand-edited value fails closed instead of injecting a URL
 * nobody reviewed. Defaults are the IPP tag; the Vignette tag passes its own
 * zone, URL, exact host and script path through the same checks.
 */
export function validateMonetagConfig(
  zoneId: string = MONETAG_ZONE_ID,
  src: string = MONETAG_TAG_SRC,
  host: string = MONETAG_TAG_HOST,
  scriptPath: string = '/tag.min.js',
): ConfigValidation {
  if (!/^\d{1,20}$/.test(zoneId)) return { ok: false, reason: 'zone-id-invalid' };

  const url = parseTagUrl(src);
  if (!url) return { ok: false, reason: 'src-unparseable' };
  if (url.protocol !== 'https:') return { ok: false, reason: 'src-not-https' };
  if (url.hostname !== host) return { ok: false, reason: 'src-host-mismatch' };
  // A credential, query or fragment on the tag URL is not something this
  // integration signs off on.
  if (url.username || url.password) return { ok: false, reason: 'src-has-credentials' };
  if (url.search !== '' || url.hash !== '') return { ok: false, reason: 'src-has-query-or-fragment' };
  if (url.pathname !== scriptPath) return { ok: false, reason: 'src-path-mismatch' };

  return { ok: true, reason: 'ok' };
}

/**
 * Where a document goes when a running advertising context has to be terminated and the
 * visitor's refusal could not be stored anywhere (M-19).
 *
 * The safety of this destination does not depend on readable consent: `classifyRoute`
 * refuses `/privacy` from the path alone, before the consent layer is ever consulted, so a
 * stale durable grant that could not be cleared cannot make the exit page eligible again.
 * Keep it out of `ADVERTISABLE_DETAIL_PREFIXES` — the loader re-checks the destination
 * through `classifyRoute` at runtime rather than trusting this comment.
 */
export const AD_WITHDRAWAL_EXIT_PATH = '/privacy';

/**
 * Fixed, deny-only arrival marker. It says one thing — a preference was not saved — and is
 * deliberately not an instruction: no module reads a query string to decide whether
 * advertising may run, and `adConsent.ts` never inspects the URL at all. The value is
 * matched exactly, so nothing else in a query string can trigger it.
 */
export const AD_WITHDRAWAL_NOTICE_PARAM = 'ad-consent';
export const AD_WITHDRAWAL_NOTICE_VALUE = 'not-saved';

/** The exit URL a visitor is sent to when a withdrawal could not be persisted. */
export function adWithdrawalExitUrl(): string {
  return `${AD_WITHDRAWAL_EXIT_PATH}?${AD_WITHDRAWAL_NOTICE_PARAM}=${AD_WITHDRAWAL_NOTICE_VALUE}`;
}

/** True when a query string carries the fixed "not saved" marker. Total: never throws. */
export function isAdvertisingWithdrawalNotice(search: string | null | undefined): boolean {
  if (!search) return false;
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (query === '') return false;
  try {
    return new URLSearchParams(query).get(AD_WITHDRAWAL_NOTICE_PARAM) === AD_WITHDRAWAL_NOTICE_VALUE;
  } catch {
    return false;
  }
}
