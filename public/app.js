import { initAuth } from './auth.js';
import { initGallery } from './gallery.js';
import { initGame } from './game.js';
import { initCharStats } from './char-stats.js';
import { initLeaderboard } from './leaderboard.js';
import { initCrawler } from './crawler.js';
import { initSettingsModal } from './settings.js';
import { openRandomPicker } from './random-picker.js';
import { initWorship } from './worship.js';
import { sound } from './sound.js';
import { showToast } from './toast.js';
import { getCsrfToken, clearCsrfToken } from './csrf.js';

// Intercept all fetch requests to /api/ and automatically inject Authorization & CSRF headers
const nativeFetch = window.fetch.bind(window);
window.fetch = function(url, options = {}) {
    try {
        const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
        if (urlStr.startsWith('/api/') || urlStr.includes('/api/')) {
            const token = localStorage.getItem('goooog_session_token') || sessionStorage.getItem('goooog_session_token');
            const csrf = getCsrfToken();
            const headers = new Headers(options.headers || (url && url.headers ? url.headers : {}));
            if (token && !headers.has('Authorization')) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            if (!headers.has('X-Requested-With')) {
                headers.set('X-Requested-With', 'XMLHttpRequest');
            }
            const method = (options.method || (url && url.method) || 'GET').toUpperCase();
            if (csrf && !headers.has('X-CSRF-Token') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
                headers.set('X-CSRF-Token', csrf);
            }
            options.headers = headers;
        }
    } catch (e) {
        console.error('Fetch interceptor error:', e);
    }
    return nativeFetch(url, options);
};

const state = {
    user: null,
    selectedCategory: 'mix',
    cachedCharacters: null
};

async function checkAuth() {
    try {
        const token = localStorage.getItem('goooog_session_token') || sessionStorage.getItem('goooog_session_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await nativeFetch('/api/auth/me', { headers });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.data?.user) {
                state.user = data.data.user;
                try {
                    localStorage.setItem('goooog_user', JSON.stringify(data.data.user));
                } catch (e) {}
                if (data.data.csrfToken) {
                    setCsrfToken(data.data.csrfToken);
                }
                return true;
            }
        }
    } catch (e) {
        console.error("Auth check failed", e);
    }
    return false;
}

export function onLoginSuccess(user) {
    state.user = user;
    try {
        localStorage.setItem('goooog_user', JSON.stringify(user));
    } catch (e) {}
    document.getElementById('view-auth')?.classList.add('hidden');
    document.getElementById('view-main')?.classList.remove('hidden');
    initRouter();
    setupGlobalEvents();
    checkDailyStreak();
}
window.onLoginSuccess = onLoginSuccess;

export function performClientLogout() {
    localStorage.removeItem('goooog_session_token');
    sessionStorage.removeItem('goooog_session_token');
    localStorage.removeItem('goooog_user');
    clearCsrfToken();
    state.user = null;
    document.getElementById('view-main')?.classList.add('hidden');
    document.getElementById('view-auth')?.classList.remove('hidden');
    initAuth();
}
window.performClientLogout = performClientLogout;

async function init() {
    registerServiceWorker();

    const token = localStorage.getItem('goooog_session_token') || sessionStorage.getItem('goooog_session_token');
    const cachedUserStr = localStorage.getItem('goooog_user');
    let cachedUser = null;
    try {
        if (cachedUserStr) cachedUser = JSON.parse(cachedUserStr);
    } catch (e) {}

    // If local token and cached profile exist, enter game IMMEDIATELY with 0ms delay
    if (token && cachedUser) {
        onLoginSuccess(cachedUser);
        // Verify in background and sync fresh state
        checkAuth();
    } else {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            document.getElementById('view-auth')?.classList.remove('hidden');
            document.getElementById('view-main')?.classList.add('hidden');
            initAuth();
        } else {
            onLoginSuccess(state.user);
        }
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('SW registration skipped:', err);
        });
    }
}

function initRouter() {
    const pages = ['home', 'gallery', 'stats', 'leaderboard', 'worship', 'admin'];
    
    const navigate = (page) => {
        if (!pages.includes(page)) page = 'home';
        
        pages.forEach(p => {
            const pageEl = document.getElementById(`page-${p}`);
            if (pageEl) pageEl.classList.add('hidden');
        });
        
        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) targetPage.classList.remove('hidden');
        
        document.querySelectorAll('.nav-item').forEach(el => {
            if (el.dataset.nav === page) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
        
        if (page === 'home') initHome();
        if (page === 'gallery') initGallery(state.user);
        if (page === 'stats') initCharStats();
        if (page === 'leaderboard') initLeaderboard();
        if (page === 'worship') initWorship();
        if (page === 'admin') initCrawler(state.user);
    };

    document.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', (e) => {
            sound.playClick();
            const page = e.currentTarget.dataset.nav;
            window.location.hash = page;
        });
    });

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '') || 'home';
        navigate(hash);
    });

    const initialHash = window.location.hash.replace('#', '') || 'home';
    navigate(initialHash);
}

