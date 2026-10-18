import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hasPageAdvertisingOptIn } from '../utils/monetagLoader';

/**
 * DOM opt-in marker tests for listing and landing pages.
 *
 * Verifies that hasPageAdvertisingOptIn() accepts the opt-in markers on:
 * - Homepage: <main data-advertising="eligible">
 * - Guides listing: <div data-advertising="eligible">
 * - Blog listing: <div data-advertising="eligible">
 * - Article pages: <article data-advertising="eligible"> (existing behavior)
 */

describe('DOM opt-in marker acceptance', () => {
  beforeEach(() => {
    // Clear the DOM before each test
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up after each test
    document.body.innerHTML = '';
  });

  it('accepts article element with opt-in marker (existing behavior)', () => {
    const article = document.createElement('article');
    article.setAttribute('data-advertising', 'eligible');
    document.body.appendChild(article);

    expect(hasPageAdvertisingOptIn()).toBe(true);
  });

  it('accepts main element with opt-in marker (homepage)', () => {
    const main = document.createElement('main');
    main.setAttribute('data-advertising', 'eligible');
    document.body.appendChild(main);

    expect(hasPageAdvertisingOptIn()).toBe(true);
  });

  it('accepts div element with opt-in marker (listing pages)', () => {
    const div = document.createElement('div');
    div.setAttribute('data-advertising', 'eligible');
    document.body.appendChild(div);

    expect(hasPageAdvertisingOptIn()).toBe(true);
  });

  it('rejects element without opt-in marker', () => {
    const article = document.createElement('article');
    document.body.appendChild(article);

    expect(hasPageAdvertisingOptIn()).toBe(false);
  });

  it('rejects element with wrong data-advertising value', () => {
    const article = document.createElement('article');
    article.setAttribute('data-advertising', 'disabled');
    document.body.appendChild(article);

    expect(hasPageAdvertisingOptIn()).toBe(false);
  });

  it('rejects empty body', () => {
    expect(hasPageAdvertisingOptIn()).toBe(false);
  });

  it('accepts nested opt-in marker', () => {
    const container = document.createElement('div');
    const article = document.createElement('article');
    article.setAttribute('data-advertising', 'eligible');
    container.appendChild(article);
    document.body.appendChild(container);

    expect(hasPageAdvertisingOptIn()).toBe(true);
  });

  it('accepts first matching element when multiple exist', () => {
    const div1 = document.createElement('div');
    div1.setAttribute('data-advertising', 'eligible');
    document.body.appendChild(div1);

    const div2 = document.createElement('div');
    div2.setAttribute('data-advertising', 'eligible');
    document.body.appendChild(div2);

    expect(hasPageAdvertisingOptIn()).toBe(true);
  });
});
