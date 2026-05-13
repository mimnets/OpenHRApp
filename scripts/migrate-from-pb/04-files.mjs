/**
 * Phase 7 — Step 4 (optional): Migrate PocketBase file attachments to Supabase Storage
 *
 * Usage:
 *   PB_URL=https://your-pb-host.com \
 *   PB_EMAIL=admin@example.com PB_PASSWORD=secret \
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/migrate-from-pb/04-files.mjs
 *
 * Downloads files from PocketBase and uploads to the correct Supabase Storage bucket.
 * Skips files that already exist in Supabase (based on path).
 *
 * Bucket → collection mapping:
 *   avatars            ← users.avatar      → path: {userId}/{filename}
 *   selfies            ← attendance.selfie → path: {recordId}/selfie.webp
 *   org-logos          ← organizations.logo
 *   content-images     ← blog_posts.cover_image, tutorials.cover_image
 *   donation-screenshots ← upgrade_requests.donation_screenshot
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname   = dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = join(__dirname, '../../exports');
const ID_MAP_FILE = join(EXPORTS_DIR, 'id-map.json');

const PB_URL      = process.env.PB_URL?.replace(/\/$/, '');
const PB_EMAIL    = process.env.PB_EMAIL;
const PB_PASS     = process.env.PB_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PB_URL || !PB_EMAIL || !PB_PASS || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env: PB_URL, PB_EMAIL, PB_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const idMap = existsSync(ID_MAP_FILE)
  ? JSON.parse(readFileSync(ID_MAP_FILE, 'utf8'))
  : {};

function mapId(pbId) {
  return pbId ? (idMap[pbId] ?? pbId) : null;
}

function load(collection) {
  const f = join(EXPORTS_DIR, `${collection}.json`);
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf8'));
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function pbLogin() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS }),
  });
  if (!res.ok) throw new Error(`PB login failed: ${res.status}`);
  const { token } = await res.json();
  return token;
}

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadFile(pbToken, bucket, storagePath, pbFileUrl) {
  // Check if already exists
  const { data: existing } = await supabase.storage.from(bucket).list(
    storagePath.includes('/') ? storagePath.substring(0, storagePath.lastIndexOf('/')) : '',
    { search: storagePath.split('/').pop() }
  );
  if (existing && existing.length > 0) return 'skipped';

  const res = await fetch(pbFileUrl, { headers: { Authorization: pbToken } });
  if (!res.ok) return `fetch-failed:${res.status}`;

  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const buffer = await res.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });

  if (error && error.message.includes('already exists')) return 'skipped';
  if (error) return `upload-failed:${error.message}`;
  return 'ok';
}

// ── Per-collection file migration ─────────────────────────────────────────────

async function migrateAvatars(pbToken) {
  const records = load('users');
  const withAvatar = records.filter(r => r.avatar);
  console.log(`\n[1] avatars: ${withAvatar.length} files`);
  let ok = 0, skipped = 0, failed = 0;

  for (const r of withAvatar) {
    const newId = mapId(r.id);
    const storagePath = `${newId}/${r.avatar}`;
    const pbUrl = `${PB_URL}/api/files/users/${r.id}/${r.avatar}`;
    const result = await uploadFile(pbToken, 'avatars', storagePath, pbUrl);
    if (result === 'ok') ok++;
    else if (result === 'skipped') skipped++;
    else { failed++; if (failed <= 5) console.warn(`  WARN: ${r.email} avatar: ${result}`); }
  }
  console.log(`  ✓ ok:${ok} skipped:${skipped} failed:${failed}`);
}

async function migrateSelfies(pbToken) {
  const records = load('attendance');
  const withSelfie = records.filter(r => r.selfie);
  console.log(`\n[2] selfies: ${withSelfie.length} files`);
  let ok = 0, skipped = 0, failed = 0;

  for (const r of withSelfie) {
    const newId = mapId(r.id);
    const storagePath = `${newId}/selfie.webp`;
    const pbUrl = `${PB_URL}/api/files/attendance/${r.id}/${r.selfie}`;
    const result = await uploadFile(pbToken, 'selfies', storagePath, pbUrl);
    if (result === 'ok') ok++;
    else if (result === 'skipped') skipped++;
    else { failed++; if (failed <= 5) console.warn(`  WARN: attendance ${r.id}: ${result}`); }
  }
  console.log(`  ✓ ok:${ok} skipped:${skipped} failed:${failed}`);
}

async function migrateOrgLogos(pbToken) {
  const records = load('organizations');
  const withLogo = records.filter(r => r.logo);
  console.log(`\n[3] org-logos: ${withLogo.length} files`);
  let ok = 0, skipped = 0, failed = 0;

  for (const r of withLogo) {
    const storagePath = `org-logos/${r.logo}`;
    const pbUrl = `${PB_URL}/api/files/organizations/${r.id}/${r.logo}`;
    const result = await uploadFile(pbToken, 'org-logos', storagePath, pbUrl);
    if (result === 'ok') ok++;
    else if (result === 'skipped') skipped++;
    else failed++;
  }
  console.log(`  ✓ ok:${ok} skipped:${skipped} failed:${failed}`);
}

async function migrateBlogCovers(pbToken) {
  const records = load('blog_posts').filter(r => r.cover_image);
  console.log(`\n[4] blog covers: ${records.length} files`);
  let ok = 0, skipped = 0, failed = 0;

  for (const r of records) {
    const storagePath = `blog-covers/${r.cover_image}`;
    const pbUrl = `${PB_URL}/api/files/blog_posts/${r.id}/${r.cover_image}`;
    const result = await uploadFile(pbToken, 'content-images', storagePath, pbUrl);
    if (result === 'ok') ok++;
    else if (result === 'skipped') skipped++;
    else failed++;
  }
  console.log(`  ✓ ok:${ok} skipped:${skipped} failed:${failed}`);
}

async function migrateTutorialCovers(pbToken) {
  const records = load('tutorials').filter(r => r.cover_image);
  console.log(`\n[5] tutorial covers: ${records.length} files`);
  let ok = 0, skipped = 0, failed = 0;

  for (const r of records) {
    const storagePath = `tutorial-covers/${r.cover_image}`;
    const pbUrl = `${PB_URL}/api/files/tutorials/${r.id}/${r.cover_image}`;
    const result = await uploadFile(pbToken, 'content-images', storagePath, pbUrl);
    if (result === 'ok') ok++;
    else if (result === 'skipped') skipped++;
    else failed++;
  }
  console.log(`  ✓ ok:${ok} skipped:${skipped} failed:${failed}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('OpenHR — File Migration (PocketBase → Supabase Storage)');
  const pbToken = await pbLogin();
  console.log('✓ PocketBase login OK');

  await migrateAvatars(pbToken);
  await migrateSelfies(pbToken);
  await migrateOrgLogos(pbToken);
  await migrateBlogCovers(pbToken);
  await migrateTutorialCovers(pbToken);

  console.log('\nFile migration complete.');
  console.log('Run 03-verify.mjs to confirm data integrity.');
})().catch(e => { console.error(e); process.exit(1); });
