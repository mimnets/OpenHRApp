// 2026-04-27: Capacitor / Android removal — PWA-only build pipeline
export type ChangelogEntryType = 'feature' | 'fix' | 'improvement' | 'security' | 'breaking';

export interface ChangelogEntry {
  type: ChangelogEntryType;
  description: string;
}

export interface ChangelogRelease {
  date: string;
  version?: string;
  title: string;
  entries: ChangelogEntry[];
}

export const changelog: ChangelogRelease[] = [
  {
    date: '2026-06-08',
    title: 'PocketBase fully removed — Supabase-only backend',
    entries: [
      { type: 'improvement', description: 'PocketBase SDK removed from the project. Removed the pocketbase npm package, esm.sh import map entry, and prebuild validation of PB hooks. All remaining PocketBase API calls (ad banners, middleware, sitemap/feed generators) migrated to Supabase. Created new public-ad-config Edge Function for unauthenticated ad banner support.' },
      { type: 'improvement', description: 'AdBanner now queries Supabase settings table directly (ad_config_<slot> key). PublicAdBanner uses new public-ad-config Edge Function. Middleware (social crawler prerender) now fetches blog/tutorial metadata from Supabase REST API. Sitemap and RSS feed generators now use Supabase REST API.' },
      { type: 'improvement', description: 'Cleaned up project: removed 145MB PocketBase database backup, duplicate/backup pb_hook files, old Claude_Prompt debug artifacts, PSD design files, .DS_Store files, and other unnecessary files. The pocketbase.ts service is now a stub for backward compatibility. database.ts updated to reflect Supabase-only backend.' },
    ],
  },
  {
    date: '2026-06-08',
    title: 'Fixed all cron jobs failing — pg_net extension upgrade',
    entries: [
      { type: 'feature', description: 'ADMIN and HR roles now see cross-organization attendance records and leave requests. apiClient caches the user role after login and getCurrentUser. Attendance fetching now paginates through results in 1000-row pages instead of a single limited query.' },
      { type: 'improvement', description: 'Added cross-org RLS migration (0014) for admin/hr to query and update attendance/leaves/profiles across organizations.' },
      { type: 'fix', description: 'All Supabase cron jobs calling Edge Functions (auto-close-sessions, auto-absent-check, daily-attendance-report, attendance-reminders, push-checkin-reminder, review-cycle-transition, auto-expire-trials) were failing every run with "function extensions.http_post does not exist". The pg_net extension was upgraded to 0.20.0 which moved HTTP functions from the extensions schema to the net schema. Updated all cron job definitions in scripts/setup-cron-schedules.sql and the live database to use net.http_post instead of extensions.http_post.' },
      { type: 'fix', description: 'Rescheduled all 7 failing cron jobs in the live database, restoring auto-close of forgotten check-outs, auto-absent marking, daily email reports, attendance push reminders, and review cycle transitions.' },
    ],
  },
  {
    date: '2026-06-07',
    title: 'Admin verify & activate employee accounts',
    entries: [
      { type: 'feature', description: 'Admins can now manually verify and activate an employee account from the Employee Directory. A new Verify button (shown only on unverified accounts) confirms the user\'s email in auth and flips their verified flag via the new admin-verify-employee Edge Function, letting them log in immediately without clicking the email link. The function enforces ADMIN/HR/SUPER_ADMIN caller role and same-organization scope.' },
      { type: 'fix', description: 'Fixed CORS preflight failure on the admin-verify-employee Edge Function by adding Access-Control-Allow-Methods header. Resolved merge conflicts that truncated EmployeeDirectory.tsx and left conflict markers in verification.service.ts, hrService.ts, employee.service.ts, types.ts, and create-employee.' },
      { type: 'fix', description: 'Fixed admin not seeing employee work email in view/edit profile modals. The profiles table had no email column — email was only in auth.users. Added email column to profiles, updated handle_new_user trigger to capture it, backfilled existing rows, and updated create-employee and register edge functions to store email in profiles.' },
      { type: 'fix', description: 'Fixed password change in Settings page silently doing nothing. The updateProfile service was discarding password fields with a console.warn instead of calling supabase.auth.updateUser. It now verifies the current password via re-authentication and then updates to the new password.' },
    ],
  },
  {
    date: '2026-06-06',
    title: 'Employee registration fix',
    entries: [
      { type: 'fix', description: 'Admins can register new employees again. Creating an auth user fires the on_auth_user_created trigger, which already inserts a minimal profile row; the create-employee Edge Function then tried a second plain insert with the same id and failed with "duplicate key value violates unique constraint profiles_pkey", rolling the whole creation back. The Edge Function now upserts the profile on id, filling in the full employee details on the row the trigger created.' },
    ],
  },
  {
    date: '2026-05-22',
    title: 'Push notification reliability improvements',
    entries: [
      { type: 'fix', description: 'Fixed service worker push handler to gracefully handle empty push events; added SKIP_WAITING message handler for manual updates.' },
      { type: 'fix', description: 'Updated Edge Function admin-send-push to use JWK VAPID key format and removed payload encryption, improving delivery reliability.' },
      { type: 'improvement', description: 'Cleanup: Removed legacy Ezoic and Ahrefs analytics scripts from index.html.' },
    ],
  },
  {
    date: '2026-05-17',
    title: 'Rush hour performance + iOS PWA fixes',
    entries: [
      { type: 'fix', description: 'PWA update banner no longer loops on "Updating… Installing update, page will reload shortly." After clicking Update, a sessionStorage flag suppresses the update banner for 30 seconds across the post-reload mount so a freshly activated service worker can\'t immediately re-report another update and retrigger the spinner. Breaks the reload loop without disabling future legitimate updates.' },
      { type: 'improvement', description: 'Push notification opt-in is now a soft-gate prompt instead of an immediate browser permission request. After login, users see a dismissible card explaining the benefit and can choose to Enable or Not Now — preventing reflex denials that permanently block reminders. iOS users without the PWA installed see an "Add to Home Screen" hint instead. Dismissals snooze for 7 days per user. Super Admins are excluded.' },
      { type: 'feature', description: 'Super Admin push broadcast: new "Push" tab in the Super Admin dashboard sends Web Push notifications to subscribed users. Four target types supported — all users platform-wide, a specific organization, a role across the platform (ADMIN/HR/MANAGER/EMPLOYEE), or a single user by UUID. Recipient count preview before send, confirmation modal for cross-tenant ALL broadcasts, automatic cleanup of stale 410-Gone subscriptions, and a 20-row history feed showing delivered/failed/cleaned counts per broadcast. New broadcasts audit table records every send.' },
      { type: 'feature', description: 'PWA push notifications: employees receive a check-in reminder 15 minutes before their shift starts, and a missed check-in alert 30 minutes after shift start if not yet checked in. Works with app closed and phone locked (iOS 16.4+ with PWA added to Home Screen).' },
      { type: 'fix', description: 'Confirmation email now sent on first registration attempt — admin.createUser does not auto-send; explicit resend call added to register Edge Function' },
      { type: 'improvement', description: 'Checkout page is faster during rush hour: resolveShiftForEmployee now runs in parallel with getActiveAttendance + getConfig instead of sequentially after them, cutting the attendance page load by ~200–400ms.' },
      { type: 'improvement', description: 'Employee dashboard no longer triggers a Storage signed-URL batch on every mount. The today\'s-attendance fetch used to resolve selfie URLs for every checked-in employee (50–100 requests during rush hour). Dashboard only needs a present-count, so selfie URLs are skipped there.' },
      { type: 'improvement', description: 'iOS PWA network timeout increased from 5s to 8s for Supabase REST calls. 5s was too tight on iOS LTE under load, causing the service worker to fall back to stale cached data.' },
    ],
  },
  {
    date: '2026-05-16',
    title: 'Service layer ported to Supabase',
    entries: [
      { type: 'improvement', description: 'iOS PWA / Safari login is noticeably snappier. Three changes: (1) ThemeContext no longer calls PocketBase or subscribes to PB realtime — it now reads default_theme from Supabase settings via organizationService and defers that fetch off the critical path via requestIdleCallback (cached accent theme paints first, fresh value arrives idle). (2) organizationService.prefetchMetadata is now two-tiered: company config + departments + designations are awaited before the dashboard mounts; holidays, teams, leave policy, and shifts fire in the background and never block first paint. (3) Login no longer waits for a double-requestAnimationFrame before triggering Safari\'s Save Password dialog — the hidden form is submitted in the same tick as onLoginSuccess, shaving 30–100ms off iOS post-login transitions.' },
      { type: 'feature', description: 'Login screen has a new "Updates" link next to "Reset Cache" that asks the service worker to check for a new app build without signing the user out. If a new version is waiting it activates immediately and the page reloads; otherwise the user gets a "You are on the latest version" toast. The existing Reset Cache button now performs a full nuclear reset (Workbox caches, service workers, IndexedDB, localStorage, sessionStorage all cleared, then a cache-busted hard reload) so a corrupted session post-migration cannot survive into the next login.' },
      { type: 'fix', description: 'PWA now picks up new app builds reliably after the Supabase migration. The Workbox runtime cache rules in vite.config.ts still targeted the old PocketBase /api/* paths, so every request to *.supabase.co bypassed the service worker entirely — fresh data arrived but the cached app shell stayed stale. Replaced the PB rules with Supabase-aware rules: Auth, Realtime, and Edge Functions are NetworkOnly; REST (PostgREST) is NetworkFirst with a 5s timeout (was 3s — too tight on iOS LTE) and a 5-minute fallback cache; public Storage objects (avatars, logos, blog covers) are CacheFirst for 30 days. Cache names bumped to a -v1 suffix so the obsolete pb-files / api-cache buckets get evicted on first deploy. Service worker also re-checks for updates on the window online event so PWAs returning from background on iOS pick up new builds without a manual refresh.' },
      { type: 'fix', description: 'Fixed "your account is suspended" false-flag on login after the Supabase migration. SubscriptionContext was still calling the dead PocketBase /api/openhr/subscription-status endpoint with an empty PB auth token, then falling back to a stale cached suspended status, which is why users had to log out and click Reset App Cache to recover. Subscription status now reads directly from the organizations table in Supabase via a new organizationService.getSubscriptionStatus method; Super Admins resolve client-side without a query. The default fallback when the backend is unreachable is also no longer read-only.' },
      { type: 'improvement', description: 'Documented email standards in Others/EMAIL_STANDARDS.md. Unified sender identity (noreply@openhrapp.com via Resend), defined three mail paths (user self-serve via Supabase native SMTP, super admin bulk via Edge Function, cron via Edge Function), DNS configuration (SPF/DKIM/DMARC), Supabase SMTP setup, template rules, and a testing checklist. Brevo retired due to spam-folder deliverability issues.' },
      { type: 'fix', description: 'Password reset email link now opens the set-new-password screen instead of dropping users on the landing page. Added a Supabase PASSWORD_RECOVERY auth listener and a hash-fragment fallback (type=recovery) so the reset UI fires whether Supabase preserves the redirect query string or appends recovery tokens to the URL hash.' },
      { type: 'improvement', description: 'sociallinks.service.ts, showcase.service.ts, and contact.service.ts migrated from PocketBase to Supabase. Showcase logo uploads now go to the showcase-logos Storage bucket. Contact form submissions are stored in a new contact_submissions table (readable only by super admin). PocketBase dependency removed from all three services.' },
    ],
  },
  {
    date: '2026-05-15',
    title: 'Profile work email fix',
    entries: [
      { type: 'fix', description: 'Work Email field on My Profile now shows the user\'s email from their auth account. Previously it was blank because the profiles table has no email column — fixed by falling back to the auth session email when loading profile data.' },
      { type: 'fix', description: 'Performance Review tab no longer shows a blank screen. Settings stored in the database as JSON strings were not being parsed on read, causing a crash when the review config was accessed. getSetting now parses string values before returning them.' },
      { type: 'feature', description: 'Super admin bulk email compose now has a Templates dropdown with 5 pre-built templates: Password Reset Notice, Newsletter, System Maintenance, General Announcement, and Welcome/Onboarding. Selecting a template pre-fills the subject and body; both are fully editable after selection.' },
      { type: 'fix', description: 'Super admin bulk email send now actually delivers emails. Previous implementation queued rows to reports_queue with empty recipient_email (emails live in auth.users, not profiles) and had no processor to send them — emails sat as PENDING forever. Replaced with a new send-bulk-email Edge Function that resolves real emails from auth.users via service role, sends immediately via Resend, and records SENT/FAILED status in reports_queue.' },
      { type: 'feature', description: 'All PocketBase cron jobs ported to Supabase. Six new Edge Functions handle scheduled work: cron-auto-close-sessions (every 5 min), cron-expire-trials (daily), cron-auto-absent (every minute), cron-daily-report (daily 11 PM), cron-attendance-reminders (every 5 min), cron-review-transitions (daily). Notification cleanup and selfie cleanup run as pure pg_cron SQL jobs. All functions use a CRON_SECRET env var for auth and match the original PocketBase cron behavior exactly.' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Forgot Password flow added',
    entries: [
      { type: 'feature', description: 'Added Forgot Password to the login page. Users can request a password reset email from an inline form. Supabase sends a magic link that lands back on the app and shows a set-new-password screen.' },
    ],
  },
  {
    date: '2026-05-14',
    title: 'Supabase Migration: OrgSystem migrated from PocketBase',
    entries: [
      { type: 'improvement', description: 'OrgSystem now reads and writes organization data (name, country, address, logo) via Supabase. Logo uploads go to the org-logos storage bucket. No more PocketBase dependency in this component.' },
      { type: 'fix', description: 'Fixed employee dashboard slow load and intermittent blank screen on page refresh. Root cause: resolveOrgId() was not deduplicated — 6 parallel dashboard service calls each fired their own auth.getUser + profiles fetch on cold cache (~12 extra network requests). Now a single shared promise resolves org context once for all callers. Also fixed employee.service.getEmployees() which used a sync org-id lookup that returned undefined on cold cache, causing an unfiltered full-table query.' },
      { type: 'fix', description: 'Fixed attendance history showing raw ISO timestamps (2026-05-14T03:30:00+00:00) instead of HH:mm. Supabase check_in/check_out columns are timestamptz; added isoToHHMM() to extract local time on read. Fixed broken selfie thumbnails in History: selfies bucket is private so public URLs return 403 — now batch-generates signed URLs (1 hr TTL) after fetching attendance records.' },
      { type: 'fix', description: 'Fixed blank dashboard on web + PWA after migration. Migrated leave_policy rows lacked the overrides key, so getLeaveBalance threw "Cannot read properties of undefined" and the whole Promise.all rejected. Hardened getLeavePolicy() to normalize defaults/overrides, and getLeaveBalance() to fall back to defaults when overrides absent.' },
      { type: 'fix', description: 'Fixed second dashboard crash ("O.filter is not a function") after migration. Settings rows (holidays, departments, designations, workflows, leave_types) were sometimes stored as objects instead of arrays in the migrated jsonb. Now coerce with Array.isArray() in organization.service so callers always get arrays.' },
      { type: 'fix', description: 'Fixed check-out reverting back to "Check Out" button in production after migration. attendance.service.updateAttendance was writing bare HH:mm strings (e.g. "18:30") to Supabase check_in/check_out columns which are timestamptz — Postgres silently rejected the update, the cache cleared, refetch returned the same null check_out, and UI re-rendered as still open. Added hhmmToISO() helper that combines the row date with HH:mm into a full ISO timestamp; applied to both updateAttendance and buildAttendancePayload (check-in path).' },
      { type: 'security', description: 'Migration 0007: fixed RLS policy attendance_update which only allowed ADMIN/HR/MANAGER roles to update attendance rows. Regular employees could not write check_out to their own row — second root cause of the production check-out bug. Policy now also permits employees to update their own row in their own org (employee_id = auth.uid()).' },
      { type: 'fix', description: 'workdaySessionManager (frozen module) post-migration fixes — followed plan-approval gate. (1) mapAttendance no longer wraps selfie path with public-URL builder; private selfies bucket returned 403 for active-session thumbnails. reconcileOpenSessions now batch-generates signed URLs (1 hr TTL) for active + closed-past selfies before returning. (2) Past-date auto-close now converts the resolved HH:mm close time to a full ISO timestamp before writing to check_out (timestamptz). Previously the auto-close write was silently rejected by Postgres, so forgotten check-outs never actually got closed by the client-side fallback.' },
      { type: 'fix', description: 'Fixed "invalid input syntax for type uuid" errors across all Supabase queries for users with stale PocketBase sessions. apiClient.getOrganizationId() fell back to pb.authStore.model.organization_id when its in-memory cache was empty, returning the old 15-char PB org ID. Supabase organization_id columns are uuid — every query with that filter 400-errored. Removed the PB fallback now that migration is complete; cold-cache reads use the async resolveOrgId() (auth.getUser + profiles lookup) which already populates the cache correctly.' },
      { type: 'security', description: 'Migration 0008: fixed migration 0007 attendance_update policy. employee_id is text (denormalized PB-style ID) and auth.uid() is uuid — the comparison silently failed under RLS so self-update was still blocked. Cast auth.uid()::text for the equality check.' },
      { type: 'fix', description: 'Fixed selfie upload silently failing with 403 "new row violates row-level security policy". Storage upload used upsert:true which forces Supabase to evaluate both the INSERT and UPDATE policies on the selfies bucket. selfies_update requires (storage.foldername)[1] = auth.uid()::text but we key folders by attendance recordId, not user uid — so regular employees got 403 on every check-in. Switched to upsert:false (recordId is unique per check-in, no collision possible) and treat 409 "already exists" from retry attempts as success (idempotent). Previously-queued failed selfies in localStorage will auto-retry and link to their attendance rows on next app load.' },
    ],
  },
  {
    date: '2026-05-13',
    title: 'Supabase Migration Phase 5.5: employee + attendance services ported',
    entries: [
      { type: 'improvement', description: 'employee.service.ts rewritten to use Supabase (profiles table + avatars storage bucket). Removed all PocketBase SDK calls.' },
      { type: 'feature', description: 'Added create-employee Edge Function (Deno) so ADMIN/HR can create new auth users with service-role key without exposing credentials to the frontend.' },
      { type: 'improvement', description: 'attendance.service.ts rewritten to use Supabase (attendance table + selfies storage bucket). Selfie async upload, sync queue drain, and late-notify all ported.' },
      { type: 'improvement', description: 'workdaySessionManager.ts (frozen module) ported to Supabase: 5 surgical PB replacements, zero logic changes. Open session filter changed from check_out="" to IS NULL. Selfie URL uses Supabase Storage. All frozen-module invariants preserved.' },
      { type: 'improvement', description: 'leave.service.ts rewritten to use Supabase. All CRUD, workflow routing, leave balance, and admin operations ported. PB date formatting removed — ISO dates used directly.' },
      { type: 'improvement', description: 'organization.service.ts rewritten to use Supabase. getSetting/setSetting use upsert on settings table. Teams CRUD, report queue, admin verify, guide links all ported. Added migration 0006 for unique constraint on (organization_id,key).' },
      { type: 'improvement', description: 'shift.service.ts rewritten to use Supabase. PB camelCase fields (startTime) mapped to Supabase snake_case (start_time). clearOtherDefaults uses batch update instead of parallel individual updates.' },
      { type: 'improvement', description: 'notification.service.ts rewritten to use Supabase. Bulk create uses single insert. markAllAsRead uses single update filter. deleteAllNotifications uses single delete. getUnreadCount uses count:exact head query.' },
      { type: 'improvement', description: 'announcement.service.ts rewritten to use Supabase. All CRUD and bulk notification fan-out ported.' },
      { type: 'improvement', description: 'review.service.ts rewritten to use Supabase. self_ratings/manager_ratings stored as jsonb objects (no JSON.stringify). Legacy column writes removed. Attendance/leave summary queries ported.' },
      { type: 'improvement', description: 'superadmin.service.ts rewritten to use Supabase. getAllOrganizations uses single profiles query + client-side aggregation (no N+1). createOrganization/deleteOrganization delegate to new Edge Functions (superadmin-create-org, superadmin-delete-org). deleteOrganization cascade deletes auth users via service-role. Bulk email, platform stats, guide links, content image upload all ported.' },
      { type: 'improvement', description: 'blog.service.ts rewritten to use Supabase. Public methods query blog_posts table directly (no PB custom endpoint). Cover images in content-images storage bucket.' },
      { type: 'improvement', description: 'tutorial.service.ts rewritten to use Supabase. Public methods query tutorials table directly. Cover images in content-images storage bucket.' },
      { type: 'improvement', description: 'upgrade.service.ts rewritten to use Supabase. Donation screenshots in donation-screenshots bucket. acceptAdSupported does direct org update. processRequest updates request + org subscription inline.' },
      { type: 'improvement', description: 'verification.service.ts rewritten to use Supabase. verifyEmailToken uses supabase.auth.verifyOtp. resendVerificationEmail uses supabase.auth.resend. manuallyVerifyUser and getUnverifiedUsers use profiles table directly. All PocketBase SDK calls removed.' },
      { type: 'feature', description: 'Phase 7: Data migration scripts added (scripts/migrate-from-pb/). 01-export.mjs exports all PocketBase collections to JSON. 02-import.mjs transforms + imports into Supabase (ID mapping, auth user creation, FK remapping). 03-verify.mjs checks row counts and FK integrity. 04-files.mjs migrates file attachments to Supabase Storage buckets. npm scripts: migrate:export, migrate:import, migrate:verify, migrate:files.' },
      { type: 'improvement', description: 'sessionManager.ts (frozen module, Phase 6) ported to Supabase. initialize uses supabase.auth.getSession. attemptRefresh uses supabase.auth.refreshSession + profiles fetch. performForceLogout uses supabase.auth.signOut. isHardAuthFailure adds Supabase AuthSessionMissingError/AuthInvalidRefreshTokenError detection. All invariants (transient-vs-hard, single logout exit, retry backoff) preserved.' },
    ]
  },
  {
    date: '2026-05-11',
    title: 'Fix: Bulk email recipient count incorrect',
    entries: [
      { type: 'fix', description: 'Bulk email recipient preview was showing only 1 admin instead of all org admins. PocketBase fields projection hid the email field due to collection-level field rules. Removed fields restriction from all audience queries so email is always returned.' },
      { type: 'fix', description: 'Bulk email recipient queries could be silently cancelled by PocketBase SDK auto-cancellation when preview was triggered rapidly. Added $autoCancel: false to all resolveBulkRecipients queries. Real errors now surface with the actual error message instead of silently showing 0 recipients.' },
      { type: 'fix', description: 'PWA update banner: clicking Update caused stuck loading screen. Double reload — updateServiceWorker(true) and controllerchange listener both called location.reload(). Added reloadingRef guard so controllerchange skips reload when applyUpdate already triggered it.' },
    ]
  },
  {
    date: '2026-05-11',
    title: 'Fix: Selfie cleanup now deletes from Cloudflare R2',
    entries: [
      { type: 'fix', description: 'Selfie retention cron was clearing DB fields but never deleting actual image files from Cloudflare R2 storage. Added explicit $app.deleteFile() calls before field-clearing so objects are removed from R2 on schedule.' },
    ]
  },
  {
    date: '2026-05-11',
    title: 'Fix: PWA update reliability + manifest improvements',
    entries: [
      { type: 'fix', description: 'PWA update button sometimes did nothing or required a second manual refresh. Added controllerchange listener as a reload safety net — fires when the new SW takes control, ensuring the page always reloads with fresh assets after an update.' },
      { type: 'fix', description: 'Update banner now shows a loading/spinning state while the new SW is activating, so the UI does not appear frozen during the brief activation gap.' },
      { type: 'improvement', description: 'Added webp and png to Workbox globPatterns — app icons and screenshots now precached so the install prompt works fully offline.' },
      { type: 'improvement', description: 'Switched injectRegister to inline so SW registration does not depend solely on the React hook mounting — prevents edge cases where SW never registers.' },
      { type: 'improvement', description: 'apple-touch-icon now points to icon-192.png (correct 192×192 PNG) instead of logo.png — fixes blurry iOS home screen icon.' },
      { type: 'improvement', description: 'Manifest id set to "openhrapp" — stable unique identifier for Chrome install tracking instead of generic "/".' },
      { type: 'fix', description: 'Registration endpoint was reading FormData fields from requestInfo.body (always empty for multipart) instead of requestInfo.data. country defaulted to BD for every org. Now merges both sources so the correct country code is used for holiday and config seeding.' },
    ]
  },
  {
    date: '2026-05-05',
    title: 'Fix: auto-absent check now per-org with correct timezone',
    entries: [
      { type: 'fix', description: 'auto_absent_check cron was loading a single app_config with no organization_id filter, applying one random org\'s autoAbsentTime, workingDays, and holidays to all employees across every org. Rewritten to loop over each org independently, loading its own config with a scoped filter.' },
      { type: 'fix', description: 'auto_absent_check used server-local clock for time matching, date string, and day-of-week. All three now use org-local time via getOrgLocalTime() (same helper used by auto_close_sessions), ensuring absent marks fire at the correct local time on the correct local date for every org regardless of server timezone.' },
      { type: 'fix', description: 'Absent records were missing the organization_id field, breaking multi-tenant attendance queries. Field now set on every auto-absent record.' },
      { type: 'fix', description: 'daily_attendance_report cron used server-local clock to build the dateStr for attendance queries. For UTC+6 orgs the report at 23:00 UTC (05:00 Dhaka next day) would query the wrong date. Now uses getOrgLocalTime() per org so the report always reflects the correct local business day.' },
    ]
  },
  {
    date: '2026-05-05',
    title: 'Fix: org registration country-aware timezone, currency, and default config',
    entries: [
      { type: 'fix', description: 'Timezone dropdown in System Settings was hardcoded to 3 options (Asia/Dhaka, UTC, Asia/Kolkata). When a non-Bangladesh org was registered, the backend correctly stored the right timezone (e.g. Asia/Bahrain) but the select had no matching option so the browser displayed the first option (Asia/Dhaka). Replaced with a full grouped IANA timezone list covering all 73 countries supported by the platform.' },
      { type: 'fix', description: 'DEFAULT_CONFIG fallback in constants.tsx hardcoded timezone: "Asia/Dhaka" and currency: "BDT". On any config load failure or race condition after registration, all orgs would fall back to Bangladesh values. Changed fallback to timezone: "UTC" and currency: "USD".' },
      { type: 'fix', description: 'Registration form defaulted country to "BD" (Bangladesh). If an admin did not change the dropdown, the backend would seed Bangladesh timezone, currency, and holidays for a non-Bangladesh org. Default changed to empty string with a required "Select country..." placeholder, forcing an explicit selection.' },
    ]
  },
  {
    date: '2026-05-05',
    title: 'Fix: auto-close session now uses org timezone for correct global behaviour',
    entries: [
      { type: 'fix', description: 'Auto-close session cron (cron.pb.js) was comparing the configured close time against the server\'s UTC clock instead of each organisation\'s local time. For example, a Bangladesh org (UTC+6) that set 10:00 PM as the close time would not have sessions closed until ~6 AM the next morning. Fixed by converting the server clock to each org\'s IANA timezone (stored in app_config) before comparing. Both the today-vs-past-date decision and the HH:MM comparison now use org-local time. The shift-level > org-level > fallback priority chain is unchanged. A per-org timezone cache prevents repeated DB lookups within a single cron run.' },
      { type: 'fix', description: 'Rush-hour skip guard in auto_close_sessions was referencing an undefined todayStr variable (leftover from before the timezone fix). Guard now correctly uses orgTodayStr derived from the org\'s IANA timezone, computed before the guard check.' }
    ]
  },
  {
    date: '2026-05-05',
    title: 'Registration: countrywise holiday data for 24 missing countries',
    entries: [
      { type: 'fix', description: 'Added public holiday data for 24 countries that previously received an empty holiday list on registration: Afghanistan, Albania, Brunei, Chile, Colombia, Czech Republic, Algeria, Ethiopia, Ghana, Greece, Croatia, Hungary, Iraq, Jordan, Cambodia, Lebanon, Morocco, Myanmar, Maldives, Poland, Portugal, Romania, Russia, Zimbabwe' }
    ]
  },
  {
    date: '2026-04-30',
    title: 'SEO — Phase 3: social bot prerender middleware',
    entries: [
      { type: 'improvement', description: 'Added Vercel Edge Middleware (`middleware.ts`) to fix broken link previews on Facebook, Slack, LinkedIn, WhatsApp, Telegram, and Discord. Social crawlers don\'t execute JavaScript, so they previously received homepage meta for every URL. The middleware detects known social bot user-agents and for matched routes (`/blog/:slug`, `/how-to-use/:slug`, `/features/:slug`) fetches real page metadata from PocketBase and returns a minimal HTML shell with correct `<title>`, `<meta description>`, Open Graph, and Twitter Card tags. Real users and Googlebot are passed through unchanged. Feature pages use inlined static meta (no API call needed). Responses are cached for 5 minutes with stale-while-revalidate for 1 hour' },
    ],
  },
  {
    date: '2026-04-30',
    title: 'SEO — fix FeaturesPage rich results',
    entries: [
      { type: 'fix', description: '`FeaturesPage` was emitting a plain `WebPage` schema which Google Rich Results Test does not recognise as a rich-result type. Upgraded to a `@graph` with `CollectionPage` + `ItemList` (one entry per feature detail page) + `BreadcrumbList` — matching the pattern used by BlogPage' },
    ],
  },
  {
    date: '2026-04-30',
    title: 'SEO — Phase 2 schema enrichment',
    entries: [
      { type: 'improvement', description: 'Added `aggregateRating` (4.8/5, 5 reviews) to `SoftwareApplication` JSON-LD on the landing page — unlocks star rating display in SERPs for queries like "free HR software"' },
      { type: 'improvement', description: '`BlogPage`: after posts load, JSON-LD is upgraded from plain `CollectionPage` to a `@graph` including an `ItemList` of all fetched posts — makes the blog eligible for Google article carousel rich results' },
      { type: 'improvement', description: '`TutorialPage`: for guides whose content contains an `<ol>` ordered list, a `HowTo` schema (up to 10 steps) is added to the JSON-LD graph alongside the existing `Article` schema — enables Google How-to rich results for step-based guides' },
      { type: 'improvement', description: '`FeatureDetailPage`: upgraded JSON-LD from generic `WebPage` to `SoftwareApplication` with `featureList` (derived from section bullets), `offers`, and `isPartOf` linking back to the parent OpenHRApp — gives each feature page a richer entity signal for product-intent queries. Also fixed fallback image `.png` → `.webp` in `TutorialPage` Article schema' },
    ],
  },
  {
    date: '2026-04-30',
    title: 'SEO — Phase 1 quick wins',
    entries: [
      { type: 'improvement', description: 'Added `twitter:site` meta tag to `index.html` so Twitter/X card previews are attributed to the @openhrapp account' },
      { type: 'improvement', description: 'Added `WebSite` + `SearchAction` JSON-LD schema to `index.html` (alongside existing `Organization` schema) to enable Google sitelinks searchbox in SERPs' },
      { type: 'fix', description: 'Fixed OG image inconsistency: `LandingPage.tsx` `SoftwareApplication` JSON-LD was referencing `screenshot-wide.png`; updated to `.webp` to match all other meta tags' },
      { type: 'improvement', description: 'Removed `<meta name="keywords">` from `index.html` — ignored by Google and Bing since 2009' },
    ],
  },
  {
    date: '2026-04-28',
    title: 'PWA — Recover from stale chunk hashes after deploys',
    entries: [
      { type: 'fix', description: 'Super Admin "Delete Organization" still failed after the previous client-side fix because some org-scoped collections (notably `reports_queue`) deny `list` to SUPER_ADMIN at the API-rule layer — so the SDK couldn\'t see those records to delete them, and the final org delete tripped the same `Make sure that the record is not part of a required relation reference` 400. Moved the cascade server-side to a new `POST /api/openhr/delete-organization` endpoint in `Others/pb_hooks/main.pb.js`. The hook runs as superuser context (bypasses API rules), auto-discovers every collection that carries an `organization_id` field via `$app.findAllCollections()`, sweeps them in dependency order in 500-record batches, then deletes the org itself. The frontend `superAdminService.deleteOrganization()` now calls this endpoint first and only falls through to the legacy client-side cascade on 404 (so older PocketBase instances that haven\'t reloaded `main.pb.js` keep working). Requires deploying the updated `main.pb.js` to PocketBase' },
      { type: 'fix', description: 'Super Admin "Delete Organization" was failing with a 400 `Make sure that the record is not part of a required relation reference` after partially wiping users/teams/leaves/attendance/settings, leaving orphan org rows behind. `superAdminService.deleteOrganization()` now (a) sweeps a static dependency-ordered list of org-scoped collections (`attendance`, `leaves`, `performance_reviews`, `review_cycles`, `notifications`, `announcements`, `reports_queue`, `upgrade_requests`, `shifts`, `teams`, `settings`, `users`), (b) auto-discovers *any other* collection carrying an `organization_id` field via `pb.collections.getFullList()` and sweeps those first so future org-scoped tables don\'t silently re-introduce the bug, and (c) tolerates 404s on per-record deletes (already cascaded) so one stuck row no longer aborts the cleanup. The final org delete also logs PocketBase\'s `response.data` on failure so the blocking collection is diagnosable next time' },
      { type: 'fix', description: 'After a Vercel deploy, browsers with the old service worker cached would request stale hashed chunks (e.g. `/assets/Leave-CQ8GXgvs.js`). Vercel\'s SPA catch-all rewrite returned `index.html` for those missing files, so the browser tried to execute HTML as a JS module and the lazy-loaded route (Super Admin, Leave, etc.) crashed with a `Failed to fetch dynamically imported module` error. Two-layer fix: (1) `vercel.json` now excludes `/assets/*`, `sw.js`, `registerSW.js`, and `workbox-*.js` from the SPA fallback so a missing chunk returns a real 404 instead of HTML; (2) new `src/utils/lazyWithReload.ts` wraps `React.lazy()` so that on a chunk-load failure it unregisters the service worker, clears the Cache Storage, and reloads the page once. A 30s `sessionStorage` cooldown prevents reload loops if the failure is not actually a stale-chunk issue. `src/App.tsx` now uses `lazyWithReload(...)` for all 13 lazy-imported pages. Existing affected users auto-recover on their next page load' },
    ],
  },
  {
    date: '2026-04-27',
    title: 'feed.xml — Combined Blog + Guides + Features',
    entries: [
      { type: 'fix', description: '`/feed.xml` was rendering the React `NotFoundPage` for browsers with the PWA service worker installed. Same root cause as the prior `sitemap.xml` fix (commit `cf15ffd`): the Workbox NavigationRoute intercepted the request and returned the cached `index.html` shell, which then resolved to the SPA 404. Added `/^\\/feed\\.xml$/` to `navigateFallbackDenylist` in `vite.config.ts` and added `feed.xml` to the negative-lookahead in `vercel.json` so the static file is served at both layers' },
      { type: 'improvement', description: 'Extended `scripts/generate-feed.mjs` to fold tutorials/guides (`/api/openhr/tutorials/posts` → `/how-to-use/<slug>`) and the seven product features (`/features/<slug>`) into the existing single RSS feed, alongside blog posts. Each `<item>` now carries a `<category>` (`Blog`, `Guide — <category>`, or `Feature`) so feed readers and AI/LLM crawlers can distinguish content types. Dated content (blog + tutorials) is sorted newest-first; evergreen feature items are appended after with the `features.ts` file mtime as a stable `pubDate` so they don\'t displace fresh content. Result: feed went from 2 items to 34 (2 blog + 25 guide + 7 feature). Channel `<title>` updated from `OpenHR Blog` to `OpenHR` and description widened to "Articles, guides, and product updates" to match' },
    ],
  },
  {
    date: '2026-04-27',
    title: 'Capacitor / Android Removed — PWA-Only',
    entries: [
      { type: 'breaking', description: 'Removed the entire Capacitor v8 Android pipeline. The `android/` directory, `capacitor.config.ts`, `CAPACITOR_BUILD.md`, the `public/.well-known/assetlinks.json` Digital Asset Links file, and `scripts/generate-icons.cjs` (Android mipmap generator) have all been deleted. The five `@capacitor/*` packages (`camera`, `core`, `geolocation`, `android`, `cli`) and their `cap:sync` / `cap:open` npm scripts are gone — `npm install` now resolves 72 fewer transitive packages. OpenHR is distributed exclusively as an installable PWA on iOS Safari, Android Chrome, and desktop browsers' },
      { type: 'improvement', description: '`src/hooks/attendance/useCamera.ts` rewritten to drop the `Camera.getPhoto()` Capacitor fallback. The fallback path (used when `getUserMedia` is blocked, e.g. iOS PWA standalone before user activation) now opens the device camera via a programmatic `<input type="file" accept="image/*" capture="user">` and feeds the resulting `File` through the existing `convertToWebP()` pipeline, returning the same data-URL contract callers already expect. The `<input>` is reused for `selectFromGallery()` without the `capture` attribute. Public hook surface is unchanged' },
      { type: 'improvement', description: '`src/hooks/attendance/useGeoLocation.ts` rewritten to use only `navigator.geolocation` — the three `Capacitor.isNativePlatform()` branches and `Geolocation.requestPermissions()` / `getCurrentPosition()` / `watchPosition()` / `clearWatch()` calls are gone. High-accuracy → network-fallback retry logic, OpenStreetMap Nominatim reverse geocoding, and geofence matching against `OFFICE_LOCATIONS` are all preserved. `watchIdRef` switched from a Capacitor string id to the browser numeric watch id' },
      { type: 'improvement', description: '`src/pages/Login.tsx` no longer references the Android autofill JavaScript bridge. Removed the `window.AndroidAutofill` global type declaration, the `requestAutofill()` call on mount that prompted Google Password Manager, and the `commitAutofill()` call after successful login. The two surviving "Save Password" strategies — the Credential Management API for Chrome/Edge/Android browser, and the iOS Safari hidden-form-submission trick (with double-rAF before submit and the `safari-password-save` iframe absorber) — are unchanged' },
      { type: 'improvement', description: '`Others/CLAUDE.md` updated: deleted the "Capacitor (Android) Rules" section (stack, version-matching rules, custom-hook list, Android build config), removed the four `cap` build commands from the top-level Build & Development block, dropped the four Capacitor / Android entries from the Pre-Commit Checklist, replaced the `adb logcat` debugging snippet with HTTPS-tunnel guidance for testing camera/geolocation on a phone, and dropped `capacitor.config.ts` from the Configuration Files reference' },
      { type: 'improvement', description: '`README.md` updated: tech-stack table no longer lists "Capacitor v8 (Android APK)", the marketing bullet about "+ native Android APK via Capacitor" was rewritten to "Installable PWA on iOS, Android, and desktop with offline-aware caching", and the entire "Android Build (Optional)" Quick Start section (`npm run build && npx cap sync android && npx cap run android`) was removed. The architecture diagram now reads `React 19 (Installable PWA)` instead of `React 19 (PWA + Capacitor)`' },
      { type: 'improvement', description: '`Others/LOGGING_AND_BUG_REPORTING_PLAN.md` (still a draft proposal) updated so the future logger plan no longer assumes Capacitor: target stack, error class enumeration, architecture diagram, the platform enum (web/android → web/pwa-standalone), the app_version field description, the global-error-handler list (replaced the Capacitor App.addListener appStateChange hook with visibilitychange plus display-mode standalone tracking), the bug-report device-info capture, and the rollout phase-3 dependency on @capacitor/device (now done with standard browser APIs)' },
      { type: 'improvement', description: 'Removed the `public/downloads/*.apk` line from `.gitignore` and deleted the now-unused `public/downloads/` directory. The `/download` page route was already removed in 2026-04-15; this finishes the cleanup so the deploy artifact has no orphaned APK references. The `Others/openhr-development-playbook.md` historical playbook entries that mention Capacitor as a past photo source are intentionally left untouched (they document a snapshot of the WebP conversion task and would lose meaning if rewritten)' },
    ],
  },
  {
    date: '2026-04-27',
    title: 'Bulk Email Broadcaster — Fixes',
    entries: [
      { type: 'fix', description: 'Bulk Email "All organization admins" (and the per-org / per-subscription "Admins only" scopes) now match users with `role = "ADMIN"` OR `role = "HR"`. Previously the filter only matched `ADMIN`, so orgs that use HR as their admin role returned zero recipients on preview and could not be broadcast to' },
      { type: 'fix', description: 'Dropped the `verified = true` requirement from super-admin bulk-email recipient resolution. The first admin of every org is created with `verified = false` (per `Others/pb_hooks/main.pb.js:135,140`) and only flips to `true` when they click the email-verification link or an existing admin manually approves them — verification is a login gate, not a deliverability gate. The bulk broadcaster now targets every registered admin/HR row in PocketBase that matches the audience, regardless of verification status (still excluding `SUPER_ADMIN`). Updated UI copy in `BulkEmailManager.tsx` accordingly so the audience labels and helper text no longer claim "verified" filtering' },
      { type: 'fix', description: 'The "Yes, send now" confirmation modal now always closes after the send attempt (success OR error), and the page scrolls to the top so the success/error banner is visible. Previously, on certain failures the modal stayed open and the user got no confirmation that the email had been queued or had failed' },
      { type: 'improvement', description: 'Email-verification UX hardening. (1) The Super Admin Organizations table now shows a "Verified" / "Pending verification" badge under each org\'s admin email so stuck signups are visible without drilling into the user list (`SuperAdmin.tsx` Admin column, `getAllOrganizations` widened to look up the first ADMIN-or-HR record and return its `verified` flag as `Organization.adminVerified`). (2) `RegistrationVerificationPage` was rewritten — replaced the legacy inline-style CSS with Tailwind that matches the rest of the app, added a prominent amber "check your spam or junk folder" warning right under the email address (the previous hint was buried in tiny grey footer text), added a working 8-second poll against a new `GET /api/openhr/check-verification?email=…` endpoint so the page actually detects verification and auto-advances (the prior `setInterval` only incremented a timer and never queried PocketBase), and added a "Back to home" button so users aren\'t stuck on the page. Polling stops after 10 minutes with a clear message. (3) The Login screen unverified-account error now shows the same spam-folder hint inline with the existing "Resend Link" button so users on the second-attempt path get the same guidance' },
    ],
  },
  {
    date: '2026-04-26',
    title: 'Super Admin Bulk Email',
    entries: [
      { type: 'feature', description: 'Added a Bulk Email tab to the Super Admin dashboard so the platform owner can broadcast warnings, alerts, and announcements without leaving the app. Audiences supported: all org admins, all verified users, all users (or admins only) of a specific organization, or all users in orgs filtered by subscription status (TRIAL / ACTIVE / EXPIRED / SUSPENDED / AD_SUPPORTED). Compose uses the existing rich-text editor (bold, links, lists, images), and a two-step preview → confirm flow shows the exact recipient count before anything goes out' },
      { type: 'feature', description: 'Added `superAdminService.resolveBulkRecipients`, `previewBulkRecipients`, `sendBulkEmail`, `getRecentBulkCampaigns`, and `getBulkCampaignDetail` methods. Sends are queued into the existing `reports_queue` collection in 50-row batches and tagged with `type = BULK_CAMPAIGN_<uuid>` so the History view can group per-recipient rows back into campaign-level rollups (sent / failed / pending) without needing a new collection. Recipients are de-duplicated by email and capped at 5,000 per send. The PocketBase mailer hook in `main.pb.js` does the actual sending — no changes to pb_hooks were required' },
      { type: 'security', description: 'Always restricts targeting to `verified = true` users and excludes `SUPER_ADMIN`; bodies are passed through `sanitizeHtml` (DOMPurify) before being stored in `reports_queue`, defending against malformed paste from the rich editor' },
    ],
  },
  {
    date: '2026-04-26',
    title: 'SEO & Accessibility Quick Wins',
    entries: [
      { type: 'feature', description: 'Generated a build-time RSS feed at `/feed.xml` (`scripts/generate-feed.mjs`) covering all published blog posts, wired into `npm run build` and discoverable via `<link rel="alternate" type="application/rss+xml">` in `index.html`. Improves discoverability for feed readers and AI/LLM crawlers that don\'t render JS' },
      { type: 'improvement', description: 'Added a "Skip to content" link on `LandingPage` and `MainLayout` for keyboard users, wrapped landing-page sections in a `<main id="main-content">` landmark, and dropped `maximum-scale=1.0, user-scalable=no` from the viewport meta so users who need pinch-zoom are no longer blocked' },
    ],
  },
  {
    date: '2026-04-26',
    title: 'PWA Service-Worker Caching — Phase A',
    entries: [
      { type: 'improvement', description: 'Tightened service-worker runtime caching in `vite.config.ts` to make rush-hour stalls feel ~10× shorter. Cut the API NetworkFirst fallback timeout from 30 s to 3 s — when PocketBase is contended, the app now serves last-known-good cached GETs within 3 seconds instead of spinning for half a minute' },
      { type: 'improvement', description: 'Added explicit `NetworkOnly` rules for `/api/realtime` and `/api/collections/users/auth-*` so realtime SSE and login flows are never cached by accident' },
      { type: 'improvement', description: 'Added `CacheFirst` for `/api/files/*` (selfies, avatars, blog covers, showcase logos) with a 30-day, 500-entry cache. Attendance audit pages and employee directories with many thumbnails now reload instantly from the device after the first visit' },
      { type: 'improvement', description: 'Added `StaleWhileRevalidate` for the public marketing endpoints `/api/openhr/blog/*` and `/api/openhr/tutorials/*` (already public content, no tenant leak). Renders blog/tutorial pages instantly while refreshing in the background' },
      { type: 'improvement', description: 'Guarded all read caching behind `request.method === "GET"` so writes (POST / PATCH / DELETE) bypass the SW entirely and always hit the network. No multi-tenant collection responses are cached in this phase — tenant-scoped caching for stable config (holidays, shifts, leave types) is deferred to Phase B after a week of monitoring' },
    ],
  },
  {
    date: '2026-04-21',
    title: 'Check-In Sync Queue',
    entries: [
      { type: 'feature', description: 'Added a local sync queue for check-in data (`src/services/attendance/syncQueue.ts`) that survives offline / 5xx rush-hour failures. Check-ins that fail to reach PocketBase are enqueued with a client-generated id, business timestamp, and per-entry retry budget; the attendance screen drains the queue alongside the existing pending-selfies retry on every refresh, replaying up to 10 entries per tick with exponential backoff (250/750/2000/10000/60000 ms). Retryable failures (network, 429, 502/503/504) reschedule; non-retryable failures land in DEAD_LETTER for manual review instead of being silently dropped' },
      { type: 'feature', description: 'Introduced the `CheckInSyncEntry` / `CheckInSyncQueue` TypeScript interfaces and a localStorage-backed factory with schema-versioned envelope, 14-day dead-letter TTL, and 500-entry soft cap. Public surface is narrow (enqueue / pickNext / markSuccess / markFailure / list / size / remove / requeueDeadLetter / clear) so the storage backend can be swapped to IndexedDB later without touching callers' },
      { type: 'improvement', description: 'Factored the PocketBase attendance payload into a shared `buildAttendancePayload` helper used by both the inline save path and the queue-drain path — they can no longer drift on field renames or type coercion' },
      { type: 'improvement', description: 'Recorded the full design, lifecycle diagram, risk table, and rollback steps in `Others/CHECKIN_SYNC_QUEUE_RECORD.md`. No frozen modules touched; existing selfie retry ladder (RC#4) is unchanged and composes with the new queue' },
    ],
  },
  {
    date: '2026-04-21',
    title: 'PocketBase Concurrency Hardening',
    entries: [
      { type: 'improvement', description: 'Added an opt-in `withRetry` helper in `api.client.ts` that retries transient failures (network drops, 429, 502/503/504) with exponential backoff (250/750/2000 ms). Deliberately skips auth errors (401/403) so it never interacts with sessionManager\'s auth-refresh ladder. No existing call sites are modified — callers opt in explicitly' },
      { type: 'fix', description: 'Scoped the request-dedupe keys in `employeeService.getEmployees` and `leaveService.getLeaves` to include `organizationId` (`employees:<orgId>`, `leaves:<orgId>`). Bare string keys could theoretically alias across orgs under superadmin impersonation; the attendance service already did this correctly' },
      { type: 'improvement', description: 'Recorded the full change, risks, symptoms-of-regression, and rollback steps in `Others/CONCURRENCY_FIX_RECORD.md`. No frozen modules touched' },
    ],
  },
  {
    date: '2026-04-21',
    title: 'Mobile Responsive Polish',
    entries: [
      { type: 'fix', description: 'Fixed the Grace (Min) input overflowing outside the Calculation Parameters box in the Attendance Audit "Modify Audit Record" modal on narrow screens — shortened the label to "Grace", gave the column a fixed width, and added `min-w-0` to the sibling time-input columns so native time pickers no longer push the row wider than its container' },
      { type: 'fix', description: 'Fixed Organization Directory header action buttons (Depts / CSV / PDF / Provision New User) overflowing the viewport on mobile — the button row now wraps, and the last button shortens to "New User" below the sm breakpoint' },
      { type: 'fix', description: 'Fixed Organization & Setup tab rows (STRUCTURE/TEAMS/PLACEMENT/SHIFTS and WORKFLOW/LEAVES/HOLIDAYS/NOTIFICATIONS/SYSTEM) cutting off the last tab on mobile — rows are now horizontally scrollable with a minimum tab width' },
      { type: 'fix', description: 'Fixed the Super Admin Dashboard "New Organization" button rendering partially off-screen on mobile — the header now stacks vertically below the sm breakpoint so the button sits under the title instead of pushing past the viewport edge' },
      { type: 'fix', description: 'Fixed the header profile avatar appearing stretched into an oval on narrow viewports — added `flex-shrink-0` and explicit width/height attributes so the avatar stays a 40×40 circle when the right-hand toolbar is competing for space' },
      { type: 'fix', description: 'Added `min-w-0` + `grid-cols-1 sm:grid-cols-2` to the date/time input pairs in Reports, Employee Leave Flow, Employee Leave Module, and OrgNotifications quiet-hours — native date/time pickers have a large intrinsic min-width that was pushing these paired inputs off the edge on 360-400px viewports' },
      { type: 'fix', description: 'Aligned the System & Profile page\'s Appearance card with the Profile card below it on desktop — the Appearance card was spanning the full content width while the Profile card was constrained to `max-w-3xl`, so the right edges did not line up' },
      { type: 'fix', description: 'Fixed landing page Features section rendering with washed-out, low-contrast cards in dark mode — cards used `bg-slate-50/50` (half-transparent) which the global dark-mode CSS overrides did not match, so the cards floated translucently over the dark body until hover. Switched to opaque `bg-slate-50 dark:bg-slate-800/60` with explicit dark borders and hover states, and added `dark:bg-slate-900` to the section wrapper' },
      { type: 'fix', description: 'Applied the same dark-mode fix to the "Built for Modern Teams" platform-features cards on the /features page — they had the identical `bg-slate-50/50` translucent bug and were unreadable in dark mode until hover' },
    ],
  },
  {
    date: '2026-04-21',
    title: 'SEO — Social Previews & Structured Data',
    entries: [
      { type: 'improvement', description: 'SEO — `updatePageMeta` now also rewrites `og:title`/`og:description`/`og:url`/`og:image` and `twitter:title`/`twitter:description`/`twitter:image` on every route change, so LinkedIn/Slack/Twitter/Facebook previews of `/blog/*`, `/features/*`, `/how-to-use/*` no longer show the homepage thumbnail; per-page blog-cover and tutorial-cover images are now used where available' },
      { type: 'improvement', description: 'SEO — added `CollectionPage`/`WebPage` + `BreadcrumbList` JSON-LD to the Guides (`/how-to-use`), Privacy, and Terms pages; they were the only public pages missing structured data' },
      { type: 'improvement', description: 'SEO — NotFoundPage now injects `<meta name="robots" content="noindex">` on mount (removed on unmount) so soft-404s do not get indexed while the SPA still returns HTTP 200 for unknown routes' },
      { type: 'improvement', description: 'SEO — sitemap generator now stamps today\'s date as `<lastmod>` on all static entries (was missing for `/`, `/features`, `/blog`, `/changelog`, `/how-to-use`, `/privacy`, `/terms`), giving crawlers a real freshness signal' },
      { type: 'improvement', description: 'SEO — removed `/download` from `scripts/generate-sitemap.mjs` and `public/robots.txt`; the Android APK is no longer shipped, and the URL was a soft-404 in the sitemap' },
      { type: 'improvement', description: 'Added `Others/SEO_AUDIT_REPORT.md` — full SEO audit of the public marketing surface with prioritized fixes; this release implements every in-scope finding (HIGH: dynamic OG/Twitter tags; MEDIUM: sitemap lastmod, 3x missing JSON-LD, soft-404 noindex, `/download` cleanup). Prerendering/SSR and Core Web Vitals work are tracked separately' },
    ],
  },
  {
    date: '2026-04-20',
    title: 'Rush-Hour Performance — Second Pass',
    entries: [
      { type: 'fix', description: 'Fixed Attendance Audit showing "(N/A) / STAFF" for older employee records — the 2026-04-19 perf commit switched getEmployees / getLeaves / getAttendance / getTeams to `getList(1, N>500, ...)` which is silently capped to 500 rows by PocketBase\'s default per-request limit. Restored `getFullList` with the org filter preserved (keeps the SQLite-index benefit, and the SDK paginates in 500-row batches so every matching row is returned)' },
      { type: 'improvement', description: 'Narrowed the platform-theme realtime subscription from the whole `settings` collection to the single `default_theme` record — every authenticated client previously received a websocket frame for every unrelated settings write (notification prefs, leave policy, ad config, etc.) and discarded it client-side' },
      { type: 'improvement', description: 'Dashboard attendance query now fetches today only instead of the last 30 days — the dashboard only uses today\'s rows to count "present today", so pulling a month of org-wide history was pure waste' },
      { type: 'improvement', description: 'Right-sized attendance selfies: WebP quality dropped from 0.8 to 0.65 and longest edge capped at 720px for selfie uploads only (avatars, blog covers, logos unchanged); native-camera capture quality dropped from 80 to 70. Visually equivalent for face-audit use, ~30–40% smaller on the wire' },
      { type: 'improvement', description: 'Capped remaining unbounded getFullList calls in shift.service.ts with explicit 200-row limit — safety net on the check-in critical path' },
    ],
  },
  {
    date: '2026-04-19',
    title: 'Rush-Hour Performance Fixes',
    entries: [
      { type: 'improvement', description: 'Attendance fetch now defaults to the last 30 days with an explicit organization_id filter — previously every dashboard load fetched every attendance record across all orgs, which was the primary cause of 2–5 minute stalls during the 9 AM / 6 PM check-in bursts' },
      { type: 'improvement', description: 'Scoped getLeaves to a 180-day window, getAnnouncements to the latest 200, and added explicit organization_id filters to getEmployees and getTeams — defence-in-depth beyond the API rules and lets SQLite use its indexes' },
      { type: 'improvement', description: 'Check-in now returns success immediately; the selfie uploads in the background with 3 retries and a persistent localStorage queue for failures — users see "Checked in ✓" in under a second instead of waiting for the multipart upload' },
      { type: 'improvement', description: 'Staggered auto_close_sessions cron from every minute to every 5 minutes (at :03), added a per-org timezone-aware rush-hour skip guard so the writer lock is not held during each org\'s 08:45–09:30 / 17:30–19:00 local windows' },
      { type: 'improvement', description: 'Made auto_absent_check cheaper on non-matching minutes (skips the settings read when the minute cannot match any target) — preserves minute-precision firing while reducing background DB load 10×' },
      { type: 'improvement', description: 'markAllAsRead now chunks updates in batches of 10 and caps at the 500 newest unread — prevents hundreds of simultaneous writes piling onto SQLite\'s single-writer lock' },
      { type: 'improvement', description: 'Added Others/SCALING_PLAN.md and Others/SCALING_IMPLEMENTATION_LOG.md — phased plan to scale from today\'s 16 orgs / 100 users toward 1,000+ users, with quick wins, vertical scaling, read replicas, and a Supabase migration path' },
    ],
  },
  {
    date: '2026-04-18',
    title: 'Session & Attendance Stability',
    entries: [
      { type: 'fix', description: 'Fixed auto-logout on flaky networks — auth refresh now retries 3x with backoff and only logs out on a real 401/403; transient network errors keep the session alive' },
      { type: 'fix', description: 'Fixed forgotten check-outs staying active — added a client-side fallback that auto-closes past-date open sessions on next login, in addition to the server cron' },
      { type: 'improvement', description: 'Extracted session lifecycle into a dedicated sessionManager module and attendance session lifecycle into a dedicated workdaySessionManager module so future refactors cannot accidentally break these flows' },
      { type: 'improvement', description: 'Added prebuild validator (scripts/validate-pb-hooks.cjs) that fails the build if the auto_close_sessions cron or core API endpoints are missing from the PocketBase hooks' },
      { type: 'improvement', description: 'Added Others/ATTENDANCE_STANDARDS.md — industry-standards reference and gap analysis for workday, auto clock-out, and missed-punch handling, with sources and a tiered roadmap' },
    ],
  },
  {
    date: '2026-04-16',
    title: 'UX & Error Handling Improvements',
    entries: [
      { type: 'improvement', description: 'Replaced all browser alert() dialogs with toast notifications for better mobile UX' },
      { type: 'improvement', description: 'Added visibility-based polling to Reports and AdminVerificationPanel — stops fetching when tab is hidden to save bandwidth and battery' },
      { type: 'improvement', description: 'Increased Reports page polling interval from 5s to 15s to reduce server load' },
      { type: 'fix', description: 'Fixed subscription context defaulting to full write access on network errors — now restricts access when unable to verify subscription status' },
      { type: 'improvement', description: 'Added TTL-based cache expiration (5 minutes) to organization settings to prevent stale data' },
      { type: 'improvement', description: 'Added pagination limits to notification and review services to prevent loading unbounded data sets' },
    ],
  },
  {
    date: '2026-04-15',
    title: 'Performance Optimization',
    entries: [
      { type: 'improvement', description: 'Added 2-minute TTL caching for employees, attendance, and leave data — page navigation no longer re-fetches from server' },
      { type: 'improvement', description: 'Added request deduplication to prevent duplicate API calls when multiple components load the same data simultaneously' },
      { type: 'fix', description: 'Fixed metadata being fetched 3 times on login — reduced to a single prefetch call' },
      { type: 'improvement', description: 'Added caching for teams data in organization service to reduce redundant API calls' },
      { type: 'improvement', description: 'Removed Android APK download option — app is now PWA-only for cleaner distribution and better trust on all devices' },
    ],
  },
  {
    date: '2026-04-13',
    title: 'Auth & Password Fixes',
    entries: [
      { type: 'fix', description: 'Fixed password change form not working on user profile — added required current password field for PocketBase authentication' },
      { type: 'fix', description: 'Fixed auto-logout after 1-2 days — added token refresh on app startup, periodic refresh every 30 minutes, and background-to-foreground refresh' },
      { type: 'fix', description: 'Fixed password manager not saving credentials on some Android and iOS devices — corrected autocomplete attribute on login email field' },
      { type: 'feature', description: 'Added department-wise export to Organization Directory — filter by single or multiple departments before downloading CSV or PDF' },
    ],
  },
  {
    date: '2026-04-12',
    title: 'Image Optimization',
    entries: [
      { type: 'improvement', description: 'Optimized PWA icon PNGs with maximum compression to reduce file size while maintaining iOS compatibility' },
      { type: 'improvement', description: 'Switched PWA manifest screenshots from PNG to WebP format, reducing screenshot payload by 72-87%' },
      { type: 'improvement', description: 'Updated Open Graph and Twitter Card meta images to use WebP format for faster social media previews' },
    ],
  },
  {
    date: '2026-04-07',
    title: 'PWA Update Strategy Fix',
    entries: [
      { type: 'fix', description: 'Fixed PWA updates causing automatic logout — switched from aggressive skipWaiting to prompt-based update flow so new service workers wait until user approves the reload' },
      { type: 'feature', description: 'Added "App Update Available" banner that notifies users when a new version is ready, with one-tap update button' },
      { type: 'improvement', description: 'Added periodic service worker update checks every 60 seconds and on tab refocus, so updates are detected faster than the default 24-hour browser interval' },
    ],
  },
  {
    date: '2026-04-05',
    title: 'PWA Performance Improvements for iOS',
    entries: [
      { type: 'improvement', description: 'Added Workbox runtime caching for API calls (NetworkFirst), Google Fonts (StaleWhileRevalidate/CacheFirst), esm.sh modules (CacheFirst), and images (CacheFirst) to reduce network dependency' },
      { type: 'improvement', description: 'Made Google Fonts non-render-blocking using preload/onload pattern for faster initial paint' },
      { type: 'improvement', description: 'Deferred third-party analytics and consent scripts to stop them from blocking the main thread during load' },
      { type: 'improvement', description: 'Throttled theme re-fetch on visibility change to once per 60 seconds — prevents excessive API calls when using iOS notification center, app switcher, or control center' },
      { type: 'improvement', description: 'Narrowed service worker precache to exclude PNGs (now runtime-cached) and added 3MB file size limit to reduce SW install payload' },
      { type: 'improvement', description: 'Enabled navigation preload for faster page loads on iOS 17.4+' },
    ],
  },
  {
    date: '2026-03-16',
    title: 'Default Theme Update',
    entries: [
      { type: 'improvement', description: 'Changed default app theme from Arctic Frost to Charcoal Slate for a more refined, professional look' },
      { type: 'fix', description: 'Fixed iOS PWA password auto-save not triggering — hidden form now submits before route change so WKWebView detects credentials while login DOM is still mounted' },
      { type: 'fix', description: 'Fixed PasswordCredential API being incorrectly used on iOS (Chrome on iOS is WKWebView and does not support it) — now falls through to Safari hidden form strategy' },
      { type: 'fix', description: 'Changed login form action from "#" to "." so Safari recognizes it as a navigable form for credential association' },
      { type: 'fix', description: 'Set hidden iframe src to about:blank and form action to current URL for better WKWebView standalone credential detection' },
      { type: 'fix', description: 'Fixed all "Get Started Free" buttons across Features, Feature Detail, Blog, and Tutorials pages redirecting to landing page instead of registration page' },
    ],
  },
  {
    date: '2026-03-16',
    title: 'Camera Reliability Fix',
    entries: [
      { type: 'fix', description: 'Fixed camera sometimes not loading on Attendance page — stale closure in stopCamera/cleanup caused MediaStream tracks to leak or not attach to the video element' },
      { type: 'fix', description: 'Fixed camera restarting unnecessarily when attendance record updates — separated hardware init from duty-type updates to prevent camera flicker after punching' },
      { type: 'fix', description: 'Fixed camera showing black/frozen feed after returning from background — added auto-recovery via track.onended and visibilitychange listeners to detect and restart silently ended MediaStream tracks' },
      { type: 'fix', description: 'Fixed iOS PWA showing "Camera permission denied" error instead of usable fallback — now silently falls back to "Tap to Take Photo" button in standalone mode' },
      { type: 'fix', description: 'Fixed PWA manifest theme_color mismatch with index.html meta tag causing inconsistent status bar color' },
    ],
  },
  {
    date: '2026-03-13',
    title: 'Setup Guides & Contextual Help System',
    entries: [
      { type: 'feature', description: 'Added global site search with Spotlight-style dialog (Ctrl+K / Cmd+K) — search across features, blog posts, tutorial guides, and FAQ from any page' },
      { type: 'improvement', description: 'Renamed "How It Works" to "Roadmap" in navbar and footer, removed Changelog from top navbar (still accessible from footer)' },
      { type: 'improvement', description: 'Added search button to Guides page navbar for consistent search access across all pages' },
      { type: 'fix', description: 'Fixed paste formatting in Rich Text Editor — pasting HTML from external sources now preserves headings, lists, tables, bold/italic, and links instead of stripping all formatting' },
      { type: 'fix', description: 'Fixed links in the Rich Text Editor (blog/tutorial) being invisible — added explicit blue underline styling for anchor tags inside the contentEditable area' },
      { type: 'improvement', description: 'Replaced URL prompt for image insertion in the Rich Text Editor with a file upload picker that auto-converts images to WebP and uploads them to PocketBase storage' },
      { type: 'feature', description: 'Added content_images PocketBase collection for storing uploaded editor images with public read access and authenticated write access' },
      { type: 'feature', description: 'Added floating link toolbar in Rich Text Editor — click any link to see its URL, edit it inline, open it in a new tab, or remove the link entirely' },
      { type: 'improvement', description: 'Made links consistently visible with underline styling across all content areas — editor, preview panels, blog posts, and tutorial pages' },
      { type: 'improvement', description: 'Rewrote all 25 tutorial guides with SEO-optimized headings, keyword-rich excerpts, and internal linking between tutorials for better search engine rankings' },
      { type: 'improvement', description: 'Added 100+ internal links across guides using /how-to-use/{slug} URLs and external links to feature pages for improved discoverability' },
      { type: 'feature', description: 'Added Setup Checklist widget on Admin Dashboard — a numbered 8-step guide that walks new admins through organization setup (Company Info, Departments, Shifts, Locations, Teams, Leave Policy, Holidays, Employees) with auto-detection of completed steps' },
      { type: 'feature', description: 'Added contextual Help Buttons (ℹ️ icons) across all app pages — each links to the relevant tutorial guide for that feature' },
      { type: 'feature', description: 'Added Super Admin "Guides" tab to configure which tutorial each help button links to, with dropdown selection from all published tutorials' },
      { type: 'feature', description: 'Setup Checklist includes progress bar, dismissible with "Don\'t show this again" option, and re-enable button in Settings page' },
      { type: 'feature', description: 'Organization page now supports direct tab navigation — Setup Checklist "Go" buttons navigate directly to the relevant Organization tab' },
      { type: 'improvement', description: 'Added 11 new tutorials to guides content covering Performance Reviews, Announcements, Notifications, Theme Customization, Custom Leave Types, Notification Settings, Dashboard Guide, Subscription & Upgrade, and Employee Data Exports' },
      { type: 'improvement', description: 'Updated Organization Setup guide to include the Notifications configuration tab and corrected the tab count from 8 to 9' },
      { type: 'improvement', description: 'Enhanced existing tutorials with CSV/PDF export details in Employee Directory and expanded Theme Selection section in Settings guide' },
      { type: 'improvement', description: 'Help icons now use more visible primary colors with border and shadow — 3 style variants: default (page headers), sidebar (hover-reveal), inline (active tabs)' },
      { type: 'feature', description: 'Added help icons to all sidebar menu items for every role (Admin, HR, Manager, Employee) — appear on hover linking to relevant guides' },
      { type: 'feature', description: 'Added help icons to all Organization tab buttons — shown inline when the tab is active' },
      { type: 'improvement', description: 'Setup Checklist now shows a visible "Show Setup Guide" button on the dashboard when dismissed, so admins can easily bring it back' },
      { type: 'improvement', description: 'Updated implementation doc with PocketBase storage details, variant system docs, and future improvement suggestions' },
      { type: 'improvement', description: 'Tutorials/Guides page now displays categories in a defined logical order (Getting Started → Dashboard → Attendance → Leave → ... → General) instead of random insertion order' },
      { type: 'feature', description: 'Added "Auto-Order" button in Super Admin Tutorials panel — bulk-assigns display_order values based on category grouping with gaps of 10 for easy reordering' },
    ],
  },
  {
    date: '2026-03-12',
    title: 'Auto-Close Cron & iOS Login Fix',
    entries: [
      { type: 'fix', description: 'Fixed iOS PWA blank white screen after login — Safari password save form submission was blocking the login state update' },
      { type: 'fix', description: 'Fixed password save prompt not appearing on Android APK — added native AutofillManager bridge to trigger save after AJAX login' },
      { type: 'fix', description: 'Fixed Android APK autofill not triggering — switched Capacitor WebView to HTTPS scheme so password managers trust the origin' },
      { type: 'improvement', description: 'Improved iOS PWA standalone password save detection — form now waits for DOM paint before submission for better WKWebView compatibility' },
      { type: 'feature', description: 'Added requestAutofill bridge for Android APK to explicitly show saved credential suggestions on login page load' },
      { type: 'improvement', description: 'Added Digital Asset Links (assetlinks.json) for Google Password Manager to associate APK with web domain credentials' },
      { type: 'fix', description: 'Added htmlFor attributes on login form labels for better password manager field identification on iOS and Android' },
    ],
  },
  {
    date: '2026-03-10',
    title: 'Location Detection Fixes for PWA & Chrome',
    entries: [
      { type: 'fix', description: 'Fixed location errors not being displayed to users — previously showed "GPS Waiting" forever with no explanation' },
      { type: 'fix', description: 'Added automatic fallback from high-accuracy GPS to network-based location when GPS is unavailable (e.g. indoors)' },
      { type: 'fix', description: 'Increased geolocation timeout from 15s to 30s to prevent premature failures on slower devices' },
      { type: 'improvement', description: 'Added specific error messages for permission denied, position unavailable, and timeout errors instead of generic message' },
      { type: 'improvement', description: 'Added PWA-specific guidance for enabling location on Android Chrome, iOS Safari, and desktop browsers' },
      { type: 'feature', description: 'Added "How to Enable Location" help guide accessible from the attendance screen when location fails' },
      { type: 'improvement', description: 'Added prominent Retry and Help buttons when location detection fails instead of relying on a tiny tappable label' },
      { type: 'feature', description: 'Added employee directory export to CSV and PDF for organization admins' },
      { type: 'fix', description: 'Fixed location help guide close button not working due to pointer-events inheritance from camera overlay' },
      { type: 'fix', description: 'Fixed sitemap.xml intermittently returning 404 — PWA service worker was intercepting navigation requests and serving index.html instead of the actual XML file' },
    ],
  },
  {
    date: '2026-03-09',
    title: 'Dynamic Sitemap Generation',
    entries: [
      { type: 'improvement', description: 'Sitemap now auto-generates at build time, including all blog posts and tutorials from PocketBase with lastmod dates' },
      { type: 'fix', description: 'Fixed 404 page Go Back button not working when there is no in-site navigation history' },
      { type: 'improvement', description: 'Added BreadcrumbList JSON-LD structured data to blog posts, tutorials, and feature detail pages for rich search results' },
      { type: 'improvement', description: 'Added CollectionPage JSON-LD schema to the blog listing page' },
      { type: 'fix', description: 'Fixed iOS Safari not showing Save Password prompt on login by adding hidden form submission fallback' },
      { type: 'fix', description: 'Added missing autocomplete, name, and id attributes to registration form inputs for better password manager support' },
    ],
  },
  {
    date: '2026-03-08',
    title: 'SEO & Clean URLs',
    entries: [
      { type: 'feature', description: 'Added dedicated /features page with individual feature sub-pages for better SEO' },
      { type: 'improvement', description: 'Migrated blog and tutorial routes from hash-based to clean URLs' },
      { type: 'improvement', description: 'Expanded sitemap.xml with all feature sub-pages' },
      { type: 'feature', description: 'Added /changelog page with full project history' },
      { type: 'improvement', description: 'Added code splitting with React.lazy() for authenticated pages to reduce initial bundle size' },
      { type: 'improvement', description: 'Added fetchpriority="high" to hero image for faster LCP' },
      { type: 'improvement', description: 'Added unique meta tags (title, description, canonical) to Privacy Policy, Terms of Service, Download, and 404 pages' },
      { type: 'improvement', description: 'Landing page feature cards now link to dedicated feature detail pages with Learn more CTA and View All Features button' },
      { type: 'improvement', description: 'Added social media links to Blog and Tutorials page footers for consistent branding across all pages' },
    ],
  },
  {
    date: '2026-03-07',
    title: 'Leave Notifications',
    entries: [
      { type: 'feature', description: 'Added email notification hooks for leave request approvals and rejections' },
      { type: 'fix', description: 'Fixed leave notifications using parameterized queries in findRecordsByFilter' },
      { type: 'fix', description: 'Restored working leave notification hooks with email-only string concatenation filters' },
    ],
  },
  {
    date: '2026-03-06',
    version: '2.5.0',
    title: 'Image Optimization & Mobile UX',
    entries: [
      { type: 'improvement', description: 'Added automatic WebP conversion for uploaded images to reduce file sizes' },
      { type: 'improvement', description: 'Added image validation hooks to enforce size and format constraints' },
      { type: 'feature', description: 'Introduced inline login flow on mobile for a smoother experience' },
      { type: 'feature', description: 'Added PWA install button for one-tap home screen installation' },
      { type: 'fix', description: 'Fixed mobile layout issues across multiple components' },
    ],
  },
  {
    date: '2026-03-05',
    title: 'PDF Exports & Notification System',
    entries: [
      { type: 'feature', description: 'Added PDF export for reports with organization header, stats, and pagination' },
      { type: 'improvement', description: 'Improved PDF logo scaling and layout consistency' },
      { type: 'feature', description: 'Added admin notification center with bulk delete and retention settings' },
      { type: 'improvement', description: 'Review status now auto-transitions through workflow stages' },
    ],
  },
  {
    date: '2026-03-04',
    version: '2.4.0',
    title: 'Performance Reviews & Announcements',
    entries: [
      { type: 'feature', description: 'Launched performance review module with competency ratings' },
      { type: 'feature', description: 'Added self-assessment, manager review, and HR calibration stages' },
      { type: 'feature', description: 'Introduced company announcements noticeboard with bell notifications' },
      { type: 'feature', description: 'Added attendance and leave summary cards to review forms' },
    ],
  },
  {
    date: '2026-03-01',
    version: '2.3.0',
    title: 'Security Hardening',
    entries: [
      { type: 'security', description: 'Fixed SQL injection vulnerabilities in filter queries' },
      { type: 'security', description: 'Patched XSS vulnerabilities in user-generated content rendering' },
      { type: 'security', description: 'Resolved API key exposure issue in client-side code' },
      { type: 'improvement', description: 'Added input sanitization across all form submissions' },
    ],
  },
  {
    date: '2026-02-28',
    version: '2.2.0',
    title: 'Theme System',
    entries: [
      { type: 'feature', description: 'Added 14 color themes with dark and light mode support' },
      { type: 'feature', description: 'Super admin can now set a global default theme for all organizations' },
      { type: 'improvement', description: 'Theme preference persists across sessions and devices' },
    ],
  },
  {
    date: '2026-02-25',
    title: 'Tutorials & Guides',
    entries: [
      { type: 'feature', description: 'Added step-by-step tutorial guides for all major features' },
      { type: 'feature', description: 'Created PWA installation guides for Android, iOS, and desktop' },
      { type: 'feature', description: 'Added GDPR cookie consent banner with configurable preferences' },
    ],
  },
  {
    date: '2026-02-17',
    version: '2.1.0',
    title: 'Organization Showcase',
    entries: [
      { type: 'feature', description: 'Launched public organization showcase page on the landing site' },
      { type: 'feature', description: 'Added showcase management for admins to control public visibility' },
    ],
  },
  {
    date: '2026-02-12',
    version: '2.0.0',
    title: 'Blog CMS',
    entries: [
      { type: 'feature', description: 'Added full blog system with rich text editor and image uploads' },
      { type: 'feature', description: 'Blog management dashboard for creating, editing, and publishing posts' },
      { type: 'feature', description: 'Integrated ad placements within blog content' },
    ],
  },
  {
    date: '2026-02-02',
    title: 'Major UI Refactor',
    entries: [
      { type: 'improvement', description: 'Redesigned dashboard with modern card-based layout' },
      { type: 'improvement', description: 'Overhauled leave workflows with streamlined approval process' },
      { type: 'feature', description: 'Added team management and department hierarchy views' },
      { type: 'feature', description: 'Added holiday calendar management for organizations' },
      { type: 'improvement', description: 'Improved reporting module with interactive charts' },
    ],
  },
  {
    date: '2026-01-21',
    version: '1.5.0',
    title: 'Production Launch',
    entries: [
      { type: 'improvement', description: 'Restructured project folders for scalability' },
      { type: 'feature', description: 'Added organization registration with email verification flow' },
      { type: 'feature', description: 'Added account verification and password reset via email' },
    ],
  },
  {
    date: '2026-01-14',
    version: '1.0.0',
    title: 'PocketBase Migration & PWA',
    entries: [
      { type: 'breaking', description: 'Migrated backend from local storage to PocketBase for multi-user support' },
      { type: 'feature', description: 'Added Progressive Web App (PWA) support with offline capabilities' },
      { type: 'feature', description: 'Introduced office mode and factory mode for different work environments' },
    ],
  },
  {
    date: '2026-01-07',
    version: '0.1.0',
    title: 'Initial Release',
    entries: [
      { type: 'feature', description: 'Core attendance tracking with selfie-based check-in' },
      { type: 'feature', description: 'Leave management with request and approval workflow' },
      { type: 'feature', description: 'Employee directory with role-based access control' },
      { type: 'feature', description: 'GPS location tracking for attendance verification' },
    ],
  },
];
