import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import CookieConsent from '../CookieConsent';
import { AD_DENY_SESSION_KEY, CONSENT_PREFERENCES_EVENT, CONSENT_V1_KEY } from '../../utils/adConsent';
import { MONETAG_ZONE_ID } from '../../config/monetag';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the consent banner when no preference is stored', () => {
    render(<CookieConsent />);
    expect(screen.getByText(/We use cookies and analytics/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument();
  });

  it('does not render when consent was previously accepted', () => {
    localStorage.setItem('openhr-cookie-consent', 'accepted');
    const { container } = render(<CookieConsent />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when consent was previously declined', () => {
    localStorage.setItem('openhr-cookie-consent', 'declined');
    const { container } = render(<CookieConsent />);
    expect(container.firstChild).toBeNull();
  });
});

/**
 * M-19 withdrawal safety.
 *
 * These cases exercise the branch that replaces a document, so exactly two things are mocked
 * and nothing else is: the feature flag (the advertising control only exists where
 * advertising can run) and `terminateAdvertisingDocument` (the real one would ask jsdom to
 * navigate). Consent storage, the revocation layers, the route classifier and the
 * unsaved-content inspection all run for real against real storage.
 */

/** Readable, but never writable or clearable — what a locked-down browser looks like. */
class FailingStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(_key: string, _value: string): void {
    throw new Error('QuotaExceededError');
  }

  removeItem(_key: string): void {
    throw new Error('SecurityError');
  }

  seed(key: string, value: string): void {
    this.data.set(key, value);
  }

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  clear(): void {
    this.data.clear();
  }
}

const grantRecord = (purposes: { analytics: boolean; advertising: boolean } = { analytics: true, advertising: true }) =>
  JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    purposes,
    advertisingAsked: true,
  });

let terminateSpy: ReturnType<typeof vi.fn>;
let storedLocal: PropertyDescriptor | undefined;
let storedSession: PropertyDescriptor | undefined;

/**
 * Mounts a fresh copy of the component against a fresh copy of the modules it uses, so one
 * case's in-memory revocation cannot become another case's starting state.
 */
async function renderConsent(options: { advertising?: boolean; local?: unknown; session?: unknown } = {}) {
  const { advertising = false, local, session } = options;
  vi.resetModules();
  vi.doUnmock('../../config/monetag');
  vi.doUnmock('../../utils/monetagLoader');
  terminateSpy = vi.fn(() => true);

  if (advertising) {
    vi.doMock('../../config/monetag', async (importOriginal) => {
      const actual = (await importOriginal()) as typeof import('../../config/monetag');
      return { ...actual, MONETAG_ENABLED: true };
    });
  }
  vi.doMock('../../utils/monetagLoader', async (importOriginal) => {
    const actual = (await importOriginal()) as typeof import('../../utils/monetagLoader');
    return { ...actual, terminateAdvertisingDocument: terminateSpy };
  });

  if (local !== undefined || session !== undefined) {
    storedLocal = Object.getOwnPropertyDescriptor(window, 'localStorage');
    storedSession = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    if (local !== undefined) {
      Object.defineProperty(window, 'localStorage', { configurable: true, writable: true, value: local });
    }
    if (session !== undefined) {
      Object.defineProperty(window, 'sessionStorage', { configurable: true, writable: true, value: session });
    }
  }

  const { default: Component } = await import('../CookieConsent');
  return render(<Component />);
}

/** Says "this document ran vendor advertising code", which is what termination keys on. */
const markDocumentLive = () => {
  document.documentElement.dataset.monetagInjected = MONETAG_ZONE_ID;
};

/**
 * Opens the panel the way a footer link does.
 *
 * The footer dispatches a DOM event on `window`, and the component's listener answers it by
 * calling `setState`. A native dispatch outside React's test wrapper leaves that update
 * queued, so the very next query reads a document the panel was never rendered into — which
 * is what M-20 saw as "An update to CookieConsent inside a test was not wrapped in act(...)".
 * `act()` is the wrapper Testing Library already provides; awaiting it flushes the update and
 * the resulting render before the caller proceeds, without timers or sleeps.
 */
const openPreferences = async () => {
  await act(async () => {
    window.dispatchEvent(new Event(CONSENT_PREFERENCES_EVENT));
  });
};

/**
 * A BroadcastChannel double whose `postMessage` delivers nothing.
 *
 * The background, stated because it is a real behaviour and not a jsdom quirk: a channel
 * object never receives its own message, but a *second* object with the same name in the same
 * document does — so the tab that just withdrew consent also receives its own revocation
 * broadcast and asks the loader to terminate a second time. The one-shot reset claim makes
 * that attempt a no-op in a browser, and `monetagGate.test.ts` proves the claim directly
 * ("cannot loop: the exit route is claimed once per document", "shares one claim with the
 * authenticated transition reset"). The cases below are about what a single visitor action
 * does, so self-delivery is suppressed here rather than asserted against. No expectation is
 * relaxed: every count is still the exact user-initiated one, and the storage-failure wording
 * is checked on the same page.
 */
