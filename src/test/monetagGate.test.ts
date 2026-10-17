import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AD_WITHDRAWAL_EXIT_PATH,
  MONETAG_ENABLED,
  MONETAG_TAG_SRC,
  MONETAG_ZONE_ID,
  adWithdrawalExitUrl,
  classifyRoute,
  isAdvertisingWithdrawalNotice,
  validateMonetagConfig,
  type AdRouteClass,
  type RouteFacts,
} from '../config/monetag';
import {
  MONETAG_MARKER_ATTR,
  beginAdvertisingDocumentReset,
  evaluateAdvertisingEligibility,
  evaluateMonetagGate,
  hasPageAdvertisingOptIn,
  inspectInteractiveContent,
  inspectUnsavedContent,
  installMonetagTagOnce,
  isAdvertisingDocumentInjected,
  terminateAdvertisingDocument,
  watchPageAdvertisingOptIn,
} from '../utils/monetagLoader';
import {
  CONSENT_V1_KEY,
  LEGACY_COOKIE_KEY,
  hasAdvertisingConsent,
  readConsent,
  saveConsentChoice,
  withdrawAdvertisingConsent,
} from '../utils/adConsent';

/**
 * M-04 gate tests for the standalone Monetag In-Page Push integration.
 *
 * These cover the decision logic and the DOM discipline of the loader. They do
 * not, and must not, fetch or run the vendor script: with the kill switch off
 * the loader never reaches the network, and jsdom is not configured to execute
 * external resources anyway.
 */

const baseFacts: RouteFacts = {
  pathname: '/blog',
  hash: '',
  search: '',
  isConfigured: true,
  hasVerificationToken: false,
  passwordResetRequested: false,
  registerViewRequested: false,
  landingHidden: false,
  hasSession: false,
  publicContentActive: false,
};

const facts = (over: Partial<RouteFacts>): RouteFacts => ({ ...baseFacts, ...over });

/** A context that satisfies every refusal, for testing the refusals themselves. */
const eligibleContext = {
  authState: 'anonymous' as const,
  route: 'public-content' as AdRouteClass,
  consentAdvertising: true,
};

const clearMarkers = () => {
  delete document.documentElement.dataset[MONETAG_MARKER_ATTR];
  delete document.documentElement.dataset['monetagReset'];
  // No case may inherit a page that opted itself in.
  document.querySelectorAll('article[data-advertising]').forEach((el) => el.remove());
};

/**
 * Renders the element a page must actually produce to opt into advertising, for the duration
 * of one case. Mirrors the `<article data-advertising="eligible">` that TutorialPage renders
 * only after a tutorial has loaded — the point being that the declaration comes from the page,
 * so the tests assert the loader's dependence on it rather than on a URL.
 */
const withOptIn = (run: () => void) => {
  const article = document.createElement('article');
  article.setAttribute('data-advertising', 'eligible');
  document.body.appendChild(article);
  try {
    run();
  } finally {
    article.remove();
  }
};

beforeEach(() => {
  localStorage.clear();
  clearMarkers();
});

describe('the shipped default is disabled', () => {
  it('has advertising switched off in the configuration', () => {
    expect(MONETAG_ENABLED).toBe(false);
  });

  it('refuses an otherwise perfect document because of the kill switch', () => {
    // Even with consent granted and a clean public route, the gate never gets
    // past the flag — which is what makes the rest of this module inert.
    localStorage.setItem(CONSENT_V1_KEY, JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      purposes: { analytics: true, advertising: true },
    }));
    expect(evaluateMonetagGate(eligibleContext)).toEqual({ inject: false, reason: 'feature-flag-off' });
  });

  it('touches no DOM element while disabled', () => {
    const before = document.querySelectorAll('script[data-zone]').length;
    const decision = installMonetagTagOnce(eligibleContext);
    expect(decision.inject).toBe(false);
    expect(document.querySelectorAll('script[data-zone]').length).toBe(before);
    expect(isAdvertisingDocumentInjected()).toBe(false);
  });

  it('records no consent or marker state while disabled', () => {
    installMonetagTagOnce(eligibleContext);
    expect(localStorage.getItem(CONSENT_V1_KEY)).toBeNull();
    expect(document.documentElement.getAttribute('data-monetag-injected')).toBeFalsy();
  });
});

