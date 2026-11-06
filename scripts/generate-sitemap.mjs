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
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.');
  process.exit(0); // Don't fail the build, just skip sitemap generation
}
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
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.3' },
  { path: '/terms', changefreq: 'monthly', priority: '0.3' },
];

const SUPABASE_HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

// NOTE: `status` is stored uppercase ('DRAFT' | 'PUBLISHED' | 'ARCHIVED') per the CHECK
// constraint in 0001_initial_schema.sql, and PostgREST `eq` is case-sensitive. The timestamp
// columns are `created` / `updated` — NOT `created_at` / `updated_at`. Getting either wrong
// silently yields zero rows, which drops every post and guide out of the sitemap.
async function fetchAllRows(table, select = 'slug,updated,published_at') {
  const items = [];
  const limit = 1000;
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({
      select,
      status: 'eq.PUBLISHED',
      order: 'published_at.desc',
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: { ...SUPABASE_HEADERS, 'Accept': 'application/json' },
    });
    if (!res.ok) {
      // Fail loudly. A silent warn+break here is what hid the broken query for months.
      const body = await res.text().catch(() => '');
      throw new Error(`${table} query failed: HTTP ${res.status} ${body}`);
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
  {
    console.log('  Fetching blog posts...');
    const posts = await fetchAllRows('blog_posts');
    console.log(`  Found ${posts.length} blog post(s)`);
    for (const post of posts) {
      if (!post.slug) continue;
      const lastmod = (post.updated || post.published_at || '').split('T')[0] || null;
      entries.push(
        buildUrlEntry(`${SITE_URL}/blog/${post.slug}`, lastmod, 'weekly', '0.6')
      );
    }
  }

  // Fetch tutorials
  {
    console.log('  Fetching tutorials...');
    const tutorials = await fetchAllRows('tutorials');
    console.log(`  Found ${tutorials.length} tutorial(s)`);
    for (const tut of tutorials) {
      if (!tut.slug) continue;
      const lastmod = (tut.updated || tut.published_at || '').split('T')[0] || null;
      entries.push(
        buildUrlEntry(`${SITE_URL}/how-to-use/${tut.slug}`, lastmod, 'weekly', '0.6')
      );
    }
  }

  // Guard against a silent regression: if the content tables resolve to nothing at all,
  // the sitemap would ship with only the static marketing URLs — the exact failure mode
  // that made every blog post and guide invisible to search and AdSense crawlers.
  const contentUrls = entries.length - STATIC_PAGES.length;
  if (contentUrls === 0 && process.env.ALLOW_EMPTY_CONTENT !== '1') {
    throw new Error(
      'No blog posts or tutorials resolved — refusing to emit a static-only sitemap.\n' +
      '  A sitemap listing only marketing pages tells search engines and the AdSense\n' +
      '  crawler that this site has no content, which is what caused the original\n' +
      '  low-value-content rejection.\n' +
      '  Check the status casing (expects PUBLISHED, not published) and the column\n' +
      '  names (created/updated, not created_at/updated_at).\n' +
      '  If the database genuinely has no published content yet, set ALLOW_EMPTY_CONTENT=1.'
    );
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
  // HTTP 402: Supabase has restricted the project (over quota). This is not a broken
  // query, and failing here would block every deploy, including the move off that
  // project. The last committed file in public/ ships instead.
  if (/HTTP 402/.test(err.message)) {
    console.warn('Sitemap generation skipped, project restricted (HTTP 402). Keeping the committed file.');
    process.exit(0);
  }
  console.error('Sitemap generation failed:', err.message);
  // Fail the build. Shipping a sitemap that omits every article is worse than not
  // shipping at all: it tells Google the site has 14 marketing pages and no content.
  process.exit(1);
});
