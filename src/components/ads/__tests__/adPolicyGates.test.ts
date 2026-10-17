import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// AdBanner pulls in src/services/organization.service.ts -> src/services/supabase.ts, which
// constructs a Supabase client at module scope and throws "supabaseUrl is required" when
// VITE_SUPABASE_URL is unset. That import-time side effect made this file fail collection and
// run zero tests. The values under test are pure constants, so the module is stubbed with an
// inert contract covering every value export of the real module. Nothing here constructs a
// client, holds a credential, names a real host, or can reach the network — and no
// module-scope call to supabase exists anywhere in this import chain (verified by inspection).
vi.mock('../../../services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
    }),
  },
  isSupabaseConfigured: () => false,
  getSupabaseStorageUrl: () => '',
  getSupabaseSignedUrl: async () => null,
}));

import { AUTHENTICATED_AD_SLOTS, isSlotSuppressedPendingApproval } from '../AdBanner';
import { MIN_CONTENT_CHARS } from '../PublicAdBanner';
import type { AdSlot } from '../AdBanner';

/**
 * Regression guards for the two AdSense policy gates (plan items 27-28, AC1.10, root cause F6).
 *
 * F6: `public/robots.txt` Disallows /dashboard, /reports, /settings and friends, so Google
 * cannot crawl the pages those ad slots render on. Serving AdSense on pages the crawler is
 * blocked from is a publisher-policy exposure independent of the content problem that caused
 * the original rejection.
 *
 * Both gates are silent when they regress — an ad simply reappears where it should not — so
 * they are asserted here rather than left to a manual pass before re-application.
 */

describe('authenticated ad slot gate (item 27)', () => {
  it('suppresses every slot that renders on a robots.txt-Disallowed route', () => {
    for (const slot of AUTHENTICATED_AD_SLOTS) {
      expect(isSlotSuppressedPendingApproval(slot)).toBe(true);
    }
  });

  it('covers exactly the dashboard, reports, sidebar and footer slots', () => {
    expect([...AUTHENTICATED_AD_SLOTS].sort()).toEqual(['dashboard', 'footer', 'reports', 'sidebar']);
  });

  it('leaves the public content slots alone', () => {
    const publicSlots: AdSlot[] = [
      'landing-hero',
      'landing-mid',
      'blog-header',
      'blog-feed',
      'blog-post-top',
      'blog-post-content',
    ];
    for (const slot of publicSlots) {
      expect(isSlotSuppressedPendingApproval(slot)).toBe(false);
    }
  });

  it('keeps every gated slot Disallowed in robots.txt', () => {
    // The gate exists *because* these routes are uncrawlable. If a route is ever opened up
    // in robots.txt, the gate for it should be reconsidered deliberately, not silently.
    const robots = fs.readFileSync(path.resolve('public', 'robots.txt'), 'utf-8');
    expect(robots).toMatch(/^Disallow: \/dashboard$/m);
    expect(robots).toMatch(/^Disallow: \/reports$/m);
  });
});

describe('thin-content guard (item 28)', () => {
  it('requires a substantial article before an ad slot is requested', () => {
    expect(MIN_CONTENT_CHARS).toBeGreaterThanOrEqual(1000);
  });

  it('checks content length before fetching, not after', () => {
    // Requesting a slot and then hiding it still reports an impression on a thin page.
    // Assert the guard sits ahead of the fetch in source order.
    const src = fs.readFileSync(path.resolve('src', 'components', 'ads', 'PublicAdBanner.tsx'), 'utf-8');
    const guardAt = src.indexOf('MIN_CONTENT_CHARS');
    const fetchAt = src.indexOf('await fetch(');
    expect(guardAt).toBeGreaterThan(-1);
    expect(fetchAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(fetchAt);
  });
});
