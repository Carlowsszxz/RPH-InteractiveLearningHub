// Supabase Configuration
// Initialize Supabase client - replace these with your actual credentials
const SUPABASE_URL = 'https://fpgatsvmogyjiziilmhy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZ2F0c3Ztb2d5aml6aWlsbWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTc5NTgsImV4cCI6MjA4MzMzMzk1OH0.2SVARvmYbbxs7SoLw7bACUVn9b9k2qxEsnVILh7H578';

// Initialize Supabase client
if (!window.supabaseClient && window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Helper function to get current user session
async function getCurrentSession() {
    if (!window.supabaseClient) return null;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    return session;
}

// Helper function to get current user
async function getCurrentUser() {
    const session = await getCurrentSession();
    return session?.user || null;
}

// Helper function to get user ID
async function getUserId() {
    const user = await getCurrentUser();
    return user?.id || null;
}

// Helper to handle auth redirects
async function checkAuthAndRedirect(redirectUrl = 'course.html') {
    const session = await getCurrentSession();
    if (!session) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Helper function to load user profile with user-specific localStorage
async function loadUserProfile(nameElement, emailElement, avatarElement) {
    try {
        const session = await getCurrentSession();
        if (!session?.session?.user) return false;

        const userId = session.session.user.id;
        const supabaseClient = window.supabaseClient;

        // Try to load from user-specific localStorage first (for faster loading)
        const cachedName = localStorage.getItem(`profileName_${userId}`);
        const cachedBio = localStorage.getItem(`profileBio_${userId}`);
        const cachedAvatar = localStorage.getItem(`profileAvatar_${userId}`);

        if (cachedName && nameElement) nameElement.textContent = cachedName;
        if (cachedBio && emailElement) emailElement.textContent = cachedBio;
        if (cachedAvatar && avatarElement) avatarElement.src = cachedAvatar;

        // Then fetch from database to ensure data is current
        try {
            const { data: profileData, error } = await supabaseClient
                .from('user_profiles')
                .select('full_name, bio, avatar_url')
                .eq('id', userId)
                .single();
            
            if (!error && profileData) {
                const name = profileData.full_name || session.session.user.user_metadata?.full_name || session.session.user.email?.split('@')[0] || 'User';
                const bio = profileData.bio || '';
                const avatarUrl = profileData.avatar_url || `https://i.pravatar.cc/80?u=${userId}`;

                // Update UI elements
                if (nameElement) nameElement.textContent = name;
                if (emailElement) emailElement.textContent = bio; // emailElement actually displays bio
                if (avatarElement) avatarElement.src = avatarUrl;

                // Update user-specific localStorage
                localStorage.setItem(`profileName_${userId}`, name);
                localStorage.setItem(`profileBio_${userId}`, bio);
                localStorage.setItem(`profileAvatar_${userId}`, avatarUrl);

                return true;
            }
        } catch (dbError) {
        }

        // Fallback to session data if database fails
        const name = session.session.user.user_metadata?.full_name || session.session.user.email.split('@')[0];
        const bio = '';
        const avatarUrl = `https://i.pravatar.cc/80?u=${userId}`;

        if (nameElement) nameElement.textContent = name;
        if (emailElement) emailElement.textContent = bio;
        if (avatarElement) avatarElement.src = avatarUrl;

        // Store fallback data in user-specific localStorage
        localStorage.setItem(`profileName_${userId}`, name);
        localStorage.setItem(`profileBio_${userId}`, bio);
        localStorage.setItem(`profileAvatar_${userId}`, avatarUrl);

        return true;
    } catch (error) {
        console.error('Error loading user profile:', error);
        return false;
    }
}

// Listen for auth changes
if (window.supabaseClient) {
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        
        // Store session info for easy access
        if (session) {
            window.currentUser = session.user;
            localStorage.setItem('userEmail', session.user.email);
        } else {
            window.currentUser = null;
            localStorage.removeItem('userEmail');
            // Don't redirect on signOut - let the logout button handler do it
        }
    });
}


