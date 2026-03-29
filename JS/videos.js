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

// Video modal player + Watch Later feature
function initVideoModalPlayer(){
    const placeholders = document.querySelectorAll('.video-placeholder');
    const modal = document.getElementById('videoModal');
    const modalPlayer = modal && modal.querySelector('.video-modal-player');
    const modalTitle = modal && modal.querySelector('.video-modal-title');
    const watchBtn = modal && modal.querySelector('.watch-later-btn');
    const transcriptLink = modal && modal.querySelector('.transcript-link');
    const transcriptBox = modal && modal.querySelector('.video-modal-transcript');

    function getWatchLater(){
        try{ return JSON.parse(localStorage.getItem('watchLater')||'[]'); }catch(e){ return []; }
    }
    function saveWatchLater(list){ localStorage.setItem('watchLater', JSON.stringify(list)); }
    function isBookmarked(src){ return getWatchLater().indexOf(src) !== -1; }
    function toggleBookmark(src){
        const list = getWatchLater();
        const i = list.indexOf(src);
        if(i === -1) list.push(src); else list.splice(i,1);
        saveWatchLater(list);
        updateBadges();
        return isBookmarked(src);
    }

    function updateBadges(){
        const list = getWatchLater();
        placeholders.forEach(ph => {
            const src = ph.dataset.src || (ph.querySelector('iframe') && ph.querySelector('iframe').src);
            if(!src) return;
            let badge = ph.querySelector('.watch-later-badge');
            if(list.indexOf(src) !== -1){
                if(!badge){ badge = document.createElement('span'); badge.className='watch-later-badge'; badge.textContent='Saved'; ph.appendChild(badge); }
            } else {
                if(badge) ph.removeChild(badge);
            }
        });
    }

    function openModalWithSrc(src, title){
        if(!modal || !modalPlayer) return;
        modalPlayer.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = '480';
        iframe.src = src + (src.indexOf('?') === -1 ? '?rel=0' : '&rel=0');
        iframe.title = title || '';
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        modalPlayer.appendChild(iframe);
        if(modalTitle) modalTitle.textContent = title || '';
        if(watchBtn) watchBtn.textContent = isBookmarked(src) ? 'Remove from Watch Later' : 'Add to Watch Later';
        modal.removeAttribute('aria-hidden');
        modal.classList.add('open');
        // store current src for watch button
        modal.dataset.currentSrc = src;
        // populate transcript if available
        const transcript = Array.from(placeholders).find(p=> (p.dataset.src||'') === src)?.dataset.transcript || '';
        if(transcriptBox) {
            transcriptBox.textContent = transcript;
            transcriptBox.style.display = 'none';
        }
        if(transcriptLink) {
            if(transcript && transcript.length>0){
                transcriptLink.style.display = '';
                transcriptLink.setAttribute('aria-expanded','false');
            } else {
                transcriptLink.style.display = 'none';
            }
        }
    }

    function closeModal(){
        if(!modal || !modalPlayer) return;
        modalPlayer.innerHTML = '';
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden','true');
        delete modal.dataset.currentSrc;
        if(transcriptBox){ transcriptBox.style.display = 'none'; transcriptBox.textContent = ''; }
    }

    // attach click / keyboard handlers
    placeholders.forEach(ph => {
        ph.addEventListener('click', (e) => {
            const src = ph.dataset.src || (ph.querySelector('iframe') && ph.querySelector('iframe').src);
            const title = ph.dataset.title || '';
            if(!src) return;
            openModalWithSrc(src, title);
        });
        ph.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ph.click(); }});
    });

    // modal close handlers
    if(modal){
        modal.addEventListener('click', (e) => {
            if(e.target === modal || e.target.classList.contains('video-modal-close')) closeModal();
        });
        document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });
    }

    if(watchBtn){
        watchBtn.addEventListener('click', () => {
            const src = modal && modal.dataset.currentSrc;
            if(!src) return;
            const nowBookmarked = toggleBookmark(src);
            watchBtn.textContent = nowBookmarked ? 'Remove from Watch Later' : 'Add to Watch Later';
        });
    }

    if(transcriptLink && transcriptBox){
        transcriptLink.addEventListener('click', (e)=>{
            e.preventDefault();
            const isOpen = transcriptBox.style.display !== 'none' && transcriptBox.style.display !== '';
            if(isOpen){
                transcriptBox.style.display = 'none';
                transcriptLink.setAttribute('aria-expanded','false');
            } else {
                transcriptBox.style.display = 'block';
                transcriptLink.setAttribute('aria-expanded','true');
            }
        });
    }

    updateBadges();
}

document.addEventListener('DOMContentLoaded', function(){
    // existing DOMContentLoaded code runs above; initialize lazy videos as well
    initVideoModalPlayer();
    initVideoFilters && initVideoFilters();
});

// Video search & filter
function initVideoFilters(){
    const search = document.getElementById('videoSearch');
    const category = document.getElementById('videoCategory');
    const sort = document.getElementById('videoSort');
    const container = document.querySelector('.videos-container');
    if(!container) return;
    const cards = Array.from(container.querySelectorAll('.video-card'));

    function normalize(s){ return (s||'').toString().toLowerCase(); }

    function applyFilter(){
        const q = normalize(search && search.value);
        const cat = category && category.value;

        cards.forEach(card => {
            const title = normalize(card.querySelector('.video-info h3') && card.querySelector('.video-info h3').textContent);
            const desc = normalize(card.querySelector('.video-info p') && card.querySelector('.video-info p').textContent);
            const ph = card.querySelector('.video-placeholder');
            const catVal = ph && ph.dataset.category || '';
            const matchesQuery = q === '' || title.includes(q) || desc.includes(q) || (ph.dataset.title && normalize(ph.dataset.title).includes(q));
            const matchesCategory = !cat || catVal === cat;
            card.style.display = (matchesQuery && matchesCategory) ? '' : 'none';
        });
    }

    let debounceTimer;
    function debounceApply(){ clearTimeout(debounceTimer); debounceTimer = setTimeout(applyFilter, 180); }

    if(search) search.addEventListener('input', debounceApply);
    if(category) category.addEventListener('change', applyFilter);
    if(sort){
        sort.addEventListener('change', ()=>{
            if(sort.value === 'title'){
                cards.sort((a,b)=> a.querySelector('.video-info h3').textContent.localeCompare(b.querySelector('.video-info h3').textContent));
            }
            // re-append in new order
            cards.forEach(c => container.appendChild(c));
        });
    }

    // initial
    applyFilter();
}
