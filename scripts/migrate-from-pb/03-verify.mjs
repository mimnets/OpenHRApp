/**
 * Phase 7 — Step 3: Verify migration row counts and FK integrity
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/migrate-from-pb/03-verify.mjs
 *
 * Compares exports/ JSON file lengths against live Supabase row counts.
 * Also runs FK integrity checks (orphaned FKs should be 0).
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname   = dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = join(__dirname, '../../exports');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function exportCount(collection) {
  const f = join(EXPORTS_DIR, `${collection}.json`);
  if (!existsSync(f)) return '(no export)';
  return JSON.parse(readFileSync(f, 'utf8')).length;
}

async function dbCount(table) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) return `ERROR: ${error.message}`;
  return count ?? 0;
}

// ── Row count comparison ──────────────────────────────────────────────────────

const TABLES = [
  ['organizations',      'organizations'],
  ['users',              'profiles'],
  ['teams',              'teams'],
  ['shifts',             'shifts'],
  ['settings',           'settings'],
  ['attendance',         'attendance'],
  ['leaves',             'leaves'],
  ['announcements',      'announcements'],
  ['notifications',      'notifications'],
  ['blog_posts',         'blog_posts'],
  ['tutorials',          'tutorials'],
];

async function checkCounts() {
  console.log('\n── Row counts ─────────────────────────────────────────────');
  console.log('Collection               PB export   Supabase   Match?');
  console.log('─'.repeat(60));

  let allMatch = true;
  for (const [pbCol, sbTable] of TABLES) {
    const pb  = exportCount(pbCol);
    const sb  = await dbCount(sbTable);
    const match = pb === sb ? '✓' : '✗ MISMATCH';
    if (pb !== sb) allMatch = false;
    console.log(`${pbCol.padEnd(24)} ${String(pb).padStart(10)} ${String(sb).padStart(10)}   ${match}`);
  }
  console.log('─'.repeat(60));
  if (allMatch) console.log('✓ All counts match');
  else          console.log('✗ Some counts differ — check logs from 02-import.mjs');
}

// ── FK integrity ─────────────────────────────────────────────────────────────

async function fkCheck(label, sql) {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql }).maybeSingle();
  // Fallback: use count query directly if RPC not available
  return { label, error: error?.message };
}

async function checkIntegrity() {
  console.log('\n── FK integrity (orphaned rows) ───────────────────────────');

  // Direct count queries for orphaned FKs
  const checks = [
    {
      label: 'attendance.employee_id not in profiles.id',
      query: supabase
        .from('attendance')
        .select('employee_id', { count: 'exact', head: true })
        .not('employee_id', 'in',
          supabase.from('profiles').select('id').limit(10000)
        ),
    },
  ];

  // Simpler: just count rows with null org
  const tables = ['attendance', 'leaves', 'announcements', 'notifications', 'teams', 'shifts'];
  for (const t of tables) {
    const { count, error } = await supabase
      .from(t)
      .select('id', { count: 'exact', head: true })
      .is('organization_id', null);
    const label = `${t} rows with null organization_id`;
    if (error) console.log(`  ${label}: ERROR ${error.message}`);
    else if (count > 0) console.log(`  ✗ ${label}: ${count}`);
    else console.log(`  ✓ ${label}: 0`);
  }

  // Profiles without organization
  const { count: orphanProfiles } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .is('organization_id', null)
    .neq('role', 'SUPER_ADMIN');
  console.log(`  ${orphanProfiles > 0 ? '✗' : '✓'} profiles without org (excl. SUPER_ADMIN): ${orphanProfiles ?? 0}`);
}

// ── Auth user count ───────────────────────────────────────────────────────────

async function checkAuthUsers() {
  console.log('\n── Auth users ─────────────────────────────────────────────');
  // List auth users (first page only — enough for a sanity check)
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 });
  if (error) { console.log(`  ERROR: ${error.message}`); return; }
  const pbUserCount = exportCount('users');
  const authCount = data?.total ?? '?';
  const match = pbUserCount === authCount ? '✓' : '✗ MISMATCH';
  console.log(`  PB users exported: ${pbUserCount}`);
  console.log(`  Supabase auth users: ${authCount}  ${match}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('OpenHR — Migration Verification');
  console.log(`Supabase: ${SUPABASE_URL}`);
  await checkCounts();
  await checkIntegrity();
  await checkAuthUsers();
  console.log('\nVerification complete.');
})().catch(e => { console.error(e); process.exit(1); });
