/**
 * Builds the [DIAG: ...] remark tag for a check-in saved without a location.
 * Location failures come and go, so the evidence is captured when one happens.
 * Collection must never block or fail a check-in.
 */

const LOOKUP_TIMEOUT_MS = 1000;
const UNKNOWN = 'unknown';

export interface LocationDiagnostics {
  permission: string;
  mode: string;
  browser: string;
  os: string;
  device: string;
  error: string;
}

const clean = (value: string): string =>
  value.replace(/[[\];]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || UNKNOWN;

export const formatLocationDiagnostics = (d: LocationDiagnostics): string =>
  `[DIAG: permission=${clean(d.permission)}; mode=${clean(d.mode)}; browser=${clean(d.browser)}; os=${clean(d.os)}; device=${clean(d.device)}; error=${clean(d.error)}]`;

/** Order matters: these browsers also include "Chrome" or "Safari" in the user agent. */
export const detectBrowser = (ua: string): string => {
  const patterns: [RegExp, string][] = [
    [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
    [/EdgA?\/(\d+)/, 'Edge'],
    [/OPR\/(\d+)/, 'Opera'],
    [/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox'],
    [/(?:Chrome|CriOS)\/(\d+)/, 'Chrome'],
    [/Version\/(\d+).*Safari/, 'Safari'],
  ];
  for (const [pattern, name] of patterns) {
    const match = ua.match(pattern);
    if (match) return `${name} ${match[1]}`;
  }
  return UNKNOWN;
};

export const detectOs = (ua: string): string => {
  const android = ua.match(/Android ([\d.]+)/);
  if (android) return `Android ${android[1]}`;
  const ios = ua.match(/(?:iPhone )?OS (\d+)[_\d]* like Mac OS X/);
  if (ios) return `iOS ${ios[1]}`;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X')) return 'macOS';
  return UNKNOWN;
};

const withTimeout = <T>(lookup: () => Promise<T>, fallback: T): Promise<T> =>
  Promise.race([
    Promise.resolve().then(lookup).catch(() => fallback),
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), LOOKUP_TIMEOUT_MS)),
  ]);

const getPermissionState = (): Promise<string> =>
  withTimeout(async () => {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  }, UNKNOWN);

/** Android Chrome reports a reduced user agent, so the OS version and model come from client hints. */
const getClientHints = (): Promise<{ platform?: string; platformVersion?: string; model?: string }> =>
  withTimeout(() => (navigator as any).userAgentData.getHighEntropyValues(['platformVersion', 'model']), {});

export const collectLocationDiagnostics = async (err?: any): Promise<string> => {
  try {
    const ua = navigator.userAgent || '';
    const [permission, hints] = await Promise.all([getPermissionState(), getClientHints()]);
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
    return formatLocationDiagnostics({
      permission,
      mode: standalone ? 'installed' : 'browser',
      browser: detectBrowser(ua),
      os: hints.platform && hints.platformVersion ? `${hints.platform} ${hints.platformVersion}` : detectOs(ua),
      device: hints.model || UNKNOWN,
      error: err?.message || UNKNOWN,
    });
  } catch {
    return '';
  }
};
