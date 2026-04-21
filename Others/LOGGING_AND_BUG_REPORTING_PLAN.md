# Logging, Telemetry & Bug Reporting — Plan

Owner: engineering
Status: Draft / proposal — no code changes made yet
Target stack: React 19 (Vite) web + Capacitor Android + PocketBase backend (`Others/pb_hooks/*.pb.js`)

---

## 1. Goals

We need a single, inspectable trail for three classes of signal:

1. **Errors / crashes** — uncaught exceptions, React render errors, promise rejections, native (Capacitor) crashes, failed API calls.
2. **Usage events** — feature usage, navigation, check-in / check-out lifecycle, session + workday state transitions (these are already load-bearing and have regressed 3× per `CLAUDE.md` — they deserve first-class logging).
3. **User-submitted bug reports** — an in-app "Report a problem" affordance that attaches the recent client log + device metadata, so we can triage without asking users to re-describe.

All three must land in a store **we own** (PocketBase) so there is no third-party data-processor story to write for GDPR, and so the existing admin UI / super-admin tooling can inspect them.

Non-goals for v1: real-time dashboards, PII redaction beyond the basics, alerting integrations (Slack/PagerDuty). Those come later once data is flowing.

---

## 2. Current state (what exists today)

- `src/components/ErrorBoundary.tsx` catches render errors but only does `console.error` — the error never leaves the device.
- ~161 `console.*` calls across 30 files in `src/` — useful during dev, invisible in production.
- No central logger. No crash telemetry. No in-app bug-report form.
- Frozen session/workday modules (see `CLAUDE.md`) log via `console.*` only, which is exactly why the regressions have been hard to diagnose.
- No PocketBase collection exists for client-side logs or bug reports.

---

## 3. Architecture overview

```
┌─────────────────────────────────────────────────────┐
│  Client (React / Capacitor Android)                 │
│                                                     │
│   src/utils/logger.ts  ◄── single entry point       │
│     ├── ring buffer (in-memory, last N=200 entries) │
│     ├── IndexedDB persistence (survives reload)     │
│     ├── batch flusher (every 30s or 50 entries)     │
│     └── global handlers: window.onerror,            │
│         unhandledrejection, ErrorBoundary           │
│                                                     │
│   src/components/BugReportModal.tsx                 │
│     └── user-facing "Report a problem" form        │
│         attaches last N log entries + device info   │
└──────────────────┬──────────────────────────────────┘
                   │ POST /api/collections/...
                   ▼
┌─────────────────────────────────────────────────────┐
│  PocketBase                                         │
│   Collections:                                      │
│     - client_logs    (append-only, TTL 30d)         │
│     - bug_reports    (append-only, admin-managed)   │
│   pb_hooks:                                         │
│     - sanitize payloads, enforce rate limits,       │
│       auto-tag org_id from authed user              │
└─────────────────────────────────────────────────────┘
```

Key design choice: the **client logger is the single funnel**. Every error path (ErrorBoundary, API client, session manager, global handlers) routes through `logger.ts`. Bug reports are just "a user-triggered flush of the buffer with extra context."

---

## 4. Data model (PocketBase collections)

### 4.1 `client_logs`

Append-only log stream. One record = one log event.

| field          | type     | notes                                                     |
|----------------|----------|-----------------------------------------------------------|
| id             | text     | PB auto                                                   |
| created        | datetime | PB auto, indexed                                          |
| level          | select   | `debug` \| `info` \| `warn` \| `error` \| `fatal`         |
| source         | text     | e.g. `session-manager`, `api-client`, `error-boundary`    |
| message        | text     | short human message, max 500 chars                        |
| context        | json     | structured payload (no PII, see §6)                       |
| stack          | text     | stack trace if error, max 4000 chars                      |
| user           | relation | → `users`, nullable (unauth errors still log)             |
| org            | relation | → `organizations`, nullable                               |
| session_id     | text     | client-generated UUID per app launch                      |
| release        | text     | build version (e.g. `0.0.0+commit-abc123`)                |
| platform       | select   | `web` \| `android`                                        |
| app_version    | text     | Capacitor app version / `package.json` version           |
| user_agent     | text     | truncated UA                                              |