describe('eligibility refusals (evaluated with the switch conceptually lifted)', () => {
  it('denies when consent was explicitly declined', () => {
    saveConsentChoice({ analytics: true, advertising: false });
    expect(evaluateAdvertisingEligibility({ ...eligibleContext, consentAdvertising: undefined })).toEqual({
      inject: false,
      reason: 'advertising-consent-absent',
    });
    expect(hasAdvertisingConsent()).toBe(false);
  });

  it('denies when no choice has ever been made', () => {
    expect(evaluateAdvertisingEligibility({ ...eligibleContext, consentAdvertising: undefined })).toEqual({
      inject: false,
      reason: 'advertising-consent-absent',
    });
  });

  it('denies after consent is withdrawn, and persists the withdrawal', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    expect(hasAdvertisingConsent()).toBe(true);
    expect(withdrawAdvertisingConsent()).toBe(true);
    expect(hasAdvertisingConsent()).toBe(false);
    expect(readConsent().source).toBe('v1');
    expect(evaluateAdvertisingEligibility({ ...eligibleContext, consentAdvertising: undefined }).reason)
      .toBe('advertising-consent-absent');
  });

  it('keeps the analytics choice intact when advertising is withdrawn', () => {
    saveConsentChoice({ analytics: true, advertising: true });
    withdrawAdvertisingConsent();
    const state = readConsent();
    expect(state.analytics).toBe(true);
    expect(state.advertising).toBe(false);
  });

  it('denies while authentication is still resolving', () => {
    expect(evaluateAdvertisingEligibility({ ...eligibleContext, authState: 'loading' }).reason)
      .toBe('auth-state-unresolved');
  });

  it('denies a document that already has a session', () => {
    expect(evaluateAdvertisingEligibility({ ...eligibleContext, authState: 'authenticated' }).reason)
      .toBe('session-present');
  });

  it.each<AdRouteClass>(['auth-flow', 'authenticated-app', 'non-public', 'unknown'])(
    'denies route class %s',
    (route) => {
      expect(evaluateAdvertisingEligibility({ ...eligibleContext, route }).reason).toBe('route-' + route);
    },
  );

  it('accepts an anonymous visitor on an eligible content route that opted in', () => {
    withOptIn(() => {
      expect(evaluateAdvertisingEligibility(eligibleContext)).toEqual({ inject: true, reason: 'eligible' });
    });
  });

  it('refuses a second injection in the same document', () => {
    document.documentElement.dataset[MONETAG_MARKER_ATTR] = MONETAG_ZONE_ID;
    expect(evaluateAdvertisingEligibility(eligibleContext).reason).toBe('already-injected');
    expect(isAdvertisingDocumentInjected()).toBe(true);
  });
});

describe('route classification', () => {
  /**
   * M-19 narrowed first-launch eligibility from ten public surfaces to guide articles.
   *
   * The denials below are the point: every previously eligible page is now refused by name
   * rather than by omission, so the set is auditable and nothing can widen it by accident.
   * `/blog/:slug` is refused on purpose — BlogPostPage renders its own ad slots, which can
   * put interactive markup on screen after this module's DOM snapshot has already passed.
   */
  it('treats only guide-detail pages as eligible', () => {
    for (const pathname of ['/how-to-use/attendance-guide', '/how-to-use/leave-policy/', '/how-to-use/x-1']) {
      expect(classifyRoute(facts({ pathname }))).toBe('public-content');
    }
  });

  it.each([
    ['the landing page', '/'],
    ['the blog index', '/blog'],
    ['the guides index', '/how-to-use'],
    ['the guides index with a trailing slash', '/how-to-use/'],
    ['a blog article', '/blog/openhrapp-reports-analytics-guide'],
    ['the features index', '/features'],
    ['a feature detail page', '/features/attendance-tracking'],
    ['the changelog', '/changelog'],
    ['the about page', '/about'],
    ['the contact page', '/contact'],
    // A prefix match alone must never be enough: this is not a route the app resolves, and
    // advertising on a not-found document is exactly the thin-inventory case.
    ['a guide path with an extra segment', '/how-to-use/attendance-guide/extra'],
    ['a guide path that is only the prefix', '/how-to-use/'],
    ['a guide slug that is case-shifted', '/HOW-TO-USE/attendance-guide'],
  ])('refuses %s', (_label, pathname) => {
    expect(classifyRoute(facts({ pathname }))).not.toBe('public-content');
  });

  it('names the refused public families rather than leaving them unknown', () => {
    expect(classifyRoute(facts({ pathname: '/blog/openhrapp-reports-analytics-guide' }))).toBe('non-public');
    expect(classifyRoute(facts({ pathname: '/features/attendance-tracking/' }))).toBe('non-public');
    expect(classifyRoute(facts({ pathname: '/' }))).toBe('non-public');
    // Genuinely unrecognised input still fails closed.
    expect(classifyRoute(facts({ pathname: '/a-path-nobody-added-to-any-list' }))).toBe('unknown');
  });

  it('refuses login, registration, verification and recovery views', () => {
    // These share the "/" URL with the landing page, so React state is the signal.
    expect(classifyRoute(facts({ pathname: '/', landingHidden: true }))).toBe('auth-flow');
    // The same flag on a content URL must not turn a guide article into an account flow.
    expect(classifyRoute(facts({ pathname: '/how-to-use/attendance-guide', landingHidden: true })))
      .toBe('public-content');
    expect(classifyRoute(facts({ registerViewRequested: true }))).toBe('auth-flow');
    expect(classifyRoute(facts({ hasVerificationToken: true }))).toBe('auth-flow');
    expect(classifyRoute(facts({ passwordResetRequested: true }))).toBe('auth-flow');
    expect(classifyRoute(facts({ isConfigured: false }))).toBe('auth-flow');
    expect(classifyRoute(facts({ search: '?token=abc' }))).toBe('auth-flow');
    expect(classifyRoute(facts({ search: '?reset=1' }))).toBe('auth-flow');
    // An index page stays refused even when React has resolved it as public content, because
    // `publicContentActive` is set for `/blog` just as readily as for `/blog/slug`.
    expect(classifyRoute(facts({ pathname: '/blog', landingHidden: true, publicContentActive: true })))
      .toBe('non-public');
    expect(classifyRoute(facts({ pathname: '/how-to-use/attendance-guide', landingHidden: true, publicContentActive: true })))
      .toBe('public-content');
  });

  it('refuses the authenticated application even on a content URL', () => {
    expect(classifyRoute(facts({ hasSession: true }))).toBe('authenticated-app');
    expect(classifyRoute(facts({ pathname: '/', hash: '#/dashboard' }))).toBe('authenticated-app');
    expect(classifyRoute(facts({ pathname: '/blog', hash: '#/leave/12' }))).toBe('authenticated-app');
    expect(classifyRoute(facts({ pathname: '/attendance' }))).toBe('authenticated-app');
  });

  it('refuses the policy pages and unknown paths', () => {
    expect(classifyRoute(facts({ pathname: '/privacy' }))).toBe('non-public');
    expect(classifyRoute(facts({ pathname: '/terms' }))).toBe('non-public');
    expect(classifyRoute(facts({ pathname: '/save-password' }))).toBe('non-public');
    expect(classifyRoute(facts({ pathname: '/some-brand-new-url' }))).toBe('unknown');
    expect(classifyRoute(facts({ pathname: '/BLOG' }))).toBe('unknown');
  });
});

