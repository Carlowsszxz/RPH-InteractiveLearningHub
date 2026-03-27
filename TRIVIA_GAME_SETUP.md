# Historical Trivia Race - Leaderboard Setup

## Database Setup Instructions

To enable the leaderboard functionality for the Historical Trivia Race game, you need to create a database table in Supabase.

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Click on your project: `fpgatsvmogyjiziilmhy`
3. Navigate to the **SQL Editor** from the left sidebar

### Step 2: Run the SQL Script

Copy and paste the following SQL script into the SQL Editor and click **Run**:

```sql
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
-- OPTIONAL: TRIVIA SCORES VIEW WITH USER DETAILS
-- ================================================
-- This view automatically joins scores with user information
-- and provides fallback logic for missing usernames

CREATE OR REPLACE VIEW trivia_scores_with_users AS
SELECT 
    ts.id,
    ts.user_id,
    ts.score,
    ts.correct_answers,
    ts.total_questions,
    ts.accuracy,
    ts.time_taken,
    ts.best_streak,
    ts.performance_grade,
    ts.created_at,
    -- Smart username fallback: try profile name, then auth metadata, then email username, then generic
    COALESCE(
        up.full_name,
        au.raw_user_meta_data->>'full_name',
        SPLIT_PART(au.email, '@', 1),
        'Player'
    ) AS user_name,
    up.avatar_url
FROM trivia_scores ts
LEFT JOIN auth.users au ON ts.user_id = au.id
LEFT JOIN user_profiles up ON ts.user_id = up.user_id;
```

> **Note**: The view is optional but recommended. If the view exists, the game will use it automatically for better performance and username display. The view automatically filters to show only each user's best score (no duplicate entries per user). If not, JavaScript will handle the filtering and username fallback.

### Step 3: Verify Table Creation

After running the script, you can verify the table was created:

1. Go to **Table Editor** in Supabase
2. Look for the `trivia_scores` table in the list
3. You should see all the columns: `id`, `user_id`, `score`, `correct_answers`, `total_questions`, `accuracy`, `time_taken`, `best_streak`, `performance_grade`, `created_at`

### Step 4: Test the Game

1. Open your application and navigate to the Games page
2. Click on the **Historical Trivia Race** card
3. Play through a complete game
4. After finishing, your score should be saved automatically
5. Click **View Leaderboard** to see your score appear

## Features Included

✅ **Automatic Score Saving** - Scores are saved automatically after each game  
✅ **Leaderboard Filters** - View scores by All Time, This Week, or Today  
✅ **Best Score Per User** - Each player appears once with their highest score  
✅ **User Rankings** - See your rank position after completing a game  
✅ **Performance Grades** - S, A, B, C, D rankings based on score and accuracy  
✅ **Detailed Statistics** - Track correct answers, time taken, and best streak  
✅ **User Highlighting** - Your entry is highlighted in the leaderboard  
✅ **Smart Username Display** - Consistent naming across profile and leaderboard  
✅ **Responsive Design** - Works on desktop and mobile devices

## Troubleshooting

### Issue: "Error saving score"
- **Solution**: Make sure you're logged in. The game requires authentication to save scores.

### Issue: "Could not load user profiles"
- **Solution**: Ensure the `user_profiles` table exists in your Supabase database. This table should already be created if you're using other features of the site.

### Issue: Leaderboard shows generic usernames (e.g., "User")
- **Solution**: This happens when users don't have a full_name set in their profile. To improve username display:
  1. Run the optional `trivia_scores_with_users` view from the setup SQL (see Step 2)
  2. Encourage users to complete their profiles with display names
  3. The system uses your profile name, auth metadata, or email username as fallbacks for better display

### Issue: Same user appears multiple times in leaderboard
- **Solution**: This has been fixed! The leaderboard now shows only each user's best (highest) score. Make sure to:
  1. Run the updated `trivia_scores_with_users` view from database-schema.sql
  2. Refresh your browser to load the updated JavaScript code

### Issue: Leaderboard shows "No scores yet"
- **Solution**: Play at least one complete game to populate the leaderboard. The game must be completed (all 10 questions answered) for the score to be saved.

### Issue: Rank position not showing
- **Solution**: This is usually a temporary issue. Refresh the page or play another game. The rank calculation happens after the score is saved.

## Database Schema Details

### Table: `trivia_scores`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `user_id` | UUID | References the authenticated user |
| `score` | INTEGER | Total points earned in the game |
| `correct_answers` | INTEGER | Number of questions answered correctly |
| `total_questions` | INTEGER | Total questions in the game (default: 10) |
| `accuracy` | DECIMAL | Percentage of correct answers (0-100) |
| `time_taken` | INTEGER | Total time in seconds |
| `best_streak` | INTEGER | Highest consecutive correct answers |
| `performance_grade` | VARCHAR(2) | Grade: S, A, B, C, or D |
| `created_at` | TIMESTAMP | When the score was recorded |

### Row Level Security (RLS)

- **SELECT**: Anyone can view all scores (needed for public leaderboard)
- **INSERT**: Users can only insert scores for themselves
- **UPDATE**: Users can only update their own scores
- **DELETE**: Users can only delete their own scores

## Additional Notes

- The leaderboard displays only the best (highest) score for each user - no duplicates
- If a user has multiple scores with the same value, their earliest one is shown
- Top 100 unique players are shown for each time filter
- Scores are sorted by points (descending), then by time (ascending for ties)
- **Username Display**: Uses the same logic as your profile name for consistency:
  1. User's full_name from user_profiles table
  2. Full name from auth metadata (for current user)
  3. Username portion of email before @ (for current user)
  4. Generic "User" for others without a profile name
- Avatar images are pulled from the `user_profiles` table
- The game requires 10 questions to be completed before saving
- Each game creates a new entry, but only your best score appears on the leaderboard
- The optional database view (`trivia_scores_with_users`) provides optimized queries with automatic best-score filtering

---

**Need Help?** If you encounter any issues, check the browser console for error messages. Common issues are related to authentication or missing database tables.
