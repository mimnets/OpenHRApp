/**
 * Monetag standalone In-Page Push loader (M-10) — zone 12046475 only.
 *
 * Boundaries of this module, stated so they can be audited:
 *   - It injects at most one vendor <script> element per enabled format (standalone IPP and
 *     standalone Vignette), using only the owner-supplied zone ids and tag URLs from
 *     `src/config/monetag.ts`. One shared eligibility decision governs both; a format cannot
 *     widen the rules for itself, and their injection markers are distinct.
 *   - It is inert while a format's kill switch is false, which is how this ships. Inert means
 *     literally inert: no DOM mutation, no storage write, no network request, no output.
 *   - It does not use the service-worker registration APIs, the push-manager APIs, or the
 *     browser notification-permission API, in any form. In-Page Push is documented by the
 *     provider as needing no subscription, so this integration has no reason to be anywhere
 *     near the application's own worker, which stays authoritative for HR notifications.
 *     `src/test/swOwnershipGuard.test.ts` enforces that mechanically rather than trusting
 *     this sentence.
 *   - It never uses eval, innerHTML, document.write, or a constructed provider URL. The
 *     script element is created and configured by properties, mirroring the vendor
 *     snippet's own behaviour (set the zone dataset, set the source, append to body when
 *     present else to the root element).
 *   - The Golden Tag common-script identifier, the Golden Tag browser-push zone and the
 *     legacy worker zone found in the repository are all absent from this file. Those
 *     identifiers mean different things and are not interchangeable; only the standalone
 *     In-Page Push zone constant is used, via `src/config/monetag.ts`.
 *
 * Two parties decide eligibility, and both must agree. `src/config/monetag.ts` says which URL
 * may carry advertising — currently guide-detail paths only — and this module additionally
 * requires the rendered page to declare itself, via `<article data-advertising="eligible">`,
 * which only `TutorialPage` emits. The URL alone is not trusted because it cannot know whether
 * the page resolved to an article, to a loading state, or to nothing; the DOM alone is not
 * trusted because it can change after the decision. A refusal from either side is final.
 *
 * On removal: there is deliberately no "uninject". Deleting the script element does not
 * stop third-party timers, listeners, or in-flight requests the vendor code already
 * started. The only real teardown is replacing the document, which `terminateAdvertisingDocument`
 * performs — and, since M-10, it is mandatory rather than offered once a withdrawal has
 * taken effect, with eligibility tightened so a document carrying user input is never
 * eligible in the first place.
 *
 * Since M-19 that replacement has two forms, chosen by what storage can prove: reload the
 * same URL when a refusal was actually stored (the reloaded document then refuses on the
 * record), or leave for a route the classifier refuses by path alone when nothing could be
 * stored, so a grant that could not be cleared still cannot bring advertising back on the
 * page the visitor lands on. Both are full navigations; neither pretends a running vendor
 * was stopped by removing a node.
 */

import {
  MONETAG_ENABLED,
  MONETAG_TAG_HOST,
  MONETAG_TAG_SRC,
  MONETAG_VIGNETTE_ENABLED,
  MONETAG_VIGNETTE_TAG_HOST,
  MONETAG_VIGNETTE_TAG_SRC,
  MONETAG_VIGNETTE_ZONE_ID,
  MONETAG_ZONE_ID,
  classifyRoute,
  classifyPageTarget,
  validateMonetagConfig,
  DEFAULT_IPP_TARGETING,
  DEFAULT_VIGNETTE_TARGETING,
  type AdRouteClass,
  type RouteFacts,
  type FormatTargeting,
} from '../config/monetag';
import { assessStorageCapability, hasAdvertisingConsent } from './adConsent';

/**
 * Runtime activation settings fetched from the database. These supplement (not replace)
 * the compile-time kill switches. Both must be true for a format to activate:
 * compile-time flag AND runtime setting. The compile-time flags remain as emergency
 * kill switches that can never be overridden by database settings.
 *
 * Default-OFF: if the database is unreachable, the settings are missing, or the fetch
 * fails, both formats remain disabled. This is the safe default.
 *
 * Targeting: each format has independent page-group targeting. A page must match an
 * enabled targeting group for ads to serve. Default targeting preserves backward
 * compatibility (IPP: guides-articles only; Vignette: all OFF).
 */