async function initHome() {
    const container = document.getElementById('page-home');
    if (!container) return;

    container.innerHTML = `
        <div class="home-hero">
            <h1 class="glow-text">Guess The Celebrity</h1>
            <p>Select a category to test your recognition and boost your memory score</p>
        </div>

        <div class="category-grid">
            <div class="category-card" data-category="mix" id="card-cat-mix">
                <div class="category-card-overlay">
                    <div class="category-card-title glow-text">🔀 All Mix</div>
                    <div class="category-card-count" id="count-mix">Loading library...</div>
                </div>
            </div>

            <div class="category-card" data-category="trans" id="card-cat-trans">
                <div class="category-card-overlay">
                    <div class="category-card-title" style="color: #e879f9;">⚧️ Trans</div>
                    <div class="category-card-count" id="count-trans">Loading...</div>
                </div>
            </div>

            <div class="category-card" data-category="sluts" id="card-cat-sluts">
                <div class="category-card-overlay">
                    <div class="category-card-title" style="color: #f472b6;">♀️ Sluts</div>
                    <div class="category-card-count" id="count-sluts">Loading...</div>
                </div>
            </div>

            <div class="category-card" data-category="twinks" id="card-cat-twinks">
                <div class="category-card-overlay">
                    <div class="category-card-title" style="color: #38bdf8;">♂️ Twinks</div>
                    <div class="category-card-count" id="count-twinks">Loading...</div>
                </div>
            </div>
        </div>
    `;

    // Fetch live category counts and random backdrop images
    try {
        let characters = state.cachedCharacters;
        if (!characters) {
            const res = await fetch('/api/characters?limit=100');
            const data = await res.json();
            if (data.success) {
                characters = data.data.characters || [];
                state.cachedCharacters = characters;
            }
        }

        if (characters) {
            const transChars = characters.filter(c => c.category === 'trans');
            const slutsChars = characters.filter(c => c.category === 'sluts');
            const twinksChars = characters.filter(c => c.category === 'twinks');

            const countMix = document.getElementById('count-mix');
            const countTrans = document.getElementById('count-trans');
            const countSluts = document.getElementById('count-sluts');
            const countTwinks = document.getElementById('count-twinks');

            if (countMix) countMix.innerText = `${characters.length} Total Characters`;
            if (countTrans) countTrans.innerText = `${transChars.length} Characters`;
            if (countSluts) countSluts.innerText = `${slutsChars.length} Characters`;
            if (countTwinks) countTwinks.innerText = `${twinksChars.length} Characters`;

            // Set random background image for cards
            setCardBackground('card-cat-mix', characters);
            setCardBackground('card-cat-trans', transChars);
            setCardBackground('card-cat-sluts', slutsChars);
            setCardBackground('card-cat-twinks', twinksChars);
        }
    } catch (e) {
        console.error("Home counts load error", e);
    }

    function setCardBackground(cardId, list) {
        const card = document.getElementById(cardId);
        if (card && list && list.length > 0) {
            const randomChar = list[Math.floor(Math.random() * list.length)];
            const img = (randomChar.images && randomChar.images[0]) || '';
            if (img) {
                card.style.setProperty('--card-bg-img', `url('${img}')`);
                card.querySelector('style')?.remove();
                const style = document.createElement('style');
                style.innerHTML = `#${cardId}::before { background-image: url('${img}'); }`;
                card.appendChild(style);
            }
        }
    }

    // Category click handler opens round setup modal
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', (e) => {
            sound.playClick();
            state.selectedCategory = e.currentTarget.dataset.category;
            
            const categoryMeta = {
                mix: { title: 'All Mix Challenge', icon: '🔀', subtitle: 'Randomized blend from all categories' },
                trans: { title: 'Trans Category', icon: '⚧️', subtitle: 'Test your recognition of trans celebrities' },
                sluts: { title: 'Sluts Category', icon: '♀️', subtitle: 'Female celebrity trivia & visual test' },
                twinks: { title: 'Twinks Category', icon: '♂️', subtitle: 'Male celebrity trivia & visual test' }
            };

            const meta = categoryMeta[state.selectedCategory] || { title: state.selectedCategory.toUpperCase(), icon: '🎮', subtitle: 'Configure game settings' };

            const iconEl = document.getElementById('setup-category-icon');
            const titleEl = document.getElementById('setup-category-title');
            const boxEl = document.getElementById('setup-modal-box');
            
            if (iconEl) iconEl.innerText = meta.icon;
            if (titleEl) titleEl.innerText = meta.title;
            if (boxEl) boxEl.setAttribute('data-category', state.selectedCategory);
            
            document.getElementById('modal-round-setup')?.classList.remove('hidden');
        });
    });
}

