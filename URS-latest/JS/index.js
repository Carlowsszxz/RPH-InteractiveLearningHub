// On index.html load, clear any Supabase session if no userEmail in localStorage
async function clearOrphanedSession() {
    if (!localStorage.getItem('userEmail') && window.supabaseClient) {
        try {
            // Sign out globally to clear any persisted Supabase session
            await window.supabaseClient.auth.signOut({ scope: 'global' });
        } catch (err) {
            console.log('Clear session:', err.message);
        }
    }
}

// Check if user is already logged in (use localStorage as source of truth)
if (localStorage.getItem('userEmail')) {
    // User has valid session in localStorage, redirect to home
    window.location.href = 'home.html';
} else {
    // No valid session, clear any orphaned Supabase session
    clearOrphanedSession();
}

// ==================== FORGOT PASSWORD ====================
const forgotPasswordLink = document.querySelector('.forgot-password');
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const closeForgotPasswordModal = document.getElementById('closeForgotPasswordModal');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const resetSuccessMessage = document.getElementById('resetSuccessMessage');
const forgotEmailHelper = document.getElementById('forgotEmailHelper');

// Open forgot password modal
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        forgotPasswordModal.classList.remove('hidden');
    });
}

// Close forgot password modal
if (closeForgotPasswordModal) {
    closeForgotPasswordModal.addEventListener('click', () => {
        forgotPasswordModal.classList.add('hidden');
        forgotPasswordForm.reset();
        resetSuccessMessage.classList.add('hidden');
    });
}

// Close modal when clicking outside
if (forgotPasswordModal) {
    forgotPasswordModal.addEventListener('click', (e) => {
        if (e.target === forgotPasswordModal) {
            forgotPasswordModal.classList.add('hidden');
            forgotPasswordForm.reset();
            resetSuccessMessage.classList.add('hidden');
        }
    });
}

// Handle forgot password form submission
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value.trim();
        const emailError = document.getElementById('forgotEmailError');

        // Validate email
        if (!email) {
            emailError.textContent = 'Email is required';
            return;
        }

        emailError.textContent = '';

        try {
            // Send password reset email via Supabase
            if (window.supabaseClient) {
                const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password.html`
                });

                if (error) {
                    emailError.textContent = error.message || 'Error sending reset email';
                } else {
                    // Show success message
                    forgotPasswordForm.classList.add('hidden');
                    resetSuccessMessage.classList.remove('hidden');

                    // Auto-close modal after 3 seconds
                    setTimeout(() => {
                        forgotPasswordModal.classList.add('hidden');
                        forgotPasswordForm.classList.remove('hidden');
                        forgotPasswordForm.reset();
                        resetSuccessMessage.classList.add('hidden');
                    }, 3000);
                }
            }
        } catch (error) {
            emailError.textContent = error.message || 'An error occurred';
        }
    });
}

// Show helper message when email is entered
const forgotEmailInput = document.getElementById('forgotEmail');
if (forgotEmailInput && forgotEmailHelper) {
    forgotEmailInput.addEventListener('input', () => {
        const email = forgotEmailInput.value.trim();
        if (email) {
            forgotEmailHelper.textContent = 'Check your email for password reset instructions after submitting.';
        } else {
            forgotEmailHelper.textContent = '';
        }
    });
}

// ==================== TERMS AND RULES ====================
const termsLink = document.getElementById('termsLink');
const termsModal = document.getElementById('termsModal');
const closeTermsModal = document.getElementById('closeTermsModal');

// Open terms modal
if (termsLink) {
    termsLink.addEventListener('click', (e) => {
        e.preventDefault();
        termsModal.classList.remove('hidden');
    });
}

// Close terms modal
if (closeTermsModal) {
    closeTermsModal.addEventListener('click', () => {
        termsModal.classList.add('hidden');
    });
}

// Close modal when clicking outside
if (termsModal) {
    termsModal.addEventListener('click', (e) => {
        if (e.target === termsModal) {
            termsModal.classList.add('hidden');
        }
    });
}

// Form validation for terms agreement
const loginForm = document.getElementById('loginForm');
const termsCheckbox = document.getElementById('termsAgreement');
const termsError = document.getElementById('termsError');

if (loginForm && termsCheckbox && termsError) {
    // Function to validate terms agreement
    function validateTermsAgreement() {
        if (!termsCheckbox.checked) {
            termsError.textContent = 'You must agree to the terms and rules to continue.';
            termsError.style.display = 'block';
            termsCheckbox.focus();
            return false;
        } else {
            termsError.style.display = 'none';
            return true;
        }
    }

    // Prevent form submission if terms not checked
    loginForm.addEventListener('submit', function(e) {
        if (!validateTermsAgreement()) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });

    // Prevent Enter key submission in form fields when terms not checked
    const formInputs = loginForm.querySelectorAll('input');
    formInputs.forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !termsCheckbox.checked) {
                e.preventDefault();
                validateTermsAgreement();
                // Add visual feedback
                termsCheckbox.style.boxShadow = '0 0 0 2px #d32f2f';
                setTimeout(() => {
                    termsCheckbox.style.boxShadow = '';
                }, 1000);
                return false;
            }
        });
    });

    // Real-time validation feedback
    termsCheckbox.addEventListener('change', function() {
        if (this.checked) {
            termsError.style.display = 'none';
        }
    });
}