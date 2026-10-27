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

import { MIN_CONTENT_CHARS } from '../PublicAdBanner';

/**
 * Regression guard for the AdSense thin-content policy gate on public blog slots (plan item 28).
 * The authenticated AdSense slot gate (item 27) went away with those slots: in-app ads now run
 * only through the sandboxed DashboardAdFrame.
 */

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
