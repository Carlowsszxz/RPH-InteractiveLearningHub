// Database Operations Helper
// This file contains helper functions for common Supabase operations

// Helper function to get Supabase client (global access)
async function getSupabaseClient() {
    return window.supabaseClient;
}

const DB = {
    // Helper function to get client
    getClient() {
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return null;
        }
        return window.supabaseClient;
    },

    // ===== POSTS =====
    
    async getPosts(topicId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('posts')
                .select(`
                    id,
                    content,
                    created_at,
                    likes_count,
                    comments_count,
                    author_id,
                    topic_id
                `)
                .eq('topic_id', topicId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching posts:', error);
            return { success: false, error: error.message };
        }
    },

    async createPost(topicId, content, authorId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('posts')
                .insert([{
                    topic_id: topicId,
                    content: content,
                    author_id: authorId,
                    likes_count: 0,
                    comments_count: 0
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating post:', error);
            return { success: false, error: error.message };
        }
    },

    async deletePost(postId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { error } = await client
                .from('posts')
                .delete()
                .eq('id', postId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting post:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== LIKES =====

    async likePost(postId, userId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            // Insert like
            const { error: insertError } = await client
                .from('post_likes')
                .insert([{ post_id: postId, user_id: userId }]);

            if (insertError) throw insertError;

            // Increment count
            const { data: post } = await client
                .from('posts')
                .select('likes_count')
                .eq('id', postId)
                .single();

            await client
                .from('posts')
                .update({ likes_count: (post?.likes_count || 0) + 1 })
                .eq('id', postId);

            return { success: true };
        } catch (error) {
            console.error('Error liking post:', error);
            return { success: false, error: error.message };
        }
    },

    async unlikePost(postId, userId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            // Delete like
            const { error: deleteError } = await client
                .from('post_likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', userId);

            if (deleteError) throw deleteError;

            // Decrement count
            const { data: post } = await client
                .from('posts')
                .select('likes_count')
                .eq('id', postId)
                .single();

            await client
                .from('posts')
                .update({ likes_count: Math.max((post?.likes_count || 1) - 1, 0) })
                .eq('id', postId);

            return { success: true };
        } catch (error) {
            console.error('Error unliking post:', error);
            return { success: false, error: error.message };
        }
    },

    async userLikedPost(postId, userId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('post_likes')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, liked: !!data };
        } catch (error) {
            console.error('Error checking like status:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== COMMENTS =====

    async getComments(postId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('comments')
                .select('id, content, author_id, created_at, likes_count')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching comments:', error);
            return { success: false, error: error.message };
        }
    },

    async addComment(postId, content, authorId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('comments')
                .insert([{
                    post_id: postId,
                    content: content,
                    author_id: authorId,
                    likes_count: 0
                }])
                .select();

            if (error) throw error;

            // Increment comment count on post
            const { data: post } = await client
                .from('posts')
                .select('comments_count')
                .eq('id', postId)
                .single();

            await client
                .from('posts')
                .update({ comments_count: (post?.comments_count || 0) + 1 })
                .eq('id', postId);

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error adding comment:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== TOPICS =====

    async getTopics() {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('topics')
                .select('id, title, description')
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching topics:', error);
            return { success: false, error: error.message };
        }
    },

    async getTopic(topicId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('topics')
                .select('id, title, description, content')
                .eq('id', topicId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching topic:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== USERS =====

    async getUserProfile(userId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('users')
                .select('id, email, full_name, avatar_url')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching user:', error);
            return { success: false, error: error.message };
        }
    },

    async updateUserProfile(userId, updates) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error updating user:', error);
            return { success: false, error: error.message };
        }
    },

    async createUserProfile(userId, email, fullName = null) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('users')
                .insert([{
                    id: userId,
                    email: email,
                    full_name: fullName || email.split('@')[0]
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating user profile:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== QUIZZES =====

    async getQuizzes(topicName = null) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            let query = client
                .from('quizzes')
                .select(`
                    id,
                    title,
                    description,
                    topic_name,
                    difficulty_level,
                    num_questions,
                    time_limit_minutes,
                    passing_score
                `)
                .eq('is_active', true)
                .order('topic_name', { ascending: true })
                .order('difficulty_level', { ascending: true });

            if (topicName) {
                query = query.eq('topic_name', topicName);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching quizzes:', error);
            return { success: false, error: error.message };
        }
    },

    async getQuizDetails(quizId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data: quiz, error: quizError } = await client
                .from('quizzes')
                .select('*')
                .eq('id', quizId)
                .single();

            if (quizError) throw quizError;

            const { data: questions, error: questionsError } = await client
                .from('quiz_questions')
                .select(`
                    id,
                    question_text,
                    question_order,
                    question_type,
                    quiz_options (
                        id,
                        option_text,
                        option_order,
                        is_correct
                    )
                `)
                .eq('quiz_id', quizId)
                .order('question_order', { ascending: true });

            if (questionsError) throw questionsError;

            return { 
                success: true, 
                data: { 
                    quiz, 
                    questions 
                } 
            };
        } catch (error) {
            console.error('Error fetching quiz details:', error);
            return { success: false, error: error.message };
        }
    },

    async createQuizAttempt(quizId, userId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('quiz_attempts')
                .insert([{
                    quiz_id: quizId,
                    user_id: userId,
                    status: 'in_progress',
                    started_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating quiz attempt:', error);
            return { success: false, error: error.message };
        }
    },

    async submitQuizResponse(attemptId, questionId, selectedOptionId = null, responseText = null) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('quiz_responses')
                .insert([{
                    attempt_id: attemptId,
                    question_id: questionId,
                    selected_option_id: selectedOptionId,
                    response_text: responseText,
                    answered_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error submitting response:', error);
            return { success: false, error: error.message };
        }
    },

    async completeQuizAttempt(attemptId, score, maxScore) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const percentage = (score / maxScore) * 100;
            const { data, error } = await client
                .from('quiz_attempts')
                .update({
                    score: score,
                    max_score: maxScore,
                    percentage: percentage,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', attemptId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error completing quiz attempt:', error);
            return { success: false, error: error.message };
        }
    },

    async getUserQuizAttempts(userId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('quiz_attempts')
                .select(`
                    id,
                    quiz_id,
                    score,
                    percentage,
                    status,
                    started_at,
                    completed_at,
                    quizzes (
                        title,
                        topic_name,
                        difficulty_level
                    )
                `)
                .eq('user_id', userId)
                .order('started_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching user quiz attempts:', error);
            return { success: false, error: error.message };
        }
    },

    async getQuizStatistics(quizId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('quiz_analytics')
                .select('*')
                .eq('quiz_id', quizId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
            
            return { success: true, data: data || null };
        } catch (error) {
            console.error('Error fetching quiz statistics:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== GAME SCORES =====
    
    async saveGameScore(userId, gameType, score, level) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('game_scores')
                .upsert({
                    user_id: userId,
                    game_type: gameType,
                    score: score,
                    level: level,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,game_type'
                });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error saving game score:', error);
            return { success: false, error: error.message };
        }
    },

    async getGameScore(userId, gameType) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('game_scores')
                .select('score, level, updated_at')
                .eq('user_id', userId)
                .eq('game_type', gameType)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
            
            return { success: true, data: data || null };
        } catch (error) {
            console.error('Error fetching game score:', error);
            return { success: false, error: error.message };
        }
    },

    async getLeaderboard(gameType, limit = 10) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };
            
            const { data, error } = await client
                .from('game_scores')
                .select(`
                    score,
                    level,
                    updated_at,
                    user:user_id (
                        id,
                        full_name
                    )
                `)
                .eq('game_type', gameType)
                .order('score', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== REFLECTIONS =====

    async getReflectionPrompts(topic = null) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };

            let query = client
                .from('reflection_prompts')
                .select('*')
                .order('created_at', { ascending: false });

            if (topic && topic !== 'all') {
                query = query.eq('topic', topic);
            }

            const { data, error } = await query;
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching reflection prompts:', error);
            return { success: false, error: error.message };
        }
    },

    async getReflectionPrompt(id) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };

            const { data, error } = await client
                .from('reflection_prompts')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching reflection prompt:', error);
            return { success: false, error: error.message };
        }
    },

    async getUserReflection(userId, reflectionId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };

            const { data, error } = await client
                .from('user_reflections')
                .select('*')
                .eq('user_id', userId)
                .eq('reflection_id', reflectionId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching user reflection:', error);
            return { success: false, error: error.message };
        }
    },

    async saveUserReflection(userId, reflectionId, content) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };

            // Get the topic from reflection_prompts
            const { data: promptData, error: promptError } = await client
                .from('reflection_prompts')
                .select('topic')
                .eq('id', reflectionId)
                .single();

            if (promptError) throw promptError;
            const topic = promptData?.topic || null;

            const wordCount = content.trim().split(/\s+/).length;
            const isCompleted = content.trim().length > 0; // Consider completed if any content

            const { data, error } = await client
                .from('user_reflections')
                .upsert({
                    user_id: userId,
                    reflection_id: reflectionId,
                    topic: topic,
                    content: content,
                    word_count: wordCount,
                    is_completed: isCompleted,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,reflection_id'
                });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error saving user reflection:', error);
            return { success: false, error: error.message };
        }
    },

    async getUserReflections(userId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };

            const { data, error } = await client
                .from('user_reflections')
                .select(`
                    *,
                    reflection_prompts (
                        title,
                        description,
                        topic,
                        type,
                        difficulty
                    )
                `)
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching user reflections:', error);
            return { success: false, error: error.message };
        }
    },

    async deleteUserReflection(userId, reflectionId) {
        try {
            const client = this.getClient();
            if (!client) return { success: false, error: 'Supabase not initialized' };

            const { error } = await client
                .from('user_reflections')
                .delete()
                .eq('user_id', userId)
                .eq('reflection_id', reflectionId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting user reflection:', error);
            return { success: false, error: error.message };
        }
    }
};

// Export for use in other files
window.DB = DB;
