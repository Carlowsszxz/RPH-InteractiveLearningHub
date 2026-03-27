# Phase A: Database Setup Instructions

## Step 1: Set Up Database Tables in Supabase

1. **Log in to your Supabase Dashboard**
   - Go to: https://supabase.com
   - Navigate to your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Database Schema**
   - Open the file: `database-schema.sql`
   - Copy ALL the SQL code
   - Paste it into the Supabase SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify Tables Were Created**
   - Click on "Table Editor" in the left sidebar
   - You should see two new tables:
     - `concept_maps` (with 8 predefined Philippine history topics)
     - `concept_nodes` (currently empty, will store student words)

## Step 2: Verify Row Level Security (RLS)

1. **Check RLS Policies**
   - In Table Editor, click on `concept_maps`
   - Go to the "Policies" tab
   - You should see: "Anyone can view active concept maps"

2. **Check concept_nodes Policies**
   - Click on `concept_nodes` table
   - Go to "Policies" tab
   - You should see 4 policies:
     - Anyone can view concept nodes
     - Users can insert their own concept nodes
     - Users can update their own concept nodes
     - Users can delete their own concept nodes

## Step 3: Test the Setup

Run these queries in SQL Editor to verify:

```sql
-- Should return 8 predefined maps
SELECT * FROM concept_maps WHERE is_active = true;

-- Should return 0 rows (no nodes added yet)
SELECT * FROM concept_nodes;

-- Check if view exists
SELECT * FROM concept_nodes_with_users LIMIT 1;
```

## What Was Created

### Tables:

1. **concept_maps**
   - Stores predefined root topics (Philippine History, Heroes, etc.)
   - 8 topics created automatically
   - Fields: id, root_word, description, is_active, created_at, updated_at

2. **concept_nodes**
   - Stores words added by students
   - One word per user per map (enforced by database)
   - Fields: id, map_id, user_id, word, color, parent_id, relationship_label, position_x, position_y
   - Connected to Supabase Auth users

### Security:
- Row Level Security (RLS) enabled
- Students can only edit/delete their own words
- Everyone can view all words
- One word per student per map (database constraint)

### JavaScript Files Created:
- `JS/concept-map-db.js` - Database helper functions
- Ready to integrate with the concept map

## Next Steps:
Once you confirm the database is set up, we'll move to:
- **Phase B**: User authentication (login required)
- **Phase C**: Map dropdown selector
- **Phase D**: Modify concept map to use database
- **Phase E**: Add refresh functionality

---

**Note**: Make sure your Supabase project URL and Anon Key in `JS/supabase-config.js` are correct!
