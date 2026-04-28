/**
 * RSS Feed Generator
 *
 * Combines blog posts, tutorials/guides, and product features into a single
 * RSS 2.0 feed at public/feed.xml. Each item carries a <category> so feed
 * readers and AI/LLM crawlers can distinguish content types.
 *
 * Usage: node scripts/generate-feed.mjs
 * Runs automatically as part of `npm run build`.
 */

import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://openhrapp.com';
const PB_URL = 'https://pocketbase.mimnets.com';
const FEED_TITLE = 'OpenHR';
const FEED_DESCRIPTION =
  'Articles, guides, and product updates from OpenHR — the open-source HR management system.';

// Mirrors src/data/features.ts (FEATURES array). Kept here to avoid importing
// .ts/JSX from a Node script. If you add or rename a feature in features.ts,
// update this list too — the same way scripts/generate-sitemap.mjs hardcodes
// the feature URLs.
const FEATURES = [
  {
    slug: 'attendance-tracking',
    title: 'Attendance Management',
    description:
      'Track employee attendance with selfie-based check-in, GPS verification, and real-time dashboards. Supports office and factory shift modes.',
  },
  {
    slug: 'leave-management',
    title: 'Leave Management',
    description:
      'Streamline leave requests, approvals, and balance tracking. Configure custom leave types with automatic calculations.',
  },
  {
    slug: 'performance-reviews',
    title: 'Performance Reviews',
    description:
      'Run structured performance reviews with self-assessment, manager evaluation, and HR finalization. Customizable competencies and rating scales.',
  },
  {
    slug: 'gps-geofencing',
    title: 'GPS & Location Verification',
    description:
      'Verify employee attendance with GPS location tracking. Ideal for remote teams and field workers.',
  },
  {
    slug: 'biometric-selfie-verification',
    title: 'Biometric Selfie Verification',
    description:
      'Prevent buddy punching with selfie-based attendance verification. Photo evidence ensures authentic check-ins. No special hardware needed.',
  },
  {
    slug: 'employee-directory',
    title: 'Employee Directory',
    description:
      'Manage employee profiles, departments, and org structure in one place. Role-based access, bulk import, and searchable directory.',
  },
  {
    slug: 'reports-analytics',
    title: 'Reports & Analytics',
    description:
      'Generate attendance reports, leave utilization analytics, and team performance insights. Interactive charts and CSV export.',
  },
];

function escapeXml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(input) {
  if (!input) return new Date().toUTCString();
  const d = input instanceof Date ? input : new Date(String(input).replace(' ', 'T'));
  if (isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

function parseDate(input) {
  if (!input) return 0;
  const d = new Date(String(input).replace(' ', 'T'));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

async function fetchAllPages(endpoint, recordsKey) {
  const items = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${PB_URL}${endpoint}?page=${page}&limit=100`);
    if (!res.ok) {
      console.warn(`  Warning: ${endpoint} returned ${res.status}`);
      break;
    }
    const data = await res.json();
    const records = data[recordsKey] || [];
    if (records.length === 0) break;
    items.push(...records);
    if (page >= (data.totalPages || 1)) break;
    page++;
  }
  return items;
}

function renderItem({ title, link, description, pubDate, author, category }) {
  return [
    '    <item>',
    `      <title>${escapeXml(title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    `      <pubDate>${pubDate}</pubDate>`,
    `      <category>${escapeXml(category)}</category>`,
    `      <description>${escapeXml(description)}</description>`,
    `      <dc:creator>${escapeXml(author)}</dc:creator>`,
    '    </item>',
  ].join('\n');
}

async function main() {
  console.log('Generating RSS feed...');

  let posts = [];
  try {
    posts = await fetchAllPages('/api/openhr/blog/posts', 'posts');
    console.log(`  Found ${posts.length} blog post(s)`);
  } catch (e) {
    console.warn('  Warning: Could not fetch blog posts:', e.message);
  }

  let tutorials = [];
  try {
    tutorials = await fetchAllPages('/api/openhr/tutorials/posts', 'tutorials');
    console.log(`  Found ${tutorials.length} tutorial(s)`);
  } catch (e) {
    console.warn('  Warning: Could not fetch tutorials:', e.message);
  }

  // Use features.ts mtime as the stable pubDate for feature items so the feed
  // doesn't churn on every build but does refresh when the feature data changes.
  const featuresPath = path.resolve('src', 'data', 'features.ts');
  const featuresMtime = fs.existsSync(featuresPath)
    ? fs.statSync(featuresPath).mtime
    : new Date();

  const blogItems = posts
    .filter((p) => p.slug)
    .map((p) => ({
      sortKey: parseDate(p.published_at || p.created),
      item: {
        title: p.title || p.slug,
        link: `${SITE_URL}/blog/${p.slug}`,
        description: p.excerpt || '',
        pubDate: toRfc822(p.published_at || p.created),
        author: p.author_name || 'OpenHR Team',
        category: 'Blog',
      },
    }));

  const tutorialItems = tutorials
    .filter((t) => t.slug)
    .map((t) => ({
      sortKey: parseDate(t.published_at || t.created),
      item: {
        title: t.title || t.slug,
        link: `${SITE_URL}/how-to-use/${t.slug}`,
        description: t.excerpt || '',
        pubDate: toRfc822(t.published_at || t.created),
        author: t.author_name || 'OpenHR Team',
        category: t.category ? `Guide — ${t.category}` : 'Guide',
      },
    }));

  const featureItems = FEATURES.map((f) => ({
    item: {
      title: f.title,
      link: `${SITE_URL}/features/${f.slug}`,
      description: f.description,
      pubDate: toRfc822(featuresMtime),
      author: 'OpenHR Team',
      category: 'Feature',
    },
  }));

  // Sort blog + tutorials by date desc (real news at the top), then append
  // evergreen feature items after — features carry the file mtime so a real
  // edit refreshes them, but they don't displace fresh content in readers.
  const dated = [...blogItems, ...tutorialItems].sort((a, b) => b.sortKey - a.sortKey);
  const all = [...dated.map(({ item }) => item), ...featureItems.map(({ item }) => item)];

  const newestDated = dated[0]?.sortKey ?? featuresMtime.getTime();
  const lastBuildDate = toRfc822(new Date(Math.max(newestDated, featuresMtime.getTime())));

  const itemsXml = all.map((item) => renderItem(item)).join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <link>${SITE_URL}</link>`,
    `    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    '    <language>en-us</language>',
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    itemsXml,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');

  const publicPath = path.resolve('public', 'feed.xml');
  fs.writeFileSync(publicPath, xml, 'utf-8');
  console.log(
    `  Written: ${publicPath} (${all.length} items — ${blogItems.length} blog, ${tutorialItems.length} guide, ${featureItems.length} feature)`
  );

  const distPath = path.resolve('dist', 'feed.xml');
  if (fs.existsSync(path.resolve('dist'))) {
    fs.writeFileSync(distPath, xml, 'utf-8');
    console.log(`  Written: ${distPath}`);
  }

  console.log('RSS feed generation complete!');
}

main().catch((err) => {
  console.error('RSS feed generation failed:', err.message);
  process.exit(0);
});
