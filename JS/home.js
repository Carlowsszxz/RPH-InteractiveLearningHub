        // Facts rotation
        let currentFactIndex = 0;
        const facts = document.querySelectorAll('.fact');
        
        function rotateFacts() {
            facts.forEach(fact => fact.classList.remove('active'));
            facts[currentFactIndex].classList.add('active');
            currentFactIndex = (currentFactIndex + 1) % facts.length;
        }
        
        // Start rotation on page load
        document.addEventListener('DOMContentLoaded', function() {
            if (window.lucide) {
                lucide.createIcons();
            }
            rotateFacts();
            setInterval(rotateFacts, 4000);
        });

        // Check if user is logged in via Supabase session
        async function checkAuth() {
            try {
                // If userEmail not in localStorage, user is logged out
                if (!localStorage.getItem('userEmail')) {
                    console.log('No user email in localStorage, redirecting to login');
                    window.location.href = 'index.html';
                    return;
                }
                
                // Wait a bit to ensure Supabase is fully initialized
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (!window.supabaseClient) {
                    console.error('Supabase client not initialized');
                    window.location.href = 'index.html';
                    return;
                }
                
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                
                if (!session) {
                    console.log('No active session, redirecting to login');
                    window.location.href = 'index.html';
                    return;
                }
                
                console.log('User authenticated:', session.user.email);
            } catch (error) {
                console.error('Auth check error:', error);
                // If error checking auth, redirect to login to be safe
                window.location.href = 'index.html';
            }
        }

        // Logout function - properly clear everything
        async function logout() {
            try {
                // Clear all local storage
                localStorage.clear();
                sessionStorage.clear();
                
                // Sign out from Supabase
                if (window.supabaseClient) {
                    const { error } = await window.supabaseClient.auth.signOut({ scope: 'global' });
                    if (error) {
                        console.error('Supabase signOut error:', error);
                    }
                }
            } catch (err) {
                console.error('Logout error:', err);
            } finally {
                // Force redirect to index after clearing everything
                window.location.href = 'index.html';
            }
        }

        // Check auth on page load
        checkAuth();
