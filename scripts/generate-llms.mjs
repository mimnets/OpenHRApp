/**
 * llms.txt Generator — plan items 17-19 (Phase 1D, AEO/GEO surface).
 *
 * Emits two files at the domain root:
 *   public/llms.txt       — an index of every published article, one line each, with a
 *                           short description. This is what an answer engine reads to find
 *                           out what the site covers.
 *   public/llms-full.txt  — the same index followed by the full plain text of every article,
 *                           so an engine can quote the source without executing our SPA.
 *
 * Why this exists: the site is a client-rendered Vite SPA. `middleware.ts` prerenders for
 * known crawler user-agents, but a plain-text corpus at a stable URL is cheaper for an
 * answer engine to consume and does not depend on UA sniffing at all.
 *
 * Usage: node scripts/generate-llms.mjs
 * Runs automatically as part of `npm run build`.
 *
 * NOTE: mirrors the conventions in generate-sitemap.mjs deliberately — same env vars, same
 * uppercase `eq.PUBLISHED` status, same `created`/`updated` column names, same fail-loud
 * behaviour on a PostgREST error. See F1/F2 in the plan for why silence is not an option here.
 */

import { writeFileSync } from 'node:fs';
import { htmlToMarkdown } from './lib/html-to-markdown.mjs';

const SITE_URL = 'https://openhrapp.com';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.');
  process.exit(0); // Match generate-sitemap.mjs: skip, don't fail the build.
}

const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

const SITE_SUMMARY = `OpenHRApp is free, open-source HR management software for small and mid-sized
organizations. It covers attendance tracking with GPS and selfie verification, leave management,
employee records, performance reviews, and reporting. It can be used as a hosted service or
self-hosted with Docker. The guides below are practical HR documentation — policy templates,
workflow design, and step-by-step product walkthroughs.`;

// Same column/status contract as the sitemap generator. Getting either wrong silently yields
// zero rows, which is exactly the failure this whole phase exists to undo.
async function fetchAllRows(table, select) {
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
      headers: { ...SUPABASE_HEADERS, Accept: 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`${table} query failed: HTTP ${res.status} ${body}`);
    }
    const records = await res.json();
    if (!records.length) break;
    items.push(...records);
    if (records.length < limit) break;
    offset += limit;
  }
  return items;
}

/** Collapse an article body to a one-line description for the index. */
function oneLineDescription(row, maxLen = 200) {
  const raw = (row.excerpt || '').trim() || htmlToMarkdown(row.content || '');
  const flat = raw
    .replace(/^#+\s+.*$/gm, '')      // drop headings
    .replace(/[*_`>#[\]()]/g, ' ')   // drop markdown punctuation
    .replace(/\s+/g, ' ')
    .trim();
  if (flat.length <= maxLen) return flat;
  const cut = flat.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function indexSection(heading, urlPrefix, rows) {
  if (!rows.length) return '';
  const lines = rows
    .filter((r) => r.slug)
    .map((r) => {
      const title = (r.title || r.slug).trim();
      const desc = oneLineDescription(r);
      return `- [${title}](${SITE_URL}${urlPrefix}/${r.slug})${desc ? `: ${desc}` : ''}`;
    });
  return `## ${heading}\n\n${lines.join('\n')}\n`;
}

function fullTextSection(heading, urlPrefix, rows) {
  if (!rows.length) return '';
  const blocks = rows
    .filter((r) => r.slug)
    .map((r) => {
      const title = (r.title || r.slug).trim();
      const body = htmlToMarkdown(r.content || '').trim();
      const published = (r.published_at || '').split('T')[0];
      const meta = [
        `URL: ${SITE_URL}${urlPrefix}/${r.slug}`,
        r.category ? `Category: ${r.category}` : null,
        r.author_name ? `Author: ${r.author_name}` : null,
        published ? `Published: ${published}` : null,
      ]
        .filter(Boolean)
        .join('\n');
      return `## ${title}\n\n${meta}\n\n${body}\n`;
    });
  return `# ${heading}\n\n${blocks.join('\n---\n\n')}`;
}

async function main() {
  console.log('Generating llms.txt...');

  const INDEX_SELECT = 'slug,title,excerpt,category,published_at';
  const FULL_SELECT = 'slug,title,excerpt,category,published_at,author_name,content';

  console.log('  Fetching tutorials...');
  const tutorials = await fetchAllRows('tutorials', FULL_SELECT);
  console.log(`  Found ${tutorials.length} tutorial(s)`);

  console.log('  Fetching blog posts...');
  const posts = await fetchAllRows('blog_posts', FULL_SELECT);
  console.log(`  Found ${posts.length} blog post(s)`);

  // Same guard as the sitemap: if both content tables resolve to nothing, something is broken
  // upstream and shipping an empty corpus would hide it.
  if (tutorials.length === 0 && posts.length === 0) {
    throw new Error(
      'Both tutorials and blog_posts returned zero published rows. Refusing to write an empty ' +
        'llms.txt — check the status casing and column names against the schema.'
    );
  }

  const header = `# OpenHRApp\n\n> ${SITE_SUMMARY.replace(/\s*\n\s*/g, ' ').trim()}\n`;

  const index = [
    header,
    indexSection('Guides', '/how-to-use', tutorials),
    indexSection('Blog', '/blog', posts),
    `## Pages\n\n- [Features](${SITE_URL}/features)\n- [Changelog](${SITE_URL}/changelog)\n` +
      `- [About](${SITE_URL}/about)\n- [Contact](${SITE_URL}/contact)\n` +
      `- [Privacy Policy](${SITE_URL}/privacy)\n- [Terms of Service](${SITE_URL}/terms)\n`,
    `## Full text\n\n- [All content as plain text](${SITE_URL}/llms-full.txt)\n`,
  ]
    .filter(Boolean)
    .join('\n');

  const full = [
    header,
    fullTextSection('Guides', '/how-to-use', tutorials),
    fullTextSection('Blog', '/blog', posts),
  ]
    .filter(Boolean)
    .join('\n');

  writeFileSync('public/llms.txt', index, 'utf8');
  writeFileSync('public/llms-full.txt', full, 'utf8');

  const total = tutorials.length + posts.length;
  console.log(`  public/llms.txt      ${index.length.toLocaleString()} chars, ${total} entries`);
  console.log(`  public/llms-full.txt ${full.length.toLocaleString()} chars`);
  console.log('Done.');
}

main().catch((err) => {
  // HTTP 402: Supabase has restricted the project (over quota). This is not a broken
  // query, and failing here would block every deploy, including the move off that
  // project. The last committed file in public/ ships instead.
  if (/HTTP 402/.test(err.message)) {
    console.warn('llms.txt generation skipped, project restricted (HTTP 402). Keeping the committed file.');
    process.exit(0);
  }
  console.error('llms.txt generation failed:', err.message);
  process.exit(1);
});
