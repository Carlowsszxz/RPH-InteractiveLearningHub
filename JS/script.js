class LoginForm {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.passwordToggle = document.getElementById('passwordToggle');
        this.emailError = document.getElementById('emailError');
        this.passwordError = document.getElementById('passwordError');
        this.submitButton = this.form.querySelector('button[type="submit"]');

        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.passwordToggle.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.emailInput.addEventListener('input', () => this.clearError('email'));
        this.passwordInput.addEventListener('input', () => this.clearError('password'));
    }

    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            this.showError('email', 'Email is required');
            return false;
        }

        if (!emailRegex.test(email)) {
            this.showError('email', 'Please enter a valid email address');
            return false;
        }

        this.clearError('email');
        return true;
    }

    validatePassword() {
        const password = this.passwordInput.value;

        if (!password) {
            this.showError('password', 'Password is required');
            return false;
        }

        if (password.length < 8) {
            this.showError('password', 'Password must be at least 8 characters');
            return false;
        }

        this.clearError('password');
        return true;
    }

    showError(field, message) {
        if (field === 'email') {
            this.emailError.textContent = message;
            this.emailInput.setAttribute('aria-invalid', 'true');
        } else if (field === 'password') {
            this.passwordError.textContent = message;
            this.passwordInput.setAttribute('aria-invalid', 'true');
        }
    }

    clearError(field) {
        if (field === 'email') {
            this.emailError.textContent = '';
            this.emailInput.setAttribute('aria-invalid', 'false');
        } else if (field === 'password') {
            this.passwordError.textContent = '';
            this.passwordInput.setAttribute('aria-invalid', 'false');
        }
    }

    togglePasswordVisibility(e) {
        e.preventDefault();

        const isPassword = this.passwordInput.type === 'password';
        this.passwordInput.type = isPassword ? 'text' : 'password';

        // Update icon
        const svg = this.passwordToggle.querySelector('svg');
        if (isPassword) {
            svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
            svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();

        if (!isEmailValid || !isPasswordValid) {
            return;
        }

        // Show loading state
        this.submitButton.disabled = true;
        this.submitButton.classList.add('loading');

        try {
            const email = this.emailInput.value.trim();
            const password = this.passwordInput.value;

            // Sign in with Supabase
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw new Error(error.message);
            }

            // Success
            this.showSuccessMessage();
            
            // Redirect to home page after 1.5 seconds
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);

        } catch (error) {
            this.showError('password', error.message || 'Login failed. Please try again.');
        } finally {
            this.submitButton.disabled = false;
            this.submitButton.classList.remove('loading');
        }
    }

    showSuccessMessage() {
        const originalText = this.submitButton.textContent;
        this.submitButton.textContent = '✓ Signed In';
        this.submitButton.style.backgroundColor = '#48bb78';

        setTimeout(() => {
            // In a real app, redirect to dashboard
            // window.location.href = '/dashboard';
        }, 1500);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize LoginForm if login form elements exist
    if (document.getElementById('loginForm')) {
        new LoginForm();
    }
});
