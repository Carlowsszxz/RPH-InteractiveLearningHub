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

// ==================== SLIDESHOW FUNCTIONALITY ====================
// Slideshow functionality for retraction page
let currentSlideIndex = 0;
const SLIDE_INTERVAL = 5000; // 5 seconds
let autoSlideTimer;

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log(err));
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

function initSlideshow() {
    displaySlide(0);
    startAutoSlide();

    document.addEventListener('keydown', handleKeyboardNav);
    document.addEventListener('fullscreenchange', exitFullscreen);
}

// Display specific slide and update description
function displaySlide(n) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    if (!slides.length) return;

    n = (n + slides.length) % slides.length;
    currentSlideIndex = n;

    slides.forEach(slide => slide.classList.remove('fade'));
    slides.forEach(slide => slide.style.display = 'none');

    slides[n].style.display = 'block';
    slides[n].classList.add('fade');

    dots.forEach(dot => dot.classList.remove('active'));
    if (dots[n]) dots[n].classList.add('active');

    document.getElementById('slideNumber').textContent = n + 1;

    const description = slides[n].getAttribute('data-description');
    if (description) {
        document.getElementById('slideDescription').textContent = description;
    }
}

// Keyboard navigation
function handleKeyboardNav(e) {
    if (e.key === 'ArrowLeft') changeSlide(-1);
    if (e.key === 'ArrowRight') changeSlide(1);
    if (e.key === 'Escape') exitFullscreen();
}

// Change slide by offset
function changeSlide(n) {
    clearTimeout(autoSlideTimer);
    displaySlide(currentSlideIndex + n);
    startAutoSlide();
}

// Jump to specific slide
function currentSlide(n) {
    clearTimeout(autoSlideTimer);
    displaySlide(n);
    startAutoSlide();
}

// Auto-advance slides
function startAutoSlide() {
    clearTimeout(autoSlideTimer);
    autoSlideTimer = setTimeout(() => {
        displaySlide(currentSlideIndex + 1);
        startAutoSlide();
    }, SLIDE_INTERVAL);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initSlideshow();
        if (window.lucide) {
            lucide.createIcons();
        }
    });
} else {
    initSlideshow();
    if (window.lucide) {
        lucide.createIcons();
    }
}

// ==================== PROFILE LOADING ====================
async function populateUserProfile() {
    try {
        const nameEl = document.getElementById('retractionProfileName');
        const emailEl = document.getElementById('retractionProfileEmail');
        const avatarEl = document.getElementById('retractionProfileAvatar');

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
                const name = session.session.user.user_metadata?.full_name || session.session.user.email?.split('@')[0] || 'User';
                const email = session.session.user.email || '';
                const avatarUrl = `https://i.pravatar.cc/80?u=${session.session.user.id || 'guest'}`;

                if (nameEl) nameEl.textContent = name;
                if (emailEl) emailEl.textContent = email;
                if (avatarEl) avatarEl.src = avatarUrl;
            }
        } catch (err) {
            console.error('Session profile fetch error:', err);
        }
    } catch (error) {
        console.error('Profile population error:', error);
    }
}

// ==================== LUCIDE ICONS INITIALIZATION ====================
window.addEventListener('load', function() {
    if (window.lucide) {
        lucide.createIcons();
    }
});

// ==================== LEFT SIDEBAR TOGGLE ====================
const rizalRetractionToggleBtn = document.getElementById('rizalRetractionToggleSidebar');
const rizalRetractionSidebar = document.getElementById('leftSidebar');

if (rizalRetractionToggleBtn && rizalRetractionSidebar) {
    rizalRetractionToggleBtn.addEventListener('click', function() {
        rizalRetractionSidebar.classList.toggle('mobile-open');
    });
}

// Check authentication on page load
checkAuth();

// Populate user profile after auth check
populateUserProfile();

// Instantiate CourseInterface to populate profile like in quizzes.html
new CourseInterface();