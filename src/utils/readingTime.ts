/**
 * Strip HTML tags and compute the number of minutes needed to read
 * the text content at 200 words per minute. Returns at least 1.
 * Use this at create/update time to store reading_time in the DB.
 */
export function getReadingMinutes(html: string | null | undefined): number {
  if (!html) return 1;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 1;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

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