interface RuntimeSettings {
  ipp: boolean;
  vignette: boolean;
  ippTargeting: FormatTargeting;
  vignetteTargeting: FormatTargeting;
  loaded: boolean;
}

let runtimeSettings: RuntimeSettings = {
  ipp: false,
  vignette: false,
  ippTargeting: DEFAULT_IPP_TARGETING,
  vignetteTargeting: DEFAULT_VIGNETTE_TARGETING,
  loaded: false,
};

/**
 * Fetches the Monetag runtime activation settings from the database. Called once during
 * app initialization. If the fetch fails or settings are missing, defaults to OFF (safe).
 * The compile-time flags in monetag.ts remain as emergency kill switches.
 *
 * Targeting: fetches page-group targeting for both formats. If targeting data is missing
 * or malformed, defaults to safe values (IPP: guides-articles only; Vignette: all OFF).
 */
export async function initializeMonetagRuntimeSettings(): Promise<void> {
  // Lazy import to avoid module-supabase construction in test environments
  let isSupabaseConfigured: () => boolean;
  let supabase: any;
  try {
    const mod = await import('../services/supabase');
    isSupabaseConfigured = mod.isSupabaseConfigured;
    supabase = mod.supabase;
  } catch {
    runtimeSettings = {
      ipp: false,
      vignette: false,
      ippTargeting: DEFAULT_IPP_TARGETING,
      vignetteTargeting: DEFAULT_VIGNETTE_TARGETING,
      loaded: true,
    };
    return;
  }

  if (!isSupabaseConfigured()) {
    // Supabase not configured — default OFF, mark as loaded to prevent retry loops
    runtimeSettings = {
      ipp: false,
      vignette: false,
      ippTargeting: DEFAULT_IPP_TARGETING,
      vignetteTargeting: DEFAULT_VIGNETTE_TARGETING,
      loaded: true,
    };
    return;
  }

  try {
    const { data, error } = await supabase
      .rpc('get_monetag_settings')
      .single();

    if (error) {
      console.warn('[Monetag] Runtime settings fetch failed, defaulting to OFF:', error.message);
      runtimeSettings = {
        ipp: false,
        vignette: false,
        ippTargeting: DEFAULT_IPP_TARGETING,
        vignetteTargeting: DEFAULT_VIGNETTE_TARGETING,
        loaded: true,
      };
      return;
    }

    if (!data) {
      // No settings row — default OFF
      runtimeSettings = {
        ipp: false,
        vignette: false,
        ippTargeting: DEFAULT_IPP_TARGETING,
        vignetteTargeting: DEFAULT_VIGNETTE_TARGETING,
        loaded: true,
      };
      return;
    }

    // Cast the RPC response to the expected shape
    const settings = data as {
      ipp_enabled: boolean;
      vignette_enabled: boolean;
      ipp_targeting?: Partial<FormatTargeting>;
      vignette_targeting?: Partial<FormatTargeting>;
    };

    // Parse targeting with safe defaults for missing/malformed data
    const ippTargeting: FormatTargeting = {
      ...DEFAULT_IPP_TARGETING,
      ...(settings.ipp_targeting || {}),
    };
    const vignetteTargeting: FormatTargeting = {
      ...DEFAULT_VIGNETTE_TARGETING,
      ...(settings.vignette_targeting || {}),
    };

    runtimeSettings = {
      ipp: Boolean(settings.ipp_enabled),
      vignette: Boolean(settings.vignette_enabled),
      ippTargeting,
      vignetteTargeting,
      loaded: true,
    };
  } catch (e: any) {
    console.warn('[Monetag] Runtime settings fetch error, defaulting to OFF:', e?.message || e);
    runtimeSettings = {
      ipp: false,
      vignette: false,
      ippTargeting: DEFAULT_IPP_TARGETING,
      vignetteTargeting: DEFAULT_VIGNETTE_TARGETING,
      loaded: true,
    };
  }
}

/** Test seam: reset runtime settings for isolated test cases. */
export function __resetMonetagRuntimeSettingsForTests(): void {
  runtimeSettings = {
    ipp: false,
    vignette: false,
    ippTargeting: DEFAULT_IPP_TARGETING,
    vignetteTargeting: DEFAULT_VIGNETTE_TARGETING,
    loaded: false,
  };
}

