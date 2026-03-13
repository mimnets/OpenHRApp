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
    date: '2026-03-13',
    title: 'Setup Guides & Contextual Help System',
    entries: [
      { type: 'feature', description: 'Added global site search with Spotlight-style dialog (Ctrl+K / Cmd+K) — search across features, blog posts, tutorial guides, and FAQ from any page' },
      { type: 'improvement', description: 'Renamed "How It Works" to "Roadmap" in navbar and footer, removed Changelog from top navbar (still accessible from footer)' },
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
      { type: 'fix', description: 'Fixed attendance sessions not auto-closing at the configured time — previously auto-close only triggered when the employee opened the app, not on a schedule' },
      { type: 'feature', description: 'Added server-side cron job that runs every minute to auto-close open attendance sessions past the configured autoSessionCloseTime' },
      { type: 'improvement', description: 'Auto-close now sends bell notifications to employees when their session is force-closed by the system' },
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