function setupGlobalEvents() {
    // Mode Card Selection
    document.querySelectorAll('#setup-mode .mode-card').forEach(card => {
        card.addEventListener('click', (e) => {
            sound.playClick();
            document.querySelectorAll('#setup-mode .mode-card').forEach(c => c.classList.remove('active'));
            const targetCard = e.currentTarget;
            targetCard.classList.add('active');
            
            const mode = targetCard.dataset.val;
            const roundsContainer = document.getElementById('setup-rounds');
            const roundsLabel = document.getElementById('setup-rounds-label');
            
            if (mode === 'sudden_death') {
                if (roundsContainer) roundsContainer.style.opacity = '0.4';
                if (roundsContainer) roundsContainer.style.pointerEvents = 'none';
                if (roundsLabel) roundsLabel.innerHTML = '<span>🔢 Questions Count: <strong style="color: var(--accent-red);">Fixed 50 Rounds (1 Life)</strong></span>';
            } else {
                if (roundsContainer) roundsContainer.style.opacity = '1';
                if (roundsContainer) roundsContainer.style.pointerEvents = 'auto';
                if (roundsLabel) roundsLabel.innerHTML = '<span>🔢 Number of Questions</span>';
            }
        });
    });

    // Round Pill selection
    document.querySelectorAll('#setup-rounds .round-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            sound.playClick();
            document.querySelectorAll('#setup-rounds .round-pill').forEach(p => p.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    // Close Round Setup Modal
    document.getElementById('btn-close-setup-modal')?.addEventListener('click', () => {
        document.getElementById('modal-round-setup')?.classList.add('hidden');
    });

    // Start Game from Modal
    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) {
        const newStartBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newStartBtn, startBtn);

        newStartBtn.addEventListener('click', () => {
            sound.playClick();
            document.getElementById('modal-round-setup')?.classList.add('hidden');
            const mode = document.querySelector('#setup-mode .mode-card.active')?.dataset.val || 'classic';
            const rounds = document.querySelector('#setup-rounds .round-pill.active')?.dataset.val || '15';
            initGame(state.selectedCategory, mode, rounds);
        });
    }

    // Random Celebrity Roulette Button
    document.getElementById('btn-random-pick')?.addEventListener('click', () => {
        sound.playClick();
        openRandomPicker();
    });

    // Profile / Settings Button
    document.getElementById('btn-profile')?.addEventListener('click', () => {
        sound.playClick();
        initSettingsModal(state.user);
    });

    // Logout Button
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        sound.playClick();
        if (confirm("Are you sure you want to log out?")) {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch (e) {}
            performClientLogout();
            showToast('Logged out successfully', 'info');
        }
    });

    // Streak badge click
    document.getElementById('streak-badge')?.addEventListener('click', () => {
        sound.playStreak();
        document.getElementById('modal-streak')?.classList.remove('hidden');
    });

    document.getElementById('btn-close-streak')?.addEventListener('click', () => {
        document.getElementById('modal-streak')?.classList.add('hidden');
    });
}

async function checkDailyStreak() {
    try {
        const res = await fetch('/api/me/streak');
        const data = await res.json();
        if (data.success) {
            const streakCount = data.data.currentStreak || 1;
            const badgeCountEl = document.getElementById('streak-count');
            const modalDaysEl = document.getElementById('modal-streak-days');
            if (badgeCountEl) badgeCountEl.innerText = streakCount;
            if (modalDaysEl) modalDaysEl.innerText = streakCount;

            const today = new Date().toISOString().split('T')[0];
            const lastCelebrated = localStorage.getItem('last_celebrated_streak');

            if (lastCelebrated !== today) {
                localStorage.setItem('last_celebrated_streak', today);
                setTimeout(() => {
                    sound.playStreak();
                    document.getElementById('modal-streak')?.classList.remove('hidden');
                }, 600);
            }
        }
    } catch (e) {
        console.error("Streak check error", e);
    }
}

document.addEventListener('DOMContentLoaded', init);
