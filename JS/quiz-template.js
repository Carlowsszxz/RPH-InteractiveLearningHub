// Get quiz ID from URL
const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get('quizId');

// Function to shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Function to create question with shuffled options
function createQuestionWithShuffledOptions(q) {
    const correctAnswer = q.correct;
    const shuffledOptions = shuffleArray(q.options);
    const correctOptionIndex = shuffledOptions.indexOf(correctAnswer);
    
    return {
        question: q.question,
        optionA: shuffledOptions[0],
        optionB: shuffledOptions[1],
        optionC: shuffledOptions[2],
        optionD: shuffledOptions[3],
        correctOption: `option${String.fromCharCode(65 + correctOptionIndex)}` // A, B, C, D
    };
}

let questions = [];
let totalQuestions = 0;

// Timer variables
let timerInterval = null;
let totalTimeInSeconds = 600; // 10 minutes
let timeRemaining = totalTimeInSeconds;
let quizStartTime = null;
let soundAlertsPlayed = { fiveMin: false, twoMin: false, thirtySec: false };

// Sound system
let soundEnabled = localStorage.getItem('quizSoundsMuted') !== 'true'; // Default: sounds ON
let masterVolume = parseFloat(localStorage.getItem('quizMasterVolume') || '0.7'); // Default: 70%
let soundTypes = {
    correct: localStorage.getItem('soundCorrect') !== 'false',
    wrong: localStorage.getItem('soundWrong') !== 'false',
    click: localStorage.getItem('soundClick') !== 'false',
    complete: localStorage.getItem('soundComplete') !== 'false'
};

function initQuiz() {
    if (quizId && quizData[quizId]) {
        const quiz = quizData[quizId];
        questions = quiz.questions.map((q, index) => createQuestionWithShuffledOptions(q));
        totalQuestions = questions.length;
        document.getElementById('total-score').textContent = totalQuestions;
        document.getElementById('total-questions-display').textContent = totalQuestions;
        document.getElementById('total-questions').textContent = totalQuestions;
        document.getElementById('quiz-title').textContent = quiz.title;
    } else {
        // Fallback or error
        questions = [];
        document.getElementById('quiz-title').textContent = 'Quiz Not Found';
    }
    NextQuestion(0);
    startTimer(); // Start the 10-minute timer
    initSoundToggle(); // Initialize sound toggle button state
    initSoundSettings(); // Initialize sound settings
    setupKeyboardShortcuts(); // Setup keyboard shortcuts
}

// Pause timer when tab is hidden (optional: remove if you want timer to continue in background)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Tab is hidden - timer continues counting
        // If you want to pause: stopTimer()
    } else {
        // Tab is visible again
        // If you paused: resume timer
    }
});

// Timer Functions
function startTimer() {
    quizStartTime = Date.now();
    timeRemaining = totalTimeInSeconds;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        updateProgressBar();
        
        if (timeRemaining <= 0) {
            handleTimeUp();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timerDisplay = document.getElementById('timer-display');
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Play sound alerts at specific times
    playSoundAlert();
    
    // Change color based on time remaining
    const timerContainer = document.querySelector('.timer-container');
    if (timeRemaining <= 120) { // 2 minutes
        timerContainer.classList.add('timer-critical');
        timerContainer.classList.remove('timer-warning');
    } else if (timeRemaining <= 300) { // 5 minutes
        timerContainer.classList.add('timer-warning');
        timerContainer.classList.remove('timer-critical');
    } else {
        timerContainer.classList.remove('timer-warning', 'timer-critical');
    }
}

function playSoundAlert() {
    // Play beep at 5 minutes (300 seconds)
    if (timeRemaining === 300 && !soundAlertsPlayed.fiveMin) {
        playBeep(440, 200); // A4 note, 200ms
        soundAlertsPlayed.fiveMin = true;
    }
    // Play beep at 2 minutes (120 seconds)
    else if (timeRemaining === 120 && !soundAlertsPlayed.twoMin) {
        playBeep(523, 300); // C5 note, 300ms
        soundAlertsPlayed.twoMin = true;
    }
    // Play beep at 30 seconds
    else if (timeRemaining === 30 && !soundAlertsPlayed.thirtySec) {
        playBeep(659, 400); // E5 note, 400ms
        soundAlertsPlayed.thirtySec = true;
    }
}

function playBeep(frequency, duration) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
        console.log('Audio not supported:', e);
    }
}

