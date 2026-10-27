import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('../../../services/supabase', () => ({ supabase: {}, isSupabaseConfigured: () => false }));
vi.mock('../../../services/organization.service', () => ({ organizationService: {} }));

import { resolveAdFrameSrc, SandboxedAdFrame, DEFAULT_AD_FRAME_CONFIG } from '../AdBanner';
import { validateAdFrameConfig } from '../../superadmin/AdFrameSettings';

describe('dashboard ad settings validation', () => {
  const on = (patch: object) => ({ ...DEFAULT_AD_FRAME_CONFIG, enabled: true, ...patch });

  it('accepts the defaults and well-formed provider values', () => {
    expect(validateAdFrameConfig(DEFAULT_AD_FRAME_CONFIG)).toBeNull();
    expect(validateAdFrameConfig(on({
      adsterra: { enabled: true, key: 'abc123', weight: 2 },
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
    expect(container.textContent).toContain('Ad');
  });
});