class SilentBroadcastChannel {
  addEventListener(_type: string, _listener: (event: MessageEvent) => void): void {}
  removeEventListener(_type: string, _listener: (event: MessageEvent) => void): void {}
  postMessage(_data: unknown): void {}
  close(): void {}
}

beforeEach(() => {
  localStorage.clear();
  // A denial marker written by one case would otherwise silence `authorized` in the next.
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.stubGlobal('BroadcastChannel', SilentBroadcastChannel);
});

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.monetagInjected;
  delete document.documentElement.dataset.monetagReset;
  if (storedLocal) Object.defineProperty(window, 'localStorage', storedLocal);
  if (storedSession) Object.defineProperty(window, 'sessionStorage', storedSession);
  storedLocal = undefined;
  storedSession = undefined;
  vi.unstubAllGlobals();
  vi.doUnmock('../../config/monetag');
  vi.doUnmock('../../utils/monetagLoader');
  vi.resetModules();
});

describe('an advertising answer that is not a withdrawal never replaces the document', () => {
  it('an analytics-only decline leaves the grant, the document and the marker alone', async () => {
    localStorage.setItem(CONSENT_V1_KEY, grantRecord());
    markDocumentLive();
    await renderConsent();

    // The two-button layout, reached from the panel's Back control, is the analytics-only
    // save: it must not be able to trigger a withdrawal-style navigation.
    await openPreferences();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(terminateSpy).not.toHaveBeenCalled();
    expect(JSON.parse(String(localStorage.getItem(CONSENT_V1_KEY))).purposes.advertising).toBe(true);
    expect(document.documentElement.dataset.monetagInjected).toBe(MONETAG_ZONE_ID);
    expect(sessionStorage.getItem(AD_DENY_SESSION_KEY)).toBeNull();
  });

  it('saving with advertising still switched on is a grant, not a termination', async () => {
    localStorage.setItem(CONSENT_V1_KEY, grantRecord());
    markDocumentLive();
    await renderConsent({ advertising: true });

    await openPreferences();
    fireEvent.click(screen.getByRole('button', { name: 'Save choices' }));

    expect(terminateSpy).not.toHaveBeenCalled();
    expect(JSON.parse(String(localStorage.getItem(CONSENT_V1_KEY))).purposes.advertising).toBe(true);
  });
});

describe('explicit withdrawal while advertising is live', () => {
  it('replaces this document in place once the refusal is verifiably stored', async () => {
    localStorage.setItem(CONSENT_V1_KEY, grantRecord());
    markDocumentLive();
    await renderConsent({ advertising: true });

    await openPreferences();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Advertising' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save choices' }));

    expect(terminateSpy).toHaveBeenCalledTimes(1);
    expect(terminateSpy).toHaveBeenCalledWith({});
    expect(JSON.parse(String(localStorage.getItem(CONSENT_V1_KEY))).purposes.advertising).toBe(false);
  });

  it('leaves for a route advertising is refused on by path when nothing could be stored', async () => {
    const local = new FailingStorage();
    local.seed(CONSENT_V1_KEY, grantRecord());
    markDocumentLive();
    await renderConsent({ advertising: true, local, session: new FailingStorage() });

    await openPreferences();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Advertising' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save choices' }));

    // The vendor context still dies — by leaving, because a reload of this URL would have read
    // the grant that could not be cleared. The destination is the exit route with its marker.
    expect(terminateSpy).toHaveBeenCalledTimes(1);
    expect(terminateSpy).toHaveBeenCalledWith({ destination: '/privacy?ad-consent=not-saved' });
    // And the interface says the choice was not saved, rather than reporting a success.
    expect(screen.getByText(/could not be saved to this device/i)).toBeInTheDocument();
    // The stale grant is still exactly what it was: not cleared, and not claimed to be.
    expect(JSON.parse(String(local.getItem(CONSENT_V1_KEY))).purposes.advertising).toBe(true);
  });

  it('withholds the navigation while the page holds unsent text, and says so', async () => {
    localStorage.setItem(CONSENT_V1_KEY, grantRecord());
    markDocumentLive();
    const host = document.createElement('div');
    host.innerHTML = '<textarea id="draft"></textarea>';
    document.body.appendChild(host);
    // Assigned after insertion, so `value` differs from `defaultValue` the way it does when a
    // person has typed something. Markup that arrives pre-filled is not a visitor's draft.
    const draft = (document.getElementById('draft') as HTMLTextAreaElement);
    draft.value = 'half-written complaint';
    try {
      await renderConsent({ advertising: true });
      await openPreferences();
      fireEvent.click(screen.getByRole('checkbox', { name: 'Advertising' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save choices' }));

      expect(terminateSpy).not.toHaveBeenCalled();
      expect(screen.getByText(/Nothing you have written has been lost/i)).toBeInTheDocument();
      // Nothing about a reload is promised here: the stored refusal is what makes the next
      // page safe, not a suggestion that this one can be refreshed freely.
      expect(screen.getByText(/Your refusal has been saved/i)).toBeInTheDocument();
    } finally {
      host.remove();
    }
  });

  it('does not stack a second navigation when the choice is saved again in the same document', async () => {
    localStorage.setItem(CONSENT_V1_KEY, grantRecord());
    markDocumentLive();
    await renderConsent({ advertising: true });
    await openPreferences();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Advertising' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save choices' }));
    expect(terminateSpy).toHaveBeenCalledTimes(1);

    // Reopen and save again. Advertising was already refused and is already off for this
    // document, so there is nothing left to terminate: a second navigation here would be a
    // reload loop waiting to happen.
    await openPreferences();
    fireEvent.click(screen.getByRole('button', { name: 'Save choices' }));
    expect(terminateSpy).toHaveBeenCalledTimes(1);
  });
});

