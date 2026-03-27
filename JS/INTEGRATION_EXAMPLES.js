// Integration Examples - Copy/Paste Ready Code

// ===== EXAMPLE 1: Load Posts on Page Load =====
// Add this to CourseInterface init() method in course.js

async init() {
    await this.checkAuthentication();
    await this.loadPostsFromDatabase(1); // 1 = Cavite Mutiny topic
    this.setupEventListeners();
}

async loadPostsFromDatabase(topicId) {
    try {
        this.showNotification('Loading posts...', 'info');
        const result = await DB.getPosts(topicId);
        
        if (!result.success) {
            this.showNotification('Failed to load posts', 'error');
            return;
        }

        const posts = result.data || [];
        const discussionContainer = document.querySelector('.discussion-posts');
        
        if (!discussionContainer) return;

        // Clear existing posts (except the create post section)
        discussionContainer.querySelectorAll('.post-card').forEach(card => card.remove());

        if (posts.length === 0) {
            discussionContainer.innerHTML += '<p style="padding: 20px; text-align: center; color: #95a5a6;">No posts yet. Be the first to share!</p>';
            return;
        }

        // Add each post to the UI
        posts.forEach(post => {
            const postHTML = `
                <div class="post-card" data-post-id="${post.id}">
                    <div class="post-header">
                        <img src="https://i.pravatar.cc/40?u=${post.author_id}" alt="Author" class="post-avatar">
                        <div class="post-info">
                            <strong>User ${post.author_id?.slice(0, 8)}</strong>
                            <span class="post-time">${new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="post-content">
                        <p>${post.content}</p>
                    </div>
                    <div class="post-actions">
                        <button class="action-btn like-btn" data-post-id="${post.id}">
                            <div class="action-content">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                Like (${post.likes_count})
                            </div>
                        </button>
                        <button class="action-btn comment-btn" data-post-id="${post.id}">
                            <div class="action-content">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                Comment (${post.comments_count})
                            </div>
                        </button>
                        <button class="action-btn share-btn">
                            <div class="action-content">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                    <polyline points="16 6 12 2 8 6"></polyline>
                                    <line x1="12" y1="2" x2="12" y2="15"></line>
                                </svg>
                                Share
                            </div>
                        </button>
                    </div>
                </div>
            `;
            discussionContainer.innerHTML += postHTML;
        });

        this.attachPostListeners();
    } catch (error) {
        console.error('Error loading posts:', error);
        this.showNotification('Error loading posts', 'error');
    }
}

// Add event listeners to like buttons
attachPostListeners() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.handleLikePost(e));
    });
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.handleCommentClick(e));
    });
}

async handleLikePost(e) {
    const btn = e.currentTarget;
    const postId = btn.dataset.postId;
    
    try {
        const result = await DB.likePost(parseInt(postId), this.currentUser.id);
        
        if (result.success) {
            btn.style.color = '#e74c3c';
            this.showNotification('Post liked!', 'success');
        } else {
            this.showNotification('Failed to like post', 'error');
        }
    } catch (error) {
        console.error('Like error:', error);
    }
}

// ===== EXAMPLE 2: Auto-Refresh Posts When New Post Created =====
// Replace handlePostSubmit with this:

async handlePostSubmit() {
    const input = document.querySelector('.post-input');
    if (!input || !input.value.trim()) {
        return;
    }

    const content = input.value.trim();
    const topicId = 1; // Set based on current topic

    try {
        this.showNotification('Posting...', 'info');

        // Save to database
        const result = await DB.createPost(topicId, content, this.currentUser.id);

        if (!result.success) {
            this.showNotification('Failed to post', 'error');
            return;
        }

        this.showNotification('Post published!', 'success');
        input.value = '';
        
        // Reload posts from database
        await this.loadPostsFromDatabase(topicId);
    } catch (error) {
        console.error('Post submission error:', error);
        this.showNotification('Failed to post. Please try again.', 'error');
    }
}

// ===== EXAMPLE 3: Real-Time Updates (Optional - Advanced) =====
// Add this to init() for live updates

