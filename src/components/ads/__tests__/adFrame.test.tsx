import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('../../../services/supabase', () => ({ supabase: {}, isSupabaseConfigured: () => false }));
vi.mock('../../../services/organization.service', () => ({ organizationService: {} }));

import { resolveAdFrameSrc, SandboxedAdFrame } from '../AdBanner';

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
