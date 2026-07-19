/**
 * Estimates reading time based on word count.
 * Assumes an average reading speed of 200 words per minute.
 * Returns at least "1 min read" for any non-empty content.
 */
export function getReadingTime(content: string | null | undefined): string {
  if (!content) return '1 min read';
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) return '1 min read';
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}