function updateProgressBar() {
    const progressFill = document.getElementById('timer-progress');
    const percentage = (timeRemaining / totalTimeInSeconds) * 100;
    progressFill.style.width = percentage + '%';
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function handleTimeUp() {
    stopTimer();
    alert('Time\'s up! The quiz has ended.');
    // Redirect to quizzes page
    window.location.href = 'quizzes.html';
}

// ==================== SOUND SYSTEM ====================

// Initialize sound toggle button
function initSoundToggle() {
    const soundIcon = document.getElementById('sound-icon');
    if (soundIcon) {
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    }
}

// Initialize sound settings
function initSoundSettings() {
    // Set volume slider
    const volumeSlider = document.getElementById('volume-slider');
    const volumeDisplay = document.getElementById('volume-display');
    if (volumeSlider && volumeDisplay) {
        volumeSlider.value = Math.round(masterVolume * 100);
        volumeDisplay.textContent = Math.round(masterVolume * 100) + '%';
    }
    
    // Set individual sound toggles
    document.getElementById('correct-sound-toggle').checked = soundTypes.correct;
    document.getElementById('wrong-sound-toggle').checked = soundTypes.wrong;
    document.getElementById('click-sound-toggle').checked = soundTypes.click;
    document.getElementById('complete-sound-toggle').checked = soundTypes.complete;
}

// Open sound settings modal
function openSoundSettings() {
    document.getElementById('sound-settings-modal').style.display = 'flex';
}

// Close sound settings modal
function closeSoundSettings() {
    document.getElementById('sound-settings-modal').style.display = 'none';
}

// Update volume
function updateVolume(value) {
    masterVolume = value / 100;
    localStorage.setItem('quizMasterVolume', masterVolume);
    document.getElementById('volume-display').textContent = value + '%';
}

// Toggle individual sound type
function toggleSoundType(type, enabled) {
    soundTypes[type] = enabled;
    localStorage.setItem('sound' + type.charAt(0).toUpperCase() + type.slice(1), enabled);
}

// Test sound
function testSound() {
    showSoundIndicator();
    playCorrectSound();
}

// Apply sound presets
function applyPreset(preset) {
    const presets = {
        silent: { volume: 0, sounds: { correct: false, wrong: false, click: false, complete: false } },
        low: { volume: 30, sounds: { correct: true, wrong: true, click: false, complete: true } },
        medium: { volume: 70, sounds: { correct: true, wrong: true, click: true, complete: true } },
        high: { volume: 100, sounds: { correct: true, wrong: true, click: true, complete: true } }
    };
    
    const config = presets[preset];
    if (config) {
        // Update volume
        masterVolume = config.volume / 100;
        localStorage.setItem('quizMasterVolume', masterVolume);
        document.getElementById('volume-slider').value = config.volume;
        document.getElementById('volume-display').textContent = config.volume + '%';
        
        // Update sound types
        Object.keys(config.sounds).forEach(type => {
            soundTypes[type] = config.sounds[type];
            localStorage.setItem('sound' + type.charAt(0).toUpperCase() + type.slice(1), config.sounds[type]);
            document.getElementById(type + '-sound-toggle').checked = config.sounds[type];
        });
        
        // Update master mute
        soundEnabled = config.volume > 0;
        localStorage.setItem('quizSoundsMuted', !soundEnabled);
        const soundIcon = document.getElementById('sound-icon');
        if (soundIcon) {
            soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
        }
        
        // Test the preset
        if (config.volume > 0) {
            setTimeout(() => testSound(), 200);
        }
    }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // M key to toggle mute (only if not typing in an input)
        if (e.key === 'm' || e.key === 'M') {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                toggleSound();
                showSoundIndicator();
                e.preventDefault();
            }
        }
    });
}