/** Test seam: set runtime settings directly for testing. */
export function __setMonetagRuntimeSettingsForTests(
  ipp: boolean,
  vignette: boolean,
  ippTargeting?: Partial<FormatTargeting>,
  vignetteTargeting?: Partial<FormatTargeting>,
): void {
  runtimeSettings = {
    ipp,
    vignette,
    ippTargeting: { ...DEFAULT_IPP_TARGETING, ...(ippTargeting || {}) },
    vignetteTargeting: { ...DEFAULT_VIGNETTE_TARGETING, ...(vignetteTargeting || {}) },
    loaded: true,
  };
}

/**
 * The standalone formats this loader can install. Both are plain vendor scripts with no
 * worker and no notification API; they differ only in zone, URL, kill switch and marker.
 * `enabled` is a getter rather than a captured value so the decision always reads the
 * configuration that is actually in force.
 */
export type MonetagFormat = 'ipp' | 'vignette';

/** Set on <html> once this document has received the IPP vendor script. */
export const MONETAG_MARKER_ATTR = 'monetagInjected';
/** Set on <html> once this document has received the Vignette vendor script. */
export const MONETAG_VIGNETTE_MARKER_ATTR = 'monetagVignetteInjected';
/** Set on <html> when a teardown navigation has already been claimed (shared by both formats). */
export const MONETAG_RESET_MARKER_ATTR = 'monetagReset';

interface FormatSpec {
  enabled: () => boolean;
  zoneId: string;
  src: string;
  host: string;
  scriptPath: string;
  /** Per-format <html> marker, so one format's injection is never read as the other's. */
  markerAttr: string;
}

const FORMATS: Record<MonetagFormat, FormatSpec> = {
  ipp: {
    // Both compile-time kill switch AND runtime database setting must be true.
    // The compile-time flag is the emergency override that can never be bypassed.
    enabled: () => MONETAG_ENABLED && runtimeSettings.ipp,
    zoneId: MONETAG_ZONE_ID,
    src: MONETAG_TAG_SRC,
    host: MONETAG_TAG_HOST,
    scriptPath: '/tag.min.js',
    markerAttr: MONETAG_MARKER_ATTR,
  },
  vignette: {
    enabled: () => MONETAG_VIGNETTE_ENABLED && runtimeSettings.vignette,
    zoneId: MONETAG_VIGNETTE_ZONE_ID,
    src: MONETAG_VIGNETTE_TAG_SRC,
    host: MONETAG_VIGNETTE_TAG_HOST,
    scriptPath: '/vignette.min.js',
    markerAttr: MONETAG_VIGNETTE_MARKER_ATTR,
  },
};

export type AuthState = 'loading' | 'authenticated' | 'anonymous';

export interface GateContext {
  authState: AuthState;
  route: AdRouteClass;
  /** When omitted, the gate reads consent itself. Passed explicitly by tests. */
  consentAdvertising?: boolean;
}

export interface GateDecision {
  inject: boolean;
  /** Stable machine-readable reason. Never contains user data or URLs. */
  reason: string;
}

export interface TerminateOptions {
  /** Injectable for tests; production uses the default in-place document replacement. */
  navigate?: (url: string) => void;
  /**
   * Replace this document with a *different* one instead of reloading it, for the case where
   * the refusal could not be stored anywhere and a reload of the current URL would therefore
   * restore advertising.
   *
   * The destination is re-checked before anything navigates: it must resolve same-origin and
   * `classifyRoute` must refuse it. That makes the exit independent of the consent record —
   * which is the whole point, since the record is the thing this call could not change.
   */
  destination?: string;
}

/**
 * Resolve a destination against the live document, refusing anything cross-origin or
 * unparsable. An exit that leaves the origin is not an exit from the advertising context,
 * it is a departure from the site, and it would be a redirect primitive in consent clothing.
 */
function resolveExitDestination(destination: string, from: string): string | null {
  try {
    const target = new URL(destination, from);
    const current = new URL(from);
    if (target.origin !== current.origin) return null;
    return target.href;
  } catch {
    return null;
  }
}

