import { initAuth } from './auth.js';
import { initGallery } from './gallery.js';
import { initGame } from './game.js';
import { initCharStats } from './char-stats.js';
import { initLeaderboard } from './leaderboard.js';
import { initCrawler } from './crawler.js';
import { initSettingsModal } from './settings.js';
import { sound } from './sound.js';
import { showToast } from './toast.js';
import { getCsrfToken, clearCsrfToken } from './csrf.js';

const state = {
    user: null,
    selectedCategory: 'mix',
    cachedCharacters: null
};

async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            state.user = data.data.user;
            return true;
        }
    } catch (e) {
        console.error("Auth check failed", e);
    }
    return false;
}

async function init() {
    registerServiceWorker();

    const isAuthenticated = await checkAuth();
    
    if (!isAuthenticated) {
        document.getElementById('view-auth')?.classList.remove('hidden');
        document.getElementById('view-main')?.classList.add('hidden');
        initAuth();
    } else {
        document.getElementById('view-auth')?.classList.add('hidden');
        document.getElementById('view-main')?.classList.remove('hidden');
        initRouter();
        setupGlobalEvents();
        checkDailyStreak();
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
    const pages = ['home', 'gallery', 'stats', 'leaderboard', 'admin'];
    
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
            
            const titleMap = {
                mix: '🔀 All Mix Challenge',
                trans: '⚧️ Trans Category',
                sluts: '♀️ Sluts Category',
                twinks: '♂️ Twinks Category'
            };

            const titleEl = document.getElementById('setup-category-title');
            if (titleEl) titleEl.innerText = titleMap[state.selectedCategory] || state.selectedCategory.toUpperCase();
            document.getElementById('modal-round-setup')?.classList.remove('hidden');
        });
    });
}

function setupGlobalEvents() {
    // Setup Modal Pill selection
    document.querySelectorAll('.pill-group .pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            sound.playClick();
            const group = e.currentTarget.closest('.pill-group');
            group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
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
            const mode = document.querySelector('#setup-mode .pill.active')?.dataset.val || 'classic';
            const rounds = document.querySelector('#setup-rounds .pill.active')?.dataset.val || '10';
            initGame(state.selectedCategory, mode, rounds);
        });
    }

    // Profile / Settings Button
    document.getElementById('btn-profile')?.addEventListener('click', () => {
        sound.playClick();
        initSettingsModal(state.user);
    });

    // Logout Button
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        sound.playClick();
        if (confirm("Are you sure you want to log out?")) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': getCsrfToken()
                }
            });
            clearCsrfToken();
            showToast('Logged out successfully', 'info');
            setTimeout(() => window.location.reload(), 300);
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
