import { lightbox } from './lightbox.js';
import { sound } from './sound.js';
import { renderResults } from './results.js';
import { showToast } from './toast.js';

export function endGame() {
    const gameView = document.getElementById('view-game');
    const mainView = document.getElementById('view-main');
    if (gameView) {
        gameView.classList.add('hidden');
        gameView.innerHTML = '';
    }
    if (mainView) mainView.classList.remove('hidden');
}

export async function initGame(category, mode, rounds) {
    const container = document.getElementById('view-game');
    const mainView = document.getElementById('view-main');
    
    if (mainView) mainView.classList.add('hidden');
    if (container) {
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="text-center mt-6 py-12">
                <div class="glow-text text-2xl mb-4">⚡ Loading Game Session...</div>
                <div class="skeleton" style="height: 300px; max-width: 500px; margin: 0 auto;"></div>
            </div>
        `;
    }
    
    try {
        const res = await fetch('/api/game/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': localStorage.getItem('csrf_token') || ''
            },
            body: JSON.stringify({ category, mode, rounds })
        });
        
        const data = await res.json();
        
        if (!res.ok || !data.success) {
            showToast(data.error || "Failed to start game session.", 'error');
            endGame();
            return;
        }
        
        runGameEngine(data.data, category);
    } catch (e) {
        console.error("Game launch error", e);
        showToast("An error occurred starting the game.", 'error');
        endGame();
    }
}

function runGameEngine(sessionData, selectedCategory) {
    const { gameSessionId, mode, questions } = sessionData;
    const container = document.getElementById('view-game');

    let currentIdx = 0;
    let correctCount = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let totalTimeMs = 0;
    let wrongAnswers = [];
    let masteryChanges = [];
    
    let lifelines = {
        fiftyFifty: 1,
        skip: 1
    };

    const isClassicUntimed = mode === 'classic';
    const isUnlimited = questions.length >= 100 && sessionData.roundsRequested === 9999;

    let timerInterval = null;
    let timerTotalSeconds = parseInt(localStorage.getItem('timer_seconds') || '15', 10);
    let timerEnabled = !isClassicUntimed && localStorage.getItem('timer_enabled') !== 'false';
    let questionStartTime = Date.now();

    function startTimer(onTimeout) {
        clearInterval(timerInterval);
        const timerFill = document.getElementById('game-timer-fill');
        if (!timerFill || !timerEnabled) {
            if (timerFill && timerFill.parentElement) timerFill.parentElement.style.display = 'none';
            return;
        }

        let timeLeft = timerTotalSeconds;
        timerFill.style.width = '100%';
        timerFill.className = 'game-timer-fill';

        const timerText = document.getElementById('game-timer-text');
        const timerBadge = document.getElementById('game-timer-badge');
        if (timerText) timerText.innerText = `${Math.ceil(timeLeft)}s`;

        let lastSec = Math.ceil(timeLeft);

        timerInterval = setInterval(() => {
            timeLeft -= 0.1;
            const pct = Math.max(0, (timeLeft / timerTotalSeconds) * 100);
            timerFill.style.width = `${pct}%`;

            const currentSec = Math.max(0, Math.ceil(timeLeft));
            if (timerText) timerText.innerText = `${currentSec}s`;

            if (pct <= 30) {
                timerFill.className = 'game-timer-fill danger';
                if (timerBadge) timerBadge.classList.add('danger');
            } else if (pct <= 60) {
                timerFill.className = 'game-timer-fill warning';
                if (timerBadge) timerBadge.classList.add('warning');
            }

            if (currentSec <= 3 && currentSec !== lastSec && currentSec > 0) {
                sound.playTick();
            }
            lastSec = currentSec;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                onTimeout();
            }
        }, 100);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function renderCurrentQuestion() {
        if (currentIdx >= questions.length) {
            finishGame();
            return;
        }

        const q = questions[currentIdx];
        questionStartTime = Date.now();

        if (mode === 'hot_or_not') {
            renderHotOrNotQuestion(q);
        } else {
            renderClassicQuestion(q);
        }

        if (timerEnabled) {
            startTimer(() => {
                handleAnswerSubmission(null, 'none', true);
            });
        }
    }

    function renderClassicQuestion(q) {
        const totalDisplay = isUnlimited ? '∞' : questions.length;
        container.innerHTML = `
            <div class="game-header">
                <div class="progress-bar-container">
                    <div class="progress-fill" style="width: ${(currentIdx / questions.length) * 100}%"></div>
                </div>
                <div class="round-counter font-bold">Round ${q.questionNumber} / ${totalDisplay}</div>
                <div class="timer-badge" style="background: rgba(52, 211, 153, 0.12); border-color: rgba(52, 211, 153, 0.4); color: #34d399; font-size: 0.8rem; font-weight: 700;">
                    ⏳ Untimed
                </div>
                <button id="btn-quit-game" class="btn-icon" aria-label="Quit game" title="Finish and see results">✕</button>
            </div>

            <div class="game-content-split mt-2">
                <div class="game-image-card">
                    <img id="game-target-img" src="${q.imageUrl || ''}" alt="Guess Who" loading="eager">
                    <button class="zoom-trigger-btn" id="btn-zoom-game" aria-label="Zoom image">🔍</button>
                </div>

                <div class="game-options-grid" id="game-options-container">
                    ${q.options.map(opt => `
                        <button class="btn-option" data-id="${opt.id}">
                            <span>${opt.name}</span>
                            <span class="option-indicator"></span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="game-lifelines">
                <button class="btn-lifeline" id="btn-5050" ${lifelines.fiftyFifty <= 0 ? 'disabled' : ''}>
                    ✂️ 50/50 (${lifelines.fiftyFifty})
                </button>
                <button class="btn-lifeline" id="btn-skip" ${lifelines.skip <= 0 ? 'disabled' : ''}>
                    ⏭️ Skip (${lifelines.skip})
                </button>
            </div>
        `;

        attachGameListeners(q);
    }

    function renderHotOrNotQuestion(q) {
        container.innerHTML = `
            <div class="game-header">
                <div class="progress-bar-container">
                    <div class="progress-fill" style="width: ${(currentIdx / questions.length) * 100}%"></div>
                </div>
                <div class="round-counter">Round ${q.questionNumber} / ${questions.length}</div>
                <div class="timer-badge" id="game-timer-badge">⏱️ <span id="game-timer-text">${timerTotalSeconds}s</span></div>
                <button id="btn-quit-game" class="btn-icon" aria-label="Quit game">✕</button>
            </div>

            <div class="game-timer-container">
                <div id="game-timer-fill" class="game-timer-fill"></div>
            </div>

            <div class="hon-target-title glow-text">
                Which one is "${q.targetName}"?
            </div>

            <div class="hon-cards-grid">
                ${q.options.map(opt => `
                    <div class="hon-card" data-id="${opt.id}">
                        <img src="${opt.imageUrl || ''}" alt="Option Card">
                    </div>
                `).join('')}
            </div>

            <div class="game-lifelines">
                <button class="btn-lifeline" id="btn-skip" ${lifelines.skip <= 0 ? 'disabled' : ''}>
                    ⏭️ Skip (${lifelines.skip})
                </button>
            </div>
        `;

        attachGameListeners(q);
    }

    function attachGameListeners(q) {
        document.getElementById('btn-quit-game')?.addEventListener('click', () => {
            stopTimer();
            if (currentIdx > 0) {
                finishGame();
            } else {
                endGame();
                showToast('Game round ended.', 'info');
            }
        });

        document.getElementById('btn-zoom-game')?.addEventListener('click', () => {
            sound.playClick();
            // Open lightbox with name hidden to prevent cheating
            lightbox.open(q.imageUrl, { showCaption: false });
        });

        // 50/50 Lifeline
        document.getElementById('btn-5050')?.addEventListener('click', () => {
            if (lifelines.fiftyFifty <= 0) return;
            lifelines.fiftyFifty--;
            sound.playClick();
            
            const btn5050 = document.getElementById('btn-5050');
            if (btn5050) {
                btn5050.disabled = true;
                btn5050.innerText = `✂️ 50/50 (0)`;
            }

            // Disable the 2 pre-calculated incorrect options
            const disableIds = q.twoIncorrectIds || [];
            document.querySelectorAll('.btn-option').forEach(btn => {
                if (disableIds.includes(btn.dataset.id)) {
                    btn.disabled = true;
                    btn.style.opacity = '0.25';
                    btn.style.pointerEvents = 'none';
                }
            });
            showToast('50/50 applied: 2 wrong options eliminated!', 'info');
        });

        // Skip Lifeline
        document.getElementById('btn-skip')?.addEventListener('click', () => {
            if (lifelines.skip <= 0) return;
            lifelines.skip--;
            sound.playClick();
            stopTimer();
            showToast('Question skipped!', 'info');
            currentIdx++;
            renderCurrentQuestion();
        });

        // Option click handlers
        if (mode === 'hot_or_not') {
            document.querySelectorAll('.hon-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const selectedId = e.currentTarget.dataset.id;
                    handleAnswerSubmission(selectedId, 'none');
                });
            });
        } else {
            document.querySelectorAll('.btn-option').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const selectedId = e.currentTarget.dataset.id;
                    handleAnswerSubmission(selectedId, 'none');
                });
            });
        }
    }

    async function handleAnswerSubmission(selectedId, usedLifeline = 'none', isTimeout = false) {
        stopTimer();
        const q = questions[currentIdx];
        const answerTimeMs = Math.max(10, Date.now() - questionStartTime);
        totalTimeMs += answerTimeMs;

        // Disable options to prevent duplicate taps
        document.querySelectorAll('.btn-option, .hon-card').forEach(el => el.disabled = true);

        const answerId = crypto.randomUUID();

        try {
            const res = await fetch('/api/game/answers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': localStorage.getItem('csrf_token') || ''
                },
                body: JSON.stringify({
                    answerId,
                    gameSessionId,
                    questionId: q.questionId,
                    selectedCharacterId: selectedId,
                    usedLifeline,
                    answerTimeMs
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                const { isCorrect, correctCharacterId, correctName, correctCategory, addedBy, srs } = data.data;

                if (srs) {
                    masteryChanges.push({
                        name: correctName || 'Character',
                        oldMastery: srs.oldMastery,
                        newMastery: srs.newMastery,
                        intervalDays: srs.intervalDays
                    });
                }

                if (isCorrect) {
                    sound.playCorrect();
                    correctCount++;
                    currentStreak++;
                    if (currentStreak > maxStreak) maxStreak = currentStreak;

                    if (currentStreak >= 5) {
                        sound.playStreak();
                    }

                    if (mode === 'hot_or_not') {
                        document.querySelector(`.hon-card[data-id="${selectedId}"]`)?.classList.add('correct');
                    } else {
                        const selectedBtn = document.querySelector(`.btn-option[data-id="${selectedId}"]`);
                        if (selectedBtn) {
                            selectedBtn.classList.add('correct');
                            selectedBtn.querySelector('.option-indicator').innerText = '✓';
                        }
                    }
                } else {
                    sound.playWrong();
                    currentStreak = 0;

                    if (mode === 'hot_or_not') {
                        if (selectedId) document.querySelector(`.hon-card[data-id="${selectedId}"]`)?.classList.add('wrong');
                        document.querySelector(`.hon-card[data-id="${correctCharacterId}"]`)?.classList.add('correct');
                    } else {
                        if (selectedId) {
                            const selectedBtn = document.querySelector(`.btn-option[data-id="${selectedId}"]`);
                            if (selectedBtn) {
                                selectedBtn.classList.add('wrong');
                                selectedBtn.querySelector('.option-indicator').innerText = '✗';
                            }
                        }
                        const correctBtn = document.querySelector(`.btn-option[data-id="${correctCharacterId}"]`);
                        if (correctBtn) {
                            correctBtn.classList.add('correct');
                            correctBtn.querySelector('.option-indicator').innerText = '✓';
                        }
                    }

                    const wrongOption = q.options?.find(o => o.id === selectedId);
                    wrongAnswers.push({
                        questionId: q.questionId,
                        imageUrl: q.imageUrl || (mode === 'hot_or_not' ? q.options?.find(o => o.id === correctCharacterId)?.imageUrl : ''),
                        correctName: correctName || 'Target',
                        category: correctCategory,
                        addedBy: addedBy,
                        wrongGuessName: wrongOption ? wrongOption.name : (isTimeout ? '⏰ Timed Out' : 'None')
                    });

                    // Sudden Death mode ends immediately on first wrong answer
                    if (mode === 'sudden_death') {
                        setTimeout(() => {
                            finishGame();
                        }, 1200);
                        return;
                    }
                }

                // Advance to next question after short visual delay
                setTimeout(() => {
                    currentIdx++;
                    renderCurrentQuestion();
                }, 1000);

            } else {
                showToast(data.error || "Failed to submit answer", 'error');
                currentIdx++;
                renderCurrentQuestion();
            }

        } catch (e) {
            console.error("Answer submission error", e);
            currentIdx++;
            renderCurrentQuestion();
        }
    }

    function finishGame() {
        stopTimer();
        renderResults({
            totalQuestions: mode === 'sudden_death' ? currentIdx : questions.length,
            correctCount,
            maxStreak,
            totalTimeMs,
            wrongAnswers,
            masteryChanges
        }, () => {
            initGame(selectedCategory, mode, questions.length);
        }, () => {
            endGame();
        });
    }

    renderCurrentQuestion();
}