/**
 * Would the route classifier serve advertising on this URL? An exit must answer "no", and it
 * must answer no from the path, which is the only reason a stale grant cannot undo it.
 *
 * The facts describe the destination as an anonymous, unconfigured-for-auth document with no
 * React-resolved content: every flag that could widen eligibility is set to the value that
 * denies. A session on the real destination would classify it `authenticated-app`, which is
 * also a refusal, so this remains a conservative question.
 */
function exitIsNonAdvertisable(absolute: string): boolean {
  try {
    const url = new URL(absolute);
    const facts: RouteFacts = {
      pathname: url.pathname,
      hash: '',
      search: url.search,
      isConfigured: true,
      hasVerificationToken: false,
      passwordResetRequested: false,
      registerViewRequested: false,
      landingHidden: false,
      hasSession: false,
      publicContentActive: false,
    };
    return classifyRoute(facts) !== 'public-content';
  } catch {
    return false;
  }
}

/**
 * Anything on this list means the document may hold something a person is composing, so a
 * reset could discard it and eligibility is refused. `select` and the ARIA roles are included
 * because a rich-text or third-party editor rarely looks like a plain `textarea`, and
 * `iframe` covers embedded editors. Unknown markup is treated as unsafe on purpose.
 */
const INTERACTIVE_SELECTOR = [
  'input:not([type="hidden"])',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[data-contenteditable]',
  '[data-editor]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="spinbutton"]',
  '[role="slider"]',
  '[role="searchbox"]',
  'iframe',
  'audio[controls]',
  'video[controls]',
].join(',');

/** Formats this module instance already appended, one entry per document lifetime. */
const moduleInstalled = new Set<MonetagFormat>();

/** Test seam: forget per-document install state so cases stay independent. Markers are DOM. */
export function __resetMonetagModuleStateForTests(): void {
  moduleInstalled.clear();
}

/**
 * The element a page must render to opt into advertising at all: a real content article that
 * declares itself. Restricting the tag name matters — a stray `<div data-advertising>` on some
 * future page would otherwise be enough to make that page eligible.
 */
const PAGE_OPT_IN_SELECTOR = 'article[data-advertising="eligible"]';

function deny(reason: string): GateDecision {
  return { inject: false, reason };
}

/**
 * Has the page rendered on screen actually asked for advertising?
 *
 * This is what makes eligibility a decision by the component that knows what it contains,
 * instead of a guess from a URL that looks like an article. It closes two gaps that path
 * matching cannot: a path that resolves to a loading or not-found state (including an encoded
 * or extra-segment slug) never renders the opt-in element, and a page that later grows an
 * editor or a form can lose eligibility by the DOM check while never gaining it by the URL.
 *
 * Any failure to answer "yes" is a refusal: no document, no body, an unreadable DOM, or an
 * element that is not an opted-in article.
 */
export function hasPageAdvertisingOptIn(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const root = document.body;
    if (!root) return false;
    return Boolean(root.querySelector(PAGE_OPT_IN_SELECTOR));
  } catch {
    return false;
  }
}

function markerPresent(format: MonetagFormat): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.documentElement.dataset[FORMATS[format].markerAttr]);
}

/**
 * Did ANY format's vendor script reach this document? Withdrawal and teardown key on this:
 * if either tag executed, the document holds live third-party advertising, whatever the
 * other format did.
 */
function anyMarkerPresent(): boolean {
  if (typeof document === 'undefined') return false;
  const ds = document.documentElement.dataset;
  return Boolean(ds[MONETAG_MARKER_ATTR]) || Boolean(ds[MONETAG_VIGNETTE_MARKER_ATTR]);
}

export interface InteractiveContentReport {
  /** False means: do not inject, and do not reset. Fail-closed. */
  safe: boolean;
  reason: string;
}

/**
 * Fail-closed eligibility check for user-editable content.
 *
 * It returns `safe: false` whenever the DOM cannot be inspected, the query throws, or the
 * body is missing — uncertainty is a refusal, never a permission.
 *
 * Scope of the guarantee, stated because M-19 found it is narrower than it looks: this is a
 * snapshot of the DOM at the moment the decision is made. It cannot see controls that appear
 * afterwards, which includes anything a third-party unit paints into the page. That is why
 * the eligible route set is now the guide-detail pages only — the blog article page renders
 * its own ad slots, whose markup can arrive after this check has already passed. A snapshot
 * is only trustworthy on a page that does not acquire interactive content, and a URL pattern
 * is not proof of that either: what makes guide pages acceptable is that they render no
 * interactive controls and no third-party slot at all.
 */
