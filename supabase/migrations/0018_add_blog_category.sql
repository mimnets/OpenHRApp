-- Add category column to blog_posts for content organization
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS category text;
