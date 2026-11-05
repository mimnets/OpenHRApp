#!/usr/bin/env node
// ============================================================
// OpenHR — copy every Storage bucket and file from Supabase Pro to the
// self-hosted stack, through both Storage APIs (so the self-hosted
// storage.objects rows and MinIO keys are written the way storage-api expects).
//
// Resumable: a file already on the target with the same size is skipped, so
// run it days before cutover for the bulk, then again at cutover for the delta.
// Run AFTER db-copy.sh (its truncate can cascade into storage.objects).
//
//   SRC_URL=https://<ref>.supabase.co SRC_SERVICE_KEY=... \
//   DST_URL=https://api.example.com  DST_SERVICE_KEY=... \
//   node scripts/migrate-to-selfhost/storage-copy.mjs
// ============================================================
import { createClient } from '@supabase/supabase-js';

const env = (k) => process.env[k] || (console.error(`set ${k}`), process.exit(1));
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const src = createClient(env('SRC_URL'), env('SRC_SERVICE_KEY'), opts);
const dst = createClient(env('DST_URL'), env('DST_SERVICE_KEY'), opts);
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);

// Recursively list every file under a prefix: path -> size.
async function listAll(client, bucket, prefix = '', out = new Map()) {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    for (const e of data) {
      const path = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) await listAll(client, bucket, path, out); // folder
      else if (e.name !== '.emptyFolderPlaceholder') out.set(path, e.metadata?.size ?? -1);
    }
    if (data.length < 1000) return out;
  }
}

async function copyBucket(b) {
  const { error: getErr } = await dst.storage.getBucket(b.id);
  if (getErr) {
    const { error } = await dst.storage.createBucket(b.id, {
      public: b.public,
      fileSizeLimit: b.file_size_limit ?? undefined,
      allowedMimeTypes: b.allowed_mime_types ?? undefined,
    });
    if (error) throw new Error(`create bucket ${b.id}: ${error.message}`);
  }

  const [have, want] = await Promise.all([listAll(dst, b.id), listAll(src, b.id)]);
  const todo = [...want].filter(([p, size]) => have.get(p) !== size).map(([p]) => p);
  console.log(`${b.id}: ${want.size} files, ${todo.length} to copy`);

  let done = 0, failed = 0;
  const worker = async () => {
    for (let p; (p = todo.pop()) !== undefined; ) {
      try {
        const { data, error } = await src.storage.from(b.id).download(p);
        if (error) throw error;
        const { error: upErr } = await dst.storage.from(b.id)
          .upload(p, data, { upsert: true, contentType: data.type || undefined });
        if (upErr) throw upErr;
      } catch (e) {
        failed++;
        console.error(`  FAIL ${b.id}/${p}: ${e.message}`);
      }
      if (++done % 200 === 0) console.log(`  ${b.id}: ${done} done`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return failed;
}

const { data: buckets, error } = await src.storage.listBuckets();
if (error) throw new Error(`listBuckets: ${error.message}`);
let failed = 0;
for (const b of buckets) failed += await copyBucket(b);
console.log(failed ? `Finished with ${failed} failures — re-run to retry them.` : 'All buckets copied.');
process.exit(failed ? 2 : 0);