export function inspectInteractiveContent(): InteractiveContentReport {
  // Reading `document.body` is itself a DOM access: in a locked-down or detached
  // context it can throw, and an exception escaping here would abort the caller's
  // consent handling. Every path out of this function is a value, never a throw.
  let root: HTMLElement | null = null;
  try {
    if (typeof document === 'undefined') return { safe: false, reason: 'no-document' };
    root = document.body;
  } catch {
    return { safe: false, reason: 'body-inaccessible' };
  }
  if (!root) return { safe: false, reason: 'no-body' };
  try {
    const found = root.querySelector(INTERACTIVE_SELECTOR);
    if (found) return { safe: false, reason: 'interactive-content-present' };
    return { safe: true, reason: 'no-interactive-content' };
  } catch {
    return { safe: false, reason: 'interactive-content-uninspectable' };
  }
}

/**
 * Field types that can carry something a visitor has typed and not sent.
 *
 * `input` covers the free-text types by exclusion rather than inclusion, so a new or
 * unusual type is treated as potentially dirty — the conservative direction for a reload.
 */
const TEXTUAL_INPUT_SELECTOR = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"]):not([type="file"])';
const EDITABLE_SELECTOR = [
  TEXTUAL_INPUT_SELECTOR,
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[data-contenteditable]:not([data-contenteditable="false"])',
  '[data-editor]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="spinbutton"]',
].join(', ');

export interface UnsavedContentReport {
  /** True when a reload could destroy something the visitor wrote but has not sent. */
  dirty: boolean;
  reason: string;
}

/**
 * Does this document hold unsent user input?
 *
 * Separate from `inspectInteractiveContent()` on purpose. That function decides whether a
 * page may be *shown* an ad at all, and is strict. This one decides whether an ad document
 * may be *replaced*, and a page carrying an empty comment box holds nothing to lose — so
 * refusing to reload there would let advertising run indefinitely after a withdrawal. The
 * distinction is what makes termination mandatory where it is safe and withheld only where it
 * is not.
 *
 * Any doubt resolves to `dirty: true`: an ad that keeps running can be stopped by the
 * visitor, whereas typed text that vanishes cannot be recovered.
 */
export function inspectUnsavedContent(): UnsavedContentReport {
  // As above: the body read must not be able to throw out of this function, and any
  // failure resolves to `dirty: true` so an automatic reload is withheld rather than
  // guessed at.
  let root: HTMLElement | null = null;
  try {
    if (typeof document === 'undefined') return { dirty: true, reason: 'no-document' };
    root = document.body;
  } catch {
    return { dirty: true, reason: 'body-inaccessible' };
  }
  if (!root) return { dirty: true, reason: 'no-body' };

  try {
    const fields = root.querySelectorAll(EDITABLE_SELECTOR);
    for (const el of Array.from(fields)) {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.readOnly || el.disabled) continue;
        if (el.value !== '' && el.value !== el.defaultValue) {
          return { dirty: true, reason: 'unsent-text' };
        }
        continue;
      }
      if (el instanceof HTMLSelectElement) {
        const changed = Array.from(el.options).some((option) => option.selected !== option.defaultSelected);
        if (changed) return { dirty: true, reason: 'unsent-choice' };
        continue;
      }
      // An editor container's own markup tells us nothing about intent, so any text inside
      // it counts as the visitor's work in progress. `isContentEditable` is only declared on
      // HTMLElement, so the value is narrowed before it is read; the attribute checks below
      // work on any Element and still catch `[data-editor]` and `[data-contenteditable]`
      // mounts, and an unavailable constructor would throw inside this try and resolve to
      // `dirty`, which is the safe direction.
      const isEditableHost = el instanceof HTMLElement && el.isContentEditable;
      if (isEditableHost || el.hasAttribute('data-editor') || el.hasAttribute('data-contenteditable')) {
        if ((el.textContent ?? '').trim() !== '') return { dirty: true, reason: 'unsent-rich-text' };
      }
    }
    return { dirty: false, reason: 'no-unsent-content' };
  } catch {
    return { dirty: true, reason: 'content-uninspectable' };
  }
}

