import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';

/**
 * Phase 3D: PWA advertising activation.
 *
 * The source lock is on, so these are real render tests of every gate that must STILL hold:
 * AD_SUPPORTED, the per-org `ad_config_<slot>` row (default OFF), image-only, self-hosted
 * image, fixed SmartLink. `state` is mutated per test to play the org and the Super Admin.
 */
const state = vi.hoisted(() => ({
  subscription: { showAds: true } as { showAds: boolean } | null,
  value: null as any, // the stored ad_config_<slot> value; null = no row
}));

const { fromSpy, eqSpy } = vi.hoisted(() => {
  const eqSpy = vi.fn();
  const chain: any = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eqSpy(col, val); return chain; },
    maybeSingle: () => Promise.resolve({ data: state.value === null ? null : { value: state.value }, error: null }),
  };
  return { fromSpy: vi.fn(() => chain), eqSpy };
});

vi.mock('../services/supabase', () => ({ supabase: { from: fromSpy }, isSupabaseConfigured: () => false }));
vi.mock('../services/organization.service', () => ({ organizationService: {} }));
vi.mock('../services/api.client', () => ({ apiClient: { getOrganizationId: () => 'org-1' } }));
vi.mock('../context/SubscriptionContext', () => ({ useSubscription: () => ({ subscription: state.subscription }) }));

import {
  AdBanner,
  PWA_ADS_ACTIVATED,
  PWA_AD_SLOTS,
  PWA_SPONSORED_LINK,
  isPwaAdSlot,
  type AdSlot,
} from '../components/ads/AdBanner';
import { MONETAG_VIGNETTE_ENABLED } from '../config/monetag';

const PWA: AdSlot[] = ['attendance-success', 'leave-success', 'dashboard-below-cards'];
const EXISTING: AdSlot[] = [
  'sidebar', 'dashboard', 'reports', 'footer', 'landing-hero',
  'landing-mid', 'blog-header', 'blog-feed', 'blog-post-top', 'blog-post-content',
];
const VALID = { enabled: true, adType: 'image', imageUrl: '/img/sponsored-320x100.png' };

const settle = () => new Promise((r) => setTimeout(r, 20));
const renderSlot = (slot: AdSlot) => render(React.createElement(AdBanner, { slot }));

beforeEach(() => {
  fromSpy.mockClear();
  eqSpy.mockClear();
  state.subscription = { showAds: true };
  state.value = null;
});

describe('Phase 3D: activation lock', () => {
  it('is activated in source', () => {
    expect(PWA_ADS_ACTIVATED).toBe(true);
  });

  it('applies to exactly the three PWA slots and none of the existing ten', () => {
    expect([...PWA_AD_SLOTS].sort()).toEqual([...PWA].sort());
    EXISTING.forEach((slot) => expect(isPwaAdSlot(slot)).toBe(false));
  });
});

describe('Phase 3D: explicitly enabled PWA slots render the self-hosted sponsored image', () => {
  it.each(PWA)('%s renders the image linked to the fixed SmartLink, scoped to the org', async (slot) => {
    state.value = VALID;
    const { container } = renderSlot(slot);
    await waitFor(() => expect(container.querySelector('a')).not.toBeNull());

    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe(PWA_SPONSORED_LINK);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer sponsored');
    expect(container.querySelector('img')!.getAttribute('src')).toBe(`${window.location.origin}/img/sponsored-320x100.png`);
    expect(container.textContent).toContain('Sponsored');
    expect(eqSpy).toHaveBeenCalledWith('key', `ad_config_${slot}`);
    expect(eqSpy).toHaveBeenCalledWith('organization_id', 'org-1');
  });

  it('ignores a stored linkUrl so no data can be added to the outbound URL', async () => {
    state.value = { ...VALID, linkUrl: 'https://evil.example/?employee=42&org=org-1' };
    const { container } = renderSlot('dashboard-below-cards');
    await waitFor(() => expect(container.querySelector('a')).not.toBeNull());
    expect(container.querySelector('a')!.getAttribute('href')).toBe(PWA_SPONSORED_LINK);
  });
});