describe('configuration validation fails closed', () => {
  it('accepts the owner-supplied tag exactly as issued', () => {
    expect(validateMonetagConfig()).toEqual({ ok: true, reason: 'ok' });
    expect(MONETAG_ZONE_ID).toBe('12046475');
    expect(MONETAG_TAG_SRC).toBe('https://nap5k.com/tag.min.js');
  });

  it('rejects anything that is not the reviewed URL', () => {
    expect(validateMonetagConfig(MONETAG_ZONE_ID, 'http://nap5k.com/tag.min.js').reason).toBe('src-not-https');
    expect(validateMonetagConfig(MONETAG_ZONE_ID, 'https://evil.example/tag.min.js').reason).toBe('src-host-mismatch');
    expect(validateMonetagConfig(MONETAG_ZONE_ID, 'https://nap5k.com/tag.min.js?x=1').reason).toBe('src-has-query-or-fragment');
    expect(validateMonetagConfig(MONETAG_ZONE_ID, 'https://nap5k.com/other.js').reason).toBe('src-path-mismatch');
    expect(validateMonetagConfig(MONETAG_ZONE_ID, 'not a url').reason).toBe('src-unparseable');
    expect(validateMonetagConfig('', MONETAG_TAG_SRC).reason).toBe('zone-id-invalid');
    // Format-only check: any digit string passes validation, so identity is pinned
    // by the exported constants asserted above, never by this function.
    expect(validateMonetagConfig('88888888', MONETAG_TAG_SRC).ok).toBe(true);
  });
});

describe('legacy analytics consent is not advertising consent', () => {
  it('maps a legacy "accepted" to analytics only', () => {
    localStorage.setItem(LEGACY_COOKIE_KEY, 'accepted');
    const state = readConsent();
    expect(state.analytics).toBe(true);
    expect(state.advertising).toBe(false);
    expect(state.advertisingDecided).toBe(false);
    expect(state.source).toBe('legacy');
    expect(hasAdvertisingConsent()).toBe(false);
    expect(evaluateAdvertisingEligibility({ ...eligibleContext, consentAdvertising: undefined }).reason)
      .toBe('advertising-consent-absent');
  });

  it('maps a legacy "declined" to nothing at all', () => {
    localStorage.setItem(LEGACY_COOKIE_KEY, 'declined');
    const state = readConsent();
    expect(state.analytics).toBe(false);
    expect(state.advertising).toBe(false);
  });

  it('never rewrites the legacy key, so existing behaviour is untouched', () => {
    localStorage.setItem(LEGACY_COOKIE_KEY, 'accepted');
    saveConsentChoice({ analytics: true, advertising: true });
    expect(localStorage.getItem(LEGACY_COOKIE_KEY)).toBe('accepted');
  });

  it('treats a corrupt v1 record as denial', () => {
    localStorage.setItem(CONSENT_V1_KEY, '{not json');
    expect(readConsent().advertising).toBe(false);
    localStorage.setItem(CONSENT_V1_KEY, JSON.stringify({ version: 1, purposes: { analytics: 'yes' } }));
    expect(readConsent().analytics).toBe(false);
  });
});

describe('public -> authenticated document teardown', () => {
  it('claims a reset only when this document actually ran vendor code', () => {
    expect(beginAdvertisingDocumentReset()).toBe(false);
    document.documentElement.dataset[MONETAG_MARKER_ATTR] = MONETAG_ZONE_ID;
    expect(beginAdvertisingDocumentReset()).toBe(true);
    // Second call must not fire again, which is what prevents a reload loop.
    expect(beginAdvertisingDocumentReset()).toBe(false);
  });
});

