import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../services/supabase', () => ({ supabase: {}, isSupabaseConfigured: () => false }));

import { splitHtmlInHalf } from '../ArticleWithAd';

const para = (n: number) => Array.from({ length: n }, (_, i) => `<p>Paragraph ${i} with some words.</p>`).join('');

describe('splitHtmlInHalf', () => {
  it('leaves short articles whole', () => {
    expect(splitHtmlInHalf(para(5))).toBeNull();
  });

  it('splits between top-level blocks near the middle without losing content', () => {
    const html = para(10);
    const halves = splitHtmlInHalf(html)!;
    expect(halves).not.toBeNull();
    expect(halves[0] + halves[1]).toBe(html);
    expect(halves[0]).toMatch(/<\/p>$/);
    expect(halves[1]).toMatch(/^<p>/);
    expect((halves[0].match(/<p>/g) ?? []).length).toBe(5);
  });

  it('never cuts inside a nested element', () => {
    const html = `${para(3)}<ul>${'<li>item text</li>'.repeat(20)}</ul>${para(3)}`;
    const halves = splitHtmlInHalf(html)!;
    expect(halves[0] + halves[1]).toBe(html);
    for (const h of halves) {
      expect((h.match(/<ul>/g) ?? []).length).toBe((h.match(/<\/ul>/g) ?? []).length);
    }
  });
});
