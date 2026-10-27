import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MONETAG_ENABLED,
  MONETAG_TAG_SRC,
  MONETAG_VIGNETTE_ENABLED,
  MONETAG_VIGNETTE_TAG_SRC,
  MONETAG_VIGNETTE_ZONE_ID,
  MONETAG_ZONE_ID,
  validateMonetagConfig,
  type AdRouteClass,
} from '../config/monetag';
import {
  MONETAG_MARKER_ATTR,
  MONETAG_RESET_MARKER_ATTR,
  MONETAG_VIGNETTE_MARKER_ATTR,
  __resetMonetagModuleStateForTests,
  __resetMonetagRuntimeSettingsForTests,
  __setMonetagRuntimeSettingsForTests,
  beginAdvertisingDocumentReset,
  evaluateAdvertisingEligibility,
  evaluateMonetagGate,
  installMonetagTagOnce,
  isAdvertisingDocumentInjected,
  terminateAdvertisingDocument,
  watchPageAdvertisingOptIn,
  type GateContext,
} from '../utils/monetagLoader';
import {
  __resetInMemoryRevocationForTests,
  saveConsentChoice,
} from '../utils/adConsent';

/**
 * Vignette-format gate tests (M-23).
 *
 * Same discipline as monetagGate.test.ts: no vendor script is ever fetched or executed —
 * jsdom does not load external resources, and the assertions are about the elements the
 * loader appends and the decisions it returns. The kill switches are compile-time constants,
 * so this file mocks ONLY those two booleans through a proxy; every rule under test is the
 * real one.
 */

/** Mutable flag overrides; `undefined` means "use the real shipped value". */
const flags = vi.hoisted(() => ({
  ipp: undefined as boolean | undefined,
  vignette: undefined as boolean | undefined,
}));

vi.mock('../config/monetag', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/monetag')>();
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === 'MONETAG_ENABLED' && flags.ipp !== undefined) return flags.ipp;
      if (prop === 'MONETAG_VIGNETTE_ENABLED' && flags.vignette !== undefined) return flags.vignette;
      return Reflect.get(target, prop, receiver);
    },
  });
});

const eligibleCtx: GateContext = { authState: 'anonymous', route: 'public-content' };

// jsdom's document is at "/", the landing-page target group, which both formats leave off by
// default. Opt that group in so these tests reach the eligibility rules they are about.
const ON_THIS_PAGE = { 'landing-page': true };
const setRuntime = (ipp: boolean, vignette: boolean) =>
  __setMonetagRuntimeSettingsForTests(ipp, vignette, ON_THIS_PAGE, ON_THIS_PAGE);

const scripts = () => Array.from(document.querySelectorAll<HTMLScriptElement>('script[data-zone]'));

/** Renders the TutorialPage opt-in element for one case, exactly as monetagGate.test.ts does. */
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

/** Grants real durable advertising consent through the production path. */
const grant = () => saveConsentChoice({ analytics: true, advertising: true });

beforeEach(() => {
  flags.ipp = undefined;
  flags.vignette = undefined;
  __resetMonetagModuleStateForTests();
  __resetMonetagRuntimeSettingsForTests();
  __resetInMemoryRevocationForTests();
  localStorage.clear();
  sessionStorage.clear();
  scripts().forEach((el) => el.remove());
  delete document.documentElement.dataset[MONETAG_MARKER_ATTR];
  delete document.documentElement.dataset[MONETAG_VIGNETTE_MARKER_ATTR];
  delete document.documentElement.dataset[MONETAG_RESET_MARKER_ATTR];
});

describe('the shipped default keeps both formats off', () => {
  it('has both kill switches false, and injects nothing', () => {
    expect(MONETAG_ENABLED).toBe(false);
    expect(MONETAG_VIGNETTE_ENABLED).toBe(false);
    grant();
    withOptIn(() => {
      expect(evaluateMonetagGate(eligibleCtx, 'ipp').reason).toBe('feature-flag-off');
      expect(evaluateMonetagGate(eligibleCtx, 'vignette').reason).toBe('feature-flag-off');
      expect(installMonetagTagOnce(eligibleCtx, 'ipp').inject).toBe(false);
      expect(installMonetagTagOnce(eligibleCtx, 'vignette').inject).toBe(false);
      expect(scripts().length).toBe(0);
      expect(isAdvertisingDocumentInjected()).toBe(false);
    });
  });
});

