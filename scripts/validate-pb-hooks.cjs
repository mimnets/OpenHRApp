#!/usr/bin/env node
/**
 * Pre-deploy validator for PocketBase hooks.
 *
 * FROZEN HELPER — see Others/CLAUDE.md "Frozen Modules — Change-Control".
 *
 * Why this exists: the auto-close-sessions cron and the core API endpoints in
 * main.pb.js have been accidentally damaged during refactors three times. This
 * script fails the build if any required hook file or required hook/block is
 * missing, so a broken build cannot reach production.
 */
const fs = require('fs');
const path = require('path');

const HOOKS_DIR = path.join(__dirname, '..', 'Others', 'pb_hooks');

// Required files and the literal markers each file must contain.
// Marker strings are intentionally plain so a grep-style check is sufficient
// and tolerant of small formatting edits.
const REQUIRED = [
  {
    file: 'cron.pb.js',
    markers: [
      'cronAdd("auto_close_sessions"',
      'cronAdd("auto_absent_check"',
    ],
    description: 'Scheduled jobs including auto_close_sessions (forgotten-checkout closure).',
  },
  {
    file: 'main.pb.js',
    markers: [
      '/api/openhr/register',
      '/api/openhr/subscription-status',
    ],
    description: 'Core API endpoints (registration, subscription).',
  },
  {
    file: 'attendance_notifications.pb.js',
    markers: [
      'attendance_reminders',
    ],
    description: 'Attendance notification hooks and cron.',
  },
  {
    file: 'review_notifications.pb.js',
    markers: [
      'review_cycle_transition',
    ],
    description: 'Performance review notification hooks and cron.',
  },
];

let hasErrors = false;

function fail(msg) {
  console.error('\x1b[31m[validate-pb-hooks] ERROR:\x1b[0m ' + msg);
  hasErrors = true;
}

function ok(msg) {
  console.log('\x1b[32m[validate-pb-hooks] OK:\x1b[0m ' + msg);
}

if (!fs.existsSync(HOOKS_DIR)) {
  fail(`Hooks directory not found: ${HOOKS_DIR}`);
  process.exit(1);
}

for (const entry of REQUIRED) {
  const filePath = path.join(HOOKS_DIR, entry.file);
  if (!fs.existsSync(filePath)) {
    fail(`Missing required hook file: ${entry.file} — ${entry.description}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.trim()) {
    fail(`Hook file is empty: ${entry.file}`);
    continue;
  }
  for (const marker of entry.markers) {
    if (!content.includes(marker)) {
      fail(
        `Hook file ${entry.file} is missing required marker: '${marker}'.\n` +
          `  This usually means the block was accidentally removed during a refactor.\n` +
          `  Context: ${entry.description}`
      );
    }
  }
  if (!hasErrors) ok(`${entry.file} contains all required markers.`);
}

if (hasErrors) {
  console.error(
    '\n\x1b[31m[validate-pb-hooks] Build aborted — fix the issues above before deploying.\x1b[0m\n' +
      'See Others/CLAUDE.md "Frozen Modules — Change-Control" for why these markers matter.\n'
  );
  process.exit(1);
}

console.log('\n\x1b[32m[validate-pb-hooks] All required PocketBase hooks are in place.\x1b[0m');
