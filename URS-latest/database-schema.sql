-- ================================================
-- SUPABASE DATABASE SCHEMA FOR CONCEPT MAP
-- ================================================
-- Run this SQL in your Supabase SQL Editor
-- ================================================

-- Table 1: Concept Maps (Predefined root topics)
CREATE TABLE IF NOT EXISTS concept_maps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    root_word VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Table 2: Concept Nodes (Words added by students)
CREATE TABLE IF NOT EXISTS concept_nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    map_id UUID NOT NULL REFERENCES concept_maps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#4A90E2',
    parent_id UUID REFERENCES concept_nodes(id) ON DELETE SET NULL,
    relationship_label VARCHAR(100),
    position_x DECIMAL(10, 2),
    position_y DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Constraint: One word per user per map
    UNIQUE(map_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_concept_nodes_map_id ON concept_nodes(map_id);
CREATE INDEX IF NOT EXISTS idx_concept_nodes_user_id ON concept_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_maps_active ON concept_maps(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE concept_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_nodes ENABLE ROW LEVEL SECURITY;

-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================

-- Concept Maps Policies (Everyone can read active maps)
CREATE POLICY "Anyone can view active concept maps"
    ON concept_maps FOR SELECT
    USING (is_active = true);

-- Concept Nodes Policies

-- Everyone can view all nodes
CREATE POLICY "Anyone can view concept nodes"
    ON concept_nodes FOR SELECT
    USING (true);

-- Users can insert their own nodes (one per map)
CREATE POLICY "Users can insert their own concept nodes"
    ON concept_nodes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update only their own nodes
CREATE POLICY "Users can update their own concept nodes"
    ON concept_nodes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own nodes
CREATE POLICY "Users can delete their own concept nodes"
    ON concept_nodes FOR DELETE
    USING (auth.uid() = user_id);

-- ================================================
-- INSERT PREDEFINED CONCEPT MAPS
-- ================================================

INSERT INTO concept_maps (root_word, description, is_active) VALUES
    ('Philippine History', 'Explore the rich history of the Philippines', true),
    ('Philippine Heroes', 'National heroes and their contributions', true),
    ('Philippine Revolution', 'The fight for independence from colonial rule', true),
    ('Colonial Period', 'Spanish and American colonial periods', true),
    ('Independence Movement', 'The path to Philippine independence', true),
    ('Cavite Mutiny', 'The 1872 uprising and its significance', true),
    ('Rizal and Reform', 'Dr. Jose Rizal and the reform movement', true),
    ('Katipunan', 'The revolutionary society founded by Bonifacio', true)
ON CONFLICT DO NOTHING;

-- ================================================
-- TRIVIA GAME SCORES TABLE
-- ================================================

    -- Table: Trivia Game Scores
    CREATE TABLE IF NOT EXISTS trivia_scores (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL DEFAULT 0,
        correct_answers INTEGER NOT NULL DEFAULT 0,
        total_questions INTEGER NOT NULL DEFAULT 10,
        accuracy DECIMAL(5, 2) NOT NULL DEFAULT 0,
        time_taken INTEGER NOT NULL DEFAULT 0, -- in seconds
        best_streak INTEGER NOT NULL DEFAULT 0,
        performance_grade VARCHAR(2) DEFAULT 'D',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_trivia_scores_user_id ON trivia_scores(user_id);
    CREATE INDEX IF NOT EXISTS idx_trivia_scores_score ON trivia_scores(score DESC);
    CREATE INDEX IF NOT EXISTS idx_trivia_scores_created_at ON trivia_scores(created_at DESC);

    -- Enable Row Level Security (RLS)
    ALTER TABLE trivia_scores ENABLE ROW LEVEL SECURITY;

    -- ================================================
    -- TRIVIA SCORES RLS POLICIES
    -- ================================================

    -- Everyone can view all scores (for leaderboard)
    CREATE POLICY "Anyone can view trivia scores"
        ON trivia_scores FOR SELECT
        USING (true);

    -- Users can insert their own scores
    CREATE POLICY "Users can insert their own trivia scores"
        ON trivia_scores FOR INSERT
        WITH CHECK (auth.uid() = user_id);

    -- Users can update only their own scores (if needed)
    CREATE POLICY "Users can update their own trivia scores"
        ON trivia_scores FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

    -- Users can delete only their own scores (if needed)
    CREATE POLICY "Users can delete their own trivia scores"
        ON trivia_scores FOR DELETE
        USING (auth.uid() = user_id);

    -- ================================================
-- TRIVIA SCORES VIEW WITH USER INFO (BEST SCORES ONLY)
-- ================================================

-- View to get best trivia score per user with user information
CREATE OR REPLACE VIEW trivia_scores_with_users AS
WITH best_scores AS (
    SELECT 
        user_id,
        MAX(score) as max_score
    FROM trivia_scores
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
        ts.created_at
    FROM trivia_scores ts
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
    lb.created_at,
    COALESCE(
        u.full_name,
        au.raw_user_meta_data->>'full_name',
        SPLIT_PART(au.email, '@', 1),
        'User'
    ) as user_name,
    COALESCE(u.avatar_url, '') as avatar_url
FROM latest_best lb
LEFT JOIN auth.users au ON lb.user_id = au.id
LEFT JOIN user_profiles u ON lb.user_id = u.id;

-- Grant access to the view
GRANT SELECT ON trivia_scores_with_users TO authenticated;
GRANT SELECT ON trivia_scores_with_users TO anon;

-- ================================================
-- CONCEPT NODES VIEW WITH USER INFO
-- ================================================

CREATE OR REPLACE VIEW concept_nodes_with_users AS
SELECT
    cn.id,
    cn.map_id,
    cn.user_id,
    cn.word,
    cn.color,
    cn.parent_id,
    cn.relationship_label,
    cn.position_x,
    cn.position_y,
    cn.created_at,
    cn.updated_at,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as user_name
FROM concept_nodes cn
LEFT JOIN auth.users au ON cn.user_id = au.id;

-- Grant access to the view
GRANT SELECT ON concept_nodes_with_users TO authenticated;
GRANT SELECT ON concept_nodes_with_users TO anon;

-- ================================================
-- FUNCTIONS FOR UPDATES
-- ================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for concept_maps
CREATE TRIGGER update_concept_maps_updated_at
    BEFORE UPDATE ON concept_maps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for concept_nodes
CREATE TRIGGER update_concept_nodes_updated_at
    BEFORE UPDATE ON concept_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- VERIFICATION QUERIES (Run these to check setup)
-- ================================================

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('concept_maps', 'concept_nodes');

-- Check predefined maps
-- SELECT * FROM concept_maps WHERE is_active = true;

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename IN ('concept_maps', 'concept_nodes');

-- ================================================
-- GAME LEADERBOARD TABLE (FOR MULTIPLE GAMES)
-- ================================================

-- Table: Game Leaderboard (Supports multiple games)
CREATE TABLE IF NOT EXISTS game_leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player_name VARCHAR(100) NOT NULL,
    game_name VARCHAR(100) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    perfect_rounds INTEGER DEFAULT 0,
    total_rounds INTEGER DEFAULT 0,
    accuracy DECIMAL(5, 2) DEFAULT 0,
    time_seconds INTEGER NOT NULL DEFAULT 0,
    era_selected VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_leaderboard_user_id ON game_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_game_leaderboard_game_name ON game_leaderboard(game_name);
CREATE INDEX IF NOT EXISTS idx_game_leaderboard_score ON game_leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_leaderboard_created_at ON game_leaderboard(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_leaderboard_game_score ON game_leaderboard(game_name, score DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE game_leaderboard ENABLE ROW LEVEL SECURITY;

-- ================================================
-- GAME LEADERBOARD RLS POLICIES
-- ================================================

-- Everyone can view all game scores (for leaderboard)
CREATE POLICY "Anyone can view game leaderboard"
    ON game_leaderboard FOR SELECT
    USING (true);

-- Users can insert their own scores
CREATE POLICY "Users can insert their own game scores"
    ON game_leaderboard FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view only their own scores for updates
CREATE POLICY "Users can update their own game scores"
    ON game_leaderboard FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own scores
CREATE POLICY "Users can delete their own game scores"
    ON game_leaderboard FOR DELETE
    USING (auth.uid() = user_id);

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