/**
 * Everything except the per-format kill switches. Separated so the eligibility rules are
 * unit-testable without creating any path that could switch advertising on from a test.
 *
 * One shared decision for every format: the `format` argument only selects which zone,
 * tag URL and injection marker apply. No format can loosen a rule for itself.
 *
 * Every branch is a refusal; the only way to reach `inject: true` is to pass them all.
 */
export function evaluateAdvertisingEligibility(ctx: GateContext, format: MonetagFormat = 'ipp'): GateDecision {
  if (typeof document === 'undefined') return deny('no-document');

  // Authentication is unresolved for most of a cold start. Serving an ad inside that window
  // risks putting it on a document about to become authenticated, so wait.
  if (ctx.authState === 'loading') return deny('auth-state-unresolved');
  if (ctx.authState === 'authenticated') return deny('session-present');

  if (ctx.route !== 'public-content') return deny('route-' + ctx.route);

  const spec = FORMATS[format];
  const config = validateMonetagConfig(spec.zoneId, spec.src, spec.host, spec.scriptPath);
  if (!config.ok) return deny('config-' + config.reason);

  const consent = ctx.consentAdvertising ?? hasAdvertisingConsent();
  if (consent !== true) return deny('advertising-consent-absent');

  // A document that may carry something the visitor typed is never eligible. This is what
  // lets a post-withdrawal document reset be mandatory without risking unsaved input.
  const interactive = inspectInteractiveContent();
  if (!interactive.safe) return deny(interactive.reason);

  // One injection per format per document, even if React mounts the effect twice or the
  // visitor navigates back to an eligible page.
  if (moduleInstalled.has(format) || markerPresent(format)) return deny('already-injected');

  // The page itself must have opted in, in the rendered DOM, right now. Route classification
  // says a URL is allowed to carry advertising; only the component can say it did.
  if (!hasPageAdvertisingOptIn()) return deny('page-opt-in-absent');

  // Persistence capability, deliberately the last check because it is the only one that
  // writes: everything cheaper and more deterministic has already had its chance to refuse,
  // so an authenticated session, an ineligible route or a missing consent record never causes
  // a storage operation.
  //
  // What this buys and what it does not: it stops advertising being handed to a page where no
  // layer can store a refusal, which is the state that made M-08's withdrawal meaningless. It
  // does not promise that storage still works when the visitor later withdraws — a vendor
  // script, a quota change or private-mode eviction can all arrive in between. The residual
  // gap is handled by the withdrawal exit (below) and is recorded as an activation blocker,
  // not by describing this probe as stronger than it is.
  const capability = assessStorageCapability();
  if (!capability.adequate) {
    return deny(
      capability.durable === 'indeterminate' || capability.tabScoped === 'indeterminate'
        ? 'storage-capability-indeterminate'
        : 'storage-capability-unavailable',
    );
  }

  return { inject: true, reason: 'eligible' };
}

/** The entry point the application uses: the format's kill switch first, then targeting, then eligibility. */
export function evaluateMonetagGate(ctx: GateContext, format: MonetagFormat = 'ipp'): GateDecision {
  if (!FORMATS[format].enabled()) return deny('feature-flag-off');
  
  // Check page targeting: the current page must match an enabled targeting group
  const pageTarget = classifyPageTarget(typeof window !== 'undefined' ? window.location.pathname : '');
  if (!pageTarget) return deny('page-target-not-eligible');
  
  const targeting = format === 'ipp' ? runtimeSettings.ippTargeting : runtimeSettings.vignetteTargeting;
  if (!targeting[pageTarget]) return deny('page-target-disabled');
  
  return evaluateAdvertisingEligibility(ctx, format);
}

/**
 * Evaluate and, only if fully eligible, append the vendor script for one format once.
 * Returns the decision so callers can assert without touching the DOM. The application
 * calls this once per format; each call is independent and each format injects at most
 * one script element per document.
 */
