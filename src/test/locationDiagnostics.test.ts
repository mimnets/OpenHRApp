import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNoLocationRemarks } from '../utils/attendanceUtils';
import {
  collectLocationDiagnostics,
  detectBrowser,
  detectOs,
  formatLocationDiagnostics,
} from '../utils/locationDiagnostics';

const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const stubNavigator = (values: Record<string, unknown>) => vi.stubGlobal('navigator', values);

describe('location diagnostics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('names the browser, including ones that also report Chrome', () => {
    expect(detectBrowser(CHROME_ANDROID)).toBe('Chrome 131');
    expect(detectBrowser(SAMSUNG)).toBe('Samsung Internet 26');
    expect(detectBrowser(IPHONE)).toBe('Safari 17');
    expect(detectBrowser('something else')).toBe('unknown');
  });

  it('reads the operating system from the user agent', () => {
    expect(detectOs(SAMSUNG)).toBe('Android 13');
    expect(detectOs(IPHONE)).toBe('iOS 17');
    expect(detectOs('something else')).toBe('unknown');
  });

  it('removes characters that would break the tag', () => {
    const tag = formatLocationDiagnostics({
      permission: 'granted',
      mode: 'installed',
      browser: 'Chrome 131',
      os: 'Android 14',
      device: 'SM-A155F',
      error: 'bad [text]; here',
    });
    expect(tag).toBe('[DIAG: permission=granted; mode=installed; browser=Chrome 131; os=Android 14; device=SM-A155F; error=bad text here]');
  });

  it('collects the permission state, device and browser error', async () => {
    stubNavigator({
      userAgent: CHROME_ANDROID,
      permissions: { query: async () => ({ state: 'granted' }) },
      userAgentData: {
        getHighEntropyValues: async () => ({ platform: 'Android', platformVersion: '14.0.0', model: 'SM-A155F' }),
      },
    });
    const tag = await collectLocationDiagnostics({ message: 'User denied Geolocation' });
    expect(tag).toContain('permission=granted');
    expect(tag).toContain('browser=Chrome 131');
    expect(tag).toContain('os=Android 14.0.0');
    expect(tag).toContain('device=SM-A155F');
    expect(tag).toContain('error=User denied Geolocation');
  });

  it('still returns a tag when the browser has no permission or client hints APIs', async () => {
    stubNavigator({ userAgent: IPHONE, permissions: undefined, userAgentData: undefined });
    const tag = await collectLocationDiagnostics();
    expect(tag).toContain('permission=unknown');
    expect(tag).toContain('browser=Safari 17');
    expect(tag).toContain('os=iOS 17');
    expect(tag).toContain('device=unknown');
  });

  it('does not wait for a browser lookup that never finishes', async () => {
    vi.useFakeTimers();
    stubNavigator({
      userAgent: CHROME_ANDROID,
      permissions: { query: () => new Promise(() => {}) },
      userAgentData: { getHighEntropyValues: () => new Promise(() => {}) },
    });
    const pending = collectLocationDiagnostics();
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toContain('permission=unknown');
  });

  it('adds the tag after the employee reason', () => {
    expect(buildNoLocationRemarks('denied', 'GPS not working', '[DIAG: permission=granted]'))
      .toBe('[NO LOCATION: denied] GPS not working [DIAG: permission=granted]');
    expect(buildNoLocationRemarks('timeout', '', '[DIAG: permission=granted]'))
      .toBe('[NO LOCATION: timeout] [DIAG: permission=granted]');
    expect(buildNoLocationRemarks('timeout', '', null)).toBe('[NO LOCATION: timeout]');
  });
});
