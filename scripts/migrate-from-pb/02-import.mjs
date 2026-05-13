/**
 * Phase 7 — Step 2: Import exported PocketBase data into Supabase
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   TEMP_PASSWORD=ChangeMe123! \
 *   node scripts/migrate-from-pb/02-import.mjs
 *
 * Prerequisites:
 *   - Run 01-export.mjs first (exports/ directory must exist)
 *   - TEMP_PASSWORD is set on every migrated auth user.
 *     Users must reset their password after migration.
 *
 * Idempotent: each step checks existing rows and skips duplicates.
 * ID mapping is saved to exports/id-map.json so the script can be resumed.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname   = dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = join(__dirname, '../../exports');
const ID_MAP_FILE = join(EXPORTS_DIR, 'id-map.json');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEMP_PASSWORD = process.env.TEMP_PASSWORD || 'ChangeMe123!';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── ID map (PB 15-char ID → Supabase UUID) ──────────────────────────────────

const idMap = existsSync(ID_MAP_FILE)
  ? JSON.parse(readFileSync(ID_MAP_FILE, 'utf8'))
  : {};

function saveIdMap() {
  writeFileSync(ID_MAP_FILE, JSON.stringify(idMap, null, 2));
}

function mapId(pbId) {
  return pbId ? (idMap[pbId] ?? pbId) : null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function load(collection) {
  const f = join(EXPORTS_DIR, `${collection}.json`);
  if (!existsSync(f)) { console.warn(`  WARN: ${f} not found, skipping`); return []; }
  return JSON.parse(readFileSync(f, 'utf8'));
}

function ts(pbDateStr) {
  // PB timestamps: "2024-01-15 09:30:00.000Z" or ISO — normalise to ISO.
  if (!pbDateStr) return null;
  return new Date(pbDateStr).toISOString();
}

async function upsertBatch(table, rows, conflictCol = 'id') {
  const BATCH = 50;
  let inserted = 0, skipped = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictCol, ignoreDuplicates: true });
    if (error) console.error(`  ERROR ${table} batch ${i}: ${error.message}`);
    else inserted += batch.length;
  }
  return { inserted, skipped };
}

// ── Step 1: Organizations ────────────────────────────────────────────────────

async function migrateOrgs() {
  console.log('\n[1/9] organizations…');
  const records = load('organizations');

  const rows = records.map(r => {
    const newId = idMap[r.id] ?? (idMap[r.id] = crypto.randomUUID());
    return {
      id: newId,
      name: r.name,
      address: r.address || null,
      country: r.country || 'BD',
      logo: r.logo ? `org-logos/${r.logo}` : null, // file migration handled in 03-files.mjs
      subscription_status: r.subscription_status || 'TRIAL',
      trial_end_date: ts(r.trial_end_date),
      ad_consent: r.ad_consent ?? false,
      created: ts(r.created),
      updated: ts(r.updated),
    };
  });

  saveIdMap();
  const { inserted } = await upsertBatch('organizations', rows);
  console.log(`  ✓ ${inserted} rows`);
}

// ── Step 2: Auth users + Profiles ───────────────────────────────────────────

async function migrateUsers() {
  console.log('\n[2/9] users → auth.users + profiles…');
  const records = load('users');

  // Fetch existing auth emails to skip already-migrated users
  const { data: existingProfiles } = await supabase.from('profiles').select('id, email');
  const existingEmails = new Set((existingProfiles || []).map(p => p.email?.toLowerCase()));

  let created = 0, skipped = 0, failed = 0;

  for (const r of records) {
    if (!r.email) { skipped++; continue; }
    const email = r.email.toLowerCase().trim();

    if (existingEmails.has(email)) {
      // Already migrated — ensure idMap has entry
      const existing = (existingProfiles || []).find(p => p.email?.toLowerCase() === email);
      if (existing) idMap[r.id] = existing.id;
      skipped++;
      continue;
    }

    // Create auth user via admin API
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { name: r.name || '' },
    });

    if (authErr || !authData.user) {
      console.error(`  ERROR creating auth user ${email}: ${authErr?.message}`);
      failed++;
      continue;
    }

    const newId = authData.user.id;
    idMap[r.id] = newId;

    // Insert profile
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: newId,
      organization_id: mapId(r.organization_id),
      name: r.name || '',
      email,
      role: r.role || 'EMPLOYEE',
      employee_id: r.employee_id || null,
      designation: r.designation || null,
      department: r.department || null,
      avatar: r.avatar ? `${r.id}/${r.avatar}` : null, // file migration in 03-files.mjs
      verified: r.verified ?? false,
      employment_type: r.employment_type || null,
      work_type: r.work_type || null,
      salary: r.salary || null,
      mobile: r.mobile || null,
      emergency_contact: r.emergency_contact || null,
      location: r.location || null,
      created: ts(r.created),
      updated: ts(r.updated),
    });

    if (profileErr) console.error(`  ERROR profile ${email}: ${profileErr.message}`);
    else created++;

    // Throttle to avoid rate limiting
    if (created % 10 === 0) await new Promise(res => setTimeout(res, 200));
  }

  saveIdMap();

  // Second pass: update line_manager_id and team_id now that all IDs are mapped
  console.log('  Updating line_manager_id / team_id…');
  for (const r of records) {
    const newId = idMap[r.id];
    if (!newId) continue;
    const update = {};
    if (r.line_manager_id) update.line_manager_id = mapId(r.line_manager_id);
    if (r.team_id)         update.team_id = mapId(r.team_id);
    if (r.shift_id)        update.shift_id = mapId(r.shift_id);
    if (Object.keys(update).length > 0) {
      await supabase.from('profiles').update(update).eq('id', newId);
    }
  }

  console.log(`  ✓ created: ${created}, skipped: ${skipped}, failed: ${failed}`);
}

// ── Step 3: Teams ────────────────────────────────────────────────────────────

async function migrateTeams() {
  console.log('\n[3/9] teams…');
  const records = load('teams');
  const rows = records.map(r => {
    const newId = idMap[r.id] ?? (idMap[r.id] = crypto.randomUUID());
    return {
      id: newId,
      organization_id: mapId(r.organization_id),
      name: r.name,
      department: r.department || null,
      leader_id: mapId(r.leader_id),
      created: ts(r.created),
      updated: ts(r.updated),
    };
  });
  saveIdMap();
  const { inserted } = await upsertBatch('teams', rows);
  console.log(`  ✓ ${inserted} rows`);
}

// ── Step 4: Shifts ───────────────────────────────────────────────────────────

async function migrateShifts() {
  console.log('\n[4/9] shifts…');
  const records = load('shifts');
  const rows = records.map(r => {
    const newId = idMap[r.id] ?? (idMap[r.id] = crypto.randomUUID());
    return {
      id: newId,
      organization_id: mapId(r.organization_id),
      name: r.name,
      start_time: r.start_time || r.startTime || '09:00',
      end_time: r.end_time || r.endTime || '18:00',
      late_grace_period: r.late_grace_period ?? r.lateGracePeriod ?? 0,
      early_out_grace_period: r.early_out_grace_period ?? r.earlyOutGracePeriod ?? 0,
      earliest_check_in: r.earliest_check_in || r.earliestCheckIn || null,
      auto_session_close_time: r.auto_session_close_time || r.autoSessionCloseTime || null,
      working_days: r.working_days || r.workingDays || ['MON','TUE','WED','THU','FRI'],
      is_default: r.is_default ?? r.isDefault ?? false,
      created: ts(r.created),
      updated: ts(r.updated),
    };
  });
  saveIdMap();
  const { inserted } = await upsertBatch('shifts', rows);
  console.log(`  ✓ ${inserted} rows`);
}

// ── Step 5: Settings ─────────────────────────────────────────────────────────

async function migrateSettings() {
  console.log('\n[5/9] settings…');
  const records = load('settings');
  const rows = records.map(r => {
    const newId = idMap[r.id] ?? (idMap[r.id] = crypto.randomUUID());
    return {
      id: newId,
      organization_id: mapId(r.organization_id),
      key: r.key,
      value: typeof r.value === 'string' ? JSON.parse(r.value) : r.value,
      created: ts(r.created),
      updated: ts(r.updated),
    };
  });
  saveIdMap();
  const { inserted } = await upsertBatch('settings', rows);
  console.log(`  ✓ ${inserted} rows`);
}

// ── Step 6: Attendance ───────────────────────────────────────────────────────

async function migrateAttendance() {
  console.log('\n[6/9] attendance…');
  const records = load('attendance');
  const rows = records.map(r => {
    const newId = idMap[r.id] ?? (idMap[r.id] = crypto.randomUUID());
    // employee_id in PB was the user's PB record ID — map to new UUID
    const mappedEmployeeId = mapId(r.employee_id) ?? r.employee_id;
    return {
      id: newId,
      organization_id: mapId(r.organization_id),
      employee_id: mappedEmployeeId,
      employee_name: r.employee_name || null,
      check_in: ts(r.check_in),
      check_out: r.check_out ? ts(r.check_out) : null,
      status: r.status || 'PRESENT',
      duty_type: r.duty_type || null,
      location: r.location || null,
      selfie: r.selfie ? `${r.id}/selfie.webp` : null,
      remarks: r.remarks || null,
      reconcile: r.reconcile ?? false,
      created: ts(r.created),
      updated: ts(r.updated),
    };
  });
  saveIdMap();
  const { inserted } = await upsertBatch('attendance', rows);
  console.log(`  ✓ ${inserted} rows`);
}

// ── Step 7: Leaves ───────────────────────────────────────────────────────────

async function migrateLeaves() {
  console.log('\n[7/9] leaves…');
  const records = load('leaves');
  const rows = records.map(r => {
    const newId = idMap[r.id] ?? (idMap[r.id] = crypto.randomUUID());
    const mappedEmployeeId = mapId(r.employee_id) ?? r.employee_id;
    return {
      id: newId,
      organization_id: mapId(r.organization_id),
      employee_id: mappedEmployeeId,
      employee_name: r.employee_name || null,
      line_manager_id: mapId(r.line_manager_id) ?? r.line_manager_id ?? null,
      applied_date: r.applied_date || null,
      start_date: r.start_date,
      end_date: r.end_date,
      total_days: r.total_days ?? 1,
      type: r.type,
      reason: r.reason || null,
      status: r.status || 'PENDING_MANAGER',
      manager_remarks: r.manager_remarks || null,
      approver_remarks: r.approver_remarks || null,
      created: ts(r.created),
      updated: ts(r.updated),
    };
  });
  saveIdMap();
  const { inserted } = await upsertBatch('leaves', rows);
  console.log(`  ✓ ${inserted} rows`);
}

// ── Step 8: Announcements ────────────────────────────────────────────────────

async function migrateAnnouncements() {
  console.log('\n[8/9] announcements…');
  const records = load('announcements');
  const rows = records.map(r => {
    const newId = idMap[r.id] ?? (idMap[r.id] = crypto.randomUUID());
    return {
      id: newId,
      organization_id: mapId(r.organization_id),
      title: r.title || '',
      content: r.content || '',
      author_id: mapId(r.author_id) ?? r.author_id ?? null,
      author_name: r.author_name || '',
      priority: r.priority || 'NORMAL',
      target_roles: r.target_roles || [],
      expires_at: ts(r.expires_at),
      created: ts(r.created),
      updated: ts(r.updated),
    };
  });
  saveIdMap();
  const { inserted } = await upsertBatch('announcements', rows);
  console.log(`  ✓ ${inserted} rows`);
}

// ── Step 9: Blog posts + Tutorials ──────────────────────────────────────────

async function migrateBlogPosts() {
  console.log('\n[9a/9] blog_posts…');
  const records = load('blog_posts');
  const rows = records.map(r => {
    const newId = idMap[r.id] ?? (idMap[r.id] = crypto.randomUUID());
    return {
      id: newId,
      title: r.title || '',
      slug: r.slug || '',
      content: r.content || '',
      excerpt: r.excerpt || '',
      cover_image: r.cover_image ? `blog-covers/${r.cover_image}` : null,
      status: r.status || 'DRAFT',
      author_name: r.author_name || '',
      published_at: ts(r.published_at),
      created: ts(r.created),
      updated: ts(r.updated),
    };
  });
  saveIdMap();
  const { inserted } = await upsertBatch('blog_posts', rows);
  console.log(`  ✓ ${inserted} rows`);
}

async function migrateTutorials() {
  console.log('\n[9b/9] tutorials…');
  const records = load('tutorials');

  // First pass: assign new IDs
  for (const r of records) {
    if (!idMap[r.id]) idMap[r.id] = crypto.randomUUID();
  }
  saveIdMap();

  // Insert root records first (no parent), then children
  const roots = records.filter(r => !r.parent_id);
  const children = records.filter(r => !!r.parent_id);

  for (const group of [roots, children]) {
    const rows = group.map(r => ({
      id: idMap[r.id],
      title: r.title || '',
      slug: r.slug || '',
      content: r.content || '',
      excerpt: r.excerpt || '',
      cover_image: r.cover_image ? `tutorial-covers/${r.cover_image}` : null,
      status: r.status || 'DRAFT',
      author_name: r.author_name || '',
      display_order: r.display_order ?? 0,
      parent_id: r.parent_id ? mapId(r.parent_id) : null,
      category: r.category || null,
      published_at: ts(r.published_at),
      created: ts(r.created),
      updated: ts(r.updated),
    }));
    await upsertBatch('tutorials', rows);
  }
  console.log(`  ✓ ${records.length} rows`);
}

// ── Step 10: Notifications ───────────────────────────────────────────────────

async function migrateNotifications() {
  console.log('\n[10/10] notifications…');
  const records = load('notifications');
  const rows = records.map(r => {
    const newId = idMap[r.id] ?? (idMap[r.id] = crypto.randomUUID());
    return {
      id: newId,
      organization_id: mapId(r.organization_id),
      user_id: mapId(r.user_id) ?? r.user_id,
      type: r.type || 'SYSTEM',
      title: r.title || '',
      message: r.message || null,
      is_read: r.is_read ?? false,
      priority: r.priority || 'NORMAL',
      reference_id: r.reference_id || null,
      reference_type: r.reference_type || null,
      action_url: r.action_url || null,
      metadata: r.metadata || null,
      created: ts(r.created),
      updated: ts(r.updated),
    };
  });
  saveIdMap();
  const { inserted } = await upsertBatch('notifications', rows);
  console.log(`  ✓ ${inserted} rows`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('OpenHR — PocketBase → Supabase data migration');
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Temp password for migrated users: ${TEMP_PASSWORD}`);
  console.log('─'.repeat(60));

  await migrateOrgs();
  await migrateTeams();
  await migrateShifts();
  await migrateSettings();
  await migrateUsers();        // after orgs/teams/shifts so IDs exist
  await migrateAttendance();
  await migrateLeaves();
  await migrateAnnouncements();
  await migrateNotifications();
  await migrateBlogPosts();
  await migrateTutorials();

  saveIdMap();
  console.log('\n─'.repeat(60));
  console.log('Migration complete.');
  console.log('ID map saved to exports/id-map.json');
  console.log('\nNext steps:');
  console.log('  1. Run 03-verify.mjs to check row counts');
  console.log('  2. Notify users to reset their passwords (all set to TEMP_PASSWORD)');
  console.log('  3. Optional: run 04-files.mjs to migrate file attachments');
})().catch(e => { console.error(e); process.exit(1); });
