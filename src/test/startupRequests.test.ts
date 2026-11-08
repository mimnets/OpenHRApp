import fs from 'fs';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({ supabase: {}, isSupabaseConfigured: () => true }));

import { dedupe } from '../services/api.client';

const read = (relative: string): string =>
  fs.readFileSync(path.resolve(__dirname, '../..', relative), 'utf8');

describe('app start stays light on slow phones', () => {
  it('sends one request for parallel readers of the same key', async () => {
    const fetcher = vi.fn(async () => 'value');
    const results = await Promise.all(Array.from({ length: 12 }, () => dedupe('key', fetcher)));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r === 'value')).toBe(true);
  });

  it('reads again after the first request has finished', async () => {
    const fetcher = vi.fn(async () => 'value');
    await dedupe('key', fetcher);
    await dedupe('key', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not reload the page when the first service worker takes control', () => {
    const hook = read('src/hooks/useServiceWorker.ts');
    expect(hook).toContain('const hadController = !!navigator.serviceWorker?.controller');
    expect(hook).toContain('if (!hadController || reloadedRef.current) return');
  });

  it('keeps taps on the static hero from reloading the page', () => {
    const html = read('index.html');
    expect(html).toContain('e.preventDefault()');
    expect(html).toContain('window.__heroIntent');
  });

  it('loads no unused CDN modules', () => {
    expect(read('index.html')).not.toContain('esm.sh');
  });

  it('loads the YouTube player only after a tap', () => {
    expect(read('src/components/landing/HeroSection.tsx')).toMatch(/playVideo \? \(\s*<iframe/);
  });
});
