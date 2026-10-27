
import React, { useRef, useState, useEffect } from 'react';
import { MONETAG_ENABLED, MONETAG_VIGNETTE_ENABLED, adWithdrawalExitUrl, isAdvertisingWithdrawalNotice } from '../config/monetag';
import { navigateTo } from '../utils/seo';
import {
  CONSENT_PREFERENCES_EVENT,
  advertisingAuthorization,
  applyRemoteAdvertisingRevocation,
  durableAdvertisingState,
  readConsent,
  revokeAdvertising,
  saveAnalyticsChoice,
  saveConsentChoice,
  subscribeConsentSync,
} from '../utils/adConsent';
import {
  inspectUnsavedContent,
  isAdvertisingDocumentInjected,
  terminateAdvertisingDocument,
} from '../utils/monetagLoader';

/**
 * The advertising question exists as soon as ANY standalone Monetag format can run: one
 * consent purpose covers both zones, and neither format has a consent path of its own.
 */
const MONETAG_ANY_ENABLED = MONETAG_ENABLED || MONETAG_VIGNETTE_ENABLED;

const GA_ID = 'G-KNNWM2N5NL';
// The original single-purpose record. Still written for the two outcomes it used to
// represent, so any reader that has not moved to the v1 record keeps working.
const STORAGE_KEY = 'openhr-cookie-consent';

function loadGoogleAnalytics() {
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_ID}"]`)) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = function(..._args: any[]) { (window as any).dataLayer.push(arguments); };
  (window as any).gtag('js', new Date());
  (window as any).gtag('config', GA_ID);
}

/**
 * Consent for OpenHRApp's own purposes (M-12).
 *
 * Three things this component is responsible for getting right:
 *
 *  1. An analytics answer is never recorded as an advertising answer, in either direction.
 *     While advertising is switched off, no advertising control is rendered at all, so a
 *     visitor cannot be filed as having decided something they were never asked.
 *  2. Withdrawing advertising takes effect immediately and, where it is safe, replaces the
 *     document, because deleting a script tag does not stop code that already started. Where
 *     it is not safe — the new state could not be stored, or the page holds something typed
 *     and unsent — the visitor is told plainly instead of being shown a false confirmation.
 *  3. Other same-origin tabs are told when advertising is revoked. That channel is deny-only:
 *     a message can remove advertising permission and can never grant it.
 *  4. Replacing the document — the only thing that truly stops a running vendor script — is
 *     an act of withdrawal and nothing else. Its safety basis is a withdrawal result that
 *     verified a layer surviving navigation, never this document's own state (M-19). When
 *     nothing could be stored, the document is replaced with a route that is refused by its
 *     path, and the page it lands on says so plainly.
 *
 * Once a choice exists this component renders nothing, so the durable way to revisit it is
 * the "Cookie & Ad Preferences" link in the public page footers, which dispatches
 * `CONSENT_PREFERENCES_EVENT` and reopens the panel below.
 */
