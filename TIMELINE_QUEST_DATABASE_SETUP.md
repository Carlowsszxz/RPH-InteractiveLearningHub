# Timeline Quest Database Setup Guide

## Phase 2A: Database Configuration

### Overview
This guide will help you set up the Timeline Quest leaderboard database in Supabase.

---

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

---

## Step 2: Run the Setup SQL

1. Click **New Query** button
2. Copy the contents of `timeline-quest-setup.sql`
3. Paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Expected Results
You should see success messages for:
- ✅ Table created: `timeline_scores`
- ✅ Indexes created (4 indexes)
- ✅ RLS enabled
- ✅ Policies created (4 policies)
- ✅ View created: `timeline_scores_with_users`
- ✅ Permissions granted

---

## Step 3: Verify Setup

Run these verification queries one by one:

### Check if table exists:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'timeline_scores';
```
**Expected:** Should return 1 row with `timeline_scores`

### Check RLS policies:
```sql
SELECT * 
FROM pg_policies 
WHERE tablename = 'timeline_scores';
```
**Expected:** Should return 4 rows (view, insert, update, delete policies)

### Check if view works:
```sql
SELECT * 
FROM timeline_scores_with_users 
LIMIT 5;
```
**Expected:** Should return 0 rows (empty) or existing scores (if any)

---

## Step 4: Test Insert (Optional)

Try inserting a test score to ensure everything works:

```sql
-- This should work if you're logged in
INSERT INTO timeline_scores (
    user_id,
    score,
    correct_answers,
    total_questions,
    accuracy,
    time_taken,
    best_streak,
    performance_grade
) VALUES (
    auth.uid(),  -- Your user ID
    1000,
    8,
    10,
    80.00,
    120,
    4,
    'B'
);
```

Then query to see if it worked:
```sql
SELECT * FROM timeline_scores_with_users;
```

---

## Database Schema Details

### Table: `timeline_scores`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| user_id | UUID | Foreign key to auth.users |
| score | INTEGER | Total score earned |
| correct_answers | INTEGER | Number of correct answers |
| total_questions | INTEGER | Total questions answered |
| accuracy | DECIMAL(5,2) | Accuracy percentage |
| time_taken | INTEGER | Time in seconds |
| best_streak | INTEGER | Best consecutive correct answers |
| performance_grade | VARCHAR(2) | A, B, C, or D |
| difficulty | VARCHAR(20) | easy, medium, or hard |
| topic | VARCHAR(100) | Game topic (e.g., "All Topics") |
| created_at | TIMESTAMP | When score was recorded |

### View: `timeline_scores_with_users`

Combines timeline_scores with user information (name, avatar) and shows only the best score per user. This view is used by the leaderboard display.

---

## Troubleshooting

### Error: "relation already exists"
- The table already exists. This is fine - the setup script uses `CREATE TABLE IF NOT EXISTS`

### Error: "permission denied"
- Ensure you're logged into Supabase dashboard as the project owner
- Check that RLS policies are properly created

### Error: "column does not exist" in view
- The view requires a `user_profiles` table to exist
- If you don't have one, the view will still work but show email instead of full_name

### Leaderboard shows no scores
- This is normal if no games have been played yet
- Try playing Timeline Quest to generate test data

---

## Next Steps

After completing this setup:
- ✅ Phase 2A complete
- ➡️ Proceed to **Phase 2B**: Test Trivia Leaderboard
- ➡️ Then **Phase 2C**: Connect Timeline Quest frontend to the database

---

## Security Notes

- ✅ Row Level Security (RLS) is enabled
- ✅ Users can only insert/update/delete their own scores
- ✅ All users can view all scores (public leaderboard)
- ✅ User data is protected by Supabase auth

---

**Questions or issues?** Check the Supabase logs in the dashboard under **Database → Logs**
