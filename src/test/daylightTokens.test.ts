import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The Daylight token contract.
 *
 * Daylight applies to the 12 public pages; the logged-in app keeps its own
 * --primary set. Both live in src/index.css, which is why every token here is
 * --dl- prefixed — the two systems coexist rather than one replacing the other.
 *
 * These tests exist because the contrast figures quoted in the design were
 * measured, and a comment claiming "5.9:1" rots the moment somebody nudges a
 * hex. Here the ratios are recomputed from the stylesheet on every run.
 */

const css = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf8');

/** Pull a custom property from a specific block of the stylesheet. */
function token(name: string, scope: 'light' | 'dark'): string {
  const start = scope === 'light' ? css.indexOf(':root {\n  /* — surface — */') : css.indexOf('html.dark {');
  expect(start, `${scope} token block not found`).toBeGreaterThan(-1);
  const block = css.slice(start, css.indexOf('\n}', start));
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(block);
  expect(m, `--${name} missing from the ${scope} block`).not.toBeNull();
  return m![1].trim();
}

const srgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));

const luminance = (hex: string) => {
  const [r, g, b] = srgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const AA_NORMAL = 4.5;

describe('Daylight tokens exist in both palettes', () => {
  const required = [
    'dl-ground', 'dl-surface', 'dl-surface-2', 'dl-hair', 'dl-hair-soft',
    'dl-ink', 'dl-muted', 'dl-soft',
    'dl-teal', 'dl-teal-deep',
    'dl-dawn', 'dl-noon', 'dl-dusk',
    'dl-lift-1', 'dl-lift-2',
  ];

  it.each(required)('%s is defined in light', (name) => {
    expect(token(name, 'light')).toMatch(/\S/);
  });

  it.each(required)('%s is defined in dark', (name) => {
    expect(token(name, 'dark')).toMatch(/\S/);
  });

  it('shape tokens are light-only — radius does not change with theme', () => {
    expect(token('dl-r-sm', 'light')).toBe('8px');
    expect(token('dl-r-md', 'light')).toBe('14px');
    expect(token('dl-r-lg', 'light')).toBe('22px');
  });
});

/**
 * The two fixed colours. Every other token flips with the theme, and the bugs
 * these were introduced to fix both came from pairing something that flips with
 * something that does not:
 *
 *   - the footer slab is dark in BOTH themes, so the wordmark on it was
 *     text-dl-ink on --dl-ink in light mode — 1.0:1, invisible;
 *   - the Buy Me a Coffee button's #FFDD00 never inverts, so text-dl-ink on it
 *     was near-white on yellow in dark mode — 1.1:1.
 *
 * If html.dark ever redefines either, both bugs come straight back, so these
 * tests assert the absence as firmly as the values.
 */
describe('the fixed colours stay fixed', () => {
  const darkBlock = css.slice(css.indexOf('html.dark {'), css.indexOf('\n}', css.indexOf('html.dark {')));

  it.each(['dl-teal-slab', 'dl-ink-fixed'])('--%s is defined in light', (name) => {
    expect(token(name, 'light')).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it.each(['dl-teal-slab', 'dl-ink-fixed'])('--%s is never redefined in dark', (name) => {
    expect(darkBlock).not.toContain(`--${name}:`);
  });

  it('--dl-teal-slab clears AA large on both slab colours', () => {
    const slab = token('dl-teal-slab', 'light');
    // light-mode footer slab is --dl-ink; dark-mode footer slab is --dl-ground
    expect(contrast(slab, token('dl-ink', 'light'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(slab, token('dl-ground', 'dark'))).toBeGreaterThanOrEqual(4.5);
  });

  it('the wordmark colour it replaced would have failed — this is why it exists', () => {
    expect(contrast(token('dl-teal', 'light'), token('dl-ink', 'light'))).toBeLessThan(3);
  });

  it('--dl-ink-fixed clears AA on the Buy Me a Coffee yellow in both themes', () => {
    expect(contrast(token('dl-ink-fixed', 'light'), '#FFDD00')).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('the footer wordmark uses the slab pair, not the surface pair', () => {
    const shell = fs.readFileSync(path.resolve(__dirname, '../components/shared/daylightShell.ts'), 'utf8');
    expect(shell).toContain('wordOnSlab');
    expect(shell).toContain('wordAccentOnSlab');
    for (const footer of ['landing/Footer', 'blog/BlogFooter', 'tutorials/TutorialsFooter']) {
      const src = fs.readFileSync(path.resolve(__dirname, `../components/${footer}.tsx`), 'utf8');
      expect(src, `${footer} must not put ink on the ink slab`).not.toMatch(/dlBrand\.wordInk|dlBrand\.wordAccent\b/);
    }
  });
});

/**
 * BlogSidebar renders on /blog and /blog/:slug. It was missed by the DL5 pass
 * and stayed on the app's --primary palette, which put indigo chips and 3.1:1
 * dates next to Daylight cards.
 */
describe('the public blog surface carries no app palette', () => {
  it('BlogSidebar uses Daylight tokens only', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../components/blog/BlogSidebar.tsx'), 'utf8');
    expect(src).not.toMatch(/\b(?:bg|text|border)-slate-\d/);
    expect(src).not.toMatch(/\b(?:bg|text)-primary\b/);
    expect(src).not.toMatch(/\btext-white\b/);
  });
});

describe('text tokens clear WCAG AA on their own surface', () => {
  it.each([
    ['ink', 'dl-ink'],
    ['muted', 'dl-muted'],
    ['teal', 'dl-teal'],
  ])('light: %s on --dl-surface', (_label, name) => {
    const ratio = contrast(token(name, 'light'), token('dl-surface', 'light'));
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it.each([
    ['ink', 'dl-ink'],
    ['muted', 'dl-muted'],
    ['teal', 'dl-teal'],
  ])('dark: %s on --dl-surface', (_label, name) => {
    const ratio = contrast(token(name, 'dark'), token('dl-surface', 'dark'));
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('text tokens also clear AA on the page ground, not just on cards', () => {
    for (const scope of ['light', 'dark'] as const) {
      for (const name of ['dl-ink', 'dl-muted', 'dl-teal']) {
        expect(contrast(token(name, scope), token('dl-ground', scope))).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    }
  });
});

describe('--dl-soft is decorative and must stay that way', () => {
  it('is below AA, which is why it is reserved for hairlines and ticks', () => {
    // Not a defect — a deliberate low-contrast value. The test records the
    // intent so nobody "fixes" it into a text colour later.
    expect(contrast(token('dl-soft', 'light'), token('dl-surface', 'light'))).toBeLessThan(AA_NORMAL);
  });

  it('is documented as non-text at its definition', () => {
    expect(css).toMatch(/never text\.\s*\*\/\s*\n\s*--dl-soft:/);
  });
});

describe('the day gradient stays out of the general palette', () => {
  it('dawn, noon and dusk are defined but carry a reservation comment', () => {
    expect(css).toMatch(/Only inside the arc, the logo mark, and the ring that spins/);
    for (const name of ['dl-dawn', 'dl-noon', 'dl-dusk']) {
      expect(token(name, 'light')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  /**
   * The reservation is only worth the comment if something checks it. In the
   * stylesheet the three hues may appear in exactly two roles — their own
   * definitions, and the .dl-cta-ring gradient that spins around the demo
   * button — plus the arc component, which owns the gradient outright.
   */
  it('nothing outside the arc and the CTA ring reaches for the day hues', () => {
    const uses = css
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      // `--color-dl-dawn: var(--dl-dawn)` in @theme is the Tailwind registration,
      // not a use of the hue — the test above covers what that may expose.
      .filter((l) => /var\(--dl-(dawn|noon|dusk)\)/.test(l.line) && !l.line.startsWith('--color-dl-'));

    expect(uses.length, 'the ring gradient should still reference all three hues').toBeGreaterThan(0);

    // every remaining use must sit inside the .dl-cta-ring rules
    const ringBlock = css.slice(css.indexOf('.dl-cta-ring {'), css.indexOf('/* The halo.'));
    for (const u of uses) {
      expect(ringBlock, `src/index.css:${u.n} uses a day hue outside .dl-cta-ring: ${u.line}`).toContain(u.line);
    }
  });

  it('the demo button ring never animates a text colour', () => {
    const ring = css.slice(css.indexOf('@keyframes dl-cta-ring-spin'), css.indexOf('/* The halo.'));
    expect(ring).not.toMatch(/^\s*color:/m);
  });

  it('is not registered as a Tailwind background utility by accident', () => {
    // The gradient belongs to one component. Exposing bg-dl-dawn would make it
    // one autocomplete away from appearing on a button.
    const theme = css.slice(css.indexOf('@theme {'), css.indexOf('\n}', css.indexOf('@theme {')));
    expect(theme).toContain('--color-dl-teal');
  });
});

describe('elevation is always two layers', () => {
  it.each(['light', 'dark'] as const)('%s: both lift tokens stack a contact and a soft shadow', (scope) => {
    // A single blurred drop shadow is the most reliable tell of an interface
    // nobody looked at closely.
    for (const name of ['dl-lift-1', 'dl-lift-2']) {
      expect(token(name, scope).split('),').length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('the app keeps its own tokens', () => {
  it('--primary is untouched, so the logged-in app is unaffected', () => {
    expect(css).toContain('--primary: #4a6fa5;');
    expect(css).toContain('--primary-hover: #3b5d8c;');
  });

  it('no Daylight token overwrites a --primary one', () => {
    expect(css).not.toMatch(/--primary:\s*var\(--dl-/);
  });
});

describe('Daylight typography', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');

  it.each(['dl-font-display', 'dl-font-body', 'dl-font-mono'])('%s declares a real fallback stack', (name) => {
    // A face that fails to load and falls back to an unstyled default is how a
    // type system quietly evaporates in production.
    const stack = token(name, 'light');
    expect(stack.split(',').length).toBeGreaterThanOrEqual(3);
    expect(stack).toMatch(/sans-serif|monospace$/);
  });

  it('every declared family is actually requested from Google Fonts', () => {
    const requested = [...html.matchAll(/family=([A-Za-z+]+):wght@/g)].map((m) => m[1].replace(/\+/g, ' '));
    for (const name of ['dl-font-display', 'dl-font-body', 'dl-font-mono']) {
      const primary = token(name, 'light').split(',')[0].replace(/"/g, '').trim();
      expect(requested, `${primary} is declared but never loaded`).toContain(primary);
    }
  });

  it('loads fonts in a single non-blocking request', () => {
    // Each extra stylesheet request is a round trip on the pages search engines
    // actually land on.
    const links = [...html.matchAll(/fonts\.googleapis\.com\/css2[^"]*/g)];
    const unique = new Set(links.map((m) => m[0]));
    expect(unique.size).toBe(1);
    expect(html).toContain('display=swap');
  });

  it('does not ship Inter weights the app never uses', () => {
    // Audited: only font-medium (500), font-semibold (600) and font-bold (700)
    // appear in src/, plus 400 as the body default.
    const inter = /family=Inter:wght@([0-9;]+)/.exec(html)?.[1].split(';') ?? [];
    expect(inter).toEqual(['400', '500', '600', '700']);
  });

  it('the scale is ordered and starts at the small end', () => {
    const rem = (n: string) => parseFloat(token(n, 'light'));
    const scale = ['dl-text-xs', 'dl-text-sm', 'dl-text-base', 'dl-text-lg',
                   'dl-text-xl', 'dl-text-2xl', 'dl-text-3xl', 'dl-text-4xl'].map(rem);
    expect(scale).toEqual([...scale].sort((a, b) => a - b));
    expect(scale[0]).toBeLessThan(1);
  });

  it('display sizes carry negative tracking, labels carry positive', () => {
    expect(parseFloat(token('dl-track-display', 'light'))).toBeLessThan(0);
    expect(parseFloat(token('dl-track-head', 'light'))).toBeLessThan(0);
    expect(parseFloat(token('dl-track-label', 'light'))).toBeGreaterThan(0);
  });
});
