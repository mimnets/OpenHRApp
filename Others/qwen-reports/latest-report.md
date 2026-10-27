# Monetag Ads-OFF Release — Final Preflight

**Date:** 2026-10-17

---

## 1. Git State

- **Staged:** Nothing. `git diff --cached --name-only` returned empty.
- **Working tree:** 15 modified (tracked) + 9 untracked files.
- **HEAD:** `b385268` (origin/main, origin/HEAD — all in sync).

The previous report incorrectly implied files were staged. They are not.

---

## 2. Exact 18 Release Paths

### Modified (11)

| # | Path |
|---|------|
| 1 | `index.html` |
| 2 | `src/App.tsx` |
| 3 | `src/components/CookieConsent.tsx` |
| 4 | `src/components/__tests__/CookieConsent.test.tsx` |
| 5 | `src/components/ads/__tests__/adPolicyGates.test.ts` |
| 6 | `src/components/blog/BlogFooter.tsx` |
| 7 | `src/components/landing/Footer.tsx` |
| 8 | `src/components/tutorials/TutorialsFooter.tsx` |
| 9 | `src/data/changelog.ts` |
| 10 | `src/pages/PrivacyPolicyPage.tsx` |
| 11 | `src/pages/TutorialPage.tsx` |

### Untracked (7)

| # | Path |
|---|------|
| 12 | `src/config/monetag.ts` |
| 13 | `src/utils/monetagLoader.ts` |
| 14 | `src/utils/adConsent.ts` |
| 15 | `src/test/adConsentState.test.ts` |
| 16 | `src/test/monetagGate.test.ts` |
| 17 | `src/test/monetagVignetteGate.test.ts` |
| 18 | `src/test/swOwnershipGuard.test.ts` |

---

## 3. Excluded (6)

| Path | Reason |
|------|--------|
| `.gitignore` | Not required for integration |
| `.claude/settings.local.json` | Claude Code local settings |
| `.claude/settings.json` | Claude Code permissions config |
| `Others/CLAUDE.md` | Claude Code documentation |
| `Others/qwen-reports/` | Report directory |
| `src/test/daylightTokens.test.ts` | Unrelated CRLF normalization fix |

---

## 4. Flags Confirmed

```
src/config/monetag.ts:29: export const MONETAG_ENABLED = false;
src/config/monetag.ts:32: export const MONETAG_VIGNETTE_ENABLED = false;
```

Both OFF. No secrets, localhost URLs, mock scripts, or temp values in any of the 18 paths.

---

## 5. Rollback Target

**Commit `b385268`** is HEAD, origin/main, and origin/HEAD. Vercel auto-deploys from `main`, so this is the assumed current production deployment.

**Honest caveat:** I cannot verify the actual live Vercel deployment without dashboard access. Before relying on this for rollback, the owner should confirm in the Vercel dashboard (Deployments tab) which deployment is currently live and note its deployment ID or timestamp for "Promote to Production" rollback.

---

## 6. Safety Assessment

All 18 paths are safe to stage together:

- All changes are Monetag integration related
- No unrelated modifications mixed in
- No secrets or credentials
- Both flags false — no advertising served
- Vercel config (`vercel.json`) unchanged
- Workbox service worker (`src/sw.ts`) unchanged
- `vite.config.ts` unchanged
- Consent flow preserves default-deny
- Privacy policy honestly states advertising is "currently disabled"

---

## 7. Proposed Staging Commands (NOT EXECUTED)

```bash
git add index.html src/App.tsx src/components/CookieConsent.tsx src/components/__tests__/CookieConsent.test.tsx src/components/ads/__tests__/adPolicyGates.test.ts src/components/blog/BlogFooter.tsx src/components/landing/Footer.tsx src/components/tutorials/TutorialsFooter.tsx src/data/changelog.ts src/pages/PrivacyPolicyPage.tsx src/pages/TutorialPage.tsx src/config/monetag.ts src/utils/monetagLoader.ts src/utils/adConsent.ts src/test/adConsentState.test.ts src/test/monetagGate.test.ts src/test/monetagVignetteGate.test.ts src/test/swOwnershipGuard.test.ts
```

```bash
git status
```

Confirm exactly 18 files staged, nothing else.

```bash
git commit -m "Add Monetag advertising integration (both formats OFF)

- IPP zone 12046475 and Vignette zone 12054036 configured but disabled
- Consent flow with default-deny, explicit opt-in required
- Route classification restricts to /how-to-use/:slug articles
- Document teardown on consent withdrawal
- Privacy policy and changelog updated
- Gatekeeper CMP scripts removed (unused)
- Cookie & Ad Preferences footer links added

Both MONETAG_ENABLED and MONETAG_VIGNETTE_ENABLED are false.
No advertising is served."
```

```bash
git push origin main
```

---

## 8. Owner Approval Request

**Approve staging, committing, and pushing exactly these 18 files with both Monetag flags OFF to production on openhrapp.com.**

After deployment, confirm in Vercel dashboard which deployment is live and note its ID for rollback.

---

## Staging List (exact)

```
index.html
src/App.tsx
src/components/CookieConsent.tsx
src/components/__tests__/CookieConsent.test.tsx
src/components/ads/__tests__/adPolicyGates.test.ts
src/components/blog/BlogFooter.tsx
src/components/landing/Footer.tsx
src/components/tutorials/TutorialsFooter.tsx
src/data/changelog.ts
src/pages/PrivacyPolicyPage.tsx
src/pages/TutorialPage.tsx
src/config/monetag.ts
src/utils/monetagLoader.ts
src/utils/adConsent.ts
src/test/adConsentState.test.ts
src/test/monetagGate.test.ts
src/test/monetagVignetteGate.test.ts
src/test/swOwnershipGuard.test.ts
```

**STOP. Awaiting explicit owner approval.**
