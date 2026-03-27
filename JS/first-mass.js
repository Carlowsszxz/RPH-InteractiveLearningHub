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
let _isZooming = false;
let _isPanning = false;

function changeSlide(n) {
    // Prevent changing slides while user is actively zooming or panning
    if (_isZooming || _isPanning) return;
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

    // If there are no slides on the page (gallery mode), bail out safely
    if (!slides || slides.length === 0) return;

    if (currentSlideIndex > slides.length) {
        currentSlideIndex = 1;
    }
    if (currentSlideIndex < 1) {
        currentSlideIndex = slides.length;
    }

    slides.forEach(slide => slide.classList.remove('fade'));

    // Only manipulate dots if they exist and index is valid
    if (dots && dots.length > 0) {
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[currentSlideIndex - 1]) dots[currentSlideIndex - 1].classList.add('active');
    }

    const current = slides[currentSlideIndex - 1];
    if (current) current.classList.add('fade');

    const description = current && current.getAttribute ? current.getAttribute('data-description') : null;
    const descEl = document.getElementById('slideDescription');
    if (descEl && description) descEl.textContent = description;
    const numEl = document.getElementById('slideNumber');
    if (numEl) numEl.textContent = currentSlideIndex;
}

// Auto-advance disabled: removed automatic advancing of slides
let _autoAdvanceId = null;

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

/*
// Keyboard navigation (disabled for this page; slideshow not used)
document.addEventListener('keydown', (e) => {
    if (_isZooming || _isPanning) return;
    if (e.key === 'ArrowLeft') changeSlide(-1);
    if (e.key === 'ArrowRight') changeSlide(1);
});
*/

/*
// Initialize slideshow when DOM is ready (disabled — slideshow not used on this page)
document.addEventListener('DOMContentLoaded', function() {
    showSlide();
});
*/

