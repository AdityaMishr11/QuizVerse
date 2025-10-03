
let questions = [];
let score = 0;
let questionNumber = 0;
let currentQuestionIndex = 0;
let timeLeft = 30;
let timerInterval;
let attemptCount = 0;

// Initialize attempt counter for this browser session
try {
    if (sessionStorage.getItem('quizverse_attempt_count_v1') === null) {
        sessionStorage.setItem('quizverse_attempt_count_v1', '0');
    }
} catch {}

const landingPage = document.getElementById('landing-page');
const quizScreen = document.getElementById('quiz-screen');
const scoreboardScreen = document.getElementById('scoreboard-screen');
const startQuizBtn = document.getElementById('start-quiz-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const questionCounter = document.getElementById('question-counter');
const progressBarFull = document.getElementById('progress-bar-full');
const timer = document.getElementById('timer');
const questionText = document.getElementById('question-text');
const answerButtons = document.getElementById('answer-buttons');
const scoreText = document.getElementById('score-text');
const topCta = document.querySelector('.top-cta');
const attemptsEl = document.getElementById('attempts');

startQuizBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', () => {
    scoreboardScreen.classList.add('hidden');
    landingPage.classList.remove('hidden');
});

// Mobile-friendly tooltip toggle on tap
if (topCta) {
    let tooltipVisible = false;
    topCta.addEventListener('click', (e) => {
        const isTouch = matchMedia('(hover: none)').matches;
        if (isTouch) {
            e.preventDefault();
            tooltipVisible = !tooltipVisible;
            if (tooltipVisible) {
                topCta.classList.add('tooltip-visible');
            } else {
                topCta.classList.remove('tooltip-visible');
            }
        }
    });
    // Hide tooltip when clicking outside
    document.addEventListener('click', (e) => {
        const isTouch = matchMedia('(hover: none)').matches;
        if (isTouch && tooltipVisible && !topCta.contains(e.target)) {
            tooltipVisible = false;
            topCta.classList.remove('tooltip-visible');
        }
    }, true);
}

async function fetchQuestions() {
    try {
        const response = await fetch('https://opentdb.com/api.php?amount=10');
        const data = await response.json();
        questions = data.results.map(apiQuestion => {
            const formattedQuestion = {
                question: apiQuestion.question
            };
            const answerChoices = [...apiQuestion.incorrect_answers, apiQuestion.correct_answer];
            formattedQuestion.answers = answerChoices.sort(() => Math.random() - 0.5).map(answer => {
                return { text: answer, correct: answer === apiQuestion.correct_answer }
            });
            return formattedQuestion;
        });
    } catch (error) {
        console.error("Error fetching questions: ", error);
        alert("Failed to load questions. Please try again later.");
    }
}

async function startGame() {
    landingPage.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    await fetchQuestions();
    currentQuestionIndex = 0;
    score = 0;
    questionNumber = 0;
    if (questions.length > 0) {
        nextQuestion();
    }
}

function nextQuestion() {
    resetState();
    if (questionNumber < questions.length) {
        questionNumber++;
        showQuestion(questions[currentQuestionIndex]);
        updateProgressBar();
        startTimer();
    } else {
        showScoreboard();
    }
}

function showQuestion(question) {
    questionCounter.innerText = `Question ${questionNumber} / ${questions.length}`;
    questionText.innerHTML = question.question;
    question.answers.forEach(answer => {
        const button = document.createElement('button');
        button.innerHTML = answer.text;
        button.classList.add('btn');
        if (answer.correct) {
            button.dataset.correct = answer.correct;
        }
        button.addEventListener('click', selectAnswer);
        answerButtons.appendChild(button);
    });
}

function resetState() {
    clearStatusClass(document.body);
    while (answerButtons.firstChild) {
        answerButtons.removeChild(answerButtons.firstChild);
    }
    clearInterval(timerInterval);
    timeLeft = 30;
    timer.innerText = timeLeft;
}

function selectAnswer(e) {
    clearInterval(timerInterval);
    const selectedButton = e.target;
    const correct = selectedButton.dataset.correct;
    setStatusClass(document.body, correct);
    Array.from(answerButtons.children).forEach(button => {
        setStatusClass(button, button.dataset.correct);
        button.disabled = true;
    });
    if (correct) {
        score++;
    }
    setTimeout(() => {
        currentQuestionIndex++;
        nextQuestion();
    }, 2000);
}

function setStatusClass(element, correct) {
    clearStatusClass(element);
    if (correct) {
        element.classList.add('correct');
    } else {
        element.classList.add('incorrect');
    }
}

function clearStatusClass(element) {
    element.classList.remove('correct');
    element.classList.remove('incorrect');
}

function updateProgressBar() {
    const progress = (questionNumber / questions.length) * 100;
    progressBarFull.style.width = `${progress}%`;
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        timer.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            currentQuestionIndex++;
            nextQuestion();
        }
    }, 1000);
}

function showScoreboard() {
    quizScreen.classList.add('hidden');
    scoreboardScreen.classList.remove('hidden');
    attemptCount = getAttemptCount() + 1; // display next attempt number
    scoreText.innerHTML = `Attempt #<strong>${attemptCount}</strong>: You scored <strong>${score}</strong> out of <strong>${questions.length}</strong>!`;
    saveAttempt({ attempt: attemptCount, score, total: questions.length, date: Date.now() });
    incrementAttemptCount(); // persist the increment after displaying/saving
    renderAttemptsHistory();
}


// Attempts history (sessionStorage-based)
const ATTEMPTS_KEY = 'quizverse_attempts_v1';
const ATTEMPT_KEY = 'quizverse_attempt_count_v1';

function loadAttempts() {
    try {
        const raw = sessionStorage.getItem(ATTEMPTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveAttempts(entries) {
    try {
        sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(entries));
    } catch {}
}

function saveAttempt(entry) {
    const entries = loadAttempts();
    entries.unshift(entry); // latest first
    const capped = entries.slice(0, 10); // keep last 10 attempts
    saveAttempts(capped);
}

function renderAttemptsHistory() {
    if (!attemptsEl) return;
    const entries = loadAttempts();
    if (!entries.length) {
        attemptsEl.innerHTML = '';
        return;
    }
    const items = entries.map((e) => {
        const percent = Math.round((e.score / e.total) * 100);
        return `<li><span>Attempt ${e.attempt}</span><span>${e.score}/${e.total} (${percent}%)</span></li>`;
    }).join('');
    attemptsEl.innerHTML = `<h2>Your Attempts</h2><ul>${items}</ul>`;
}

function getAttemptCount() {
    try {
        const raw = sessionStorage.getItem(ATTEMPT_KEY);
        return raw ? parseInt(raw, 10) || 0 : 0;
    } catch {
        return 0;
    }
}

function incrementAttemptCount() {
    try {
        const current = getAttemptCount();
        sessionStorage.setItem(ATTEMPT_KEY, String(current + 1));
    } catch {}
}