describe('one shared eligibility decision, per-format kill switches', () => {
  it('IPP only: injects the IPP tag and refuses the Vignette one', () => {
    flags.ipp = true;
    setRuntime(true, false);
    grant();
    withOptIn(() => {
      expect(installMonetagTagOnce(eligibleCtx, 'ipp')).toEqual({ inject: true, reason: 'eligible' });
      expect(installMonetagTagOnce(eligibleCtx, 'vignette').reason).toBe('feature-flag-off');
      expect(scripts().length).toBe(1);
      expect(scripts()[0].dataset.zone).toBe(MONETAG_ZONE_ID);
      expect(scripts()[0].getAttribute('src')).toBe(MONETAG_TAG_SRC);
      expect(document.documentElement.dataset[MONETAG_MARKER_ATTR]).toBe(MONETAG_ZONE_ID);
      expect(document.documentElement.dataset[MONETAG_VIGNETTE_MARKER_ATTR]).toBeUndefined();
    });
  });

  it('Vignette only: injects the Vignette tag under its own marker and zone', () => {
    flags.vignette = true;
    setRuntime(false, true);
    grant();
    withOptIn(() => {
      expect(installMonetagTagOnce(eligibleCtx, 'vignette')).toEqual({ inject: true, reason: 'eligible' });
      expect(installMonetagTagOnce(eligibleCtx, 'ipp').reason).toBe('feature-flag-off');
      expect(scripts().length).toBe(1);
      expect(scripts()[0].dataset.zone).toBe(MONETAG_VIGNETTE_ZONE_ID);
      expect(scripts()[0].getAttribute('src')).toBe(MONETAG_VIGNETTE_TAG_SRC);
      // No cross-format marker collision: only the Vignette marker exists.
      expect(document.documentElement.dataset[MONETAG_VIGNETTE_MARKER_ATTR]).toBe(MONETAG_VIGNETTE_ZONE_ID);
      expect(document.documentElement.dataset[MONETAG_MARKER_ATTR]).toBeUndefined();
      expect(isAdvertisingDocumentInjected()).toBe(true);
    });
  });

  it('both enabled: exactly one script per format, distinct zones and markers', () => {
    flags.ipp = true;
    flags.vignette = true;
    setRuntime(true, true);
    grant();
    withOptIn(() => {
      expect(installMonetagTagOnce(eligibleCtx, 'ipp').inject).toBe(true);
      expect(installMonetagTagOnce(eligibleCtx, 'vignette').inject).toBe(true);
      expect(scripts().length).toBe(2);
      const zones = scripts().map((s) => s.dataset.zone).sort();
      expect(zones).toEqual([MONETAG_ZONE_ID, MONETAG_VIGNETTE_ZONE_ID].sort());
      expect(document.documentElement.dataset[MONETAG_MARKER_ATTR]).toBe(MONETAG_ZONE_ID);
      expect(document.documentElement.dataset[MONETAG_VIGNETTE_MARKER_ATTR]).toBe(MONETAG_VIGNETTE_ZONE_ID);
    });
  });

  it('refuses a duplicate injection per format, and keeps the other format independent', () => {
    flags.ipp = true;
    flags.vignette = true;
    setRuntime(true, true);
    grant();
    withOptIn(() => {
      expect(installMonetagTagOnce(eligibleCtx, 'ipp').inject).toBe(true);
      expect(evaluateAdvertisingEligibility(eligibleCtx, 'ipp').reason).toBe('already-injected');
      expect(installMonetagTagOnce(eligibleCtx, 'ipp').inject).toBe(false);
      // The IPP injection must not block or impersonate the Vignette one.
      expect(installMonetagTagOnce(eligibleCtx, 'vignette').inject).toBe(true);
      expect(installMonetagTagOnce(eligibleCtx, 'vignette').inject).toBe(false);
      expect(scripts().length).toBe(2);
    });
  });

  it('honours an existing per-format document marker as already-injected', () => {
    flags.vignette = true;
    setRuntime(false, true);
    grant();
    document.documentElement.dataset[MONETAG_VIGNETTE_MARKER_ATTR] = MONETAG_VIGNETTE_ZONE_ID;
    withOptIn(() => {
      expect(evaluateAdvertisingEligibility(eligibleCtx, 'vignette').reason).toBe('already-injected');
      expect(scripts().length).toBe(0);
    });
  });
});