// Show sound playing indicator
function showSoundIndicator() {
    const indicator = document.getElementById('sound-indicator');
    if (indicator) {
        indicator.classList.add('active');
        setTimeout(() => {
            indicator.classList.remove('active');
        }, 500);
    }
}

// Haptic feedback (vibration for mobile)
function triggerHaptic(pattern = [10]) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// Toggle sound on/off
function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('quizSoundsMuted', !soundEnabled);
    const soundIcon = document.getElementById('sound-icon');
    if (soundIcon) {
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    }
}

// Master sound player using Web Audio API
function playSound(frequencies, durations, baseVolume = 0.3) {
    if (!soundEnabled) return;
    
    // Show visual indicator
    showSoundIndicator();
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        let startTime = audioContext.currentTime;
        const adjustedVolume = baseVolume * masterVolume; // Apply master volume
        
        frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            const duration = durations[index] || 0.15;
            gainNode.gain.setValueAtTime(adjustedVolume, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
            
            startTime += duration;
        });
    } catch (e) {
        console.log('Audio not supported:', e);
    }
}

// Play correct answer sound (ascending 3-note chime)
function playCorrectSound() {
    if (!soundTypes.correct) return;
    triggerHaptic([10, 5, 10]); // Short-Short-Short vibration
    const frequencies = [523, 659, 784]; // C5, E5, G5 (major chord)
    const durations = [0.15, 0.15, 0.15];
    playSound(frequencies, durations, 0.3);
}

// Play wrong answer sound (descending buzz)
function playWrongSound() {
    if (!soundTypes.wrong) return;
    triggerHaptic([50]); // Single longer vibration
    const frequencies = [329, 261]; // E4, C4 (descending)
    const durations = [0.2, 0.2];
    playSound(frequencies, durations, 0.25);
}

// Play click sound (short pop)
function playClickSound() {
    if (!soundTypes.click) return;
    triggerHaptic([5]); // Very short tap
    const frequencies = [800];
    const durations = [0.05];
    playSound(frequencies, durations, 0.2);
}

// Play quiz complete sound (4-note fanfare)
function playCompleteSound() {
    if (!soundTypes.complete) return;
    triggerHaptic([50, 50, 100]); // Celebration pattern
    const frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6
    const durations = [0.12, 0.12, 0.12, 0.25];
    playSound(frequencies, durations, 0.35);
}

// ==================== END SOUND SYSTEM ====================

let shuffledQuestions = [] //empty array to hold shuffled selected questions out of all available questions

function handleQuestions() {
    //function to shuffle and push all questions to shuffledQuestions array
    shuffledQuestions = [...questions];
}


let questionNumber = 1 //holds the current question number
let playerScore = 0  //holds the player score
let wrongAttempt = 0 //amount of wrong answers picked by player
let indexNumber = 0 //will be used in displaying next question

// function for displaying next question in the array to dom
//also handles displaying players and quiz information to dom
function NextQuestion(index) {
    handleQuestions()
    const currentQuestion = shuffledQuestions[index]
    document.getElementById("question-number").innerHTML = questionNumber
    document.getElementById("player-score").innerHTML = playerScore
    document.getElementById("display-question").innerHTML = currentQuestion.question;
    document.getElementById("option-one-label").innerHTML = currentQuestion.optionA;
    document.getElementById("option-two-label").innerHTML = currentQuestion.optionB;
    document.getElementById("option-three-label").innerHTML = currentQuestion.optionC;
    document.getElementById("option-four-label").innerHTML = currentQuestion.optionD;

    // Add click handlers to option labels
    document.querySelectorAll('.option').forEach(label => {
        label.addEventListener('click', () => {
            // Remove selected class from all options
            document.querySelectorAll('.option').forEach(l => l.classList.remove('selected'));
            // Add selected class to clicked option
            label.classList.add('selected');
            // Ensure the corresponding radio button is checked
            const inputId = label.getAttribute('for');
            if (inputId) {
                document.getElementById(inputId).checked = true;
            }
        });
    });
}


