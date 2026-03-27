-- View to return forum posts with author name and avatar in a single query
-- This avoids N+1 lookups from the client and speeds up feed rendering.

CREATE OR REPLACE VIEW public.forum_posts_with_authors AS
SELECT
  p.id,
  p.topic_id,
  p.author_id,
  p.author_email,
  p.content,
  p.created_at,
  COALESCE(up.full_name, u.full_name, p.author_name) AS author_name,
  COALESCE(up.avatar_url, u.avatar_url, '') AS author_avatar
FROM public.forum_posts p
LEFT JOIN public.user_profiles up ON up.id = p.author_id
LEFT JOIN public.users u ON u.id = p.author_id;

-- Index to speed up topic-based feeds ordered by created_at (key for pagination)
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic_created ON public.forum_posts (topic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON public.forum_posts (author_id);

-- Optional: If the join is expensive and posts don't change often, create a materialized view instead:
-- CREATE MATERIALIZED VIEW public.forum_posts_mview AS
-- SELECT ...same query as above...;
-- Then schedule `REFRESH MATERIALIZED VIEW public.forum_posts_mview;` as needed (cron or trigger).

-- Note: Apply these statements in your database (Supabase SQL editor or psql). The view name used in frontend is `forum_posts_with_authors`.