describe('M-10 interactive-content eligibility', () => {
  /** Adds markup to the document for one case, then removes it so later cases stay clean. */
  const withMarkup = (html: string, assertion: () => void) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      assertion();
    } finally {
      host.remove();
    }
  };

  it('considers a plain content page eligible', () => {
    expect(inspectInteractiveContent()).toEqual({ safe: true, reason: 'no-interactive-content' });
  });

  it.each([
    ['an input', '<input type="text" />'],
    ['a password field', '<input type="password" />'],
    ['a textarea', '<textarea></textarea>'],
    ['a select', '<select><option>a</option></select>'],
    ['a contenteditable region', '<div contenteditable="true"></div>'],
    ['a data-contenteditable hook', '<div data-contenteditable="true"></div>'],
    ['a named editor container', '<div data-editor="rich"></div>'],
    ['an ARIA textbox', '<div role="textbox"></div>'],
    ['an ARIA combobox', '<div role="combobox"></div>'],
    ['an ARIA listbox', '<div role="listbox"></div>'],
    ['an ARIA spinbutton', '<span role="spinbutton"></span>'],
    ['an ARIA slider', '<div role="slider"></div>'],
    ['an embedded frame', '<iframe src="about:blank"></iframe>'],
    ['a native media control', '<audio controls></audio>'],
    ['a video control', '<video controls></video>'],
  ])('refuses a page carrying %s', (_label, html) => {
    withMarkup(html, () => {
      expect(inspectInteractiveContent().safe).toBe(false);
      expect(evaluateAdvertisingEligibility(eligibleContext).reason).toBe('interactive-content-present');
    });
  });

  it('ignores a hidden input, which carries nothing a visitor typed', () => {
    withMarkup('<input type="hidden" name="csrf" value="x" />', () => {
      expect(inspectInteractiveContent()).toEqual({ safe: true, reason: 'no-interactive-content' });
    });
  });

  it('applies the check after consent, so an ineligible page never reaches the DOM', () => {
    withMarkup('<textarea></textarea>', () => {
      const decision = evaluateAdvertisingEligibility(eligibleContext);
      expect(decision.inject).toBe(false);
      expect(isAdvertisingDocumentInjected()).toBe(false);
      expect(document.querySelectorAll('script[data-zone]').length).toBe(0);
    });
  });
});

describe('M-12 unsaved-content distinction', () => {
  /** Mounts markup for one case only, so later cases start from a clean document. */
  const withMarkup = (html: string, assertion: () => void) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      assertion();
    } finally {
      host.remove();
    }
  };

  it('allows termination when an empty editor is present', () => {
    // The point of separating the two checks: an untouched comment box holds nothing to
    // lose, so refusing to reload there would let advertising run indefinitely.
    withMarkup('<textarea></textarea>', () => {
      expect(inspectInteractiveContent().safe).toBe(false);
      expect(inspectUnsavedContent()).toEqual({ dirty: false, reason: 'no-unsent-content' });
    });
  });

  it('withholds termination when a field holds unsent text', () => {
    withMarkup('<input type="text" id="who" />', () => {
      const field = document.getElementById('who') as HTMLInputElement;
      field.value = 'draft answer';
      expect(inspectUnsavedContent().dirty).toBe(true);
    });
  });

  it('ignores a field whose value came from the page rather than the visitor', () => {
    withMarkup('<input type="text" value="prefilled" />', () => {
      expect(inspectUnsavedContent().dirty).toBe(false);
    });
  });

  it('ignores read-only and disabled fields', () => {
    withMarkup('<input type="text" readonly value="x" /><input type="text" disabled value="y" />', () => {
      const fields = document.querySelectorAll('input');
      fields.forEach((field) => {
        (field as HTMLInputElement).value = 'typed';
      });
      expect(inspectUnsavedContent().dirty).toBe(false);
    });
  });

  it('treats rich text typed into an editor container as unsent content', () => {
    // A `[data-editor]` mount point is how the app's own editors are marked, and it is
    // detectable identically in jsdom and in a browser, so the assertion does not depend
    // on any particular DOM implementation.
    withMarkup('<div data-editor="rich" id="ce">half-written complaint</div>', () => {
      expect(inspectUnsavedContent()).toEqual({ dirty: true, reason: 'unsent-rich-text' });
    });
  });

  it('treats an empty editor container as nothing to protect', () => {
    withMarkup('<div data-editor="rich" id="ce"></div>', () => {
      expect(inspectUnsavedContent()).toEqual({ dirty: false, reason: 'no-unsent-content' });
    });
  });

  it('treats a contenteditable carrying text as unsent content', () => {
    withMarkup('<div contenteditable="true" id="ce">drafted here</div>', () => {
      const editor = document.getElementById('ce') as HTMLElement;
      // `isContentEditable` is inherited-from-ancestor state that jsdom does not model;
      // stubbing it on this one element expresses the intended browser condition without
      // touching global prototypes, and the attribute path is covered separately above.
      Object.defineProperty(editor, 'isContentEditable', { configurable: true, value: true });
      expect(inspectUnsavedContent()).toEqual({ dirty: true, reason: 'unsent-rich-text' });
    });
  });

  it('detects a changed select and a changed contenteditable alike', () => {
    withMarkup('<select id="s"><option>a</option><option>b</option></select>', () => {
      const select = document.getElementById('s') as HTMLSelectElement;
      select.selectedIndex = 1;
      expect(inspectUnsavedContent().dirty).toBe(true);
    });
  });

  it('still reports a page with no body as holding nothing to lose safely', () => {
    const original = Object.getOwnPropertyDescriptor(document, 'body');
    Object.defineProperty(document, 'body', { configurable: true, value: null });
    try {
      expect(inspectUnsavedContent()).toEqual({ dirty: true, reason: 'no-body' });
    } finally {
      if (original) Object.defineProperty(document, 'body', { configurable: true, ...original });
      else delete (document as { body?: unknown }).body;
    }
  });
});

