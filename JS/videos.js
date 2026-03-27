// Load profile from localStorage on page load
function loadProfileFromStorage() {
    const profileNameDisplay = document.querySelector('.profile-name');
    const profileEmailDisplay = document.querySelector('.profile-email');
    const profileAvatar = document.querySelector('.profile-avatar');
    
    const savedName = localStorage.getItem('profileName');
    const savedBio = localStorage.getItem('profileBio');
    const savedAvatar = localStorage.getItem('profileAvatar');

    if (savedName && profileNameDisplay) profileNameDisplay.textContent = savedName;
    if (savedBio && profileEmailDisplay) profileEmailDisplay.textContent = savedBio;
    if (savedAvatar && profileAvatar) profileAvatar.src = savedAvatar;
}

// Initialize dropdown functionality for sidebar navigation
document.addEventListener('DOMContentLoaded', function() {
    // Populate profile: prefer shared Supabase-backed loader, fall back to localStorage loader
    const nameEl = document.getElementById('profileName') || document.querySelector('.profile-name');
    const emailEl = document.getElementById('profileEmail') || document.querySelector('.profile-email');
    const avatarEl = document.getElementById('profileAvatar') || document.querySelector('.profile-avatar');

    if (window.loadUserProfile && typeof window.loadUserProfile === 'function') {
        // async load but don't block UI
        window.loadUserProfile(nameEl, emailEl, avatarEl).catch(() => {
            loadProfileFromStorage();
        });
    } else {
        loadProfileFromStorage();
    }
    
    const dropdownToggles = document.querySelectorAll('.sidebar-nav .nav-item-dropdown .nav-item');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = toggle.closest('.nav-item-dropdown');
            dropdown.classList.toggle('open');
            
            // Close other dropdowns
            document.querySelectorAll('.sidebar-nav .nav-item-dropdown').forEach(other => {
                if (other !== dropdown) {
                    other.classList.remove('open');
                }
            });
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.sidebar-nav .nav-item-dropdown')) {
            document.querySelectorAll('.sidebar-nav .nav-item-dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
            });
        }
    });
});

// Reload profile periodically to stay in sync
setInterval(loadProfileFromStorage, 1000);

// Lazy-load video iframes: create iframe on click or when entering viewport
function initLazyVideos(){
    const placeholders = document.querySelectorAll('.video-placeholder');

    function createIframe(ph){
        if(!ph || ph.dataset.loaded) return;
        const src = ph.dataset.src;
        const title = ph.dataset.title || '';
        const iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = '315';
        iframe.src = src + (src.indexOf('?') === -1 ? '?rel=0' : '&rel=0');
        iframe.title = title;
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        ph.innerHTML = '';
        ph.appendChild(iframe);
        ph.dataset.loaded = '1';
    }

    placeholders.forEach(ph => {
        ph.addEventListener('click', () => createIframe(ph));
        ph.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); createIframe(ph); }});
    });

    if('IntersectionObserver' in window){
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(en => {
                if(en.isIntersecting){
                    createIframe(en.target);
                    obs.unobserve(en.target);
                }
            });
        }, {rootMargin: '200px'});

        placeholders.forEach(ph => io.observe(ph));
    }
}

document.addEventListener('DOMContentLoaded', function(){
    // existing DOMContentLoaded code runs above; initialize lazy videos as well
    initLazyVideos();
});
