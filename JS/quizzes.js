// Quiz-specific functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Check locked quizzes and update UI
    await updateLockedQuizzesUI();
    
    // Add event listeners to "Start Quiz" buttons
    document.querySelectorAll('.start-quiz-btn, .quiz-sidebar-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const quizId = event.target.getAttribute('data-quiz-id');
            const userId = await getUserId();
            if (userId && window.supabaseClient) {
                try {
                    const { data, error } = await window.supabaseClient
                        .from('user_locked_quizzes')
                        .select('quiz_id')
                        .eq('user_id', userId)
                        .eq('quiz_id', quizId);
                    if (data && data.length > 0) {
                        alert('You have achieved a perfect score on this quiz. Great job!');
                        return;
                    }
                } catch (e) {
                    console.error('Error checking locked quiz:', e);
                }
            }
            
            window.location.href = `quiz-template.html?quizId=${quizId}`;
        });
    });

    // ==================== WELCOME STATS NAVIGATION ====================
    // This is specific to quizzes page
    document.querySelectorAll('.stat-item').forEach(item => {
        item.addEventListener('click', () => {
            const text = item.querySelector('.stat-text').textContent;

            switch(text) {
                case 'Lessons':
                    window.location.href = 'first-mass.html';
                    break;
                case 'Activities':
                    window.location.href = 'worksheets.html';
                    break;
                case 'Discussions':
                    document.querySelector('.discussion-section').scrollIntoView({
                        behavior: 'smooth'
                    });
                    break;
            }
        });
    });
});

// Function to update UI for locked quizzes (perfect scores) and progress
async function updateLockedQuizzesUI() {
    const userId = await getUserId();
    if (!userId || !window.supabaseClient) return;

    try {
        // Fetch locked quizzes
        const { data: lockedData, error: lockedError } = await window.supabaseClient
            .from('user_locked_quizzes')
            .select('quiz_id')
            .eq('user_id', userId);

        if (lockedError) {
            console.error('Error loading locked quizzes:', lockedError);
            return;
        }

        const lockedQuizzes = lockedData.map(row => row.quiz_id);

        // Fetch quiz scores
        const { data: scoresData, error: scoresError } = await window.supabaseClient
            .from('user_quiz_scores')
            .select('quiz_id, score')
            .eq('user_id', userId);

        if (scoresError) {
            console.error('Error loading quiz scores:', scoresError);
            return;
        }

        // Create a map of quiz_id to score
        const scoresMap = {};
        scoresData.forEach(row => {
            scoresMap[row.quiz_id] = row.score;
        });

        // Update main quiz items
        document.querySelectorAll('.quiz-item').forEach(quizItem => {
            const button = quizItem.querySelector('.start-quiz-btn');
            if (button) {
                const quizId = button.getAttribute('data-quiz-id');
                
                if (lockedQuizzes.includes(quizId)) {
                    // Mark quiz as locked (perfect score)
                    quizItem.classList.add('quiz-locked');
                    button.textContent = '✓ Perfect Score';
                    button.disabled = true;
                    button.title = 'You achieved a perfect score on this quiz';
                }
            }
        });

        // Update sidebar quiz buttons
        document.querySelectorAll('.quiz-sidebar-btn').forEach(button => {
            const quizId = button.getAttribute('data-quiz-id');
            
            if (lockedQuizzes.includes(quizId)) {
                // Mark button as locked
                button.textContent = '✓ Perfect';
                button.disabled = true;
                button.title = 'You achieved a perfect score on this quiz';
                button.style.background = '#10b981';
                button.style.color = 'white';
            }
        });

        // Update progress bars in main content
        for (let i = 1; i <= 4; i++) {
            const progressScore = document.getElementById(`progress-${i}`);
            const progressFill = document.getElementById(`progress-fill-${i}`);
            if (progressScore && progressFill) {
                const score = scoresMap[i] || 0;
                progressScore.textContent = `${score}/10`;
                progressFill.style.width = `${(score / 10) * 100}%`;
            }
        }
    } catch (e) {
        console.error('Error updating locked quizzes UI:', e);
    }
}

