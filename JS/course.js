class CourseInterface {
    constructor() {
        this.currentUser = null;
        this.actionCooldowns = {
            like: 500,      // 500ms between likes
            comment: 1000,  // 1 second between comments
            share: 2000     // 2 seconds between shares
        };
        this.lastActions = {};
        this.selectedImages = [];
        this.selectedVideoUrl = null;
        this.selectedPoll = null;
        this.uploadedAvatarUrl = null;
        this.postsOffset = 0;
        this.postsLimit = 20;
        this.isLoadingPosts = false;
        this.hasMorePosts = true;
        this.init();
    }

    async init() {
        // Check if user is authenticated
        await this.checkAuthentication();
        this.populateUserProfile();
        this.setupEventListeners();
        
        // Only load posts from database if on the home page (course.html)
        if (this.isHomePage()) {
            this.loadPostsFromDatabase();
        }
    }

    isHomePage() {
        // Check if current page is course.html
        const currentPage = window.location.pathname.split('/').pop() || 'course.html';
        return currentPage === 'course.html' || currentPage === '';
    }

    reinitializeLucideIcons() {
        // Reinitialize Lucide icons after DOM updates
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async checkAuthentication() {
        // Skip auth for educational content pages
        const educationalPages = ['cry-of-rebellion', 'first-mass', 'cavite-mutiny', 'retraction-of-rizal', 'games', 'interactive-tasks', 'videos', 'worksheets', 'graphic-organizers', 'reflections'];
        const currentPage = window.location.pathname.toLowerCase();
        const isEducationalPage = educationalPages.some(page => currentPage.includes(page));
        
        if (isEducationalPage) {
            // Allow access to educational pages without auth, but try to load user data if available
            try {
                const session = await getCurrentSession();
                if (session) {
                    this.currentUser = session.user;
                } else {
                    // Set default guest user for educational pages
                    this.currentUser = {
                        id: 'guest',
                        email: 'guest@example.com',
                        user_metadata: { full_name: 'Guest User' }
                    };
                }
            } catch (error) {
                this.currentUser = {
                    id: 'guest',
                    email: 'guest@example.com',
                    user_metadata: { full_name: 'Guest User' }
                };
            }
            return;
        }
        
        try {
            const session = await getCurrentSession();
            if (!session) {
                // Redirect to login if not authenticated
                window.location.href = 'index.html';
                return;
            }
            this.currentUser = session.user;
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = 'index.html';
        }
    }

    handleShareButtonClick(postData) {
        // Sharing logic removed. Function intentionally left as a no-op.
        return;
    }

    async optimisticLikeToggle(likeBtn, span, icon, likeCount, liked, postId) {
        // Update UI optimistically
        if (liked) {
            likeBtn.classList.remove('liked');
            likeBtn.setAttribute('aria-pressed', 'false');
            likeBtn.setAttribute('aria-label', 'Like');
            likeBtn.title = 'Like';
            if (icon) { icon.style.fill = 'none'; icon.style.stroke = 'currentColor'; icon.style.color = 'currentColor'; }
            span.textContent = Math.max(likeCount - 1, 0);
        } else {
            likeBtn.classList.add('liked');
            likeBtn.setAttribute('aria-pressed', 'true');
            likeBtn.setAttribute('aria-label', 'Unlike');
            likeBtn.title = 'Unlike';
            if (icon) { icon.style.fill = '#f39c12'; icon.style.stroke = '#f39c12'; icon.style.color = '#f39c12'; }
            span.textContent = likeCount + 1;
        }

        // Call backend
        try {
            if (liked) {
                await window.DB.unlikePost(postId, this.currentUser.id);
            } else {
                await window.DB.likePost(postId, this.currentUser.id);
            }
        } catch (err) {
            // Revert UI if backend fails
            if (liked) {
                likeBtn.classList.add('liked');
                likeBtn.setAttribute('aria-pressed', 'true');
                likeBtn.setAttribute('aria-label', 'Unlike');
                likeBtn.title = 'Unlike';
                if (icon) { icon.style.fill = '#f39c12'; icon.style.stroke = '#f39c12'; icon.style.color = '#f39c12'; }
                span.textContent = likeCount;
            } else {
                likeBtn.classList.remove('liked');
                likeBtn.setAttribute('aria-pressed', 'false');
                likeBtn.setAttribute('aria-label', 'Like');
                likeBtn.title = 'Like';
                if (icon) { icon.style.fill = 'none'; icon.style.stroke = 'currentColor'; icon.style.color = 'currentColor'; }
                span.textContent = Math.max(likeCount, 0);
            }
            this.showNotification('Failed to update like. Please try again.', 'error');
        }
    }

    populateUserProfile() {
        try {
            const nameEl = document.getElementById('profileName');
            const emailEl = document.getElementById('profileEmail');
            const avatarEl = document.getElementById('profileAvatar');

            // Also update create post section
            const createPostNameEl = document.getElementById('createPostName');
            const createPostAvatarEl = document.getElementById('createPostAvatar');

            // Debugging: log invocation and element presence
            console.debug('[CourseInterface] populateUserProfile invoked', {
                hasNameEl: !!nameEl,
                hasEmailEl: !!emailEl,
                hasAvatarEl: !!avatarEl
            });

            // If elements are not present yet, schedule a one-time retry on DOMContentLoaded
            if ((!nameEl || !emailEl || !avatarEl) && !this._profilePopulateScheduled) {
                this._profilePopulateScheduled = true;
                console.debug('[CourseInterface] profile elements missing, retrying on DOMContentLoaded');
                document.addEventListener('DOMContentLoaded', () => {
                    try { this.populateUserProfile(); } catch (e) { console.error(e); }
                }, { once: true });
                return;
            }

            // Try to fetch profile from database first
            (async () => {
                try {
                    const supabaseClient = await window.supabaseClient || getSupabaseClient();
                    const { data: session } = await supabaseClient.auth.getSession();
                    
                    if (session?.session?.user) {
                        const userId = session.session.user.id;
                        const { data: profileData, error } = await supabaseClient
                            .from('user_profiles')
                            .select('full_name, bio, avatar_url')
                            .eq('id', userId)
                            .single();
                        
                        if (!error && profileData) {
                            // Use database data
                            const name = profileData.full_name || this.currentUser?.user_metadata?.full_name || this.currentUser?.email?.split('@')[0] || 'User';
                            const email = profileData.bio || this.currentUser?.email || '';
                            const avatarUrl = profileData.avatar_url || `https://i.pravatar.cc/80?u=${this.currentUser?.id || 'guest'}`;
                            const smallAvatarUrl = profileData.avatar_url || `https://i.pravatar.cc/40?u=${this.currentUser?.id || 'guest'}`;

                            // Update profile sidebar
                            if (nameEl) nameEl.textContent = name;
                            if (emailEl) emailEl.textContent = email;
                            if (avatarEl) avatarEl.src = avatarUrl;
                            
                            // Update create post section
                            if (createPostNameEl) createPostNameEl.textContent = name;
                            if (createPostAvatarEl) createPostAvatarEl.src = smallAvatarUrl;
                            
                            return;
                        }
                    }
                } catch (err) {
                }

                // Fallback to currentUser data
                if (this.currentUser) {
                    // Extract name from email or use user metadata
                    const name = this.currentUser.user_metadata?.full_name || this.currentUser.email.split('@')[0];
                    const email = this.currentUser.email;
                    const avatarUrl = `https://i.pravatar.cc/80?u=${this.currentUser.id}`;
                    const smallAvatarUrl = `https://i.pravatar.cc/40?u=${this.currentUser.id}`;

                    // Update profile sidebar
                    if (nameEl) nameEl.textContent = name;
                    if (emailEl) emailEl.textContent = email;
                    if (avatarEl) avatarEl.src = avatarUrl;
                    
                    // Update create post section
                    if (createPostNameEl) createPostNameEl.textContent = name;
                    if (createPostAvatarEl) createPostAvatarEl.src = smallAvatarUrl;
                }
            })();
        } catch (error) {
            console.error('Error populating profile:', error);
        }
    }

    // Fetch a user profile by id (preferred) or email (fallback).
    async fetchUserProfileByIdOrEmail(identifier) {
        if (!identifier) return null;
        try {
            const supabaseClient = await window.supabaseClient || getSupabaseClient();

            // Try by id first
            try {
                const { data, error } = await supabaseClient
                    .from('user_profiles')
                    .select('id, full_name, avatar_url, user_email')
                    .eq('id', identifier)
                    .maybeSingle();
                if (!error && data) return data;
            } catch (e) {
                // ignore and try by email
            }

            // Fallback to email lookup
            try {
                const { data, error } = await supabaseClient
                    .from('user_profiles')
                    .select('id, full_name, avatar_url, user_email')
                    .eq('user_email', identifier)
                    .maybeSingle();
                if (!error && data) return data;
            } catch (e) {
                // ignore
            }
        } catch (err) {
            // ignore
        }
        return null;
    }

    setupEventListeners() {
        // Menu toggle for mobile
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleMenu());
        }

        // Right sidebar toggle for mobile
        const sidebarToggleRight = document.getElementById('sidebarToggleRight');
        if (sidebarToggleRight) {
            sidebarToggleRight.addEventListener('click', () => this.toggleRightSidebar());
        }

        // COMPLETELY NEW DROPDOWN LOGIC - Using inline styles
        const dropdownToggles = document.querySelectorAll('.nav-item-dropdown .nav-item');
        
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const dropdown = toggle.closest('.nav-item-dropdown');
                const menu = dropdown.querySelector('.dropdown-menu');
                
                // Toggle menu visibility
                const isVisible = menu.style.display === 'flex';
                
                // Close all other menus
                document.querySelectorAll('.dropdown-menu').forEach(otherMenu => {
                    otherMenu.style.display = 'none';
                });
                
                // Toggle current menu
                menu.style.display = isVisible ? 'none' : 'flex';
            });
        });
        
        // Auto-open Topic dropdown on specific pages
        const currentPage = window.location.pathname.toLowerCase();
        if (currentPage.includes('cavite-mutiny') || currentPage.includes('cry-of-rebellion') || 
            currentPage.includes('first-mass') || currentPage.includes('retraction-of-rizal')) {
            dropdownToggles.forEach(toggle => {
                if (toggle.textContent.trim() === 'Topic') {
                    const dropdown = toggle.closest('.nav-item-dropdown');
                    const menu = dropdown.querySelector('.dropdown-menu');
                    menu.style.display = 'flex';
                }
            });
        }
        
        // Auto-open Activities dropdown on activity pages
        if (currentPage.includes('interactive-tasks') || currentPage.includes('games') || currentPage.includes('worksheets') || currentPage.includes('graphic-organizers') || currentPage.includes('reflections')) {
            dropdownToggles.forEach(toggle => {
                if (toggle.textContent.trim() === 'Activities') {
                    const dropdown = toggle.closest('.nav-item-dropdown');
                    const menu = dropdown.querySelector('.dropdown-menu');
                    menu.style.display = 'flex';
                }
            });
        }
        
        // Close all menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-item-dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });
        
        // Close dropdowns when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-item-dropdown')) {
                document.querySelectorAll('.nav-item-dropdown.open').forEach(dropdown => {
                    dropdown.classList.remove('open');
                });
            }
        });

        // Navigation items (for regular links only, not dropdown toggles)
        document.querySelectorAll('.nav-item').forEach(item => {
            // Skip dropdown toggles
            if (item.closest('.nav-item-dropdown .nav-item')) {
                return;
            }
            item.addEventListener('click', (e) => this.handleNavClick(e));
        });

        // Post input
        const postInput = document.querySelector('.post-input');
        if (postInput) {
            postInput.addEventListener('focus', () => {
                postInput.style.borderColor = '#1e5a96';
            });
            postInput.addEventListener('blur', () => {
                postInput.style.borderColor = '#dfe6ec';
            });
        }

        // Send button
        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.handlePostSubmit());
        }

        // Image upload
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageSelect(e));
        }

        // Video URL button
        const videoUrlBtn = document.getElementById('videoUrlBtn');
        if (videoUrlBtn) {
            videoUrlBtn.addEventListener('click', () => this.handleVideoUrlPrompt());
        }

        // Poll button
        const pollBtn = document.getElementById('pollBtn');
        if (pollBtn) {
            pollBtn.addEventListener('click', () => this.handlePollCreation());
        }

        // Play button
        const playBtn = document.querySelector('.play-button');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.playVideo());
        }

        // Action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAction(e));
        });

        // Todo checkboxes
        document.querySelectorAll('.todo-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleTodoToggle(e));
        });

        // Idea cards
        document.querySelectorAll('.idea-card').forEach(card => {
            card.addEventListener('click', (e) => this.openIdea(e));
        });

        // Join button
        const joinBtn = document.querySelector('.join-button');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => this.joinClass());
        }

        // Notification button
        const notifBtn = document.querySelector('.notification-btn');
        if (notifBtn) {
            notifBtn.addEventListener('click', () => this.showNotifications());
        }

        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Sidebar collapse button (only on desktop)
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        const mainLayout = document.querySelector('.main-layout');
        const leftSidebar = document.getElementById('leftSidebar');
        if (collapseBtn && mainLayout && leftSidebar) {
            collapseBtn.addEventListener('click', () => {
                // Only collapse on desktop (window width > 1024px)
                if (window.innerWidth > 1024) {
                    mainLayout.classList.toggle('sidebar-collapsed');
                    leftSidebar.classList.toggle('collapsed');
                    // Save preference to localStorage
                    const isCollapsed = mainLayout.classList.contains('sidebar-collapsed');
                    localStorage.setItem('sidebarCollapsed', isCollapsed);
                }
            });
            // Load saved preference only on desktop
            if (window.innerWidth > 1024) {
                const wasCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
                if (wasCollapsed) {
                    mainLayout.classList.add('sidebar-collapsed');
                    leftSidebar.classList.add('collapsed');
                }
            }
        }

        // Edit profile button
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', async () => await this.openEditProfileModal());
        }

        // Edit profile modal controls
        const closeEditModal = document.getElementById('closeEditModal');
        if (closeEditModal) {
            closeEditModal.addEventListener('click', () => this.closeEditProfileModal());
        }

        const cancelEditBtn = document.getElementById('cancelEditBtn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.closeEditProfileModal());
        }

        const saveProfileBtn = document.getElementById('saveProfileBtn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => this.saveProfileChanges());
        }

        // Close modal when clicking outside
        const modal = document.getElementById('editProfileModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeEditProfileModal();
            });
        }

        // Avatar upload functionality
        const avatarPreview = document.getElementById('avatarPreview');
        const editAvatar = document.getElementById('editAvatar');

        if (avatarPreview && editAvatar) {
            // Click on avatar preview to trigger file input
            avatarPreview.addEventListener('click', () => {
                editAvatar.click();
            });

            // Handle file selection
            editAvatar.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleAvatarUpload(file);
                }
            });
        }

        // Video URL modal controls
        const closeVideoModal = document.getElementById('closeVideoModal');
        if (closeVideoModal) {
            closeVideoModal.addEventListener('click', () => this.closeVideoUrlModal());
        }

        const cancelVideoBtn = document.getElementById('cancelVideoBtn');
        if (cancelVideoBtn) {
            cancelVideoBtn.addEventListener('click', () => this.closeVideoUrlModal());
        }

        const confirmVideoBtn = document.getElementById('confirmVideoBtn');
        if (confirmVideoBtn) {
            confirmVideoBtn.addEventListener('click', () => this.submitVideoUrl());
        }

        const videoUrlInput = document.getElementById('videoUrlInput');
        if (videoUrlInput) {
            videoUrlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitVideoUrl();
                }
            });
        }

        // Close video modal when clicking outside
        const videoModal = document.getElementById('videoUrlModal');
        if (videoModal) {
            videoModal.addEventListener('click', (e) => {
                if (e.target === videoModal) this.closeVideoUrlModal();
            });
        }

        // Poll modal controls
        const closePollModal = document.getElementById('closePollModal');
        if (closePollModal) {
            closePollModal.addEventListener('click', () => this.closePollModal());
        }

        const cancelPollBtn = document.getElementById('cancelPollBtn');
        if (cancelPollBtn) {
            cancelPollBtn.addEventListener('click', () => this.closePollModal());
        }

        const confirmPollBtn = document.getElementById('confirmPollBtn');
        if (confirmPollBtn) {
            confirmPollBtn.addEventListener('click', () => this.submitPoll());
        }

        const addOptionBtn = document.getElementById('addOptionBtn');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => this.addPollOption());
        }

        // Close poll modal when clicking outside
        const pollModal = document.getElementById('pollModal');
        if (pollModal) {
            pollModal.addEventListener('click', (e) => {
                if (e.target === pollModal) this.closePollModal();
            });
        }

        // Forum functionality
        this.setupForumListeners();
    }

    setupForumListeners() {
        const forumSubmitBtn = document.getElementById('forumSubmitBtn');
        const forumInputField = document.getElementById('forumInputField');
        const forumAvatarInput = document.getElementById('forumAvatarInput');

        if (forumSubmitBtn && forumInputField) {
            forumSubmitBtn.addEventListener('click', () => this.handleForumSubmit());
            
            forumInputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleForumSubmit();
                }
            });
        }

        // Update forum avatar
        if (forumAvatarInput && this.currentUser) {
            const avatarUrl = `https://i.pravatar.cc/40?u=${this.currentUser.id}`;
            forumAvatarInput.src = avatarUrl;
        }

        // Load forum posts
        this.loadForumPosts();
    }

    async handleForumSubmit() {
        const forumInputField = document.getElementById('forumInputField');
        if (!forumInputField || !forumInputField.value.trim()) {
            this.showNotification('Please enter a message', 'error');
            return;
        }

        const content = forumInputField.value.trim();
        const currentPage = window.location.pathname.split('/').pop() || 'course.html';
        
        // Determine topic ID based on current page
        let topicId = null;
        if (currentPage === 'cavite-mutiny.html') topicId = 1;
        else if (currentPage === 'retraction-of-rizal.html') topicId = 2;

        try {
            const { data, error } = await window.supabaseClient
                .from('forum_posts')
                .insert({
                    topic_id: topicId,
                    author_id: this.currentUser.id,
                    author_name: this.currentUser.user_metadata?.full_name || this.currentUser.email.split('@')[0],
                    author_email: this.currentUser.email,
                    content: content,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error posting forum message:', error);
                this.showNotification('Failed to post message', 'error');
                return;
            }

            forumInputField.value = '';
            this.showNotification('Message posted successfully', 'success');
            this.loadForumPosts();
        } catch (error) {
            console.error('Forum submission error:', error);
            this.showNotification('Error posting message', 'error');
        }
    }

    async loadForumPosts() {
        const forumContainer = document.getElementById('forumPostsContainer');
        if (!forumContainer) return;

        const currentPage = window.location.pathname.split('/').pop() || 'course.html';
        
        // Determine topic ID
        let topicId = null;
        if (currentPage === 'cavite-mutiny.html') topicId = 1;
        else if (currentPage === 'retraction-of-rizal.html') topicId = 2;

        if (!topicId) return;

        try {
            // Use DB view that already joins author info to avoid per-post profile lookups (N+1)
            // Use keyset pagination: fetch posts earlier than `this.lastForumPostDate` if set
            const limit = this.postsLimit || 20;
            let query = window.supabaseClient
                .from('forum_posts_with_authors')
                .select('id, topic_id, author_id, author_email, author_name, author_avatar, content, created_at')
                .eq('topic_id', topicId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (this.lastForumPostDate) {
                query = query.lt('created_at', this.lastForumPostDate);
            }

            const { data: posts, error } = await query;

            if (error) {
                console.error('Error loading forum posts:', error);
                return;
            }

            if (!posts || posts.length === 0) {
                if (!this.lastForumPostDate) {
                    forumContainer.innerHTML = '<p style="text-align: center; color: #95a5a6; padding: 20px;">No discussions yet. Be the first to share!</p>';
                }
                this.hasMorePosts = false;
                return;
            }

            forumContainer.innerHTML = forumContainer.innerHTML || '';

            for (const post of posts) {
                const postElement = await this.createForumPostElement(post);
                forumContainer.appendChild(postElement);
            }

            // update pagination cursor (created_at of last post)
            const last = posts[posts.length - 1];
            this.lastForumPostDate = last.created_at;
            this.hasMorePosts = posts.length === limit;
        } catch (error) {
            console.error('Failed to load forum posts:', error);
        }
    }

    async createForumPostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'forum-post';
        
        const timeAgo = this.getTimeAgo(new Date(post.created_at));
        
        // Prefer author data provided by the DB view; fall back to avatar service or profile lookup
        let avatarSrc = post.author_avatar || `https://i.pravatar.cc/36?u=${post.author_id}`;
        let displayName = post.author_name || post.author_email || 'User';

        // Determine if this post is from the current user
        let isCurrentUserPost = false;
        if (this.currentUser && post.author_id === this.currentUser.id) {
            isCurrentUserPost = true;
        }

        // If the view didn't provide author name or avatar, try a single profile fetch as fallback
        if ((!post.author_name || !post.author_avatar) && (post.author_id || post.author_email)) {
            try {
                const profileData = await this.fetchUserProfileByIdOrEmail(post.author_id || post.author_email);
                if (profileData) {
                    if (!post.author_name && profileData.full_name) displayName = profileData.full_name;
                    if (!post.author_avatar && profileData.avatar_url) avatarSrc = profileData.avatar_url;
                }
            } catch (err) {
                // ignore fallback failure
            }
        }
        
        postDiv.innerHTML = `
            <div class="forum-post-header">
                <img src="${avatarSrc}" alt="${displayName}" class="avatar" />
                <div class="forum-post-info">
                    <div class="forum-post-author">${this.escapeHtml(displayName)}</div>
                    <div class="forum-post-time">${timeAgo}</div>
                </div>
            </div>
            <div class="forum-post-content">${this.escapeHtml(post.content)}</div>
        `;
        
        return postDiv;
    }

    getTimeAgo(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toggleMenu() {
        const sidebar = document.getElementById('leftSidebar');
        if (sidebar) {
            sidebar.classList.toggle('mobile-open');
        }
    }

    toggleRightSidebar() {
        const rightSidebar = document.querySelector('.right-sidebar');
        if (rightSidebar) {
            rightSidebar.classList.toggle('mobile-open');
        }
    }

    handleImageSelect(e) {
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            if (!file.type.startsWith('image/')) {
                this.showNotification('Only image files are allowed', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                this.showNotification('Image size must be less than 5MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const imageObj = {
                    file: file,
                    preview: event.target.result
                };
                this.selectedImages.push(imageObj);
                this.renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        e.target.value = '';
    }

    renderImagePreviews() {
        const container = document.getElementById('imagePreviewContainer');
        container.innerHTML = '';

        this.selectedImages.forEach((imageObj, index) => {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview';
            previewDiv.innerHTML = `
                <img src="${imageObj.preview}" alt="Preview ${index}" />
                <button class="remove-image" data-index="${index}">×</button>
            `;

            const removeBtn = previewDiv.querySelector('.remove-image');
            removeBtn.addEventListener('click', () => {
                this.selectedImages.splice(index, 1);
                this.renderImagePreviews();
            });

            container.appendChild(previewDiv);
        });
    }

    handleVideoUrlPrompt() {
        this.openVideoUrlModal();
    }

    openVideoUrlModal() {
        const modal = document.getElementById('videoUrlModal');
        const input = document.getElementById('videoUrlInput');
        if (modal) {
            modal.classList.add('show');
            if (input) {
                input.value = '';
                input.focus();
            }
        }
    }

    closeVideoUrlModal() {
        const modal = document.getElementById('videoUrlModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    submitVideoUrl() {
        const input = document.getElementById('videoUrlInput');
        if (!input) return;

        const url = input.value.trim();
        if (!url) {
            this.showNotification('Please enter a YouTube URL', 'error');
            return;
        }

        // Extract video ID from YouTube URL
        const videoId = this.extractYouTubeId(url);
        if (!videoId) {
            this.showNotification('Invalid YouTube URL. Please try again.', 'error');
            return;
        }

        this.selectedVideoUrl = videoId;
        this.renderVideoPreview();
        this.closeVideoUrlModal();
        this.showNotification('Video added! ✓', 'success');
    }

    renderVideoPreview() {
        const container = document.getElementById('videoPreviewContainer');
        if (!container) return;

        container.innerHTML = '';

        if (this.selectedVideoUrl) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'video-preview';
            previewDiv.innerHTML = `
                <div class="video-preview-item">
                    <img src="https://img.youtube.com/vi/${this.selectedVideoUrl}/maxresdefault.jpg" alt="Video preview" class="video-thumbnail" />
                    <button class="remove-video" title="Remove video">×</button>
                    <div class="video-preview-overlay">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    </div>
                </div>
            `;

            const removeBtn = previewDiv.querySelector('.remove-video');
            removeBtn.addEventListener('click', () => {
                this.selectedVideoUrl = null;
                this.renderVideoPreview();
                this.showNotification('Video removed', 'info');
            });

            container.appendChild(previewDiv);
        }
    }

    handlePollCreation() {
        this.openPollModal();
    }

    openPollModal() {
        const modal = document.getElementById('pollModal');
        if (modal) {
            modal.classList.add('show');
            // Clear previous inputs
            document.getElementById('pollOption1').value = '';
            document.getElementById('pollOption2').value = '';
            document.getElementById('pollOption3').value = '';
            document.getElementById('pollOption4').value = '';
            
            // Remove any extra options added previously
            const container = document.getElementById('pollOptionsContainer');
            const extraOptions = container.querySelectorAll('.dynamic-poll-option');
            extraOptions.forEach(opt => opt.remove());
            
            // Reset counter
            this.pollOptionCount = 4;
            
            // Focus on first input
            document.getElementById('pollOption1').focus();
        }
    }

    closePollModal() {
        const modal = document.getElementById('pollModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    addPollOption() {
        const container = document.getElementById('pollOptionsContainer');
        if (!container) return;

        this.pollOptionCount = (this.pollOptionCount || 4) + 1;
        const optionNum = this.pollOptionCount;

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group dynamic-poll-option';
        formGroup.innerHTML = `
            <label for="pollOption${optionNum}">Option ${optionNum} (Optional)</label>
            <div style="display: flex; gap: 8px;">
                <input type="text" id="pollOption${optionNum}" placeholder="Enter poll option" style="flex: 1;" />
                <button type="button" class="remove-option-btn" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 18px; padding: 0; width: 30px;">×</button>
            </div>
        `;

        const removeBtn = formGroup.querySelector('.remove-option-btn');
        removeBtn.addEventListener('click', () => {
            formGroup.remove();
        });

        container.appendChild(formGroup);
        
        // Focus on the new input
        document.getElementById(`pollOption${optionNum}`).focus();
    }

    submitPoll() {
        const option1 = document.getElementById('pollOption1').value.trim();
        const option2 = document.getElementById('pollOption2').value.trim();

        if (!option1) {
            this.showNotification('Please enter the first poll option', 'error');
            document.getElementById('pollOption1').focus();
            return;
        }

        if (!option2) {
            this.showNotification('Please enter the second poll option', 'error');
            document.getElementById('pollOption2').focus();
            return;
        }

        const options = [option1, option2];
        
        // Collect all optional options (both static and dynamic)
        const container = document.getElementById('pollOptionsContainer');
        const optionInputs = container.querySelectorAll('input[type="text"]');
        optionInputs.forEach((input, idx) => {
            const value = input.value.trim();
            if (value) {
                options.push(value);
            }
        });

        this.selectedPoll = {
            question: 'Poll',
            options: options,
            votes: options.map(() => 0)
        };

        this.renderPollPreview();
        this.closePollModal();
        this.showNotification(`Poll created with ${options.length} options!`, 'success');
    }

    renderPollPreview() {
        const container = document.getElementById('pollPreviewContainer');
        if (!container) return;

        container.innerHTML = '';

        if (this.selectedPoll) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'poll-preview';
            previewDiv.innerHTML = `
                <div class="poll-preview-item">
                    <div class="poll-preview-header">📊 Poll</div>
                    <div class="poll-options-preview">
                        ${this.selectedPoll.options.map((opt, idx) => `
                            <div class="poll-option-preview">${idx + 1}. ${this.escapeHtml(opt)}</div>
                        `).join('')}
                    </div>
                    <button class="remove-poll" title="Remove poll">×</button>
                </div>
            `;

            const removeBtn = previewDiv.querySelector('.remove-poll');
            removeBtn.addEventListener('click', () => {
                this.selectedPoll = null;
                this.renderPollPreview();
                this.showNotification('Poll removed', 'info');
            });

            container.appendChild(previewDiv);
        }
    }

    extractYouTubeId(url) {
        // Handle various YouTube URL formats
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    }

    async handleLogout() {
        this.showNotification('Logging out...', 'info');
        try {
            const { error } = await window.supabaseClient.auth.signOut();
            if (error) throw error;
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Logout failed', 'error');
        }
    }

    handleNavClick(e) {
        // Remove active from all items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        // Add active to clicked item
        e.currentTarget.classList.add('active');
    }

    async handlePostSubmit() {
        const input = document.querySelector('.post-input');
        if (!input || (!input.value.trim() && this.selectedImages.length === 0)) {
            this.showNotification('Please write something or add an image before posting', 'info');
            return;
        }

        const content = input.value.trim();
        const topicId = 1; // Default topic ID

        try {
            // Disable button and show loading
            const sendBtn = document.querySelector('.send-btn');
            if (sendBtn) sendBtn.disabled = true;
            
            this.showNotification('Posting...', 'info');

            // Get author name
            const authorName = this.currentUser.user_metadata?.full_name || 
                              this.currentUser.email.split('@')[0];

            // Get author avatar URL from database or localStorage
            let authorAvatarUrl = localStorage.getItem('profileAvatarUrl') || localStorage.getItem('profileAvatar');
            
            // Try to fetch from user_profiles table in Supabase (with error handling)
                try {
                    const prof = await this.fetchUserProfileByIdOrEmail(this.currentUser.id || this.currentUser.email);
                    if (prof && prof.avatar_url) authorAvatarUrl = prof.avatar_url;
                } catch (err) {
                    // ignore
                }
            
            if (!authorAvatarUrl) {
                authorAvatarUrl = `https://i.pravatar.cc/40?u=${this.currentUser.id}`;
            }

            // Upload images and get URLs
            let imageUrls = [];
            if (this.selectedImages.length > 0) {
                imageUrls = await this.uploadImagesToStorage();
            }

            // Save to Supabase
            const { data, error } = await window.supabaseClient
                .from('posts')
                .insert([
                    {
                        topic_id: topicId,
                        content: content,
                        author_id: this.currentUser.id,
                        author_name: authorName,
                        author_email: this.currentUser.email,
                        author_avatar_url: authorAvatarUrl,
                        likes_count: 0,
                        comments_count: 0,
                        shares_count: 0,
                        image_url: imageUrls.length > 0 ? imageUrls[0] : null,
                        video_url: this.selectedVideoUrl || null,
                        poll_data: this.selectedPoll ? JSON.stringify(this.selectedPoll) : null
                    }
                ])
                .select();

            if (error) {
                console.error('Supabase error:', error);
                throw new Error(error.message || 'Failed to save post');
            }

            this.showNotification('Post published! ✓', 'success');
            input.value = '';
            this.selectedImages = [];
            this.selectedVideoUrl = null;
            this.selectedPoll = null;
            this.renderImagePreviews();
            this.renderVideoPreview();
            this.renderPollPreview();
            
            // Re-enable button
            if (sendBtn) sendBtn.disabled = false;
            
            // Reload posts to show the new one
            this.loadPostsFromDatabase();
            
        } catch (error) {
            console.error('Post submission error:', error);
            this.showNotification('Error: ' + (error.message || 'Failed to post'), 'error');
            
            // Re-enable button on error
            const sendBtn = document.querySelector('.send-btn');
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    async uploadImagesToStorage() {
        const imageUrls = [];
        
        for (const imageObj of this.selectedImages) {
            try {
                const fileName = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}-${imageObj.file.name}`;
                
                // Upload with explicit auth
                const { data, error } = await window.supabaseClient.storage
                    .from('post-images')
                    .upload(fileName, imageObj.file, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: imageObj.file.type
                    });

                if (error) {
                    console.error('Upload error:', error);
                    console.error('Error status:', error.status);
                    console.error('Error message:', error.message);
                    throw error;
                }

                // Get public URL
                const { data: urlData } = window.supabaseClient.storage
                    .from('post-images')
                    .getPublicUrl(fileName);

                imageUrls.push(urlData.publicUrl);
            } catch (error) {
                console.error('Failed to upload image:', error);
                throw new Error('Failed to upload image: ' + error.message);
            }
        }

        return imageUrls;
    }

    async loadPostsFromDatabase(loadMore = false) {
        if (this.isLoadingPosts) return;
        this.isLoadingPosts = true;

        try {
            // Reset offset if not loading more
            if (!loadMore) {
                this.postsOffset = 0;
                this.hasMorePosts = true;
            }

            // Fetch posts from Supabase with pagination
            const { data: posts, error } = await window.supabaseClient
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false })
                .range(this.postsOffset, this.postsOffset + this.postsLimit - 1);

            if (error) {
                console.error('Error loading posts:', error);
                this.isLoadingPosts = false;
                return;
            }

            if (!posts || posts.length === 0) {
                this.hasMorePosts = false;
                this.isLoadingPosts = false;
                return;
            }

            // Check if we got fewer posts than requested (end of data)
            if (posts.length < this.postsLimit) {
                this.hasMorePosts = false;
            }

            // Get unique author ids to fetch profile data in bulk (posts.author_id is authoritative)
            const authorIds = [...new Set(posts.map(post => post.author_id).filter(id => id))];

            // Fetch profile data for all authors in a single query (by profile id)
            const { data: profiles, error: profileError } = await window.supabaseClient
                .from('user_profiles')
                .select('id, user_email, full_name, avatar_url')
                .in('id', authorIds);

            // Create a map for quick lookup by id and fallback by email
            const profileMap = new Map();
            if (!profileError && profiles) {
                profiles.forEach(profile => {
                    if (profile.id) profileMap.set(profile.id, profile);
                    if (profile.user_email) profileMap.set(profile.user_email, profile);
                });
            }

            // Fetch current user's likes
            const { data: userLikes, error: likesError } = await window.supabaseClient
                .from('post_likes')
                .select('post_id')
                .eq('user_id', this.currentUser.id);

            const likedPostIds = new Set(userLikes?.map(like => like.post_id) || []);

            // Get the discussion section
            const discussionSection = document.querySelector('.discussion-section');
            if (!discussionSection) {
                this.isLoadingPosts = false;
                return;
            }

            // Find or create posts container (after create-post)
            let postsContainer = document.getElementById('posts-container');
            if (!postsContainer) {
                postsContainer = document.createElement('div');
                postsContainer.id = 'posts-container';
                const createPost = discussionSection.querySelector('.create-post');
                if (createPost && createPost.nextSibling) {
                    createPost.parentNode.insertBefore(postsContainer, createPost.nextSibling);
                } else {
                    discussionSection.appendChild(postsContainer);
                }
            }

            // Clear existing posts only if not loading more
            if (!loadMore) {
                const existingDbPosts = postsContainer.querySelectorAll('.post-card[data-post-id]');
                existingDbPosts.forEach(post => post.remove());
            }

            // Render each post using the profile data
            for (const post of posts) {
                const postElement = this.createPostElement(post, likedPostIds.has(post.id), profileMap);
                postsContainer.appendChild(postElement);
            }

            // Update offset for next load
            this.postsOffset += posts.length;

            // Add or update "Load More" button
            this.updateLoadMoreButton(postsContainer);

            // Reinitialize Lucide icons for dynamically loaded content
            this.reinitializeLucideIcons();

        } catch (error) {
            console.error('Failed to load posts:', error);
        } finally {
            this.isLoadingPosts = false;
        }
    }

    updateLoadMoreButton(container) {
        // Remove existing load more button
        const existingButton = container.querySelector('.load-more-btn');
        if (existingButton) {
            existingButton.remove();
        }

        // Add new load more button if there are more posts
        if (this.hasMorePosts) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; background: #5C3422; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: background 0.3s ease;">
                    <div class="load-more-spinner" style="display: none; width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span class="load-more-text">Load More Posts</span>
                </div>
            `;

            loadMoreBtn.addEventListener('click', async () => {
                const spinner = loadMoreBtn.querySelector('.load-more-spinner');
                const text = loadMoreBtn.querySelector('.load-more-text');
                
                spinner.style.display = 'block';
                text.textContent = 'Loading...';
                loadMoreBtn.disabled = true;

                await this.loadPostsFromDatabase(true);

                spinner.style.display = 'none';
                text.textContent = 'Load More Posts';
                loadMoreBtn.disabled = false;
            });

            container.appendChild(loadMoreBtn);
        }
    }

    renderPollInPost(pollDataJson, postId) {
        try {
            const pollData = typeof pollDataJson === 'string' ? JSON.parse(pollDataJson) : pollDataJson;
            const totalVotes = pollData.votes.reduce((sum, v) => sum + v, 0);

            return `
                <div class="post-poll" data-post-id="${postId}">
                    <div class="poll-title">📊 Poll</div>
                    <div class="poll-options">
                        ${pollData.options.map((opt, idx) => {
                            const votes = pollData.votes[idx] || 0;
                            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                            return `
                                <button class="poll-option" data-option-index="${idx}" data-post-id="${postId}">
                                    <div class="poll-option-label">
                                        <span>${this.escapeHtml(opt)}</span>
                                        <span class="poll-percentage">${percentage}%</span>
                                    </div>
                                    <div class="poll-option-bar">
                                        <div class="poll-option-fill" style="width: ${percentage}%"></div>
                                    </div>
                                    <div class="poll-votes" class="poll-vote-count">${votes} vote${votes !== 1 ? 's' : ''}</div>
                                </button>
                            `;
                        }).join('')}
                    </div>
                    <div class="poll-total">${totalVotes} total vote${totalVotes !== 1 ? 's' : ''}</div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering poll:', error);
            return '';
        }
    }

    async loadPollVotes(postCard, pollDataJson, postId) {
        try {
            const pollData = typeof pollDataJson === 'string' ? JSON.parse(pollDataJson) : pollDataJson;
            
            // Fetch actual vote counts from database
            const { data: votes, error } = await window.supabaseClient
                .from('polls_votes')
                .select('option_index')
                .eq('post_id', postId);

            if (error) {
                console.error('Error loading votes:', error);
                return;
            }

            if (!votes || votes.length === 0) {
                return; // No votes yet, keep defaults
            }

            // Count votes for each option
            const voteCounts = Array(pollData.options.length).fill(0);
            votes.forEach(vote => {
                if (vote.option_index < voteCounts.length) {
                    voteCounts[vote.option_index]++;
                }
            });

            const totalVotes = voteCounts.reduce((sum, v) => sum + v, 0);

            // Update poll display with vote counts
            const pollElement = postCard.querySelector('.post-poll');
            if (!pollElement) return;

            const pollOptions = pollElement.querySelectorAll('.poll-option');
            pollOptions.forEach((option, idx) => {
                const percentage = totalVotes > 0 ? Math.round((voteCounts[idx] / totalVotes) * 100) : 0;
                const fill = option.querySelector('.poll-option-fill');
                const voteCount = option.querySelector('.poll-vote-count');
                const percentageSpan = option.querySelector('.poll-percentage');

                if (fill) fill.style.width = percentage + '%';
                if (voteCount) voteCount.textContent = `${voteCounts[idx]} vote${voteCounts[idx] !== 1 ? 's' : ''}`;
                if (percentageSpan) percentageSpan.textContent = percentage + '%';
            });

            const totalDisplay = pollElement.querySelector('.poll-total');
            if (totalDisplay) {
                totalDisplay.textContent = `${totalVotes} total vote${totalVotes !== 1 ? 's' : ''}`;
            }

        } catch (error) {
            console.error('Error updating poll votes:', error);
        }
    }

    createPostElement(postData, isLiked = false, profileMap = new Map()) {
        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        postCard.setAttribute('data-post-id', postData.id);

        // Check if this is a shared post (supports original_post_id or shared_by_name)
        const isSharedPost = !!(postData.original_post_id || postData.shared_by_name);

        if (isSharedPost) {
            // Build an object representing the original post (from original_* fields inserted with the share)
            const originalData = {
                id: postData.original_post_id || null,
                author_id: postData.original_author_id,
                author_name: postData.original_author_name,
                author_email: postData.original_author_email,
                author_avatar_url: postData.original_author_avatar_url,
                content: postData.original_content || postData.content,
                image_url: postData.image_url,
                video_url: postData.video_url,
                poll_data: postData.poll_data,
                created_at: postData.created_at
            };

            const originalPostHtml = this.createOriginalPostContent(originalData, isLiked, profileMap);

            // Use the sharing post's author as the sharer name (author_name is set to sharer when inserted)
            const sharerName = postData.author_name || postData.shared_by_name || 'Someone';

            postCard.innerHTML = `
                <div class="share-header" style="padding: 12px 16px; background: #f8f9fa; border-bottom: 1px solid #ecf0f1;">
                    <div style="font-size: 12px; color: #65676b; display: flex; align-items: center; gap: 8px;">
                        <span>↗️</span>
                        <strong>${this.escapeHtml(sharerName)}</strong>
                        <span>shared</span>
                    </div>
                </div>
                <div class="shared-post-content" style="margin: 12px; padding: 12px; border: 1px solid #ecf0f1; border-radius: 8px;">
                    ${originalPostHtml}
                </div>
            `;

            // If we have a profile for the original author in the pre-fetched map, apply it now.
            // Otherwise, attempt a quick fetch for the original author's profile and update the nested display.
            (async () => {
                try {
                    const authorId = originalData.author_id;
                    const email = originalData.author_email;
                    if (!authorId && !email) return;

                    // Prefer lookup by author_id (profile id) in profileMap, fallback to email
                    const mapProfile = (authorId && profileMap.get(authorId)) || (email && profileMap.get(email));
                    if (mapProfile) {
                        originalData.author_name = (originalData.author_name && String(originalData.author_name).trim()) ? originalData.author_name : (mapProfile.full_name || originalData.author_name);
                        originalData.author_avatar_url = originalData.author_avatar_url || mapProfile.avatar_url || originalData.author_avatar_url;
                        const container = postCard.querySelector('.shared-post-content');
                        if (container) container.innerHTML = this.createOriginalPostContent(originalData, isLiked, profileMap);
                        return;
                    }

                    // Quick DB lookup for the original author's profile (prefer id then email)
                    try {
                        const prof = await this.fetchUserProfileByIdOrEmail(authorId || email);
                        if (prof) {
                            originalData.author_name = (originalData.author_name && String(originalData.author_name).trim()) ? originalData.author_name : (prof.full_name || originalData.author_name);
                            originalData.author_avatar_url = originalData.author_avatar_url || prof.avatar_url || originalData.author_avatar_url;
                            const container = postCard.querySelector('.shared-post-content');
                            if (container) container.innerHTML = this.createOriginalPostContent(originalData, isLiked, profileMap);
                        }
                    } catch (e) {
                        // ignore
                    }
                } catch (e) {
                    // ignore
                }
            })();

            // If the nested original post is missing author fields (Unknown User) or has null id,
            // try hydrating it from the authoritative `posts` row by `original_post_id`.
            // If `original_post_id` is not present (schema stripped it), fall back to finding
            // the original post by exact `original_content` so we can enrich the nested display.
            (async () => {
                try {
                    let orig = null;

                    if (originalData.id) {
                        const { data: origData, error: origErr } = await window.supabaseClient
                            .from('posts')
                            .select('*')
                            .eq('id', originalData.id)
                            .maybeSingle();
                        if (origData && !origErr) orig = origData;
                    }

                    // Fallback: search for a post with the same content if we don't have an id
                    if (!orig && originalData.content) {
                        try {
                            const { data: found, error: fErr } = await window.supabaseClient
                                .from('posts')
                                .select('*')
                                .eq('content', originalData.content)
                                .order('created_at', { ascending: false })
                                .limit(1);

                            if (!fErr && Array.isArray(found) && found.length > 0) {
                                orig = found[0];
                            }
                        } catch (searchErr) {
                            // ignore search failure
                        }
                    }

                    if (!orig) return;

                    const enriched = {
                        id: orig.id,
                        author_id: orig.author_id,
                        author_name: orig.author_name || (orig.author_email ? orig.author_email.split('@')[0] : 'Unknown User'),
                        author_email: orig.author_email,
                        author_avatar_url: orig.author_avatar_url || (orig.author_id ? `https://i.pravatar.cc/40?u=${orig.author_id}` : ''),
                        content: orig.content,
                        image_url: orig.image_url,
                        video_url: orig.video_url,
                        poll_data: orig.poll_data,
                        created_at: orig.created_at,
                        comments_count: orig.comments_count,
                        likes_count: orig.likes_count,
                        shares_count: orig.shares_count
                    };

                    // Try to enrich author name/avatar from `user_profiles` if author_id is present (preferred),
                    // otherwise fallback to author_email.
                    try {
                        let prof = null;
                        if (enriched.author_id) {
                            const { data, error } = await window.supabaseClient
                                .from('user_profiles')
                                .select('full_name, avatar_url')
                                .eq('id', enriched.author_id)
                                .maybeSingle();
                            if (!error && data) prof = data;
                        }

                        if (!prof && enriched.author_email) {
                            try {
                                const p = await this.fetchUserProfileByIdOrEmail(enriched.author_id || enriched.author_email);
                                if (p) prof = p;
                            } catch (e) {
                                // ignore
                            }
                        }

                        if (prof) {
                            enriched.author_name = (enriched.author_name && String(enriched.author_name).trim()) ? enriched.author_name : (prof.full_name || enriched.author_name);
                            enriched.author_avatar_url = enriched.author_avatar_url || prof.avatar_url || enriched.author_avatar_url;
                        }
                    } catch (e) {
                        // ignore profile lookup failure
                    }

                    const container = postCard.querySelector('.shared-post-content');
                    if (container) {
                        const newHtml = this.createOriginalPostContent(enriched, isLiked, profileMap);
                        container.innerHTML = newHtml;

                        // Update action buttons inside the nested original post
                        const nestedComment = container.querySelector('.comment-btn');
                        const nestedShare = container.querySelector('.share-btn');
                        const nestedLike = container.querySelector('.like-btn');

                        if (nestedComment) {
                            nestedComment.setAttribute('data-post-id', String(enriched.id));
                            nestedComment.addEventListener('click', (e) => this.handleCommentClick(e, enriched));
                        }
                        if (nestedShare) {
                            nestedShare.setAttribute('data-post-id', String(enriched.id));
                            // Sharing disabled for nested original post
                            try { nestedShare.disabled = true; } catch (e) {}
                            nestedShare.classList.add('disabled');
                            nestedShare.setAttribute('aria-disabled', 'true');
                        }
                        if (nestedLike) {
                            nestedLike.setAttribute('data-post-id', String(enriched.id));
                            nestedLike.addEventListener('click', (e) => this.handleLikeClick(e, enriched));
                        }
                    }
                } catch (e) {
                    console.warn('Failed to hydrate original post for shared row:', e);
                }
            })();
        } else {
            // Get profile data from the map (prefer lookup by author_id)
            const profileData = profileMap.get(postData.author_id) || profileMap.get(postData.author_email);
            // Prefer the authoritative name stored on the post row, fallback to profile full_name
            const authorName = (postData.author_name && String(postData.author_name).trim()) ? postData.author_name : (profileData?.full_name || 'Unknown User');
            const authorAvatar = profileData?.avatar_url || postData.author_avatar_url || `https://i.pravatar.cc/40?u=${postData.author_id}`;
            const authorEmail = postData.author_email || 'user@example.com';
            const authorHandle = authorEmail.split('@')[0];
            const postTime = this.formatTimeAgo(postData.created_at);
            const isAuthor = postData.author_id === this.currentUser.id;
            
            // Try to fetch the current avatar from user_profiles for dynamic updates
            (async () => {
                try {
                    // Prefer lookup by author_id (profile id), fallback to author_email
                    const lookupKey = postData.author_id || postData.author_email;
                    let profileDataArray = null;
                    let error = null;

                    try {
                        const prof = await this.fetchUserProfileByIdOrEmail(postData.author_id || postData.author_email);
                        if (prof && prof.avatar_url) {
                            const avatarImg = postCard.querySelector('.post-card__avatar');
                            if (avatarImg) avatarImg.src = prof.avatar_url;
                        }
                    } catch (err) {
                        // silently ignore
                    }
                } catch (err) {
                    // Silently fail - use the stored avatar
                }
            })();

            postCard.innerHTML = `
                <div class="post-card__header">
                    <img src="${authorAvatar}" alt="Author avatar" class="post-card__avatar" />
                    <div class="post-card__meta">
                        <strong class="post-card__author">${authorName}</strong>
                        <div class="post-card__meta-row">
                            <span class="post-handle">@${authorHandle}</span>
                            <span class="post-card__time">• ${postTime}</span>
                        </div>
                    </div>
                    ${isAuthor ? `<button class="delete-post-btn" data-post-id="${postData.id}" title="Delete post">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>` : ''}
                </div>

                <div class="post-card__content">
                    <p>${this.escapeHtml(postData.content)}</p>
                </div>

                ${postData.image_url ? `<div class="post-media post-media--image"><img src="${postData.image_url}" alt="Post image" /></div>` : ''}
                ${postData.video_url ? `<div class="post-media post-media--video"><iframe src="https://www.youtube.com/embed/${postData.video_url}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ''}
                ${postData.poll_data ? this.renderPollInPost(postData.poll_data, postData.id) : ''}

                <div class="post-actions">
                    <button class="action-btn comment-btn" data-post-id="${postData.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>${postData.comments_count || 0}</span>
                    </button>
                    <button class="action-btn share-btn" data-post-id="${postData.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                        <span>${postData.shares_count || 0}</span>
                    </button>
                    <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${postData.id}">
                        <i data-lucide="lightbulb" style="width:16px; height:16px; color: ${isLiked ? '#f39c12' : 'currentColor'};"></i>
                        <span>${postData.likes_count || 0}</span>
                    </button>
                </div>
            `;
        }

        // Add event listeners for buttons
        const commentBtn = postCard.querySelector('.comment-btn');
        const shareBtn = postCard.querySelector('.share-btn');
        const likeBtn = postCard.querySelector('.like-btn');
        const deleteBtn = postCard.querySelector('.delete-post-btn');

        if (commentBtn) {
            commentBtn.addEventListener('click', (e) => this.handleCommentClick(e, postData));
        }

        if (shareBtn) {
            // Sharing disabled: make button inert (no click handler)
            try { shareBtn.disabled = true; } catch (e) {}
            shareBtn.classList.add('disabled');
            shareBtn.setAttribute('aria-disabled', 'true');
        }

        if (likeBtn) {
            // Accessibility: add tooltip and aria attributes
            likeBtn.setAttribute('tabindex', '0');
            likeBtn.setAttribute('role', 'button');
            likeBtn.setAttribute('aria-pressed', likeBtn.classList.contains('liked') ? 'true' : 'false');
            likeBtn.setAttribute('aria-label', likeBtn.classList.contains('liked') ? 'Unlike' : 'Like');
            likeBtn.title = likeBtn.classList.contains('liked') ? 'Unlike' : 'Like';

            // Find icon and span
            const icon = likeBtn.querySelector('i, svg');
            const span = likeBtn.querySelector('span');
            const likeCount = postData.likes_count || 0;
            const liked = likeBtn.classList.contains('liked');
            const postId = postData.id;

            // Optimistic UI toggle
            likeBtn.addEventListener('click', () => this.optimisticLikeToggle(likeBtn, span, icon, likeCount, liked, postId));
            likeBtn.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    this.optimisticLikeToggle(likeBtn, span, icon, likeCount, liked, postId);
                }
            });
        }
        // ...existing code...

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => this.handleDeletePost(e, postData));
        }

        // Also find delete buttons in shared post content (nested)
        const nestedDeleteBtn = postCard.querySelector('.shared-post-content .delete-post-btn');
        if (nestedDeleteBtn) {
            nestedDeleteBtn.addEventListener('click', (e) => this.handleDeletePost(e, postData));
        }

        // Add poll voting listeners
        const pollOptions = postCard.querySelectorAll('.poll-option');
        pollOptions.forEach(option => {
            option.addEventListener('click', (e) => this.handlePollVote(e, postData.id));
        });

        // Load poll votes if poll exists
        if (postData.poll_data) {
            this.loadPollVotes(postCard, postData.poll_data, postData.id);
        }

        return postCard;
    }

    createOriginalPostContent(postData, isLiked = false, profileMap = new Map()) {
        // Get profile data from the map (prefer lookup by author_id)
        const profileData = profileMap.get(postData.author_id) || profileMap.get(postData.author_email);
        // Use same logic as populateUserProfile for author name
        let authorName = 'User';
        if (profileData && profileData.full_name) {
            authorName = profileData.full_name;
        } else if (postData.user_metadata && postData.user_metadata.full_name) {
            authorName = postData.user_metadata.full_name;
        } else if (postData.author_name && String(postData.author_name).trim()) {
            authorName = postData.author_name;
        } else if (postData.author_email) {
            authorName = postData.author_email.split('@')[0];
        }
        const authorAvatar = profileData?.avatar_url || postData.author_avatar_url || `https://i.pravatar.cc/40?u=${postData.author_id}`;
        const authorEmail = postData.author_email || 'user@example.com';
        const authorHandle = authorEmail.split('@')[0];
        const postTime = this.formatTimeAgo(postData.created_at);
        const isAuthor = postData.author_id === this.currentUser.id;

        return `
            <div class="post-card__header">
                <img src="${authorAvatar}" alt="Author avatar" class="post-card__avatar" loading="lazy" />
                <div class="post-card__meta">
                    <strong class="post-card__author">${this.escapeHtml(authorName)}</strong>
                    <div class="post-card__meta-row">
                        <span class="post-handle">@${authorHandle}</span>
                        <span class="post-card__time">• ${postTime}</span>
                    </div>
                </div>
                ${isAuthor ? `<button class="delete-post-btn" data-post-id="${postData.id}" title="Delete post">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                </button>` : ''}
            </div>

            <div class="post-card__content">
                <p>${this.escapeHtml(postData.content)}</p>
            </div>

            ${postData.image_url ? `<div class="post-media post-media--image"><img src="${postData.image_url}" alt="Post image" /></div>` : ''}
            ${postData.video_url ? `<div class="post-media post-media--video"><iframe src="https://www.youtube.com/embed/${postData.video_url}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ''}
            ${postData.poll_data ? this.renderPollInPost(postData.poll_data, postData.id) : ''}

            <div class="post-actions">
                <button class="action-btn comment-btn" data-post-id="${postData.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>${postData.comments_count || 0}</span>
                </button>
                <button class="action-btn share-btn" data-post-id="${postData.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    <span>${postData.shares_count || 0}</span>
                </button>
                <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${postData.id}">
                    <i data-lucide="lightbulb" style="width:16px; height:16px; color: ${isLiked ? '#f39c12' : 'currentColor'};"></i>
                    <span>${postData.likes_count || 0}</span>
                </button>
            </div>
        `;
    }

    handleCommentClick(e, postData) {
        e.preventDefault();
        const btn = e.currentTarget;
        btn.style.transform = 'scale(1.1)';
        setTimeout(() => btn.style.transform = 'scale(1)', 200);
        this.openCommentsModal(postData);
    }

    handleDeletePost(e, postData) {
        e.preventDefault();
        const confirmed = confirm('Are you sure you want to delete this post?');
        if (!confirmed) return;

        const btn = e.currentTarget;
        btn.disabled = true;
        this.showNotification('Deleting post...', 'info');

        this.deletePostFromDatabase(postData.id);
    }

    async handlePollVote(e, postId) {
        e.preventDefault();
        if (!this.currentUser) {
            this.showNotification('Please log in to vote', 'error');
            return;
        }

        const optionBtn = e.currentTarget;
        const optionIndex = parseInt(optionBtn.getAttribute('data-option-index'));
        
        try {
            // Insert or update vote
            const { error } = await window.supabaseClient
                .from('polls_votes')
                .upsert({
                    post_id: postId,
                    user_id: this.currentUser.id,
                    option_index: optionIndex
                });

            if (error) {
                throw error;
            }

            this.showNotification('Vote recorded! ✓', 'success');
            
            // Reload posts to update the poll
            this.loadPostsFromDatabase();
            
        } catch (error) {
            console.error('Vote error:', error);
            this.showNotification('Failed to record vote', 'error');
        }
    }

    async deletePostFromDatabase(postId) {
        try {
            // Delete the post
            const { error } = await window.supabaseClient
                .from('posts')
                .delete()
                .eq('id', postId);

            if (error) {
                throw error;
            }

            this.showNotification('Post deleted ✓', 'success');
            
            // Reload posts to update the feed
            await this.loadPostsFromDatabase();
        } catch (error) {
            console.error('Failed to delete post:', error);
            this.showNotification('Error deleting post', 'error');
        }
    }

    isSpamAction(actionType, postId) {
        const key = `${actionType}_${postId}`;
        const now = Date.now();
        const lastAction = this.lastActions[key];
        
        if (lastAction && (now - lastAction) < this.actionCooldowns[actionType]) {
            return true;
        }
        
        this.lastActions[key] = now;
        return false;
    }

    handleShareClick(e, postData) {
        // Sharing has been disabled — this handler is intentionally a no-op.
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        return;
    }

    async addShareToDatabase(postId) {
        // Sharing logic removed. Function intentionally left as a no-op.
        return;
    }

    showSharePopup(post, sharer) {
        try {
            const popup = document.createElement('div');
            popup.className = 'share-popup';
            const avatar = sharer.avatar || '';
            const name = sharer.name || 'Someone';
            const note = post.share_note || '';

            const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
            const truncate = (s, n) => (s && s.length > n) ? s.slice(0, n - 1) + '…' : (s || '');

            popup.innerHTML = `
                <div class="share-popup-inner">
                    <img src="${escapeHtml(avatar)}" class="share-avatar" />
                    <div class="share-text">
                        <strong>${escapeHtml(name)}</strong> shared a post
                        <div class="share-note">${escapeHtml(truncate(note, 160))}</div>
                    </div>
                </div>
                <div class="share-post-content">${escapeHtml(truncate(post.content || '', 200))}</div>
            `;

            document.body.appendChild(popup);
            requestAnimationFrame(() => popup.classList.add('visible'));
            setTimeout(() => { popup.classList.remove('visible'); setTimeout(() => popup.remove(), 400); }, 4500);
        } catch (e) {
            console.warn('showSharePopup error', e);
        }
    }

    handleLikeClick(e, postData) {
        e.preventDefault();
        
        // Spam check
        if (this.isSpamAction('like', postData.id)) {
            this.showNotification('Please wait before reacting again', 'error');
            return;
        }
        
        const btn = e.currentTarget;
        const svg = btn.querySelector('svg');
        const span = btn.querySelector('span');
        let likeCount = parseInt(span.textContent);

        const isLiking = !btn.classList.contains('liked');
        const originalState = {
            hasLiked: btn.classList.contains('liked'),
            likeCount: likeCount,
            fillColor: svg.style.fill,
            strokeColor: svg.style.stroke
        };

        // Update UI immediately (optimistic update)
        if (isLiking) {
            btn.classList.add('liked');
            svg.style.fill = '#f39c12';
            svg.style.stroke = '#f39c12';
            likeCount++;
            this.showNotification('Liked! ❤️ (Undo in 5s)', 'success');
        } else {
            btn.classList.remove('liked');
            svg.style.fill = 'none';
            svg.style.stroke = 'currentColor';
            likeCount--;
            this.showNotification('Unliked (Undo in 5s)', 'info');
        }

        span.textContent = likeCount;
        btn.style.transform = 'scale(1.2)';
        setTimeout(() => btn.style.transform = 'scale(1)', 200);

        // Allow undo for 5 seconds
        let undoTimeout;
        let isUndone = false;

        const undoLike = () => {
            if (isUndone) return;
            isUndone = true;
            clearTimeout(undoTimeout);
            
            // Revert UI to original state
            btn.classList.toggle('liked', originalState.hasLiked);
            svg.style.fill = originalState.fillColor;
            svg.style.stroke = originalState.strokeColor;
            span.textContent = originalState.likeCount;
            
            this.showNotification('Reaction undone', 'info');
            btn.removeEventListener('contextmenu', handleUndo);
        };

        const handleUndo = (e) => {
            e.preventDefault();
            undoLike();
        };

        // Add right-click to undo
        btn.addEventListener('contextmenu', handleUndo);

        // After 5 seconds, commit to database and remove undo option
        undoTimeout = setTimeout(() => {
            btn.removeEventListener('contextmenu', handleUndo);
            if (!isUndone) {
                // Commit to database
                if (isLiking) {
                    this.addLikeToDatabase(postData.id);
                } else {
                    this.removeLikeFromDatabase(postData.id);
                }
            }
        }, 5000);
    }

    async addLikeToDatabase(postId) {
        try {
            const userId = this.currentUser?.id;
            if (!userId || userId === 'guest') return;

            // Check if the user already liked this post
            const { data: existingLike, error: existErr } = await window.supabaseClient
                .from('post_likes')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', userId)
                .maybeSingle();

            if (existErr) {
                console.error('Error checking existing like:', existErr);
                return;
            }

            if (existingLike) {
                // Already liked — nothing to do
                return;
            }

            // Insert like row
            const { error: insertError } = await window.supabaseClient
                .from('post_likes')
                .insert([{ post_id: postId, user_id: userId }]);

            if (insertError) {
                console.error('Error adding like:', insertError);
                return;
            }

            // Recalculate likes_count from post_likes to avoid duplicate increments
            const { data: likesData, count, error: countErr } = await window.supabaseClient
                .from('post_likes')
                .select('id', { count: 'exact' })
                .eq('post_id', postId);

            if (countErr) {
                console.error('Error counting likes:', countErr);
                return;
            }

            const newLikeCount = (typeof count === 'number') ? count : (likesData?.length || 0);

            await window.supabaseClient
                .from('posts')
                .update({ likes_count: newLikeCount })
                .eq('id', postId);
        } catch (error) {
            console.error('Failed to add like:', error);
        }
    }

    async removeLikeFromDatabase(postId) {
        try {
            const userId = this.currentUser?.id;
            if (!userId || userId === 'guest') return;

            // Delete the like row (if exists)
            const { error: deleteError } = await window.supabaseClient
                .from('post_likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', userId);

            if (deleteError) {
                console.error('Error removing like:', deleteError);
                return;
            }

            // Recalculate likes_count from post_likes to stay authoritative
            const { data: likesData, count, error: countErr } = await window.supabaseClient
                .from('post_likes')
                .select('id', { count: 'exact' })
                .eq('post_id', postId);

            if (countErr) {
                console.error('Error counting likes after delete:', countErr);
                return;
            }

            const newLikeCount = (typeof count === 'number') ? count : (likesData?.length || 0);

            await window.supabaseClient
                .from('posts')
                .update({ likes_count: Math.max(0, newLikeCount) })
                .eq('id', postId);
        } catch (error) {
            console.error('Failed to remove like:', error);
        }
    }

    async openCommentsModal(postData) {
        try {
            // Create modal if it doesn't exist
            let modal = document.getElementById('commentsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'commentsModal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content comments-modal-content">
                        <div class="modal-header">
                            <h2>Comments <span class="comment-count" id="commentCount">(0)</span></h2>
                            <button class="close-modal" id="closeCommentsModal" aria-label="Close comments">&times;</button>
                        </div>
                        <div id="commentsList" class="comments-list">
                            <div class="comments-loading">
                                <div class="loading-spinner"></div>
                                <p>Loading comments...</p>
                            </div>
                        </div>
                        <div class="comment-input-section">
                            <div class="comment-input-container">
                                <img src="" alt="Your avatar" class="comment-avatar" id="commentUserAvatar" />
                                <textarea id="commentInput" placeholder="Add a comment..." class="comment-input" maxlength="500"></textarea>
                            </div>
                            <div class="comment-actions">
                                <span class="character-count" id="characterCount">0/500</span>
                                <button id="submitCommentBtn" class="submit-comment-btn" disabled>Post Comment</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                // Close modal
                document.getElementById('closeCommentsModal').addEventListener('click', () => {
                    modal.classList.remove('show');
                });

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) modal.classList.remove('show');
                });
            }

            // Store current post ID for submission
            this.currentPostForComment = postData;

            // Set user avatar from database
            const userAvatar = document.getElementById('commentUserAvatar');
            if (userAvatar) {
                // Fetch the latest profile data from database
                (async () => {
                    try {
                        const prof = await this.fetchUserProfileByIdOrEmail(this.currentUser.id || this.currentUser.email);
                        if (prof && prof.avatar_url) {
                            userAvatar.src = prof.avatar_url;
                        } else {
                            userAvatar.src = this.currentUser?.user_metadata?.avatar_url || `https://i.pravatar.cc/32?u=${this.currentUser?.id || 'default'}`;
                        }
                    } catch (err) {
                        console.warn('Failed to load user avatar from database:', err);
                        userAvatar.src = this.currentUser?.user_metadata?.avatar_url || `https://i.pravatar.cc/32?u=${this.currentUser?.id || 'default'}`;
                    }
                })();
            }

            // Load and display comments
            await this.loadCommentsForPost(postData.id);

            // Set up comment submission and input handling
            const submitBtn = document.getElementById('submitCommentBtn');
            const commentInput = document.getElementById('commentInput');
            const charCount = document.getElementById('characterCount');

            // Character counter and button state
            const updateCharCount = () => {
                const count = commentInput.value.length;
                charCount.textContent = `${count}/500`;
                submitBtn.disabled = count === 0 || count > 500;
            };

            commentInput.addEventListener('input', updateCharCount);
            updateCharCount(); // Initial update

            submitBtn.onclick = () => this.submitComment(postData);
            commentInput.onkeypress = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!submitBtn.disabled) this.submitComment(postData);
                }
            };

            // Show modal
            modal.classList.add('show');
        } catch (error) {
            console.error('Error opening comments modal:', error);
            this.showNotification('Failed to open comments', 'error');
        }
    }

    async loadCommentsForPost(postId) {
        try {
            const commentsList = document.getElementById('commentsList');
            const commentCount = document.getElementById('commentCount');
            
            // Show loading state
            commentsList.innerHTML = `
                <div class="comments-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading comments...</p>
                </div>
            `;

            const { data: comments, error } = await window.supabaseClient
                .from('comments')
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error loading comments:', error);
                commentsList.innerHTML = '<p class="error-message">Failed to load comments. Please try again.</p>';
                return;
            }

            // Update comment count
            const count = comments?.length || 0;
            if (commentCount) {
                commentCount.textContent = `(${count})`;
            }

            commentsList.innerHTML = '';

            if (!comments || comments.length === 0) {
                commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
                return;
            }

            comments.forEach(comment => {
                const commentEl = this.createCommentElement(comment);
                commentsList.appendChild(commentEl);
            });
        } catch (error) {
            console.error('Failed to load comments:', error);
            const commentsList = document.getElementById('commentsList');
            commentsList.innerHTML = '<p class="error-message">Failed to load comments. Please try again.</p>';
        }
    }

    createCommentElement(comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';

        const authorHandle = comment.author_email?.split('@')[0] || 'Unknown';
        let authorAvatar = `https://i.pravatar.cc/32?u=${comment.author_id}`;
        let commentAuthorName = comment.author_name || 'Unknown User';
        const timeAgo = this.formatTimeAgo(comment.created_at);
        
        // Fetch the latest profile data from database for all users
        const isCurrentUserComment = comment.author_id === this.currentUser.id;
        (async () => {
            try {
                const prof = await this.fetchUserProfileByIdOrEmail(comment.author_id || comment.author_email);
                if (prof) {
                    commentAuthorName = (comment.author_name && String(comment.author_name).trim()) ? comment.author_name : (prof.full_name || commentAuthorName);
                    if (prof.avatar_url) {
                        authorAvatar = prof.avatar_url;
                    }
                    const nameEl = commentDiv.querySelector('.comment-header strong');
                    if (nameEl) nameEl.textContent = (comment.author_name && String(comment.author_name).trim()) ? comment.author_name : (prof.full_name || nameEl.textContent);
                    if (prof.avatar_url) {
                        const avatarImg = commentDiv.querySelector('.comment-avatar');
                        if (avatarImg) avatarImg.src = prof.avatar_url;
                    }
                }
            } catch (err) {
                }
            })();
        
        commentDiv.innerHTML = `
            <img src="${authorAvatar}" alt="Author" class="comment-avatar" loading="lazy" />
            <div class="comment-content">
                <div class="comment-header">
                    <strong>${commentAuthorName}</strong>
                    <span class="comment-handle">@${authorHandle}</span>
                    <span class="comment-time">• ${timeAgo}</span>
                </div>
                <p class="comment-text">${this.escapeHtml(comment.content)}</p>
            </div>
        `;

        return commentDiv;
    }

    async submitComment(postData) {
        const commentInput = document.getElementById('commentInput');
        const content = commentInput.value.trim();

        if (!content) {
            this.showNotification('Comment cannot be empty', 'error');
            return;
        }

        // Spam check
        if (this.isSpamAction('comment', postData.id)) {
            this.showNotification('Please wait before commenting again', 'error');
            return;
        }

        try {
            const submitBtn = document.getElementById('submitCommentBtn');
            submitBtn.disabled = true;
            this.showNotification('Posting comment...', 'info');

            // Add comment to database
            const { data, error } = await window.supabaseClient
                .from('comments')
                .insert([{
                    post_id: postData.id,
                    content: content,
                    author_id: this.currentUser.id,
                    author_name: this.currentUser.user_metadata?.full_name || 
                               this.currentUser.email.split('@')[0],
                    author_email: this.currentUser.email
                }])
                .select();

            if (error) {
                throw error;
            }

            // Update post comments count
            await window.supabaseClient
                .from('posts')
                .update({ comments_count: (postData.comments_count || 0) + 1 })
                .eq('id', postData.id);

            this.showNotification('Comment posted! ✓', 'success');
            commentInput.value = '';
            submitBtn.disabled = false;

            // Reload comments
            await this.loadCommentsForPost(postData.id);
            
            // Reload all posts to update comment count in feed
            await this.loadPostsFromDatabase();
        } catch (error) {
            console.error('Failed to submit comment:', error);
            this.showNotification('Error posting comment', 'error');
            const submitBtn = document.getElementById('submitCommentBtn');
            submitBtn.disabled = false;
        }
    }

    formatTimeAgo(timestamp) {
        if (!timestamp) return 'just now';
        
        // Handle different timestamp formats
        let date;
        if (typeof timestamp === 'string') {
            // Remove 'Z' and parse the timestamp
            const cleanTimestamp = timestamp.replace('Z', '+00:00');
            date = new Date(cleanTimestamp);
        } else {
            date = new Date(timestamp);
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid timestamp:', timestamp);
            return 'just now';
        }
        
        // Convert to Philippine Time (UTC+8)
        const phTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
        
        // Format as readable date/time: "Jan 11, 2:30 PM"
        const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        return phTime.toLocaleDateString('en-US', options);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    playVideo() {
        this.showNotification('Playing video...', 'info');
    }

    handleAction(e) {
        const btn = e.currentTarget;
        const actionType = btn.querySelector('svg').nextSibling?.textContent || 'action';
        
        if (actionType.includes('Comment')) {
            this.showNotification('Opening comments...', 'info');
        } else if (actionType.includes('Share')) {
            this.showNotification('Sharing post...', 'info');
        } else if (actionType.includes('Like')) {
            btn.style.color = '#f39c12';
            this.showNotification('Liked!', 'success');
        }
    }

    handleTodoToggle(e) {
        const label = e.currentTarget.nextElementSibling;
        if (e.currentTarget.checked) {
            label.style.textDecoration = 'line-through';
            label.style.color = '#95a5a6';
        } else {
            label.style.textDecoration = 'none';
            label.style.color = '#2c3e50';
        }
    }

    openIdea(e) {
        const idea = e.currentTarget;
        const name = idea.querySelector('strong').textContent;
        this.showNotification(`Opening idea by ${name}...`, 'info');
    }

    joinClass() {
        this.showNotification('You have joined the class!', 'success');
    }

    showNotifications() {
        this.showNotification('You have 2 new notifications', 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            ${type === 'success' ? 'background: #27ae60; color: white;' : 'background: #1e5a96; color: white;'}
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async openEditProfileModal() {
        try {
            if (!this.currentUser) {
                this.showNotification('User not loaded yet', 'error');
                return;
            }

            const nameEl = document.getElementById('editName');
            const bioEl = document.getElementById('editBio');
            const avatarPreview = document.getElementById('avatarPreview');

            // Fetch current profile data from Supabase
            try {
                const supabaseClient = await window.supabaseClient || getSupabaseClient();
                const { data: profileData, error } = await supabaseClient
                    .from('user_profiles')
                    .select('full_name, bio, avatar_url')
                    .eq('id', this.currentUser.id)
                    .single();

                if (!error && profileData) {
                    if (nameEl) {
                        nameEl.value = profileData.full_name || '';
                    }
                    if (bioEl) {
                        bioEl.value = profileData.bio || '';
                    }
                    if (avatarPreview) {
                        avatarPreview.src = profileData.avatar_url || 'https://i.pravatar.cc/80?img=20';
                    }
                } else {
                    // Fallback to currentUser data
                    if (nameEl) {
                        const currentName = this.currentUser.user_metadata?.full_name || 
                                           this.currentUser.email.split('@')[0];
                        nameEl.value = currentName;
                    }
                    if (bioEl) {
                        const currentBio = this.currentUser.user_metadata?.bio || '';
                        bioEl.value = currentBio;
                    }
                    if (avatarPreview) {
                        avatarPreview.src = 'https://i.pravatar.cc/80?img=20';
                    }
                }
            } catch (dbError) {
                console.warn('Could not fetch profile from database:', dbError);
                // Fallback to currentUser data
                if (nameEl) {
                    const currentName = this.currentUser.user_metadata?.full_name || 
                                       this.currentUser.email.split('@')[0];
                    nameEl.value = currentName;
                }
                if (bioEl) {
                    const currentBio = this.currentUser.user_metadata?.bio || '';
                    bioEl.value = currentBio;
                }
                if (avatarPreview) {
                    avatarPreview.src = 'https://i.pravatar.cc/80?img=20';
                }
            }

            const modal = document.getElementById('editProfileModal');
            if (modal) {
                modal.classList.add('show');
            }
        } catch (error) {
            console.error('Error opening edit profile modal:', error);
            this.showNotification('Error opening profile editor', 'error');
        }
    }

    closeEditProfileModal() {
        const modal = document.getElementById('editProfileModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    async saveProfileChanges() {
        try {
            const nameEl = document.getElementById('editName');
            const bioEl = document.getElementById('editBio');
            const saveBtn = document.getElementById('saveProfileBtn');

            const newName = nameEl ? nameEl.value.trim() : '';
            const newBio = bioEl ? bioEl.value.trim() : '';

            if (!newName) {
                this.showNotification('Name cannot be empty', 'error');
                return;
            }

            if (saveBtn) saveBtn.disabled = true;
            this.showNotification('Saving changes...', 'info');

            // Check authentication before proceeding
            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) {
                throw new Error('You must be logged in to save your profile. Please refresh the page and log in again.');
            }

            // Update local state
            if (this.currentUser.user_metadata) {
                this.currentUser.user_metadata.full_name = newName;
                this.currentUser.user_metadata.bio = newBio;
            } else {
                this.currentUser.user_metadata = {
                    full_name: newName,
                    bio: newBio
                };
            }

            // Try to save to user_profiles table in Supabase
            try {
                const updateData = {
                    id: session.user.id,
                    user_email: session.user.email,
                    full_name: newName,
                    bio: newBio
                };
                
                // Only include avatar_url if we have a new one uploaded
                if (this.uploadedAvatarUrl) {
                    updateData.avatar_url = this.uploadedAvatarUrl;
                }
                
                const { data, error } = await window.supabaseClient
                    .from('user_profiles')
                    .upsert(updateData);

                if (error) {
                    console.warn('⚠️ Could not sync to database:', error.message);
                } else {
                }
            } catch (dbErr) {
                console.warn('⚠️ Database sync failed:', dbErr.message);
            }

            // Update profile display
            this.populateUserProfile();

            this.showNotification('Profile updated successfully! ✓', 'success');
            this.closeEditProfileModal();

            if (saveBtn) saveBtn.disabled = false;
        } catch (error) {
            console.error('Profile save error:', error);
            this.showNotification('Error: ' + (error.message || 'Failed to save profile'), 'error');
            const saveBtn = document.getElementById('saveProfileBtn');
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    async handleAvatarUpload(file) {
        try {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.showNotification('Please select a valid image file', 'error');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showNotification('Image size must be less than 5MB', 'error');
                return;
            }

            this.showNotification('Uploading image...', 'info');

            // Create a preview immediately
            const reader = new FileReader();
            reader.onload = (e) => {
                const avatarPreview = document.getElementById('avatarPreview');
                if (avatarPreview) {
                    avatarPreview.src = e.target.result;
                }
            };
            reader.readAsDataURL(file);

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar_${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { data, error } = await window.supabaseClient.storage
                .from('user-avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Upload error:', error);
                this.showNotification('Failed to upload image. Please try again.', 'error');
                return;
            }

            // Get public URL
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('user-avatars')
                .getPublicUrl(filePath);

            // Store the uploaded avatar URL
            this.uploadedAvatarUrl = publicUrl;

            this.showNotification('Image uploaded successfully! ✓', 'success');

        } catch (error) {
            console.error('Avatar upload error:', error);
            this.showNotification('Error uploading image: ' + error.message, 'error');
        }
    }
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .post-card img {
        loading: lazy;
    }

    .avatar {
        transition: opacity 0.3s ease;
    }

    .avatar.loading {
        opacity: 0.5;
    }

    /* Comments Modal Enhancements */
    .comments-modal-content {
        max-width: 600px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
    }

    .comments-list {
        max-height: 400px;
        overflow-y: auto;
        padding: 16px;
        flex: 1;
    }

    .comments-loading {
        text-align: center;
        padding: 40px 20px;
        color: #666;
    }

    .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #5C3422;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px;
    }

    .comment-input-container {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 12px;
        margin-bottom: 12px;
    }

    .comment-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }

    .comment-input {
        flex: 1;
        min-height: 80px;
        max-height: 120px;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        resize: vertical;
        font-family: inherit;
        font-size: 14px;
        transition: border-color 0.3s ease;
    }

    .comment-input:focus {
        outline: none;
        border-color: #5C3422;
    }

    .comment-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 16px 16px;
    }

    .character-count {
        font-size: 12px;
        color: #666;
        font-weight: 500;
    }

    .submit-comment-btn {
        background: linear-gradient(135deg, #5C3422 0%, #8B7355 100%);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .submit-comment-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(92, 52, 34, 0.3);
    }

    .submit-comment-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .no-comments {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 40px 20px;
        margin: 0;
    }

    .error-message {
        text-align: center;
        color: #e74c3c;
        padding: 20px;
        margin: 0;
    }

    .comment-count {
        font-size: 0.9em;
        font-weight: normal;
        color: #666;
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .comments-modal-content {
            max-width: 95vw;
            max-height: 90vh;
        }

        .comments-list {
            max-height: 300px;
        }

        .comment-input-container {
            padding: 12px;
        }

        .comment-input {
            font-size: 16px; /* Prevents zoom on iOS */
        }
    }
`;
document.head.appendChild(style);

// Initialize Lucide Icons
function initLucideIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Try to initialize immediately
setTimeout(initLucideIcons, 100);

// Also initialize on window load
window.addEventListener('load', initLucideIcons);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize CourseInterface on pages that need it
    const currentPage = window.location.pathname.toLowerCase();
    const educationalPages = ['cry-of-rebellion', 'first-mass', 'cavite-mutiny', 'retraction-of-rizal', 'games', 'interactive-tasks', 'videos', 'worksheets', 'graphic-organizers', 'reflections'];
    const isEducationalPage = educationalPages.some(page => currentPage.includes(page));
    
    // Only initialize full CourseInterface on non-educational pages
    if (!isEducationalPage) {
        new CourseInterface();
    } else {
        // On educational pages, still check authentication
        checkAuth();
    }
    
    // Initialize icons on DOM ready
    initLucideIcons();
    
    // ==================== HERO WELCOME BANNER (PHASE 5) ====================
    initializeHeroWelcomeBanner();
});

// Hero Welcome Banner Functionality (Phase 5 & 7)
function initializeHeroWelcomeBanner() {
    const banner = document.getElementById('heroWelcomeBanner');
    const closeButton = document.getElementById('closeBanner');
    
    if (!banner || !closeButton) return;
    
    // Store the element that had focus before banner appeared
    let previousFocusElement = document.activeElement;
    
    // Check if banner was previously dismissed
    const dismissedData = localStorage.getItem('heroWelcomeBannerDismissed');
    
    if (dismissedData) {
        const dismissedInfo = JSON.parse(dismissedData);
        const dismissedTime = new Date(dismissedInfo.timestamp);
        const currentTime = new Date();
        const daysSinceDismissal = (currentTime - dismissedTime) / (1000 * 60 * 60 * 24);
        
        // Show banner again after 7 days
        if (daysSinceDismissal < 7) {
            banner.style.display = 'none';
            banner.setAttribute('aria-hidden', 'true');
            return;
        }
    }
    
    // Function to close banner
    function closeBanner(restoreFocus = true) {
        // Add dismissing class for animation
        banner.classList.add('dismissing');
        
        // Announce to screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = 'Welcome banner closed';
        document.body.appendChild(announcement);
        
        // Wait for animation to complete before removing from DOM
        setTimeout(() => {
            banner.style.display = 'none';
            banner.setAttribute('aria-hidden', 'true');
            
            // Remove announcement after a delay
            setTimeout(() => announcement.remove(), 1000);
            
            // Restore focus to previous element
            if (restoreFocus && previousFocusElement && previousFocusElement.focus) {
                previousFocusElement.focus();
            }
            
            // Save dismissal to localStorage
            localStorage.setItem('heroWelcomeBannerDismissed', JSON.stringify({
                timestamp: new Date().toISOString(),
                version: '1.0'
            }));
        }, 400); // Match animation duration
    }
    
    // Close button click handler
    closeButton.addEventListener('click', () => closeBanner(true));
    
    // Keyboard navigation - Escape key to close
    banner.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeBanner(true);
        }
    });
    
    // Global escape key listener when banner is visible
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape' && banner.style.display !== 'none') {
            e.preventDefault();
            closeBanner(true);
            document.removeEventListener('keydown', escapeHandler);
        }
    });
    
    // Focus management - move focus to close button when banner appears
    setTimeout(() => {
        if (banner.style.display !== 'none') {
            closeButton.focus();
        }
    }, 700); // After entrance animation
    
    // Ensure banner is visible and accessible
    banner.style.display = 'block';
    banner.setAttribute('aria-hidden', 'false');
    
    // Announce banner to screen readers
    const initialAnnouncement = document.createElement('div');
    initialAnnouncement.setAttribute('role', 'status');
    initialAnnouncement.setAttribute('aria-live', 'polite');
    initialAnnouncement.className = 'sr-only';
    initialAnnouncement.textContent = 'Welcome banner loaded. Press Escape to close.';
    document.body.appendChild(initialAnnouncement);
    setTimeout(() => initialAnnouncement.remove(), 3000);
}

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // ==================== AUTHENTICATION CHECK ====================
        // Check if user is logged in via Supabase session
        async function checkAuth() {
            try {
                // Wait a bit to ensure Supabase is fully initialized
                await new Promise(resolve => setTimeout(resolve, 100));

                if (!window.supabaseClient) {
                    console.error('Supabase client not initialized');
                    window.location.href = 'index.html';
                    return;
                }

                const { data: { session } } = await window.supabaseClient.auth.getSession();

                if (!session) {
                    window.location.href = 'index.html';
                    return;
                }

            } catch (error) {
                console.error('Auth check error:', error);
                // If error checking auth, redirect to login to be safe
                window.location.href = 'index.html';
            }
        }

        // Profile editing functionality
        const editProfileBtn = document.getElementById('editProfileBtn');
        const editProfileModal = document.getElementById('editProfileModal');
        const closeEditModal = document.getElementById('closeEditModal');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const saveProfileBtn = document.getElementById('saveProfileBtn');
        const editAvatarInput = document.getElementById('editAvatar');
        const avatarPreview = document.getElementById('avatarPreview');
        const editNameInput = document.getElementById('editName');
        const editBioInput = document.getElementById('editBio');
        const profileNameDisplay = document.getElementById('profileName');
        const profileEmailDisplay = document.getElementById('profileEmail');
        const profileAvatar = document.getElementById('profileAvatar');
        const createPostAvatar = document.getElementById('createPostAvatar');
        const createPostName = document.getElementById('createPostName');

        let selectedAvatarImage = null;

        // Handle avatar image selection
        if (editAvatarInput) {
            editAvatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        selectedAvatarImage = event.target.result;
                        if (avatarPreview) avatarPreview.src = selectedAvatarImage;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Open edit profile modal
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', async () => {
                try {
                    // Get current session
                    const session = await getCurrentSession();
                    if (!session) {
                        // If no session, use default values
                        if (editNameInput) editNameInput.value = (profileNameDisplay ? profileNameDisplay.textContent : '') || '';
                        if (editBioInput) editBioInput.value = (profileEmailDisplay ? profileEmailDisplay.textContent : '') || '';
                    } else {
                        // Fetch from database
                        const supabaseClient = await getSupabaseClient();
                        const { data: profileData, error } = await supabaseClient
                            .from('user_profiles')
                            .select('full_name, bio, avatar_url')
                            .eq('id', session.user.id)
                            .single();
                        
                        if (!error && profileData) {
                            if (editNameInput) editNameInput.value = profileData.full_name || '';
                            if (editBioInput) editBioInput.value = profileData.bio || '';
                            // Update avatar preview with database avatar
                            if (profileData.avatar_url && avatarPreview) {
                                avatarPreview.src = profileData.avatar_url;
                            }
                        } else {
                            // Fallback to display values
                            if (editNameInput) editNameInput.value = (profileNameDisplay ? profileNameDisplay.textContent : '') || '';
                            if (editBioInput) editBioInput.value = (profileEmailDisplay ? profileEmailDisplay.textContent : '') || '';
                        }
                    }
                } catch (err) {
                    console.error('Error loading profile:', err);
                    // Fallback to display values
                    if (editNameInput) editNameInput.value = (profileNameDisplay ? profileNameDisplay.textContent : '') || '';
                    if (editBioInput) editBioInput.value = (profileEmailDisplay ? profileEmailDisplay.textContent : '') || '';
                }

                if (avatarPreview && profileAvatar) avatarPreview.src = profileAvatar.src;
                selectedAvatarImage = null;
                if (editAvatarInput) editAvatarInput.value = '';
                if (editProfileModal) editProfileModal.classList.add('active');
            });
        }

        // Close modal
        const closeModal = () => {
            if (editProfileModal) editProfileModal.classList.remove('active');
        };

        if (closeEditModal) closeEditModal.addEventListener('click', closeModal);
        if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeModal);

        // Save profile changes
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', async () => {
                const newName = editNameInput ? editNameInput.value.trim() : '';
                const newBio = editBioInput ? editBioInput.value.trim() : '';

                if (newName) {
                    try {
                        saveProfileBtn.disabled = true;

                        // Check authentication
                        const session = await getCurrentSession();
                        if (!session) {
                            alert('You must be logged in to save your profile. Please refresh the page and log in again.');
                            saveProfileBtn.disabled = false;
                            return;
                        }

                        // Update UI immediately
                        if (profileNameDisplay) profileNameDisplay.textContent = newName;
                        if (profileEmailDisplay) profileEmailDisplay.textContent = newBio;
                        if (createPostName) createPostName.textContent = newName;

                        let avatarUrl = null;

                        // Handle avatar upload if changed
                        if (selectedAvatarImage) {
                            try {
                                // Convert base64 to blob
                                const response = await fetch(selectedAvatarImage);
                                const blob = await response.blob();
                                
                                // Get Supabase client
                                const supabaseClient = await getSupabaseClient();
                                
                                // Upload to Supabase storage
                                const fileName = `avatars/${session.user.id}-${Date.now()}.jpg`;
                                const { data, error } = await supabaseClient.storage
                                    .from('user-avatars')
                                    .upload(fileName, blob, { upsert: true });
                                
                                if (error) {
                                    console.error('Upload error:', error);
                                    alert('Error uploading avatar: ' + error.message);
                                } else {
                                    // Get public URL
                                    const { data: publicData } = supabaseClient.storage
                                        .from('user-avatars')
                                        .getPublicUrl(fileName);
                                    
                                    avatarUrl = publicData.publicUrl;
                                    
                                    // Update UI
                                    if (profileAvatar) profileAvatar.src = avatarUrl;
                                    if (createPostAvatar) createPostAvatar.src = avatarUrl;
                                }
                            } catch (err) {
                                console.error('Error uploading avatar:', err);
                                alert('Error uploading avatar: ' + (err.message || err));
                            }
                        }

                        // Save to database
                        try {
                            const supabaseClient = await getSupabaseClient();
                            const updateData = {
                                id: session.user.id,
                                user_email: session.user.email,
                                full_name: newName,
                                bio: newBio
                            };
                            
                            // Only include avatar_url if we have a new one
                            if (avatarUrl) {
                                updateData.avatar_url = avatarUrl;
                            }
                            
                            const { data, error } = await supabaseClient
                                .from('user_profiles')
                                .upsert(updateData);
                            
                            if (error) {
                                console.warn('Could not save to database:', error.message);
                                alert('Profile updated but failed to sync to database.');
                            } else {
                                alert('Profile updated successfully!');
                            }
                        } catch (err) {
                            console.warn('Database sync failed:', err.message);
                            alert('Profile updated but failed to sync to database.');
                        }

                        saveProfileBtn.disabled = false;
                        closeModal();
                    } catch (err) {
                        console.error('Error saving profile:', err);
                        alert('Error saving profile: ' + (err.message || err));
                        saveProfileBtn.disabled = false;
                    }
                } else {
                    alert('Please fill in your name');
                }
            });
        }

        // Load profile from Supabase database
        // Profile will be loaded by the CourseInterface populateUserProfile method

        // ==================== SEARCH FUNCTIONALITY ====================
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const searchResultsModal = document.getElementById('searchResultsModal');
        const closeSearchModal = document.getElementById('closeSearchModal');
        const searchResultsBody = document.getElementById('searchResultsBody');

        // Helper function to get Supabase client
        async function getSupabaseClient() {
            let attempts = 0;
            while (attempts < 50) {
                if (window.supabaseClient) {
                    return window.supabaseClient;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            throw new Error('Supabase client not initialized. Please refresh the page.');
        }

        if (searchBtn) searchBtn.addEventListener('click', performSearch);
        if (searchInput) searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        if (closeSearchModal) closeSearchModal.addEventListener('click', () => {
            if (searchResultsModal) searchResultsModal.style.display = 'none';
        });

        if (searchResultsModal) searchResultsModal.addEventListener('click', (e) => {
            if (e.target === searchResultsModal) {
                searchResultsModal.style.display = 'none';
            }
        });

        async function performSearch() {
            if (!searchInput) return;
            const searchTerm = searchInput.value.trim().toLowerCase();
            if (!searchTerm) {
                return;
            }

            try {
                // Get the Supabase client
                const supabaseClient = await getSupabaseClient();

                // Search user_profiles directly by full_name
                const { data: profiles, error } = await supabaseClient
                    .from('user_profiles')
                    .select('id, full_name, user_email, avatar_url')
                    .ilike('full_name', `%${searchTerm}%`);

                if (error) {
                    console.error('Search error:', error);
                    searchResultsBody.innerHTML = '<p style="padding: 20px; text-align: center; color: #d9534f;">Error searching users. Please try again.</p>';
                    searchResultsModal.style.display = 'flex';
                    return;
                }

                if (!profiles || profiles.length === 0) {
                    searchResultsBody.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No users found matching "' + searchTerm + '".</p>';
                    searchResultsModal.style.display = 'flex';
                    return;
                }

                // Get user IDs
                const userIds = profiles.map(p => p.id);
                
                // Fetch posts for matching users
                const { data: posts, error: postsError } = await supabaseClient
                    .from('posts')
                    .select('*')
                    .in('author_id', userIds)
                    .order('created_at', { ascending: false });
                
                // Build user map with profile data
                const userMap = {};
                
                profiles.forEach(profile => {
                    userMap[profile.id] = {
                        id: profile.id,
                        name: profile.full_name || 'Unknown User',
                        email: profile.user_email || '',
                        avatar: profile.avatar_url || `https://i.pravatar.cc/40?u=${profile.id}`,
                        posts: []
                    };
                });
                
                // Add posts to users
                if (!postsError && posts) {
                    posts.forEach(post => {
                        const userId = post.author_id;
                        if (userMap[userId]) {
                            userMap[userId].posts.push(post);
                        }
                    });
                }

                const users = Object.values(userMap);

                if (users.length === 0) {
                    searchResultsBody.innerHTML = `
                        <div class="search-result-empty-state">
                            <div class="search-result-empty-icon"></div>
                            <h3 class="search-result-empty-title">No Results Found</h3>
                            <p class="search-result-empty-message">We couldn't find any users matching "<strong>${searchTerm}</strong>". Try searching with a different name.</p>
                        </div>
                    `;
                } else {
                    let resultsHTML = '<div class="search-results-container">';
                    users.forEach(user => {
                        resultsHTML += `
                            <div class="search-result-card">
                                <div class="search-result-user-header">
                                    <img src="${user.avatar}" alt="${user.name}" class="search-result-avatar" />
                                    <div class="search-result-user-info">
                                        <h4 class="search-result-user-name">${user.name}</h4>
                                        <p class="search-result-user-email">${user.email || 'No email'}</p>
                                        <p class="search-result-post-count"><strong>${user.posts.length}</strong> post${user.posts.length !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                                <div class="search-result-posts-section">
                                    <div class="search-result-posts-container">
                        `;
                        
                        if (user.posts.length > 0) {
                            user.posts.slice(0, 3).forEach(post => {
                                const postDate = new Date(post.created_at);
                                const formattedDate = postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                                resultsHTML += `
                                    <div class="search-result-post-item">
                                        <p class="search-result-post-content">${(post.content || '').substring(0, 150)}${(post.content || '').length > 150 ? '...' : ''}</p>
                                        <p class="search-result-post-date">${formattedDate}</p>
                                    </div>
                                `;
                            });

                            if (user.posts.length > 3) {
                                resultsHTML += `<p class="search-result-more-posts">+${user.posts.length - 3} more post${user.posts.length - 3 !== 1 ? 's' : ''}</p>`;
                            }
                        } else {
                            resultsHTML += '<div class="search-result-no-posts">No posts yet</div>';
                        }

                        resultsHTML += `
                                    </div>
                                </div>
                            </div>
                        `;
                    });

                    resultsHTML += '</div>';
                    searchResultsBody.innerHTML = resultsHTML;
                }

                if (searchResultsModal) searchResultsModal.style.display = 'flex';
                if (searchInput) searchInput.value = '';
            } catch (error) {
                console.error('Search error:', error);
                if (searchResultsBody) {
                    searchResultsBody.innerHTML = `
                        <div class="search-result-error-state">
                            <div class="search-result-error-icon"></div>
                            <h3 class="search-result-error-title">Something Went Wrong</h3>
                            <p class="search-result-error-message">${error.message || 'Unable to complete search. Please try again.'}</p>
                        </div>
                    `;
                }
                if (searchResultsModal) searchResultsModal.style.display = 'flex';
            }
        }

        // Mobile Search Bar Toggle
        const headerSearch = document.querySelector('.header-search');
        const searchInputElement = document.getElementById('searchInput');
        const searchBtnElement = document.getElementById('searchBtn');
        const mobileSearchModal = document.getElementById('mobileSearchModal');
        const mobileSearchInput = document.getElementById('mobileSearchInput');
        const mobileSearchSubmit = document.getElementById('mobileSearchSubmit');
        const mobileSearchCancel = document.getElementById('mobileSearchCancel');

        if (searchBtnElement) {
            // Open mobile search modal on click when on mobile
            searchBtnElement.addEventListener('click', (e) => {
                if (window.innerWidth <= 640) {
                    e.preventDefault();
                    if (mobileSearchModal) mobileSearchModal.classList.add('active');
                    if (mobileSearchInput) mobileSearchInput.focus();
                } else {
                    performSearch();
                }
            });
        }

        // Close mobile search modal
        const closeMobileSearchModal = () => {
            if (mobileSearchModal) mobileSearchModal.classList.remove('active');
            if (mobileSearchInput) mobileSearchInput.value = '';
        };

        if (mobileSearchCancel) mobileSearchCancel.addEventListener('click', closeMobileSearchModal);

        // Close modal when clicking outside
        if (mobileSearchModal) mobileSearchModal.addEventListener('click', (e) => {
            if (e.target === mobileSearchModal) {
                closeMobileSearchModal();
            }
        });

        // Search from mobile modal
        if (mobileSearchSubmit) mobileSearchSubmit.addEventListener('click', () => {
            if (searchInput && mobileSearchInput) {
                searchInput.value = mobileSearchInput.value;
                performSearch();
                closeMobileSearchModal();
            }
        });

        // Enter key to search from mobile modal
        if (mobileSearchInput) mobileSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (searchInput) searchInput.value = mobileSearchInput.value;
                performSearch();
                closeMobileSearchModal();
            }
        });

        // ==================== LOGOUT BUTTON ====================
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    // Clear all local storage
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Sign out from Supabase globally
                    const supabaseClient = await getSupabaseClient();
                    const { error } = await supabaseClient.auth.signOut({ scope: 'global' });
                    if (error) {
                        console.error('Supabase signOut error:', error);
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    // Force redirect to index after clearing everything
                    window.location.href = 'index.html';
                }
            });
        }

        // ==================== LEFT SIDEBAR TOGGLE ====================
        const toggleBtn = document.getElementById('toggleSidebar');
        const sidebar = document.getElementById('leftSidebar');
        
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', function() {
                sidebar.classList.toggle('mobile-open');
            });
        }

        // ==================== WELCOME STATS NAVIGATION ====================
        document.querySelectorAll('.stat-item').forEach(item => {
            item.addEventListener('click', () => {
                const text = item.querySelector('.stat-text').textContent;
                
                switch(text) {
                    case 'Lessons':
                        window.location.href = 'first-mass.html';
                        break;
                    case 'Activities':
                        window.location.href = 'worksheets.html';
                        break;
                    case 'Discussions':
                        document.querySelector('.discussion-section').scrollIntoView({
                            behavior: 'smooth'
                        });
                        break;
                }
            });
        });

        // Check authentication on page load (only for non-educational pages)
        const currentPage = window.location.pathname;
        const educationalPages = ['cry-of-rebellion', 'first-mass', 'cavite-mutiny', 'retraction-of-rizal', 'games', 'interactive-tasks', 'videos', 'worksheets', 'graphic-organizers', 'reflections'];
        const isEducationalPage = educationalPages.some(page => currentPage.includes(page));
        
        if (!isEducationalPage) {
            checkAuth();
        }
    

    // Removed duplicate setupEventListeners() definition outside the class.