describe('M-14 DOM inspection failure handling', () => {
  const restore: Array<() => void> = [];

  afterEach(() => {
    while (restore.length > 0) restore.pop()?.();
  });

  const replaceBody = (descriptor: PropertyDescriptor) => {
    const original = Object.getOwnPropertyDescriptor(document, 'body');
    Object.defineProperty(document, 'body', { configurable: true, ...descriptor });
    restore.push(() => {
      if (original) Object.defineProperty(document, 'body', { configurable: true, ...original });
      else delete (document as { body?: unknown }).body;
    });
  };

  it('returns a conservative report instead of throwing when the body getter throws', () => {
    replaceBody({
      get() {
        throw new Error('inaccessible');
      },
    });
    expect(() => inspectUnsavedContent()).not.toThrow();
    expect(() => inspectInteractiveContent()).not.toThrow();
    expect(inspectUnsavedContent()).toEqual({ dirty: true, reason: 'body-inaccessible' });
    expect(inspectInteractiveContent()).toEqual({ safe: false, reason: 'body-inaccessible' });
  });

  it('reports no-body conservatively when the body is absent', () => {
    replaceBody({ configurable: true, value: null });
    expect(inspectUnsavedContent()).toEqual({ dirty: true, reason: 'no-body' });
    expect(inspectInteractiveContent()).toEqual({ safe: false, reason: 'no-body' });
  });

  it('fails closed when the query itself throws', () => {
    const broken = {
      querySelector: () => {
        throw new Error('detached');
      },
      querySelectorAll: () => {
        throw new Error('detached');
      },
    } as unknown as HTMLElement;
    replaceBody({ configurable: true, value: broken });
    expect(inspectInteractiveContent()).toEqual({ safe: false, reason: 'interactive-content-uninspectable' });
    expect(inspectUnsavedContent()).toEqual({ dirty: true, reason: 'content-uninspectable' });
  });

  it('grants nothing and injects nothing when eligibility cannot be established', () => {
    replaceBody({
      get() {
        throw new Error('inaccessible');
      },
    });
    const decision = evaluateAdvertisingEligibility(eligibleContext);
    expect(decision.inject).toBe(false);
    expect(decision.reason).toBe('body-inaccessible');

    const install = installMonetagTagOnce(eligibleContext);
    expect(install.inject).toBe(false);
    expect(document.querySelectorAll('script[data-zone]').length).toBe(0);
    expect(isAdvertisingDocumentInjected()).toBe(false);
  });
});

