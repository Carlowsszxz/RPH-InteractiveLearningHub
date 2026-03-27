/**
 * Supabase Client Configuration
 * Initialize and export Supabase client for use throughout the app
 */

// Import Supabase client
// Note: In production, use npm install @supabase/supabase-js
// For now, using CDN import - add this to your HTML <head>:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// SUPABASE_URL and SUPABASE_ANON_KEY are defined in supabase-config.js

// Use the client from supabase-config.js
const client = window.supabaseClient;

/**
 * Authentication Functions
 */
const SupabaseAuth = {
  /**
   * Sign up new user
   */
  async signUp(email, password, fullName) {
    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Sign up error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Sign in user
   */
  async signIn(email, password) {
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      console.error('Sign in error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Sign out user
   */
  async signOut() {
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    try {
      const { data: { user } } = await client.auth.getUser();
      return user;
    } catch (error) {
      console.error('Get user error:', error.message);
      return null;
    }
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback) {
    return client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};

/**
 * Posts/Discussions Functions
 */
const SupabaseDB = {
  /**
   * Fetch all posts for a topic
   */
  async getPostsByTopic(topicId) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:users(id, full_name, avatar_url),
          comments(count)
        `)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, posts: data };
    } catch (error) {
      console.error('Fetch posts error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a new post
   */
  async createPost(topicId, content, userId) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            topic_id: topicId,
            content: content,
            author_id: userId
          }
        ])
        .select();

      if (error) throw error;
      return { success: true, post: data[0] };
    } catch (error) {
      console.error('Create post error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Like a post
   */
  async likePost(postId, userId) {
    try {
      // Insert like
      const { data, error } = await supabase
        .from('post_likes')
        .insert([{ post_id: postId, user_id: userId }]);

      if (error) throw error;

      // Update like count
      await client
        .from('posts')
        .update({ likes_count: client.rpc('increment_likes', { post_id: postId }) })
        .eq('id', postId);

      return { success: true };
    } catch (error) {
      console.error('Like post error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Add a comment
   */
  async addComment(postId, content, userId) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            content: content,
            author_id: userId
          }
        ])
        .select();

      if (error) throw error;
      return { success: true, comment: data[0] };
    } catch (error) {
      console.error('Add comment error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get comments for a post
   */
  async getComments(postId) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:users(id, full_name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { success: true, comments: data };
    } catch (error) {
      console.error('Get comments error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get topics for a course
   */
  async getTopics(courseId) {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, topics: data };
    } catch (error) {
      console.error('Get topics error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get a specific topic
   */
  async getTopic(topicId) {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (error) throw error;
      return { success: true, topic: data };
    } catch (error) {
      console.error('Get topic error:', error.message);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Real-time Subscriptions
 */
const SupabaseRealtime = {
  /**
   * Subscribe to post changes
   */
  subscribeToPosts(topicId, callback) {
    return supabase
      .channel(`posts-${topicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `topic_id=eq.${topicId}`
        },
        (payload) => callback(payload)
      )
      .subscribe();
  },

  /**
   * Unsubscribe from changes
   */
  unsubscribe(subscription) {
    return client.removeChannel(subscription);
  }
};

// Export for use in other files
window.SupabaseAuth = SupabaseAuth;
window.SupabaseDB = SupabaseDB;
window.SupabaseRealtime = SupabaseRealtime;
