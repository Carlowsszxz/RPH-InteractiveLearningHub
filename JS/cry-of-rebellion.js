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

// ==================== PROFILE LOADING ====================
async function populateUserProfile() {
    try {
        const nameEl = document.getElementById('cryProfileName');
        const emailEl = document.getElementById('cryProfileEmail');
        const avatarEl = document.getElementById('cryProfileAvatar');

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

// Slideshow functionality
let currentSlideIndex = 0;
const SLIDE_INTERVAL = 5000;
let autoSlideTimer;

function initSlideshow() {
    displaySlide(0);
    startAutoSlide();
    
    document.addEventListener('keydown', handleKeyboardNav);
}

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
    document.getElementById('totalSlides').textContent = slides.length;
    
    const description = slides[n].getAttribute('data-description');
    if (description) {
        document.getElementById('slideDescription').textContent = description;
    }
}

function handleKeyboardNav(e) {
    if (e.key === 'ArrowLeft') changeSlide(-1);
    if (e.key === 'ArrowRight') changeSlide(1);
}

function changeSlide(n) {
    clearTimeout(autoSlideTimer);
    displaySlide(currentSlideIndex + n);
    startAutoSlide();
}

function currentSlide(n) {
    clearTimeout(autoSlideTimer);
    displaySlide(n);
    startAutoSlide();
}

function startAutoSlide() {
    clearTimeout(autoSlideTimer);
    autoSlideTimer = setTimeout(() => {
        displaySlide(currentSlideIndex + 1);
        startAutoSlide();
    }, SLIDE_INTERVAL);
}

function initLucideIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initSlideshow();
        setTimeout(initLucideIcons, 100);
    });
} else {
    initSlideshow();
    setTimeout(initLucideIcons, 100);
}

window.addEventListener('load', initLucideIcons);

const cryProfileNameDisplay = document.getElementById('cryProfileName');
const cryProfileEmailDisplay = document.getElementById('cryProfileEmail');
const cryProfileAvatar = document.getElementById('cryProfileAvatar');

// ==================== MUTATIONOBSERVER: RESTORE PROFILE ON CHANGES ====================
const cryObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.target === cryProfileNameDisplay && cryProfileNameDisplay.textContent !== localStorage.getItem('profileName')) {
            console.log('🔍 Profile Name changed by Supabase, restoring from localStorage...');
            cryProfileNameDisplay.textContent = localStorage.getItem('profileName') || cryProfileNameDisplay.textContent;
        }
        if (mutation.target === cryProfileEmailDisplay && cryProfileEmailDisplay.textContent !== localStorage.getItem('profileBio')) {
            console.log('🔍 Profile Bio changed by Supabase, restoring from localStorage...');
            cryProfileEmailDisplay.textContent = localStorage.getItem('profileBio') || cryProfileEmailDisplay.textContent;
        }
        if (mutation.target === cryProfileAvatar && cryProfileAvatar.src !== localStorage.getItem('profileAvatar')) {
            console.log('🔍 Profile Avatar changed by Supabase, restoring from localStorage...');
            cryProfileAvatar.src = localStorage.getItem('profileAvatar') || cryProfileAvatar.src;
        }
    });
});

cryObserver.observe(cryProfileNameDisplay, { attributes: true, childList: true, subtree: true });
cryObserver.observe(cryProfileEmailDisplay, { attributes: true, childList: true, subtree: true });
cryObserver.observe(cryProfileAvatar, { attributes: true, childList: true, subtree: true });

// ==================== PERIODIC RESTORATION: Every 1000ms ====================
setInterval(function() {
    const currentName = cryProfileNameDisplay ? cryProfileNameDisplay.textContent : '';
    const savedName = localStorage.getItem('profileName');
    if (currentName !== savedName && savedName) {
        console.log('🔄 Periodic: Restoring profile name from localStorage');
        if (cryProfileNameDisplay) cryProfileNameDisplay.textContent = savedName;
    }

    const currentBio = cryProfileEmailDisplay ? cryProfileEmailDisplay.textContent : '';
    const savedBio = localStorage.getItem('profileBio');
    if (currentBio !== savedBio && savedBio) {
        console.log('🔄 Periodic: Restoring profile bio from localStorage');
        if (cryProfileEmailDisplay) cryProfileEmailDisplay.textContent = savedBio;
    }

    const currentAvatar = cryProfileAvatar ? cryProfileAvatar.src : '';
    const savedAvatar = localStorage.getItem('profileAvatar');
    if (currentAvatar !== savedAvatar && savedAvatar) {
        console.log('🔄 Periodic: Restoring profile avatar from localStorage');
        if (cryProfileAvatar) cryProfileAvatar.src = savedAvatar;
    }
}, 1000);

// ==================== OVERRIDE: SUPABASE populateUserProfile ====================
const checkForApp = setInterval(function() {
    if (window.app && window.app.populateUserProfile) {
        console.log('🔄 Overriding app.populateUserProfile to prevent conflicts');
        const originalPopulateUserProfile = window.app.populateUserProfile;
        window.app.populateUserProfile = function() {
            console.log('🚫 Blocked automatic profile population by app');
            // Do nothing to prevent overriding
        };
    }
}, 100);

// ==================== STORAGE EVENT LISTENER: Cross-tab Synchronization ====================
window.addEventListener('storage', function(e) {
    if (e.key === 'profileName' && profileNameDisplay) {
        console.log('🔄 Storage event: Updating profile name');
        profileNameDisplay.textContent = e.newValue || profileNameDisplay.textContent;
    }
    if (e.key === 'profileBio' && profileEmailDisplay) {
        console.log('🔄 Storage event: Updating profile bio');
        profileEmailDisplay.textContent = e.newValue || profileEmailDisplay.textContent;
    }
    if (e.key === 'profileAvatar' && profileAvatar) {
        console.log('🔄 Storage event: Updating profile avatar');
        profileAvatar.src = e.newValue || profileAvatar.src;
    }
});

// ==================== LEFT SIDEBAR TOGGLE ====================
const cryRebellionToggleBtn = document.getElementById('cryRebellionToggleSidebar');
const cryRebellionSidebar = document.getElementById('leftSidebar');

if (cryRebellionToggleBtn && cryRebellionSidebar) {
    cryRebellionToggleBtn.addEventListener('click', function() {
        cryRebellionSidebar.classList.toggle('mobile-open');
    });
}

// Check authentication on page load
checkAuth();

// Populate user profile after auth check
populateUserProfile();

// Instantiate CourseInterface to populate profile like in quizzes.html
new CourseInterface();
