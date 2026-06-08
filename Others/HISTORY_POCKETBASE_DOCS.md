# Historical PocketBase Documentation — Superseded

PocketBase was the original backend before the Supabase migration (completed May 2026).
These files documented the PB schema, setup, and procedures. They are no longer active
but preserved here as a compact reference.

---

## What existed (files now consolidated and deleted)

- `POCKETBASE_REVIEW_COLLECTIONS.md` (23KB) — Review collections schema analysis
- `POCKETBASE_SETUP_GUIDE.md` (4KB) — PB server setup
- `POCKETBASE_V2_SCHEMA.md` (4KB) — v2 schema migration
- `pocketbase-setup-playbook.md` (3KB) — Setup playbook
- `DB_MIGRATION_GUIDES.MD` (22KB) — Migration guides (export/import)

## Key takeaways preserved for reference

### PocketBase Server
- PocketBase ran as a single binary with embedded SQLite
- Served at https://pocketbase.mimnets.com and https://pbase.vclbd.net
- Hooks deployed to `pb_hooks/` on the server
- Custom endpoints registered in `main.pb.js`
- Cron jobs registered via `cronAdd()` in `cron.pb.js`

### Collections (now Supabase tables)
- `users` → `auth.users` + `profiles`
- `attendance` → `attendance` (supabase)
- `leaves` → `leaves` (supabase)
- `shifts` → `shifts` (supabase)
- `teams` → `teams` (supabase)
- `settings` → `settings` (supabase)
- `announcements` → `announcements` (supabase)
- `notifications` → `notifications` (supabase)
- `review_cycles` → `review_cycles` (supabase)
- `performance_reviews` → `performance_reviews` (supabase)
- `blog_posts` → `blog_posts` (supabase)
- `tutorials` → `tutorials` (supabase)
- `showcase_organizations` → `showcase_organizations` (supabase)
- `social_links` → `social_links` (supabase)
- `upgrade_requests` → `upgrade_requests` (supabase)
- `reports_queue` → `reports_queue` (supabase)

### Migration Scripts
Migration scripts live in `scripts/migrate-from-pb/`:
- `01-export.mjs` — Export PB SQLite to JSON
- `02-import.mjs` — Import into Supabase with ID mapping
- `03-verify.mjs` — Verify row counts and FK integrity
- `04-files.mjs` — Migrate file attachments to Supabase Storage
- `05-incremental-attendance.mjs` — Catch up attendance after cutover

### PB Hooks (reference copies in `Others/pb_hooks/`)
- `main.pb.js` — Core hooks + 16 custom endpoints
- `cron.pb.js` — 5 scheduled cron jobs
- `attendance_notifications.pb.js` — Attendance email/bell notifications
- `review_notifications.pb.js` — Review email/bell notifications
- `leave_notifications.pb.js` — DEPRECATED (merged into main.pb.js)
- `setup_collections.pb.js` — Collection schema setup

### Historical PB URLs (now dead)
- DB: `https://pocketbase.mimnets.com`
- Files: `https://pocketbase.mimnets.com/api/files/<collection>/<id>/<filename>`
- Custom API: `https://pocketbase.mimnets.com/api/openhr/<endpoint>`