export function installMonetagTagOnce(ctx: GateContext, format: MonetagFormat = 'ipp'): GateDecision {
  const decision = evaluateMonetagGate(ctx, format);
  if (!decision.inject) return decision;

  const spec = FORMATS[format];
  // The marker is written before the append: the element is live the moment it is attached,
  // and a re-entrant effect must already see this document claimed.
  document.documentElement.dataset[spec.markerAttr] = spec.zoneId;
  moduleInstalled.add(format);

  const el = document.createElement('script');
  el.async = true;
  el.dataset.zone = spec.zoneId;
  el.src = spec.src;

  const host = document.body ?? document.documentElement;
  host.appendChild(el);

  // console.log is stripped from production bundles (see the esbuild `pure` setting in
  // vite.config.ts), so this cannot appear in a visitor's console, and it carries only the
  // public zone id — never a path, query, session or user value.
  console.log('[monetag] injected standalone ' + format + ' zone ' + spec.zoneId);

  return decision;
}

/**
 * Re-run the application's own evaluation if the page declares itself eligible *after* the last
 * check — the ordinary case, since an article appears when its data arrives, and the mount-time
 * effect has already run by then.
 *
 * The deliberate design constraint: this watcher never injects. It holds no captured
 * authentication state and no decision, and it cannot append anything — it calls back into the
 * component that still has the current facts, which then evaluates from scratch. A page that
 * signed in between the denial and the opt-in is therefore re-checked against the live session,
 * not against a stale one.
 *
 * It arms only when the previous refusal was exactly "this page has not opted in", fires at most
 * once, and disconnects on the first match or on unsubscribe. Every other decision returns an
 * inert disposer, so a denied route, a missing consent record or a disabled kill switch leaves
 * no observer and performs no DOM work.
 */
export function watchPageAdvertisingOptIn(decision: GateDecision, recheck: () => void): () => void {
  const inert = () => {};
  if (decision.reason !== 'page-opt-in-absent') return inert;
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return inert;
  const root = document.documentElement;
  if (!root) return inert;

  let stopped = false;
  let observer: MutationObserver | null = null;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    try {
      observer?.disconnect();
    } catch {
      /* already disconnected */
    }
    observer = null;
  };

  try {
    observer = new MutationObserver(() => {
      if (stopped) return;
      // Still no declaration? Keep waiting. A declaration means the application should decide
      // again with whatever the current session, route and consent state actually are.
      if (!hasPageAdvertisingOptIn()) return;
      stop();
      recheck();
    });
    observer.observe(root, { childList: true, subtree: true });
  } catch {
    return inert;
  }
  return stop;
}

/** True when THIS document already ran vendor advertising code, in either format. */
export function isAdvertisingDocumentInjected(): boolean {
  return anyMarkerPresent();
}

/**
 * Claim the one-shot teardown without navigating. Shared with the public -> authenticated
 * transition in App.tsx, so the two paths can never double-fire or loop: the marker is
 * written before any navigation, and the fresh document starts without it. One claim covers
 * BOTH formats: a document that ran either vendor script is terminated exactly once.
 */
export function beginAdvertisingDocumentReset(): boolean {
  if (typeof document === 'undefined') return false;
  if (!anyMarkerPresent()) return false;
  if (document.documentElement.dataset[MONETAG_RESET_MARKER_ATTR]) return false;
  document.documentElement.dataset[MONETAG_RESET_MARKER_ATTR] = '1';
  return true;
}

/**
 * Replace the document so a running third-party advertising context is actually terminated.
 *
 * Callers must treat this as mandatory once a revocation is durable enough to survive the
 * reload — offering it as an optional choice is what left vendor code running after a
 * visitor withdrew consent (M-08). Conditioned on `beginAdvertisingDocumentReset()`, so it
 * never runs when no tag was injected, never runs twice, and never loops: the reloaded
 * document starts with no marker and, after a withdrawal, with the denial still in force.
 *
 * With no `destination` the URL is passed through untouched, so deep links, hashes and
 * return paths survive. With one, the destination is verified first and the one-shot claim is
 * taken only after it passes — an unverified destination must not consume the document's only
 * exit, because the caller still has to report the failure honestly.
 */
export function terminateAdvertisingDocument(options: TerminateOptions = {}): boolean {
  if (typeof window === 'undefined') return false;
  const href = window.location.href;

  let target = href;
  if (options.destination) {
    const resolved = resolveExitDestination(options.destination, href);
    if (!resolved || !exitIsNonAdvertisable(resolved)) return false;
    target = resolved;
  }

  if (!beginAdvertisingDocumentReset()) return false;
  const navigate = options.navigate ?? ((next: string) => window.location.replace(next));
  navigate(target);
  return true;
}