function checkForAnswer() {
    const currentQuestion = shuffledQuestions[indexNumber] //gets current Question
    const currentQuestionAnswer = currentQuestion.correctOption //gets current Question's answer
    const options = document.getElementsByName("option"); //gets all elements in dom with name of 'option' (in this the radio inputs)
    let correctOption = null
    let userSelectedOption = null

    options.forEach((option) => {
        if (option.value === currentQuestionAnswer) {
            //get's correct's radio input with correct answer
            correctOption = option.labels[0].id
        }
        if (option.checked) {
            userSelectedOption = option.labels[0].id
        }
    })

    //checking to make sure a radio input has been checked or an option being chosen
    if (options[0].checked === false && options[1].checked === false && options[2].checked === false && options[3].checked == false) {
        document.getElementById('option-modal').style.display = "flex"
    }

    // Remove selected class from all options before adding feedback
    options.forEach((option) => {
        if (option.labels[0]) {
            option.labels[0].classList.remove('selected');
        }
    })

    //checking if checked radio button is same as answer
    options.forEach((option) => {
        if (option.checked === true && option.value === currentQuestionAnswer) {
            // Correct answer - show green effect
            if (userSelectedOption) {
                document.getElementById(userSelectedOption).classList.add('correct');
                playCorrectSound(); // Play success chime
            }
            playerScore++ //adding to player's score
            indexNumber++ //adding 1 to index so has to display next question..
            //set to delay question number till when next question loads
            setTimeout(() => {
                questionNumber++
            }, 1000)
        }

        else if (option.checked && option.value !== currentQuestionAnswer) {
            // Incorrect answer - show red effect on selected option only
            if (userSelectedOption) {
                document.getElementById(userSelectedOption).classList.add('incorrect');
                playWrongSound(); // Play error buzz
            }
            wrongAttempt++ //adds 1 to wrong attempts
            indexNumber++
            //set to delay question number till when next question loads
            setTimeout(() => {
                questionNumber++
            }, 1000)
        }
    })
}



//save quiz progress to database
async function saveQuizProgress() {
    const userId = await getUserId();
    if (userId && window.supabaseClient) {
        try {
            // Calculate time spent (in seconds)
            const timeSpent = totalTimeInSeconds - timeRemaining;
            
            const { error } = await window.supabaseClient
                .from('user_quiz_scores')
                .upsert({ 
                    user_id: userId, 
                    quiz_id: quizId, 
                    score: playerScore,
                    time_spent: timeSpent
                }, { onConflict: 'user_id,quiz_id' });
            if (error) console.error('Error saving quiz progress:', error);
        } catch (e) {
            console.error('Error saving quiz progress:', e);
        }
    }
}

//called when the next button is called
function handleNextQuestion() {
    playClickSound(); // Play button click sound
    checkForAnswer() //check if player picked right or wrong option
    unCheckRadioButtons()

    // Save progress after answering
    saveQuizProgress();

    // Show loading state
    const btn = document.querySelector('.next-btn');
    btn.disabled = true;
    btn.textContent = 'Loading...';

    //delays next question displaying for a second just for some effects so questions don't rush in on player
    setTimeout(() => {
        if (indexNumber < totalQuestions) {
//displays next question as long as index number isn't greater than total
            NextQuestion(indexNumber)
        }
        else {
            handleEndGame()//ends game if index number greater than total
        }
        resetOptionBackground()

        // Reset button
        btn.disabled = false;
        btn.textContent = 'Next Question';
    }, 1000);
}

