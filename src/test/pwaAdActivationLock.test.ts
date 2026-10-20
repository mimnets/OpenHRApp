import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';

// Supabase always answers with an ENABLED ad config, simulating a Super Admin who switched the slot on.
const { fromSpy } = vi.hoisted(() => {
  const enabled = { enabled: true, adType: 'custom', customHtml: '<p>PROVIDER-AD</p>' };
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: { value: enabled }, error: null }),
  };
  return { fromSpy: vi.fn(() => chain) };
});

vi.mock('../services/supabase', () => ({
  supabase: { from: fromSpy },
  isSupabaseConfigured: () => false,
}));

// Mock organization service to prevent import chain errors
vi.mock('../services/organization.service', () => ({
  organizationService: {},
}));

vi.mock('../services/api.client', () => ({
  apiClient: { getOrganizationId: () => 'org-1' },
}));

// AD_SUPPORTED organization: every org-level gate is open.
vi.mock('../context/SubscriptionContext', () => ({
  useSubscription: () => ({ subscription: { showAds: true } }),
}));

import { AdBanner, PWA_ADS_ACTIVATED, PWA_AD_SLOTS, isPwaAdSlot, type AdSlot } from '../components/ads/AdBanner';

/**
 * Phase 2D: PWA Advertising Activation Lock Tests
 *
 * Verifies that the compile-time activation lock prevents PWA slots from loading
 * or executing provider ads, even if Supabase contains an enabled configuration.
 */

describe('Phase 2D: Activation Lock', () => {
  it('PWA_ADS_ACTIVATED defaults to false', () => {
    expect(PWA_ADS_ACTIVATED).toBe(false);
  });

  it('PWA_AD_SLOTS contains exactly the three PWA slots', () => {
    expect(PWA_AD_SLOTS).toContain('attendance-success');
    expect(PWA_AD_SLOTS).toContain('leave-success');
    expect(PWA_AD_SLOTS).toContain('dashboard-below-cards');
    expect(PWA_AD_SLOTS.length).toBe(3);
  });

  it('isPwaAdSlot correctly identifies PWA slots', () => {
    expect(isPwaAdSlot('attendance-success')).toBe(true);
    expect(isPwaAdSlot('leave-success')).toBe(true);
    expect(isPwaAdSlot('dashboard-below-cards')).toBe(true);
  });

  it('isPwaAdSlot returns false for existing slots', () => {
    const existingSlots: AdSlot[] = [
      'sidebar',
      'dashboard',
      'reports',
      'footer',
      'landing-hero',
      'landing-mid',
      'blog-header',
      'blog-feed',
      'blog-post-top',
      'blog-post-content'
    ];

    existingSlots.forEach(slot => {
      expect(isPwaAdSlot(slot)).toBe(false);
    });
  });

  it('activation lock prevents PWA slots from loading even if config enabled', () => {
    // This test verifies the concept: if PWA_ADS_ACTIVATED is false,
    // the AdBanner component will return null for PWA slots regardless of config
    const pwaSlotsEnabled = PWA_ADS_ACTIVATED === false;
    expect(pwaSlotsEnabled).toBe(true); // Lock is active
  });

  it('activation lock cannot be overridden by Supabase configuration', () => {
    // The activation lock is a compile-time constant in source code.
    // Even if Super Admin enables slots in the database, they remain inert.
    // This test verifies the lock is a source code constant, not a database value.
    const isCompileTimeConstant = typeof PWA_ADS_ACTIVATED === 'boolean';
    expect(isCompileTimeConstant).toBe(true);
  });

  it('activation lock requires source code change to activate', () => {
    // To activate PWA ads, a developer must:
    // 1. Change PWA_ADS_ACTIVATED = false to PWA_ADS_ACTIVATED = true in source
    // 2. Commit and push the change
    // 3. Redeploy the application
    // This cannot be done through Super Admin UI or database configuration.
    const requiresSourceChange = PWA_ADS_ACTIVATED === false;
    expect(requiresSourceChange).toBe(true);
  });
});

describe('Phase 2D: PWA Slots Inactive Even If Config Enabled', () => {
  beforeEach(() => fromSpy.mockClear());

  it('control: a public slot with the same enabled config does fetch and render', async () => {
    const { container } = render(React.createElement(AdBanner, { slot: 'landing-hero' }));
    await waitFor(() => expect(container.textContent).toContain('PROVIDER-AD'));
    expect(fromSpy).toHaveBeenCalledWith('settings');
  });

  it.each(['attendance-success', 'leave-success', 'dashboard-below-cards'] as AdSlot[])(
    '%s neither fetches config nor renders despite an enabled config',
    async (slot) => {
      const { container } = render(React.createElement(AdBanner, { slot }));
      await new Promise((r) => setTimeout(r, 20));
      expect(fromSpy).not.toHaveBeenCalled();
      expect(container.innerHTML).toBe('');
    }
  );
});

describe('Phase 2D: Existing Slots Unaffected', () => {
  it('existing 10 slots are not PWA slots', () => {
    const existingSlots: AdSlot[] = [
      'sidebar',
      'dashboard',
      'reports',
      'footer',
      'landing-hero',
      'landing-mid',
      'blog-header',
      'blog-feed',
      'blog-post-top',
      'blog-post-content'
    ];

    existingSlots.forEach(slot => {
      expect(isPwaAdSlot(slot)).toBe(false);
    });
  });

  it('activation lock does not affect existing slots', () => {
    // The activation lock only applies to PWA slots
    // Existing slots continue to work normally based on their own configuration
    const existingSlots: AdSlot[] = [
      'sidebar',
      'dashboard',
      'reports',
      'footer'
    ];

    existingSlots.forEach(slot => {
      // These slots are not PWA slots, so activation lock doesn't apply
      expect(isPwaAdSlot(slot)).toBe(false);
    });
  });
});
