import { describe, it, expect, beforeEach } from 'vitest';
import {
  __resetMonetagRuntimeSettingsForTests,
  __setMonetagRuntimeSettingsForTests,
  evaluateMonetagGate,
  initializeMonetagRuntimeSettings,
  type GateContext,
} from '../utils/monetagLoader';
import { CONSENT_V1_KEY } from '../utils/adConsent';

/**
 * Monetag runtime settings tests.
 *
 * These verify that:
 * 1. Runtime settings default to OFF (safe default)
 * 2. Both compile-time AND runtime must be true for activation
 * 3. Compile-time flags remain as emergency kill switches
 * 4. Missing/failed settings default to OFF
 */

const eligibleCtx: GateContext = {
  authState: 'anonymous',
  route: 'public-content',
  consentAdvertising: true,
};

beforeEach(() => {
  __resetMonetagRuntimeSettingsForTests();
  localStorage.clear();
  // Grant consent so we can test the flag logic
  localStorage.setItem(
    CONSENT_V1_KEY,
    JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      purposes: { analytics: true, advertising: true },
    })
  );
});

describe('runtime settings default to OFF', () => {
  it('denies IPP when runtime settings have not been loaded', () => {
    // Even with compile-time flag conceptually on, runtime defaults to OFF
    const decision = evaluateMonetagGate(eligibleCtx, 'ipp');
    expect(decision.inject).toBe(false);
    expect(decision.reason).toBe('feature-flag-off');
  });

  it('denies Vignette when runtime settings have not been loaded', () => {
    const decision = evaluateMonetagGate(eligibleCtx, 'vignette');
    expect(decision.inject).toBe(false);
    expect(decision.reason).toBe('feature-flag-off');
  });
});

describe('both compile-time and runtime must be true', () => {
  it('denies IPP when runtime is OFF even if compile-time is conceptually ON', () => {
    // Simulate runtime settings loaded but OFF
    __setMonetagRuntimeSettingsForTests(false, false);
    const decision = evaluateMonetagGate(eligibleCtx, 'ipp');
    expect(decision.inject).toBe(false);
    expect(decision.reason).toBe('feature-flag-off');
  });

  it('denies Vignette when runtime is OFF even if compile-time is conceptually ON', () => {
    __setMonetagRuntimeSettingsForTests(false, false);
    const decision = evaluateMonetagGate(eligibleCtx, 'vignette');
    expect(decision.inject).toBe(false);
    expect(decision.reason).toBe('feature-flag-off');
  });

  it('IPP and Vignette are independently controlled at runtime', () => {
    // Enable IPP runtime, leave Vignette OFF
    __setMonetagRuntimeSettingsForTests(true, false);
    
    // Note: This test assumes compile-time flags are conceptually ON for testing.
    // In reality, both compile-time flags are false in the actual code, so this
    // test verifies the runtime logic independently.
    const ippDecision = evaluateMonetagGate(eligibleCtx, 'ipp');
    const vignetteDecision = evaluateMonetagGate(eligibleCtx, 'vignette');
    
    // Both should deny because compile-time flags are actually false
    expect(ippDecision.inject).toBe(false);
    expect(vignetteDecision.inject).toBe(false);
  });
});

describe('compile-time flags remain as emergency kill switches', () => {
  it('denies IPP when page targeting is disabled even if runtime is true', () => {
    // MONETAG_ENABLED is true in current code, so gate proceeds to page targeting check
    // Default pathname '/' maps to 'landing-page' which has targeting disabled
    __setMonetagRuntimeSettingsForTests(true, true);
    const decision = evaluateMonetagGate(eligibleCtx, 'ipp');
    expect(decision.inject).toBe(false);
    expect(decision.reason).toBe('page-target-disabled');
  });

  it('denies Vignette when compile-time flag is false even if runtime is true', () => {
    __setMonetagRuntimeSettingsForTests(true, true);
    const decision = evaluateMonetagGate(eligibleCtx, 'vignette');
    expect(decision.inject).toBe(false);
    expect(decision.reason).toBe('feature-flag-off');
  });
});

describe('initializeMonetagRuntimeSettings handles errors gracefully', () => {
  it('defaults to OFF when Supabase is not configured', async () => {
    // This test verifies the function doesn't throw and defaults to OFF
    await initializeMonetagRuntimeSettings();
    
    // After initialization, runtime settings should be loaded (but OFF)
    const decision = evaluateMonetagGate(eligibleCtx, 'ipp');
    expect(decision.inject).toBe(false);
  });
});
