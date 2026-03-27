        // Initialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

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

        // Check authentication on page load
        checkAuth();

        // Populate profile like in firstmass.html
        populateUserProfile();

        // Instantiate CourseInterface to populate profile like in firstmass.html
        new CourseInterface();

        // ==================== TRIVIA RACE GAME ====================
        const triviaModal = document.getElementById('triviaModal');
        const triviaRaceCard = document.getElementById('triviaRaceCard');
        const triviaCloseBtn = document.getElementById('triviaCloseBtn');
        const triviaStartBtn = document.getElementById('triviaStartBtn');
        const triviaPlayAgainBtn = document.getElementById('triviaPlayAgainBtn');
        const triviaViewLeaderboardBtn = document.getElementById('triviaViewLeaderboardBtn');
        const triviaBackToEndBtn = document.getElementById('triviaBackToEndBtn');

        // Screen elements
        const triviaStartScreen = document.getElementById('triviaStartScreen');
        const triviaGameScreen = document.getElementById('triviaGameScreen');
        const triviaEndScreen = document.getElementById('triviaEndScreen');
        const triviaLeaderboardScreen = document.getElementById('triviaLeaderboardScreen');

        // Open modal when clicking trivia race card
        if (triviaRaceCard) {
            triviaRaceCard.addEventListener('click', () => {
                triviaModal.classList.add('active');
                showScreen('start');
                // Initialize Lucide icons in modal
                if (window.lucide) {
                    lucide.createIcons();
                }
            });
        }

        // Close modal
        if (triviaCloseBtn) {
            triviaCloseBtn.addEventListener('click', () => {
                triviaModal.classList.remove('active');
            });
        }

        // Close modal when clicking outside
        triviaModal?.addEventListener('click', (e) => {
            if (e.target === triviaModal) {
                triviaModal.classList.remove('active');
            }
        });

        // Start game
        if (triviaStartBtn) {
            triviaStartBtn.addEventListener('click', () => {
                startTriviaGame();
            });
        }

        // Play again
        if (triviaPlayAgainBtn) {
            triviaPlayAgainBtn.addEventListener('click', () => {
                startTriviaGame();
            });
        }

        // View leaderboard
        if (triviaViewLeaderboardBtn) {
            triviaViewLeaderboardBtn.addEventListener('click', () => {
                showScreen('leaderboard');
                // Load leaderboard with default filter (all-time)
                displayLeaderboard('all-time');
            });
        }

        // Back to end screen
        if (triviaBackToEndBtn) {
            triviaBackToEndBtn.addEventListener('click', () => {
                showScreen('end');
            });
        }

        // Leaderboard filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                // Load filtered leaderboard data
                displayLeaderboard(filter);
            });
        });

        // Helper function to show screens
        function showScreen(screen) {
            triviaStartScreen?.classList.remove('active');
            triviaGameScreen?.classList.remove('active');
            triviaEndScreen?.classList.remove('active');
            triviaLeaderboardScreen?.classList.remove('active');

            switch(screen) {
                case 'start':
                    triviaStartScreen?.classList.add('active');
                    break;
                case 'game':
                    triviaGameScreen?.classList.add('active');
                    break;
                case 'end':
                    triviaEndScreen?.classList.add('active');
                    break;
                case 'leaderboard':
                    triviaLeaderboardScreen?.classList.add('active');
                    break;
            }

            // Re-initialize Lucide icons
            if (window.lucide) {
                lucide.createIcons();
            }
        }

        // ==================== SOUND EFFECTS SYSTEM ====================
        let soundEnabled = true;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        let audioCtx = null;

        function getAudioContext() {
            if (!audioCtx) {
                try {
                    audioCtx = new AudioContext();
                } catch (e) {
                    console.warn('AudioContext not supported');
                    return null;
                }
            }
            return audioCtx;
        }

        function playSound(type) {
            if (!soundEnabled) return;
            const ctx = getAudioContext();
            if (!ctx) return;

            try {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                switch (type) {
                    case 'correct':
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
                        oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
                        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                        oscillator.start(ctx.currentTime);
                        oscillator.stop(ctx.currentTime + 0.4);
                        break;

                    case 'incorrect':
                        oscillator.type = 'sawtooth';
                        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
                        oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
                        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                        oscillator.start(ctx.currentTime);
                        oscillator.stop(ctx.currentTime + 0.3);
                        break;

                    case 'tick':
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
                        oscillator.start(ctx.currentTime);
                        oscillator.stop(ctx.currentTime + 0.05);
                        break;

                    case 'warning':
                        oscillator.type = 'square';
                        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
                        oscillator.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
                        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                        oscillator.start(ctx.currentTime);
                        oscillator.stop(ctx.currentTime + 0.2);
                        break;

                    case 'powerup':
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
                        oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
                        oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.25);
                        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                        oscillator.start(ctx.currentTime);
                        oscillator.stop(ctx.currentTime + 0.35);
                        break;

                    case 'streak':
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
                        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
                        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
                        oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.24);
                        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                        oscillator.start(ctx.currentTime);
                        oscillator.stop(ctx.currentTime + 0.5);
                        break;

                    case 'levelup':
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(392, ctx.currentTime);       // G4
                        oscillator.frequency.setValueAtTime(523, ctx.currentTime + 0.1); // C5
                        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.2); // E5
                        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3); // G5
                        oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.4); // C6
                        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
                        oscillator.start(ctx.currentTime);
                        oscillator.stop(ctx.currentTime + 0.6);
                        break;

                    case 'gamestart':
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(262, ctx.currentTime);
                        oscillator.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
                        oscillator.frequency.setValueAtTime(392, ctx.currentTime + 0.2);
                        oscillator.frequency.setValueAtTime(523, ctx.currentTime + 0.3);
                        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                        oscillator.start(ctx.currentTime);
                        oscillator.stop(ctx.currentTime + 0.5);
                        break;

                    case 'gameover':
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
                        oscillator.frequency.setValueAtTime(466, ctx.currentTime + 0.15);
                        oscillator.frequency.setValueAtTime(392, ctx.currentTime + 0.3);
                        oscillator.frequency.setValueAtTime(330, ctx.currentTime + 0.45);
                        oscillator.frequency.setValueAtTime(262, ctx.currentTime + 0.6);
                        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
                        oscillator.start(ctx.currentTime);
                        oscillator.stop(ctx.currentTime + 0.8);
                        break;

                    case 'countdown':
                        oscillator.type = 'square';
                        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
                        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                        oscillator.start(ctx.currentTime);
                        oscillator.stop(ctx.currentTime + 0.1);
                        break;
                }
            } catch (e) {
                console.warn('Sound playback error:', e);
            }
        }

        // Sound toggle button
        const soundToggleBtn = document.getElementById('soundToggleBtn');
        if (soundToggleBtn) {
            soundToggleBtn.addEventListener('click', () => {
                soundEnabled = !soundEnabled;
                soundToggleBtn.classList.toggle('active', soundEnabled);
                soundToggleBtn.innerHTML = soundEnabled
                    ? '<i data-lucide="volume-2"></i><span>Sound ON</span>'
                    : '<i data-lucide="volume-x"></i><span>Sound OFF</span>';
                if (window.lucide) lucide.createIcons();
                if (soundEnabled) playSound('tick');
            });
        }

        // ==================== CATEGORY SELECTION ====================
        let selectedTopics = ['all']; // Default: all topics
        let isSurpriseMode = false; // Track if surprise mode is active

        const categoryChips = document.querySelectorAll('.category-chip');
        categoryChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const topic = chip.dataset.topic;
                playSound('tick');
                
                if (topic === 'all') {
                    // Select all, deselect others
                    selectedTopics = ['all'];
                    isSurpriseMode = false;
                    categoryChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                } else if (topic === 'surprise') {
                    // Surprise mode: randomize topic selection
                    const availableTopics = ['First Mass', 'Cavite Mutiny', 'Retraction of Rizal', 'Cry of Rebellion'];
                    // Randomly select 1-3 topics
                    const numTopics = Math.floor(Math.random() * 3) + 1;
                    const shuffled = availableTopics.sort(() => 0.5 - Math.random());
                    selectedTopics = shuffled.slice(0, numTopics);
                    isSurpriseMode = true;
                    
                    // Update UI
                    categoryChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    
                    // Show a brief notification of selected topics
                    console.log('Surprise topics selected:', selectedTopics);
                } else {
                    // Remove 'all' and 'surprise' selection
                    const allChip = document.querySelector('.category-chip[data-topic="all"]');
                    const surpriseChip = document.querySelector('.category-chip[data-topic="surprise"]');
                    allChip?.classList.remove('active');
                    surpriseChip?.classList.remove('active');
                    selectedTopics = selectedTopics.filter(t => t !== 'all');
                    isSurpriseMode = false;
                    
                    // Toggle this topic
                    if (selectedTopics.includes(topic)) {
                        selectedTopics = selectedTopics.filter(t => t !== topic);
                        chip.classList.remove('active');
                    } else {
                        selectedTopics.push(topic);
                        chip.classList.add('active');
                    }
                    
                    // If nothing selected, revert to 'all'
                    if (selectedTopics.length === 0) {
                        selectedTopics = ['all'];
                        isSurpriseMode = false;
                        allChip?.classList.add('active');
                    }
                }
            });
        });

        // Function to update topic badges based on selected topics
        function updateTopicBadges() {
            const topicBadges = document.querySelectorAll('.topic-badge');
            topicBadges.forEach(badge => {
                const topic = badge.dataset.topic;
                if (selectedTopics.includes('all') || selectedTopics.includes(topic)) {
                    badge.classList.add('active');
                } else {
                    badge.classList.remove('active');
                }
            });
        }

        // Initial update of topic badges
        updateTopicBadges();

        // Update topic badges whenever category chips change
        // We need to call updateTopicBadges after each category chip click
        const originalCategoryChips = document.querySelectorAll('.category-chip');
        originalCategoryChips.forEach(chip => {
            const originalHandler = chip.onclick || (() => {});
            chip.addEventListener('click', () => {
                // Call the original logic (already handled above)
                setTimeout(updateTopicBadges, 10); // Small delay to ensure state is updated
            });
        });

        // ==================== POWER-UPS SYSTEM ====================
        let powerups = { fiftyFifty: false, skip: false, extraTime: false };
        const powerup5050Btn = document.getElementById('powerup5050');
        const powerupSkipBtn = document.getElementById('powerupSkip');
        const powerupTimeBtn = document.getElementById('powerupTime');

        // 50/50 Power-up: Remove 2 wrong answers
        if (powerup5050Btn) {
            powerup5050Btn.addEventListener('click', () => {
                if (powerups.fiftyFifty) return;
                
                const question = currentQuestions[currentQuestionIndex];
                if (!question) return;
                
                playSound('powerup');
                powerups.fiftyFifty = true;
                powerup5050Btn.classList.add('used');
                powerup5050Btn.disabled = true;

                // Get wrong answer indices
                const wrongIndices = [];
                question.options.forEach((_, index) => {
                    if (index !== question.correct) wrongIndices.push(index);
                });

                // Randomly pick 2 wrong answers to hide
                const shuffled = wrongIndices.sort(() => Math.random() - 0.5);
                const toHide = shuffled.slice(0, 2);

                const buttons = triviaAnswersEl.querySelectorAll('.trivia-answer-btn');
                toHide.forEach(idx => {
                    if (buttons[idx]) {
                        buttons[idx].classList.add('eliminated');
                        buttons[idx].disabled = true;
                        buttons[idx].textContent = '—';
                    }
                });

                // Flash effect
                showPowerupNotification('50/50', 'Two wrong answers eliminated!');
            });
        }

        // Skip Power-up: Skip current question (no points, no penalty)
        if (powerupSkipBtn) {
            powerupSkipBtn.addEventListener('click', () => {
                if (powerups.skip) return;
                
                playSound('powerup');
                powerups.skip = true;
                powerupSkipBtn.classList.add('used');
                powerupSkipBtn.disabled = true;

                clearInterval(timerInterval);
                if (animationFrameId) cancelAnimationFrame(animationFrameId);

                showPowerupNotification('⏭️ Skip', 'Question skipped!');

                setTimeout(() => {
                    currentQuestionIndex++;
                    loadQuestion();
                }, 800);
            });
        }

        // Extra Time Power-up: Add 15 seconds
        if (powerupTimeBtn) {
            powerupTimeBtn.addEventListener('click', () => {
                if (powerups.extraTime) return;
                
                playSound('powerup');
                powerups.extraTime = true;
                powerupTimeBtn.classList.add('used');
                powerupTimeBtn.disabled = true;

                // Add 15 seconds to the timer
                addExtraTime(15);

                showPowerupNotification('⏱️ +15s', '15 seconds added!');
            });
        }

        // Show power-up notification
        function showPowerupNotification(title, message) {
            const notification = document.createElement('div');
            notification.className = 'powerup-notification';
            notification.innerHTML = `
                <div class=\"powerup-notif-title\">${title}</div>
                <div class=\"powerup-notif-message\">${message}</div>
            `;
            
            document.querySelector('.trivia-game-screen').appendChild(notification);
            
            setTimeout(() => notification.classList.add('show'), 50);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 400);
            }, 1500);
        }

        // Extra time helper variables
        let timerExtraSeconds = 0;
        let timerStartTime = 0;
        let timerMaxTime = 30;

        function addExtraTime(seconds) {
            timerMaxTime += seconds;
            // The running timer's animateTimer and interval will use the updated timerMaxTime
        }

        // ==================== QUESTION BANK ====================
        const questionBank = [
            // EASY QUESTIONS
            {
                question: "Where did the First Mass in the Philippines take place according to most historians?",
                options: ["Butuan", "Limasawa", "Cebu", "Manila"],
                correct: 1,
                difficulty: "easy",
                topic: "First Mass",
                explanation: "According to Antonio Pigafetta's account, the first Mass was held in Limasawa on March 31, 1521."
            },
            {
                question: "When did the First Mass in the Philippines occur?",
                options: ["March 15, 1521", "March 31, 1521", "April 1, 1521", "April 15, 1521"],
                correct: 1,
                difficulty: "easy",
                topic: "First Mass",
                explanation: "The First Mass in the Philippines was celebrated on March 31, 1521, which was Easter Sunday."
            },
            {
                question: "What year did the Cavite Mutiny occur?",
                options: ["1868", "1871", "1872", "1896"],
                correct: 2,
                difficulty: "easy",
                topic: "Cavite Mutiny",
                explanation: "The Cavite Mutiny occurred on January 20, 1872, at Fort San Felipe in Cavite."
            },
            {
                question: "Which three priests were executed following the Cavite Mutiny?",
                options: ["Gomez, Burgos, Zamora", "Rizal, Bonifacio, Aguinaldo", "Mabini, Luna, Del Pilar", "Jacinto, Evangelista, Diwa"],
                correct: 0,
                difficulty: "easy",
                topic: "Cavite Mutiny",
                explanation: "Fathers Mariano Gomez, Jose Burgos, and Jacinto Zamora (GOMBURZA) were executed by garrote on February 17, 1872."
            },
            {
                question: "When was Jose Rizal executed?",
                options: ["December 28, 1896", "December 29, 1896", "December 30, 1896", "December 31, 1896"],
                correct: 2,
                difficulty: "easy",
                topic: "Retraction of Rizal",
                explanation: "Jose Rizal was executed by firing squad at Bagumbayan (now Luneta) on December 30, 1896."
            },
            {
                question: "What controversial document allegedly showed Rizal's return to Catholicism?",
                options: ["Mi Último Adiós", "Noli Me Tangere", "The Retraction Document", "El Filibusterismo"],
                correct: 2,
                difficulty: "easy",
                topic: "Retraction of Rizal",
                explanation: "The Retraction Document allegedly showed Rizal renouncing his writings and reaffirming his Catholic faith before his execution."
            },
            {
                question: "The Cry of Rebellion is also known as the 'Cry of' what?",
                options: ["Pugad Lawin", "Balintawak", "Caloocan", "Both A and B"],
                correct: 3,
                difficulty: "easy",
                topic: "Cry of Rebellion",
                explanation: "The Cry of Rebellion is known by both names due to conflicting historical accounts about the exact location."
            },
            {
                question: "In what year did the Cry of Rebellion take place?",
                options: ["1892", "1895", "1896", "1898"],
                correct: 2,
                difficulty: "easy",
                topic: "Cry of Rebellion",
                explanation: "The Cry of Rebellion occurred in August 1896, marking the start of the Philippine Revolution against Spain."
            },

            // MEDIUM QUESTIONS
            {
                question: "Who led the Spanish expedition that reached the Philippines in 1521?",
                options: ["Miguel Lopez de Legazpi", "Ferdinand Magellan", "Christopher Columbus", "Ruy Lopez de Villalobos"],
                correct: 1,
                difficulty: "medium",
                topic: "First Mass",
                explanation: "Ferdinand Magellan led the Spanish expedition that first reached the Philippines in 1521."
            },
            {
                question: "Who was the datu that welcomed Magellan in Limasawa?",
                options: ["Rajah Humabon", "Rajah Kolambu", "Datu Lapu-Lapu", "Rajah Sulayman"],
                correct: 1,
                difficulty: "medium",
                topic: "First Mass",
                explanation: "Rajah Kolambu, the ruler of Limasawa, welcomed Magellan and his crew with hospitality."
            },
            {
                question: "What was the name of the priest who celebrated the First Mass?",
                options: ["Father Pedro Valderrama", "Father Andres de Urdaneta", "Father Diego de Herrera", "Father Andres de San Martin"],
                correct: 0,
                difficulty: "medium",
                topic: "First Mass",
                explanation: "Father Pedro Valderrama, a Spanish priest who accompanied Magellan's expedition, celebrated the First Mass."
            },
            {
                question: "What was the main issue that sparked the Cavite Mutiny?",
                options: ["Religious freedom", "Abolition of privileges and tribute", "Land ownership", "Educational reform"],
                correct: 1,
                difficulty: "medium",
                topic: "Cavite Mutiny",
                explanation: "The mutiny was triggered by the abolition of privileges enjoyed by workers of the Cavite arsenal, including exemption from tribute and forced labor."
            },
            {
                question: "According to Spanish accounts, what was the nature of the Cavite Mutiny?",
                options: ["A spontaneous uprising", "Part of a larger conspiracy", "A peaceful protest", "A military drill"],
                correct: 1,
                difficulty: "medium",
                topic: "Cavite Mutiny",
                explanation: "Spanish authorities portrayed it as part of a larger conspiracy to overthrow Spanish rule, linking it to Filipino priests and liberals."
            },
            {
                question: "Who was the Spanish Governor-General during the Cavite Mutiny?",
                options: ["Rafael Izquierdo", "Carlos Maria de la Torre", "Miguel Lopez de Legazpi", "Camilo de Polavieja"],
                correct: 0,
                difficulty: "medium",
                topic: "Cavite Mutiny",
                explanation: "Governor-General Rafael Izquierdo's repressive policies contributed to the mutiny and its brutal aftermath."
            },
            {
                question: "Who claimed to have witnessed Rizal's retraction?",
                options: ["Emilio Aguinaldo", "Archbishop Bernardino Nozaleda", "Antonio Luna", "Apolinario Mabini"],
                correct: 1,
                difficulty: "medium",
                topic: "Retraction of Rizal",
                explanation: "Archbishop Bernardino Nozaleda and several Jesuit priests claimed to have witnessed Rizal's retraction."
            },
            {
                question: "What was the name of Rizal's last poem?",
                options: ["Noli Me Tangere", "El Filibusterismo", "Mi Último Adiós", "Ultimo Adios"],
                correct: 2,
                difficulty: "medium",
                topic: "Retraction of Rizal",
                explanation: "'Mi Último Adiós' (My Last Farewell) was Rizal's final poem, written hours before his execution."
            },
            {
                question: "In what month and year did the Cry of Rebellion take place?",
                options: ["June 1896", "July 1896", "August 1896", "September 1896"],
                correct: 2,
                difficulty: "medium",
                topic: "Cry of Rebellion",
                explanation: "The Cry of Rebellion occurred in late August 1896, marking the start of the Philippine Revolution."
            },
            {
                question: "What symbolic act was performed during the Cry of Rebellion?",
                options: ["Burning of Spanish flags", "Tearing of cedulas", "Signing of declaration", "Raising of Filipino flag"],
                correct: 1,
                difficulty: "medium",
                topic: "Cry of Rebellion",
                explanation: "Katipuneros tore their cedulas (residence certificates) as a symbolic rejection of Spanish authority."
            },
            {
                question: "Who led the Katipunan during the Cry of Rebellion?",
                options: ["Emilio Aguinaldo", "Andres Bonifacio", "Jose Rizal", "Apolinario Mabini"],
                correct: 1,
                difficulty: "medium",
                topic: "Cry of Rebellion",
                explanation: "Andres Bonifacio, founder of the Katipunan, led the revolutionary society during the Cry of Rebellion."
            },

            // HARD QUESTIONS
            {
                question: "Which historian argued that the first Mass occurred in Butuan instead of Limasawa?",
                options: ["Renato Constantino", "Teodoro Agoncillo", "Gregorio Zaide", "Sonia Zaide"],
                correct: 0,
                difficulty: "hard",
                topic: "First Mass",
                explanation: "Historian Renato Constantino argued for Butuan as the site, citing geographical and historical evidence."
            },
            {
                question: "What was the name of the chronicler who documented Magellan's voyage?",
                options: ["Miguel de Loarca", "Antonio Pigafetta", "Juan de Plasencia", "Pedro Chirino"],
                correct: 1,
                difficulty: "hard",
                topic: "First Mass",
                explanation: "Antonio Pigafetta, an Italian chronicler, documented Magellan's voyage in his detailed journal."
            },
            {
                question: "According to the accounts, how many Masses were celebrated during Magellan's stay?",
                options: ["One", "Two", "Three", "Four"],
                correct: 1,
                difficulty: "hard",
                topic: "First Mass",
                explanation: "According to Pigafetta, two Masses were celebrated - one on March 31 (Easter Sunday) and another later."
            },
            {
                question: "What was the religious significance of the date of the First Mass?",
                options: ["Christmas Day", "Easter Sunday", "Good Friday", "Pentecost"],
                correct: 1,
                difficulty: "hard",
                topic: "First Mass",
                explanation: "The First Mass was celebrated on Easter Sunday, March 31, 1521, which held special religious significance."
            },
            {
                question: "According to Filipino historian Pardo de Tavera, what was the real cause of the Cavite Mutiny?",
                options: ["Religious persecution", "Economic grievances", "Political conspiracy", "Racial discrimination"],
                correct: 1,
                difficulty: "hard",
                topic: "Cavite Mutiny",
                explanation: "T.H. Pardo de Tavera argued that the mutiny was primarily due to economic grievances, not a grand conspiracy."
            },
            {
                question: "Which Governor-General's policies were blamed for the conditions that led to the Cavite Mutiny?",
                options: ["Rafael Izquierdo", "Carlos Maria de la Torre", "Camilo de Polavieja", "Eulogio Despujol"],
                correct: 0,
                difficulty: "hard",
                topic: "Cavite Mutiny",
                explanation: "Governor-General Rafael Izquierdo's repressive measures and abolition of privileges triggered the mutiny."
            },
            {
                question: "What historical method of execution was used on the GOMBURZA priests?",
                options: ["Firing squad", "Hanging", "Garrote", "Guillotine"],
                correct: 2,
                difficulty: "hard",
                topic: "Cavite Mutiny",
                explanation: "GOMBURZA were executed by garrote, a method of strangulation used in Spanish colonial executions."
            },
            {
                question: "What year was the original retraction document allegedly discovered?",
                options: ["1912", "1935", "1955", "1961"],
                correct: 1,
                difficulty: "hard",
                topic: "Retraction of Rizal",
                explanation: "The original retraction document was allegedly discovered in 1935 by Father Manuel Garcia in the Catholic archives."
            },
            {
                question: "Which of these historians supported the authenticity of Rizal's retraction?",
                options: ["Teodoro Agoncillo", "Ricardo Pascual", "Renato Constantino", "Leon Ma. Guerrero"],
                correct: 1,
                difficulty: "hard",
                topic: "Retraction of Rizal",
                explanation: "Father Ricardo Pascual and other religious historians supported the authenticity of the retraction document."
            },
            {
                question: "What title did Rizal's last poem 'Mi Último Adiós' originally have?",
                options: ["Farewell to My Country", "My Last Farewell", "It was untitled", "Goodbye Philippines"],
                correct: 2,
                difficulty: "hard",
                topic: "Retraction of Rizal",
                explanation: "Rizal's last poem was originally untitled. The title 'Mi Último Adiós' was given by Mariano Ponce."
            },
            {
                question: "Who was Rizal's defense lawyer during his trial?",
                options: ["Marcelo H. del Pilar", "Luis Taviel de Andrade", "Felipe Buencamino", "Apolinario Mabini"],
                correct: 1,
                difficulty: "hard",
                topic: "Retraction of Rizal",
                explanation: "Lieutenant Luis Taviel de Andrade was assigned as Rizal's defense counsel during his military trial."
            },
            {
                question: "What was the estimated number of Katipuneros who participated in the Cry of Rebellion?",
                options: ["500-1,000", "1,000-1,500", "1,500-2,000", "2,000-3,000"],
                correct: 1,
                difficulty: "hard",
                topic: "Cry of Rebellion",
                explanation: "Historical accounts estimate around 1,000-1,500 Katipuneros gathered for the historic event."
            },
            {
                question: "What historical dispute surrounds the exact date of the Cry of Rebellion?",
                options: ["August 23 vs August 26", "August 24 vs August 25", "August 23 vs August 24", "August 25 vs August 26"],
                correct: 0,
                difficulty: "hard",
                topic: "Cry of Rebellion",
                explanation: "Historians debate whether the Cry occurred on August 23 or August 26, 1896, with conflicting testimonies."
            },
            {
                question: "Who was the primary witness that gave testimony about the Cry at Pugad Lawin?",
                options: ["Emilio Aguinaldo", "Pio Valenzuela", "Gregoria de Jesus", "Teodoro Plata"],
                correct: 1,
                difficulty: "hard",
                topic: "Cry of Rebellion",
                explanation: "Dr. Pio Valenzuela provided key testimony about the events at Pugad Lawin, though his accounts varied over time."
            },
            {
                question: "What was the original purpose of the gathering before the Cry of Rebellion?",
                options: ["Social gathering", "Religious ceremony", "Military training", "Planning revolutionary action"],
                correct: 3,
                difficulty: "hard",
                topic: "Cry of Rebellion",
                explanation: "The Katipuneros gathered to plan their revolutionary action against Spanish colonial rule."
            }
        ];

        // ==================== GAME STATE ====================
        let currentQuestions = [];
        let currentQuestionIndex = 0;
        let score = 0;
        let correctAnswers = 0;
        let streak = 0;
        let questionStartTime = 0;
        let currentDifficultyPhase = 'easy'; // Track current phase: easy, medium, hard
        let lastDifficultyPhase = 'easy';
        let bestStreak = 0; // Track best streak in game
        let totalTimeTaken = 0; // Track total time spent
        let gameStartTime = 0; // Track when game started

        // Game elements
        const triviaScoreEl = document.getElementById('triviaScore');
        const triviaCurrentQEl = document.getElementById('triviaCurrentQ');
        const triviaTotalQEl = document.getElementById('triviaTotalQ');
        const triviaStreakEl = document.getElementById('triviaStreak');
        const triviaTimerBarEl = document.getElementById('triviaTimerBar');
        const triviaTimerTextEl = document.getElementById('triviaTimerText');
        const triviaDifficultyBadgeEl = document.getElementById('triviaDifficultyBadge');
        const triviaQuestionEl = document.getElementById('triviaQuestion');
        const triviaAnswersEl = document.getElementById('triviaAnswers');
        const triviaFeedbackEl = document.getElementById('triviaFeedback');
        const currentPhaseLabelEl = document.getElementById('currentPhaseLabel');
        const phaseIndicatorEl = document.getElementById('phaseIndicator');
        const difficultyProgressFillEl = document.getElementById('difficultyProgressFill');

        // ==================== GAME FUNCTIONS ====================
        function startTriviaGame() {
            // Reset game state
            score = 0;
            correctAnswers = 0;
            streak = 0;
            bestStreak = 0;
            currentQuestionIndex = 0;
            currentDifficultyPhase = 'easy';
            lastDifficultyPhase = 'easy';
            totalTimeTaken = 0;
            gameStartTime = Date.now();
            timerExtraSeconds = 0;
            timerMaxTime = 30;

            // Reset power-ups
            powerups = { fiftyFifty: false, skip: false, extraTime: false };
            if (powerup5050Btn) { powerup5050Btn.classList.remove('used'); powerup5050Btn.disabled = false; }
            if (powerupSkipBtn) { powerupSkipBtn.classList.remove('used'); powerupSkipBtn.disabled = false; }
            if (powerupTimeBtn) { powerupTimeBtn.classList.remove('used'); powerupTimeBtn.disabled = false; }

            // Select random questions with progressive difficulty (filtered by topic)
            currentQuestions = selectQuestions();

            // Update UI
            updateGameUI();
            updateDifficultyProgress();

            // Play start sound
            playSound('gamestart');

            // Show game screen
            showScreen('game');

            // Load first question
            loadQuestion();
        }

        function selectQuestions() {
            const totalQuestions = 10;
            
            // Filter by selected topics
            let filteredBank = questionBank;
            if (!selectedTopics.includes('all')) {
                filteredBank = questionBank.filter(q => selectedTopics.includes(q.topic));
            }

            // If no questions after filtering, use all (fallback for edge cases)
            if (filteredBank.length === 0) {
                filteredBank = questionBank;
            }

            // If we have specific topics selected, prioritize them completely
            if (!selectedTopics.includes('all') && filteredBank.length > 0) {
                // Shuffle and take up to totalQuestions from filtered bank
                const shuffled = [...filteredBank].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, Math.min(totalQuestions, filteredBank.length));
            }

            const easy = filteredBank.filter(q => q.difficulty === 'easy');
            const medium = filteredBank.filter(q => q.difficulty === 'medium');
            const hard = filteredBank.filter(q => q.difficulty === 'hard');

            const selected = [];

            // Progressive difficulty: 4 easy, 4 medium, 2 hard (adjusted if filtered)
            const easyCount = Math.min(4, easy.length);
            const mediumCount = Math.min(4, medium.length);
            const hardCount = Math.min(2, hard.length);

            selected.push(...getRandomQuestions(easy, easyCount));
            selected.push(...getRandomQuestions(medium, mediumCount));
            selected.push(...getRandomQuestions(hard, hardCount));

            // Fill remaining with random from any difficulty in the filtered bank
            while (selected.length < totalQuestions && selected.length < filteredBank.length) {
                const remaining = filteredBank.filter(q => !selected.includes(q));
                if (remaining.length === 0) break;
                selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
            }

            // If still not enough questions, fill with questions from other topics
            while (selected.length < totalQuestions) {
                const remaining = questionBank.filter(q => !selected.includes(q));
                if (remaining.length === 0) break;
                selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
            }

            return selected;
        }

        function getRandomQuestions(array, count) {
            const shuffled = [...array].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, Math.min(count, array.length));
        }

        function loadQuestion() {
            if (currentQuestionIndex >= currentQuestions.length) {
                endGame();
                return;
            }

            const question = currentQuestions[currentQuestionIndex];

            // Check for difficulty changes and show notification
            const newDifficultyPhase = question.difficulty;
            if (newDifficultyPhase !== lastDifficultyPhase && currentQuestionIndex > 0) {
                showDifficultyLevelUp(newDifficultyPhase);
                lastDifficultyPhase = newDifficultyPhase;
            }
            currentDifficultyPhase = newDifficultyPhase;

            // Update difficulty progress
            updateDifficultyProgress();

            // Update question UI
            triviaQuestionEl.textContent = question.question;
            triviaDifficultyBadgeEl.textContent = question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1);
            triviaDifficultyBadgeEl.className = `trivia-difficulty-badge ${question.difficulty}`;

            // Clear previous answers and feedback
            triviaAnswersEl.innerHTML = '';
            triviaFeedbackEl.className = 'trivia-feedback';
            triviaFeedbackEl.style.display = 'none';

            // Create answer buttons
            question.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'trivia-answer-btn';
                button.textContent = option;
                button.onclick = () => selectAnswer(index);
                triviaAnswersEl.appendChild(button);
            });

            // Update progress
            triviaCurrentQEl.textContent = currentQuestionIndex + 1;
            triviaTotalQEl.textContent = currentQuestions.length;

            // Start timer
            questionStartTime = Date.now();
            startTimer();

            // Re-initialize Lucide icons
            if (window.lucide) {
                lucide.createIcons();
            }
        }

        let timerInterval;
        let animationFrameId;

        function startTimer() {
            timerMaxTime = 30 + timerExtraSeconds;
            timerExtraSeconds = 0; // Reset extra for this question
            let timeLeft = timerMaxTime;
            timerStartTime = Date.now();

            triviaTimerBarEl.style.width = '100%';
            triviaTimerBarEl.className = 'trivia-timer-bar';
            triviaTimerTextEl.textContent = `${timeLeft}s`;

            clearInterval(timerInterval);
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }

            // Smooth animation for timer bar
            function animateTimer() {
                const elapsed = (Date.now() - timerStartTime) / 1000;
                const remaining = Math.max(0, timerMaxTime - elapsed);
                const percentage = (remaining / timerMaxTime) * 100;
                
                triviaTimerBarEl.style.width = percentage + '%';
                
                if (remaining > 0) {
                    animationFrameId = requestAnimationFrame(animateTimer);
                }
            }
            animateTimer();

            // Update timer text and colors every second
            timerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
                timeLeft = Math.max(0, timerMaxTime - elapsed);
                triviaTimerTextEl.textContent = `${timeLeft}s`;

                // Change color and add pulse effect based on time left
                triviaTimerBarEl.classList.remove('warning', 'danger', 'pulse');
                if (timeLeft <= 5) {
                    triviaTimerBarEl.classList.add('danger', 'pulse');
                    playSound('countdown');
                } else if (timeLeft <= 10) {
                    triviaTimerBarEl.classList.add('warning');
                    if (timeLeft === 10) playSound('warning');
                }

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                    }
                    selectAnswer(-1); // Timeout - no answer selected
                }
            }, 1000);
        }

        function selectAnswer(selectedIndex) {
            clearInterval(timerInterval);
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }

            const question = currentQuestions[currentQuestionIndex];
            const isCorrect = selectedIndex === question.correct;
            const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
            const timeRemaining = Math.max(0, timerMaxTime - timeSpent);

            // Disable all buttons and power-ups during feedback
            const buttons = triviaAnswersEl.querySelectorAll('.trivia-answer-btn');
            buttons.forEach((btn, index) => {
                btn.disabled = true;
                if (index === question.correct) {
                    btn.classList.add('correct');
                } else if (index === selectedIndex && !isCorrect) {
                    btn.classList.add('incorrect');
                }
            });

            // Play sound
            playSound(isCorrect ? 'correct' : 'incorrect');

            // Show feedback
            triviaFeedbackEl.style.display = 'block';
            triviaFeedbackEl.classList.add('show');

            if (isCorrect) {
                correctAnswers++;
                streak++;
                
                // Track best streak
                if (streak > bestStreak) {
                    bestStreak = streak;
                }

                // Calculate points with detailed breakdown
                const basePoints = 100;
                const timeBonus = Math.floor(timeRemaining * 3); // 3 points per second remaining
                const streakBonus = streak > 1 ? (streak - 1) * 20 : 0;
                
                // Speed multiplier bonus
                let speedMultiplier = 1.0;
                let speedLabel = '';
                if (timeRemaining >= 25) {
                    speedMultiplier = 1.5;
                    speedLabel = '⚡ Lightning Fast!';
                } else if (timeRemaining >= 20) {
                    speedMultiplier = 1.3;
                    speedLabel = '🚀 Super Quick!';
                } else if (timeRemaining >= 15) {
                    speedMultiplier = 1.1;
                    speedLabel = '✨ Fast!';
                }

                const subtotal = basePoints + timeBonus + streakBonus;
                const points = Math.floor(subtotal * speedMultiplier);
                score += points;

                // Create point breakdown HTML
                let breakdownHTML = `
                    <div class="point-breakdown">
                        <div class="breakdown-item">Base Points: <strong>+${basePoints}</strong></div>
                `;
                
                if (timeBonus > 0) {
                    breakdownHTML += `<div class="breakdown-item">⏱️ Time Bonus: <strong>+${timeBonus}</strong> (${timeRemaining}s left)</div>`;
                }
                
                if (streakBonus > 0) {
                    breakdownHTML += `<div class="breakdown-item">🔥 Streak Bonus: <strong>+${streakBonus}</strong> (${streak}x combo)</div>`;
                }
                
                if (speedMultiplier > 1) {
                    breakdownHTML += `<div class="breakdown-item">${speedLabel} <strong>×${speedMultiplier}</strong></div>`;
                }
                
                breakdownHTML += `</div>`;

                triviaFeedbackEl.classList.add('correct');
                triviaFeedbackEl.innerHTML = `
                    <div class="trivia-feedback-title">
                        <span>✓</span> Correct! <span class="points-earned">+${points}</span> points
                    </div>
                    ${breakdownHTML}
                    <div class="trivia-feedback-text">${question.explanation}</div>
                    <button class="trivia-next-btn" onclick="moveToNextQuestion()">Next Question →</button>
                `;

                // Animate score counter
                animateScoreIncrease(score - points, score);

                // Show streak milestone notifications
                if (streak === 3 || streak === 5 || streak === 7 || streak === 10) {
                    showStreakNotification(streak);
                    playSound('streak');
                }
            } else {
                // Handle incorrect answer or timeout
                if (streak > 0) {
                    const lostStreak = streak;
                    streak = 0;
                    triviaFeedbackEl.classList.add('incorrect');
                    const correctAnswer = question.options[question.correct] || 'No answer selected - Time ran out!';
                    triviaFeedbackEl.innerHTML = `
                        <div class="trivia-feedback-title">
                            <span>✗</span> ${selectedIndex === -1 ? 'Time\'s Up!' : 'Incorrect'}
                        </div>
                        ${lostStreak > 1 ? `<div class="streak-lost">💔 Lost ${lostStreak}x streak</div>` : ''}
                        <div class="trivia-feedback-text">
                            ${selectedIndex !== -1 ? `The correct answer is: <strong>${correctAnswer}</strong><br>` : `The correct answer was: <strong>${correctAnswer}</strong><br>`}
                            ${question.explanation}
                        </div>
                        <button class="trivia-next-btn" onclick="moveToNextQuestion()">Next Question →</button>
                    `;
                } else {
                    streak = 0;
                    triviaFeedbackEl.classList.add('incorrect');
                    const correctAnswer = question.options[question.correct];
                    triviaFeedbackEl.innerHTML = `
                        <div class="trivia-feedback-title">
                            <span>✗</span> ${selectedIndex === -1 ? 'Time\'s Up!' : 'Incorrect'}
                        </div>
                        <div class="trivia-feedback-text">
                            ${selectedIndex !== -1 ? `The correct answer is: <strong>${correctAnswer}</strong><br>` : `The correct answer was: <strong>${correctAnswer}</strong><br>`}
                            ${question.explanation}
                        </div>
                        <button class="trivia-next-btn" onclick="moveToNextQuestion()">Next Question →</button>
                    `;
                }
            }

            // Update score display
            updateGameUI();
        }

        // Move to next question (called by Next button)
        window.moveToNextQuestion = function() {
            currentQuestionIndex++;
            loadQuestion();
        };

        // Animate score counter
        function animateScoreIncrease(fromScore, toScore) {
            const duration = 800; // ms
            const startTime = Date.now();
            const difference = toScore - fromScore;

            function update() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const currentScore = Math.floor(fromScore + (difference * progress));
                
                triviaScoreEl.textContent = currentScore;
                triviaScoreEl.classList.add('score-pulse');
                
                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    setTimeout(() => {
                        triviaScoreEl.classList.remove('score-pulse');
                    }, 500);
                }
            }
            
            update();
        }

        // Show streak notification
        function showStreakNotification(streakCount) {
            const notification = document.createElement('div');
            notification.className = 'streak-notification';
            notification.innerHTML = `
                <div class="streak-icon">🔥</div>
                <div class="streak-text">${streakCount}x STREAK!</div>
                <div class="streak-subtext">Keep it going!</div>
            `;
            
            document.querySelector('.trivia-game-screen').appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 500);
            }, 2500);
        }

        function updateGameUI() {
            triviaScoreEl.textContent = score;
            triviaStreakEl.textContent = streak;
        }

        function endGame() {
            // Calculate total time
            totalTimeTaken = Math.floor((Date.now() - gameStartTime) / 1000);

            // Play game over sound
            playSound('gameover');
            
            // Update final stats
            document.getElementById('triviaFinalScore').textContent = score;
            document.getElementById('triviaCorrectAnswers').textContent = `${correctAnswers}/${currentQuestions.length}`;
            const accuracy = Math.round((correctAnswers / currentQuestions.length) * 100);
            document.getElementById('triviaAccuracy').textContent = `${accuracy}%`;

            // Calculate performance grade
            const performanceGrade = calculateTriviaPerformanceGrade(score, accuracy);
            displayPerformanceResult(performanceGrade, accuracy);

            // Save score to database and show rank
            saveScoreAndShowRank(score, correctAnswers, currentQuestions.length, accuracy, totalTimeTaken, bestStreak, performanceGrade.rank);

            // Show end screen
            showScreen('end');

            // Re-initialize Lucide icons
            if (window.lucide) {
                lucide.createIcons();
            }
        }

        // Save score and display user's rank
        async function saveScoreAndShowRank(finalScore, correctAns, totalQs, accuracyVal, timeTaken, bestStrk, grade) {
            const rankDisplayEl = document.getElementById('triviaRankDisplay');
            
            // Show saving state
            const savingHTML = rankDisplayEl.innerHTML;
            rankDisplayEl.innerHTML = `
                <div class="rank-loading">
                    <i data-lucide="loader" class="spin"></i>
                    <span>Saving your score...</span>
                </div>
            `;
            if (window.lucide) lucide.createIcons();

            // Save score
            const savedScore = await saveScore(finalScore, correctAns, totalQs, accuracyVal, timeTaken, bestStrk, grade);

            if (savedScore) {
                // Get user's rank
                const rankInfo = await getUserRank(finalScore, 'all-time');
                
                if (rankInfo) {
                    // Show rank with animation
                    setTimeout(() => {
                        rankDisplayEl.innerHTML = savingHTML + `
                            <div class="rank-achievement">
                                <i data-lucide="trophy"></i>
                                <span class="rank-text">You placed <strong>#${rankInfo.rank}</strong> on the leaderboard!</span>
                            </div>
                        `;
                        if (window.lucide) lucide.createIcons();
                        
                        // Animate rank reveal
                        const rankAchievement = rankDisplayEl.querySelector('.rank-achievement');
                        if (rankAchievement) {
                            setTimeout(() => {
                                rankAchievement.style.animation = 'feedbackBounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                            }, 200);
                        }
                    }, 1000);
                } else {
                    // Couldn't get rank, but score was saved
                    setTimeout(() => {
                        rankDisplayEl.innerHTML = savingHTML + `
                            <div class="rank-achievement">
                                <i data-lucide="check-circle"></i>
                                <span class="rank-text">Score saved successfully!</span>
                            </div>
                        `;
                        if (window.lucide) lucide.createIcons();
                    }, 1000);
                }
            } else {
                // Save failed
                setTimeout(() => {
                    rankDisplayEl.innerHTML = savingHTML + `
                        <div class="rank-achievement error">
                            <i data-lucide="alert-circle"></i>
                            <span class="rank-text">Could not save score. Please try again.</span>
                        </div>
                    `;
                    if (window.lucide) lucide.createIcons();
                }, 1000);
            }
        }

        // Calculate performance grade based on score and accuracy
        function calculateTriviaPerformanceGrade(finalScore, accuracyPercent) {
            // Max possible score estimation: 10 questions * ~250 points average = ~2500
            const scorePercent = (finalScore / 2500) * 100;
            
            // Combined metric: 60% score, 40% accuracy
            const performanceScore = (scorePercent * 0.6) + (accuracyPercent * 0.4);
            
            if (performanceScore >= 90) return { rank: 'S', title: 'Outstanding!', color: '#FFD700', emoji: '🏆' };
            if (performanceScore >= 80) return { rank: 'A', title: 'Excellent!', color: '#4CAF50', emoji: '⭐' };
            if (performanceScore >= 70) return { rank: 'B', title: 'Great Job!', color: '#2196F3', emoji: '👍' };
            if (performanceScore >= 60) return { rank: 'C', title: 'Good Effort!', color: '#FF9800', emoji: '👌' };
            return { rank: 'D', title: 'Keep Trying!', color: '#666666', emoji: '💪' }; // Changed to darker gray #666666 for visibility
        }

        // Display performance result with animations
        function displayPerformanceResult(grade, accuracy) {
            console.log('Grade object in displayPerformanceResult:', grade);
            console.log('Grade title:', grade.title);
            console.log('Grade rank:', grade.rank);
            console.log('Grade color:', grade.color);
            
            const rankDisplayEl = document.getElementById('triviaRankDisplay');
            
            // Format time
            const minutes = Math.floor(totalTimeTaken / 60);
            const seconds = totalTimeTaken % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Get performance message
            let message = '';
            if (grade.rank === 'S') {
                message = 'Perfect execution! You\'re a Philippine history master!';
            } else if (grade.rank === 'A') {
                message = 'Impressive knowledge! Keep up the great work!';
            } else if (grade.rank === 'B') {
                message = 'Solid performance! You\'re on the right track!';
            } else if (grade.rank === 'C') {
                message = 'Good start! Review the topics to improve further!';
            } else {
                message = 'Don\'t give up! Practice makes perfect!';
            }
            
            rankDisplayEl.innerHTML = `
                <div class="performance-grade-display">
                    <div class="grade-rank" style="color: ${grade.color};">
                        <span class="grade-emoji">${grade.emoji}</span>
                        <span class="grade-letter">${grade.rank}</span>
                    </div>
                    <div class="grade-title" style="color: ${grade.color};">${grade.title || 'N/A'}</div>
                    <div class="grade-message">${message}</div>
                </div>
                <div class="performance-stats-grid">
                    <div class="perf-stat-item">
                        <div class="perf-stat-label">Best Streak</div>
                        <div class="perf-stat-value">🔥 ${bestStreak}x</div>
                    </div>
                    <div class="perf-stat-item">
                        <div class="perf-stat-label">Time Taken</div>
                        <div class="perf-stat-value">⏱️ ${timeString}</div>
                    </div>
                    <div class="perf-stat-item">
                        <div class="perf-stat-label">Avg per Question</div>
                        <div class="perf-stat-value">⚡ ${Math.floor(totalTimeTaken / currentQuestions.length)}s</div>
                    </div>
                </div>
            `;
            
            // Animate grade reveal
            setTimeout(() => {
                const gradeRank = rankDisplayEl.querySelector('.grade-rank');
                if (gradeRank) {
                    gradeRank.style.animation = 'gradeReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
                }
            }, 300);
        }

        // Update difficulty progress bar and labels
        function updateDifficultyProgress() {
            const totalQuestions = currentQuestions.length;
            const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
            
            // Check if difficulty changed for animation
            const previousClass = difficultyProgressFillEl.className;
            const newClass = `difficulty-progress-fill ${currentDifficultyPhase}`;
            
            // Update progress bar
            difficultyProgressFillEl.style.width = progress + '%';
            
            // Update progress bar color based on current phase
            difficultyProgressFillEl.className = newClass;
            
            // Add phase transition animation if difficulty changed
            if (previousClass !== newClass && currentQuestionIndex > 0) {
                difficultyProgressFillEl.classList.add('phase-transition');
                setTimeout(() => {
                    difficultyProgressFillEl.classList.remove('phase-transition');
                }, 800);
            }
            
            // Update phase label
            const phaseLabels = {
                'easy': '🌟 Warm Up',
                'medium': '🔥 Challenge',
                'hard': '⚡ Expert'
            };
            
            currentPhaseLabelEl.textContent = phaseLabels[currentDifficultyPhase] || 'Warm Up';
            currentPhaseLabelEl.className = `current-phase ${currentDifficultyPhase}`;
            
            // Update phase indicator
            const phaseNumber = currentDifficultyPhase === 'easy' ? 1 : currentDifficultyPhase === 'medium' ? 2 : 3;
            phaseIndicatorEl.textContent = `Phase ${phaseNumber} of 3`;
            
            // Mark milestones as reached
            const milestones = document.querySelectorAll('.milestone-marker');
            milestones.forEach((milestone, index) => {
                const milestoneThreshold = index === 0 ? 40 : 80;
                if (progress >= milestoneThreshold) {
                    milestone.classList.add('reached');
                }
            });
        }

        // Show difficulty level up notification
        function showDifficultyLevelUp(newDifficulty) {
            playSound('levelup');
            const notification = document.createElement('div');
            notification.className = `difficulty-levelup ${newDifficulty}`;
            
            const icons = {
                'medium': '🔥',
                'hard': '⚡'
            };
            
            const titles = {
                'medium': 'LEVEL UP!',
                'hard': 'EXPERT MODE!'
            };
            
            const subtitles = {
                'medium': 'Questions are getting tougher!',
                'hard': 'Maximum difficulty unlocked!'
            };
            
            notification.innerHTML = `
                <div class="levelup-icon">${icons[newDifficulty]}</div>
                <div class="levelup-title ${newDifficulty}">${titles[newDifficulty]}</div>
                <div class="levelup-subtitle">${subtitles[newDifficulty]}</div>
            `;
            
            document.querySelector('.trivia-game-screen').appendChild(notification);
            
            // Trigger animation
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            // Remove after display
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 600);
            }, 2500);
        }

        // ==================== LEADERBOARD FUNCTIONS ====================

        // Save score to Supabase database
        async function saveScore(score, correctAnswers, totalQuestions, accuracy, timeTaken, bestStreak, performanceGrade) {
            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                
                if (!session || !session.user) {
                    console.error('User not authenticated, cannot save score');
                    return null;
                }

                const userId = session.user.id;

                // Insert score into trivia_scores table
                const { data, error } = await window.supabaseClient
                    .from('trivia_scores')
                    .insert([{
                        user_id: userId,
                        score: score,
                        correct_answers: correctAnswers,
                        total_questions: totalQuestions,
                        accuracy: accuracy,
                        time_taken: timeTaken,
                        best_streak: bestStreak,
                        performance_grade: performanceGrade
                    }])
                    .select();

                if (error) {
                    console.error('Error saving score:', error);
                    return null;
                }

                console.log('Score saved successfully:', data);
                return data[0];
            } catch (error) {
                console.error('Exception saving score:', error);
                return null;
            }
        }

        // Load TRIVIA leaderboard with optional time filter
        async function loadTriviaLeaderboard(filter = 'all-time') {
            // Fetch data using shared function
            const result = await fetchLeaderboardData('trivia', filter);
            
            if (!result.success) {
                console.error('Error loading trivia leaderboard:', result.error);
                return [];
            }
            
            return result.data;
        }

        // Fallback method if view doesn't exist
        async function loadLeaderboardManual(filter = 'all-time') {
            try {
                console.log('Using manual leaderboard fetch...');
                
                let query = window.supabaseClient
                    .from('trivia_scores')
                    .select(`
                        id,
                        user_id,
                        score,
                        correct_answers,
                        total_questions,
                        accuracy,
                        time_taken,
                        best_streak,
                        performance_grade,
                        created_at
                    `)
                    .order('score', { ascending: false })
                    .order('created_at', { ascending: true }); // Secondary sort by time (earlier is better for ties)

                // Apply time filter
                const now = new Date();
                if (filter === 'today') {
                    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
                    query = query.gte('created_at', startOfDay.toISOString());
                } else if (filter === 'this-week') {
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay()); // Go back to Sunday
                    startOfWeek.setHours(0, 0, 0, 0);
                    query = query.gte('created_at', startOfWeek.toISOString());
                }

                // Limit to top 500 scores (we'll filter to best per user after)
                query = query.limit(500);

                const { data: scores, error } = await query;

                if (error) {
                    console.error('Error loading leaderboard:', error);
                    return [];
                }

                console.log('Raw scores from trivia_scores table:', scores);

                if (!scores || scores.length === 0) {
                    console.log('No scores found in trivia_scores table');
                    return [];
                }

                // Get only best score per user
                const bestScoresByUser = {};
                scores.forEach(score => {
                    const existing = bestScoresByUser[score.user_id];
                    if (!existing || score.score > existing.score || 
                        (score.score === existing.score && new Date(score.created_at) < new Date(existing.created_at))) {
                        bestScoresByUser[score.user_id] = score;
                    }
                });

                const uniqueScores = Object.values(bestScoresByUser)
                    .sort((a, b) => {
                        if (b.score !== a.score) return b.score - a.score;
                        return new Date(a.created_at) - new Date(b.created_at);
                    })
                    .slice(0, 100);

                console.log('Best scores per user:', uniqueScores);

                // Get unique user IDs to fetch their profile data
                const userIds = uniqueScores.map(s => s.user_id);
                
                // Fetch user profiles from user_profiles table (only if we have scores)
                let profiles = null;
                let profileError = null;
                
                if (userIds.length > 0) {
                    const result = await window.supabaseClient
                        .from('user_profiles')
                        .select('id, full_name, avatar_url')
                        .in('id', userIds);
                    profiles = result.data;
                    profileError = result.error;
                }

                if (profileError) {
                    console.warn('Could not load user profiles:', profileError);
                }

                console.log('User profiles:', profiles);

                // Get current session to get user metadata
                const { data: { session } } = await window.supabaseClient.auth.getSession();

                // Create a map of user profiles for quick lookup
                const profileMap = {};
                if (profiles) {
                    profiles.forEach(profile => {
                        profileMap[profile.id] = profile;
                    });
                }

                // Merge profile data with scores
                const leaderboardData = uniqueScores.map(score => {
                    const profile = profileMap[score.user_id] || {};
                    
                    // Use same logic as profile display:
                    // 1. full_name from users table
                    // 2. user_metadata.full_name (only for current user)
                    // 3. email username (only for current user)
                    // 4. 'User'
                    let userName = profile.full_name;
                    
                    if (!userName && score.user_id === session?.user?.id) {
                        // For current user, try metadata and email
                        userName = session.user.user_metadata?.full_name || 
                                  session.user.email?.split('@')[0] || 
                                  'User';
                    } else if (!userName) {
                        // For other users without profile, use generic name
                        userName = 'User';
                    }
                    
                    return {
                        ...score,
                        user_name: userName,
                        avatar_url: profile.avatar_url || null
                    };
                });

                console.log('Final leaderboard data:', leaderboardData);
                return leaderboardData;
            } catch (error) {
                console.error('Exception loading leaderboard:', error);
                return [];
            }
        }

        // Display leaderboard entries in the UI
        async function displayLeaderboard(filter = 'all-time') {
            const leaderboardList = document.getElementById('triviaLeaderboardList');
            leaderboardList.innerHTML = `
                <div class="leaderboard-loading">
                    <i data-lucide="loader" class="spin"></i>
                    <p>Loading leaderboard...</p>
                </div>
            `;

            // Re-initialize Lucide icons
            if (window.lucide) {
                lucide.createIcons();
            }

            const leaderboardData = await loadTriviaLeaderboard(filter);

            // Check if leaderboardData is valid
            if (!leaderboardData || !Array.isArray(leaderboardData) || leaderboardData.length === 0) {
                leaderboardList.innerHTML = `
                    <div class="leaderboard-empty">
                        <i data-lucide="inbox"></i>
                        <p>No scores yet. Be the first to play!</p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
                return;
            }

            // Get current user ID
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            const currentUserId = session?.user?.id;

            // Generate leaderboard HTML using shared renderer
            let leaderboardHTML = '';
            leaderboardData.forEach((entry, index) => {
                leaderboardHTML += renderLeaderboardEntry(entry, index, currentUserId);
            });

            leaderboardList.innerHTML = leaderboardHTML;

            // Re-initialize Lucide icons
            if (window.lucide) {
                lucide.createIcons();
            }

            // Animate entries
            setTimeout(() => {
                const entries = leaderboardList.querySelectorAll('.leaderboard-entry');
                entries.forEach((entry, index) => {
                    setTimeout(() => {
                        entry.style.animation = 'statCardIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
                    }, index * 50);
                });
            }, 100);
        }

        // Get user's rank on the leaderboard
        async function getUserRank(score, filter = 'all-time') {
            try {
                console.log('Getting user rank for score:', score, 'filter:', filter);
                console.log('About to call loadTriviaLeaderboard...');
                
                const leaderboardData = await loadTriviaLeaderboard(filter);
                
                console.log('Leaderboard data in getUserRank:', leaderboardData);
                console.log('Type:', typeof leaderboardData);
                console.log('Is Array:', Array.isArray(leaderboardData));
                
                // Check if leaderboardData is valid
                if (!leaderboardData || !Array.isArray(leaderboardData) || leaderboardData.length === 0) {
                    console.warn('No leaderboard data available');
                    return null;
                }
                
                // Get current user ID
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                const currentUserId = session?.user?.id;

                if (!currentUserId) {
                    console.warn('No current user ID');
                    return null;
                }

                console.log('Looking for user:', currentUserId, 'with score:', score);

                // Find user's rank
                const userEntry = leaderboardData.find(entry => entry.user_id === currentUserId && entry.score === score);
                console.log('User entry found:', userEntry);
                
                if (userEntry) {
                    const rank = leaderboardData.indexOf(userEntry) + 1;
                    console.log('User rank:', rank, 'out of', leaderboardData.length);
                    return { rank, total: leaderboardData.length };
                }

                console.warn('User entry not found in leaderboard');
                return null;
            } catch (error) {
                console.error('Error getting user rank:', error);
                return null;
            }
        }

        // ================================================
        // TIMELINE QUEST GAME
        // ================================================

        // Timeline Quest Modal Elements
        const timelineQuestCard = document.getElementById('timelineQuestCard');
        const timelineModal = document.getElementById('timelineModal');
        const timelineCloseBtn = document.getElementById('timelineCloseBtn');
        const timelineStartBtn = document.getElementById('timelineStartBtn');
        const timelineSoundToggleBtn = document.getElementById('timelineSoundToggleBtn');
        const timelinePlayAgainBtn = document.getElementById('timelinePlayAgainBtn');
        const timelineViewLeaderboardBtn = document.getElementById('timelineViewLeaderboardBtn');
        const timelineBackToEndBtn = document.getElementById('timelineBackToEndBtn');

        // Timeline Quest Screens
        const timelineStartScreen = document.getElementById('timelineStartScreen');
        const timelineGameScreen = document.getElementById('timelineGameScreen');
        const timelineEndScreen = document.getElementById('timelineEndScreen');
        const timelineLeaderboardScreen = document.getElementById('timelineLeaderboardScreen');

        // Timeline Quest Game State
        let timelineSoundEnabled = true;
        let timelineGameState = {
            score: 0,
            currentRound: 1,
            totalRounds: 5,
            perfectRounds: 0,
            totalCorrect: 0,
            totalPlaced: 0,
            startTime: null,
            roundStartTime: null,
            selectedEra: 'mixed',
            usedFacts: [],
            firstPerfectShown: false,
            speedDemonShown: false,
            perfectStreakShown: false
        };

        // Open Timeline Quest Modal
        if (timelineQuestCard) {
            timelineQuestCard.addEventListener('click', () => {
                timelineModal.classList.add('active');
                showTimelineScreen('start');
                if (window.lucide) {
                    lucide.createIcons();
                }
            });
        }

        // Close Timeline Quest Modal
        if (timelineCloseBtn) {
            timelineCloseBtn.addEventListener('click', () => {
                timelineModal.classList.remove('active');
                stopTimelineTimer();
            });
        }

        // Close on outside click
        timelineModal?.addEventListener('click', (e) => {
            if (e.target === timelineModal) {
                timelineModal.classList.remove('active');
                stopTimelineTimer();
            }
        });

        // Sound Toggle
        if (timelineSoundToggleBtn) {
            timelineSoundToggleBtn.addEventListener('click', () => {
                timelineSoundEnabled = !timelineSoundEnabled;
                timelineSoundToggleBtn.classList.toggle('active');
                const icon = timelineSoundToggleBtn.querySelector('svg');
                const text = timelineSoundToggleBtn.querySelector('span');
                
                if (timelineSoundEnabled) {
                    icon.setAttribute('data-lucide', 'volume-2');
                    text.textContent = 'Sound ON';
                } else {
                    icon.setAttribute('data-lucide', 'volume-x');
                    text.textContent = 'Sound OFF';
                }
                
                if (window.lucide) {
                    lucide.createIcons();
                }
            });
        }

        // Era Selection
        const eraChips = document.querySelectorAll('.era-chip');
        eraChips.forEach(chip => {
            chip.addEventListener('click', () => {
                eraChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                timelineGameState.selectedEra = chip.dataset.era;
            });
        });

        // Start Game
        if (timelineStartBtn) {
            timelineStartBtn.addEventListener('click', () => {
                startTimelineGame();
            });
        }

        // Play Again
        if (timelinePlayAgainBtn) {
            timelinePlayAgainBtn.addEventListener('click', () => {
                showTimelineScreen('start');
                resetTimelineGame();
            });
        }

        // View Leaderboard
        if (timelineViewLeaderboardBtn) {
            timelineViewLeaderboardBtn.addEventListener('click', () => {
                showTimelineScreen('leaderboard');
                loadTimelineLeaderboard('all-time');
            });
        }

        // Back to End Screen
        if (timelineBackToEndBtn) {
            timelineBackToEndBtn.addEventListener('click', () => {
                showTimelineScreen('end');
            });
        }
        
        // Leaderboard Filter Buttons
        document.querySelectorAll('.timeline-leaderboard-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.timeline-leaderboard-filters .filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const filter = this.dataset.filter;
                loadTimelineLeaderboard(filter);
            });
        });

        // Show Timeline Screen
        function showTimelineScreen(screenName) {
            const screens = {
                'start': timelineStartScreen,
                'game': timelineGameScreen,
                'end': timelineEndScreen,
                'leaderboard': timelineLeaderboardScreen
            };

            Object.values(screens).forEach(screen => {
                if (screen) screen.classList.remove('active');
            });

            if (screens[screenName]) {
                screens[screenName].classList.add('active');
            }

            if (window.lucide) {
                lucide.createIcons();
            }
        }

        // Start Timeline Game
        function startTimelineGame() {
            resetTimelineGame();
            timelineGameState.startTime = Date.now();
            showTimelineScreen('game');
            
            // Start timer
            startTimelineTimer();
            
            // Load first round
            loadTimelineRound(1);
        }

        // Load Timeline Round
        function loadTimelineRound(roundNumber) {
            const roundData = selectEventsForRound(roundNumber, timelineGameState.selectedEra);
            
            // Store current round data
            timelineGameState.currentRoundData = roundData;
            timelineGameState.currentRound = roundNumber;
            timelineGameState.userOrder = [];
            timelineGameState.roundStartTime = Date.now(); // Track round start time for time bonus

            // Update UI
            updateTimelineUI(roundData);
            createDropZones(roundData.events.length);
            renderEventCards(roundData.events);

            // Update round progress
            updateRoundProgress(roundNumber, roundData);

            if (window.lucide) {
                lucide.createIcons();
            }
        }

        // Update Timeline UI
        function updateTimelineUI(roundData) {
            document.getElementById('timelineScore').textContent = timelineGameState.score;
            document.getElementById('timelineCurrentRound').textContent = timelineGameState.currentRound;
            
            // Update timer display (will be updated by timer function)
            const elapsed = Date.now() - timelineGameState.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('timelineTimer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Update Round Progress
        function updateRoundProgress(roundNumber, roundData) {
            const phaseLabel = document.getElementById('roundPhaseLabel');
            const difficultyLabel = document.getElementById('roundDifficultyLabel');
            const progressDots = document.getElementById('roundProgressDots');

            // Update labels
            phaseLabel.textContent = roundData.config.phase;
            difficultyLabel.textContent = difficultyLevels[roundData.difficulty].description;

            // Update progress dots
            const dots = progressDots.querySelectorAll('.progress-dot');
            dots.forEach((dot, index) => {
                dot.classList.remove('active', 'completed');
                if (index < roundNumber - 1) {
                    dot.classList.add('completed');
                } else if (index === roundNumber - 1) {
                    dot.classList.add('active');
                }
            });
        }

        // Create Drop Zones
        function createDropZones(count) {
            const dropZonesContainer = document.getElementById('timelineDropZones');
            dropZonesContainer.innerHTML = '';

            for (let i = 0; i < count; i++) {
                const dropZone = document.createElement('div');
                dropZone.className = 'timeline-drop-zone';
                dropZone.dataset.position = i;
                dropZone.addEventListener('dragover', handleDragOver);
                dropZone.addEventListener('drop', handleDrop);
                dropZone.addEventListener('dragleave', handleDragLeave);
                
                // Add position indicators
                const positionLabel = document.createElement('div');
                positionLabel.className = 'drop-zone-label';
                positionLabel.textContent = i + 1;
                positionLabel.style.cssText = `
                    position: absolute;
                    top: -8px;
                    left: -8px;
                    width: 24px;
                    height: 24px;
                    background: #7A5B47;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 700;
                    z-index: 1;
                `;
                dropZone.appendChild(positionLabel);
                
                dropZonesContainer.appendChild(dropZone);
            }
        }

        // Render Event Cards
        function renderEventCards(events) {
            const cardsArea = document.getElementById('timelineCardsArea');
            cardsArea.innerHTML = '';

            // Shuffle events for display
            const shuffled = [...events].sort(() => Math.random() - 0.5);

            shuffled.forEach(event => {
                const card = document.createElement('div');
                card.className = 'timeline-event-card';
                card.draggable = true;
                card.dataset.eventId = event.id;

                card.innerHTML = `
                    <div class="event-card-title">${event.title}</div>
                    <div class="event-card-era">${getEraDisplayName(event.era)}</div>
                    <div class="event-card-date" style="display: none;">${event.year}</div>
                `;

                // Mouse drag events
                card.addEventListener('dragstart', handleDragStart);
                card.addEventListener('dragend', handleDragEnd);
                
                // Touch events for mobile
                card.addEventListener('touchstart', handleTouchStart, { passive: false });
                card.addEventListener('touchmove', handleTouchMove, { passive: false });
                card.addEventListener('touchend', handleTouchEnd, { passive: false });
                
                // Double-click/tap to remove from timeline
                card.addEventListener('dblclick', handleCardDoubleClick);
                
                cardsArea.appendChild(card);
            });

            // Enable submit button check
            checkSubmitButton();
        }
        
        // Double-click to return card to cards area
        function handleCardDoubleClick(e) {
            const card = e.currentTarget;
            const parentZone = card.closest('.timeline-drop-zone');
            
            if (parentZone) {
                // Return card to cards area
                const cardsArea = document.getElementById('timelineCardsArea');
                cardsArea.appendChild(card);
                card.classList.remove('placed');
                parentZone.classList.remove('filled');
                
                // Animate return
                card.style.animation = 'cardSnap 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                setTimeout(() => {
                    card.style.animation = '';
                }, 300);
                
                // Update order and check submit
                updateUserOrder();
                checkSubmitButton();
                playTimelineSound('place');
            }
        }

        // Timer Update
        let timelineTimerInterval = null;

        function startTimelineTimer() {
            if (timelineTimerInterval) {
                clearInterval(timelineTimerInterval);
            }

            timelineTimerInterval = setInterval(() => {
                const elapsed = Date.now() - timelineGameState.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                document.getElementById('timelineTimer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        }

        function stopTimelineTimer() {
            if (timelineTimerInterval) {
                clearInterval(timelineTimerInterval);
                timelineTimerInterval = null;
            }
        }

        // Check Submit Button
        function checkSubmitButton() {
            const dropZones = document.querySelectorAll('.timeline-drop-zone');
            const allFilled = Array.from(dropZones).every(zone => zone.classList.contains('filled'));
            const submitBtn = document.getElementById('timelineSubmitBtn');
            
            if (submitBtn) {
                submitBtn.disabled = !allFilled;
            }
        }

        // ==================== PHASE 3: DRAG & DROP MECHANICS ====================
        
        let draggedElement = null;
        let draggedFromZone = null;
        let touchStartX = 0;
        let touchStartY = 0;
        let currentTouchCard = null;

        // Mouse Drag Start
        function handleDragStart(e) {
            draggedElement = e.target;
            draggedElement.classList.add('dragging');
            
            // Store the source zone if dragging from a drop zone
            const parentZone = draggedElement.closest('.timeline-drop-zone');
            if (parentZone) {
                draggedFromZone = parentZone;
            }
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedElement.dataset.eventId);
            
            // Create a drag image offset slightly
            if (e.dataTransfer.setDragImage) {
                const dragImage = draggedElement.cloneNode(true);
                dragImage.style.opacity = '0.8';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2);
                setTimeout(() => document.body.removeChild(dragImage), 0);
            }
            
            // Add visual feedback to all drop zones
            document.querySelectorAll('.timeline-drop-zone').forEach(zone => {
                if (!zone.classList.contains('filled') || zone === draggedFromZone) {
                    zone.classList.add('drop-available');
                }
            });
        }

        // Mouse Drag End
        function handleDragEnd(e) {
            e.target.classList.remove('dragging');
            
            // Remove visual feedback from all drop zones
            document.querySelectorAll('.timeline-drop-zone').forEach(zone => {
                zone.classList.remove('drop-available', 'drag-over');
            });
            
            draggedElement = null;
            draggedFromZone = null;
        }

        // Mouse Drag Over
        function handleDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            
            e.dataTransfer.dropEffect = 'move';
            
            const dropZone = e.currentTarget;
            
            // Only highlight if zone is empty or is the source zone
            if (!dropZone.classList.contains('filled') || dropZone === draggedFromZone) {
                dropZone.classList.add('drag-over');
            }
            
            return false;
        }

        // Mouse Drag Leave
        function handleDragLeave(e) {
            e.currentTarget.classList.remove('drag-over');
        }

        // Mouse Drop
        function handleDrop(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            e.preventDefault();

            const dropZone = e.currentTarget;
            dropZone.classList.remove('drag-over', 'drop-available');

            if (!draggedElement) return false;

            // Check if zone is already filled by another card
            const existingCard = dropZone.querySelector('.timeline-event-card');
            if (existingCard && existingCard !== draggedElement) {
                // Swap logic: move existing card back to cards area or to source zone
                if (draggedFromZone) {
                    // Swap cards between zones
                    draggedFromZone.appendChild(existingCard);
                    existingCard.classList.add('placed');
                } else {
                    // Return existing card to cards area
                    const cardsArea = document.getElementById('timelineCardsArea');
                    cardsArea.appendChild(existingCard);
                    existingCard.classList.remove('placed');
                }
            }

            // Place the dragged card in the drop zone
            dropZone.appendChild(draggedElement);
            draggedElement.classList.add('placed');
            draggedElement.classList.remove('dragging');
            
            // Update zone status
            dropZone.classList.add('filled');
            
            // If card came from another zone, clear that zone
            if (draggedFromZone && draggedFromZone !== dropZone) {
                draggedFromZone.classList.remove('filled');
            }
            
            // Add snap animation
            animateCardPlacement(draggedElement);
            
            // Update user order tracking
            updateUserOrder();
            
            // Check if submit button should be enabled
            checkSubmitButton();
            
            // Play sound effect
            playTimelineSound('place');
            
            draggedElement = null;
            draggedFromZone = null;

            return false;
        }

        // ==================== TOUCH SUPPORT FOR MOBILE ====================
        
        function handleTouchStart(e) {
            const card = e.currentTarget;
            
            // Prevent multiple touches
            if (currentTouchCard) return;
            
            currentTouchCard = card;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            
            // Store source zone
            const parentZone = card.closest('.timeline-drop-zone');
            if (parentZone) {
                draggedFromZone = parentZone;
            }
            
            // Add dragging class
            card.classList.add('dragging', 'touch-dragging');
            
            // Highlight available drop zones
            document.querySelectorAll('.timeline-drop-zone').forEach(zone => {
                if (!zone.classList.contains('filled') || zone === draggedFromZone) {
                    zone.classList.add('drop-available');
                }
            });
            
            // Create a floating clone for visual feedback
            createTouchDragClone(card, e.touches[0].clientX, e.touches[0].clientY);
        }

        function handleTouchMove(e) {
            if (!currentTouchCard) return;
            
            e.preventDefault(); // Prevent scrolling while dragging
            
            const touch = e.touches[0];
            const touchX = touch.clientX;
            const touchY = touch.clientY;
            
            // Move the visual clone
            moveTouchDragClone(touchX, touchY);
            
            // Check if over a drop zone
            const elementBelow = document.elementFromPoint(touchX, touchY);
            const dropZone = elementBelow?.closest('.timeline-drop-zone');
            
            // Highlight drop zone
            document.querySelectorAll('.timeline-drop-zone').forEach(zone => {
                zone.classList.remove('drag-over');
            });
            
            if (dropZone && (!dropZone.classList.contains('filled') || dropZone === draggedFromZone)) {
                dropZone.classList.add('drag-over');
            }
        }

        function handleTouchEnd(e) {
            if (!currentTouchCard) return;
            
            e.preventDefault();
            
            const touch = e.changedTouches[0];
            const touchX = touch.clientX;
            const touchY = touch.clientY;
            
            // Remove touch drag clone
            removeTouchDragClone();
            
            // Find drop zone
            const elementBelow = document.elementFromPoint(touchX, touchY);
            const dropZone = elementBelow?.closest('.timeline-drop-zone');
            
            // Remove all highlights
            document.querySelectorAll('.timeline-drop-zone').forEach(zone => {
                zone.classList.remove('drop-available', 'drag-over');
            });
            
            currentTouchCard.classList.remove('dragging', 'touch-dragging');
            
            // If dropped on a valid zone
            if (dropZone && (!dropZone.classList.contains('filled') || dropZone === draggedFromZone)) {
                // Handle existing card in zone
                const existingCard = dropZone.querySelector('.timeline-event-card');
                if (existingCard && existingCard !== currentTouchCard) {
                    if (draggedFromZone) {
                        draggedFromZone.appendChild(existingCard);
                        existingCard.classList.add('placed');
                    } else {
                        const cardsArea = document.getElementById('timelineCardsArea');
                        cardsArea.appendChild(existingCard);
                        existingCard.classList.remove('placed');
                    }
                }
                
                // Place card
                dropZone.appendChild(currentTouchCard);
                currentTouchCard.classList.add('placed');
                dropZone.classList.add('filled');
                
                // Clear source zone
                if (draggedFromZone && draggedFromZone !== dropZone) {
                    draggedFromZone.classList.remove('filled');
                }
                
                // Animate placement
                animateCardPlacement(currentTouchCard);
                
                // Update order
                updateUserOrder();
                
                // Check submit button
                checkSubmitButton();
                
                // Play sound
                playTimelineSound('place');
            } else {
                // Return to original position
                animateCardReturn(currentTouchCard);
            }
            
            currentTouchCard = null;
            draggedFromZone = null;
        }

        // Touch drag clone helpers
        let touchDragClone = null;

        function createTouchDragClone(card, x, y) {
            touchDragClone = card.cloneNode(true);
            touchDragClone.style.position = 'fixed';
            touchDragClone.style.pointerEvents = 'none';
            touchDragClone.style.zIndex = '10000';
            touchDragClone.style.opacity = '0.9';
            touchDragClone.style.transform = 'scale(1.05) rotate(3deg)';
            touchDragClone.style.transition = 'none';
            touchDragClone.style.width = card.offsetWidth + 'px';
            touchDragClone.style.left = (x - card.offsetWidth / 2) + 'px';
            touchDragClone.style.top = (y - card.offsetHeight / 2) + 'px';
            document.body.appendChild(touchDragClone);
        }

        function moveTouchDragClone(x, y) {
            if (touchDragClone) {
                touchDragClone.style.left = (x - touchDragClone.offsetWidth / 2) + 'px';
                touchDragClone.style.top = (y - touchDragClone.offsetHeight / 2) + 'px';
            }
        }

        function removeTouchDragClone() {
            if (touchDragClone) {
                touchDragClone.remove();
                touchDragClone = null;
            }
        }

        // ==================== ANIMATIONS ====================
        
        function animateCardPlacement(card) {
            // Add bounce animation
            card.style.animation = 'cardSnap 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            setTimeout(() => {
                card.style.animation = '';
            }, 300);
        }

        function animateCardReturn(card) {
            // Shake animation for invalid drop
            card.style.animation = 'cardShake 0.4s ease-in-out';
            setTimeout(() => {
                card.style.animation = '';
            }, 400);
        }

        // ==================== HELPER FUNCTIONS ====================
        
        function updateUserOrder() {
            // Build array of event IDs in current drop zone order
            const dropZones = document.querySelectorAll('.timeline-drop-zone');
            timelineGameState.userOrder = [];
            
            dropZones.forEach(zone => {
                const card = zone.querySelector('.timeline-event-card');
                if (card) {
                    timelineGameState.userOrder.push(parseInt(card.dataset.eventId));
                }
            });
        }

        function playTimelineSound(type) {
            if (!timelineSoundEnabled) return;
            
            // Simple beep sounds using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            if (type === 'place') {
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.1;
            } else if (type === 'correct') {
                oscillator.frequency.value = 1000;
                gainNode.gain.value = 0.15;
            } else if (type === 'wrong') {
                oscillator.frequency.value = 200;
                gainNode.gain.value = 0.15;
            }
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        }

        // Reset Button Handler
        const timelineResetBtn = document.getElementById('timelineResetBtn');
        if (timelineResetBtn) {
            timelineResetBtn.addEventListener('click', () => {
                if (timelineGameState.currentRoundData) {
                    renderEventCards(timelineGameState.currentRoundData.events);
                    createDropZones(timelineGameState.currentRoundData.events.length);
                    timelineGameState.userOrder = [];
                    
                    if (window.lucide) {
                        lucide.createIcons();
                    }
                }
            });
        }

        // ==================== PHASE 4: VALIDATION & SCORING ====================
        
        // Submit Button Handler
        const timelineSubmitBtn = document.getElementById('timelineSubmitBtn');
        if (timelineSubmitBtn) {
            timelineSubmitBtn.addEventListener('click', () => {
                validateTimelineAnswer();
            });
        }

        // Hint Button Handler
        const timelineHintBtn = document.getElementById('timelineHintBtn');
        if (timelineHintBtn) {
            timelineHintBtn.addEventListener('click', () => {
                provideHint();
            });
        }
        
        // Validate Timeline Answer
        function validateTimelineAnswer() {
            if (!timelineGameState.currentRoundData) return;
            
            const correctOrder = timelineGameState.currentRoundData.correctOrder;
            const userOrder = timelineGameState.userOrder;
            
            // Disable submit button during validation
            timelineSubmitBtn.disabled = true;
            
            // Calculate correctness
            let correctCount = 0;
            const dropZones = document.querySelectorAll('.timeline-drop-zone');
            
            dropZones.forEach((zone, index) => {
                const card = zone.querySelector('.timeline-event-card');
                if (!card) return;
                
                const eventId = parseInt(card.dataset.eventId);
                const isCorrect = correctOrder[index] === eventId;
                
                if (isCorrect) {
                    correctCount++;
                    zone.classList.add('correct');
                    card.style.animation = 'successPulse 0.6s ease';
                    playTimelineSound('correct');
                } else {
                    zone.classList.add('incorrect');
                    card.style.animation = 'shake 0.5s ease';
                }
                
                // Reveal the correct date
                setTimeout(() => {
                    const dateEl = card.querySelector('.event-card-date');
                    if (dateEl) {
                        dateEl.style.display = 'block';
                        dateEl.classList.add('revealed');
                    }
                }, 300);
            });
            
            // Play wrong sound if not all correct
            if (correctCount < correctOrder.length) {
                setTimeout(() => playTimelineSound('wrong'), 200);
            }
            
            // Calculate score
            const isPerfect = correctCount === correctOrder.length;
            const roundScore = calculateRoundScore(correctCount, correctOrder.length, isPerfect);
            
            // Update game state
            timelineGameState.score += roundScore;
            timelineGameState.totalCorrect += correctCount;
            timelineGameState.totalPlaced += correctOrder.length;
            
            if (isPerfect) {
                timelineGameState.perfectRounds++;
            }
            
            // Update score display
            document.getElementById('timelineScore').textContent = timelineGameState.score;
            
            // Show feedback
            showRoundFeedback(isPerfect, correctCount, correctOrder.length, roundScore);
        }
        
        // Calculate Round Score
        function calculateRoundScore(correctCount, totalEvents, isPerfect) {
            const difficulty = timelineGameState.currentRoundData.difficulty;
            const config = difficultyLevels[difficulty];
            
            let score = 0;
            
            // Base score for each correct position
            score += correctCount * 50;
            
            // Perfect round bonus
            if (isPerfect) {
                score += config.baseScore;
            }
            
            // Time bonus (faster = more points) - based on round completion time
            const roundTime = Date.now() - (timelineGameState.roundStartTime || timelineGameState.startTime);
            const roundSeconds = Math.floor(roundTime / 1000);
            const timeBonus = Math.max(0, config.timeBonus - (roundSeconds * 2));
            score += Math.floor(timeBonus);
            
            // Streak bonus for multiple perfect rounds
            if (isPerfect && timelineGameState.perfectRounds > 0) {
                score += timelineGameState.perfectRounds * 100;
            }
            
            return Math.max(0, score);
        }
        
        // ==================== PHASE 5: ENHANCED GAME FLOW ====================
        
        // Fun Facts Database
        const funFacts = [
            "The Philippines was named after King Philip II of Spain.",
            "José Rizal wrote his farewell poem 'Mi Último Adiós' the night before his execution.",
            "The Battle of Manila Bay lasted only 7 hours but changed Philippine history forever.",
            "The 1987 Constitution is the 5th constitution in Philippine history.",
            "The Philippine Revolution of 1896 was one of the first national revolutions in Asia.",
            "Manila was known as the 'Pearl of the Orient' during the Spanish colonial period.",
            "The Katipunan had over 400,000 members at its peak.",
            "Emilio Aguinaldo was only 29 years old when he became president.",
            "The Philippine flag is the only flag that is displayed differently during wartime.",
            "The Cry of Pugad Lawin marked the start of the Philippine Revolution against Spain.",
            "The GOMBURZA execution inspired José Rizal to fight for reforms.",
            "The Philippines declared independence on June 12, 1898, but it wasn't recognized until 1946.",
            "Lapu-Lapu is considered the first Filipino hero for defeating Magellan.",
            "The Cavite Mutiny of 1872 lasted only two days but had lasting consequences.",
            "The EDSA Revolution of 1986 was one of the most peaceful revolutions in history."
        ];
        
        // Show Round Feedback
        function showRoundFeedback(isPerfect, correctCount, totalEvents, roundScore) {
            const feedbackEl = document.getElementById('timelineFeedback');
            
            const accuracy = Math.round((correctCount / totalEvents) * 100);
            
            let title, message, iconClass;
            
            if (isPerfect) {
                title = '🎉 Perfect!';
                message = `Amazing! All ${totalEvents} events in correct order!`;
                iconClass = 'success';
                
                // Trigger confetti for perfect round
                createConfetti();
                
                // Check for achievements
                checkAchievements(isPerfect);
            } else if (accuracy >= 50) {
                title = '👍 Good Try!';
                message = `You got ${correctCount} out of ${totalEvents} correct.`;
                iconClass = 'partial';
            } else {
                title = '💪 Keep Trying!';
                message = `You got ${correctCount} out of ${totalEvents} correct.`;
                iconClass = 'error';
            }
            
            // Get a random fun fact
            const funFact = getRandomFunFact();
            
            feedbackEl.innerHTML = `
                <div class="feedback-icon ${iconClass}">
                    ${isPerfect ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="info"></i>'}
                </div>
                <div class="feedback-title">${title}</div>
                <div class="feedback-message">${message}</div>
                <div class="feedback-score">+${roundScore} points</div>
                ${timelineGameState.currentRound < timelineGameState.totalRounds ? `
                    <div class="feedback-fun-fact">
                        <div class="fun-fact-header">
                            <i data-lucide="lightbulb"></i>
                            <span>Did you know?</span>
                        </div>
                        <p>${funFact}</p>
                    </div>
                ` : ''}
                <button class="timeline-btn-primary" id="feedbackContinueBtn">
                    <i data-lucide="${timelineGameState.currentRound < timelineGameState.totalRounds ? 'arrow-right' : 'award'}"></i>
                    ${timelineGameState.currentRound < timelineGameState.totalRounds ? 'Next Round' : 'View Results'}
                </button>
            `;
            
            feedbackEl.classList.add('show');
            
            if (window.lucide) {
                lucide.createIcons();
            }
            
            // Continue button
            const continueBtn = document.getElementById('feedbackContinueBtn');
            continueBtn.addEventListener('click', () => {
                feedbackEl.classList.remove('show');
                
                if (timelineGameState.currentRound < timelineGameState.totalRounds) {
                    // Show between-round transition
                    setTimeout(() => {
                        showBetweenRoundTransition();
                    }, 300);
                } else {
                    // Game complete - show end screen
                    setTimeout(() => {
                        showTimelineEndScreen();
                    }, 300);
                }
            });
        }
        
        // Get Random Fun Fact
        function getRandomFunFact() {
            // Avoid repeating the same fact
            if (!timelineGameState.usedFacts) {
                timelineGameState.usedFacts = [];
            }
            
            const availableFacts = funFacts.filter(fact => !timelineGameState.usedFacts.includes(fact));
            
            if (availableFacts.length === 0) {
                timelineGameState.usedFacts = [];
                return funFacts[Math.floor(Math.random() * funFacts.length)];
            }
            
            const fact = availableFacts[Math.floor(Math.random() * availableFacts.length)];
            timelineGameState.usedFacts.push(fact);
            return fact;
        }
        
        // Show Between-Round Transition
        function showBetweenRoundTransition() {
            const nextRound = timelineGameState.currentRound + 1;
            const config = roundConfigurations[nextRound - 1];
            
            // Create transition overlay
            const transition = document.createElement('div');
            transition.className = 'timeline-round-transition';
            transition.innerHTML = `
                <div class="transition-content">
                    <div class="transition-icon">
                        <i data-lucide="${nextRound <= 2 ? 'zap' : nextRound <= 4 ? 'flame' : 'star'}"></i>
                    </div>
                    <h2>Round ${nextRound}</h2>
                    <div class="transition-phase">${config.phase}</div>
                    <div class="transition-difficulty">
                        <span class="difficulty-badge ${config.difficulty}">${config.difficulty.toUpperCase()}</span>
                    </div>
                    <div class="transition-ready">
                        <div class="ready-spinner"></div>
                        <span>Get Ready...</span>
                    </div>
                </div>
            `;
            
            document.body.appendChild(transition);
            
            if (window.lucide) {
                lucide.createIcons();
            }
            
            // Animate in
            setTimeout(() => transition.classList.add('show'), 50);
            
            // Auto-dismiss after 2.5 seconds
            setTimeout(() => {
                transition.classList.remove('show');
                setTimeout(() => {
                    transition.remove();
                    loadTimelineRound(nextRound);
                }, 300);
            }, 2500);
        }
        
        // Create Confetti Effect
        function createConfetti() {
            const colors = ['#FFD700', '#FF6B35', '#4CAF50', '#2196F3', '#FF9800'];
            const confettiCount = 50;
            
            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 0.5 + 's';
                confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
                
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 4000);
            }
        }
        
        // Check Achievements
        function checkAchievements(isPerfect) {
            // First perfect round
            if (isPerfect && timelineGameState.perfectRounds === 1 && !timelineGameState.firstPerfectShown) {
                timelineGameState.firstPerfectShown = true;
                showAchievement('🌟 First Perfect!', 'You completed your first perfect round!');
            }
            
            // Speed demon (perfect round in under 30 seconds)
            const roundTime = Date.now() - (timelineGameState.roundStartTime || timelineGameState.startTime);
            if (isPerfect && roundTime < 30000 && !timelineGameState.speedDemonShown) {
                timelineGameState.speedDemonShown = true;
                showAchievement('⚡ Speed Demon!', 'Perfect round in under 30 seconds!');
            }
            
            // Perfect streak (3 perfect rounds in a row)
            if (timelineGameState.perfectRounds >= 3 && !timelineGameState.perfectStreakShown) {
                timelineGameState.perfectStreakShown = true;
                showAchievement('🔥 On Fire!', '3 perfect rounds in a row!');
            }
        }
        
        // Show Achievement Notification
        function showAchievement(title, message) {
            const achievement = document.createElement('div');
            achievement.className = 'timeline-achievement';
            achievement.innerHTML = `
                <div class="achievement-icon">🏆</div>
                <div class="achievement-content">
                    <div class="achievement-title">${title}</div>
                    <div class="achievement-message">${message}</div>
                </div>
            `;
            
            document.body.appendChild(achievement);
            
            setTimeout(() => achievement.classList.add('show'), 50);
            
            setTimeout(() => {
                achievement.classList.remove('show');
                setTimeout(() => achievement.remove(), 300);
            }, 4000);
        }
        
        // Provide Hint
        function provideHint() {
            if (!timelineGameState.currentRoundData) return;
            
            const correctOrder = timelineGameState.currentRoundData.correctOrder;
            const dropZones = document.querySelectorAll('.timeline-drop-zone');
            
            // Find first incorrect or empty position
            let hintGiven = false;
            
            dropZones.forEach((zone, index) => {
                if (hintGiven) return;
                
                const card = zone.querySelector('.timeline-event-card');
                const correctEventId = correctOrder[index];
                
                // If empty or wrong, show hint
                if (!card || parseInt(card.dataset.eventId) !== correctEventId) {
                    // Find the correct event
                    const correctEvent = timelineGameState.currentRoundData.events.find(e => e.id === correctEventId);
                    
                    if (correctEvent) {
                        // Highlight the correct card to place here
                        const cardsArea = document.getElementById('timelineCardsArea');
                        const allCards = [...cardsArea.querySelectorAll('.timeline-event-card'), ...document.querySelectorAll('.timeline-drop-zone .timeline-event-card')];
                        
                        allCards.forEach(c => {
                            if (parseInt(c.dataset.eventId) === correctEventId) {
                                c.style.animation = 'pulse 1s ease-in-out 3';
                                c.style.border = '3px solid #4CAF50';
                                setTimeout(() => {
                                    c.style.border = '';
                                    c.style.animation = '';
                                }, 3000);
                            }
                        });
                        
                        // Highlight the target zone
                        zone.style.border = '3px solid #2196F3';
                        zone.style.animation = 'pulse 1s ease-in-out 3';
                        setTimeout(() => {
                            zone.style.border = '';
                            zone.style.animation = '';
                        }, 3000);
                        
                        hintGiven = true;
                        
                        // Deduct points
                        timelineGameState.score = Math.max(0, timelineGameState.score - 50);
                        document.getElementById('timelineScore').textContent = timelineGameState.score;
                        
                        // Show hint notification
                        showHintNotification();
                    }
                }
            });
            
            if (!hintGiven) {
                // All correct, show message
                showHintNotification('All events are in correct positions!');
            }
        }
        
        // Show Hint Notification
        function showHintNotification(customMessage) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2196F3;
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10003;
                font-weight: 600;
                animation: slideIn 0.3s ease;
            `;
            
            notification.innerHTML = customMessage || `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="lightbulb" style="width: 20px; height: 20px;"></i>
                    <span>Hint provided! -50 points</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            if (window.lucide) {
                lucide.createIcons();
            }
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
        
        // Show Timeline End Screen
        function showTimelineEndScreen() {
            stopTimelineTimer();
            
            // Calculate final statistics
            const totalTime = Date.now() - timelineGameState.startTime;
            const minutes = Math.floor(totalTime / 60000);
            const seconds = Math.floor((totalTime % 60000) / 1000);
            const accuracy = Math.round((timelineGameState.totalCorrect / timelineGameState.totalPlaced) * 100);
            
            // Update end screen displays with animated counting
            animateNumber('timelineFinalScore', 0, timelineGameState.score, 1500);
            document.getElementById('timelinePerfectRounds').textContent = `${timelineGameState.perfectRounds}/${timelineGameState.totalRounds}`;
            document.getElementById('timelineAccuracy').textContent = `${accuracy}%`;
            document.getElementById('timelineTotalTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Calculate performance grade
            const grade = calculateTimelinePerformanceGrade(accuracy, timelineGameState.perfectRounds);
            const gradeDisplay = document.getElementById('timelinePerformanceGrade');
            const gradeLetter = gradeDisplay.querySelector('.grade-letter');
            const gradeLabel = gradeDisplay.querySelector('.grade-label');
            
            gradeLetter.textContent = grade.letter;
            gradeLabel.textContent = grade.label;
            
            // Apply grade color
            if (grade.color) {
                gradeLetter.style.background = `linear-gradient(135deg, ${grade.color}, ${adjustColor(grade.color, -20)})`;
                gradeLetter.style.webkitBackgroundClip = 'text';
                gradeLetter.style.webkitTextFillColor = 'transparent';
                gradeLetter.style.backgroundClip = 'text';
            }
            
            // Show end screen
            showTimelineScreen('end');
            
            // Celebrate if legendary performance
            if (grade.letter === 'S') {
                setTimeout(() => {
                    createCelebrationFireworks();
                    showAchievement('🌟 Legendary!', 'Perfect score! You are a true historian!');
                }, 500);
            }
            
            // Save to leaderboard and show rank
            const timeInSeconds = Math.floor(totalTime / 1000);
            const difficulty = timelineGameState.difficulty || 'medium';
            const topic = timelineGameState.selectedEra || 'All Eras';
            
            saveTimelineScoreAndShowRank(
                timelineGameState.score,
                timelineGameState.totalCorrect,
                timelineGameState.totalPlaced,
                accuracy,
                timeInSeconds,
                timelineGameState.perfectRounds,
                grade.letter,
                difficulty,
                topic
            );
        }
        
        // Animate Number Counting
        function animateNumber(elementId, start, end, duration) {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            const range = end - start;
            const increment = range / (duration / 16);
            let current = start;
            
            const timer = setInterval(() => {
                current += increment;
                if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                    current = end;
                    clearInterval(timer);
                }
                element.textContent = Math.floor(current);
            }, 16);
        }
        
        // Adjust Color Brightness
        function adjustColor(color, amount) {
            const hex = color.replace('#', '');
            const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
            const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
            const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        
        // Create Celebration Fireworks
        function createCelebrationFireworks() {
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    createConfetti();
                    playTimelineSound('correct');
                }, i * 400);
            }
        }
        
        // ==================== SHARED LEADERBOARD FUNCTIONS ====================
        
        // Fetch Leaderboard Data (Shared function for both games)
        async function fetchLeaderboardData(gameType, filter = 'all-time') {
            try {
                const supabaseClient = window.supabaseClient || await getSupabaseClient();
                const tableName = gameType === 'trivia' ? 'trivia_scores' : 'timeline_scores';
                
                console.log(`[${gameType}] Fetching leaderboard data with filter:`, filter);
                
                // Query scores table
                let query = supabaseClient
                    .from(tableName)
                    .select('*')
                    .order('score', { ascending: false })
                    .order('created_at', { ascending: true })
                    .limit(500);
                
                // Apply time filter
                const now = new Date();
                if (filter === 'today') {
                    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
                    query = query.gte('created_at', startOfDay.toISOString());
                } else if (filter === 'this-week') {
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);
                    query = query.gte('created_at', startOfWeek.toISOString());
                }
                
                const { data, error } = await query;
                
                if (error) {
                    console.error(`[${gameType}] Database error:`, error);
                    return { success: false, error: error.message };
                }
                
                if (!data || data.length === 0) {
                    console.log(`[${gameType}] No scores found`);
                    return { success: true, data: [] };
                }
                
                // Get only BEST score per user
                const bestScoresByUser = {};
                data.forEach(score => {
                    const existing = bestScoresByUser[score.user_id];
                    if (!existing || score.score > existing.score || 
                        (score.score === existing.score && new Date(score.created_at) < new Date(existing.created_at))) {
                        bestScoresByUser[score.user_id] = score;
                    }
                });
                
                // Convert back to array and sort
                const uniqueScores = Object.values(bestScoresByUser)
                    .sort((a, b) => {
                        if (b.score !== a.score) return b.score - a.score;
                        return new Date(a.created_at) - new Date(b.created_at);
                    })
                    .slice(0, 100); // Top 100
                
                console.log(`[${gameType}] Best scores per user:`, uniqueScores.length);
                
                // Get user profiles
                const userIds = uniqueScores.map(s => s.user_id);
                let profiles = null;
                
                if (userIds.length > 0) {
                    const result = await supabaseClient
                        .from('user_profiles')
                        .select('id, full_name, avatar_url')
                        .in('id', userIds);
                    profiles = result.data;
                    console.log(`[${gameType}] Profiles fetched:`, profiles?.length || 0);
                }
                
                // Get current session
                const { data: { session } } = await supabaseClient.auth.getSession();
                const currentUserId = session?.user?.id;
                
                // Create profile map
                const profileMap = {};
                if (profiles) {
                    profiles.forEach(profile => {
                        profileMap[profile.id] = profile;
                    });
                }
                
                // Merge profiles with scores
                const leaderboardData = uniqueScores.map(score => {
                    const profile = profileMap[score.user_id];
                    let userName = profile?.full_name;
                    
                    // Fallback logic for username
                    if (!userName && score.user_id === currentUserId) {
                        userName = session.user.user_metadata?.full_name || 
                                  session.user.email?.split('@')[0] || 'User';
                    } else if (!userName) {
                        userName = 'User';
                    }
                    
                    return {
                        ...score,
                        user_name: userName,
                        avatar_url: profile?.avatar_url || null,
                        is_current_user: score.user_id === currentUserId
                    };
                });
                
                console.log(`[${gameType}] Final leaderboard entries:`, leaderboardData.length);
                return { success: true, data: leaderboardData, currentUserId };
                
            } catch (error) {
                console.error(`[${gameType}] Exception:`, error);
                return { success: false, error: error.message };
            }
        }
        
        // Render a single leaderboard entry (shared by both games)
        function renderLeaderboardEntry(entry, index, currentUserId) {
            const rank = index + 1;
            const isCurrentUser = entry.user_id === currentUserId;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            
            // Avatar handling with fallback
            const avatarSrc = entry.avatar_url || 
                `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect fill='%23e0e0e0' width='48' height='48'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23999' text-anchor='middle' dy='.3em'%3E${entry.user_name.charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E`;
            
            // Format time
            const minutes = Math.floor(entry.time_taken / 60);
            const seconds = entry.time_taken % 60;
            const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            return `
                <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}" data-rank="${rank}">
                    <div class="entry-rank ${rank <= 3 ? 'top-three' : ''}">${rankEmoji}</div>
                    <div class="entry-avatar">
                        <img src="${avatarSrc}" alt="${entry.user_name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'48\' height=\'48\'%3E%3Crect fill=\'%23e0e0e0\' width=\'48\' height=\'48\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' font-size=\'20\' fill=\'%23999\' text-anchor=\'middle\' dy=\'.3em\'%3E?%3C/text%3E%3C/svg%3E'">
                    </div>
                    <div class="entry-info">
                        <div class="entry-name">${entry.user_name}${isCurrentUser ? ' <span class="you-badge">You</span>' : ''}</div>
                        <div class="entry-stats">
                            <span class="entry-stat">
                                <i data-lucide="target"></i> ${entry.correct_answers}/${entry.total_questions}
                            </span>
                            <span class="entry-stat">
                                <i data-lucide="clock"></i> ${timeStr}
                            </span>
                            <span class="entry-stat">
                                <i data-lucide="zap"></i> ${entry.best_streak}x
                            </span>
                        </div>
                    </div>
                    <div class="entry-score-container">
                        <div class="entry-grade grade-${entry.performance_grade}">${entry.performance_grade}</div>
                        <div class="entry-score">${entry.score.toLocaleString()}</div>
                    </div>
                </div>
            `;
        }
        
        // Load Timeline Quest Leaderboard
        async function loadTimelineLeaderboard(filter = 'all-time') {
            const leaderboardList = document.getElementById('timelineLeaderboardList');
            
            // Show loading
            leaderboardList.innerHTML = `
                <div class="leaderboard-loading">
                    <i data-lucide="loader" class="spin"></i>
                    <p>Loading leaderboard...</p>
                </div>
            `;
            
            if (window.lucide) {
                lucide.createIcons();
            }
            
            // Fetch data using shared function
            const result = await fetchLeaderboardData('timeline', filter);
            
            if (!result.success) {
                // Error state
                leaderboardList.innerHTML = `
                    <div class="leaderboard-error">
                        <i data-lucide="alert-circle"></i>
                        <p>Unable to load leaderboard</p>
                        <p class="error-message">${result.error || 'Please try again later'}</p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
                return;
            }
            
            const data2 = result.data;
            const currentUserId = result.currentUserId;
                
                if (!data2 || data2.length === 0) {
                    leaderboardList.innerHTML = `
                        <div class="leaderboard-empty">
                            <i data-lucide="trophy"></i>
                            <p>No scores yet. Be the first to play!</p>
                        </div>
                    `;
                    if (window.lucide) {
                        lucide.createIcons();
                    }
                    return;
                }
                
                // Render leaderboard entries using shared renderer
                let html = '';
                data2.forEach((entry, index) => {
                    html += renderLeaderboardEntry(entry, index, currentUserId);
                });
                
                leaderboardList.innerHTML = html;
                
                if (window.lucide) {
                    lucide.createIcons();
                }
                
                // Animate entries
                setTimeout(() => {
                    const entries = leaderboardList.querySelectorAll('.leaderboard-entry');
                    entries.forEach((entry, index) => {
                        setTimeout(() => {
                            entry.style.animation = 'statCardIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
                        }, index * 50);
                    });
                }, 100);
                
        }
        
        // Calculate Performance Grade
        function calculateTimelinePerformanceGrade(accuracy, perfectRounds) {
            if (perfectRounds === 5) {
                return { letter: 'S', label: 'Legendary Historian!', color: '#FFD700' };
            } else if (accuracy >= 90 && perfectRounds >= 4) {
                return { letter: 'A', label: 'Excellent Historian!', color: '#4CAF50' };
            } else if (accuracy >= 75 && perfectRounds >= 3) {
                return { letter: 'B', label: 'Great Historian!', color: '#2196F3' };
            } else if (accuracy >= 60) {
                return { letter: 'C', label: 'Good Historian!', color: '#FF9800' };
            } else {
                return { letter: 'D', label: 'Keep Practicing!', color: '#F44336' };
            }
        }

        // Save Timeline Quest Score to Database
        async function saveTimelineScore(score, correctAnswers, totalQuestions, accuracy, timeTaken, bestStreak, performanceGrade, difficulty, topic) {
            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                
                if (!session || !session.user) {
                    console.error('User not authenticated, cannot save Timeline Quest score');
                    return null;
                }

                const userId = session.user.id;

                // Insert score into timeline_scores table
                const { data, error } = await window.supabaseClient
                    .from('timeline_scores')
                    .insert([{
                        user_id: userId,
                        score: score,
                        correct_answers: correctAnswers,
                        total_questions: totalQuestions,
                        accuracy: accuracy,
                        time_taken: timeTaken,
                        best_streak: bestStreak,
                        performance_grade: performanceGrade,
                        difficulty: difficulty || 'medium',
                        topic: topic || 'All Topics'
                    }])
                    .select();

                if (error) {
                    console.error('Error saving Timeline Quest score:', error);
                    return null;
                }

                console.log('Timeline Quest score saved successfully:', data);
                return data[0];
            } catch (error) {
                console.error('Exception saving Timeline Quest score:', error);
                return null;
            }
        }

        // Save Timeline Quest Score and Show Rank
        async function saveTimelineScoreAndShowRank(finalScore, correctAns, totalQs, accuracyVal, timeTaken, bestStrk, grade, difficulty, topic) {
            const rankDisplayEl = document.getElementById('timelineRankDisplay');
            
            if (!rankDisplayEl) {
                console.warn('Rank display element not found');
                return;
            }
            
            // Show saving state
            rankDisplayEl.innerHTML = `
                <div class="rank-loading">
                    <i data-lucide="loader" class="spin"></i>
                    <span>Saving your score...</span>
                </div>
            `;
            if (window.lucide) lucide.createIcons();

            // Save score
            const savedScore = await saveTimelineScore(finalScore, correctAns, totalQs, accuracyVal, timeTaken, bestStrk, grade, difficulty, topic);

            if (savedScore) {
                // Get user's rank
                const rankInfo = await getTimelineUserRank(finalScore, 'all-time');
                
                if (rankInfo) {
                    // Show rank with animation
                    setTimeout(() => {
                        rankDisplayEl.innerHTML = `
                            <div class="rank-achievement">
                                <i data-lucide="trophy"></i>
                                <span class="rank-text">You placed <strong>#${rankInfo.rank}</strong> on the leaderboard!</span>
                            </div>
                        `;
                        if (window.lucide) lucide.createIcons();
                        
                        // Animate rank reveal
                        const rankAchievement = rankDisplayEl.querySelector('.rank-achievement');
                        if (rankAchievement) {
                            setTimeout(() => {
                                rankAchievement.style.animation = 'feedbackBounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                            }, 200);
                        }
                    }, 1000);
                } else {
                    // Couldn't get rank, but score was saved
                    setTimeout(() => {
                        rankDisplayEl.innerHTML = `
                            <div class="rank-achievement">
                                <i data-lucide="check-circle"></i>
                                <span class="rank-text">Score saved successfully!</span>
                            </div>
                        `;
                        if (window.lucide) lucide.createIcons();
                    }, 1000);
                }
            } else {
                // Save failed
                setTimeout(() => {
                    rankDisplayEl.innerHTML = `
                        <div class="rank-achievement error">
                            <i data-lucide="alert-circle"></i>
                            <span class="rank-text">Could not save score. Please try again.</span>
                        </div>
                    `;
                    if (window.lucide) lucide.createIcons();
                }, 1000);
            }
        }

        // Get Timeline Quest User Rank
        async function getTimelineUserRank(score, filter = 'all-time') {
            try {
                console.log('Getting Timeline Quest user rank for score:', score, 'filter:', filter);
                
                // Query timeline_scores_with_users view for best scores
                let query = window.supabaseClient
                    .from('timeline_scores_with_users')
                    .select('*', { count: 'exact', head: true })
                    .gt('score', score);
                
                // Apply time filter
                const now = new Date();
                if (filter === 'today') {
                    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
                    query = query.gte('created_at', startOfDay.toISOString());
                } else if (filter === 'this-week') {
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);
                    query = query.gte('created_at', startOfWeek.toISOString());
                }
                
                const { count, error } = await query;
                
                if (error) {
                    console.error('Error getting Timeline Quest rank:', error);
                    return null;
                }
                
                const rank = (count || 0) + 1;
                console.log('Timeline Quest user rank:', rank);
                return { rank, total: count + 1 };
            } catch (error) {
                console.error('Exception getting Timeline Quest rank:', error);
                return null;
            }
        }

        // Reset Game State
        function resetTimelineGame() {
            timelineGameState = {
                score: 0,
                currentRound: 1,
                totalRounds: 5,
                perfectRounds: 0,
                totalCorrect: 0,
                totalPlaced: 0,
                startTime: null,
                roundStartTime: null,
                selectedEra: timelineGameState.selectedEra || 'mixed',
                usedFacts: [],
                firstPerfectShown: false,
                speedDemonShown: false,
                perfectStreakShown: false
            };
        }

        // ==================== TIMELINE QUEST EVENT DATABASE ====================

        const timelineEvents = [
            // First Mass Topic (1521)
            {
                id: 1,
                title: "Magellan's Fleet Arrives in Philippines",
                date: new Date(1521, 2, 16), // March 16, 1521
                year: 1521,
                era: "first-mass",
                description: "Ferdinand Magellan's expedition sights the islands of Samar"
            },
            {
                id: 2,
                title: "Landing in Homonhon Island",
                date: new Date(1521, 2, 17), // March 17, 1521
                year: 1521,
                era: "first-mass",
                description: "Magellan's crew lands on Homonhon Island for rest and supplies"
            },
            {
                id: 3,
                title: "Blood Compact with Rajah Kolambu",
                date: new Date(1521, 2, 29), // March 29, 1521
                year: 1521,
                era: "first-mass",
                description: "Magellan forms alliance with Rajah Kolambu through blood compact"
            },
            {
                id: 4,
                title: "First Mass in Limasawa",
                date: new Date(1521, 2, 31), // March 31, 1521
                year: 1521,
                era: "first-mass",
                description: "Father Pedro Valderrama celebrates first Catholic Mass on Easter Sunday"
            },
            {
                id: 5,
                title: "Planting of the Cross in Limasawa",
                date: new Date(1521, 3, 1), // April 1, 1521
                year: 1521,
                era: "first-mass",
                description: "Spanish crew plants a large cross on the highest hill of Limasawa"
            },
            {
                id: 6,
                title: "Arrival in Cebu",
                date: new Date(1521, 3, 7), // April 7, 1521
                year: 1521,
                era: "first-mass",
                description: "Magellan's expedition arrives in Cebu and meets Rajah Humabon"
            },
            {
                id: 7,
                title: "Baptism of Rajah Humabon",
                date: new Date(1521, 3, 14), // April 14, 1521
                year: 1521,
                era: "first-mass",
                description: "Rajah Humabon and his wife are baptized as Christians"
            },
            {
                id: 8,
                title: "Magellan's Death in Mactan",
                date: new Date(1521, 3, 27), // April 27, 1521
                year: 1521,
                era: "first-mass",
                description: "Ferdinand Magellan killed in Battle of Mactan by Lapu-Lapu's forces"
            },

            // Cavite Mutiny Topic (1872)
            {
                id: 9,
                title: "Governor-General Izquierdo Takes Office",
                date: new Date(1871, 3, 4), // April 4, 1871
                year: 1871,
                era: "cavite-mutiny",
                description: "Rafael Izquierdo becomes Governor-General, introducing repressive policies"
            },
            {
                id: 10,
                title: "Abolition of Arsenal Privileges",
                date: new Date(1872, 0, 1), // January 1, 1872
                year: 1872,
                era: "cavite-mutiny",
                description: "Izquierdo abolishes privileges of Cavite arsenal workers"
            },
            {
                id: 11,
                title: "Cavite Mutiny Erupts",
                date: new Date(1872, 0, 20), // January 20, 1872
                year: 1872,
                era: "cavite-mutiny",
                description: "Filipino soldiers and workers revolt at Fort San Felipe arsenal"
            },
            {
                id: 12,
                title: "Mutiny Suppressed",
                date: new Date(1872, 0, 21), // January 21, 1872
                year: 1872,
                era: "cavite-mutiny",
                description: "Spanish forces quickly crush the mutiny within 24 hours"
            },
            {
                id: 13,
                title: "Arrest of GOMBURZA",
                date: new Date(1872, 0, 28), // January 28, 1872
                year: 1872,
                era: "cavite-mutiny",
                description: "Filipino priests Gomez, Burgos, and Zamora arrested"
            },
            {
                id: 14,
                title: "Trial of GOMBURZA",
                date: new Date(1872, 1, 6), // February 6, 1872
                year: 1872,
                era: "cavite-mutiny",
                description: "GOMBURZA tried by court-martial for alleged conspiracy"
            },
            {
                id: 15,
                title: "Execution of GOMBURZA",
                date: new Date(1872, 1, 17), // February 17, 1872
                year: 1872,
                era: "cavite-mutiny",
                description: "Three Filipino priests executed by garrote in Bagumbayan"
            },
            {
                id: 16,
                title: "Martyrdom Inspires Nationalism",
                date: new Date(1872, 1, 18), // February 18, 1872
                year: 1872,
                era: "cavite-mutiny",
                description: "GOMBURZA's death inspires Filipino nationalist movement"
            },

            // Cry of Rebellion Topic (1896)
            {
                id: 17,
                title: "Katipunan's Discovery",
                date: new Date(1896, 7, 19), // August 19, 1896
                year: 1896,
                era: "cry-rebellion",
                description: "Spanish authorities discover the secret revolutionary society"
            },
            {
                id: 18,
                title: "Mass Arrests Begin",
                date: new Date(1896, 7, 20), // August 20, 1896
                year: 1896,
                era: "cry-rebellion",
                description: "Spanish colonial government orders arrest of suspected Katipuneros"
            },
            {
                id: 19,
                title: "Bonifacio Calls for Gathering",
                date: new Date(1896, 7, 22), // August 22, 1896
                year: 1896,
                era: "cry-rebellion",
                description: "Andres Bonifacio summons Katipuneros to Pugad Lawin"
            },
            {
                id: 20,
                title: "Cry of Pugad Lawin",
                date: new Date(1896, 7, 23), // August 23, 1896
                year: 1896,
                era: "cry-rebellion",
                description: "Katipuneros tear their cedulas, marking start of revolution"
            },
            {
                id: 21,
                title: "First Battle in San Juan del Monte",
                date: new Date(1896, 7, 30), // August 30, 1896
                year: 1896,
                era: "cry-rebellion",
                description: "First major armed confrontation between Katipunan and Spanish forces"
            },
            {
                id: 22,
                title: "Spread of Revolution to Provinces",
                date: new Date(1896, 8, 1), // September 1, 1896
                year: 1896,
                era: "cry-rebellion",
                description: "Revolutionary movement spreads across Luzon provinces"
            },
            {
                id: 23,
                title: "Declaration of Martial Law",
                date: new Date(1896, 8, 3), // September 3, 1896
                year: 1896,
                era: "cry-rebellion",
                description: "Spanish Governor-General declares martial law in eight provinces"
            },
            {
                id: 24,
                title: "Battle of San Mateo",
                date: new Date(1896, 11, 2), // December 2, 1896
                year: 1896,
                era: "cry-rebellion",
                description: "Major Katipunan victory against Spanish colonial forces"
            },

            // Retraction of Rizal Topic (1896)
            {
                id: 25,
                title: "Rizal Arrives from Dapitan",
                date: new Date(1896, 8, 16), // September 16, 1896
                year: 1896,
                era: "retraction-rizal",
                description: "Rizal returns from exile in Dapitan, arrested in Barcelona"
            },
            {
                id: 26,
                title: "Rizal's Return to Manila",
                date: new Date(1896, 10, 3), // November 3, 1896
                year: 1896,
                era: "retraction-rizal",
                description: "Rizal brought back to Manila as prisoner of Spanish authorities"
            },
            {
                id: 27,
                title: "Rizal Imprisoned in Fort Santiago",
                date: new Date(1896, 10, 20), // November 20, 1896
                year: 1896,
                era: "retraction-rizal",
                description: "Rizal incarcerated while awaiting trial for rebellion"
            },
            {
                id: 28,
                title: "Rizal's Court-Martial Trial",
                date: new Date(1896, 11, 26), // December 26, 1896
                year: 1896,
                era: "retraction-rizal",
                description: "Military trial finds Rizal guilty of rebellion and sedition"
            },
            {
                id: 29,
                title: "Alleged Retraction Document Signed",
                date: new Date(1896, 11, 29), // December 29, 1896
                year: 1896,
                era: "retraction-rizal",
                description: "Controversial retraction allegedly signed by Rizal"
            },
            {
                id: 30,
                title: "Rizal Writes 'Mi Último Adiós'",
                date: new Date(1896, 11, 29), // December 29, 1896
                year: 1896,
                era: "retraction-rizal",
                description: "Rizal pens his final poem on the eve of execution"
            },
            {
                id: 31,
                title: "Marriage to Josephine Bracken",
                date: new Date(1896, 11, 30), // December 30, 1896 (early morning)
                year: 1896,
                era: "retraction-rizal",
                description: "Rizal marries Josephine Bracken hours before execution"
            },
            {
                id: 32,
                title: "Execution of José Rizal",
                date: new Date(1896, 11, 30), // December 30, 1896
                year: 1896,
                era: "retraction-rizal",
                description: "National hero executed by firing squad at Bagumbayan Field"
            }
        ];

        // Difficulty Configuration
        const difficultyLevels = {
            easy: {
                name: "Easy",
                eventCount: 4,
                timeBonus: 300,
                baseScore: 250,
                description: "4 Events • Same Era"
            },
            medium: {
                name: "Medium",
                eventCount: 4,
                timeBonus: 500,
                baseScore: 400,
                description: "4 Events • Mixed Eras"
            },
            hard: {
                name: "Hard",
                eventCount: 5,
                timeBonus: 800,
                baseScore: 600,
                description: "5 Events • All Eras"
            }
        };

        // Round Configuration (Progressive Difficulty)
        const roundConfigurations = [
            { round: 1, difficulty: 'easy', phase: 'Warm Up Phase' },
            { round: 2, difficulty: 'easy', phase: 'Warm Up Phase' },
            { round: 3, difficulty: 'medium', phase: 'Challenge Phase' },
            { round: 4, difficulty: 'medium', phase: 'Challenge Phase' },
            { round: 5, difficulty: 'hard', phase: 'Expert Phase' }
        ];

        // Select Events for Round
        function selectEventsForRound(roundNumber, selectedEra) {
            const config = roundConfigurations[roundNumber - 1];
            const difficulty = difficultyLevels[config.difficulty];
            const eventCount = difficulty.eventCount;

            let availableEvents = [...timelineEvents];

            // Filter by era if not mixed
            if (selectedEra !== 'mixed') {
                availableEvents = availableEvents.filter(event => event.era === selectedEra);
                
                // If not enough events in the era, add some from other eras
                if (availableEvents.length < eventCount) {
                    const otherEvents = timelineEvents.filter(e => e.era !== selectedEra);
                    availableEvents = [...availableEvents, ...otherEvents];
                }
            }

            // For easy difficulty, prefer events from same era
            if (config.difficulty === 'easy' && selectedEra === 'mixed') {
                const eras = ['first-mass', 'cavite-mutiny', 'cry-rebellion', 'retraction-rizal'];
                const randomEra = eras[Math.floor(Math.random() * eras.length)];
                const sameEraEvents = availableEvents.filter(e => e.era === randomEra);
                
                if (sameEraEvents.length >= eventCount) {
                    availableEvents = sameEraEvents;
                }
            }

            // For medium difficulty, mix 2 eras
            if (config.difficulty === 'medium' && selectedEra === 'mixed') {
                const eras = ['first-mass', 'cavite-mutiny', 'cry-rebellion', 'retraction-rizal'];
                const shuffledEras = eras.sort(() => Math.random() - 0.5);
                const era1Events = availableEvents.filter(e => e.era === shuffledEras[0]).slice(0, 3);
                const era2Events = availableEvents.filter(e => e.era === shuffledEras[1]).slice(0, 3);
                
                if (era1Events.length >= 3 && era2Events.length >= 3) {
                    availableEvents = [...era1Events, ...era2Events];
                }
            }

            // Shuffle and select required number of events
            const shuffled = availableEvents.sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, eventCount);

            // Sort by date for correct answer
            const sorted = selected.sort((a, b) => a.date - b.date);

            return {
                events: selected,
                correctOrder: sorted.map(e => e.id),
                difficulty: config.difficulty,
                config: config
            };
        }

        // Get Era Display Name
        function getEraDisplayName(era) {
            const eraNames = {
                'first-mass': 'First Mass (1521)',
                'cavite-mutiny': 'Cavite Mutiny (1872)',
                'cry-rebellion': 'Cry of Rebellion (1896)',
                'retraction-rizal': 'Retraction of Rizal (1896)',
                'mixed': 'All Topics'
            };
            return eraNames[era] || era;
        }

        // Get Era Color
        function getEraColor(era) {
            const colors = {
                'first-mass': '#B8860B',
                'cavite-mutiny': '#DC143C',
                'cry-rebellion': '#8B4513',
                'retraction-rizal': '#4B0082'
            };
            return colors[era] || '#7A5B47';
        }