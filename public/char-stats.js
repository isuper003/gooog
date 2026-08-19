import { lightbox } from './lightbox.js';
import { sound } from './sound.js';
import { initGame } from './game.js';

export async function initCharStats() {
    const container = document.getElementById('page-stats');
    if (!container) return;

    container.innerHTML = `
        <div class="stats-header mb-6">
            <h1 class="glow-text text-2xl mb-2">📊 Character Stats & Mastery</h1>
            <p class="color-text-muted">Track your Spaced Repetition (SRS) memory strength for each celebrity</p>
        </div>

        <div id="stats-summary-row" class="stats-summary-grid mb-6">
            <div class="stat-summary-card skeleton" style="height: 90px;"></div>
            <div class="stat-summary-card skeleton" style="height: 90px;"></div>
            <div class="stat-summary-card skeleton" style="height: 90px;"></div>
            <div class="stat-summary-card skeleton" style="height: 90px;"></div>
        </div>

        <div class="gallery-controls mb-6">
            <select id="stats-category-filter">
                <option value="all">All Categories</option>
                <option value="trans">Trans</option>
                <option value="sluts">Sluts</option>
                <option value="twinks">Twinks</option>
            </select>

            <select id="stats-sort-filter">
                <option value="mastery">Sort by: Mastery Level ★</option>
                <option value="most_wrong">Sort by: Most Wrong ❌</option>
                <option value="most_correct">Sort by: Most Correct ✅</option>
                <option value="success_rate">Sort by: Success Rate %</option>
            </select>

            <button id="btn-train-due" class="btn-primary">
                ⚡ Train Due Now
            </button>
        </div>

        <div id="stats-cards-grid" class="gallery-grid">
            <div class="char-card skeleton" style="height: 280px;"></div>
            <div class="char-card skeleton" style="height: 280px;"></div>
            <div class="char-card skeleton" style="height: 280px;"></div>
            <div class="char-card skeleton" style="height: 280px;"></div>
        </div>
    `;

    async function loadStats() {
        const category = document.getElementById('stats-category-filter').value;
        const sort = document.getElementById('stats-sort-filter').value;

        try {
            const res = await fetch(`/api/stats?category=${category}&sort=${sort}`);
            const data = await res.json();

            if (data.success) {
                renderSummary(data.data.summary);
                renderStatsCards(data.data.stats);
            }
        } catch (e) {
            console.error("Failed to load stats", e);
        }
    }

    function renderSummary(summary) {
        const row = document.getElementById('stats-summary-row');
        if (!row) return;

        row.innerHTML = `
            <div class="stat-summary-card card-mastered">
                <div class="stat-card-value glow-text">${summary.masteredCount}</div>
                <div class="stat-card-label">🏆 Mastered (Level 5)</div>
            </div>
            <div class="stat-summary-card card-learning">
                <div class="stat-card-value" style="color: #38bdf8;">${summary.learningCount}</div>
                <div class="stat-card-label">📚 Learning (1-4)</div>
            </div>
            <div class="stat-summary-card card-weak">
                <div class="stat-card-value" style="color: #fb7185;">${summary.weakCount}</div>
                <div class="stat-card-label">🔴 Weak Items</div>
            </div>
            <div class="stat-summary-card card-due">
                <div class="stat-card-value" style="color: #fbbf24;">${summary.dueCount}</div>
                <div class="stat-card-label">⏰ Due for Review</div>
            </div>
        `;
    }

    function renderStatsCards(characters) {
        const grid = document.getElementById('stats-cards-grid');
        if (!grid) return;

        if (characters.length === 0) {
            grid.innerHTML = `
                <div class="text-center py-12 w-full" style="grid-column: 1 / -1;">
                    <p class="color-text-muted">No character progress recorded yet. Play a round to start tracking!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        characters.forEach(char => {
            const isWeak = char.mastery_level <= 1 && char.times_shown > 0;
            const primaryImg = (char.images && char.images[0]) || '';
            const stars = '★'.repeat(char.mastery_level) + '☆'.repeat(5 - char.mastery_level);

            const card = document.createElement('div');
            card.className = 'char-card';
            card.innerHTML = `
                <div class="char-img-container" data-img="${primaryImg}" data-name="${char.name}" data-cat="${char.category}">
                    <img src="${primaryImg}" alt="${char.name}" loading="lazy">
                    ${isWeak ? '<span class="pulsing-red-dot" style="position: absolute; top: 12px; right: 12px; z-index: 2;" title="Weak - Review Soon"></span>' : ''}
                </div>
                <div class="char-info">
                    <div class="char-header-row">
                        <div class="char-name" title="${char.name}">${char.name}</div>
                        <span class="badge badge-${char.category}">${char.category.toUpperCase()}</span>
                    </div>
                    <div class="star-rating">${stars}</div>
                    
                    <div class="flex justify-between items-center text-xs color-text-muted mt-2">
                        <span>✅ ${char.times_correct}</span>
                        <span>❌ ${char.times_wrong}</span>
                        <span class="font-bold" style="color: ${char.success_rate >= 70 ? 'var(--accent-green)' : (char.success_rate >= 40 ? 'var(--accent-cyan)' : 'var(--accent-red)')};">
                            ${char.success_rate}%
                        </span>
                    </div>

                    <div class="progress-bar-container mt-2" style="height: 6px;">
                        <div class="progress-fill" style="width: ${char.success_rate}%; background: ${char.success_rate >= 70 ? 'var(--accent-green)' : (char.success_rate >= 40 ? 'var(--accent-cyan)' : 'var(--accent-red)')};"></div>
                    </div>
                </div>
            `;

            card.querySelector('.char-img-container')?.addEventListener('click', () => {
                lightbox.open(char.images && char.images.length > 0 ? char.images : [primaryImg], {
                    showCaption: true,
                    name: char.name,
                    category: char.category
                });
            });

            grid.appendChild(card);
        });
    }

    document.getElementById('stats-category-filter')?.addEventListener('change', () => {
        sound.playClick();
        loadStats();
    });

    document.getElementById('stats-sort-filter')?.addEventListener('change', () => {
        sound.playClick();
        loadStats();
    });

    document.getElementById('btn-train-due')?.addEventListener('click', () => {
        sound.playClick();
        initGame('mix', 'review', 10);
    });

    loadStats();
}
