import { initAuth } from './auth.js';
import { initGallery } from './gallery.js';
import { initGame } from './game.js';
import { initCharStats } from './char-stats.js';
import { initLeaderboard } from './leaderboard.js';
import { initCrawler } from './crawler.js';
import { initAdminUsers } from './admin-users.js';
import { initSettingsModal } from './settings.js';
import { openRandomPicker } from './random-picker.js';
import { initWorship, pauseWorshipTimers, resetWorshipSession } from './worship.js';
import { sound } from './sound.js';
import { showToast } from './toast.js';
import { getCsrfToken, clearCsrfToken } from './csrf.js';

// Intercept all fetch requests to /api/ and automatically inject Authorization & CSRF headers
const nativeFetch = window.fetch.bind(window);
window.fetch = function(url, options = {}) {
    try {
        const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
        // Same-origin /api/ calls only: matching any URL that merely contains
        // "/api/" leaked auth headers to third-party origins (#45).
        let isApi = urlStr.startsWith('/api/');
        if (!isApi && /^https?:\/\//i.test(urlStr)) {
            try {
                isApi = new URL(urlStr).origin === window.location.origin
                    && new URL(urlStr).pathname.startsWith('/api/');
            } catch (e) { isApi = false; }
        }
        if (isApi) {
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
    cachedCharacters: null,
    cachedCharactersAt: 0
};

// Home page category counts are cached briefly so back-to-back navigation
// doesn't refetch the whole library, but never long enough to show stale
// counts after the user adds or removes characters (#46).
const CHARACTERS_CACHE_TTL_MS = 5 * 60 * 1000;

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
    // The RTL/Amiri treatment is scoped to the auth gateway only; the main
    // app returns to its LTR layout once authenticated.
    document.documentElement.dir = 'ltr';
    document.documentElement.classList.remove('auth-lang-ar');
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
    resetWorshipSession();
    state.user = null;
    state.cachedCharacters = null;
    state.cachedCharactersAt = 0;
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

let routerWired = false;
let globalEventsWired = false;

function initRouter() {
    const pages = ['home', 'gallery', 'stats', 'leaderboard', 'worship', 'admin'];

    const navigate = (page) => {
        if (!pages.includes(page)) page = 'home';

        // Leaving the worship page must stop its live meditation timers,
        // otherwise they keep awarding devotion for a hidden view (#20).
        pauseWorshipTimers();

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
        if (page === 'admin') initAdminPage();
    };

    // Wire global listeners exactly once; re-login must not stack duplicate
    // hashchange/nav handlers that made every click fire N times (#21).
    if (!routerWired) {
        routerWired = true;

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
    }

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
        // Prefer the lightweight aggregate endpoint (one GROUP BY query) over
        // pulling the entire library just to count it.
        let characters = null;
        const cacheFresh = state.cachedCharacters && (Date.now() - state.cachedCharactersAt) < CHARACTERS_CACHE_TTL_MS;

        if (!cacheFresh) {
            const res = await fetch('/api/characters?counts=1');
            const data = await res.json();
            if (data.success && data.data.counts) {
                const { total, trans, sluts, twinks } = data.data.counts;
                const countMix = document.getElementById('count-mix');
                const countTrans = document.getElementById('count-trans');
                const countSluts = document.getElementById('count-sluts');
                const countTwinks = document.getElementById('count-twinks');

                if (countMix) countMix.innerText = `${total} Total Characters`;
                if (countTrans) countTrans.innerText = `${trans} Characters`;
                if (countSluts) countSluts.innerText = `${sluts} Characters`;
                if (countTwinks) countTwinks.innerText = `${twinks} Characters`;

                state.cachedCounts = data.data.counts;
                state.cachedCharactersAt = Date.now();
            }
        } else {
            const c = state.cachedCounts || {};
            const countMix = document.getElementById('count-mix');
            const countTrans = document.getElementById('count-trans');
            const countSluts = document.getElementById('count-sluts');
            const countTwinks = document.getElementById('count-twinks');
            if (countMix && c.total !== undefined) countMix.innerText = `${c.total} Total Characters`;
            if (countTrans && c.trans !== undefined) countTrans.innerText = `${c.trans} Characters`;
            if (countSluts && c.sluts !== undefined) countSluts.innerText = `${c.sluts} Characters`;
            if (countTwinks && c.twinks !== undefined) countTwinks.innerText = `${c.twinks} Characters`;
        }

        // Backdrop images need a small sample, not the whole library.
        if (!characters) {
            const res = await fetch('/api/characters?limit=40&random_sample=1').catch(() => null);
            if (res && res.ok) {
                const data = await res.json();
                characters = data.success ? (data.data.characters || []) : [];
            }
        }

        if (characters && characters.length > 0) {
            const transChars = characters.filter(c => c.category === 'trans');
            const slutsChars = characters.filter(c => c.category === 'sluts');
            const twinksChars = characters.filter(c => c.category === 'twinks');

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
    if (globalEventsWired) return;
    globalEventsWired = true;

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

// Admin page shell: two sibling panes (Smart Import crawler + Users Control
// Center) behind a persistent tab bar. Both modules own their pane only.
let adminActiveTab = 'crawler';

function initAdminPage() {
    const container = document.getElementById('page-admin');
    if (!container) return;

    const staff = state.user && (state.user.role === 'admin' || state.user.role === 'moderator');
    if (!staff) {
        container.innerHTML = `<div class="text-center color-text-muted my-12">🔒 Admin or Moderator privileges required to access this area.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="admin-tab-bar mb-4">
            <button class="au-tab-btn ${adminActiveTab === 'crawler' ? 'active' : ''}" data-admin-tab="crawler">
                🕷️ Smart Import &amp; Moderation
            </button>
            <button class="au-tab-btn ${adminActiveTab === 'users' ? 'active' : ''}" data-admin-tab="users">
                👑 Users Control Center
            </button>
        </div>
        <div id="pane-crawler" class="${adminActiveTab === 'crawler' ? '' : 'hidden'}"></div>
        <div id="pane-users" class="${adminActiveTab === 'users' ? '' : 'hidden'}"></div>
    `;

    container.querySelectorAll('[data-admin-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            adminActiveTab = btn.dataset.adminTab;
            container.querySelectorAll('[data-admin-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('pane-crawler').classList.toggle('hidden', adminActiveTab !== 'crawler');
            document.getElementById('pane-users').classList.toggle('hidden', adminActiveTab !== 'users');
        });
    });

    initCrawler(state.user);
    initAdminUsers(state.user);
}

async function checkDailyStreak() {    try {
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
