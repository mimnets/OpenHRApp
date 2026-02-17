# GDPR Cookie Consent — Compliance Requirements

## Current State

A cookie consent banner has been implemented in `src/components/CookieConsent.tsx`. It:

- Shows a banner on first visit with **Accept** / **Decline** buttons
- Stores the user's choice in `localStorage` (`openhr-cookie-consent`)
- Only loads Google Analytics (`G-KNNWM2N5NL`) dynamically after the user accepts
- Does NOT load GA if the user declines
- Does not re-appear once a choice is made

**Files involved:**
- `src/components/CookieConsent.tsx` — banner component
- `src/App.tsx` — renders the banner at root level
- `index.html` — GA scripts removed from `<head>` (loaded dynamically via consent)

---

## What's Missing for Full GDPR Compliance

### 1. Privacy Policy Page
- **Requirement:** GDPR Article 13 requires you to inform users about what personal data is collected, the purpose, retention period, and third parties involved.
- **Action:** Create a `/privacy` page (or `#/privacy` hash route) that clearly states:
  - What cookies/tracking are used (Google Analytics 4)
  - What data GA collects (anonymized IP, page views, device info, etc.)
  - Why it's collected (usage analytics to improve the product)
  - How long data is retained (set in GA4 settings, default 14 months)
  - That data is shared with Google (third party)
  - Contact information for data-related requests
- **Banner update:** Add a "Privacy Policy" link to the consent banner text.

### 2. Ability to Withdraw Consent
- **Requirement:** GDPR Article 7(3) — withdrawing consent must be as easy as giving it.
- **Action:** Add a "Manage Cookies" or "Cookie Preferences" option accessible at any time, for example:
  - A link in the app footer
  - An option in the Settings page
- **Behavior:** Clicking it should clear the `openhr-cookie-consent` localStorage key and re-show the banner, or provide a toggle to switch between accepted/declined.

### 3. More Specific Disclosure in the Banner
- **Requirement:** Consent must be informed — users need to know what they're agreeing to.
- **Action:** Update the banner text to be more specific, for example:
  > "We use Google Analytics to understand how you use OpenHR so we can improve the experience. This involves cookies that track page views and basic device information. See our [Privacy Policy] for details."

### 4. Cookie Categorization (Optional but Recommended)
- **Requirement:** GDPR distinguishes between:
  - **Strictly necessary cookies** — no consent needed (e.g., auth session)
  - **Analytics cookies** — consent required (e.g., Google Analytics)
  - **Marketing cookies** — consent required (not applicable currently)
- **Action:** If more cookie types are added in the future, the banner should allow granular opt-in per category.

---

## Implementation Checklist

- [ ] Create a Privacy Policy page with all required disclosures
- [ ] Add a "Privacy Policy" link to the cookie consent banner
- [ ] Add a "Manage Cookies" link in the footer or Settings page
- [ ] Update banner text to specifically mention Google Analytics and what it tracks
- [ ] (Optional) Add cookie categorization if more tracking/marketing tools are added

---

## References

- [GDPR Full Text — Article 7 (Conditions for consent)](https://gdpr-info.eu/art-7-gdpr/)
- [GDPR Full Text — Article 13 (Information to be provided)](https://gdpr-info.eu/art-13-gdpr/)
- [Google Analytics & GDPR](https://support.google.com/analytics/answer/9019185)
- [ICO Cookie Guidance (UK)](https://ico.org.uk/for-organisations/guide-to-pecr/cookies-and-similar-technologies/)
