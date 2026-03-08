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
