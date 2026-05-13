/**
 * Phase 7 — Step 1: Export PocketBase data to JSON files
 *
 * Usage:
 *   PB_URL=https://your-pb-host.com PB_EMAIL=admin@example.com PB_PASSWORD=secret \
 *   node scripts/migrate-from-pb/01-export.mjs
 *
 * Output: exports/ directory with one JSON file per collection.
 * Existing export files are skipped (delete to re-export).
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = join(__dirname, '../../exports');

const PB_URL   = process.env.PB_URL?.replace(/\/$/, '');
const PB_EMAIL = process.env.PB_EMAIL;
const PB_PASS  = process.env.PB_PASSWORD;

if (!PB_URL || !PB_EMAIL || !PB_PASS) {
  console.error('Missing env: PB_URL, PB_EMAIL, PB_PASSWORD');
  process.exit(1);
}

mkdirSync(EXPORTS_DIR, { recursive: true });

// ── Auth ────────────────────────────────────────────────────────────────────

async function pbLogin() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS }),
  });
  if (!res.ok) throw new Error(`PB login failed: ${res.status} ${await res.text()}`);
  const { token } = await res.json();
  console.log('✓ PocketBase admin login OK');
  return token;
}

// ── Paginated export ─────────────────────────────────────────────────────────

async function exportCollection(token, collection) {
  const outFile = join(EXPORTS_DIR, `${collection}.json`);
  if (existsSync(outFile)) {
    console.log(`  skip ${collection} (already exported)`);
    return;
  }

  let page = 1;
  const perPage = 200;
  const allItems = [];

  while (true) {
    const url = `${PB_URL}/api/collections/${collection}/records?page=${page}&perPage=${perPage}&sort=created`;
    const res = await fetch(url, { headers: { Authorization: token } });
    if (!res.ok) {
      console.warn(`  WARN: ${collection} page ${page} → ${res.status} (skipped)`);
      break;
    }
    const body = await res.json();
    allItems.push(...(body.items || []));
    if (allItems.length >= body.totalItems) break;
    page++;
  }

  writeFileSync(outFile, JSON.stringify(allItems, null, 2));
  console.log(`  ✓ ${collection}: ${allItems.length} records → exports/${collection}.json`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const COLLECTIONS = [
  'organizations',
  'users',
  'teams',
  'shifts',
  'settings',
  'attendance',
  'leaves',
  'announcements',
  'notifications',
  'review_cycles',
  'performance_reviews',
  'upgrade_requests',
  'blog_posts',
  'tutorials',
  'reports_queue',
];

(async () => {
  const token = await pbLogin();
  console.log('\nExporting collections…');
  for (const col of COLLECTIONS) {
    await exportCollection(token, col);
  }
  console.log('\nDone. Run 02-import.mjs next.');
})().catch(e => { console.error(e); process.exit(1); });
