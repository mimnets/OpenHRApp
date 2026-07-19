-- Add reading_time column to blog_posts for pre-computed read time
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS reading_time INTEGER NOT NULL DEFAULT 1;

-- Backfill existing posts: strip HTML tags, count words, divide by 200 wpm
UPDATE public.blog_posts
SET reading_time = GREATEST(1, CEIL(
  array_length(
    regexp_split_to_array(
      regexp_replace(
        regexp_replace(content, '<[^>]+>', ' ', 'g'),
        '\s+',
        ' ',
        'g'
      ),
      ' '
    ),
    1
  ) / 200.0
))
WHERE content IS NOT NULL AND content != '';
