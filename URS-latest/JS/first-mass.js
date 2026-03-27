// ==================== AUTHENTICATION CHECK ====================
// Check if user is logged in via Supabase session
async function checkAuth() {
    try {
        // If userEmail not in localStorage, user is logged out
        if (!localStorage.getItem('userEmail')) {
            console.log('No user email in localStorage, redirecting to login');
            window.location.href = 'index.html';
            return;
        }

        // Wait longer to ensure Supabase is fully initialized
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!window.supabaseClient) {
            console.error('Supabase client not initialized, waiting and retrying...');
            // Wait a bit more and retry once before giving up
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (!window.supabaseClient) {
                console.error('Supabase client still not initialized after retry');
                window.location.href = 'index.html';
                return;
            }
        }

        const { data: { session }, error } = await window.supabaseClient.auth.getSession();

        if (error) {
            console.error('Error getting session:', error);
            // Don't redirect on error - could be temporary network issue
            // Only redirect if we're certain there's no session
            return;
        }

        if (!session) {
            console.log('No active session, redirecting to login');
            window.location.href = 'index.html';
            return;
        }

        console.log('User authenticated:', session.user.email);
    } catch (error) {
        console.error('Auth check error:', error);
        // Don't redirect on error - it might be a temporary issue
        // Let the user stay on the page
        console.warn('Auth check failed, but allowing page access (might be temporary issue)');
    }
}

let currentSlideIndex = 1;

function changeSlide(n) {
    currentSlideIndex += n;
    showSlide();
}

function currentSlide(n) {
    currentSlideIndex = n + 1;
    showSlide();
}

function showSlide() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    if (currentSlideIndex > slides.length) {
        currentSlideIndex = 1;
    }
    if (currentSlideIndex < 1) {
        currentSlideIndex = slides.length;
    }

    slides.forEach(slide => slide.classList.remove('fade'));

    // Only manipulate dots if they exist
    if (dots.length > 0) {
        dots.forEach(dot => dot.classList.remove('active'));
        dots[currentSlideIndex - 1].classList.add('active');
    }

    slides[currentSlideIndex - 1].classList.add('fade');

    const description = slides[currentSlideIndex - 1].getAttribute('data-description');
    document.getElementById('slideDescription').textContent = description;
    document.getElementById('slideNumber').textContent = currentSlideIndex;
}

// Auto-advance slides every 5 seconds
setInterval(() => {
    changeSlide(1);
}, 5000);

// ==================== PROFILE LOADING ====================
async function populateUserProfile() {
    try {
        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        const avatarEl = document.getElementById('profileAvatar');

        // Try to fetch profile from database first
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
                    const name = profileData.full_name || session.session.user.user_metadata?.full_name || session.session.user.email?.split('@')[0] || 'User';
                    const email = profileData.bio || session.session.user.email || '';
                    const avatarUrl = profileData.avatar_url || `https://i.pravatar.cc/80?u=${session.session.user.id || 'guest'}`;

                    // Update profile sidebar
                    if (nameEl) nameEl.textContent = name;
                    if (emailEl) emailEl.textContent = email;
                    if (avatarEl) avatarEl.src = avatarUrl;

                    // Store in localStorage for consistency
                    localStorage.setItem('profileName', name);
                    localStorage.setItem('profileBio', email);
                    if (profileData.avatar_url) localStorage.setItem('profileAvatar', profileData.avatar_url);
                    
                    return;
                }
            }
        } catch (err) {
            console.error('Database profile fetch error:', err);
        }

        // Fallback to session data
        try {
            const supabaseClient = await window.supabaseClient || getSupabaseClient();
            const { data: session } = await supabaseClient.auth.getSession();
            
            if (session?.session?.user) {
                const name = session.session.user.user_metadata?.full_name || session.session.user.email.split('@')[0];
                const email = session.session.user.email;
                const avatarUrl = `https://i.pravatar.cc/80?u=${session.session.user.id}`;

                // Update profile sidebar
                if (nameEl) nameEl.textContent = name;
                if (emailEl) emailEl.textContent = email;
                if (avatarEl) avatarEl.src = avatarUrl;
            }
        } catch (err) {
            console.error('Session profile fetch error:', err);
        }
    } catch (error) {
        console.error('Error populating profile:', error);
    }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') changeSlide(-1);
    if (e.key === 'ArrowRight') changeSlide(1);
});

// Initialize slideshow when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    showSlide(currentSlideIndex);
});

// Initialize slideshow immediately (fallback)
showSlide(currentSlideIndex);

// Initialize Lucide icons
setTimeout(() => {
    if (window.lucide) {
        lucide.createIcons();
    }
}, 200);

// ==================== LEFT SIDEBAR TOGGLE ====================
const firstMassToggleBtn = document.getElementById('firstMassToggleSidebar');
const firstMassSidebar = document.getElementById('leftSidebar');

if (firstMassToggleBtn && firstMassSidebar) {
    firstMassToggleBtn.addEventListener('click', function() {
        firstMassSidebar.classList.toggle('mobile-open');
    });
}

// Check authentication on page load
checkAuth();

// Instantiate CourseInterface to populate profile like in quizzes.html
new CourseInterface();