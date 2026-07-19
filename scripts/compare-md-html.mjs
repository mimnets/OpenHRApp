/**
 * Compare MD→HTML conversion output vs existing .html files.
 * Checks if both produce the same semantic HTML structure for SEO, AI, and humans.
 * Run: node scripts/compare-md-html.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, '..', 'seed-data', 'blog-posts');

// --- Same converter used in RichTextEditor.tsx ---

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

function mdToHtml(md) {
  const normalized = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const out = [];
  let i = 0;

  const isEmpty = (l) => /^\s*$/.test(l);
  const isHeading = (l) => /^#{1,3}\s/.test(l);
  const isHr = (l) => /^---\s*$/.test(l) || /^\*\s*\*\s*\*\s*$/.test(l) || /^___\s*$/.test(l);
  const isBullet = (l) => /^-\s/.test(l);
  const isOrdered = (l) => /^\d+\.\s/.test(l);
  const isBlockquote = (l) => /^>\s?/.test(l);

  const inline = (text) => text
    .replace(/!\[([^\]]*)\]\(([^)\s]+(?:\s+"[^"]*")?\))/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');

  const consumeParagraph = () => {
    const paraLines = [];
    while (i < lines.length) {
      const l = lines[i];
      if (isEmpty(l) || isHeading(l) || isHr(l) || isBullet(l) || isOrdered(l) || isBlockquote(l)) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length > 0) out.push('<p>' + inline(paraLines.join(' ')) + '</p>');
  };

  const consumeList = (bulletTest, tag) => {
    const items = [];
    while (i < lines.length && bulletTest.test(lines[i])) {
      items.push('<li>' + inline(lines[i].replace(bulletTest, '')) + '</li>');
      i++;
    }
    if (items.length > 0) {
      out.push('<' + tag + '>');
      items.forEach(item => out.push('  ' + item));
      out.push('</' + tag + '>');
    }
  };

  const consumeBlockquote = () => {
    const quoteLines = [];
    while (i < lines.length && isBlockquote(lines[i])) {
      quoteLines.push(lines[i].replace(/^>\s?/, ''));
      i++;
    }
    if (quoteLines.length > 0) out.push('<blockquote><p>' + inline(quoteLines.join(' ')) + '</p></blockquote>');
  };

  // Strip YAML frontmatter + duplicate H1 title
  let startIdx = 0;
  if (normalized.startsWith('---')) {
    const endFront = normalized.indexOf('\n---\n', 4);
    if (endFront !== -1) {
      startIdx = endFront + 5;
      const skipped = normalized.substring(0, startIdx).split('\n').length - 1;
      i = skipped;
      if (i < lines.length && /^#\s/.test(lines[i])) i++;
      if (i < lines.length && isEmpty(lines[i])) i++;
    }
  }

  while (i < lines.length) {
    const l = lines[i];
    if (isEmpty(l)) { i++; continue; }
    if (isHeading(l)) {
      const m = l.match(/^(#{1,3})\s+(.+)/);
      if (m) out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>');
      i++;
    } else if (isHr(l)) { out.push('<hr>'); i++; }
    else if (isBullet(l)) { consumeList(/^-\s/, 'ul'); }
    else if (isOrdered(l)) { consumeList(/^\d+\.\s/, 'ol'); }
    else if (isBlockquote(l)) { consumeBlockquote(); }
    else { consumeParagraph(); }
  }
  return out.join('\n');
}

// --- Count semantic HTML elements ---
function countElements(html) {
  const counts = {};
  // Match all opening and closing tags
  const allTags = html.match(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi) || [];
  allTags.forEach(t => {
    // Extract tag name: strip <, >, /
    const name = t.replace(/^<\/?/, '').replace(/\s*\/?\s*>$/, '').split(/\s/)[0].toLowerCase();
    if (name) counts[name] = (counts[name] || 0) + 1;
  });
  return counts;
}

// --- Normalize for structural comparison ---
function getStructure(html) {
  const tags = html.match(/<\/?(h[1-3]|p|ul|ol|li|blockquote|hr|img|strong|em|code|a|br)\b[^>]*>/gi) || [];
  return tags.map(t => {
    const cleaned = t.replace(/\s+\/>$/, '>').replace(/\s+>/g, '>');
    const match = cleaned.match(/^<\/?([a-z0-9]+)/i);
    return match ? (cleaned.startsWith('</') ? '/' + match[1] : match[1]) : '?';
  }).join(' ');
}

// --- Main ---
const mdFiles = readdirSync(SEED_DIR).filter(f => f.endsWith('.md'));
console.log('Comparing MD-to-HTML conversion vs existing .html files');
console.log('Checking: heading hierarchy, semantic tags, SEO structure\n');
console.log('='.repeat(80));

let totalDiffs = 0;
let perfectMatches = 0;
let structuralIssues = 0;

for (const mdfile of mdFiles) {
  const base = mdfile.replace(/\.md$/, '');
  const htmlFile = base + '.html';

  const mdRaw = readFileSync(resolve(SEED_DIR, mdfile), 'utf-8');
  const { meta, body } = parseFrontmatter(mdRaw);
  const mdConverted = mdToHtml(body.trim());

  let htmlExisting = '';
  try {
    htmlExisting = readFileSync(resolve(SEED_DIR, htmlFile), 'utf-8');
  } catch (e) {
    console.log('\n' + base + ': HTML file MISSING!');
    continue;
  }

  const mdCounts = countElements(mdConverted);
  const htmlCounts = countElements(htmlExisting);

  const allTags = new Set([...Object.keys(mdCounts), ...Object.keys(htmlCounts)]);
  const diffs = [];
  for (const tag of [...allTags].sort()) {
    const mdC = mdCounts[tag] || 0;
    const htmlC = htmlCounts[tag] || 0;
    if (mdC !== htmlC) {
      diffs.push(tag + ': MD=' + mdC + ' HTML=' + htmlC + ' (' + (mdC > htmlC ? '+' + (mdC - htmlC) : '-' + (htmlC - mdC)) + ')');
    }
  }

  if (diffs.length === 0) {
    perfectMatches++;
    console.log('\n[PASS] ' + base);
    console.log('  All ' + Object.keys(mdCounts).length + ' semantic element types have identical counts.');
  } else {
    console.log('\n[DIFF] ' + base + ' — ' + diffs.length + ' tag count differences:');
    diffs.forEach(d => console.log('  ' + d));
    totalDiffs += diffs.length;

    // Show structural comparison
    const mdStruct = getStructure(mdConverted);
    const htmlStruct = getStructure(htmlExisting);
    if (mdStruct !== htmlStruct) {
      structuralIssues++;
      console.log('  WARNING: Tag sequence differs (structural mismatch)');
      // Show first difference
      const mdTags = mdStruct.split(' ');
      const htmlTags = htmlStruct.split(' ');
      for (let k = 0; k < Math.max(mdTags.length, htmlTags.length); k++) {
        if (mdTags[k] !== htmlTags[k]) {
          console.log('  First diff at position ' + k + ': MD="' + mdTags[k] + '" vs HTML="' + htmlTags[k] + '"');
          break;
        }
      }
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY:');
console.log('  Total files compared: ' + mdFiles.length);
console.log('  Perfect matches:      ' + perfectMatches);
console.log('  Files with diffs:     ' + (mdFiles.length - perfectMatches));
console.log('  Total tag diffs:      ' + totalDiffs);
console.log('  Structural mismatches: ' + structuralIssues);

if (totalDiffs === 0 && structuralIssues === 0) {
  console.log('\n  VERDICT: MD-to-HTML conversion produces IDENTICAL semantic structure.');
  console.log('  Both formats are equivalent for SEO, AI crawlers, and human readers.');
} else {
  console.log('\n  VERDICT: Some differences exist between the two formats.');
}