describe('the shared refusals apply identically to both formats', () => {
  const withBothOn = (run: () => void) => {
    flags.ipp = true;
    flags.vignette = true;
    setRuntime(true, true);
    run();
  };

  it('denies both without affirmative advertising consent', () => {
    withBothOn(() => withOptIn(() => {
      expect(evaluateMonetagGate(eligibleCtx, 'ipp').reason).toBe('advertising-consent-absent');
      expect(evaluateMonetagGate(eligibleCtx, 'vignette').reason).toBe('advertising-consent-absent');
      expect(scripts().length).toBe(0);
    }));
  });

  it('denies both for an authenticated visitor', () => {
    withBothOn(() => {
      grant();
      const ctx: GateContext = { ...eligibleCtx, authState: 'authenticated' };
      expect(evaluateMonetagGate(ctx, 'ipp').reason).toBe('session-present');
      expect(evaluateMonetagGate(ctx, 'vignette').reason).toBe('session-present');
      const loading: GateContext = { ...eligibleCtx, authState: 'loading' };
      expect(evaluateMonetagGate(loading, 'vignette').reason).toBe('auth-state-unresolved');
    });
  });

  it.each<AdRouteClass>(['auth-flow', 'authenticated-app', 'non-public', 'unknown'])(
    'denies both on route class %s',
    (route) => {
      withBothOn(() => {
        grant();
        const ctx: GateContext = { ...eligibleCtx, route };
        expect(evaluateMonetagGate(ctx, 'ipp').reason).toBe('route-' + route);
        expect(evaluateMonetagGate(ctx, 'vignette').reason).toBe('route-' + route);
      });
    },
  );

  it('denies both while the article opt-in is missing, and re-checks both when it arrives', async () => {
    withBothOn(() => {
      grant();
      expect(evaluateMonetagGate(eligibleCtx, 'ipp').reason).toBe('page-opt-in-absent');
      expect(evaluateMonetagGate(eligibleCtx, 'vignette').reason).toBe('page-opt-in-absent');
    });

    // The App-level watcher: armed by either format's opt-in refusal, it asks the
    // application to decide again (which re-installs both formats) exactly once.
    const recheck = vi.fn();
    const disposed = watchPageAdvertisingOptIn(
      { inject: false, reason: 'page-opt-in-absent' },
      recheck,
    );
    const article = document.createElement('article');
    article.setAttribute('data-advertising', 'eligible');
    document.body.appendChild(article);
    await new Promise<void>((resolve) => { window.setTimeout(resolve, 0); });
    expect(recheck).toHaveBeenCalledTimes(1);
    disposed();
    article.remove();
  });

  it('denies the Vignette tag when storage cannot hold a refusal', () => {
    class DeadStore implements Storage {
      length = 0;
      clear(): void {}
      getItem(): string | null { throw new Error('blocked'); }
      key(): string | null { return null; }
      removeItem(): void { throw new Error('blocked'); }
      setItem(): void { throw new Error('QuotaExceededError'); }
      [name: string]: unknown;
    }
    const originalLocal = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const originalSession = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, value: new DeadStore() });
    Object.defineProperty(window, 'sessionStorage', { configurable: true, value: new DeadStore() });
    try {
      withBothOn(() => withOptIn(() => {
        // Consent is passed explicitly because with storage dead the gate cannot read a
        // grant; the storage-capability probe is the branch under test, and it is last.
        const ctx: GateContext = { ...eligibleCtx, consentAdvertising: true };
        expect(evaluateAdvertisingEligibility(ctx, 'vignette').reason).toBe('storage-capability-unavailable');
        expect(evaluateAdvertisingEligibility(ctx, 'ipp').reason).toBe('storage-capability-unavailable');
        expect(scripts().length).toBe(0);
      }));
    } finally {
      if (originalLocal) Object.defineProperty(window, 'localStorage', originalLocal);
      if (originalSession) Object.defineProperty(window, 'sessionStorage', originalSession);
    }
  });
});

