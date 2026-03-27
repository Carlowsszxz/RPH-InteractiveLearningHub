-- ================================================
-- TIMELINE QUEST GAME - DATABASE SETUP
-- ================================================
-- Run this SQL in your Supabase SQL Editor to set up Timeline Quest leaderboard
-- ================================================

-- ================================================
-- TIMELINE QUEST GAME SCORES TABLE
-- ================================================

-- Table: Timeline Quest Game Scores
CREATE TABLE IF NOT EXISTS timeline_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 10,
    accuracy DECIMAL(5, 2) NOT NULL DEFAULT 0,
    time_taken INTEGER NOT NULL DEFAULT 0, -- in seconds
    best_streak INTEGER NOT NULL DEFAULT 0,
    performance_grade VARCHAR(2) DEFAULT 'D',
    difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
    topic VARCHAR(100) DEFAULT 'All Topics', -- First Mass, Cavite Mutiny, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timeline_scores_user_id ON timeline_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_scores_score ON timeline_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_scores_created_at ON timeline_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_scores_topic ON timeline_scores(topic);

-- Enable Row Level Security (RLS)
ALTER TABLE timeline_scores ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TIMELINE SCORES RLS POLICIES
-- ================================================

-- Everyone can view all scores (for leaderboard)
CREATE POLICY "Anyone can view timeline scores"
    ON timeline_scores FOR SELECT
    USING (true);

-- Users can insert their own scores
CREATE POLICY "Users can insert their own timeline scores"
    ON timeline_scores FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update only their own scores (if needed)
CREATE POLICY "Users can update their own timeline scores"
    ON timeline_scores FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own scores (if needed)
CREATE POLICY "Users can delete their own timeline scores"
    ON timeline_scores FOR DELETE
    USING (auth.uid() = user_id);

-- ================================================
-- TIMELINE SCORES VIEW WITH USER INFO (BEST SCORES ONLY)
-- ================================================

-- View to get best timeline score per user with user information
CREATE OR REPLACE VIEW timeline_scores_with_users AS
WITH best_scores AS (
    SELECT 
        user_id,
        MAX(score) as max_score
    FROM timeline_scores
    GROUP BY user_id
),
latest_best AS (
    SELECT DISTINCT ON (ts.user_id)
        ts.id,
        ts.user_id,
        ts.score,
        ts.correct_answers,
        ts.total_questions,
        ts.accuracy,
        ts.time_taken,
        ts.best_streak,
        ts.performance_grade,
        ts.difficulty,
        ts.topic,
        ts.created_at
    FROM timeline_scores ts
    INNER JOIN best_scores bs ON ts.user_id = bs.user_id AND ts.score = bs.max_score
    ORDER BY ts.user_id, ts.created_at ASC  -- If tied scores, take earliest one
)
SELECT 
    lb.id,
    lb.user_id,
    lb.score,
    lb.correct_answers,
    lb.total_questions,
    lb.accuracy,
    lb.time_taken,
    lb.best_streak,
    lb.performance_grade,
    lb.difficulty,
    lb.topic,
    lb.created_at,
    COALESCE(
        up.full_name,
        au.raw_user_meta_data->>'full_name',
        SPLIT_PART(au.email, '@', 1),
        'User'
    ) as user_name,
    COALESCE(up.avatar_url, '') as avatar_url
FROM latest_best lb
LEFT JOIN auth.users au ON lb.user_id = au.id
LEFT JOIN user_profiles up ON lb.user_id = up.id;

-- Grant access to the view
GRANT SELECT ON timeline_scores_with_users TO authenticated;
GRANT SELECT ON timeline_scores_with_users TO anon;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================
-- Run these after setup to verify everything works:

-- Check if table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'timeline_scores';

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'timeline_scores';

-- Check if view exists and works
-- SELECT * FROM timeline_scores_with_users LIMIT 5;
