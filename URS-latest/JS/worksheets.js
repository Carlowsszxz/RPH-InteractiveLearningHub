// Quiz Data - All Questions
const quizData = [
    {
        id: 1,
        type: 'multiple-choice',
        question: 'What year did the First Catholic Mass occur in the Philippines?',
        options: ['1519', '1521', '1523', '1525'],
        correctAnswer: 1,
        feedback: 'The first Catholic Mass in the Philippines was held in 1521, marking the beginning of Christian evangelization in the islands.'
    },
    {
        id: 2,
        type: 'multiple-choice',
        question: 'The Cavite Mutiny occurred in which year?',
        options: ['1872', '1896', '1898', '1901'],
        correctAnswer: 0,
        feedback: 'The Cavite Mutiny took place on January 20, 1872, involving Filipino soldiers in Cavite.'
    },
    {
        id: 3,
        type: 'fill-blank',
        question: 'The three Filipino priests executed in 1872 were known as ______.',
        correctAnswer: 'gomburza',
        feedback: 'GomBurZa stands for Gomez, Burgos, and Zamora - the three Filipino secular priests executed as a result of the Cavite Mutiny.'
    },
    {
        id: 4,
        type: 'multiple-choice',
        question: 'Who are considered the national heroes associated with the Cry of Rebellion?',
        options: ['GomBurZa', 'Rizal and Bonifacio', 'Aguinaldo and Aguinaldo', 'Jacinto and Reyes'],
        correctAnswer: 1,
        feedback: 'Jose Rizal and Andres Bonifacio are major figures associated with the early nationalist movement and the Cry of Rebellion.'
    },
    {
        id: 5,
        type: 'short-answer',
        question: 'What was the main cause of the Cavite Mutiny? (Brief answer)',
        correctAnswer: 'grievances of Filipino soldiers or unfair treatment of Filipino soldiers',
        feedback: 'The Cavite Mutiny was caused by grievances among Filipino soldiers who faced unfair treatment and felt marginalized by the Spanish colonial authorities.'
    },
    {
        id: 6,
        type: 'multiple-choice',
        question: 'The Retraction of Rizal refers to his alleged disavowal of which?',
        options: ['His novels', 'Filipino nationalism', 'His family', 'The Church'],
        correctAnswer: 1,
        feedback: 'Rizal\'s retraction allegedly meant he disavowed his nationalist and anti-clerical writings, though its authenticity remains historically debated.'
    },
    {
        id: 7,
        type: 'fill-blank',
        question: 'Jose Rizal was executed by the Spanish colonial government on ______.',
        correctAnswer: 'december 30 1896',
        feedback: 'Jose Rizal was executed on December 30, 1896, in Bagumbayan, making him one of the Philippines\' most revered national heroes.'
    },
    {
        id: 8,
        type: 'multiple-choice',
        question: 'Which of the following is a core theme of the Cry of Rebellion?',
        options: ['Loyalty to Spain', 'Filipino national consciousness and independence', 'Religious conversion', 'Colonial expansion'],
        correctAnswer: 1,
        feedback: 'The Cry of Rebellion marked the beginning of organized Filipino national consciousness and the fight for independence from Spanish colonial rule.'
    },
    {
        id: 9,
        type: 'short-answer',
        question: 'Name one significant impact of the First Mass on Philippine history.',
        correctAnswer: 'christianization or spread of christianity or spanish colonization or influence of the church',
        feedback: 'The First Mass marked the beginning of Christianization of the Philippine islands and solidified Spanish colonial authority through religious conversion.'
    },
    {
        id: 10,
        type: 'multiple-choice',
        question: 'What was the outcome of the Cavite Mutiny?',
        options: [
            'Filipino soldiers successfully gained independence',
            'Spanish soldiers were defeated',
            'It was suppressed by Spanish authorities, leading to executions including the GomBurZa priests',
            'It led to immediate reforms in the military'
        ],
        correctAnswer: 2,
        feedback: 'The mutiny was quickly suppressed by Spanish authorities, and its aftermath resulted in the execution of three Filipino secular priests (GomBurZa), which intensified Filipino nationalist sentiment.'
    }
];

