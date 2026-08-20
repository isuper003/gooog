import { sound } from './sound.js';
import { lightbox } from './lightbox.js';

export async function initLeaderboard() {
    const container = document.getElementById('page-leaderboard');
    if (!container) return;

    let currentType = 'stars'; // default to 'stars' or 'users'
    let currentCategory = 'all'; // 'all', 'sluts', 'trans', 'twinks'

    container.innerHTML = `
        <div class="leaderboard-header-section mb-6">
            <div class="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 class="glow-text text-2xl mb-1">🏆 Hall of Fame & Leaderboards</h1>
                    <p class="color-text-muted text-sm" id="leaderboard-subtitle">Most recognized celebrities with the lowest player error rate</p>
                </div>

                <!-- Primary Type Switch: Stars vs Users -->
                <div class="pill-group leaderboard-type-switch" id="leaderboard-type-switch">
                    <button class="pill active" data-type="stars">🌟 Top Stars (Accuracy)</button>
                    <button class="pill" data-type="users">👑 Top Contributors</button>
                </div>
            </div>
        </div>

        <!-- Secondary Filter: Categories -->
        <div class="leaderboard-controls-ribbon mb-5">
            <div class="leaderboard-tabs" id="leaderboard-category-tabs">
                <button class="leaderboard-tab active" data-cat="all">✨ All Categories</button>
                <button class="leaderboard-tab" data-cat="sluts">♀️ Sluts</button>
                <button class="leaderboard-tab" data-cat="trans">⚧️ Trans</button>
                <button class="leaderboard-tab" data-cat="twinks">♂️ Twinks</button>
            </div>
            <div class="text-xs color-text-muted hidden sm:block" id="leaderboard-counter-label">
                Showing Top 50 Ranked
            </div>
        </div>

        <!-- Leaderboard List Container -->
        <div id="leaderboard-list-container" class="leaderboard-list">
            <div class="leaderboard-row skeleton" style="height: 72px;"></div>
            <div class="leaderboard-row skeleton" style="height: 72px;"></div>
            <div class="leaderboard-row skeleton" style="height: 72px;"></div>
            <div class="leaderboard-row skeleton" style="height: 72px;"></div>
        </div>
    `;

    async function loadLeaderboard() {
        const listEl = document.getElementById('leaderboard-list-container');
        if (!listEl) return;

        listEl.innerHTML = `
            <div class="leaderboard-row skeleton" style="height: 72px;"></div>
            <div class="leaderboard-row skeleton" style="height: 72px;"></div>
            <div class="leaderboard-row skeleton" style="height: 72px;"></div>
        `;

        try {
            const res = await fetch(`/api/leaderboard?type=${currentType}&category=${currentCategory}`);
            const data = await res.json();

            if (data.success) {
                if (currentType === 'stars') {
                    renderStarsList(data.data.leaderboard || []);
                } else {
                    renderUsersList(data.data.leaderboard || [], currentCategory);
                }
            }
        } catch (e) {
            console.error("Failed to load leaderboard", e);
            listEl.innerHTML = `
                <div class="result-stat-box text-center py-8">
                    <p class="color-text-muted">Error loading leaderboard. Please try again.</p>
                </div>
            `;
        }
    }

    function renderStarsList(stars) {
        const listEl = document.getElementById('leaderboard-list-container');
        if (!listEl) return;

        if (stars.length === 0) {
            listEl.innerHTML = `
                <div class="result-stat-box text-center py-12">
                    <p class="color-text-muted">No character gameplay data found in this category yet. Start a game to rank celebrities!</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = '';
        stars.forEach(star => {
            const rankMedal = star.rank === 1 ? '🥇' : (star.rank === 2 ? '🥈' : (star.rank === 3 ? '🥉' : `#${star.rank}`));
            
            // Trend Indicator Arrow
            let trendIcon = '<span class="trend-indicator trend-same" title="Stable in rank">▬</span>';
            if (star.trend === 'up') {
                trendIcon = '<span class="trend-indicator trend-up" title="Rank rising">▲</span>';
            } else if (star.trend === 'down') {
                trendIcon = '<span class="trend-indicator trend-down" title="Rank falling">▼</span>';
            }

            const avatarSrc = star.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="%23222"%3E%3Crect width="60" height="60"/%3E%3C/svg%3E';

            const row = document.createElement('div');
            row.className = `leaderboard-row star-rank-row rank-${star.rank <= 3 ? star.rank : 'default'}`;
            row.innerHTML = `
                <!-- Left: Rank & Movement & Star Avatar + Name -->
                <div class="flex items-center gap-3 star-main-col">
                    <div class="rank-box">
                        <span class="rank-badge">${rankMedal}</span>
                        ${trendIcon}
                    </div>

                    <div class="star-avatar-box" title="View portrait">
                        <img src="${avatarSrc}" alt="${star.name}" loading="lazy" referrerpolicy="no-referrer" class="star-avatar-img">
                    </div>

                    <div class="star-info-box">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold star-name-text">${star.name}</span>
                            <span class="badge badge-${star.category}" style="font-size: 0.65rem; padding: 2px 6px;">${star.category.toUpperCase()}</span>
                        </div>
                        <div class="text-xs color-text-muted flex items-center gap-2 mt-0.5">
                            <span class="duration-badge" title="Duration in current rank">⏱️ ${star.duration}</span>
                            <span>•</span>
                            <span class="stat-answers-total">${star.totalAnswers} Plays</span>
                        </div>
                    </div>
                </div>

                <!-- Right: Accuracy & Wrong/Correct Counts -->
                <div class="star-stats-col">
                    <div class="accuracy-badge ${star.accuracy >= 90 ? 'accuracy-high' : (star.accuracy >= 70 ? 'accuracy-med' : 'accuracy-low')}">
                        🎯 ${star.accuracy}% Accuracy
                    </div>
                    <div class="answers-breakdown-row">
                        <span class="stat-correct" title="Correct guesses by users">✅ ${star.correctAnswers}</span>
                        <span class="stat-wrong" title="Wrong guesses by users">❌ ${star.wrongAnswers}</span>
                    </div>
                </div>
            `;

            // Click avatar to open lightbox
            const imgEl = row.querySelector('.star-avatar-img');
            if (imgEl && star.image) {
                imgEl.style.cursor = 'pointer';
                imgEl.addEventListener('click', () => {
                    sound.playClick();
                    lightbox.open([star.image], {
                        initialIndex: 0,
                        name: star.name,
                        category: star.category,
                        showCaption: true
                    });
                });
            }

            listEl.appendChild(row);
        });
    }

    function renderUsersList(users, activeCategory) {
        const listEl = document.getElementById('leaderboard-list-container');
        if (!listEl) return;

        if (users.length === 0) {
            listEl.innerHTML = `
                <div class="result-stat-box text-center py-12">
                    <p class="color-text-muted">No contributors yet. Add characters from the Gallery to rank #1!</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = '';
        users.forEach(user => {
            const rankMedal = user.rank === 1 ? '🥇' : (user.rank === 2 ? '🥈' : (user.rank === 3 ? '🥉' : `#${user.rank}`));
            const initial = (user.username || 'U')[0].toUpperCase();
            
            let countDisplay = `${user.totalAdded} Added`;
            if (activeCategory === 'trans') countDisplay = `${user.transCount} Trans`;
            if (activeCategory === 'sluts') countDisplay = `${user.slutsCount} Sluts`;
            if (activeCategory === 'twinks') countDisplay = `${user.twinksCount} Twinks`;

            const row = document.createElement('div');
            row.className = `leaderboard-row ${user.isMe ? 'me' : ''}`;
            row.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="rank-badge">${rankMedal}</div>
                    <div class="user-avatar-circle">${initial}</div>
                    <div>
                        <div class="font-bold flex items-center gap-2">
                            <span>@${user.username}</span>
                            ${user.isMe ? '<span class="badge badge-mix">YOU</span>' : ''}
                            ${user.role === 'admin' ? '<span class="badge badge-sluts">ADMIN</span>' : ''}
                        </div>
                        <div class="text-xs color-text-muted">
                            Trans: ${user.transCount} • Sluts: ${user.slutsCount} • Twinks: ${user.twinksCount}
                        </div>
                    </div>
                </div>

                <div class="font-bold text-lg glow-text">
                    ${countDisplay} ✨
                </div>
            `;

            listEl.appendChild(row);
        });
    }

    // Type Switch Listener (Stars vs Users)
    document.querySelectorAll('#leaderboard-type-switch button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            sound.playClick();
            document.querySelectorAll('#leaderboard-type-switch button').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            currentType = target.dataset.type;

            const subtitleEl = document.getElementById('leaderboard-subtitle');
            if (subtitleEl) {
                subtitleEl.innerText = currentType === 'stars' 
                    ? 'Most recognized celebrities with the lowest player error rate'
                    : 'Top contributors helping enrich the shared character library';
            }

            loadLeaderboard();
        });
    });

    // Category Tabs Listener
    document.querySelectorAll('#leaderboard-category-tabs .leaderboard-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            sound.playClick();
            document.querySelectorAll('#leaderboard-category-tabs .leaderboard-tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentCategory = e.currentTarget.dataset.cat;
            loadLeaderboard();
        });
    });

    loadLeaderboard();
}

