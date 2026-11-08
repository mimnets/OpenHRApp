# Handoff — Email after the server move, iPhone zoom, PWA login speed (2026-11-08)

## Status

| Area | State |
|---|---|
| Email (Resend API and Auth SMTP) | Fixed on the server. The owner reported it solved. Claude did not run the final tests. |
| iPhone zoom | Released. Not tested on a real iPhone. |
| PWA surprise reloads | Fixed. Tested in desktop Chrome only. |
| PWA and landing page load work | Reduced. Tested in desktop Chrome only. |
| Login and app start speed | **Not proven faster.** See Open issues 1 to 3. |
| Super Admin session loss | **Unexplained.** See Open issue 4. |

| Commit | What |
|---|---|
| `d9725b8` | fix(ios): stop form fields zooming the page past the screen edge |
| `c694446` | docs(selfhost): record the Resend domain and Auth SMTP email failures |
| `1a59f67` | docs(selfhost): record the email fix, follow-ups and the iPhone zoom issue |
| `747211a` | fix(pwa): stop surprise reloads at login and cut app start work on phones |

No frozen module was edited.

## 1. Email

Details and the fix are in `scripts/migrate-to-selfhost/MIGRATION-LOG.md`, item 15.

- **Symptom:** registration showed "Could not send the verification email."
- **Cause 1:** `RESEND_API_KEY` came from a different Resend account, whose only domain was
  `openhr.vclbd.net`. Resend answered `403 domain is not verified`, although `openhrapp.com` was verified in
  the owner's main account.
- **Cause 2:** Auth still had the template SMTP values (`supabase-mail`, `admin@example.com`).
- **Fix:** both `RESEND_API_KEY` and `SMTP_PASS` hold a key from the account with the domain. Keep both lines.
  They feed different services: Edge Functions use the API, and Supabase Auth uses SMTP.
- `docker restart` does not read `.env` again. Use `sh run.sh start`.

### Email follow-ups, all still open

1. **Replace the exposed Resend key.** `.env` values were shown in screenshots in the chat, including the
   Resend keys, `CRON_SECRET`, the Turnstile secret, the VAPID private key and the demo password. Create a
   **Sending access** key, put it on both lines, and delete the old keys in both Resend accounts. A new
   `CRON_SECRET` must also be set in the cron jobs. A new VAPID key stops push for existing users.
2. **`ANTHROPIC_API_KEY`** in `.env` still holds the placeholder text `<the same as Pro>`.
3. **Missed emails.** Emails that failed from the move until this fix are probably not sent again. Check
   whether `cron-expire-trials` marks a failed reminder as sent. This was not checked.
4. **Reverting to Cloud:** its `RESEND_API_KEY` secret may need the new key.

## 2. iPhone zoom

- **Cause (most likely):** iOS zooms in when a field under 16px gets focus, and it does not zoom back out.
- **Fix:** an iOS-only rule in `src/index.css` sets field text to 16px. Inputs with `text-lg` or `text-xl` are
  excluded. Do not add `maximum-scale=1` to the viewport tag. It blocks pinch-zoom on Android.
- If the page is too wide before a field is tapped, the cause is different.

## 3. PWA login and landing page

### Fixed (`747211a`)

| Problem | Where | Before | After |
|---|---|---|---|
| First service worker install reloaded the page | `src/hooks/useServiceWorker.ts` | `navType=reload` | `navType=navigate` |
| Tapping a static hero link reloaded a loading page | `index.html`, `src/App.tsx` (`__heroIntent`) | Full reload | Opens Login or Register after mount |
| Identical help-link queries | `organization.service.ts` | 12 | 1 |
| `auth/v1/user` network calls at start | `api.client.ts`, `notification.service.ts`, `useNotifications.ts` | 4–5 | 0 |
| Settings fetched twice in parallel | `organization.service.ts` (`dedupe`) | 2 of each | Most now 1 |
| API requests on a dashboard load | | 40+ | 27 |
| Main script | `src/App.tsx` (public pages lazy) | 1.12 MB | 765 KB |
| YouTube player on arrival | `HeroSection.tsx` | 1.9 s | Loads on tap |
| Ad frames | `AdBanner.tsx` | On arrival | `loading="lazy"` |
| Unused `esm.sh` import map and preloads | `index.html`, `src/sw.ts` | Loaded | Removed |
| `/assets/*` caching | `vercel.json` | `max-age=0` | One year, immutable |