Rules:
- `create`: anyone (including unauth — we want boot-time errors)
- `list`/`view`: super-admin only; org admins can view records where `org = request.auth.org`
- `update`/`delete`: super-admin only

Indexes: `created` DESC, `(org, created)`, `(level, created)`.

TTL: a nightly cron in `Others/pb_hooks/cron.pb.js` deletes records older than 30 days (configurable — see §8.2).

### 4.2 `bug_reports`

User-initiated. Richer and longer-lived than `client_logs`.

| field        | type     | notes                                                   |
|--------------|----------|---------------------------------------------------------|
| id           | text     | PB auto                                                 |
| created      | datetime | PB auto                                                 |
| title        | text     | user-entered, required, <= 120 chars                    |
| description  | text     | user-entered, required, <= 4000 chars                   |
| steps        | text     | optional repro steps                                    |
| screenshot   | file     | optional, max 2 MB, jpg/png                             |
| log_excerpt  | json     | last ~100 client_logs entries captured at submit time   |
| device_info  | json     | platform, OS, app_version, network type, screen         |
| route        | text     | current route / page when submitted                     |
| user         | relation | → `users`, required                                     |
| org          | relation | → `organizations`                                       |
| status       | select   | `new` \| `triaged` \| `in_progress` \| `resolved` \| `wontfix` |
| priority     | select   | `low` \| `normal` \| `high` \| `critical`               |
| assignee     | relation | → `users` (super-admin team), nullable                  |
| notes        | text     | internal-only, admin-editable                           |

Rules:
- `create`: authed users (so we know who reported)
- `list`/`view`: super-admin; user can view their own
- `update`: super-admin only (status, priority, assignee, notes)
- `delete`: super-admin only

---

## 5. Client implementation

### 5.1 `src/utils/logger.ts` (new)

Public API (keep it tiny — this will be called from many places):

```ts
logger.debug(source: string, message: string, context?: object): void
logger.info (source: string, message: string, context?: object): void
logger.warn (source: string, message: string, context?: object): void
logger.error(source: string, message: string, err?: Error, context?: object): void
logger.fatal(source: string, message: string, err?: Error, context?: object): void

logger.flush(): Promise<void>          // force-send now
logger.getRecent(n?: number): Entry[]  // for bug report modal
logger.setUser(userId, orgId): void    // called after login
logger.clearUser(): void               // called on logout
```

Internal behavior:
- Ring buffer of 200 entries in memory + persist to IndexedDB (`openhr-logs` DB) so a crash → reload still keeps the trail.
- Batch flush on: 50 entries queued, 30s timer, `visibilitychange` → hidden, before `beforeunload`, or manual `flush()`.
- Failure to POST: keep in IndexedDB and retry next flush. Cap IndexedDB at 2000 entries (drop oldest).
- Each entry stamped with `session_id` (generated once per app launch), `release`, `platform`, `app_version`.
- **Never** include: raw passwords, auth tokens, full request bodies for `/auth/*`. See §6.

### 5.2 Global error handlers (new file `src/utils/installGlobalErrorHandlers.ts`)

Install once from `src/index.tsx`:

- `window.addEventListener('error', ...)` → `logger.error('window', ...)`
- `window.addEventListener('unhandledrejection', ...)` → `logger.error('promise', ...)`
- On Capacitor Android, also listen to `App.addListener('appStateChange', ...)` and log state transitions (helps diagnose the auto-close / session regressions).

### 5.3 `ErrorBoundary` update

`src/components/ErrorBoundary.tsx` → in `componentDidCatch`, also call `logger.fatal('error-boundary', error.message, error, { componentStack })`. Keep the existing console.error during dev.

