import { lightbox } from './lightbox.js';
import { sound } from './sound.js';

export function renderResults(resultsData, onRestart, onHome) {
    const container = document.getElementById('view-game');
    if (!container) return;

    const {
        totalQuestions,
        correctCount,
        maxStreak,
        totalTimeMs,
        wrongAnswers = [],
        masteryChanges = []
    } = resultsData;

    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const avgTimeSec = totalQuestions > 0 ? ((totalTimeMs / totalQuestions) / 1000).toFixed(1) : '0.0';

    if (percentage >= 80) {
        sound.playWin();
    }

    renderStage1();

    function renderStage1() {
        container.innerHTML = `
            <div class="results-stage text-center">
                <h1 class="glow-text text-2xl mb-4">🏆 Round Complete!</h1>
                
                <div class="score-circular-container">
                    <svg class="score-circular-svg" width="180" height="180" viewBox="0 0 160 160">
                        <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="var(--accent-purple)" />
                                <stop offset="50%" stop-color="var(--accent-pink)" />
                                <stop offset="100%" stop-color="var(--accent-cyan)" />
                            </linearGradient>
                        </defs>
                        <circle class="score-circular-bg" cx="80" cy="80" r="70" />
                        <circle class="score-circular-progress" id="score-ring" cx="80" cy="80" r="70" />
                    </svg>
                    <div class="score-circular-text glow-text">${percentage}%</div>
                </div>

                <div class="results-stats-row">
                    <div class="result-stat-box">
                        <div class="result-stat-value">${correctCount} / ${totalQuestions}</div>
                        <div class="result-stat-label">Score</div>
                    </div>
                    <div class="result-stat-box">
                        <div class="result-stat-value">🔥 ${maxStreak}</div>
                        <div class="result-stat-label">Max Streak</div>
                    </div>
                    <div class="result-stat-box">
                        <div class="result-stat-value">⚡ ${avgTimeSec}s</div>
                        <div class="result-stat-label">Avg Speed</div>
                    </div>
                </div>

                <div class="flex flex-col gap-3 mt-6">
                    ${wrongAnswers.length > 0 ? `
                        <button id="btn-goto-review" class="btn-primary">
                            🔄 Review Mistakes (${wrongAnswers.length})
                        </button>
                    ` : ''}
                    <button id="btn-goto-memory" class="btn-secondary">
                        📊 Memory Progression Report
                    </button>
                    <div class="flex gap-3 mt-2">
                        <button id="btn-results-restart" class="btn-secondary flex-1">
                            🎮 New Round
                        </button>
                        <button id="btn-results-home" class="btn-secondary flex-1">
                            🏠 Home
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Animate circular progress
        setTimeout(() => {
            const ring = document.getElementById('score-ring');
            if (ring) {
                const circumference = 2 * Math.PI * 70; // ~440
                const offset = circumference - (percentage / 100) * circumference;
                ring.style.strokeDashoffset = offset;
            }
        }, 100);

        document.getElementById('btn-goto-review')?.addEventListener('click', () => {
            sound.playClick();
            renderStage2();
        });
        document.getElementById('btn-goto-memory')?.addEventListener('click', () => {
            sound.playClick();
            renderStage3();
        });
        document.getElementById('btn-results-restart')?.addEventListener('click', () => {
            sound.playClick();
            onRestart();
        });
        document.getElementById('btn-results-home')?.addEventListener('click', () => {
            sound.playClick();
            onHome();
        });
    }

    function renderStage2() {
        if (wrongAnswers.length === 0) {
            renderStage3();
            return;
        }

        let currentIndex = 0;

        function updateCarousel() {
            const item = wrongAnswers[currentIndex];
            container.innerHTML = `
                <div class="results-stage">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="glow-text text-xl">🔄 Review Mistakes</h2>
                        <span class="badge badge-mix">${currentIndex + 1} / ${wrongAnswers.length}</span>
                    </div>

                    <div class="carousel-card">
                        <img id="review-img" src="${item.imageUrl || ''}" alt="${item.correctName}">
                        <div class="review-details w-full">
                            <div class="review-correct-name">✓ ${item.correctName}</div>
                            <div class="review-wrong-guess mt-2">✗ Your guess: ${item.wrongGuessName || 'Timed out / None'}</div>
                            
                            <div class="flex justify-center gap-2 mt-4">
                                <span class="badge badge-${item.category || 'mix'}">${(item.category || 'General').toUpperCase()}</span>
                                ${item.addedBy ? `<span class="added-by-tag">@${item.addedBy}</span>` : ''}
                            </div>
                        </div>

                        <button id="btn-memorized" class="btn-secondary w-full mt-4">
                            ✓ I Memorized This Name
                        </button>
                    </div>

                    <div class="carousel-nav mt-4">
                        <button id="btn-prev-mistake" class="btn-icon" ${currentIndex === 0 ? 'disabled' : ''}>←</button>
                        <button id="btn-next-stage" class="btn-primary">
                            Memory Report 📊
                        </button>
                        <button id="btn-next-mistake" class="btn-icon" ${currentIndex === wrongAnswers.length - 1 ? 'disabled' : ''}>→</button>
                    </div>
                </div>
            `;

            document.getElementById('review-img')?.addEventListener('click', () => {
                lightbox.open(item.imageUrl, {
                    showCaption: true,
                    name: item.correctName,
                    category: item.category
                });
            });

            document.getElementById('btn-prev-mistake')?.addEventListener('click', () => {
                sound.playClick();
                if (currentIndex > 0) {
                    currentIndex--;
                    updateCarousel();
                }
            });

            document.getElementById('btn-next-mistake')?.addEventListener('click', () => {
                sound.playClick();
                if (currentIndex < wrongAnswers.length - 1) {
                    currentIndex++;
                    updateCarousel();
                }
            });

            document.getElementById('btn-memorized')?.addEventListener('click', (e) => {
                sound.playCorrect();
                e.target.innerText = '✓ Marked for Review!';
                e.target.disabled = true;
                e.target.style.borderColor = 'var(--accent-green)';
            });

            document.getElementById('btn-next-stage')?.addEventListener('click', () => {
                sound.playClick();
                renderStage3();
            });
        }

        updateCarousel();
    }

    function renderStage3() {
        container.innerHTML = `
            <div class="results-stage text-center">
                <h2 class="glow-text text-xl mb-4">🧠 Memory Progression Report</h2>
                <p class="color-text-muted mb-6">Spaced Repetition System (SRS) updates from this session</p>

                <div class="memory-list flex flex-col gap-3 text-left">
                    ${masteryChanges.length > 0 ? masteryChanges.map(m => `
                        <div class="result-stat-box flex justify-between items-center" style="text-align: left;">
                            <div>
                                <div class="font-bold">${m.name}</div>
                                <div class="text-xs color-text-muted">Next review in ${m.intervalDays || 1} day(s)</div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-sm">${'★'.repeat(m.newMastery)}${'☆'.repeat(5 - m.newMastery)}</span>
                                ${m.newMastery >= 5 ? '<span class="badge badge-mix">🏆 Mastered</span>' : ''}
                                ${m.newMastery <= 1 ? '<span class="badge badge-sluts">🔴 Weak</span>' : ''}
                            </div>
                        </div>
                    `).join('') : `
                        <div class="result-stat-box text-center py-6">
                            <p>Great consistency! Keep reviewing daily to cement memory.</p>
                        </div>
                    `}
                </div>

                <div class="flex gap-3 mt-6">
                    <button id="btn-mem-restart" class="btn-primary flex-1">
                        🎮 Play Again
                    </button>
                    <button id="btn-mem-home" class="btn-secondary flex-1">
                        🏠 Back to Home
                    </button>
                </div>
            </div>
        `;

        document.getElementById('btn-mem-restart')?.addEventListener('click', () => {
            sound.playClick();
            onRestart();
        });
        document.getElementById('btn-mem-home')?.addEventListener('click', () => {
            sound.playClick();
            onHome();
        });
    }
}