/**
 * A revocation arriving from elsewhere, delivered the way the platform delivers it: a real
 * `storage` event on `window`, which `subscribeConsentSync()` listens for. `storageArea` is
 * deliberately not passed — jsdom's StorageEvent constructor requires a native Storage object
 * and rejects the doubles used elsewhere, and the handler decides from `key`/`newValue` alone.
 */
const remoteRevocation = async () => {
  await act(async () => {
    window.dispatchEvent(new StorageEvent('storage', {
      key: CONSENT_V1_KEY,
      newValue: null,
      oldValue: grantRecord(),
      url: window.location.href,
    }));
  });
};

describe('revocation seen from another tab', () => {
  it('terminates a live advertising document on a remote revocation', async () => {
    localStorage.setItem(CONSENT_V1_KEY, grantRecord());
    markDocumentLive();
    await renderConsent();
    expect(terminateSpy).not.toHaveBeenCalled();

    await remoteRevocation();

    // The visitor did nothing in this tab, and still the running vendor document is replaced —
    // that is the point of the sync channel. The reload is safe because this tab's denial was
    // written and the durable record no longer grants.
    expect(terminateSpy).toHaveBeenCalledTimes(1);
    expect(terminateSpy).toHaveBeenCalledWith({});
  });

  it('does not let a withdrawal echo back from this tab as a fresh event', async () => {
    localStorage.setItem(CONSENT_V1_KEY, grantRecord());
    markDocumentLive();
    await renderConsent({ advertising: true });

    await openPreferences();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Advertising' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save choices' }));
    expect(terminateSpy).toHaveBeenCalledTimes(1);

    // The broadcast this document just posted reaches its own subscription. Acting on it again
    // would replace the explanation the visitor is owed with a generic notice, and a second
    // navigation attempt would be pure noise.
    await remoteRevocation();
    expect(terminateSpy).toHaveBeenCalledTimes(1);
  });
});

describe('the not-saved arrival notice', () => {
  it('renders from the marker, tells the truth about storage, and strips the marker', async () => {
    // The visitor has already answered, so the banner is not due: anything rendered here is
    // the notice and nothing else.
    localStorage.setItem(CONSENT_V1_KEY, grantRecord({ analytics: true, advertising: false }));
    window.history.replaceState(null, '', '/privacy?ad-consent=not-saved');
    await renderConsent({ advertising: true });

    expect(screen.getByText(/could not be saved to this device/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing here has been treated as consent/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    // Never a claim that the withdrawal was stored, and never a claim about other tabs.
    expect(screen.queryByText(/your refusal has been saved/i)).toBeNull();
    expect(screen.queryByText(/has been saved to this device/i)).toBeNull();
    // The marker describes one navigation; it must not outlive it in the address bar.
    expect(window.location.search).toBe('');
    expect(window.location.pathname).toBe('/privacy');
  });

  it('does not appear while advertising is switched off, so a typed URL cannot write the copy', async () => {
    // A decided record keeps the *banner* hidden, so a non-null render could only be a notice.
    localStorage.setItem(CONSENT_V1_KEY, grantRecord({ analytics: true, advertising: false }));
    window.history.replaceState(null, '', '/privacy?ad-consent=not-saved');
    const { container } = await renderConsent();
    expect(container.firstChild).toBeNull();
  });

  it('ignores every other value of the parameter', async () => {
    localStorage.setItem(CONSENT_V1_KEY, grantRecord({ analytics: true, advertising: false }));
    window.history.replaceState(null, '', '/privacy?ad-consent=granted');
    const { container } = await renderConsent({ advertising: true });
    expect(container.firstChild).toBeNull();
    cleanup();

    window.history.replaceState(null, '', '/privacy?consent=not-saved');
    const second = await renderConsent({ advertising: true });
    expect(second.container.firstChild).toBeNull();
  });
});
