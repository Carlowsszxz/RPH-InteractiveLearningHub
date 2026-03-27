# Timeline Quest - Phase 6: Leaderboard & Database Integration

## ✅ Implementation Complete

Phase 6 has been successfully implemented with full Supabase integration for competitive leaderboards!

## 🎯 Features Implemented

### 1. **Score Saving**
- Automatically saves player scores to database after game completion
- Captures comprehensive stats: score, accuracy, perfect rounds, time, era
- Retrieves player name from user profile or email
- Calculates and displays player rank (e.g., "You ranked 3rd place!")

### 2. **Leaderboard Display**
- Top 50 scores displayed in ranked order
- Three time filters: All Time, This Week, Today
- Real-time data loading with loading states
- Special styling for top 3 ranks (🥇🥈🥉)
- Highlights current user's entry with green glow
- Shows detailed stats: accuracy, time, perfect rounds, date

### 3. **Ranking System**
- Real-time rank calculation based on score
- Proper ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
- Golden/Silver/Bronze backgrounds for top 3
- "You" badge for current user's entries

### 4. **Error Handling**
- Graceful fallback if database unavailable
- User-friendly error messages
- Loading states during data fetch
- Empty state when no scores exist

## 🗄️ Database Setup Required

### Step 1: Create the Leaderboard Table

Run this SQL in your Supabase SQL Editor:

```sql
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

-- Everyone can view all game scores (for leaderboard)
CREATE POLICY "Anyone can view game leaderboard"
    ON game_leaderboard FOR SELECT
    USING (true);

-- Users can insert their own scores
CREATE POLICY "Users can insert their own game scores"
    ON game_leaderboard FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own scores
CREATE POLICY "Users can update their own game scores"
    ON game_leaderboard FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scores
CREATE POLICY "Users can delete their own game scores"
    ON game_leaderboard FOR DELETE
    USING (auth.uid() = user_id);
```

### Step 2: Verify Table Creation

Run this query to confirm:

```sql
SELECT * FROM game_leaderboard LIMIT 1;
```

## 📝 Code Structure

### JavaScript Functions (JS/games.js)

1. **saveToLeaderboard()** - Lines ~3020-3080
   - Gets user session and profile
   - Calculates final stats
   - Inserts score to database
   - Triggers rank calculation

2. **getPlayerRank()** - Lines ~3082-3105
   - Queries scores higher than player's
   - Calculates rank position
   - Displays rank with proper suffix

3. **loadLeaderboard(filter)** - Lines ~3140-3240
   - Loads top 50 scores with time filter
   - Renders leaderboard entries
   - Highlights current user
   - Handles loading/error/empty states

4. **Helper Functions**
   - `updateRankDisplay()` - Updates rank message
   - `getRankSuffix()` - Returns "st", "nd", "rd", "th"

### CSS Styling (Styles/games.css)

- **Leaderboard entries** - Hover effects, transitions
- **Top 3 ranks** - Gold/Silver/Bronze gradients
- **Current user** - Green glow highlight
- **Loading/Error states** - Spinner and error messages
- **Responsive design** - Mobile-optimized layouts

## 🎮 User Flow

1. Player completes all 5 rounds of Timeline Quest
2. Final score is calculated with all bonuses
3. Score automatically saves to database
4. Player rank is calculated and displayed
5. Player can click "View Leaderboard" button
6. Leaderboard loads with "All Time" filter active
7. Player can switch between time filters
8. Player's entry is highlighted if in top 50

## 🔧 Technical Details

### Database Schema
- **Table**: `game_leaderboard`
- **Primary Key**: `id` (UUID)
- **Foreign Key**: `user_id` → `auth.users(id)`
- **Game Filter**: `game_name` = 'Timeline Quest'
- **Sorting**: `score DESC` (highest first)

### Query Performance
- Indexed on: `user_id`, `game_name`, `score`, `created_at`
- Composite index on `(game_name, score)` for fast filtering
- RLS policies ensure secure data access

### Time Filters
- **All Time**: No date filter
- **This Week**: Last 7 days
- **Today**: Current day (midnight to now)

## 🎨 Visual Design

### Rank Styling
- **1st Place**: Gold gradient (#FFD700 → #FFA500)
- **2nd Place**: Silver gradient (#C0C0C0 → #A0A0A0)
- **3rd Place**: Bronze gradient (#CD7F32 → #B87333)
- **Others**: Dark gradient with hover effects
- **Current User**: Green border and glow

### Entry Information
- Rank badge (medal emoji or #4)
- Player name with "You" badge
- Stats: Accuracy, Time, Perfect Rounds, Date
- Large score display on the right

## ✨ Next Steps

1. **Run the SQL schema** in Supabase SQL Editor
2. **Test the game** by playing through all rounds
3. **Check the database** for saved scores
4. **View the leaderboard** and test filters
5. **Play again** to see rank changes

## 🐛 Troubleshooting

### Score not saving?
- Check browser console for errors
- Verify user is logged in (session active)
- Confirm `game_leaderboard` table exists
- Check RLS policies are enabled

### Leaderboard not loading?
- Verify Supabase client is initialized
- Check table name matches: `game_leaderboard`
- Ensure RLS SELECT policy allows anonymous reads
- Check network tab for API errors

### Rank not calculating?
- Confirm scores exist in database
- Check `game_name` filter: 'Timeline Quest'
- Verify score comparison query works

## 📊 Database Query Examples

### Get all Timeline Quest scores:
```sql
SELECT * FROM game_leaderboard 
WHERE game_name = 'Timeline Quest' 
ORDER BY score DESC;
```

### Get top 10 players:
```sql
SELECT player_name, score, accuracy, perfect_rounds 
FROM game_leaderboard 
WHERE game_name = 'Timeline Quest' 
ORDER BY score DESC 
LIMIT 10;
```

### Get today's scores:
```sql
SELECT * FROM game_leaderboard 
WHERE game_name = 'Timeline Quest' 
AND created_at >= CURRENT_DATE 
ORDER BY score DESC;
```

---

## 🎉 Phase 6 Complete!

Your Timeline Quest game now has a fully functional competitive leaderboard system with:
- ✅ Automatic score saving
- ✅ Real-time rank calculation  
- ✅ Time-filtered leaderboards
- ✅ Beautiful UI with top 3 highlighting
- ✅ Secure database integration
- ✅ Mobile-responsive design

Players can now compete for the top spot and track their progress over time! 🏆
