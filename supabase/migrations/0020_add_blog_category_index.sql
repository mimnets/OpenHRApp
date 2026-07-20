-- Add index on category column for faster distinct queries and filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);
