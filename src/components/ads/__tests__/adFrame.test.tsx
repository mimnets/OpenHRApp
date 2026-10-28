import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('../../../services/supabase', () => ({ supabase: {}, isSupabaseConfigured: () => false }));
vi.mock('../../../services/organization.service', () => ({ organizationService: {} }));

import {
  resolveAdFrameSrc, SandboxedAdFrame, DEFAULT_AD_FRAME_CONFIG,
  isPlacementOn, maxAdWidth, adFrameSrcForWidth, readAdSizeMessage,
} from '../AdBanner';

describe('ad frame sizing and placements', () => {
  it('rounds the available width down to a standard ad width', () => {
    expect(maxAdWidth(1100)).toBe(728);
    expect(maxAdWidth(728)).toBe(728);
    expect(maxAdWidth(727)).toBe(468);
    expect(maxAdWidth(360)).toBe(320);
    expect(maxAdWidth(310)).toBe(300);
    expect(maxAdWidth(220)).toBe(220); // side menu: the ad page picks its narrowest, the app scales it
  });

  it('tells the ad page the widest ad that fits', () => {
    expect(adFrameSrcForWidth('https://ads.openhrapp.com/', 728)).toBe('https://ads.openhrapp.com/?maxw=728');
  });

  it('accepts only well-formed size reports from the ad page', () => {
    expect(readAdSizeMessage({ type: 'openhr-ad-size', w: 320, h: 50 })).toEqual({ w: 320, h: 50 });
    expect(readAdSizeMessage({ type: 'openhr-ad-size', w: 0, h: 50 })).toBeNull();
    expect(readAdSizeMessage({ type: 'openhr-ad-size', w: 5000, h: 50 })).toBeNull();
    expect(readAdSizeMessage({ type: 'openhr-ad-size', w: '320', h: 50 })).toBeNull();
    expect(readAdSizeMessage({ type: 'other', w: 320, h: 50 })).toBeNull();
    expect(readAdSizeMessage(null)).toBeNull();
  });

  it('keeps the employee dashboard on by default and every other placement opt-in', () => {
    expect(isPlacementOn(undefined, 'employee_dashboard')).toBe(true);
    expect(isPlacementOn({}, 'sidebar')).toBe(false);
    expect(isPlacementOn({ sidebar: true }, 'sidebar')).toBe(true);
    expect(isPlacementOn({ employee_dashboard: false }, 'employee_dashboard')).toBe(false);
  });
});
import { validateAdFrameConfig } from '../../superadmin/AdFrameSettings';

describe('dashboard ad settings validation', () => {
  const on = (patch: object) => ({ ...DEFAULT_AD_FRAME_CONFIG, enabled: true, ...patch });

  it('accepts the defaults and well-formed provider values', () => {
    expect(validateAdFrameConfig(DEFAULT_AD_FRAME_CONFIG)).toBeNull();
    expect(validateAdFrameConfig(on({
      adsterra: { enabled: true, key: 'abc123', keySize: '300x250', keyWide: 'def456', keyWideSize: '728x90', weight: 2 },
      aads: { enabled: true, unit: '2412345', weight: 1 },
      zoho: { enabled: true, img: 'https://x.example/b.png', href: 'https://go.zoho.com/r', weight: 1 },
    }))).toBeNull();
  });

  it('rejects values that could inject markup or load over http', () => {
    expect(validateAdFrameConfig(on({ adsterra: { enabled: true, key: '"></script><script>', weight: 1 } }))).not.toBeNull();
    expect(validateAdFrameConfig(on({ aads: { enabled: true, unit: '12/../x', weight: 1 } }))).not.toBeNull();
    expect(validateAdFrameConfig(on({ zoho: { enabled: true, img: 'http://x/b.png', href: 'https://y', weight: 1 } }))).not.toBeNull();
    expect(validateAdFrameConfig(on({ zoho: { enabled: true, img: 'https://x/b.png', href: 'javascript:alert(1)', weight: 1 } }))).not.toBeNull();
    expect(validateAdFrameConfig(on({ aads: { enabled: false, unit: '', weight: 11 } }))).not.toBeNull();
  });
});

const APP = 'https://openhrapp.com';

describe('ad frame isolation', () => {
  it('accepts only an https URL on a different origin', () => {
    expect(resolveAdFrameSrc('https://ads.openhrapp.com', APP)).toBe('https://ads.openhrapp.com/');
    expect(resolveAdFrameSrc(undefined, APP)).toBeNull();
    expect(resolveAdFrameSrc('', APP)).toBeNull();
    expect(resolveAdFrameSrc('http://ads.openhrapp.com', APP)).toBeNull();
    expect(resolveAdFrameSrc('https://openhrapp.com/ads', APP)).toBeNull(); // same origin = no isolation
    expect(resolveAdFrameSrc('javascript:alert(1)', APP)).toBeNull();
    expect(resolveAdFrameSrc('not a url', APP)).toBeNull();
  });

  it('sandboxes the frame without top navigation and hides the referrer', () => {
    const { container } = render(<SandboxedAdFrame src="https://ads.openhrapp.com/" width={320} height={100} />);
    const frame = container.querySelector('iframe')!;
    const sandbox = frame.getAttribute('sandbox')!.split(' ');
    expect(sandbox).not.toContain('allow-top-navigation');
    expect(sandbox).not.toContain('allow-top-navigation-by-user-activation');
    expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer');
    // No permission delegation: the frame also runs on the check-in screen, next to the camera.
    expect(frame.hasAttribute('allow')).toBe(false);
    expect(container.textContent).toContain('Ad');
  });
});
