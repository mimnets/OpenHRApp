/**
 * Sitemap Generator
 *
 * Fetches published blog posts and tutorials from Supabase,
 * then generates a complete sitemap.xml with all public pages.
 *
 * Usage: node scripts/generate-sitemap.mjs
 * Runs automatically as part of `npm run build`.
 */

const SITE_URL = 'https://openhrapp.com';
const SUPABASE_URL = 'https://cixryuwtdwbofabctrkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeHJ5dXd0bHdib2ZhYmN0cmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTgzMjcsImV4cCI6MjA5NDEzNDMyN30.DIsKHuNmR6ivb2oAdukpDDV8XSlK9km1KJDQ0O8yUEE';
const TODAY = new Date().toISOString().split('T')[0];

// Static pages with their changefreq and priority
const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/blog', changefreq: 'daily', priority: '0.8' },
  { path: '/features', changefreq: 'monthly', priority: '0.8' },
  { path: '/features/attendance-tracking', changefreq: 'monthly', priority: '0.7' },
  { path: '/features/leave-management', changefreq: 'monthly', priority: '0.7' },
  { path: '/features/performance-reviews', changefreq: 'monthly', priority: '0.7' },
  { path: '/features/gps-geofencing', changefreq: 'monthly', priority: '0.7' },
  { path: '/features/biometric-selfie-verification', changefreq: 'monthly', priority: '0.7' },
  { path: '/features/employee-directory', changefreq: 'monthly', priority: '0.7' },
  { path: '/features/reports-analytics', changefreq: 'monthly', priority: '0.7' },
  { path: '/changelog', changefreq: 'weekly', priority: '0.7' },
  { path: '/how-to-use', changefreq: 'weekly', priority: '0.7' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.3' },
  { path: '/terms', changefreq: 'monthly', priority: '0.3' },
];

const SUPABASE_HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

async function fetchAllRows(table, select = 'slug,updated_at,published_at') {
  const items = [];
  const limit = 1000;
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({
      select,
      status: 'eq.published',
      order: 'published_at.desc',
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: { ...SUPABASE_HEADERS, 'Accept': 'application/json' },
    });
    if (!res.ok) {
      console.warn(`  Warning: ${table} returned ${res.status}`);
      break;
    }
    // Prefer header range for count; fall back to body length
    const rangeHeader = res.headers.get('content-range');
    const records = await res.json();
    if (!records.length) break;
    items.push(...records);
    const totalFromRange = rangeHeader ? parseInt(rangeHeader.split('/')[1], 10) : null;
    if (totalFromRange !== null && items.length >= totalFromRange) break;
    if (records.length < limit) break;
    offset += limit;
  }
  return items;
}

function buildUrlEntry(loc, lastmod, changefreq, priority) {
  let xml = '  <url>\n';
  xml += `    <loc>${loc}</loc>\n`;
  if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
  xml += `    <changefreq>${changefreq}</changefreq>\n`;
  xml += `    <priority>${priority}</priority>\n`;
  xml += '  </url>';
  return xml;
}

async function main() {
  console.log('Generating sitemap...');

  // Build static entries — stamp TODAY as lastmod so bots have a freshness signal.
  const entries = STATIC_PAGES.map((p) =>
    buildUrlEntry(`${SITE_URL}${p.path}`, TODAY, p.changefreq, p.priority)
  );

  // Fetch blog posts
  try {
    console.log('  Fetching blog posts...');
    const posts = await fetchAllRows('blog_posts');
    console.log(`  Found ${posts.length} blog post(s)`);
    for (const post of posts) {
      if (!post.slug) continue;
      const lastmod = (post.updated_at || post.published_at || '').split('T')[0] || null;
      entries.push(
        buildUrlEntry(`${SITE_URL}/blog/${post.slug}`, lastmod, 'weekly', '0.6')
      );
    }
  } catch (e) {
    console.warn('  Warning: Could not fetch blog posts:', e.message);
  }

  // Fetch tutorials
  try {
    console.log('  Fetching tutorials...');
    const tutorials = await fetchAllRows('tutorials');
    console.log(`  Found ${tutorials.length} tutorial(s)`);
    for (const tut of tutorials) {
      if (!tut.slug) continue;
      const lastmod = (tut.updated_at || tut.published_at || '').split('T')[0] || null;
      entries.push(
        buildUrlEntry(`${SITE_URL}/how-to-use/${tut.slug}`, lastmod, 'weekly', '0.6')
      );
    }
  } catch (e) {
    console.warn('  Warning: Could not fetch tutorials:', e.message);
  }

  // Build final XML
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');

  // Write to public/ (source) and dist/ (if exists, for post-build)
  const fs = await import('fs');
  const path = await import('path');

  const publicPath = path.resolve('public', 'sitemap.xml');
  fs.writeFileSync(publicPath, xml, 'utf-8');
  console.log(`  Written: ${publicPath} (${entries.length} URLs)`);

  const distPath = path.resolve('dist', 'sitemap.xml');
  if (fs.existsSync(path.resolve('dist'))) {
    fs.writeFileSync(distPath, xml, 'utf-8');
    console.log(`  Written: ${distPath}`);
  }

  console.log('Sitemap generation complete!');
}

main().catch((err) => {
  console.error('Sitemap generation failed:', err.message);
  // Don't fail the build — the static sitemap in public/ is still valid
  process.exit(0);
});