subscribeToPostUpdates(topicId) {
    supabase
        .channel('posts-' + topicId)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'posts',
                filter: 'topic_id=eq.' + topicId
            },
            (payload) => {
                console.log('Post update:', payload);
                
                if (payload.eventType === 'INSERT') {
                    // New post created - add to top of list
                    this.loadPostsFromDatabase(topicId);
                } else if (payload.eventType === 'UPDATE') {
                    // Post updated (likes, comments) - refresh it
                    this.loadPostsFromDatabase(topicId);
                } else if (payload.eventType === 'DELETE') {
                    // Post deleted - remove from UI
                    document.querySelector(`[data-post-id="${payload.old.id}"]`)?.remove();
                }
            }
        )
        .subscribe();
}

// ===== EXAMPLE 4: Comments System =====

async handleCommentClick(e) {
    const postId = e.currentTarget.dataset.postId;
    
    // Create comment input
    const commentInput = prompt('Add a comment:');
    if (!commentInput) return;

    try {
        const result = await DB.addComment(
            parseInt(postId),
            commentInput,
            this.currentUser.id
        );

        if (result.success) {
            this.showNotification('Comment added!', 'success');
            // Reload posts to show updated comment count
            await this.loadPostsFromDatabase(1);
        } else {
            this.showNotification('Failed to add comment', 'error');
        }
    } catch (error) {
        console.error('Comment error:', error);
    }
}

// ===== EXAMPLE 5: Sign Up / Registration =====
// Add this to script.js if you want sign up functionality

async function handleSignUp(email, password, fullName) {
    try {
        // Create auth user
        const { data: { user }, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (error) throw error;

        // Create user profile in database
        const profileResult = await DB.createUserProfile(user.id, email, fullName);
        
        if (profileResult.success) {
            console.log('User created:', profileResult.data);
            return { success: true, user };
        } else {
            throw profileResult.error;
        }
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
    }
}

// ===== EXAMPLE 6: User Profile Display =====

async function displayUserProfile(userId) {
    try {
        const result = await DB.getUserProfile(userId);
        
        if (result.success && result.data) {
            const { full_name, email, avatar_url } = result.data;
            
            // Update UI with user info
            console.log(`Name: ${full_name}, Email: ${email}`);
            
            return result.data;
        }
    } catch (error) {
        console.error('Profile error:', error);
    }
}

// ===== EXAMPLE 7: Delete Post (Owner Only) =====

async function deletePost(postId) {
    if (!confirm('Delete this post?')) return;

    try {
        const result = await DB.deletePost(postId);
        
        if (result.success) {
            // Remove from UI
            document.querySelector(`[data-post-id="${postId}"]`)?.remove();
            this.showNotification('Post deleted', 'success');
            
            // Reload posts
            await this.loadPostsFromDatabase(1);
        }
    } catch (error) {
        console.error('Delete error:', error);
    }
}

// ===== EXAMPLE 8: Check if User Liked Post =====

async function updateLikeButton(postId, userId) {
    const result = await DB.userLikedPost(postId, userId);
    
    if (result.success && result.liked) {
        // User already liked - show filled heart
        const btn = document.querySelector(`[data-post-id="${postId}"] .like-btn`);
        if (btn) btn.style.color = '#e74c3c';
    }
}

// ===== EXAMPLE 9: Display Multiple Topics in Dropdown =====

async function populateTopicDropdown() {
    try {
        const result = await DB.getTopics();
        
        if (result.success) {
            const dropdown = document.querySelector('.dropdown-menu');
            dropdown.innerHTML = '';
            
            result.data.forEach(topic => {
                const link = document.createElement('a');
                link.href = `#`;
                link.dataset.topicId = topic.id;
                link.textContent = topic.title;
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Load posts for selected topic
                    loadPostsFromDatabase(topic.id);
                });
                dropdown.appendChild(link);
            });
        }
    } catch (error) {
        console.error('Topic dropdown error:', error);
    }
}

// ===== EXAMPLE 10: Logout with Cleanup =====

async handleLogout() {
    try {
        this.showNotification('Logging out...', 'info');
        
        // Unsubscribe from real-time updates
        supabase.removeAllChannels();
        
        // Clear session
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Clear stored data
        localStorage.removeItem('userEmail');
        localStorage.clear();
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        console.error('Logout error:', error);
        this.showNotification('Logout failed', 'error');
    }
}