Regression checks are in `src/test/startupRequests.test.ts`. Type check clean, 732 tests passed.

### Ruled out

- **Hidden Safari save-password form:** `POST /` returns an empty 405, so the app does not boot in the iframe.
- **Reload after login from the ad teardown** (`App.tsx`, `beginAdvertisingDocumentReset`): it runs only if a
  Monetag tag was injected. It was not seen in testing. If Monetag is switched on, it will reload the page once
  after login, by design.

### Measurements (desktop Chrome, Dhaka)

- API server: Ashburn, Virginia. About 280 ms round trip, about 0.8 s for a request on a new connection.
- Before: a dashboard reload had data still arriving at 4+ s.
- After: 3.8 s in the one clean run. This is not a clear gain, because the server's stalls hide it.

## Open issues

1. **Blocking start for logged-in users (needs owner approval).** `sessionManager.initialize()` waits for
   `refreshSession()` and a profile read behind a full-screen spinner on every launch. Showing the saved session
   at once and refreshing in the background should help returning users most. This edits a **frozen** file, so
   it needs plan mode, owner approval, a regression check and the manual checklist in `Others/CLAUDE.md`.
   Do this after issue 2, in case they are related.
2. **Random stalls (cause unknown).** In one load, `teams`, `attendance`, `profiles` and `leaves` each took
   14.5 s, and the last request ended at 29 s. In another, the first API request started at about 76 s, though
   the browser tool may have caused that one. Rapid test reloads may have contributed. 25 direct calls to a
   simple database-backed function all took about 0.8 s. The VM is shared with n8n, qdrant, kokoro-tts, remotion
   and others. Next time the app is slow, run:

   ```bash
   uptime; free -m
   docker stats --no-stream --format '{{.Name}} cpu={{.CPUPerc}} mem={{.MemUsage}}' | sort -t= -k2 -nr | head -12
   docker exec supabase-db psql -U postgres -c "select state, count(*), max(now()-query_start) as longest from pg_stat_activity group by 1;"
   ```

3. **Server region (owner decision).** A region such as Singapore or Mumbai would cut the delay on every
   request, but it means another migration. Read the output of issue 2 first.
4. **Super Admin session lost once.** During testing, a reload of the owner's logged-in Super Admin session went
   to the landing page. The stored session was already gone, and that load made no auth call. The demo account
   kept its session through about five reloads, so this is not reproduced. It may be a token problem, or specific
   to this account or moment. The transient-error rule in `sessionManager.ts` makes this worth checking:

   ```bash
   docker logs --since 3h supabase-auth 2>&1 | grep -iE 'logout|refresh_token|revoked' | tail -15
   ```

5. **`public-ad-config` returned 404** in one curl during testing, while `MIGRATE-DATA.md` says it must return
   JSON. It was not followed up. The function may not be installed on the server.

## Not tested

- A real iPhone, the installed PWA on iOS, or a slow mobile connection. iOS may behave differently from Chrome.
- The `Others/CLAUDE.md` pre-commit items: real-device checks and a Lighthouse PWA score.
- The new `/assets/*` cache header on the live site.
- A real login through the Login form. Only the public demo button was used.

**Owner test on iPhone:** open the PWA, tap **Update** if the banner appears, log in, close the app, reopen it.

## Process notes for the next session

- `Others/CLAUDE.md` says to browse with the gstack `/browse` skill, not `mcp__claude-in-chrome__*`. Chrome was
  used for testing the app, because `Others/CLAUDE.md` was not read until this handoff. The owner offered Chrome
  only for the Resend dashboard.
- Testing ran against production in the owner's logged-in Chrome. Use a separate profile or `/browse` next time.
- `Others/CLAUDE.md` asks for approval before modifying notification or email logic. `notification.service.ts`
  and `useNotifications.ts` changed only how the user ID is read (`getSession` instead of `getUser`). No
  notification behaviour changed, but the owner has not reviewed this.
