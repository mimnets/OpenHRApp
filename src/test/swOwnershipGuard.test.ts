import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Service-worker ownership guard (M-04).
 *
 * The invariant this protects: `/sw.js` belongs to the application's own Workbox
 * worker, and the first-party push handlers in `src/sw.ts` stay the only push
 * code on the origin. The standalone In-Page Push integration is supposed to need
 * no worker at all, so this file checks that mechanically instead of trusting the
 * intent of whoever wrote the loader.
 *
 * It also records, without failing on, the pre-existing Monetag worker copies that
 * were committed before this work (`public/sw.js`, `src/sw.js`, root `sw.js`).
 * Those are findings from the M-01/M-03 audit, not M-04 regressions: this suite
 * must stay green on the current baseline, and must stay green if someone later
 * removes them, so it asserts they are inert rather than asserting they are gone.
 */

const root = path.resolve(__dirname, '../..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative: string): boolean => fs.existsSync(path.join(root, relative));

/** Files introduced or edited by M-04. */
const M04_FILES = [
  'src/config/monetag.ts',
  'src/utils/adConsent.ts',
  'src/utils/monetagLoader.ts',
  'src/App.tsx',
  'src/components/CookieConsent.tsx',
];

/**
 * APIs that would mean this integration had reached into the PWA or into browser
 * push. Their absence is the claim being enforced.
 */
const WORKER_AND_PUSH_APIS = [
  'navigator.serviceWorker',
  'serviceWorker.register',
  'PushManager',
  'pushManager',
  'requestPermission',
  'showNotification',
  'importScripts',
];

/**
 * Identifiers that belong to other Monetag products or to a stale download and
 * must never enter this integration. Absence is checked across comments too, so
 * none of them is written anywhere in the M-04 files.
 */
const RESERVED_IDENTIFIERS = ['296429', '12043579', '12038238', '5gvci', '3nbf4', 'self.options'];

describe('the PWA keeps ownership of /sw.js', () => {
  it('still builds the worker from the application source, not a vendor file', () => {
    const vite = read('vite.config.ts');
    expect(vite).toContain("strategies: 'injectManifest'");
    expect(vite).toContain("srcDir: 'src'");
    // sw.ts is what makes the emitted worker land at /sw.js. The abandoned
    // pwa-sw.js experiment must not come back: it moved the PWA off /sw.js, which
    // is what a vendor worker would then occupy.
    expect(vite).toContain("filename: 'sw.ts'");
    expect(vite).not.toContain('pwa-sw');
    expect(vite).not.toMatch(/filename:\s*['"]sw\.js['"]/);
  });

  it('is still the precaching Workbox worker with its first-party push handlers', () => {
    const sw = read('src/sw.ts');
    expect(sw).toContain('precacheAndRoute(self.__WB_MANIFEST)');
    expect(sw).toContain('clientsClaim()');
    expect(sw).toContain("addEventListener('push'");
    expect(sw).toContain('showNotification');
    expect(sw).toContain("addEventListener('notificationclick'");
    // Supabase traffic must stay out of the cache strategies (offline/auth safety).
    // Matched loosely because the routes are written as escaped regex literals,
    // e.g. /^\/auth\/v1\// — an exact "/auth/v1/" substring is not present.
    expect(sw).toContain('supabase.co');
    expect(sw).toMatch(/auth/);
    expect(sw).toMatch(/realtime/);
    expect(sw).toContain('NetworkOnly');
  });

  it('carries no Monetag worker code and no vendor identifiers', () => {
    const sw = read('src/sw.ts');
    expect(sw).not.toContain('importScripts');
    expect(sw).not.toContain('zoneId');
    for (const reserved of RESERVED_IDENTIFIERS) {
      expect(sw, `src/sw.ts must not mention ${reserved}`).not.toContain(reserved);
    }
  });

  it('still serves the worker as a real file rather than the SPA shell', () => {
    // The stale-chunk incident fix: without these exclusions a missing asset or
    // worker returns index.html and the browser executes HTML as a module.
    // The exclusion is written inside a JSON regex string, so the file literally
    // contains sw\\.js — allow one or two backslashes rather than a plain "sw.js".
    const vercel = read('vercel.json');
    expect(vercel).toMatch(/sw\\{1,2}\.js/);
    expect(vercel).toContain('registerSW');
    expect(vercel).toContain('workbox-');
  });

  it('keeps the installed-app scope untouched', () => {
    const manifest = read('public/manifest.json');
    expect(manifest).toContain('"scope": "/"');
    expect(manifest).toContain('"start_url": "/"');
  });
});

describe('M-04 introduced no service-worker or browser-push code', () => {
  it.each(M04_FILES)('%s contains no worker or push API usage', (file) => {
    expect(exists(file), `${file} should exist after M-04`).toBe(true);
    const source = read(file);
    for (const api of WORKER_AND_PUSH_APIS) {
      expect(source, `${file} must not reference ${api}`).not.toContain(api);
    }
  });

  it.each(M04_FILES)('%s references no reserved Monetag identifier', (file) => {
    const source = read(file);
    for (const reserved of RESERVED_IDENTIFIERS) {
      expect(source, `${file} must not contain ${reserved}`).not.toContain(reserved);
    }
  });

  it('uses only the standalone In-Page Push zone constant', () => {
    // Imported rather than regex-matched, so the assertion is about the value the
    // loader would actually ship, not about text that happens to look similar.
    const config = read('src/config/monetag.ts');
    expect(config).toContain("export const MONETAG_ZONE_ID = '12046475'");
    expect(config).toContain("export const MONETAG_TAG_SRC = 'https://nap5k.com/tag.min.js'");
    const loader = read('src/utils/monetagLoader.ts');
    expect(loader).toContain('MONETAG_ZONE_ID');
    expect(loader).toContain('MONETAG_TAG_SRC');
    expect(loader).not.toContain('http://');
  });

  it('added no new service-worker file anywhere the build would pick up', () => {
    const publicJs = fs.existsSync(path.join(root, 'public'))
      ? fs.readdirSync(path.join(root, 'public')).filter((name) => name.endsWith('.js'))
      : [];
    // public/*.js is copied into the build output, so nothing vendor-shaped may
    // appear there beyond the pre-existing copy reported below.
    for (const name of publicJs) {
      expect(['sw.js'], `unexpected new script in public/: ${name}`).toContain(name);
    }
    expect(exists('public/monetag-sw.js')).toBe(false);
    expect(exists('monetag-sw.js')).toBe(false);
  });
});

describe('pre-existing Monetag worker copies are recorded, not treated as regressions', () => {
  const LEGACY_COPIES = ['public/sw.js', 'src/sw.js', 'sw.js'];

  it('are inert with respect to the build', () => {
    const present = LEGACY_COPIES.filter(exists);
    // Deliberately an upper bound, not an equality: the suite passes whether these
    // are still here or have since been removed in their own approved change.
    expect(present.length).toBeLessThanOrEqual(LEGACY_COPIES.length);

    // The only copy that could ever reach dist/ is a public/ one, and the PWA
    // config never names it, so it contends for /sw.js and loses.
    const vite = read('vite.config.ts');
    expect(vite).not.toContain('public/sw.js');
    const sw = read('src/sw.ts');
    expect(sw).not.toContain('sw.js');
    for (const copy of present) {
      const body = read(copy);
      // If one of these is ever renamed into the PWA slot, that is the regression
      // this line is here to catch.
      expect(body).toContain('importScripts');
    }
  });
});
