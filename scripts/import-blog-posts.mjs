/**
 * Bulk Blog Post Importer
 *
 * Reads all .md files from seed-data/blog-posts/, parses YAML frontmatter
 * for metadata, converts markdown body to clean semantic HTML, and inserts
 * directly into Supabase via the REST API.
 *
 * Usage:
 *   node scripts/import-blog-posts.mjs
 *
 * Prerequisites:
 *   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars must be set.
 *   Or create a .env file in the project root with these values.
 *
 * Idempotent: skips posts whose slug already exists in blog_posts.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, '..', 'seed-data', 'blog-posts');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.');
  console.error('Run: set VITE_SUPABASE_URL=your-url && set VITE_SUPABASE_ANON_KEY=your-key && node scripts/import-blog-posts.mjs');
  process.exit(1);
}

const HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

// ---------------------------------------------------------------------------
// YAML frontmatter parser (zero-dependency, handles simple string values)
// ---------------------------------------------------------------------------
function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const yamlBlock = match[1];
  const body = match[2];
  const meta = {};

  for (const line of yamlBlock.split('\n')) {
    const kv = line.match(/^(\w+):\s*["']?(.+?)["']?\s*$/);
    if (kv) meta[kv[1]] = kv[2];
  }

  return { meta, body };
}

// ---------------------------------------------------------------------------
// Markdown → HTML converter (zero-dependency)
// Handles: h1-h3, bold, italic, code, links, images, ul, ol, hr, paragraphs
// ---------------------------------------------------------------------------
function mdToHtml(md) {
  // Normalize CRLF → LF for consistent processing on Windows
  const lines = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const out = [];
  let i = 0;

  function peek() { return i < lines.length ? lines[i] : ''; }
  function next() { return lines[i++]; }

  function isHeading(l) { return /^#{1,3}\s/.test(l); }
  function isHr(l) { return /^---\s*$/.test(l) || /^\*\s*\*\s*\*\s*$/.test(l) || /^___\s*$/.test(l); }
  function isBullet(l) { return /^-\s/.test(l); }
  function isOrdered(l) { return /^\d+\.\s/.test(l); }
  function isEmpty(l) { return /^\s*$/.test(l); }
  function isBlockquote(l) { return /^>\s?/.test(l); }

  function inline(text) {
    return text
      // Images (before links — they share the [!...] prefix)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function consumeParagraph() {
    const paraLines = [];
    // Gather contiguous non-empty lines that are not special blocks
    while (i < lines.length) {
      const l = lines[i];
      if (isEmpty(l) || isHeading(l) || isHr(l) || isBullet(l) || isOrdered(l) || isBlockquote(l)) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length > 0) {
      out.push(`<p>${inline(paraLines.join('\n'))}</p>`);
    }
  }

  function consumeList(bulletTest, tag) {
    const items = [];
    while (i < lines.length && bulletTest.test(lines[i])) {
      const itemText = lines[i].replace(bulletTest, '');
      items.push(`<li>${inline(itemText)}</li>`);
      i++;
    }
    if (items.length > 0) {
      out.push(`<${tag}>`);
      items.forEach(item => out.push(`  ${item}`));
      out.push(`</${tag}>`);
    }
  }

  function consumeBlockquote() {
    const quoteLines = [];
    while (i < lines.length && isBlockquote(lines[i])) {
      quoteLines.push(lines[i].replace(/^>\s?/, ''));
      i++;
    }
    if (quoteLines.length > 0) {
      out.push(`<blockquote><p>${inline(quoteLines.join('\n'))}</p></blockquote>`);
    }
  }

  while (i < lines.length) {
    const l = lines[i];

    if (isEmpty(l)) {
      i++;
      continue;
    }

    if (isHeading(l)) {
      const m = l.match(/^(#{1,3})\s+(.+)/);
      const level = m[1].length;
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
      i++;
    } else if (isHr(l)) {
      out.push('<hr>');
      i++;
    } else if (isBullet(l)) {
      consumeList(/^-\s/, 'ul');
    } else if (isOrdered(l)) {
      consumeList(/^\d+\.\s/, 'ol');
    } else if (isBlockquote(l)) {
      consumeBlockquote();
    } else {
      consumeParagraph();
    }
  }

  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Word count → reading time
// ---------------------------------------------------------------------------
function getReadingMinutes(html) {
  const text = html.replace(/<[^>]+>/g, '');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ---------------------------------------------------------------------------
// Check existing slugs (idempotent)
// ---------------------------------------------------------------------------
async function getExistingSlugs() {
  const slugs = new Set();
  let offset = 0;
  const limit = 1000;
  while (true) {
    const params = new URLSearchParams({
      select: 'slug',
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?${params}`, {
      headers: { ...HEADERS, Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`  Warning: could not fetch existing slugs (${res.status})`);
      break;
    }
    const records = await res.json();
    if (!records.length) break;
    records.forEach(r => slugs.add(r.slug));
    if (records.length < limit) break;
    offset += limit;
  }
  return slugs;
}

// ---------------------------------------------------------------------------
// Insert a single post
// ---------------------------------------------------------------------------
async function insertPost(post) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(post),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const files = readdirSync(SEED_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} markdown files in seed-data/blog-posts/\n`);

  const existingSlugs = await getExistingSlugs();
  console.log(`Existing posts in database: ${existingSlugs.size}\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = resolve(SEED_DIR, file);
    const raw = readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const { meta, body } = parseFrontmatter(raw);

    const slug = meta.slug || '';
    if (!slug) {
      console.log(`  SKIP: ${file} — no slug in frontmatter`);
      skipped++;
      continue;
    }

    if (existingSlugs.has(slug)) {
      console.log(`  SKIP: "${meta.title || slug}" — already exists`);
      skipped++;
      continue;
    }

    const htmlContent = mdToHtml(body.trim());
    const readingTime = getReadingMinutes(htmlContent);

    const post = {
      title: meta.title || '',
      slug,
      excerpt: meta.excerpt || '',
      content: htmlContent,
      author_name: meta.authorName || 'OpenHR Team',
      status: 'PUBLISHED',
      published_at: meta.publishedAt || new Date().toISOString(),
      reading_time: readingTime,
    };

    try {
      await insertPost(post);
      console.log(`  OK:   "${post.title}" (${readingTime} min read)`);
      imported++;
    } catch (err) {
      console.log(`  FAIL: "${post.title}" — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n---`);
  console.log(`Done. Imported: ${imported} | Skipped: ${skipped} | Failed: ${failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