### 5.4 API client integration

`src/services/api.client.ts` — wrap fetch/PB calls so every non-2xx response logs one `warn` or `error` entry with `{ method, url, status, durationMs }` (no request body). Do NOT log auth endpoints' bodies.

### 5.5 Frozen-module instrumentation (read §7 first)

`sessionManager.ts`, `workdaySessionManager.ts`, and `AuthContext.tsx` need structured logs at every state transition:
`session.started`, `session.resumed`, `session.auto_closed`, `workday.opened`, `workday.closed`, etc.

**This is an edit to a frozen file** and requires the plan-approval gate per `CLAUDE.md`. Do not bundle this with the logger rollout — propose it as a separate change-control PR.

### 5.6 Bug report UI — `src/components/BugReportModal.tsx`

- Accessible from: user menu → "Report a problem" and from the `ErrorBoundary` fallback screen.
- Fields: title, description, optional steps, optional screenshot.
- On submit: attach `logger.getRecent(100)`, current route (`window.location.pathname`), device info (`navigator.userAgent`, `window.screen`, Capacitor `Device.getInfo()` when on Android), then POST to `bug_reports`.
- On success: show ticket id, "we'll look into it."

### 5.7 Admin inspection UI

New page: `src/pages/admin/Logs.tsx` (super-admin only)
- Tabs: **Client Logs** / **Bug Reports**
- Filters: level, source, org, date range, user, free-text search on `message`.
- Bug-report detail view: full description, log excerpt rendered as a collapsible table, screenshot preview, status/priority/assignee editor.

---

## 6. Privacy & PII handling

Per `Others/GDPR_COOKIE_COMPLIANCE.md` we already have a cookie-consent story; logging is a separate concern and needs the same care.

Hard rules:
1. **Never** log passwords, auth tokens, session cookies, OTP codes.
2. **Never** log full selfie image blobs (log the fact of upload + size + success/fail, not the bytes).
3. Truncate `user_agent` to 300 chars, `message` to 500, `stack` to 4000.
4. `context` payloads: the logger strips known-sensitive keys (`password`, `token`, `authorization`, `cookie`, `secret`, `apiKey`) recursively before send.
5. Bug-report screenshots: user explicitly opts in by attaching them; show a warning ("screenshots may contain personal data").
6. Document logging in the privacy policy (`src/pages/PrivacyPolicyPage.tsx`) as part of the rollout.

Retention:
- `client_logs`: 30 days, nightly purge via pb_hooks cron.
- `bug_reports`: 1 year, then archive/delete after review.

---

## 7. Rollout phases

Each phase is a separate PR so we can pause and evaluate. Respect the git workflow in `CLAUDE.md` (stage specific files, update `changelog.ts`, commit, push).

### Phase 1 — Backend (no client changes)
- Add `client_logs` and `bug_reports` collections (migration script or `Others/pb_hooks/setup_collections.pb.js` extension).
- Add rate-limit hook in pb_hooks: cap anonymous `client_logs.create` at 60/min per IP, authed at 300/min per user.
- Add 30-day purge job to `cron.pb.js` (new block, **not** inside `auto_close_sessions`).
- Update `scripts/validate-pb-hooks.cjs` if new blocks need allow-listing.

### Phase 2 — Client logger core
- Add `src/utils/logger.ts` + `installGlobalErrorHandlers.ts`.
- Wire from `src/index.tsx` and update `ErrorBoundary`.
- Instrument `api.client.ts`.
- **Do not** touch frozen modules yet.
- Feature-flag via `config`: `VITE_LOGGING_ENABLED` (default on in prod, off in dev for noise).

### Phase 3 — Bug report UI
- `BugReportModal.tsx` + entry points from user menu and `ErrorBoundary` fallback.
- Capacitor: pull device info via `@capacitor/device` (add dep).

### Phase 4 — Admin inspection
- `src/pages/admin/Logs.tsx` with filters and bug-report triage.
- Add to super-admin nav.

