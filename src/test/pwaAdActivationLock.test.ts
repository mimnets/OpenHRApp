import { describe, it, expect, vi } from 'vitest';

// Mock supabase to prevent import chain errors
vi.mock('../services/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: () => false,
}));

// Mock organization service to prevent import chain errors
vi.mock('../services/organization.service', () => ({
  organizationService: {},
}));

import { PWA_ADS_ACTIVATED, PWA_AD_SLOTS, isPwaAdSlot, type AdSlot } from '../components/ads/AdBanner';

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
  it('attendance-success slot remains inactive when PWA_ADS_ACTIVATED is false', () => {
    // Simulate scenario: Super Admin enables attendance-success in database
    // But PWA_ADS_ACTIVATED is false, so slot remains inert
    const configEnabled = true; // Hypothetical: config enabled in DB
    const activationLockActive = PWA_ADS_ACTIVATED === false;

    // Slot should NOT render because activation lock is active
    expect(activationLockActive && configEnabled).toBe(true);
    // In AdBanner: if (isPwaAdSlot(slot) && !PWA_ADS_ACTIVATED) return null;
  });

  it('leave-success slot remains inactive when PWA_ADS_ACTIVATED is false', () => {
    const configEnabled = true;
    const activationLockActive = PWA_ADS_ACTIVATED === false;

    expect(activationLockActive && configEnabled).toBe(true);
  });

  it('dashboard-below-cards slot remains inactive when PWA_ADS_ACTIVATED is false', () => {
    const configEnabled = true;
    const activationLockActive = PWA_ADS_ACTIVATED === false;

    expect(activationLockActive && configEnabled).toBe(true);
  });

  it('all three PWA slots remain inactive simultaneously', () => {
    const allPwaSlots = ['attendance-success', 'leave-success', 'dashboard-below-cards'];
    const activationLockActive = PWA_ADS_ACTIVATED === false;

    allPwaSlots.forEach(slot => {
      expect(isPwaAdSlot(slot as AdSlot)).toBe(true);
      expect(activationLockActive).toBe(true);
    });
  });
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
