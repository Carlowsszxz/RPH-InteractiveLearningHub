-- Restore script for `posts` table
-- Run this in Supabase SQL Editor if you can't restore from backups.
-- WARNING: This will recreate the table structure only (no historical data).

CREATE TABLE IF NOT EXISTS posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id integer,
    content text,
    author_id uuid,
    author_name text,
    author_email text,
    author_avatar_url text,
    likes_count integer DEFAULT 0,
    comments_count integer DEFAULT 0,
    shares_count integer DEFAULT 0,
    image_url text,
    video_url text,
    poll_data jsonb,
    shared_by_id uuid,
    shared_by_name text,
    created_at timestamptz DEFAULT timezone('utc', now()),
    updated_at timestamptz DEFAULT timezone('utc', now())
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_topic_id ON posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);

-- Optional: set up trigger to update updated_at if you have update_updated_at_column() function
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        PERFORM 1;
        -- Create trigger only if it does not exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'update_posts_updated_at'
        ) THEN
            CREATE TRIGGER update_posts_updated_at
                BEFORE UPDATE ON posts
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END IF;
END$$;

-- Row Level Security: enable if you use RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Example RLS policy: everyone can select
CREATE POLICY IF NOT EXISTS "Anyone can view posts"
    ON posts FOR SELECT
    USING (true);

-- Allow authenticated users to insert posts (if using auth.uid())
CREATE POLICY IF NOT EXISTS "Users can insert posts"
    ON posts FOR INSERT
    WITH CHECK (auth.uid() = author_id);

-- Allow users to update/delete only their own posts
CREATE POLICY IF NOT EXISTS "Users can update own posts"
    ON posts FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY IF NOT EXISTS "Users can delete own posts"
    ON posts FOR DELETE
    USING (auth.uid() = author_id);

-- NOTE: If you have related tables (comments, post_likes, polls_votes) you may need to recreate them too.
-- Check your Supabase project Backups page to restore data instead of recreating the table if you need historical rows.