// Quiz State
let currentQuestion = 0;
let userAnswers = {};
let quizStarted = false;
let quizCompleted = false;
let currentSection = 'hub';

// ===== PROFILE LOADING =====

function loadProfileFromStorage() {
    try {
        // Load from localStorage using selectors like interactive-tasks does
        const savedName = localStorage.getItem('profileName');
        const savedBio = localStorage.getItem('profileBio');
        const savedAvatar = localStorage.getItem('profileAvatar');

        if (savedName || savedBio || savedAvatar) {
            if (savedName && document.querySelector('.profile-name')) {
                document.querySelector('.profile-name').textContent = savedName;
            }
            if (savedBio && document.querySelector('.profile-email')) {
                document.querySelector('.profile-email').textContent = savedBio;
            }
            if (savedAvatar && document.querySelector('.profile-avatar')) {
                document.querySelector('.profile-avatar').src = savedAvatar;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// ===== HUB NAVIGATION =====

function navigateToSection(section) {
    // Hide all sections
    document.querySelectorAll('[id*="Section"], .worksheets-hub').forEach(el => {
        el.style.display = 'none';
    });

    // Show selected section
    currentSection = section;

    if (section === 'hub') {
        document.querySelector('.worksheets-hub').style.display = 'block';
    } else if (section === 'downloads') {
        document.getElementById('worksheetsSection').style.display = 'block';
    } else if (section === 'reflections') {
        document.getElementById('reflectionsSection').style.display = 'block';
        loadReflections();
    } else if (section === 'quiz') {
        document.getElementById('quizSection').style.display = 'block';
        if (!quizStarted) {
            initializeQuiz();
        }
    }

    // Scroll to top
    window.scrollTo(0, 0);
}

function goBackToHub() {
    navigateToSection('hub');
}

// ===== REFLECTIONS MANAGEMENT =====

async function loadReflections() {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        console.log('No user logged in');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('reflections')
            .select('*')
            .eq('user_email', userEmail)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading reflections:', error);
            return;
        }

        // Populate reflections list
        const reflectionsList = document.getElementById('reflectionsList');
        if (!reflectionsList) return;

        reflectionsList.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(reflection => {
                const reflectionDiv = document.createElement('div');
                reflectionDiv.className = 'reflection-item';
                const date = new Date(reflection.created_at).toLocaleDateString();
                
                reflectionDiv.innerHTML = `
                    <div class="reflection-item-header">
                        <span class="reflection-item-topic">${reflection.topic}</span>
                        <span class="reflection-item-date">${date}</span>
                    </div>
                    <p class="reflection-item-text">${reflection.text}</p>
                `;
                reflectionsList.appendChild(reflectionDiv);
            });
        } else {
            reflectionsList.innerHTML = '<p style="color: #7A6B5F; text-align: center; padding: 20px;">No reflections yet. Start by writing your first one!</p>';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function saveReflection() {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        alert('Please log in first');
        return;
    }

    const topicSelect = document.getElementById('reflectionTopic');
    const textArea = document.getElementById('reflectionText');

    const topic = topicSelect.value;
    const text = textArea.value.trim();

    if (!topic || !text) {
        alert('Please select a topic and write your reflection');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('reflections')
            .insert([
                {
                    user_email: userEmail,
                    topic: topic,
                    text: text,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('Error saving reflection:', error);
            alert('Error saving reflection: ' + error.message);
            return;
        }

        // Clear form
        topicSelect.value = '';
        textArea.value = '';

        // Reload reflections list
        await loadReflections();
        alert('Reflection saved successfully!');
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving reflection');
    }
}

// ===== WORKSHEET DOWNLOADS =====

function downloadWorksheet(topic) {
    // Create a simple text file with worksheet content
    const worksheetContent = `
WORKSHEET: ${topic}
==================================================

Instructions:
Read the assigned materials carefully and answer the following questions in your own words.

Learning Outcomes:
After completing this worksheet, you should be able to:
- Understand key concepts related to ${topic}
- Analyze important historical events
- Reflect on the significance of this topic

Questions:
1. What are the main events discussed in this topic?

Answer: ________________________________________________________________
________________________________________________________________________

2. Who were the key figures involved?

Answer: ________________________________________________________________
________________________________________________________________________

3. What were the causes and effects?

Answer: ________________________________________________________________
________________________________________________________________________

4. How does this topic relate to Philippine history?

Answer: ________________________________________________________________
________________________________________________________________________

5. What questions do you still have about this topic?

Answer: ________________________________________________________________
________________________________________________________________________

Date Completed: ________________
Student Name: ________________________________________________________________

Please submit your completed worksheet to your teacher or upload it to your learning portal.
    `;

    // Create and download file
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(worksheetContent));
    element.setAttribute('download', `${topic.replace(/\s+/g, '-').toLowerCase()}-worksheet.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function downloadImage(imagePath) {
    // Create and download image file
    const element = document.createElement('a');
    element.setAttribute('href', imagePath);
    element.setAttribute('download', imagePath.split('/').pop());
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function previewImage(imagePath) {
    // Create a modal to preview the image
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 12px;
        max-width: 90vw;
        max-height: 90vh;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: #f0f0f0;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        font-size: 18px;
        cursor: pointer;
        color: #666;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const image = document.createElement('img');
    image.src = imagePath;
    image.style.cssText = `
        max-width: 100%;
        max-height: 80vh;
        object-fit: contain;
        border-radius: 8px;
    `;

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(image);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    closeBtn.onclick = () => document.body.removeChild(modal);
    modal.onclick = (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    };
}

function previewWorksheet(topic) {
    // Create a modal to preview the worksheet
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        font-family: 'Georgia', serif;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
    `;

    const worksheetContent = `
        <h2 style="color: #5C3422; margin-bottom: 20px;">WORKSHEET: ${topic}</h2>
        <div style="border-top: 2px solid #5C3422; margin-bottom: 20px;"></div>
        
        <h3 style="color: #51513E;">Instructions:</h3>
        <p style="margin-bottom: 20px; line-height: 1.6;">Read the assigned materials carefully and answer the following questions in your own words.</p>
        
        <h3 style="color: #51513E;">Learning Outcomes:</h3>
        <ul style="margin-bottom: 20px; line-height: 1.6;">
            <li>Understand key concepts related to ${topic}</li>
            <li>Analyze important historical events</li>
            <li>Reflect on the significance of this topic</li>
        </ul>
        
        <h3 style="color: #51513E;">Questions:</h3>
        <ol style="line-height: 1.8;">
            <li>What are the main events discussed in this topic?<br><span style="color: #999;">Answer: _______________________________</span></li><br>
            <li>Who were the key figures involved?<br><span style="color: #999;">Answer: _______________________________</span></li><br>
            <li>What were the causes and effects?<br><span style="color: #999;">Answer: _______________________________</span></li><br>
            <li>How does this topic relate to Philippine history?<br><span style="color: #999;">Answer: _______________________________</span></li><br>
            <li>What questions do you still have about this topic?<br><span style="color: #999;">Answer: _______________________________</span></li>
        </ol>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p><strong>Date Completed:</strong> ________________</p>
            <p><strong>Student Name:</strong> ____________________________________</p>
        </div>
    `;

    modalContent.innerHTML = worksheetContent;
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    closeBtn.onclick = () => document.body.removeChild(modal);
    modal.onclick = (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    };
}

// ===== QUIZ FUNCTIONALITY =====

function initializeQuiz() {
    quizStarted = true;
    quizCompleted = false;
    currentQuestion = 0;
    userAnswers = {};
    
    document.getElementById('quizContainer').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';
    
    renderQuestion();
}

function renderQuestion() {
    const question = quizData[currentQuestion];
    const quizContent = document.getElementById('quizContent');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

    // Update progress
    const progress = ((currentQuestion + 1) / quizData.length) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = `Question ${currentQuestion + 1} of ${quizData.length}`;

    let questionHTML = `
        <div class="question-card">
            <div class="question-title">
                <span class="question-number">${currentQuestion + 1}</span>
                <span class="question-text">${question.question}</span>
            </div>
    `;

    if (question.type === 'multiple-choice') {
        questionHTML += '<div class="options-list">';
        question.options.forEach((option, index) => {
            const isSelected = userAnswers[currentQuestion] === index;
            questionHTML += `
                <div class="option-item ${isSelected ? 'selected' : ''}" onclick="selectOption(${index})">
                    <div class="option-radio"></div>
                    ${option}
                </div>
            `;
        });
        questionHTML += '</div>';
    } else if (question.type === 'fill-blank') {
        const userAnswer = userAnswers[currentQuestion] || '';
        questionHTML += `
            <p class="fill-blank-text">
                ${question.question.replace('______', `<input type="text" class="blank-input" id="blankAnswer" value="${userAnswer}" onchange="selectOption(this.value)" />`)}<br>
            </p>
        `;
    } else if (question.type === 'short-answer') {
        const userAnswer = userAnswers[currentQuestion] || '';
        questionHTML += `
            <textarea class="short-answer-input" id="shortAnswer" onchange="selectOption(this.value)">${userAnswer}</textarea>
        `;
    }

    questionHTML += '</div>';
    quizContent.innerHTML = questionHTML;

    // Update button states
    const prevBtn = document.querySelector('.btn-prev');
    const nextBtn = document.querySelector('.btn-next');
    
    if (prevBtn) {
        prevBtn.disabled = currentQuestion === 0;
        prevBtn.onclick = previousQuestion;
    }
    
    if (nextBtn) {
        nextBtn.disabled = userAnswers[currentQuestion] === undefined;
        nextBtn.textContent = currentQuestion === quizData.length - 1 ? 'Submit Quiz' : 'Next →';
        nextBtn.onclick = nextQuestion;
    }
}

function selectOption(answer) {
    userAnswers[currentQuestion] = answer;
    document.querySelector('.btn-next').disabled = false;
    renderQuestion();
}

function previousQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
    }
}

function nextQuestion() {
    if (currentQuestion < quizData.length - 1) {
        currentQuestion++;
        renderQuestion();
    } else {
        submitQuiz();
    }
}

function submitQuiz() {
    const score = calculateScore();
    displayResults(score);
    quizCompleted = true;
    saveQuizResultsToSupabase(score);
}

function calculateScore() {
    let correct = 0;

    quizData.forEach((question, index) => {
        let isCorrect = false;

        if (question.type === 'multiple-choice') {
            isCorrect = userAnswers[index] === question.correctAnswer;
        } else if (question.type === 'fill-blank') {
            const userAnswer = String(userAnswers[index] || '').toLowerCase().trim();
            const correctAnswers = question.correctAnswer.split(' or ');
            isCorrect = correctAnswers.some(answer => {
                return userAnswer.includes(answer.toLowerCase().trim());
            });
        } else if (question.type === 'short-answer') {
            const userAnswer = String(userAnswers[index] || '').toLowerCase().trim();
            const correctAnswers = question.correctAnswer.split(' or ');
            isCorrect = correctAnswers.some(answer => {
                const correctKeywords = answer.toLowerCase().trim().split(' ');
                return correctKeywords.some(keyword => userAnswer.includes(keyword));
            });
        }

        if (isCorrect) correct++;
    });

    return Math.round((correct / quizData.length) * 100);
}

function displayResults(score) {
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'block';

    const percentage = score;
    let message = '';

    if (percentage >= 80) {
        message = 'Excellent! You have a strong understanding of this material.';
    } else if (percentage >= 60) {
        message = 'Good! You understand the main concepts. Keep reviewing the material.';
    } else if (percentage >= 40) {
        message = 'Fair. Consider reviewing the material and trying again.';
    } else {
        message = 'Keep studying! Review the material and try the quiz again.';
    }

    const scorePercentageEl = document.querySelector('.score-percentage');
    const scoreMessageEl = document.querySelector('.score-message');
    
    if (scorePercentageEl) scorePercentageEl.textContent = percentage + '%';
    if (scoreMessageEl) scoreMessageEl.textContent = message;

    // Calculate stats
    const correct = Math.round((percentage / 100) * quizData.length);
    const incorrect = quizData.length - correct;

    // Update result stats
    const resultStats = document.querySelectorAll('.result-stat strong');
    if (resultStats.length >= 3) {
        resultStats[0].textContent = correct;
        resultStats[1].textContent = incorrect;
        resultStats[2].textContent = quizData.length;
    }
}

async function saveQuizResultsToSupabase(score) {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return;

    try {
        const { error } = await supabaseClient
            .from('quiz_records')
            .insert([
                {
                    user_email: userEmail,
                    quiz_name: 'Philippine History - Lessons 1-4',
                    score: score,
                    total_questions: quizData.length,
                    answers: JSON.stringify(userAnswers),
                    completed_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('Error saving quiz results:', error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function downloadResults() {
    const score = calculateScore();
    const resultsText = `
QUIZ RESULTS
==================================================

Quiz: Philippine History - Lessons 1-4
Student Email: ${localStorage.getItem('userEmail')}
Date Completed: ${new Date().toLocaleString()}

SCORE: ${score}%

Correct Answers: ${Math.round((score / 100) * quizData.length)}
Total Questions: ${quizData.length}

DETAILED RESULTS:
--------------------------------------------------
${Object.keys(userAnswers).map((index) => {
    const question = quizData[index];
    const answer = userAnswers[index];
    let result = `\nQ${parseInt(index) + 1}: ${question.question}\nYour Answer: ${answer}\n`;
    
    if (question.type === 'multiple-choice') {
        result += `Correct Answer: ${question.options[question.correctAnswer]}\n`;
    } else {
        result += `Correct Answer: ${question.correctAnswer}\n`;
    }
    
    return result;
}).join('\n')}

Thank you for completing the quiz!
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(resultsText));
    element.setAttribute('download', `quiz-results-${new Date().getTime()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function printResults() {
    window.print();
}

function retakeQuiz() {
    quizStarted = false;
    quizCompleted = false;
    currentQuestion = 0;
    userAnswers = {};
    
    initializeQuiz();
}

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', function() {
    // Initialize with hub view
    navigateToSection('hub');

    // Load user profile with retry logic
    loadProfileFromStorage();
    setInterval(loadProfileFromStorage, 1000);

    // Setup dropdown functionality
    setupDropdowns();

    // Setup quiz button listeners
    const downloadBtn = document.getElementById('downloadBtn');
    const printBtn = document.getElementById('printBtn');
    const retakeBtn = document.getElementById('retakeBtn');

    if (downloadBtn) downloadBtn.addEventListener('click', downloadResults);
    if (printBtn) printBtn.addEventListener('click', printResults);
    if (retakeBtn) retakeBtn.addEventListener('click', retakeQuiz);

    // ==================== LOGOUT BUTTON ====================
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                // Clear all local storage
                localStorage.clear();
                sessionStorage.clear();
                console.log('Cleared localStorage and sessionStorage');

                // Sign out from Supabase globally
                const supabaseClient = await getSupabaseClient();
                const { error } = await supabaseClient.auth.signOut({ scope: 'global' });
                if (error) {
                    console.error('Supabase signOut error:', error);
                } else {
                    console.log('Supabase signOut successful');
                }
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                // Force redirect to index after clearing everything
                window.location.href = 'index.html';
            }
        });
    }

    // ==================== LEFT SIDEBAR TOGGLE ====================
    const worksheetsMobileToggle = document.getElementById('worksheetsMobileToggle');
    const sidebar = document.getElementById('leftSidebar');
    
    console.log('worksheetsMobileToggle:', worksheetsMobileToggle);
    console.log('sidebar:', sidebar);

    if (worksheetsMobileToggle && sidebar) {
        worksheetsMobileToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Mobile toggle button clicked!');
            console.log('Before toggle:', sidebar.className);
            sidebar.classList.toggle('mobile-open');
            console.log('After toggle:', sidebar.className);
        });
    } else {
        console.warn('Mobile toggle or sidebar element not found');
    }
});

function setupDropdowns() {
    const dropdownButtons = document.querySelectorAll('.sidebar-nav .nav-item-dropdown > .nav-item');
    
    dropdownButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const parent = this.parentElement;
            parent.classList.toggle('open');
            
            // Close other dropdowns
            document.querySelectorAll('.sidebar-nav .nav-item-dropdown').forEach(dropdown => {
                if (dropdown !== parent) {
                    dropdown.classList.remove('open');
                }
            });
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.sidebar-nav .nav-item-dropdown')) {
            document.querySelectorAll('.sidebar-nav .nav-item-dropdown').forEach(dropdown => {
                dropdown.classList.remove('open');
            });
        }
    });
}
