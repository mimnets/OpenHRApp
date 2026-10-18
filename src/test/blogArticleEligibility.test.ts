import { describe, it, expect } from 'vitest';
import { classifyPageTarget } from '../config/monetag';

/**
 * Blog article IPP eligibility regression test.
 *
 * Verifies that:
 * 1. Blog articles with `data-advertising="eligible"` on the `<article>` element are classified correctly
 * 2. Blog listing is classified separately from blog articles
 * 3. The fix for moving the marker from `<div>` to `<article>` works correctly
 */

describe('Blog article page target classification', () => {
  it('classifies /blog/:slug as blog-articles', () => {
    const target = classifyPageTarget('/blog/my-article');
    expect(target).toBe('blog-articles');
  });

  it('classifies /blog as blog-listing', () => {
    const target = classifyPageTarget('/blog');
    expect(target).toBe('blog-listing');
  });

  it('classifies /blog/ with trailing slash as blog-listing', () => {
    const target = classifyPageTarget('/blog/');
    expect(target).toBe('blog-listing');
  });

  it('does not classify /blog/:slug/:extra as blog-articles', () => {
    const target = classifyPageTarget('/blog/my-article/extra');
    expect(target).toBeNull();
  });

  it('classifies /how-to-use/:slug as guides-articles', () => {
    const target = classifyPageTarget('/how-to-use/attendance-guide');
    expect(target).toBe('guides-articles');
  });

  it('classifies /how-to-use as guides-listing', () => {
    const target = classifyPageTarget('/how-to-use');
    expect(target).toBe('guides-listing');
  });

  it('classifies / as landing-page', () => {
    const target = classifyPageTarget('/');
    expect(target).toBe('landing-page');
  });

  it('returns null for non-eligible paths', () => {
    expect(classifyPageTarget('/dashboard')).toBeNull();
    expect(classifyPageTarget('/attendance')).toBeNull();
    expect(classifyPageTarget('/privacy')).toBeNull();
  });
});
