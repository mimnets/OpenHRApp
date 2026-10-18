import { describe, it, expect } from 'vitest';
import { classifyRoute, type RouteFacts } from '../config/monetag';

/**
 * Listing and landing page eligibility tests.
 *
 * Verifies that the three public listing/landing pages are correctly classified
 * as 'public-content' when React has resolved them as public content:
 * - Homepage `/`
 * - Guides listing `/how-to-use`
 * - Blog listing `/blog`
 */

const baseFacts: RouteFacts = {
  pathname: '/',
  hash: '',
  search: '',
  isConfigured: true,
  hasVerificationToken: false,
  passwordResetRequested: false,
  registerViewRequested: false,
  landingHidden: false,
  hasSession: false,
  publicContentActive: true,
};

describe('listing and landing page route classification', () => {
  it('classifies homepage / as public-content when publicContentActive is true', () => {
    const facts = { ...baseFacts, pathname: '/' };
    const result = classifyRoute(facts);
    expect(result).toBe('public-content');
  });

  it('classifies /how-to-use as public-content when publicContentActive is true', () => {
    const facts = { ...baseFacts, pathname: '/how-to-use' };
    const result = classifyRoute(facts);
    expect(result).toBe('public-content');
  });

  it('classifies /blog as public-content when publicContentActive is true', () => {
    const facts = { ...baseFacts, pathname: '/blog' };
    const result = classifyRoute(facts);
    expect(result).toBe('public-content');
  });

  it('classifies homepage / as auth-flow when landing is hidden and no public content', () => {
    const facts = { ...baseFacts, pathname: '/', landingHidden: true, publicContentActive: false };
    const result = classifyRoute(facts);
    expect(result).toBe('auth-flow');
  });

  it('classifies /how-to-use as non-public when publicContentActive is false', () => {
    const facts = { ...baseFacts, pathname: '/how-to-use', publicContentActive: false };
    const result = classifyRoute(facts);
    expect(result).toBe('non-public');
  });

  it('classifies /blog as non-public when publicContentActive is false', () => {
    const facts = { ...baseFacts, pathname: '/blog', publicContentActive: false };
    const result = classifyRoute(facts);
    expect(result).toBe('non-public');
  });

  it('still classifies article details as public-content', () => {
    const facts = { ...baseFacts, pathname: '/how-to-use/attendance-guide' };
    const result = classifyRoute(facts);
    expect(result).toBe('public-content');
  });

  it('still classifies blog articles as public-content', () => {
    const facts = { ...baseFacts, pathname: '/blog/my-article' };
    const result = classifyRoute(facts);
    expect(result).toBe('public-content');
  });

  it('still blocks authenticated users', () => {
    const facts = { ...baseFacts, pathname: '/', hasSession: true };
    const result = classifyRoute(facts);
    expect(result).toBe('authenticated-app');
  });

  it('still blocks auth flows', () => {
    const facts = { ...baseFacts, pathname: '/', isConfigured: false };
    const result = classifyRoute(facts);
    expect(result).toBe('auth-flow');
  });

  it('still blocks non-advertising pages like /privacy', () => {
    const facts = { ...baseFacts, pathname: '/privacy' };
    const result = classifyRoute(facts);
    expect(result).toBe('non-public');
  });

  it('still blocks non-advertising pages like /features', () => {
    const facts = { ...baseFacts, pathname: '/features' };
    const result = classifyRoute(facts);
    expect(result).toBe('non-public');
  });
});