### Phase 5 — Frozen-module instrumentation (separate approval)
- Propose plan per `CLAUDE.md` frozen-module gate.
- Add structured state-transition logs to session + workday managers.
- This is the payoff for the whole project — the next session regression should be diagnosable from logs alone.

### Phase 6 — Refinement (after data is flowing for ~2 weeks)
- Replace high-signal `console.*` calls in services with `logger.*`.
- Add weekly digest: top 10 errors by count, top 5 orgs by error rate.
- Consider: Sentry/PostHog if in-house load becomes a problem. Decide with real data, not speculation.

---

## 8. Operational concerns

### 8.1 Cost / volume
Assume 100 orgs × 20 users × ~5 errors+warns/day = ~10k rows/day. At 30-day retention that's 300k rows — PocketBase / SQLite handles this trivially with the proposed indexes.

### 8.2 Configuration
Add to env / config (`src/config`):
- `VITE_LOGGING_ENABLED` (bool, default true)
- `VITE_LOG_LEVEL_MIN` (`debug`|`info`|`warn`|`error`, default `info` in prod, `debug` in dev)
- `VITE_LOG_FLUSH_INTERVAL_MS` (default 30000)
- `VITE_LOG_BATCH_SIZE` (default 50)

### 8.3 Offline behavior (Android / PWA)
IndexedDB persistence already handles this — entries queue offline and flush when connectivity returns. `useServiceWorker.ts` should not intercept log POSTs (add URL exclusion).

### 8.4 Do not break the session/workday invariants
The whole reason this plan exists is to diagnose session regressions. It would be deeply ironic if the logger itself caused one. Requirements:
- Logger's own failures must never throw out of `logger.*` calls (wrap everything in try/catch internally).
- Logger must not block the render path — all network I/O async and deferred.
- Flush on `beforeunload` uses `navigator.sendBeacon` (fire-and-forget), not blocking fetch.

---

## 9. Concrete step-by-step task list

1. **[backend]** Design and add `client_logs` + `bug_reports` collections. Document in `Others/POCKETBASE_V2_SCHEMA.md`.
2. **[backend]** Add rate-limit + sanitization hooks in a new `Others/pb_hooks/logging.pb.js` (do not touch `cron.pb.js`'s frozen `auto_close_sessions` block — add purge as a separate block).
3. **[backend]** Extend `scripts/validate-pb-hooks.cjs` if needed.
4. **[client]** Create `src/utils/logger.ts` with ring buffer + IndexedDB + batch flush.
5. **[client]** Create `src/utils/installGlobalErrorHandlers.ts` and call from `src/index.tsx`.
6. **[client]** Update `src/components/ErrorBoundary.tsx` to forward to logger.
7. **[client]** Wrap `src/services/api.client.ts` to log failed responses.
8. **[client]** Add `src/components/BugReportModal.tsx` + entry points.
9. **[client]** Add `@capacitor/device` dep for Android metadata.
10. **[admin]** Add `src/pages/admin/Logs.tsx` inspection page.
11. **[docs]** Update `src/pages/PrivacyPolicyPage.tsx` to disclose log collection.
12. **[docs]** Update `src/data/changelog.ts` per phase.
13. **[frozen — separate approval]** Instrument session + workday managers per `CLAUDE.md` change-control.
14. **[ops]** After 2 weeks of data, review top errors and decide on Phase 6 refinements.

---

## 10. Open questions (flag to user before implementing)

- Retention: 30 days for `client_logs` — acceptable, or want 7/14/60?
- Should org admins see their org's logs, or super-admin only?
- Bug-report screenshots: store in PB, or skip files v1 and only accept text?
- Do we want email notification to super-admin on new `bug_report` (uses existing `emailService.ts`), or only in-app?
- Is a third-party service (Sentry) off the table entirely for GDPR reasons, or acceptable if EU-hosted?