describe('Phase 3D: default, missing and ineligible configurations render nothing', () => {
  it.each(PWA)('%s: no stored config renders nothing', async (slot) => {
    const { container } = renderSlot(slot);
    await settle();
    expect(container.innerHTML).toBe('');
  });

  it.each(PWA)('%s: valid but disabled config renders nothing', async (slot) => {
    state.value = { ...VALID, enabled: false };
    const { container } = renderSlot(slot);
    await settle();
    expect(container.innerHTML).toBe('');
  });

  it.each(PWA)('%s: non-AD_SUPPORTED org neither fetches nor renders', async (slot) => {
    state.subscription = { showAds: false };
    state.value = VALID;
    const { container } = renderSlot(slot);
    await settle();
    expect(fromSpy).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe('');
  });

  it('missing subscription neither fetches nor renders', async () => {
    state.subscription = null;
    state.value = VALID;
    const { container } = renderSlot('attendance-success');
    await settle();
    expect(fromSpy).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe('');
  });
});

describe('Phase 3D: unsafe enabled configurations are rejected', () => {
  it.each([
    ['AdSense', { enabled: true, adType: 'adsense', adsenseClient: 'ca-pub-1', adsenseSlot: '1' }],
    ['custom script', { enabled: true, adType: 'custom', customHtml: '<script src="https://x.example/invoke.js"></script>' }],
    ['custom iframe', { enabled: true, adType: 'custom', customHtml: '<iframe src="https://x.example"></iframe>' }],
    ['custom plain HTML', { enabled: true, adType: 'custom', customHtml: '<p>PROVIDER-AD</p>' }],
    ['external image host', { enabled: true, adType: 'image', imageUrl: 'https://cdn.example/ad.png' }],
    ['protocol-relative image', { enabled: true, adType: 'image', imageUrl: '//cdn.example/ad.png' }],
    ['data: image', { enabled: true, adType: 'image', imageUrl: 'data:image/png;base64,AAAA' }],
    ['javascript: image', { enabled: true, adType: 'image', imageUrl: 'javascript:alert(1)' }],
    ['image without URL', { enabled: true, adType: 'image', imageUrl: '' }],
  ])('%s renders nothing', async (_label, value) => {
    state.value = value;
    const { container } = renderSlot('dashboard-below-cards');
    await settle();
    expect(container.innerHTML).toBe('');
  });
});

describe('Phase 3D: voluntary click only, no third-party JavaScript', () => {
  it('rendering opens nothing; a click neither calls window.open nor bubbles to the page', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const parentClick = vi.fn();
    state.value = VALID;
    const { container } = render(
      React.createElement('div', { onClick: parentClick }, React.createElement(AdBanner, { slot: 'leave-success' }))
    );
    await waitFor(() => expect(container.querySelector('a')).not.toBeNull());
    expect(openSpy).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector('a')!);
    expect(openSpy).not.toHaveBeenCalled(); // native target=_blank navigation, nothing scripted
    expect(parentClick).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('adds no script or iframe anywhere in the document', async () => {
    state.value = VALID;
    const { container } = renderSlot('attendance-success');
    await waitFor(() => expect(container.querySelector('a')).not.toBeNull());
    expect(document.querySelectorAll('script, iframe, ins.adsbygoogle')).toHaveLength(0);
  });
});

describe('Phase 3D: hooks order', () => {
  it('toggling eligibility across re-renders raises no React hooks error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    state.subscription = { showAds: false };
    state.value = VALID;
    const view = renderSlot('dashboard-below-cards');
    await settle();
    expect(view.container.innerHTML).toBe('');

    state.subscription = { showAds: true };
    view.rerender(React.createElement(AdBanner, { slot: 'dashboard-below-cards' }));
    await waitFor(() => expect(view.container.querySelector('a')).not.toBeNull());

    state.subscription = { showAds: false };
    view.rerender(React.createElement(AdBanner, { slot: 'dashboard-below-cards' }));
    await settle();
    expect(view.container.innerHTML).toBe('');

    const hookErrors = errorSpy.mock.calls.filter((c) => /hook/i.test(String(c[0])));
    expect(hookErrors).toEqual([]);
    errorSpy.mockRestore();
  });
});

describe('Phase 3D: existing slots and Monetag unchanged', () => {
  it('a public slot still renders its custom HTML config as before', async () => {
    state.value = { enabled: true, adType: 'custom', customHtml: '<p>PROVIDER-AD</p>' };
    const { container } = renderSlot('landing-hero');
    await waitFor(() => expect(container.textContent).toContain('PROVIDER-AD'));
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('Ad');
  });

  it('authenticated legacy slots stay suppressed pending approval', async () => {
    state.value = VALID;
    for (const slot of ['dashboard', 'reports', 'sidebar', 'footer'] as AdSlot[]) {
      const { container, unmount } = renderSlot(slot);
      await settle();
      expect(container.innerHTML).toBe('');
      unmount();
    }
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('Monetag Vignette remains OFF', () => {
    expect(MONETAG_VIGNETTE_ENABLED).toBe(false);
  });
});
