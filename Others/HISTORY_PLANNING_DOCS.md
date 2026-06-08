# Historical Planning Documents — Implementation Plans

These documents were planning/design documents for features that are now implemented.
Consolidated here as a summary. All plans have been executed and the features are live.

---

## What existed (files now consolidated and deleted)

| File | Size | Status |
|------|------|--------|
| `ATTENDANCE_NOTIFICATIONS_PLAN.md` | 3KB | Implemented |
| `AUTO_ABSENT_CHECK_PLAN.md` | 12KB | Implemented |
| `AUTO_CLOSE_SESSION_PLAN.md` | 13KB | Implemented |
| `CHECKIN_SYNC_QUEUE_RECORD.md` | 12KB | Implemented |
| `CONCURRENCY_FIX_RECORD.md` | 7KB | Implemented |
| `IMAGE_MANAGEMENT_PLAN.md` | 16KB | Implemented |
| `LOGGING_AND_BUG_REPORTING_PLAN.md` | 17KB | Not yet implemented (draft) |
| `PUSH_NOTIFICATION_PLAN.md` | 5KB | Implemented |
| `SCALING_PLAN.md` | 19KB | Implemented (quick wins) |
| `SCALING_IMPLEMENTATION_LOG.md` | 18KB | Implemented |
| `SEO_AUDIT_REPORT.md` | 17KB | Implemented |
| `GUIDES_SEO_REWRITE_PLAN.md` | 13KB | Implemented |

## Key details preserved

### Attendance Notifications
- Late check-in alerts to managers + admin/HR
- Checkout reminders to employees
- Holiday alerts on holiday dates
- Auto-absent notifications when employees don't check in

### Auto-Absent Check
- Marks employees absent if no check-in by `autoAbsentTime`
- Per-org timezone-aware (uses org's IANA timezone)
- Respects working days and holidays
- Runs every minute via cron-auto-absent Edge Function

### Auto-Close Sessions
- Closes forgotten check-outs (no check_out recorded)
- Past-date sessions: auto-closed with "Auto-Closed Past Date" remark
- Same-day sessions: auto-closed at `autoSessionCloseTime` with "Max Time Reached" remark
- Per-org IANA timezone resolution
- Rush-hour skip guard (08:45–09:30 and 17:30–19:00 local)
- Runs every 5 min (at :03 offset) via cron-auto-close-sessions Edge Function
- Client-side fallback via workdaySessionManager (frozen module)
- FROZEN: auto_close_sessions cron block must exist, job id must be `auto_close_sessions`

### Check-in Sync Queue
- Local storage queue for offline/5xx check-in failures
- Exponential backoff: 250/750/2000/10000/60000 ms
- DEAD_LETTER for non-retryable failures (14-day TTL)
- 500-entry soft cap
- Selfie async upload with separate retry ladder

### Concurrency Hardening
- Opt-in `withRetry` helper in api.client.ts
- Request deduplication via in-flight promise map
- PocketBase autoCancellation disabled
- Retry on: network, 429, 502, 503, 504
- No retry on: 401, 403 (auth errors → sessionManager)

### Image Management
- All uploads auto-converted to WebP via `convertToWebP()`
- Selfies: quality 0.65, max dimension 720px
- Avatars, logos, blog covers: quality 0.8, max dimension 1200px
- apiClient.toFormData() handles data URL → WebP Blob conversion

### Scaling (Implemented Quick Wins)
- Attendance fetch scoped to last 30 days with org_id filter
- Leaves scoped to 180-day window
- Announcements capped at 200
- Check-in returns immediately; selfie uploads async with retry
- Auto-close cron staggered to 5-min intervals with rush-hour skip
- Dashboard attendance fetches today only
- Theme realtime narrowed to single default_theme record
- markAllAsRead chunks in batches of 10

### SEO
- Clean URLs for blog/features/tutorials
- Build-time sitemap with blog posts and tutorials
- RSS feed at /feed.xml
- JSON-LD structured data on all public pages
- Social crawler prerender via Vercel Edge Middleware
- Dynamic OG/Twitter meta tags per route
- PWA cache rules optimized for Supabase

### Push Notifications
- Web Push API with VAPID keys
- Service worker `push` event handler
- Push subscription table in Supabase
- Admin broadcast to all/platform/org/role/user
- Check-in reminder 15 min before shift
- Missed check-in alert 30 min after shift start
- Automatic stale subscription cleanup (410 Gone)

### Logging & Bug Reporting (DRAFT — not implemented)
- Plan exists in `LOGGING_AND_BUG_REPORTING_PLAN.md` (now deleted)
- Proposed structured logger with error classification
- Bug report capture with device info
- Target: PWA-only (no Capacitor)
- This plan has NOT been executed yet — it's a future enhancement

For the current state of all these features, consult `Others/CLAUDE.md` and the source code.
