// 2026-04-16: Added dependency updates and logo fix entry
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