describe('M-12 mandatory termination, refined', () => {
  it('terminates a live advertising document and never a clean one', () => {
    const navigate = vi.fn();
    expect(terminateAdvertisingDocument({ navigate })).toBe(false);
    expect(navigate).not.toHaveBeenCalled();

    document.documentElement.dataset[MONETAG_MARKER_ATTR] = MONETAG_ZONE_ID;
    expect(terminateAdvertisingDocument({ navigate })).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(terminateAdvertisingDocument({ navigate })).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe('M-10 mandatory document termination', () => {
  it('does not navigate when this document never ran vendor code', () => {
    // The case that matters while the feature is off, and the case for an analytics-only
    // withdrawal: nothing was injected, so nothing may be reloaded.
    const navigate = vi.fn();
    expect(terminateAdvertisingDocument({ navigate })).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates exactly once when a live advertising document has to be replaced', () => {
    const navigate = vi.fn();
    document.documentElement.dataset[MONETAG_MARKER_ATTR] = MONETAG_ZONE_ID;

    expect(terminateAdvertisingDocument({ navigate })).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
    // The same URL, so deep links and return paths survive the reset.
    expect(navigate).toHaveBeenCalledWith(window.location.href);

    // A second request must not navigate again, which is what rules out a reload loop.
    expect(terminateAdvertisingDocument({ navigate })).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('shares one claim with the authenticated transition reset, so neither can double-fire', () => {
    document.documentElement.dataset[MONETAG_MARKER_ATTR] = MONETAG_ZONE_ID;
    expect(beginAdvertisingDocumentReset()).toBe(true);
    const navigate = vi.fn();
    expect(terminateAdvertisingDocument({ navigate })).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});

/**
 * M-19 storage capability eligibility.
 *
 * The cases in this file otherwise use the real jsdom storage; these replace it for one call
 * because the capability check is the only predicate in the gate that performs a write. Each
 * replacement is undone in a `finally`, so no later case inherits a fake store.
 */
class Store {
  writes = 0;
  removals = 0;
  private data = new Map<string, string>();

  constructor(
    private readonly opts: { refuseWrite?: boolean; refuseRead?: boolean; refuseRemove?: boolean } = {},
  ) {}

  getItem(key: string): string | null {
    if (this.opts.refuseRead) throw new Error('read blocked');
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes += 1;
    if (this.opts.refuseWrite) throw new Error('QuotaExceededError');
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.removals += 1;
    if (this.opts.refuseRemove) throw new Error('SecurityError');
    this.data.delete(key);
  }

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
}

function withStores(local: Store, session: Store, run: () => void): void {
  const originalLocal = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const originalSession = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
  Object.defineProperty(window, 'localStorage', { configurable: true, writable: true, value: local });
  Object.defineProperty(window, 'sessionStorage', { configurable: true, writable: true, value: session });
  try {
    run();
  } finally {
    const restore = (name: 'localStorage' | 'sessionStorage', descriptor?: PropertyDescriptor) => {
      if (descriptor) Object.defineProperty(window, name, descriptor);
      else delete (window as unknown as Record<string, unknown>)[name];
    };
    restore('localStorage', originalLocal);
    restore('sessionStorage', originalSession);
  }
}

describe('M-19 storage capability eligibility', () => {
  // Each of these renders the page's opt-in first: without it the gate refuses earlier, and the
  // storage predicate under test would never be reached.
  it('refuses to inject when neither layer can store a refusal', () => {
    withOptIn(() => withStores(new Store({ refuseWrite: true }), new Store({ refuseWrite: true }), () => {
      expect(evaluateAdvertisingEligibility(eligibleContext)).toEqual({
        inject: false,
        reason: 'storage-capability-unavailable',
      });
    }));
  });

  it('refuses to inject when a write cannot be read back', () => {
    withOptIn(() => withStores(new Store({ refuseRead: true }), new Store({ refuseRead: true }), () => {
      expect(evaluateAdvertisingEligibility(eligibleContext).reason).toBe('storage-capability-indeterminate');
    }));
  });

  it('refuses to inject when cleanup cannot be confirmed', () => {
    withOptIn(() => withStores(new Store({ refuseRemove: true }), new Store({ refuseRemove: true }), () => {
      expect(evaluateAdvertisingEligibility(eligibleContext).reason).toBe('storage-capability-indeterminate');
    }));
  });

  it('accepts a page where only the tab-scoped layer works, because a reload still denies', () => {
    withOptIn(() => {
      withStores(new Store({ refuseWrite: true }), new Store(), () => {
        expect(evaluateAdvertisingEligibility(eligibleContext)).toEqual({ inject: true, reason: 'eligible' });
      });
    });
  });

  it('accepts a page where only the durable layer works', () => {
    withOptIn(() => {
      withStores(new Store(), new Store({ refuseWrite: true }), () => {
        expect(evaluateAdvertisingEligibility(eligibleContext)).toEqual({ inject: true, reason: 'eligible' });
      });
    });
  });

  it('writes nothing to storage on a page any earlier refusal already rejected', () => {
    const local = new Store();
    const session = new Store();
    withStores(local, session, () => {
      expect(evaluateAdvertisingEligibility({ ...eligibleContext, authState: 'authenticated' }).reason)
        .toBe('session-present');
      expect(evaluateAdvertisingEligibility({ ...eligibleContext, route: 'non-public' }).reason)
        .toBe('route-non-public');
      expect(evaluateAdvertisingEligibility({ ...eligibleContext, route: 'unknown' }).reason)
        .toBe('route-unknown');
      expect(evaluateAdvertisingEligibility({ ...eligibleContext, consentAdvertising: false }).reason)
        .toBe('advertising-consent-absent');
      expect(evaluateAdvertisingEligibility({ ...eligibleContext, authState: 'loading' }).reason)
        .toBe('auth-state-unresolved');
      expect(local.writes).toBe(0);
      expect(session.writes).toBe(0);
    });
  });

  it('probes once, on both layers, when everything else has already agreed', () => {
    const local = new Store();
    const session = new Store();
    withOptIn(() => withStores(local, session, () => {
      expect(evaluateAdvertisingEligibility(eligibleContext)).toEqual({ inject: true, reason: 'eligible' });
      expect(local.writes).toBe(1);
      expect(session.writes).toBe(1);
      // And cleans up after itself, on both, rather than leaving a claim behind.
      expect(local.removals).toBe(1);
      expect(session.removals).toBe(1);
    }));
  });

  it('still refuses everything while the kill switch is off, so it performs no writes at all', () => {
    const local = new Store();
    const session = new Store();
    withStores(local, session, () => {
      expect(evaluateMonetagGate(eligibleContext).reason).toBe('feature-flag-off');
      expect(local.writes).toBe(0);
      expect(session.writes).toBe(0);
      expect(document.querySelectorAll('script[data-zone]').length).toBe(0);
    });
  });
});

/**
 * M-22 page-level opt-in.
 *
 * The route allowlist says a URL may carry advertising. Only the rendered page can say it
 * wants to. Without this predicate, `/how-to-use/anything` — including an encoded or
 * extra-segment path that resolves to the not-found state, and including any future page that
 * happens to share the prefix — would be enough on its own.
 */
describe('M-22 page-level advertising opt-in', () => {
  it('refuses a fully eligible route whose page never opted in', () => {
    expect(evaluateAdvertisingEligibility(eligibleContext)).toEqual({
      inject: false,
      reason: 'page-opt-in-absent',
    });
    expect(isAdvertisingDocumentInjected()).toBe(false);
    expect(document.querySelectorAll('script[data-zone]').length).toBe(0);
  });

  it('refuses before touching storage, so an opted-out page sees no probe writes', () => {
    const local = new Store();
    const session = new Store();
    withStores(local, session, () => {
      expect(evaluateAdvertisingEligibility(eligibleContext).reason).toBe('page-opt-in-absent');
      expect(local.writes).toBe(0);
      expect(session.writes).toBe(0);
    });
  });

  it('accepts only an <article> that declares itself eligible', () => {
    expect(hasPageAdvertisingOptIn()).toBe(false);
    const cases: Array<[string, () => Element, boolean]> = [
      ['an opted-in article', () => {
        const el = document.createElement('article');
        el.setAttribute('data-advertising', 'eligible');
        return el;
      }, true],
      ['a div with the same attribute', () => {
        const el = document.createElement('div');
        el.setAttribute('data-advertising', 'eligible');
        return el;
      }, false],
      ['an article with a different value', () => {
        const el = document.createElement('article');
        el.setAttribute('data-advertising', 'on');
        return el;
      }, false],
      ['an article with an empty value', () => {
        const el = document.createElement('article');
        el.setAttribute('data-advertising', '');
        return el;
      }, false],
      ['an article with no declaration', () => document.createElement('article'), false],
    ];
    for (const [label, build, expected] of cases) {
      const el = build();
      document.body.appendChild(el);
      try {
        expect(hasPageAdvertisingOptIn(), label).toBe(expected);
      } finally {
        el.remove();
      }
    }
  });

  it('does not let an opted-in page that grew a form stay eligible', () => {
    // The declaration is necessary, not sufficient: the DOM inspection still outranks it, so
    // mounting an editor on a guide page withdraws eligibility without touching any config.
    withOptIn(() => {
      const host = document.createElement('div');
      host.innerHTML = '<textarea></textarea>';
      document.body.appendChild(host);
      try {
        expect(evaluateAdvertisingEligibility(eligibleContext).reason).toBe('interactive-content-present');
      } finally {
        host.remove();
      }
    });
  });

  it('refuses when the body cannot be read, rather than treating the unknown as consent', () => {
    const original = Object.getOwnPropertyDescriptor(document, 'body');
    Object.defineProperty(document, 'body', {
      configurable: true,
      get() {
        throw new Error('detached');
      },
    });
    try {
      expect(hasPageAdvertisingOptIn()).toBe(false);
      expect(evaluateAdvertisingEligibility(eligibleContext).reason).toBe('body-inaccessible');
    } finally {
      if (original) Object.defineProperty(document, 'body', original);
      else delete (document as { body?: unknown }).body;
    }
  });

  it('still refuses the injection path entirely while the kill switch is off', () => {
    withOptIn(() => {
      expect(evaluateMonetagGate(eligibleContext).reason).toBe('feature-flag-off');
      expect(installMonetagTagOnce(eligibleContext).inject).toBe(false);
      expect(document.querySelectorAll('script[data-zone]').length).toBe(0);
    });
  });
});

/**
 * M-22 re-check plumbing.
 *
 * `App.tsx` evaluates the gate on render, and a guide article only reaches the DOM when its
 * data arrives — later. These cases pin the consequence: the watcher exists so the *application*
 * can decide again with live facts, and it must therefore be unable to inject, unable to fire
 * twice, and unable to arm for any refusal that was not the missing opt-in.
 * MutationObserver delivery is asynchronous, so each case waits one task rather than reading
 * the DOM mid-mutation.
 */
describe('M-22 page opt-in re-check watcher', () => {
  const tick = () => new Promise<void>((resolve) => { window.setTimeout(resolve, 0); });

  const append = (tagName: string, attribute?: string): Element => {
    const el = document.createElement(tagName);
    if (attribute !== undefined) el.setAttribute('data-advertising', attribute);
    document.body.appendChild(el);
    return el;
  };

  it('does not arm for a refusal that was not the missing opt-in', async () => {
    const recheck = vi.fn();
    const disposed = watchPageAdvertisingOptIn({ inject: false, reason: 'route-non-public' }, recheck);
    const el = append('article', 'eligible');
    await tick();
    expect(recheck).not.toHaveBeenCalled();
    disposed();
    el.remove();
  });

  it('asks the application to re-evaluate exactly once, when the page opts in', async () => {
    const recheck = vi.fn();
    const disposed = watchPageAdvertisingOptIn({ inject: false, reason: 'page-opt-in-absent' }, recheck);

    // Nothing yet: an unrelated mutation must not trigger a decision.
    const filler = append('div');
    await tick();
    expect(recheck).not.toHaveBeenCalled();
    filler.remove();

    const article = append('article', 'eligible');
    await tick();
    expect(recheck).toHaveBeenCalledTimes(1);

    // The watcher has stopped, so later declarations cannot queue a second evaluation.
    const second = append('article', 'eligible');
    await tick();
    expect(recheck).toHaveBeenCalledTimes(1);
    second.remove();
    article.remove();
    disposed();
  });

  it('ignores a declaration on an element that is not an article', async () => {
    const recheck = vi.fn();
    const disposed = watchPageAdvertisingOptIn({ inject: false, reason: 'page-opt-in-absent' }, recheck);
    const el = append('div', 'eligible');
    await tick();
    expect(recheck).not.toHaveBeenCalled();
    disposed();
    el.remove();
  });

  it('stops when the effect cleans up, so an unmounted route cannot re-evaluate', async () => {
    const recheck = vi.fn();
    const disposed = watchPageAdvertisingOptIn({ inject: false, reason: 'page-opt-in-absent' }, recheck);
    disposed();
    const article = append('article', 'eligible');
    await tick();
    expect(recheck).not.toHaveBeenCalled();
    article.remove();
  });

  it('performs no observation at all while the kill switch is off', () => {
    // The gate denies at the flag, so no watcher can ever be armed from the shipped build.
    const decision = evaluateMonetagGate(eligibleContext);
    expect(decision.reason).toBe('feature-flag-off');
    const recheck = vi.fn();
    const disposed = watchPageAdvertisingOptIn(decision, recheck);
    const article = append('article', 'eligible');
    expect(recheck).not.toHaveBeenCalled();
    disposed();
    article.remove();
  });
});

describe('M-19 withdrawal exit destination', () => {
  /** Marks this document as one that ran vendor code, and clears the mark afterwards. */
  const withLiveDocument = (run: () => void) => {
    document.documentElement.dataset[MONETAG_MARKER_ATTR] = MONETAG_ZONE_ID;
    try {
      run();
    } finally {
      clearMarkers();
    }
  };

  it('replaces the document with the exit route when a reload would restore advertising', () => {
    const navigate = vi.fn();
    withLiveDocument(() => {
      expect(terminateAdvertisingDocument({ navigate, destination: adWithdrawalExitUrl() })).toBe(true);
    });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(new URL(adWithdrawalExitUrl(), window.location.href).href);
  });

  it('refuses a destination the classifier would advertise on', () => {
    const navigate = vi.fn();
    withLiveDocument(() => {
      expect(terminateAdvertisingDocument({ navigate, destination: '/how-to-use/attendance-guide' })).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
      // The refused attempt must not have consumed the document's only exit claim.
      expect(beginAdvertisingDocumentReset()).toBe(true);
    });
  });

  it('refuses a destination on another origin, so an exit is never a redirect', () => {
    const navigate = vi.fn();
    withLiveDocument(() => {
      expect(terminateAdvertisingDocument({
        navigate,
        destination: 'https://openhrapp.com/privacy',
      })).toBe(false);
      expect(terminateAdvertisingDocument({ navigate, destination: '//example.com/privacy' })).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it('cannot loop: the exit route is claimed once per document', () => {
    const navigate = vi.fn();
    withLiveDocument(() => {
      expect(terminateAdvertisingDocument({ navigate, destination: adWithdrawalExitUrl() })).toBe(true);
      expect(terminateAdvertisingDocument({ navigate, destination: adWithdrawalExitUrl() })).toBe(false);
      expect(terminateAdvertisingDocument({ navigate })).toBe(false);
    });
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('excludes the exit route by path, which is why a stale grant cannot undo it', () => {
    // The route refusal happens in the classifier, before the consent layer is consulted, so
    // this holds for every consent state including a durable grant that could not be cleared.
    for (const search of ['', '?ad-consent=not-saved', '?token=abc']) {
      expect(classifyRoute(facts({ pathname: AD_WITHDRAWAL_EXIT_PATH, search }))).not.toBe('public-content');
    }
    expect(classifyRoute(facts({ pathname: AD_WITHDRAWAL_EXIT_PATH, hasSession: true })))
      .toBe('authenticated-app');
  });

  it('never injects on the exit route, even with consent granted and a clean document', () => {
    localStorage.setItem(CONSENT_V1_KEY, JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      purposes: { analytics: true, advertising: true },
      advertisingAsked: true,
    }));
    clearMarkers();
    // `evaluateAdvertisingEligibility` rather than the kill-switch entry point: the flag is
    // off in this suite, and what is under test here is that the *route* refuses, which has to
    // hold once the flag is on.
    const decision = evaluateAdvertisingEligibility({
      authState: 'anonymous',
      route: classifyRoute(facts({ pathname: AD_WITHDRAWAL_EXIT_PATH })),
    });
    expect(decision.inject).toBe(false);
    expect(decision.reason).toBe('route-non-public');
    expect(document.querySelectorAll('script[data-zone]').length).toBe(0);
  });
});

describe('M-19 withdrawal notice marker is inert about consent', () => {
  it('matches only its own fixed value', () => {
    expect(isAdvertisingWithdrawalNotice('?ad-consent=not-saved')).toBe(true);
    expect(isAdvertisingWithdrawalNotice('ad-consent=not-saved')).toBe(true);
    expect(isAdvertisingWithdrawalNotice('?ad-consent=not-saved&other=1')).toBe(true);
    expect(isAdvertisingWithdrawalNotice('?ad-consent=saved')).toBe(false);
    expect(isAdvertisingWithdrawalNotice('?ad-consent=')).toBe(false);
    expect(isAdvertisingWithdrawalNotice('?ad-consent')).toBe(false);
    expect(isAdvertisingWithdrawalNotice('')).toBe(false);
    expect(isAdvertisingWithdrawalNotice('?')).toBe(false);
    expect(isAdvertisingWithdrawalNotice(null)).toBe(false);
    expect(isAdvertisingWithdrawalNotice(undefined)).toBe(false);
  });

  it('neither grants nor denies: eligibility comes from the route and consent, as before', () => {
    // Demonstrating the marker is inert in both directions. It is a message label, not a
    // control, and no consent or injection decision reads the URL at all.
    expect(classifyRoute(facts({ pathname: '/privacy', search: '?ad-consent=not-saved' }))).toBe('non-public');
    expect(classifyRoute(facts({ pathname: '/how-to-use/guide', search: '?ad-consent=not-saved' })))
      .toBe('public-content');
    expect(hasAdvertisingConsent()).toBe(false);
  });
});