//sets options background back to null after display the right/wrong colors
function resetOptionBackground() {
    const options = document.getElementsByName("option");
    options.forEach((option) => {
        const label = option.labels[0];
        label.classList.remove('selected', 'correct', 'incorrect');
    })
}

// unchecking all radio buttons for next question(can be done with map or foreach loop also)
function unCheckRadioButtons() {
    const options = document.getElementsByName("option");
    for (let i = 0; i < options.length; i++) {
        options[i].checked = false;
    }
}

// function for when all questions being answered
async function handleEndGame() {
    stopTimer(); // Stop the timer when quiz ends
    let remark = null
    let remarkColor = null

    // condition check for player remark and remark color
    if (playerScore <= Math.floor(totalQuestions * 0.3)) {
        remark = "Bad Grades, Keep Practicing."
        remarkColor = "red"
    }
    else if (playerScore > Math.floor(totalQuestions * 0.3) && playerScore < Math.floor(totalQuestions * 0.7)) {
        remark = "Average Grades, You can do better."
        remarkColor = "orange"
    }
    else if (playerScore >= Math.floor(totalQuestions * 0.7)) {
        remark = "Excellent, Keep the good work going."
        remarkColor = "green"
    }
    const playerGrade = (playerScore / totalQuestions) * 100

    // Calculate time statistics
    const timeSpentSeconds = totalTimeInSeconds - timeRemaining;
    const timeSpentMinutes = Math.floor(timeSpentSeconds / 60);
    const timeSpentSecs = timeSpentSeconds % 60;
    const avgTimePerQuestion = Math.floor(timeSpentSeconds / totalQuestions);

    //data to display to score board
    document.getElementById('remarks').innerHTML = remark
    document.getElementById('remarks').style.color = remarkColor
    document.getElementById('wrong-answers').innerHTML = wrongAttempt
    document.getElementById('right-answers').innerHTML = playerScore
    document.getElementById('time-taken').innerHTML = `${timeSpentMinutes}m ${timeSpentSecs}s`
    document.getElementById('avg-time').innerHTML = `${avgTimePerQuestion}s`
    document.getElementById('score-modal').style.display = "flex"
    
    // Play completion sound
    playCompleteSound();

    // Save quiz score to database (already saved by saveQuizProgress on each question)
    // This is redundant but kept for final confirmation
    const userId = await getUserId();
    if (userId && window.supabaseClient) {
        try {
            const timeSpent = totalTimeInSeconds - timeRemaining;
            
            const { error } = await window.supabaseClient
                .from('user_quiz_scores')
                .upsert({ 
                    user_id: userId, 
                    quiz_id: quizId, 
                    score: playerScore,
                    time_spent: timeSpent
                }, { onConflict: 'user_id,quiz_id' });
            if (error) console.error('Error saving final quiz score:', error);
        } catch (e) {
            console.error('Error saving final quiz score:', e);
        }
    }

    // Mark quiz as locked in database if perfect score (100%)
    if (playerGrade === 100) {
        if (userId && window.supabaseClient) {
            try {
                const { error } = await window.supabaseClient
                    .from('user_locked_quizzes')
                    .insert([{ user_id: userId, quiz_id: quizId, locked_at: new Date().toISOString() }]);
                if (error) console.error('Error locking quiz:', error);
            } catch (e) {
                console.error('Error saving locked quiz:', e);
            }
        }
    }

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }

}

//closes score modal, resets game and reshuffles questions
function closeScoreModal() {
    questionNumber = 1
    playerScore = 0
    wrongAttempt = 0
    indexNumber = 0
    shuffledQuestions = []
    
    // Reset timer
    stopTimer()
    timeRemaining = totalTimeInSeconds
    soundAlertsPlayed = { fiveMin: false, twoMin: false, thirtySec: false }
    
    NextQuestion(indexNumber)
    document.getElementById('score-modal').style.display = "none"
    
    // Restart timer for new attempt
    startTimer()
}

//function to close warning modal
function closeOptionModal() {
    document.getElementById('option-modal').style.display = "none"
}