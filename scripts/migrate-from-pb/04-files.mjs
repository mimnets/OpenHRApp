/**
 * Phase 7 — Step 4: Migrate files from local PocketBase backup to Supabase Storage
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/migrate-from-pb/04-files.mjs
 *
 * Reads directly from the local SQLite backup's storage/ directory.
 * Skips files already uploaded (idempotent).
 *
 * Bucket mapping:
 *   pbc_2248329634  → content-images   (blog post / tutorial images)
 *   pbc_2336106144  → org-logos        (organisation logos)
 *   pbc_2471705857  → selfies          (attendance selfies)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const BACKUP_DIR = join(__dirname, '@auto_pb_backup_open_hr_app_20260513000000/storage');

const BUCKET_MAP = {
  pbc_2248329634: 'content-images',
  pbc_2336106144: 'org-logos',
  pbc_2471705857: 'selfies',
};

const MIME = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
};

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function walkFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkFiles(full));
    } else if (!entry.endsWith('.attrs')) {
      results.push(full);
    }
  }
  return results;
}

async function migrateBucket(pbcFolder, bucket) {
  const srcDir = join(BACKUP_DIR, pbcFolder);
  if (!existsSync(srcDir)) {
    console.log(`  skip ${pbcFolder} (not found)`);
    return;
  }

  const files = walkFiles(srcDir);
  console.log(`\n[${bucket}] ${files.length} files…`);

  let uploaded = 0, skipped = 0, failed = 0;

  for (const filePath of files) {
    // Storage path = <record_id>/<filename> (strip the pbc_xxx/ prefix)
    const relativePath = filePath.slice(srcDir.length + 1);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    const fileData = readFileSync(filePath);
    const { error } = await supabase.storage
      .from(bucket)
      .upload(relativePath, fileData, { contentType, upsert: false });

    if (error) {
      if (error.message?.includes('already exists') || error.statusCode === '409') {
        skipped++;
      } else {
        console.error(`  ERROR ${relativePath}: ${error.message}`);
        failed++;
      }
    } else {
      uploaded++;
      if (uploaded % 50 === 0) console.log(`  … ${uploaded} uploaded`);
    }
  }

  console.log(`  ✓ uploaded: ${uploaded}, skipped: ${skipped}, failed: ${failed}`);
}

(async () => {
  console.log('OpenHR — File migration (local backup → Supabase Storage)');
  console.log(`Backup: ${BACKUP_DIR}\n`);

  for (const [pbc, bucket] of Object.entries(BUCKET_MAP)) {
    await migrateBucket(pbc, bucket);
  }

  console.log('\nFile migration complete.');
})().catch(e => { console.error(e); process.exit(1); });