describe('withdrawal and teardown treat either executed format as live advertising', () => {
  it('terminates once when only the Vignette script ran', () => {
    flags.vignette = true;
    setRuntime(false, true);
    grant();
    withOptIn(() => {
      expect(installMonetagTagOnce(eligibleCtx, 'vignette').inject).toBe(true);
    });
    expect(isAdvertisingDocumentInjected()).toBe(true);
    const navigate = vi.fn();
    expect(terminateAdvertisingDocument({ navigate })).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(terminateAdvertisingDocument({ navigate })).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
    // The claim is spent for the whole document, whichever path asks next.
    expect(beginAdvertisingDocumentReset()).toBe(false);
  });

  it('shares ONE teardown claim across both formats, so withdrawal navigates exactly once', () => {
    flags.ipp = true;
    flags.vignette = true;
    setRuntime(true, true);
    grant();
    withOptIn(() => {
      expect(installMonetagTagOnce(eligibleCtx, 'ipp').inject).toBe(true);
      expect(installMonetagTagOnce(eligibleCtx, 'vignette').inject).toBe(true);
    });
    const navigate = vi.fn();
    expect(terminateAdvertisingDocument({ navigate })).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
    // A second withdrawal path (another tab's echo, the authenticated transition) is a no-op.
    expect(terminateAdvertisingDocument({ navigate })).toBe(false);
    expect(beginAdvertisingDocumentReset()).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('leaves a document that ran nothing alone', () => {
    const navigate = vi.fn();
    expect(isAdvertisingDocumentInjected()).toBe(false);
    expect(terminateAdvertisingDocument({ navigate })).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('Vignette config validation fails closed like the IPP one', () => {
  it('accepts the owner-supplied Vignette tag exactly as issued', () => {
    expect(validateMonetagConfig(MONETAG_VIGNETTE_ZONE_ID, MONETAG_VIGNETTE_TAG_SRC, 'n6wxm.com', '/vignette.min.js'))
      .toEqual({ ok: true, reason: 'ok' });
    expect(MONETAG_VIGNETTE_ZONE_ID).toBe('12054036');
    expect(MONETAG_VIGNETTE_TAG_SRC).toBe('https://n6wxm.com/vignette.min.js');
  });

  it('rejects anything that is not the reviewed Vignette URL', () => {
    const v = (src: string, zone = MONETAG_VIGNETTE_ZONE_ID) =>
      validateMonetagConfig(zone, src, 'n6wxm.com', '/vignette.min.js');
    expect(v('http://n6wxm.com/vignette.min.js').reason).toBe('src-not-https');
    expect(v('https://evil.example/vignette.min.js').reason).toBe('src-host-mismatch');
    expect(v('https://nap5k.com/vignette.min.js').reason).toBe('src-host-mismatch');
    expect(v('https://n6wxm.com/vignette.min.js?x=1').reason).toBe('src-has-query-or-fragment');
    expect(v('https://n6wxm.com/tag.min.js').reason).toBe('src-path-mismatch');
    expect(v('not a url').reason).toBe('src-unparseable');
    expect(validateMonetagConfig('', MONETAG_VIGNETTE_TAG_SRC, 'n6wxm.com', '/vignette.min.js').reason)
      .toBe('zone-id-invalid');
  });

  it('keeps the two zones and hosts distinct: neither tag validates under the other', () => {
    // The IPP URL under Vignette rules and vice versa must both fail — a config edit that
    // crossed the wires would otherwise ship a script nobody reviewed for that format.
    expect(validateMonetagConfig(MONETAG_ZONE_ID, MONETAG_TAG_SRC, 'n6wxm.com', '/vignette.min.js').ok).toBe(false);
    expect(validateMonetagConfig(MONETAG_VIGNETTE_ZONE_ID, MONETAG_VIGNETTE_TAG_SRC, 'nap5k.com', '/tag.min.js').ok).toBe(false);
  });
});