// Initialize Lucide icons
setTimeout(() => {
    if (window.lucide) {
        lucide.createIcons();
    }
}, 200);
/* -------------------- Zoom overlay viewer (pinch/wheel + draggable) (disabled) -------------------- */
if (false) (function(){
    const MIN_Z = 1.0, MAX_Z = 3.0;
    let z = 1, panX = 0, panY = 0;
    let pinchStartDist = null, pinchStartZ = 1;
    let panActive = false, panStart = null, panPointerId = null;

    function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

    const overlay = document.getElementById('zoomOverlay');
    const viewport = overlay && overlay.querySelector('.zoom-viewport');
    const zoomImg = overlay && overlay.querySelector('.zoom-image');
    const slider = overlay && overlay.querySelector('.zoom-slider');
    const percent = overlay && overlay.querySelector('.zoom-percent');
    const resetBtn = overlay && overlay.querySelector('.zoom-reset');
    const closeBtns = overlay && overlay.querySelectorAll('[data-action="close"]');

    function updateTransform(){
        if (!zoomImg || !viewport) return;
        clampPan();
        zoomImg.style.transform = `translate(${panX}px, ${panY}px) scale(${z})`;
        if (percent) percent.textContent = Math.round(z * 100) + '%';
        if (slider) slider.value = Math.round(z * 100);
    }

    function clampPan(){
        if (!zoomImg || !viewport) return;
        const rect = viewport.getBoundingClientRect();
        const cw = rect.width, ch = rect.height;
        // use current rendered image size (clientWidth/clientHeight) before transform
        const iw = (zoomImg.clientWidth || zoomImg.naturalWidth) * z;
        const ih = (zoomImg.clientHeight || zoomImg.naturalHeight) * z;
        const maxX = Math.max(0, (iw - cw)/2);
        const maxY = Math.max(0, (ih - ch)/2);
        panX = clamp(panX, -maxX, maxX);
        panY = clamp(panY, -maxY, maxY);
    }

    function openOverlay(imageSrc){
        if (!overlay || !zoomImg) return;
        z = 1; panX = 0; panY = 0;
        overlay.setAttribute('aria-hidden','false');
        document.body.classList.add('zoom-overlay-open');
        _isZooming = true;
        // set src and wait for load to compute natural sizes before enabling pan/clamp
        zoomImg.onload = function(){
            // ensure image not draggable
            try { zoomImg.draggable = false; } catch(e){}
            updateTransform();
        };
        zoomImg.src = imageSrc;
    }
    
    

    function closeOverlay(){
        if (!overlay || !zoomImg) return;
        overlay.setAttribute('aria-hidden','true');
        document.body.classList.remove('zoom-overlay-open');
        z = 1; panX = 0; panY = 0;
        zoomImg.style.transform = '';
        _isZooming = false;
    }

    // open trigger: zoom-open button or double-click on slide image
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.zoom-open');
        if (btn) {
            const cur = document.querySelector('.slide.fade .infographic-image');
            if (cur) openOverlay(cur.src);
        }
    });
    document.addEventListener('dblclick', (e) => {
        const img = e.target.closest('.infographic-image');
        if (img) { openOverlay(img.src); }
    });

    // close handlers
    if (closeBtns) closeBtns.forEach(b=>b.addEventListener('click', closeOverlay));
    if (overlay) overlay.querySelector('.zoom-overlay-backdrop')?.addEventListener('click', closeOverlay);
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeOverlay(); });

    // slider / reset
    if (slider) slider.addEventListener('input', (e)=>{ z = clamp(Number(e.target.value)/100, MIN_Z, MAX_Z); updateTransform(); });
    if (resetBtn) resetBtn.addEventListener('click', ()=>{ z = 1; panX = 0; panY = 0; updateTransform(); });

    // wheel zoom inside viewport
    if (viewport) {
        viewport.addEventListener('wheel', (e)=>{
            e.preventDefault();
            const delta = -e.deltaY;
            const factor = 1 + (delta/800);
            const rect = viewport.getBoundingClientRect();
            const focal = { x: e.clientX, y: e.clientY };
            const prevZ = z;
            z = clamp(z * factor, MIN_Z, MAX_Z);
            const fx = focal.x - rect.left - rect.width/2;
            const fy = focal.y - rect.top - rect.height/2;
            const scaleDelta = z / prevZ;
            panX = (panX - fx) * scaleDelta + fx;
            panY = (panY - fy) * scaleDelta + fy;
            updateTransform();
        }, { passive: false });
    }

    // pointer handling for pinch and pan inside viewport
    if (viewport) {
        const pointers = new Map();

        viewport.addEventListener('pointerdown', (e)=>{
            e.preventDefault();
            e.stopPropagation();
            viewport.setPointerCapture && viewport.setPointerCapture(e.pointerId);
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.size === 1 && z > 1) {
                panPointerId = e.pointerId;
                panActive = true;
                panStart = { x: e.clientX, y: e.clientY, panX: panX, panY: panY };
                viewport.classList.add('panning');
            }
            if (pointers.size === 2) {
                const pts = Array.from(pointers.values());
                pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                pinchStartZ = z;
            }
        });

        viewport.addEventListener('pointermove', (e)=>{
            if (!pointers.has(e.pointerId)) return;
            e.preventDefault();
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.size === 2 && pinchStartDist) {
                const pts = Array.from(pointers.values());
                const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                const mid = { x: (pts[0].x + pts[1].x)/2, y: (pts[0].y + pts[1].y)/2 };
                const factor = curDist / pinchStartDist;
                const prevZ = z;
                z = clamp(pinchStartZ * factor, MIN_Z, MAX_Z);
                const rect = viewport.getBoundingClientRect();
                const fx = mid.x - rect.left - rect.width/2;
                const fy = mid.y - rect.top - rect.height/2;
                const scaleDelta = z / prevZ;
                panX = (panX - fx) * scaleDelta + fx;
                panY = (panY - fy) * scaleDelta + fy;
                updateTransform();
            } else if (panActive && panPointerId === e.pointerId) {
                const dx = e.clientX - panStart.x;
                const dy = e.clientY - panStart.y;
                panX = panStart.panX + dx;
                panY = panStart.panY + dy;
                updateTransform();
            }
        });

        const release = (e)=>{
            pointers.delete(e.pointerId);
            if (panPointerId === e.pointerId) {
                panPointerId = null;
                panActive = false;
                viewport.classList.remove('panning');
            }
            if (pointers.size < 2) pinchStartDist = null;
            viewport.releasePointerCapture && viewport.releasePointerCapture(e.pointerId);
        };

        viewport.addEventListener('pointerup', release);
        viewport.addEventListener('pointercancel', release);
        viewport.addEventListener('pointerleave', release);
        viewport.addEventListener('pointerout', release);
    }

    // ensure slides do not change while overlay open
    const origChangeSlide = window.changeSlide;
    window.changeSlide = function(n){ if (_isZooming) return; origChangeSlide(n); };

    // open overlay on pinch gesture started on main slideshow area
    const mainSlideshow = document.querySelector('.slideshow-container');
    if (mainSlideshow) {
        let pointerMap = new Map();
        mainSlideshow.addEventListener('pointerdown', (e)=>{
            pointerMap.set(e.pointerId, {x: e.clientX, y: e.clientY});
            if (pointerMap.size === 2) {
                const cur = document.querySelector('.slide.fade .infographic-image');
                if (cur) openOverlay(cur.src);
            }
        });
        mainSlideshow.addEventListener('pointerup', (e)=>{ pointerMap.delete(e.pointerId); });
        mainSlideshow.addEventListener('pointercancel', (e)=>{ pointerMap.delete(e.pointerId); });
    }

})();


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