/**
 * RSS Feed Generator
 *
 * Fetches published blog posts from PocketBase and writes public/feed.xml
 * (RSS 2.0). Helps feed readers and AI/LLM crawlers that don't render JS.
 *
 * Usage: node scripts/generate-feed.mjs
 * Runs automatically as part of `npm run build`.
 */

const SITE_URL = 'https://openhrapp.com';
const PB_URL = 'https://pocketbase.mimnets.com';
const FEED_TITLE = 'OpenHR Blog';
const FEED_DESCRIPTION =
  'Articles, guides, and updates from OpenHR — the open-source HR management system.';

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
  const d = new Date(input.replace(' ', 'T'));
  if (isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

async function fetchAllPages(endpoint) {
  const items = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${PB_URL}${endpoint}?page=${page}&limit=100`);
    if (!res.ok) {
      console.warn(`  Warning: ${endpoint} returned ${res.status}`);
      break;
    }
    const data = await res.json();
    const records = data.posts || [];
    if (records.length === 0) break;
    items.push(...records);
    if (page >= (data.totalPages || 1)) break;
    page++;
  }
  return items;
}

async function main() {
  console.log('Generating RSS feed...');

  let posts = [];
  try {
    posts = await fetchAllPages('/api/openhr/blog/posts');
    console.log(`  Found ${posts.length} blog post(s)`);
  } catch (e) {
    console.warn('  Warning: Could not fetch blog posts:', e.message);
  }

  posts.sort((a, b) => {
    const ad = new Date((a.published_at || a.created || '').replace(' ', 'T')).getTime();
    const bd = new Date((b.published_at || b.created || '').replace(' ', 'T')).getTime();
    return bd - ad;
  });

  const latest = posts[0];
  const lastBuildDate = toRfc822(latest?.updated || latest?.published_at);

  const items = posts
    .filter((p) => p.slug)
    .map((p) => {
      const link = `${SITE_URL}/blog/${p.slug}`;
      const title = escapeXml(p.title || p.slug);
      const description = escapeXml(p.excerpt || '');
      const author = escapeXml(p.author_name || 'OpenHR Team');
      const pubDate = toRfc822(p.published_at || p.created);
      return [
        '    <item>',
        `      <title>${title}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${description}</description>`,
        `      <dc:creator>${author}</dc:creator>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <link>${SITE_URL}/blog</link>`,
    `    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    '    <language>en-us</language>',
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');

  const fs = await import('fs');
  const path = await import('path');

  const publicPath = path.resolve('public', 'feed.xml');
  fs.writeFileSync(publicPath, xml, 'utf-8');
  console.log(`  Written: ${publicPath} (${posts.length} items)`);

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
