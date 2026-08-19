import { sound } from './sound.js';

export async function initLeaderboard() {
    const container = document.getElementById('page-leaderboard');
    if (!container) return;

    container.innerHTML = `
        <div class="mb-6">
            <h1 class="glow-text text-2xl mb-2">🏆 Community Leaderboard</h1>
            <p class="color-text-muted">Top contributors helping enrich the shared character library</p>
        </div>

        <div class="leaderboard-tabs mb-6">
            <button class="leaderboard-tab active" data-cat="total">🌟 Total</button>
            <button class="leaderboard-tab" data-cat="trans">⚧️ Trans</button>
            <button class="leaderboard-tab" data-cat="sluts">♀️ Sluts</button>
            <button class="leaderboard-tab" data-cat="twinks">♂️ Twinks</button>
        </div>

        <div id="leaderboard-list-container" class="leaderboard-list">
            <div class="leaderboard-row skeleton" style="height: 64px;"></div>
            <div class="leaderboard-row skeleton" style="height: 64px;"></div>
            <div class="leaderboard-row skeleton" style="height: 64px;"></div>
        </div>
    `;

    async function loadLeaderboard(category = 'total') {
        const listEl = document.getElementById('leaderboard-list-container');
        if (!listEl) return;

        try {
            const res = await fetch(`/api/leaderboard?category=${category}`);
            const data = await res.json();

            if (data.success) {
                renderList(data.data.leaderboard, category);
            }
        } catch (e) {
            console.error("Failed to load leaderboard", e);
        }
    }

    function renderList(users, activeCategory) {
        const listEl = document.getElementById('leaderboard-list-container');
        if (!listEl) return;

        if (users.length === 0) {
            listEl.innerHTML = `
                <div class="result-stat-box text-center py-8">
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

    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            sound.playClick();
            document.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            loadLeaderboard(e.currentTarget.dataset.cat);
        });
    });

    loadLeaderboard('total');
}
