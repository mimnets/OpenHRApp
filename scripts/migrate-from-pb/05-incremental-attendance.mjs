/**
 * Phase 7 — Step 5: Incremental attendance sync (PB backup → Supabase)
 *
 * Run this on go-live day to catch attendance records created AFTER the
 * main migration (i.e. May 13 onwards).
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   PB_BACKUP_PATH=scripts/migrate-from-pb/@auto_pb_backup_open_hr_app_20260513000000 \
 *   SINCE=2026-05-13 \
 *   node scripts/migrate-from-pb/05-incremental-attendance.mjs
 *
 * On go-live day: point PB_BACKUP_PATH at the LATEST backup, set SINCE to
 * the date of the last migration run (2026-05-13).
 *
 * Idempotent — safe to run multiple times.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SINCE        = process.env.SINCE || '2026-05-13';
const BACKUP_PATH  = process.env.PB_BACKUP_PATH
  || join(__dirname, '@auto_pb_backup_open_hr_app_20260513000000');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const DB_PATH = join(BACKUP_PATH, 'data.db');
if (!existsSync(DB_PATH)) {
  console.error(`SQLite backup not found: ${DB_PATH}`);
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const sqlite = new Database(DB_PATH, { readonly: true });

// Load existing id-map so PB user IDs resolve to Supabase UUIDs
const ID_MAP_PATH = join(__dirname, '../../exports/id-map.json');
const idMap = existsSync(ID_MAP_PATH) ? JSON.parse(readFileSync(ID_MAP_PATH, 'utf8')) : {};

function mapId(pbId) { return pbId ? (idMap[pbId] ?? null) : null; }

function ts(str) {
  if (!str || !str.trim()) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d.toISOString();
}

function toTimestamptz(timeStr, date) {
  if (!timeStr || !timeStr.trim() || timeStr === '-') return null;
  if (timeStr.includes('T') || timeStr.length > 10) return ts(timeStr);
  if (!date) return null;
  const d = new Date(`${date}T${timeStr}`);
  return isNaN(d) ? null : d.toISOString();
}

(async () => {
  console.log(`Incremental attendance sync — records since ${SINCE}`);
  console.log(`Backup: ${DB_PATH}\n`);

  // Load user→org map from SQLite for org recovery
  const pbUsers = sqlite.prepare('SELECT id, organization_id FROM users').all();
  const userOrgMap = Object.fromEntries(pbUsers.map(u => [u.id, u.organization_id]));

  const records = sqlite
    .prepare(`SELECT * FROM attendance WHERE date >= ? ORDER BY date`)
    .all(SINCE);

  console.log(`Found ${records.length} attendance records since ${SINCE}`);

  if (records.length === 0) {
    console.log('Nothing to migrate.');
    process.exit(0);
  }

  const rows = records.map(r => {
    const rawOrgId = r.organization_id || userOrgMap[r.employee_id] || null;
    return {
      // Use PB record ID as stable key — store in a metadata col or just upsert by (employee_id, date)
      organization_id: mapId(rawOrgId) ?? null,
      employee_id:     mapId(r.employee_id) ?? r.employee_id,
      employee_name:   r.employee_name || null,
      date:            r.date,
      check_in:        toTimestamptz(r.check_in, r.date),
      check_out:       toTimestamptz(r.check_out, r.date),
      status:          r.status || 'PRESENT',
      location:        r.location || null,
      latitude:        r.latitude || null,
      longitude:       r.longitude || null,
      selfie:          r.selfie ? `${r.id}/${r.selfie}` : null,
      remarks:         r.remarks || null,
      reconcile:       r.reconcile ?? false,
      created:         ts(r.created),
      updated:         ts(r.updated),
    };
  }).filter(r => r.organization_id); // skip rows with unresolvable org

  console.log(`Upserting ${rows.length} rows (conflict: employee_id + date)…`);

  const BATCH = 50;
  let inserted = 0, failed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await db
      .from('attendance')
      .upsert(batch, { onConflict: 'organization_id,employee_id,date', ignoreDuplicates: false });
    if (error) {
      console.error(`  ERROR batch ${i}: ${error.message}`);
      failed += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  sqlite.close();
  console.log(`\nDone. inserted/updated: ${inserted}, failed: ${failed}`);
})().catch(e => { console.error(e); process.exit(1); });
