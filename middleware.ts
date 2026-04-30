/**
 * Vercel Edge Middleware — Social Bot Prerender
 *
 * Social crawlers (Facebook, Slack, LinkedIn, WhatsApp, Telegram, Discord)
 * don't execute JavaScript. Without this middleware they receive the generic
 * homepage meta from index.html for every URL, breaking link previews.
 *
 * For detected social bots on dynamic routes this middleware fetches the
 * real page metadata from PocketBase and returns a minimal HTML shell with
 * the correct <title>, <meta>, Open Graph, and Twitter Card tags.
 *
 * All other requests (real users, Googlebot) are passed through unchanged
 * so the SPA behaves normally.
 */

export const config = {
  matcher: ['/blog/:slug+', '/how-to-use/:slug+', '/features/:slug+'],
};

const PB_URL = 'https://pocketbase.mimnets.com';
const SITE_URL = 'https://openhrapp.com';
const DEFAULT_IMAGE = `${SITE_URL}/img/screenshot-wide.webp`;
const DEFAULT_DESCRIPTION = 'Free, open-source HR management system with attendance tracking, leave management, employee directory, and compliance tools.';

// Social crawlers that don't render JavaScript
const SOCIAL_BOT_RE = /facebookexternalhit|LinkedInBot|Twitterbot|Slackbot-LinkExpanding|Slackbot|WhatsApp|TelegramBot|Discordbot|Pinterestbot|Embedly|Quora Link Preview|Rogerbot|Showyoubot|Outbrain|W3C_Validator/i;

// Static feature metadata — mirrors src/data/features.ts FEATURES array.
// Inlined here because Edge Runtime cannot import from src/.
const FEATURE_META: Record<string, { title: string; description: string }> = {
  'attendance-tracking': {
    title: 'Attendance Tracking Software | OpenHR - Selfie & GPS Check-In',
    description: 'Track employee attendance with selfie-based check-in, GPS verification, and real-time dashboards. Supports office and factory shift modes. Free and open-source.',
  },
  'leave-management': {
    title: 'Leave Management System | OpenHR - Request, Approve & Track',
    description: 'Streamline leave requests, approvals, and balance tracking. Configure custom leave types with automatic calculations. Free HR leave management software.',
  },
  'performance-reviews': {
    title: 'Performance Review Software | OpenHR - Structured Review Cycles',
    description: 'Run structured performance reviews with self-assessment, manager evaluation, and HR finalization. Customizable competencies and rating scales. Free HRMS.',
  },
  'gps-geofencing': {
    title: 'GPS Attendance Tracking | OpenHR - Location Verified Check-In',
    description: 'Verify employee attendance with GPS location tracking. Ensure employees check in from approved locations. Ideal for remote teams and field workers.',
  },
  'biometric-selfie-verification': {
    title: 'Selfie-Based Attendance | OpenHR - Photo Verified Check-In',
    description: 'Prevent buddy punching with selfie-based attendance verification. Photo evidence ensures authentic check-ins. No special hardware needed.',
  },
  'employee-directory': {
    title: 'Employee Directory & HR Database | OpenHR - Centralized Team Management',
    description: 'Manage employee profiles, departments, and org structure in one place. Role-based access, bulk import, and searchable directory. Free open-source HRMS.',
  },
  'reports-analytics': {
    title: 'HR Reports & Analytics | OpenHR - Data-Driven HR Decisions',
    description: 'Generate attendance reports, leave utilization analytics, and team performance insights. Interactive charts and CSV export. Free open-source HR reporting.',
  },
};

interface PageMeta {
  title: string;
  description: string;
  image: string;
  url: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(meta: PageMeta): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const i = escapeHtml(meta.image);
  const u = escapeHtml(meta.url);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${u}">
<meta property="og:type" content="website">
<meta property="og:url" content="${u}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${i}">
<meta property="og:site_name" content="OpenHRApp">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@openhrapp">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${i}">
</head>
<body></body>
</html>`;
}

async function resolveFeatureMeta(slug: string, pathname: string): Promise<PageMeta | null> {
  const feature = FEATURE_META[slug];
  if (!feature) return null;
  return {
    title: feature.title,
    description: feature.description,
    image: DEFAULT_IMAGE,
    url: `${SITE_URL}${pathname}`,
  };
}

async function resolveBlogMeta(slug: string, pathname: string): Promise<PageMeta | null> {
  try {
    const res = await fetch(`${PB_URL}/api/openhr/blog/posts/${encodeURIComponent(slug)}`, {
      headers: { 'User-Agent': 'OpenHRApp-Prerender/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json() as { success?: boolean; post?: { title?: string; excerpt?: string; cover_image?: string; id?: string } };
    if (!data.success || !data.post) return null;
    const p = data.post;
    const image = p.cover_image && p.id
      ? `${PB_URL}/api/files/blog_posts/${p.id}/${p.cover_image}`
      : DEFAULT_IMAGE;
    return {
      title: p.title ? `${p.title} | OpenHR Blog` : 'OpenHR Blog',
      description: p.excerpt || DEFAULT_DESCRIPTION,
      image,
      url: `${SITE_URL}${pathname}`,
    };
  } catch {
    return null;
  }
}

async function resolveTutorialMeta(slug: string, pathname: string): Promise<PageMeta | null> {
  try {
    const res = await fetch(`${PB_URL}/api/openhr/tutorials/posts/${encodeURIComponent(slug)}`, {
      headers: { 'User-Agent': 'OpenHRApp-Prerender/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json() as { success?: boolean; tutorial?: { title?: string; excerpt?: string; cover_image?: string; id?: string } };
    if (!data.success || !data.tutorial) return null;
    const p = data.tutorial;
    const image = p.cover_image && p.id
      ? `${PB_URL}/api/files/tutorials/${p.id}/${p.cover_image}`
      : DEFAULT_IMAGE;
    return {
      title: p.title ? `${p.title} | OpenHR Guides` : 'OpenHR Guides',
      description: p.excerpt || DEFAULT_DESCRIPTION,
      image,
      url: `${SITE_URL}${pathname}`,
    };
  } catch {
    return null;
  }
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const ua = request.headers.get('user-agent') ?? '';
  if (!SOCIAL_BOT_RE.test(ua)) return undefined;

  const { pathname } = new URL(request.url);

  // Route to correct resolver
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
  const tutorialMatch = pathname.match(/^\/how-to-use\/([^/]+)$/);
  const featureMatch = pathname.match(/^\/features\/([^/]+)$/);

  let meta: PageMeta | null = null;

  if (blogMatch) {
    meta = await resolveBlogMeta(blogMatch[1], pathname);
  } else if (tutorialMatch) {
    meta = await resolveTutorialMeta(tutorialMatch[1], pathname);
  } else if (featureMatch) {
    meta = await resolveFeatureMeta(featureMatch[1], pathname);
  }

  // If we couldn't resolve meta (unknown slug, API error), pass through
  if (!meta) return undefined;

  return new Response(buildHtml(meta), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'X-Prerender': 'social-bot',
    },
  });
}
