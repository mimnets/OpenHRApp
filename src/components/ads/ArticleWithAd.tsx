import React from 'react';
import { sanitizeHtml } from '../../utils/sanitize';
import { AdFrame, AdPlacement } from './AdBanner';

/**
 * Split article HTML between two top-level blocks near the middle of its text, so an ad can sit
 * between paragraphs. Returns null for short articles (fewer than `minBlocks` top-level elements),
 * which then get no in-article ad. Splitting on parsed top-level nodes never cuts a tag in half.
 */
export function splitHtmlInHalf(html: string, minBlocks = 6): [string, string] | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.childNodes);
  if (nodes.filter(n => n.nodeType === Node.ELEMENT_NODE).length < minBlocks) return null;
  const half = (doc.body.textContent ?? '').length / 2;
  let seen = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    seen += nodes[i].textContent?.length ?? 0;
    if (seen >= half && nodes[i].nodeType === Node.ELEMENT_NODE) {
      const first = doc.createElement('div');
      const second = doc.createElement('div');
      nodes.slice(0, i + 1).forEach(n => first.appendChild(n));
      nodes.slice(i + 1).forEach(n => second.appendChild(n));
      return [first.innerHTML, second.innerHTML];
    }
  }
  return null;
}

/** Article body with one ad frame between paragraphs near the middle (long articles only). */
export const ArticleWithAd: React.FC<{ html: string; className: string; placement: AdPlacement }> = ({ html, className, placement }) => {
  const clean = sanitizeHtml(html);
  const halves = splitHtmlInHalf(clean);
  if (!halves) return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
  return (
    <>
      {/* Each half is sanitized again: it is re-serialized markup, not the string DOMPurify returned. */}
      <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(halves[0]) }} />
      <AdFrame placement={placement} className="my-8" />
      <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(halves[1]) }} />
    </>
  );
};
