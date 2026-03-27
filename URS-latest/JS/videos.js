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
    // Load profile immediately
    loadProfileFromStorage();
    
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
