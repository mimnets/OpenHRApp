---
name: attendance-migration-gaps
description: Tasyeea and Tanha attendance records possibly missing from PocketBase→Supabase migration — investigation ready to resume when PB backup is available
type: project
originSessionId: 10d33574-d630-4132-b9a3-d4b20b7ba62e
---
# Attendance Migration Gaps — Versatile Creation Ltd

**Why:** User reports some employees (especially Tasyeea) have fewer attendance records in Supabase than expected after PB→Supabase migration.

## Suspect employees

| Employee | Supabase Records | Date Range | Last Seen |
|----------|-----------------|------------|-----------|
| Tasyeea | 21 | Feb 25 – May 10, 2026 | May 10 |
| Tanha | 41 | Feb 28 – May 10, 2026 | May 10 |
| Musfeq Salehin | 21 | May 3 – Jun 7, 2026 | Jun 7 (active) |

Tasyeea + Tanha both stopped on May 10 — same day. Suspicious.

## Key facts
- Organization: Versatile Creation Ltd (`23b321b0-f12c-430d-a433-708427dcfc47`)
- Total attendance in Supabase for this org: 4,019 records (Jan 16 – Jun 8, 2026)
- Migration ran from PB backup `@auto_pb_backup_open_hr_app_20260513000000` (May 13 backup)
- Migration preserved original `created` timestamps — records are authentic, not lost in transit
- Migration script: `scripts/migrate-from-pb/02-import.mjs` (`migrateAttendance` function, line 276)
- Incremental script: `scripts/migrate-from-pb/05-incremental-attendance.mjs`
- ID mapping: `exports/id-map.json` (gitignored, not on this machine)
- PB backup directory not found on this machine as of 2026-06-08

## What to do when PB backup is available

1. Place the backup at `scripts/migrate-from-pb/@auto_pb_backup_open_hr_app_20260513000000/data.db`
2. Run: count Tasyeea's records in PB vs Supabase
3. Check if Tasyeea had records before Feb 25, 2026 in PB
4. Check if Tanha had records after May 10 in PB
5. Re-run `05-incremental-attendance.mjs` if gaps found

## Supabase project
- Ref: `<your-project-ref>`
- DB query: `supabase db query --linked "<sql>"`
