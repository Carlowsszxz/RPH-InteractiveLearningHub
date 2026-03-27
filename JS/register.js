        const studentIdInput = document.getElementById('studentId');
        const fullNameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const registerForm = document.getElementById('registerForm');
        const registerBtn = document.getElementById('registerBtn');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');

        // Password requirement checkers
        const lengthReq = document.getElementById('lengthReq');
        const uppercaseReq = document.getElementById('uppercaseReq');
        const lowercaseReq = document.getElementById('lowercaseReq');
        const numberReq = document.getElementById('numberReq');

        function updatePasswordRequirements() {
            const password = passwordInput.value;

            // Check length (8+ characters)
            if (password.length >= 8) {
                lengthReq.classList.remove('unmet');
                lengthReq.classList.add('met');
            } else {
                lengthReq.classList.add('unmet');
                lengthReq.classList.remove('met');
            }

            // Check uppercase
            if (/[A-Z]/.test(password)) {
                uppercaseReq.classList.remove('unmet');
                uppercaseReq.classList.add('met');
            } else {
                uppercaseReq.classList.add('unmet');
                uppercaseReq.classList.remove('met');
            }

            // Check lowercase
            if (/[a-z]/.test(password)) {
                lowercaseReq.classList.remove('unmet');
                lowercaseReq.classList.add('met');
            } else {
                lowercaseReq.classList.add('unmet');
                lowercaseReq.classList.remove('met');
            }

            // Check number
            if (/[0-9]/.test(password)) {
                numberReq.classList.remove('unmet');
                numberReq.classList.add('met');
            } else {
                numberReq.classList.add('unmet');
                numberReq.classList.remove('met');
            }
        }

        passwordInput.addEventListener('input', updatePasswordRequirements);

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
            successMessage.classList.remove('show');
        }

        function showSuccess(message) {
            successMessage.textContent = message;
            successMessage.classList.add('show');
            errorMessage.classList.remove('show');
        }

        function hideMessages() {
            errorMessage.classList.remove('show');
            successMessage.classList.remove('show');
        }

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideMessages();

            const studentId = studentIdInput.value.trim();
            const fullName = fullNameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Validation
            if (!studentId) {
                showError('Please enter your student ID');
                return;
            }

            if (!fullName) {
                showError('Please enter your full name');
                return;
            }

            if (!email) {
                showError('Please enter an email address');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showError('Please enter a valid email address');
                return;
            }

            if (password.length < 8) {
                showError('Password must be at least 8 characters long');
                return;
            }

            if (!/[A-Z]/.test(password)) {
                showError('Password must contain at least one uppercase letter');
                return;
            }

            if (!/[a-z]/.test(password)) {
                showError('Password must contain at least one lowercase letter');
                return;
            }

            if (!/[0-9]/.test(password)) {
                showError('Password must contain at least one number');
                return;
            }

            if (password !== confirmPassword) {
                showError('Passwords do not match');
                return;
            }

            // Disable button and show loading state
            registerBtn.disabled = true;
            registerBtn.textContent = 'Creating account...';

            try {
                // Sign up with Supabase
                const { data, error } = await window.supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: fullName,
                            student_id: studentId
                        }
                    }
                });

                if (error) {
                    showError(error.message || 'Failed to create account');
                    registerBtn.disabled = false;
                    registerBtn.textContent = 'Create Account';
                    return;
                }

                showSuccess('Account created! Please check your email for confirmation instructions.');
                registerBtn.textContent = 'Account Created!';

                // Redirect to login after 3 seconds
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);

            } catch (error) {
                console.error('Registration error:', error);
                showError(error.message || 'An unexpected error occurred');
                registerBtn.disabled = false;
                registerBtn.textContent = 'Create Account';
            }
        });

        // Check if user is already logged in
        async function checkAuth() {
            const session = await window.supabaseClient.auth.getSession();
            if (session.data.session) {
                // User already logged in, redirect to home
                window.location.href = 'home.html';
            }
        }

        checkAuth();

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
