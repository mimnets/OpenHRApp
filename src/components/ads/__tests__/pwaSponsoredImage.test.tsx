import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../services/supabase', () => ({ supabase: {}, isSupabaseConfigured: () => false }));
vi.mock('../../../services/organization.service', () => ({ organizationService: {} }));
vi.mock('../../../services/api.client', () => ({ apiClient: { getOrganizationId: () => 'org-1' } }));
vi.mock('../../../context/SubscriptionContext', () => ({ useSubscription: () => ({ subscription: { showAds: true } }) }));

import {
  PWA_SPONSORED_LINK,
  PwaSponsoredImage,
  resolvePwaImageSrc,
  type AdConfig,
} from '../AdBanner';

const ORIGIN = 'https://app.openhr.test';
const image = (imageUrl: string, extra: Partial<AdConfig> = {}): AdConfig =>
  ({ id: 'x', slot: 'dashboard-below-cards', enabled: true, adType: 'image', imageUrl, ...extra });

describe('Phase 3C: PWA slots are image-only, self-hosted', () => {
  it('accepts same-origin absolute and root-relative images', () => {
    expect(resolvePwaImageSrc(image(`${ORIGIN}/img/sponsor.webp`), ORIGIN)).toBe(`${ORIGIN}/img/sponsor.webp`);
    expect(resolvePwaImageSrc(image('/img/sponsor.webp'), ORIGIN)).toBe(`${ORIGIN}/img/sponsor.webp`);
  });

  it.each([
    'https://evil.example/a.png',
    '//evil.example/a.png',
    'data:image/png;base64,AAAA',
    'javascript:alert(1)',
    'http://app.openhr.test/img/a.png', // scheme downgrade is a different origin
  ])('rejects non-self-hosted image %s', (url) => {
    expect(resolvePwaImageSrc(image(url), ORIGIN)).toBeNull();
  });

  it.each([
    { adType: 'adsense', adsenseClient: 'ca-pub-1', adsenseSlot: '1' },
    { adType: 'custom', customHtml: '<script src="https://x/invoke.js"></script>' },
    { adType: 'custom', customHtml: '<iframe src="https://x"></iframe>' },
  ] as Partial<AdConfig>[])('rejects non-image ad type %o', (cfg) => {
    expect(resolvePwaImageSrc({ ...image('/img/a.png'), ...cfg } as AdConfig, ORIGIN)).toBeNull();
  });

  it('rejects missing config or image', () => {
    expect(resolvePwaImageSrc(null, ORIGIN)).toBeNull();
    expect(resolvePwaImageSrc(image(''), ORIGIN)).toBeNull();
  });
});

describe('Phase 3C: SmartLink click-through', () => {
  it('SmartLink is a fixed URL with no query or fragment to carry data', () => {
    const url = new URL(PWA_SPONSORED_LINK);
    expect(url.protocol).toBe('https:');
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  });

  it('renders a sponsored, noopener/noreferrer link to the SmartLink with a visible label', () => {
    const { container } = render(<PwaSponsoredImage src="/img/sponsor.webp" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe(PWA_SPONSORED_LINK);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer sponsored');
    expect(screen.getByText('Sponsored')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('alt')).toBe('Sponsored link');
    expect(container.querySelector('script, iframe')).toBeNull();
  });
});