const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [granular, setGranular] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(true);
  // Never preselected, and only ever settable when advertising is actually enabled.
  const [advertisingChoice, setAdvertisingChoice] = useState(false);
  // A consent write that could not be persisted, or could not be read back, is a failure to
  // report — not a success to round up.
  const [saveFailed, setSaveFailed] = useState(false);
  // Whether a revocation reached the other tabs of this browser session.
  const [notSynchronized, setNotSynchronized] = useState(false);
  // Why a running advertising document is still running despite a withdrawal.
  const [awaitingRefresh, setAwaitingRefresh] = useState<false | 'unsaved-input' | 'cannot-persist'>(false);
  // Arrived on an exit page because a withdrawal could not be stored. Rendered as its own
  // notice, not as a re-ask: this visitor has already answered.
  const [withdrawalUnsaved, setWithdrawalUnsaved] = useState(false);
  // True once this document has withdrawn advertising itself.
  //
  // Why it matters: the revocation broadcast is sent on a channel object, and a channel never
  // receives its own message — but a *second* object with the same name does, including one in
  // the same document. The subscription below is that second object, so a visitor's withdrawal
  // echoes back as though another tab had just revoked consent. The one-shot reset claim keeps
  // that from causing a second navigation; this keeps it from being treated as news at all, so
  // the explanation the visitor is actually owed stays on screen instead of being replaced by a
  // generic persistence-failure notice.
  const revokedByThisDocumentRef = useRef(false);

  useEffect(() => {
    // Only meaningful while advertising can run at all. With the kill switch off nothing in
    // this application could have produced this navigation, so a hand-typed URL must not be
    // allowed to put words about a visitor's preferences into the page.
    if (!MONETAG_ANY_ENABLED) return;
    try {
      if (!isAdvertisingWithdrawalNotice(window.location.search)) return;
      setWithdrawalUnsaved(true);
      // Drop the marker: it describes one navigation, not a state of the world, and it must
      // not be bookmarked, shared, re-served to a crawler, or read again on a later visit.
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    } catch {
      // An unreadable URL says nothing about anyone's preference, so nothing is claimed.
    }
  }, []);

  useEffect(() => {
    const state = readConsent();
    // Analytics keeps honouring the legacy value exactly as before.
    if (state.analytics) {
      loadGoogleAnalytics();
    }
    const needsAnalyticsQuestion = !state.analyticsDecided;
    const needsAdvertisingQuestion = MONETAG_ANY_ENABLED && !state.advertisingDecided;
    if (needsAnalyticsQuestion || needsAdvertisingQuestion) {
      setVisible(true);
    }
  }, []);

  /**
   * Terminate a live advertising document after a revocation. Not optional and not
   * cancellable: an offered "maybe later" is what allowed M-08's cancelled prompt to leave
   * vendor code running after the visitor said no.
   *
   * `reloadIsSafe` may only ever come from a withdrawal result that verified a layer which
   * survives navigation. When it is true the document is replaced with its own URL, which is
   * what a visitor expects and what keeps their place on the page. When it is false — nothing
   * could be stored, so a reload of *this* URL would restore the stale grant — the document is
   * still replaced, but with a route the classifier refuses by path alone, so the vendor
   * context dies and cannot come back on the page the visitor lands on. `allowOffPageExit` is
   * set only by a withdrawal; a revocation observed in another tab never moves a page the
   * visitor did not act in, and is disclosed instead.
   *
   * Neither form is attempted while the page holds something typed and unsent: terminating is
   * not worth a lost draft, and the copy says so plainly rather than claiming the vendor
   * stopped.
   *
   * Returns what happened so the caller can decide whether the panel may close: `'replaced'`
   * (a navigation is under way), `'withheld'` (an explanation is now on screen and must stay
   * there), or `'nothing'` (no advertising document to terminate, nothing to say).
   */
  const terminateLiveAdvertising = (
    reloadIsSafe: boolean,
    allowOffPageExit = false,
  ): 'replaced' | 'withheld' | 'nothing' => {
    if (!isAdvertisingDocumentInjected()) return 'nothing';
    if (!reloadIsSafe && !allowOffPageExit) {
      setAwaitingRefresh('cannot-persist');
      return 'withheld';
    }
    if (inspectUnsavedContent().dirty) {
      setAwaitingRefresh('unsaved-input');
      return 'withheld';
    }
    const options = reloadIsSafe ? {} : { destination: adWithdrawalExitUrl() };
    // A false return means either another path already claimed the one-shot reset for this
    // document — the correct outcome rather than a second navigation — or the destination was
    // refused, which is reported as a failure rather than assumed away.
    if (!terminateAdvertisingDocument(options)) {
      setAwaitingRefresh('cannot-persist');
      return 'withheld';
    }
    return 'replaced';
  };

  useEffect(() => {
    const open = () => {
      const state = readConsent();
      setAnalyticsChoice(state.analytics);
      setAdvertisingChoice(state.advertisingDecision === 'granted');
      setGranular(true);
      setVisible(true);
      setSaveFailed(false);
      setNotSynchronized(false);
      setAwaitingRefresh(false);
    };

    // A revocation seen in another tab. Deny-only: this cannot make advertising lawful here,
    // and it never asks the visitor anything.
    const unsubscribeSync = subscribeConsentSync(() => {
      // A revocation this document already carried out, echoing back on its own subscription,
      // is not new information: the action it would trigger has already been taken and its
      // message is already on screen.
      if (revokedByThisDocumentRef.current) return;
      const { tabDenied } = applyRemoteAdvertisingRevocation();
      // Only layers that survive navigation count, and a layer that could not be read is not
      // evidence that a grant disappeared: `indeterminate` must never become a reason to
      // replace a document. No off-page exit here — the visitor did not act in this tab.
      const durable = durableAdvertisingState();
      const reloadIsSafe = tabDenied || durable === 'absent' || durable === 'denied';
      setNotSynchronized(false);
      terminateLiveAdvertising(reloadIsSafe);
    });

    window.addEventListener(CONSENT_PREFERENCES_EVENT, open);
    return () => {
      window.removeEventListener(CONSENT_PREFERENCES_EVENT, open);
      unsubscribeSync();
    };
    // `terminateLiveAdvertising` only reads module state and stable props, so it is safe to
    // keep this effect mount-scoped; a dependency array including it would re-subscribe on
    // every render and leak channels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Commit a choice, then act on it.
   *
   * `askedAdvertising` is what keeps the two kinds of save apart: the analytics-only layout
   * records no advertising decision at all, while any panel that actually showed the
   * advertising control records exactly what the visitor chose.
   *
   * The rule M-19 added here, and the one that used to be missing: replacing the document is
   * an action taken *because a withdrawal happened*, so only a withdrawal may supply the
   * evidence that makes it safe. `safeToReset` starts false, is set only from
   * `revokeAdvertising()`'s verified result, and the termination call site additionally
   * requires `withdrewAdvertising`. An analytics-only save and a grant therefore have no path
   * to a document reset, not even one mediated by this document's own in-memory state — which
   * is exactly what must not be read as proof about a future document.
   */
  const applyChoice = (
    analytics: boolean,
    advertising: boolean,
    askedAdvertising: boolean,
  ): void => {
    const wasAdvertisingLive = advertisingAuthorization().authorized;
    const withdrewAdvertising = askedAdvertising && !advertising;
    const legacyMirror: 'accepted' | 'declined' | null = askedAdvertising
      ? null
      : analytics
        ? 'accepted'
        : 'declined';

    let persisted: boolean;
    // Conservative by construction: no branch below earns `true` except a verified withdrawal.
    let safeToReset = false;
    let synchronized = true;

    if (withdrewAdvertising) {
      // A real withdrawal: deny now, deny for the tab, then make it durable — and if it
      // cannot be made durable, clear the stale grant and confirm the absence instead.
      // Claimed before the call, because the call is what broadcasts the revocation.
      revokedByThisDocumentRef.current = true;
      const result = revokeAdvertising();
      persisted = result.persisted || result.durableCleared;
      safeToReset = result.safeToResetDocument;
      synchronized = result.synchronized;
    } else {
      persisted = askedAdvertising
        ? saveConsentChoice({ analytics, advertising }, { advertisingAsked: true })
        : saveAnalyticsChoice(analytics);
    }

    if (!persisted) {
      // Never report a durable outcome that did not happen. The in-memory revocation inside
      // the call above already denies advertising here; the record may still disagree.
      setSaveFailed(true);
      setNotSynchronized(!synchronized);
      if (withdrewAdvertising && wasAdvertisingLive && !advertisingAuthorization().authorized) {
        // The refusal exists nowhere that survives navigation, and a vendor script is running.
        // Reloading this URL could restore advertising from the grant this call could not
        // clear, so leave for a route that is refused by its path instead. The page arrived at
        // says the choice was not stored: reaching it is not reported as a saved withdrawal.
        terminateLiveAdvertising(safeToReset, true);
      } else if (wasAdvertisingLive && !advertisingAuthorization().authorized) {
        // A save that was not a withdrawal still cannot leave the visitor without an
        // explanation when advertising has stopped being authorised for another reason.
        setAwaitingRefresh('cannot-persist');
      } else {
        setAwaitingRefresh(false);
      }
      return;
    }

    setSaveFailed(false);
    setNotSynchronized(!synchronized);
    setWithdrawalUnsaved(false);

    if (legacyMirror) {
      try {
        localStorage.setItem(STORAGE_KEY, legacyMirror);
      } catch {
        /* the v1 record above is authoritative */
      }
    }
    if (analytics) loadGoogleAnalytics();

    const stillAuthorized = advertisingAuthorization().authorized;
    let outcome: 'replaced' | 'withheld' | 'nothing' = 'nothing';
    if (withdrewAdvertising && wasAdvertisingLive && !stillAuthorized) {
      // A withdrawal that *was* stored always has a verified `safeToReset` here, so the
      // off-page form of the exit is not needed and the visitor keeps their place on the page.
      outcome = terminateLiveAdvertising(safeToReset);
    } else {
      setAwaitingRefresh(false);
    }

    // The panel closes only when there is nothing left to tell the visitor. M-22's test run
    // caught the opposite behaviour: a termination withheld because the page holds unsent text
    // set the explanation and then hid the component that renders it, so the visitor withdrew
    // consent, saw no reason, and had no way to know the advertising was still running.
    if (outcome !== 'withheld') {
      setVisible(false);
      setGranular(false);
    }
  };

  // While advertising is off, the two buttons answer the analytics question only, and record
  // no advertising decision whatsoever.
  const handleAccept = () => applyChoice(true, false, false);
  const handleDecline = () => applyChoice(false, false, false);

  const handleOpenGranular = () => {
    const state = readConsent();
    setAnalyticsChoice(state.analytics);
    setAdvertisingChoice(state.advertisingDecision === 'granted');
    setGranular(true);
    setVisible(true);
  };

  const handleAcceptAll = () => applyChoice(true, true, true);
  const handleRejectAll = () => applyChoice(false, false, true);
  const handleSaveChoices = () => applyChoice(analyticsChoice, advertisingChoice, true);

  const openPrivacy = () => {
    navigateTo('/privacy');
  };

  /**
   * The notice a visitor sees on the page they were sent to when a withdrawal could not be
   * stored. Four things it must keep apart, and does: the advertising context ended with the
   * document that held it; the preference was *not* saved; a record saved earlier may still
   * allow advertising on eligible pages; and nothing on this page has been treated as consent
   * — least of all the act of arriving here.
   */
  const withdrawalNotice = withdrawalUnsaved ? (
    <div
      role="status"
      aria-live="polite"
      className="text-sm font-medium text-amber-900 bg-amber-50 border border-amber-300 rounded-lg p-3 flex flex-col gap-2"
    >
      <p>
        An advertising preference could not be saved to this device. Your browser may be
        blocking storage for this site, so nothing has been recorded as accepted and nothing
        here has been treated as consent — including arriving on this page.
      </p>
      <p>
        Advertising is never shown on this page. A preference saved earlier may still allow it
        on eligible public pages, so it can appear again until a refusal can be stored.
      </p>
      <button
        type="button"
        onClick={handleOpenGranular}
        className="self-start px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors"
      >
        Try again in Cookie &amp; Ad Preferences
      </button>
    </div>
  ) : null;

  // The exit page renders no banner at all — the visitor has already answered — but it must
  // still be able to carry the notice above, because this component, not the page, is what the
  // application mounts on every route.
  if (!visible) {
    if (!withdrawalNotice) return null;
    return (
      <div
        className="fixed bottom-0 inset-x-0 z-[9999] p-4 sm:p-6"
        role="region"
        aria-label="Advertising preference not saved"
      >
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl shadow-lg p-4 sm:p-5">
          {withdrawalNotice}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[9999] p-4 sm:p-6"
      role="region"
      aria-label="Cookie and privacy consent"
    >
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl shadow-lg p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
        {withdrawalNotice}
        {saveFailed && (
          <p
            role="alert"
            className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3"
          >
            Your choice could not be saved to this device — your browser may be blocking
            storage for this site. Advertising is switched off in this tab and nothing has been
            recorded as accepted, but it will not carry over to other tabs or to your next
            visit{notSynchronized ? ', and other tabs you already have open may still be showing advertising until you reload them' : ''}. Nothing has been treated as consent.
          </p>
        )}
        {/*
          Two versions because the sentence that is true when the refusal was stored is false
          when it was not: with nothing stored, reloading this URL can restore advertising from
          a grant that could not be cleared, and only leaving the page ends the running
          context. Saying "reload and it will be gone" in that case would be a false promise.
        */}
        {awaitingRefresh === 'unsaved-input' && !saveFailed && (
          <p
            role="status"
            className="text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3"
          >
            Your refusal has been saved. Advertising is switched off for every page you open
            next. It was not stopped on this page because something you have typed here has not
            been sent yet, and replacing the page would discard it — nothing you have written
            has been lost. When you have finished, reload or move to another page and
            advertising will be gone from here too.
          </p>
        )}
        {awaitingRefresh === 'unsaved-input' && saveFailed && (
          <p
            role="status"
            className="text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3"
          >
            Advertising is switched off in this tab, but the refusal could not be stored, and
            it was not stopped on this page either: something you have typed here has not been
            sent yet, and replacing the page would discard it. Nothing you have written has
            been lost. Move to another page to end the advertising running here. Reloading this
            page could bring it back, from a record we could not clear, until a refusal can be
            saved.
          </p>
        )}
        {awaitingRefresh === 'cannot-persist' && (
          <p
            role="status"
            className="text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3"
          >
            Advertising has been switched off in this tab, but the choice could not be stored
            dependably, so this page was not replaced — a reload might have restored it from a
            record we could not clear. Advertising that is already running here may continue
            until you move to another page or reload it yourself. Please save your work first.
            Nothing has been treated as consent.
          </p>
        )}

        {!granular ? (
          <>
            <p className="text-sm text-slate-600 flex-1">
              We use cookies and analytics to improve your experience. You can accept or
              decline tracking. Advertising is a separate choice and is not enabled by this
              banner.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDecline}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
              >
                Accept
              </button>
              {MONETAG_ANY_ENABLED && (
                <>
                  <button
                    onClick={handleRejectAll}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Reject all
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
                  >
                    Accept all
                  </button>
                  <button
                    onClick={handleOpenGranular}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 underline underline-offset-2 transition-colors"
                  >
                    Choose per purpose
                  </button>
                </>
              )}
              <button
                onClick={openPrivacy}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 underline underline-offset-2 transition-colors"
              >
                Privacy policy
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-700">Your consent choices</p>

            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input type="checkbox" checked disabled className="mt-0.5" aria-label="Essential" />
              <span>
                <span className="font-medium text-slate-700">Essential</span>
                {' '}— required to sign in, keep you logged in, and run attendance and leave
                features. Cannot be switched off and is never used for advertising.
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={analyticsChoice}
                onChange={(e) => setAnalyticsChoice(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-slate-700">Analytics</span>
                {' '}— Google Analytics and Vercel Analytics, to understand how the app is used.
              </span>
            </label>

            <div className="flex items-start gap-3 text-sm text-slate-600">
              {MONETAG_ANY_ENABLED ? (
                <>
                  <input
                    type="checkbox"
                    checked={advertisingChoice}
                    onChange={(e) => setAdvertisingChoice(e.target.checked)}
                    className="mt-0.5"
                    // Named for assistive technology and for a regression test that has to
                    // operate exactly this control: the row's explanatory text sits in a
                    // sibling <span>, so without a label this checkbox had no accessible name.
                    aria-label="Advertising"
                  />
                  <span>
                    <span className="font-medium text-slate-700">Advertising — Monetag</span>
                    {' '}allows in-page advertising supplied by Monetag on public content pages
                    such as the blog and guides. It is never shown on your dashboard,
                    attendance, leave, or any other signed-in screen, and it is separate from
                    analytics: choosing one does not choose the other. In-page advertising is
                    not the same as browser notifications — this never asks you to turn
                    notifications on.
                  </span>
                </>
              ) : (
                <span>
                  <span className="font-medium text-slate-700">Advertising — Monetag</span>
                  {' '}is currently switched off on this site, so there is nothing to consent to
                  yet. If it is ever enabled, it will be offered here as its own explicit
                  choice, and only on public content pages — never in the signed-in
                  application. Your answers above are not taken as advertising consent.
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500">
              You can review or withdraw either choice at any time using
              {' '}&ldquo;Cookie &amp; Ad Preferences&rdquo; in the footer of our public pages.
              See the{' '}
              <button
                type="button"
                onClick={openPrivacy}
                className="underline underline-offset-2 font-medium text-slate-700 hover:text-slate-900"
              >
                privacy policy
              </button>{' '}
              for what is collected and why.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setGranular(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSaveChoices}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
              >
                Save choices
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CookieConsent;
