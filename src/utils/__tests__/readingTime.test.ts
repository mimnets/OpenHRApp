import { describe, it, expect } from 'vitest';
import { getReadingMinutes, getReadingTime } from '../readingTime';

describe('getReadingMinutes', () => {
  it('returns 1 for null input', () => {
    expect(getReadingMinutes(null)).toBe(1);
  });

  it('returns 1 for undefined input', () => {
    expect(getReadingMinutes(undefined)).toBe(1);
  });

  it('returns 1 for empty string', () => {
    expect(getReadingMinutes('')).toBe(1);
  });

  it('returns 1 for HTML with no text content', () => {
    expect(getReadingMinutes('<div></div>')).toBe(1);
  });

  it('strips HTML tags and counts words', () => {
    // 200 words → exactly 1 minute
    const words = Array(200).fill('word').join(' ');
    const html = `<p>${words}</p>`;
    expect(getReadingMinutes(html)).toBe(1);
  });

  it('rounds up to the next minute', () => {
    // 201 words → 2 minutes (ceil(201/200) = 2)
    const words = Array(201).fill('word').join(' ');
    expect(getReadingMinutes(`<p>${words}</p>`)).toBe(2);
  });

  it('returns 1 for a short sentence', () => {
    expect(getReadingMinutes('<p>Hello world</p>')).toBe(1);
  });

  it('handles nested HTML', () => {
    const html = '<div><p>First paragraph.</p><p>Second paragraph.</p></div>';
    expect(getReadingMinutes(html)).toBe(1); // only 4 words
  });
});

describe('getReadingTime', () => {
  it('returns "1 min read" for null input', () => {
    expect(getReadingTime(null)).toBe('1 min read');
  });

  it('returns "1 min read" for undefined input', () => {
    expect(getReadingTime(undefined)).toBe('1 min read');
  });

  it('returns "1 min read" for empty string', () => {
    expect(getReadingTime('')).toBe('1 min read');
  });

  it('returns "1 min read" for whitespace-only string', () => {
    expect(getReadingTime('   ')).toBe('1 min read');
  });

  it('returns formatted reading time for content', () => {
    // 400 words → 2 min read
    const words = Array(400).fill('word').join(' ');
    expect(getReadingTime(words)).toBe('2 min read');
  });

  it('returns "1 min read" for very short content', () => {
    expect(getReadingTime('Just a few words here')).toBe('1 min read');
  });
});
