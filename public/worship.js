import { sound } from './sound.js';
import { lightbox } from './lightbox.js';
import { showToast } from './toast.js';
import { initGame } from './game.js';
import { getCsrfToken } from './csrf.js';

let state = {
    currentTab: 'temple', // 'temple' | 'throne' | 'rosary' | 'contemplation'
    selectedCategory: 'all',
    selectedCharId: null,
    worshipData: null,
    autoSwitchEnabled: localStorage.getItem('worship_auto_switch') === 'true',
    rosaryAutoSwitchEnabled: localStorage.getItem('worship_rosary_auto_switch') === 'true',
    actionCount: 0,
    throneRankFilter: 'all',
    throneCategoryFilter: 'all',
    throneSearchQuery: '',
    rosaryLitany: 'glory',
    rosaryCurrentBead: 0,
    rosaryLifetimeCount: Number(localStorage.getItem('goooog_rosary_lifetime') || 0),
    rosaryCompletedSeals: Number(localStorage.getItem('goooog_rosary_seals') || 0),
    contemplationMode: 'surahs', // 'surahs' | 'meditation' | 'commandments' | 'oracle'
    activeSurahId: 'sovereignty',
    meditationTimer: null,
    meditationSeconds: 0,
    meditationRunning: true,
    meditationInterval: null
};

export async function initWorship() {
    const container = document.getElementById('page-worship');
    if (!container) return;

    container.innerHTML = `
        <div class="page-container worship-page-container">
            <!-- Header Banner -->
            <div class="worship-header text-center mb-4">
                <div class="inline-flex items-center gap-2 mb-2 flex-wrap justify-center">
                    <span class="auth-badge" style="margin: 0; font-size: 0.8rem; letter-spacing: 1px;">👑 صرح الولاء وديوان التبجيل</span>
                    <span class="badge" id="worship-global-devotion" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.4); color: #fcd34d; font-size: 0.8rem; font-weight: bold;">
                        👑 رصيد الولاء الإجمالي: <span id="worship-total-pts">0</span> Devotion Pts
                    </span>
                </div>
                <h1 class="glow-text text-3xl font-extrabold" style="background: linear-gradient(135deg, #fcd34d, #ec4899, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    THE ROYAL DEVOTION SHRINE
                </h1>
                <p class="color-text-muted text-sm max-w-lg mx-auto mt-1" style="line-height: 1.6;">
                    مجلس الثناء والتمجيد لسيدات الحُسن والفتنة — قدّم فروض الولاء وأقرّ بالتقصير لتنال شرف الرضا
                </p>
            </div>

            <!-- Worship 4-Way Navigation Tabs (المعبد vs عرش الآلهة vs مسبحة الآلهة vs آيات التدبر) -->
            <div class="worship-nav-tabs mb-5">
                <button class="worship-tab-btn ${state.currentTab === 'temple' ? 'active' : ''}" id="tab-btn-temple" data-tab="temple">
                    <span>🏛️ المعبد</span>
                    <span class="tab-sub">المحراب والطقوس التفاعلية</span>
                </button>
                <button class="worship-tab-btn ${state.currentTab === 'throne' ? 'active' : ''}" id="tab-btn-throne" data-tab="throne">
                    <span>👑 عرش الآلهة</span>
                    <span class="tab-sub">سُلَّم المراتب وبانوراما السلطانات</span>
                </button>
                <button class="worship-tab-btn ${state.currentTab === 'rosary' ? 'active' : ''}" id="tab-btn-rosary" data-tab="rosary">
                    <span>📿 مسبحة الآلهة</span>
                    <span class="tab-sub">التسبيح الحركي والأوراد الملكية</span>
                </button>
                <button class="worship-tab-btn ${state.currentTab === 'contemplation' ? 'active' : ''}" id="tab-btn-contemplation" data-tab="contemplation">
                    <span>📖 آيات التدبر</span>
                    <span class="tab-sub">مصحف الفتنة ومحراب الوحي</span>
                </button>
            </div>

            <!-- TAB 1: TEMPLE VIEW (المعبد) -->
            <div id="worship-temple-container" class="${state.currentTab === 'temple' ? '' : 'hidden'}">
                <!-- Supreme Goddess Auto-Switch Toggle Bar -->
                <div class="worship-toggle-bar mb-4">
                    <label class="flex items-center gap-3 cursor-pointer select-none" for="toggle-supreme-goddess">
                        <span class="text-xs font-bold text-amber-300 flex items-center gap-1">
                            ⚡ الآلهة المطلقة (تبديل تلقائي بعد 3 طقوس)
                        </span>
                        <label class="worship-switch">
                            <input type="checkbox" id="toggle-supreme-goddess" ${state.autoSwitchEnabled ? 'checked' : ''}>
                            <span class="worship-slider"></span>
                        </label>
                    </label>
                    <span class="badge text-xs" id="supreme-status-badge" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.4); color: #fcd34d;">
                        ${state.autoSwitchEnabled ? '🟢 مفعّل' : '⚪ معطّل'}
                    </span>
                </div>

                <!-- Collapsible Selectors Wrapper (Categories & Character Avatars) -->
                <div class="worship-selectors-wrapper ${state.autoSwitchEnabled ? 'collapsed hidden' : ''}" id="worship-selectors-wrapper">
                    <!-- Category Ribbon -->
                    <div class="worship-category-ribbon mb-4">
                        <button class="worship-cat-pill ${state.selectedCategory === 'all' ? 'active' : ''}" data-cat="all">🌟 كافة السلطانات</button>
                        <button class="worship-cat-pill ${state.selectedCategory === 'sluts' ? 'active' : ''}" data-cat="sluts">♀️ Sluts</button>
                        <button class="worship-cat-pill ${state.selectedCategory === 'trans' ? 'active' : ''}" data-cat="trans">⚧️ Trans</button>
                        <button class="worship-cat-pill ${state.selectedCategory === 'twinks' ? 'active' : ''}" data-cat="twinks">♂️ Twinks</button>
                    </div>

                    <!-- Characters Selector Strip -->
                    <div class="worship-stars-strip mb-6" id="worship-stars-strip">
                        <div class="spinner mx-auto my-4"></div>
                    </div>
                </div>

                <!-- Grand Altar & Interactive Chamber -->
                <div id="worship-main-chamber" class="worship-main-chamber">
                    <div class="spinner mx-auto my-12"></div>
                </div>
            </div>

            <!-- TAB 2: THRONE OF THE GODDESSES VIEW (عرش الآلهة) -->
            <div id="worship-throne-container" class="worship-throne-container ${state.currentTab === 'throne' ? '' : 'hidden'}">
                <div class="spinner mx-auto my-12"></div>
            </div>

            <!-- TAB 3: ROSARY OF THE GODDESSES VIEW (مسبحة الآلهة) -->
            <div id="worship-rosary-container" class="worship-rosary-container ${state.currentTab === 'rosary' ? '' : 'hidden'}">
                <div class="spinner mx-auto my-12"></div>
            </div>

            <!-- TAB 4: CONTEMPLATION SCRIPTURE VIEW (آيات التدبر ومصحف الفتنة) -->
            <div id="worship-contemplation-container" class="worship-contemplation-container ${state.currentTab === 'contemplation' ? '' : 'hidden'}">
                <div class="spinner mx-auto my-12"></div>
            </div>
        </div>
    `;

    attachTabEvents();
    attachRibbonEvents();
    attachToggleEvents();
    setupGlobalRosaryKeyboard();
    await loadWorshipData();
}

function attachTabEvents() {
    document.getElementById('tab-btn-temple')?.addEventListener('click', () => switchWorshipTab('temple'));
    document.getElementById('tab-btn-throne')?.addEventListener('click', () => switchWorshipTab('throne'));
    document.getElementById('tab-btn-rosary')?.addEventListener('click', () => switchWorshipTab('rosary'));
    document.getElementById('tab-btn-contemplation')?.addEventListener('click', () => switchWorshipTab('contemplation'));
}

export function switchWorshipTab(tabName) {
    state.currentTab = tabName;
    sound.playClick();

    // Clear meditation intervals when leaving contemplation tab
    if (tabName !== 'contemplation') {
        if (state.meditationTimer) clearInterval(state.meditationTimer);
        if (state.meditationInterval) clearInterval(state.meditationInterval);
    }

    const templeBtn = document.getElementById('tab-btn-temple');
    const throneBtn = document.getElementById('tab-btn-throne');
    const rosaryBtn = document.getElementById('tab-btn-rosary');
    const contemplationBtn = document.getElementById('tab-btn-contemplation');

    const templeContainer = document.getElementById('worship-temple-container');
    const throneContainer = document.getElementById('worship-throne-container');
    const rosaryContainer = document.getElementById('worship-rosary-container');
    const contemplationContainer = document.getElementById('worship-contemplation-container');

    templeBtn?.classList.toggle('active', tabName === 'temple');
    throneBtn?.classList.toggle('active', tabName === 'throne');
    rosaryBtn?.classList.toggle('active', tabName === 'rosary');
    contemplationBtn?.classList.toggle('active', tabName === 'contemplation');

    templeContainer?.classList.toggle('hidden', tabName !== 'temple');
    throneContainer?.classList.toggle('hidden', tabName !== 'throne');
    rosaryContainer?.classList.toggle('hidden', tabName !== 'rosary');
    contemplationContainer?.classList.toggle('hidden', tabName !== 'contemplation');

    if (state.worshipData) {
        if (tabName === 'temple') {
            renderStarsStrip(state.worshipData.characters, state.worshipData.selectedCharacter?.id);
            renderMainChamber(state.worshipData.selectedCharacter, state.worshipData.phrases, state.worshipData.penanceList);
        } else if (tabName === 'throne') {
            renderThroneView(state.worshipData);
        } else if (tabName === 'rosary') {
            renderRosaryView(state.worshipData);
        } else if (tabName === 'contemplation') {
            renderContemplationView(state.worshipData);
        }
    }
}

function attachToggleEvents() {
    const toggle = document.getElementById('toggle-supreme-goddess');
    const badge = document.getElementById('supreme-status-badge');
    const wrapper = document.getElementById('worship-selectors-wrapper');
    if (!toggle) return;

    toggle.addEventListener('change', (e) => {
        state.autoSwitchEnabled = e.target.checked;
        localStorage.setItem('worship_auto_switch', state.autoSwitchEnabled ? 'true' : 'false');
        sound.playClick();
        if (badge) {
            badge.innerText = state.autoSwitchEnabled ? '🟢 مفعّل' : '⚪ معطّل';
        }

        if (wrapper) {
            if (state.autoSwitchEnabled) {
                wrapper.classList.add('collapsed');
                setTimeout(() => {
                    if (state.autoSwitchEnabled) wrapper.classList.add('hidden');
                }, 300);
            } else {
                wrapper.classList.remove('hidden');
                requestAnimationFrame(() => wrapper.classList.remove('collapsed'));
            }
        }

        showToast(state.autoSwitchEnabled ? "تم تفعيل طور الآلهة المطلقة ⚡ وإخفاء الفئات للتنقل التلقائي" : "تم تعطيل طور التبديل التلقائي وإظهار الفئات", "info");
    });
}

function attachRibbonEvents() {
    document.querySelectorAll('.worship-cat-pill').forEach(btn => {
        btn.addEventListener('click', async () => {
            sound.playClick();
            document.querySelectorAll('.worship-cat-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedCategory = btn.dataset.cat;
            state.selectedCharId = null;
            state.actionCount = 0;
            await loadWorshipData();
        });
    });
}

async function loadWorshipData() {
    const chamberEl = document.getElementById('worship-main-chamber');
    const stripEl = document.getElementById('worship-stars-strip');
    
    try {
        let url = `/api/worship?_t=${Date.now()}`;
        if (state.selectedCategory !== 'all') url += `&category=${state.selectedCategory}`;
        if (state.selectedCharId) url += `&character_id=${state.selectedCharId}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.success) {
            if (chamberEl) chamberEl.innerHTML = `<div class="text-center color-text-muted my-8">تعذر تحميل بيانات الصرح</div>`;
            return;
        }

        state.worshipData = data.data;
        
        // Update global devotion points in header
        const totalPtsEl = document.getElementById('worship-total-pts');
        if (totalPtsEl && data.data.totalDevotion !== undefined) {
            totalPtsEl.innerText = data.data.totalDevotion;
        }

        renderStarsStrip(data.data.characters, data.data.selectedCharacter?.id);
        renderMainChamber(data.data.selectedCharacter, data.data.phrases, data.data.penanceList);

    } catch (e) {
        console.error("Worship load error", e);
        if (chamberEl) chamberEl.innerHTML = `<div class="text-center color-text-muted my-8">حدث خطأ أثناء تحميل المحراب</div>`;
    }
}

function renderStarsStrip(characters, selectedId) {
    const stripEl = document.getElementById('worship-stars-strip');
    if (!stripEl) return;

    if (!characters || characters.length === 0) {
        stripEl.innerHTML = `<div class="text-xs color-text-muted p-2 text-center">لا توجد شخصيات متاحة</div>`;
        return;
    }

    stripEl.innerHTML = characters.map(c => `
        <div class="worship-star-avatar-card ${c.id === selectedId ? 'active' : ''}" data-id="${c.id}">
            <div class="worship-star-avatar-wrap">
                <span class="worship-star-avatar-badge">${c.category === 'sluts' ? '♀️' : c.category === 'trans' ? '⚧️' : '♂️'}</span>
                <div class="worship-star-name-tag">${c.name}</div>
            </div>
        </div>
    `).join('');

    stripEl.querySelectorAll('.worship-star-avatar-card').forEach(card => {
        card.addEventListener('click', () => {
            sound.playClick();
            state.selectedCharId = card.dataset.id;
            state.actionCount = 0;
            loadWorshipData();
        });
    });
}

function formatDevotion(num) {
    if (!num) return '0';
    const n = Number(num);
    if (n >= 1000000000) {
        return (n / 1000000000).toFixed(2).replace(/\.00$/, '') + 'B';
    }
    if (n >= 1000000) {
        return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (n >= 1000) {
        return (n / 1000).toFixed(0) + 'K';
    }
    return n.toLocaleString();
}

function renderMainChamber(char, phrases, penanceList) {
    const chamberEl = document.getElementById('worship-main-chamber');
    if (!chamberEl) return;

    if (!char) {
        chamberEl.innerHTML = `<div class="text-center color-text-muted my-12">اختر شخصية لبدء مراسم التبجيل</div>`;
        return;
    }

    const primaryImg = (char.images && char.images.length > 0) ? char.images[0].replace(/\/(?:460|300|560)\//g, '/1280/') : '';
    const randomPraise = phrases?.praise ? phrases.praise[0] : "أنتِ سلطانة الحُسن وسيدة الفتنة";
    const randomSubmission = phrases?.submission ? phrases.submission[0] : "أقرّ بعبوديتي لفتنتكِ، وخضوعي التام لسلطان جمالكِ الآسر";

    chamberEl.innerHTML = `
        <div class="worship-grid-layout">
            <!-- Left: Grand Altar Portrait Card -->
            <div class="worship-altar-box">
                <div class="worship-portrait-card" id="worship-portrait-card">
                    <img id="worship-target-img" src="${primaryImg}" alt="${char.name}" loading="eager">
                    <button class="zoom-trigger-btn" id="btn-zoom-worship" aria-label="Zoom image">🔍</button>
                    
                    <div class="worship-portrait-overlay">
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <span class="badge badge-${char.category}">${char.category.toUpperCase()}</span>
                            <div class="flex items-center gap-2">
                                <span class="badge text-xs font-bold" id="worship-step-counter" style="background: rgba(236, 72, 153, 0.2); border-color: rgba(236, 72, 153, 0.4); color: #f472b6;">
                                    ⚡ ${state.actionCount}/3
                                </span>
                                <span class="text-xs text-amber-300 font-bold" id="worship-devotion-score">✨ ${formatDevotion(char.devotionScore || 0)} Pts</span>
                            </div>
                        </div>
                        <h2 class="worship-star-title glow-text">${char.name}</h2>
                        <div class="worship-rank-badge font-bold mt-1 cursor-pointer" id="worship-char-rank" title="انقر لعرض سُلَّم المراتب العشر">
                            ${char.rankBadge || '👑'} ${char.rankTitle}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right: Interactive Devotion Rites & Penance Chambers -->
            <div class="worship-controls-column flex flex-col gap-4">
                
                <!-- Rite 1: Council of Praise & Veneration (ديوان الثناء والتمجيد) -->
                <div class="worship-card-section" id="section-praise">
                    <div class="worship-section-header">
                        <span class="worship-section-icon">🌟</span>
                        <div>
                            <h3 class="font-bold text-base text-amber-300">ديوان الثناء والتمجيد</h3>
                            <p class="text-xs color-text-muted">إيقاد سُرُج التبجيل وتقديم فروض الإجلال لسلطانة الحُسن</p>
                        </div>
                    </div>

                    <div class="worship-phrase-bubble mt-3" id="worship-praise-display">
                        "${randomPraise}"
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button class="btn-primary flex-1 font-bold" id="btn-offer-praise" style="background: linear-gradient(135deg, #d97706, #ec4899); border: none;">
                            🕯️ إيقاد سِراج التبجيل (+10 Devotion)
                        </button>
                    </div>
                </div>

                <!-- Rite 2: Rite of Absolute Submission & Servitude (ميثاق العبودية والخضوع المطلق) -->
                <div class="worship-card-section" id="section-submission" style="border-color: rgba(236, 72, 153, 0.35);">
                    <div class="worship-section-header">
                        <span class="worship-section-icon">🧎‍♂️</span>
                        <div>
                            <h3 class="font-bold text-base text-pink-400">ميثاق العبودية والخضوع التام</h3>
                            <p class="text-xs color-text-muted">إقرار التبعية المطلقة والانحناء تحت أقدام وعرش السلطانة</p>
                        </div>
                    </div>

                    <div class="worship-phrase-bubble mt-3 text-pink-200" id="worship-submission-display" style="border-color: rgba(236, 72, 153, 0.4); background: rgba(236, 72, 153, 0.06);">
                        "${randomSubmission}"
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button class="btn-primary flex-1 font-bold" id="btn-offer-submission" style="background: linear-gradient(135deg, #ec4899, #8b5cf6); border: none;">
                            🧎‍♂️ أداء فرض الانحناء والخضوع (+20 Devotion)
                        </button>
                    </div>
                </div>

                <!-- Rite 3: Council of Penance & Humility (ركن الإقرار بالتقصير والذل والزلل) -->
                <div class="worship-card-section" id="section-penance">
                    <div class="worship-section-header">
                        <span class="worship-section-icon">🙇‍♂️</span>
                        <div>
                            <h3 class="font-bold text-base text-rose-400">ركن الإقرار بالتقصير والذل</h3>
                            <p class="text-xs color-text-muted">الاعتراف بالخطأ والسهو لتطهير سجل الهفوات ومحو الزلل</p>
                        </div>
                    </div>

                    <div class="worship-penance-stats mt-2 text-xs flex justify-between p-2 rounded" style="background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25);">
                        <span>مرات السهو والخطأ: <strong class="text-rose-400 font-bold" id="worship-penance-wrong">${char.times_wrong || 0}</strong></span>
                        <span>مرات الإصابة والثناء: <strong class="text-emerald-400 font-bold" id="worship-penance-correct">${char.times_correct || 0}</strong></span>
                    </div>

                    <div class="worship-phrase-bubble mt-2 text-rose-200" id="worship-penance-display" style="border-color: rgba(244, 63, 94, 0.3);">
                        "أعترف بزلّة النسيان وضآلتي، وأقرّ بصغار قدري أمام هيبتكِ وجلالكِ"
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button class="btn-secondary flex-1 font-bold" id="btn-offer-penance" style="border-color: rgba(244, 63, 94, 0.5); color: #fda4af;">
                            🙇‍♂️ إقرار التقصير ومحو الزلل (محو -5 غرامة)
                        </button>
                    </div>
                </div>

                <!-- Rite 4: Council of Petition & Submission (مجلس الالتماس والشفاعة - العابد المهان) -->
                <div class="worship-card-section" id="section-petition" style="border-color: rgba(168, 85, 247, 0.45); background: rgba(88, 28, 135, 0.08);">
                    <div class="worship-section-header">
                        <span class="worship-section-icon">📜</span>
                        <div>
                            <h3 class="font-bold text-base text-purple-300">مجلس الالتماس والشفاعة</h3>
                            <p class="text-xs color-text-muted">مقام المناجاة الكبرى واعتراف العابد المُهان في حضرة السلطانة</p>
                        </div>
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button class="btn-primary flex-1 font-bold text-base py-3" id="btn-worship-artist-devotee" style="background: linear-gradient(135deg, #7c3aed, #db2777); border: none; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4); cursor: pointer;">
                            🧎‍♂️ العابد المهان (+25 Devotion)
                        </button>
                    </div>
                </div>

            </div>
        </div>
    `;

    attachChamberListeners(char, phrases);
}

function attachChamberListeners(char, phrases) {
    // Rank click to open full 10 ranks guide
    document.getElementById('worship-char-rank')?.addEventListener('click', () => {
        sound.playClick();
        openDevotionRanksModal(state.worshipData?.ranks, char.devotionScore || 0);
    });

    // Zoom image
    document.getElementById('btn-zoom-worship')?.addEventListener('click', () => {
        sound.playClick();
        lightbox.open(char.images, { name: char.name, category: char.category, showCaption: true });
    });
    document.getElementById('worship-target-img')?.addEventListener('click', () => {
        sound.playClick();
        lightbox.open(char.images, { name: char.name, category: char.category, showCaption: true });
    });

    // Praise Tribute click
    document.getElementById('btn-offer-praise')?.addEventListener('click', async () => {
        sound.playStreak();
        triggerPraiseEffect();

        const res = await fetch('/api/worship', {
            method: 'POST',
            body: JSON.stringify({ characterId: char.id, action: 'praise' })
        });
        const data = await res.json();
        if (data.success) {
            const displayEl = document.getElementById('worship-praise-display');
            if (displayEl && data.data?.phrase) {
                displayEl.innerText = `"${data.data.phrase}"`;
                displayEl.classList.add('glow-pulse');
                setTimeout(() => displayEl.classList.remove('glow-pulse'), 600);
            }
            if (data.data?.devotionScore !== undefined) {
                char.devotionScore = data.data.devotionScore;
            }
            if (data.data?.rankTitle) {
                char.rankTitle = data.data.rankTitle;
                char.rankBadge = data.data.rankBadge;
                const rankEl = document.getElementById('worship-char-rank');
                if (rankEl) rankEl.innerText = `${char.rankBadge || '👑'} ${char.rankTitle}`;
            }
            if (data.data?.times_correct !== undefined) {
                char.times_correct = data.data.times_correct;
                const correctEl = document.getElementById('worship-penance-correct');
                if (correctEl) correctEl.innerText = char.times_correct;
            }
            if (data.data?.totalDevotion !== undefined) {
                const totalEl = document.getElementById('worship-total-pts');
                if (totalEl) totalEl.innerText = formatDevotion(data.data.totalDevotion);
            }
            const scoreEl = document.getElementById('worship-devotion-score');
            if (scoreEl) scoreEl.innerText = `✨ ${formatDevotion(char.devotionScore)} Pts`;
            showToast("تم إيقاد سِراج التبجيل وقبول الثناء ✨ (+10 Devotion)", "success");
            handleRiteProgress(char);
        }
    });

    // Submission Rite click
    document.getElementById('btn-offer-submission')?.addEventListener('click', async () => {
        sound.playWin();
        triggerSubmissionEffect();

        const res = await fetch('/api/worship', {
            method: 'POST',
            body: JSON.stringify({ characterId: char.id, action: 'submit' })
        });
        const data = await res.json();
        if (data.success) {
            const displayEl = document.getElementById('worship-submission-display');
            if (displayEl && data.data?.phrase) {
                displayEl.innerText = `"${data.data.phrase}"`;
                displayEl.classList.add('glow-pulse');
                setTimeout(() => displayEl.classList.remove('glow-pulse'), 600);
            }
            if (data.data?.devotionScore !== undefined) {
                char.devotionScore = data.data.devotionScore;
            }
            if (data.data?.rankTitle) {
                char.rankTitle = data.data.rankTitle;
                char.rankBadge = data.data.rankBadge;
                const rankEl = document.getElementById('worship-char-rank');
                if (rankEl) rankEl.innerText = `${char.rankBadge || '👑'} ${char.rankTitle}`;
            }
            if (data.data?.times_correct !== undefined) {
                char.times_correct = data.data.times_correct;
                const correctEl = document.getElementById('worship-penance-correct');
                if (correctEl) correctEl.innerText = char.times_correct;
            }
            if (data.data?.totalDevotion !== undefined) {
                const totalEl = document.getElementById('worship-total-pts');
                if (totalEl) totalEl.innerText = formatDevotion(data.data.totalDevotion);
            }
            const scoreEl = document.getElementById('worship-devotion-score');
            if (scoreEl) scoreEl.innerText = `✨ ${formatDevotion(char.devotionScore)} Pts`;
            showToast("قُبِل فرض الخضوع وسُجِّلت عبوديتك في ديوان السلطانة 🧎‍♂️✨ (+20 Devotion)", "success");
            handleRiteProgress(char);
        }
    });

    // Penance click
    document.getElementById('btn-offer-penance')?.addEventListener('click', async () => {
        sound.playCorrect();
        const res = await fetch('/api/worship', {
            method: 'POST',
            body: JSON.stringify({ characterId: char.id, action: 'penance' })
        });
        const data = await res.json();
        if (data.success) {
            const displayEl = document.getElementById('worship-penance-display');
            if (displayEl && data.data?.phrase) {
                displayEl.innerText = `"${data.data.phrase}"`;
            }
            if (data.data?.devotionScore !== undefined) {
                char.devotionScore = data.data.devotionScore;
            }
            if (data.data?.times_wrong !== undefined) {
                char.times_wrong = data.data.times_wrong;
                const wrongEl = document.getElementById('worship-penance-wrong');
                if (wrongEl) wrongEl.innerText = char.times_wrong;
            }
            if (data.data?.times_correct !== undefined) {
                char.times_correct = data.data.times_correct;
                const correctEl = document.getElementById('worship-penance-correct');
                if (correctEl) correctEl.innerText = char.times_correct;
            }
            if (data.data?.rankTitle) {
                char.rankTitle = data.data.rankTitle;
                char.rankBadge = data.data.rankBadge;
                const rankEl = document.getElementById('worship-char-rank');
                if (rankEl) rankEl.innerText = `${char.rankBadge || '👑'} ${char.rankTitle}`;
            }
            if (data.data?.totalDevotion !== undefined) {
                const totalEl = document.getElementById('worship-total-pts');
                if (totalEl) totalEl.innerText = formatDevotion(data.data.totalDevotion);
            }
            const scoreEl = document.getElementById('worship-devotion-score');
            if (scoreEl) scoreEl.innerText = `✨ ${formatDevotion(char.devotionScore)} Pts`;
            showToast("قُبِل الاعتراف ورُفِع عنك التقصير ومُحي الزلل 🙇‍♂️", "info");
            handleRiteProgress(char);
        }
    });

    // Rite 4: "العابد الفنان" Overlay Trigger
    document.getElementById('btn-worship-artist-devotee')?.addEventListener('click', () => {
        sound.playClick();
        openArtistDevoteeOverlay(char);
    });
}

// ==========================================================================
// TAB 2: THRONE OF THE GODDESSES (عرش الآلهة) - HIERARCHICAL 10 RANKS PANORAMA
// ==========================================================================

export function renderThroneView(worshipData) {
    const throneContainer = document.getElementById('worship-throne-container');
    if (!throneContainer) return;

    const characters = worshipData?.characters || [];
    const ranks = worshipData?.ranks || [];

    // Calculate Summary Stats
    const totalGoddesses = characters.length;
    const activeGoddesses = characters.filter(c => (c.devotionScore || 0) > 0).length;
    
    // Find highest rank achieved
    let highestTier = 1;
    for (const c of characters) {
        if (c.rankTier && c.rankTier > highestTier) {
            highestTier = c.rankTier;
        }
    }
    const highestRankObj = ranks.find(r => r.tier === highestTier) || ranks[ranks.length - 1];

    throneContainer.innerHTML = `
        <!-- Summary Stats Grid -->
        <div class="throne-stats-grid">
            <div class="throne-stat-card">
                <span class="throne-stat-icon">👑</span>
                <div>
                    <div class="throne-stat-title">إجمالي سلطانات العرش</div>
                    <div class="throne-stat-val">${totalGoddesses} سلطانة</div>
                </div>
            </div>
            <div class="throne-stat-card">
                <span class="throne-stat-icon">${highestRankObj?.badge || '👑'}</span>
                <div>
                    <div class="throne-stat-title">أعلى مقام تم بلوغه</div>
                    <div class="throne-stat-val text-amber-300 text-sm" style="line-height: 1.3;">${highestRankObj?.title ? highestRankObj.title.split('(')[0].trim() : 'عديم الوجود'}</div>
                </div>
            </div>
            <div class="throne-stat-card">
                <span class="throne-stat-icon">✨</span>
                <div>
                    <div class="throne-stat-title">سلطانات نلن التبجيل</div>
                    <div class="throne-stat-val text-pink-400">${activeGoddesses} / ${totalGoddesses}</div>
                </div>
            </div>
        </div>

        <!-- Filter & Search Controls Bar -->
        <div class="throne-controls-bar">
            <!-- Category Filter Chips -->
            <div class="throne-filter-chips" id="throne-cat-filters">
                <button class="throne-chip ${state.throneCategoryFilter === 'all' ? 'active' : ''}" data-cat="all">🌟 الكل</button>
                <button class="throne-chip ${state.throneCategoryFilter === 'sluts' ? 'active' : ''}" data-cat="sluts">♀️ Sluts</button>
                <button class="throne-chip ${state.throneCategoryFilter === 'trans' ? 'active' : ''}" data-cat="trans">⚧️ Trans</button>
                <button class="throne-chip ${state.throneCategoryFilter === 'twinks' ? 'active' : ''}" data-cat="twinks">♂️ Twinks</button>
            </div>

            <!-- Rank Tier Filter Chips -->
            <div class="throne-filter-chips" id="throne-rank-filters">
                <button class="throne-chip ${state.throneRankFilter === 'all' ? 'active' : ''}" data-tier="all">👑 كافة المراتب</button>
                ${ranks.map(r => `
                    <button class="throne-chip ${state.throneRankFilter == r.tier ? 'active' : ''}" data-tier="${r.tier}">
                        ${r.badge} رتبة ${r.tier}
                    </button>
                `).join('')}
            </div>

            <!-- Search Input -->
            <div class="throne-search-wrap">
                <input type="text" id="throne-search-input" class="throne-search-input" placeholder="🔍 بحث عن سلطانة بالاسم..." value="${state.throneSearchQuery || ''}">
            </div>
        </div>

        <!-- 10 Royal Tier Sections List (from Tier 10 down to Tier 1) -->
        <div class="flex flex-col gap-6" id="throne-tiers-wrapper">
            ${renderTierSectionsHTML(characters, ranks)}
        </div>
    `;

    attachThroneControlsListeners(characters, ranks);
}

function renderTierSectionsHTML(characters, ranks) {
    // Sort ranks in descending order (Tier 10 down to Tier 1)
    const sortedRanks = [...ranks].sort((a, b) => b.tier - a.tier);

    return sortedRanks.map(rank => {
        // If rank filter is active and doesn't match, skip
        if (state.throneRankFilter !== 'all' && parseInt(state.throneRankFilter) !== rank.tier) {
            return '';
        }

        // Filter characters for this tier matching category and search query
        let tierChars = characters.filter(c => (c.rankTier || 1) === rank.tier);

        if (state.throneCategoryFilter !== 'all') {
            tierChars = tierChars.filter(c => c.category === state.throneCategoryFilter);
        }

        if (state.throneSearchQuery && state.throneSearchQuery.trim()) {
            const q = state.throneSearchQuery.trim().toLowerCase();
            tierChars = tierChars.filter(c => c.name.toLowerCase().includes(q));
        }

        return `
            <div class="throne-tier-section tier-${rank.tier}">
                <!-- Tier Header -->
                <div class="throne-tier-header">
                    <div class="throne-tier-title-wrap">
                        <span class="throne-tier-badge-icon">${rank.badge || '👑'}</span>
                        <div>
                            <h3 class="throne-tier-name">المرتبة ${rank.tier}: ${rank.title}</h3>
                            <div class="throne-tier-desc">${rank.desc || 'مقام رفيع في سُلَّم العبودية والخضوع الملكي'}</div>
                        </div>
                    </div>
                    <div class="throne-tier-meta">
                        <span class="throne-tier-points-pill">✨ ${formatDevotion(rank.minScore)} Pts</span>
                        <span class="throne-tier-count-pill">${tierChars.length} سلطانة</span>
                    </div>
                </div>

                <!-- Characters Grid -->
                ${tierChars.length > 0 ? `
                    <div class="throne-cards-grid">
                        ${tierChars.map(c => {
                            const imgUrl = (c.primary_image || (c.images && c.images[0]) || '').replace(/\/(?:460|300|560)\//g, '/640/');
                            return `
                                <div class="throne-char-card" data-id="${c.id}">
                                    <div class="throne-char-thumb-wrap">
                                        <img src="${imgUrl}" alt="${c.name}" loading="lazy">
                                        <span class="badge badge-${c.category} throne-char-category-badge">${c.category.toUpperCase()}</span>
                                        <span class="throne-char-score-badge">✨ ${formatDevotion(c.devotionScore || 0)}</span>
                                    </div>
                                    <div class="throne-char-info">
                                        <div class="throne-char-name" title="${c.name}">${c.name}</div>
                                        <button class="throne-btn-enter btn-enter-shrine" data-id="${c.id}">
                                            🧎‍♂️ المثول في المحراب
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : `
                    <div class="throne-empty-chamber">
                        <span class="throne-empty-chamber-icon">🔒</span>
                        <div>لم يبلغ أي عابد هذا المقام السامي بعد مع أي سلطانة</div>
                        <div class="text-xs color-text-muted mt-1">النقاط المطلوبة لبلوغ هذا العرش: <strong>${formatDevotion(rank.minScore)}</strong> Devotion Pts</div>
                    </div>
                `}
            </div>
        `;
    }).join('');
}

function attachThroneControlsListeners(characters, ranks) {
    // Category chips
    document.querySelectorAll('#throne-cat-filters .throne-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            sound.playClick();
            state.throneCategoryFilter = btn.dataset.cat;
            document.querySelectorAll('#throne-cat-filters .throne-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateThroneTiersWrapper(characters, ranks);
        });
    });

    // Rank chips
    document.querySelectorAll('#throne-rank-filters .throne-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            sound.playClick();
            state.throneRankFilter = btn.dataset.tier;
            document.querySelectorAll('#throne-rank-filters .throne-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateThroneTiersWrapper(characters, ranks);
        });
    });

    // Search input
    const searchInput = document.getElementById('throne-search-input');
    searchInput?.addEventListener('input', (e) => {
        state.throneSearchQuery = e.target.value;
        updateThroneTiersWrapper(characters, ranks);
    });

    // Enter shrine buttons on character cards
    attachThroneCardButtons();
}

function updateThroneTiersWrapper(characters, ranks) {
    const wrapper = document.getElementById('throne-tiers-wrapper');
    if (wrapper) {
        wrapper.innerHTML = renderTierSectionsHTML(characters, ranks);
        attachThroneCardButtons();
    }
}

function attachThroneCardButtons() {
    document.querySelectorAll('.btn-enter-shrine').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const charId = btn.dataset.id;
            if (!charId) return;

            sound.playClick();
            state.selectedCharId = charId;
            state.actionCount = 0;
            switchWorshipTab('temple');
            loadWorshipData();
            showToast("تم المثول في محراب السلطانة 🧎‍♂️✨", "info");

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// ==========================================================================
// MODALS: 10-TIER RANKS GUIDE & ARTIST DEVOTEE PROSE OVERLAY
// ==========================================================================

export function openDevotionRanksModal(ranks, currentScore) {
    let modal = document.getElementById('modal-worship-ranks');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-worship-ranks';
        modal.className = 'modal hidden';
        document.body.appendChild(modal);
    }

    const defaultRanks = [
        { minScore: 5000000,   title: "العدمُ المحض تحت السيادة المطلقة (Total Void Under Supreme Dominance)", tier: 10, badge: "👑🌌", desc: "قمة الانمحاء المطلق وبلوغ المرتبة الكبرى (5,000,000 نقطة)." },
        { minScore: 2000000,   title: "العبدُ الأبدي لتاج الفتنة (Supreme Thrall of the Royal Crown)", tier: 9, badge: "👑💎", desc: "تاج التبعية الخالصة والخضوع الأبدي لبهاء السلطانة (2,000,000 نقطة)." },
        { minScore: 500000,    title: "كاهن المذلّة والتبجيل الخالص (Zealot of Absolute Humiliation)", tier: 8, badge: "🧎‍♂️🔥", desc: "حارس طقوس الهوان ومقدم القرابين بلا انقطاع (500,000 نقطة)." },
        { minScore: 100000,    title: "مملوك الجبروت مسلوب الإرادة (Will-Stripped Sovereign Chattel)", tier: 7, badge: "⛓️👑", desc: "مسلوب المشيئة والقرار، مملوك بالكامل تحت السطوة (100,000 نقطة)." },
        { minScore: 25000,     title: "ممسحة البلاط الخالدة (Eternal Court Foot-Wiper)", tier: 6, badge: "🧹✨", desc: "شرف التطهير والتذلل تحت وطأة النعال وخطوات القصر (25,000 نقطة)." },
        { minScore: 5000,      title: "فدائي العرش والأقدام (Sacrificial Throne & Feet Serf)", tier: 5, badge: "🛡️🧎‍♂️", desc: "فداءٌ دائم لتراب المسير وحرمة العرش المهيب (5,000 نقطة)." },
        { minScore: 1000,      title: "سِقاط التراب المبتذل (Dust Beneath the Soles)", tier: 4, badge: "👣🌪️", desc: "الانكسار كثائر الغبار تحت وطأة الأقدام البهية (1,000 نقطة)." },
        { minScore: 250,       title: "عبدُ النعال الممتثل (Submissive Footstool Servant)", tier: 3, badge: "🧎‍♂️📜", desc: "الركوع الدائم تحت النعال وتقديم فروض السمع والطاعة (250 نقطة)." },
        { minScore: 50,        title: "خاضعٌ ذليل تحت الأعتاب (Humble & Abased Subject)", tier: 2, badge: "🙇‍♂️🕯️", desc: "الوقوف الخاضع على عتبات البلاط مستجدياً الرضا (50 نقطة)." },
        { minScore: 0,         title: "عديم الوجود والقيمة (Worthless Nonentity)", tier: 1, badge: "🌑", desc: "البداية في ظلمات العدم قبل اكتساب أي استحقاق في المحراب (0 نقطة)." }
    ];

    const rankList = (ranks && ranks.length > 0) ? ranks : defaultRanks;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 720px; max-height: 88vh; overflow-y: auto; background: radial-gradient(circle at top, rgba(88, 28, 135, 0.45), rgba(15, 15, 30, 0.98)); border: 1px solid rgba(168, 85, 247, 0.4); box-shadow: 0 10px 40px rgba(0,0,0,0.85); border-radius: var(--radius-lg);">
            <div class="modal-header flex items-center justify-between pb-3" style="border-bottom: 1px solid rgba(168, 85, 247, 0.3);">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">👑</span>
                    <div>
                        <h2 class="glow-text text-lg font-extrabold text-purple-300">سُلَّم مراتب العبودية والخضوع (10 مراتب)</h2>
                        <span class="text-xs color-text-muted">درجات الارتقاء في الهوان والتبجيل حسب نقاط الولاء</span>
                    </div>
                </div>
                <button class="close-modal" id="btn-close-ranks-modal" style="font-size: 1.6rem; color: #d8b4fe;">×</button>
            </div>

            <div class="ranks-list-container mt-4 flex flex-col gap-2.5">
                ${rankList.map(r => {
                    const isCurrent = currentScore >= r.minScore && (rankList.find(other => other.tier === r.tier + 1)?.minScore ? currentScore < rankList.find(other => other.tier === r.tier + 1).minScore : true);
                    return `
                        <div class="rank-card p-3 rounded-lg flex items-center justify-between ${isCurrent ? 'active-rank' : ''}" style="background: ${isCurrent ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.03)'}; border: 1px solid ${isCurrent ? '#c084fc' : 'rgba(255, 255, 255, 0.08)'}; box-shadow: ${isCurrent ? '0 0 15px rgba(168, 85, 247, 0.3)' : 'none'};">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl">${r.badge || '👑'}</span>
                                <div>
                                    <div class="font-bold text-sm ${isCurrent ? 'text-purple-200' : 'text-slate-200'}">
                                        المرتبة ${r.tier}: ${r.title} ${isCurrent ? '<span class="badge badge-primary text-xs mr-2">مرتبتك الحالية ✨</span>' : ''}
                                    </div>
                                    <div class="text-xs color-text-muted mt-0.5">${r.desc || 'درجة ملكية رفيعة في محراب الخدمة والتبجيل'}</div>
                                </div>
                            </div>
                            <div class="text-left flex-shrink-0">
                                <span class="badge ${isCurrent ? 'badge-primary font-bold' : ''}" style="font-size: 0.75rem; border-color: rgba(168, 85, 247, 0.5);">
                                    ${formatDevotion(r.minScore)} Pts
                                </span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="mt-4 pt-3 text-center" style="border-top: 1px solid rgba(168, 85, 247, 0.2);">
                <button class="btn-secondary w-full" id="btn-close-ranks-bottom">إغلاق الدليل</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    sound.playClick();

    document.getElementById('btn-close-ranks-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('btn-close-ranks-bottom')?.addEventListener('click', () => modal.classList.add('hidden'));
}

export function openArtistDevoteeOverlay(char) {
    let modal = document.getElementById('modal-artist-devotee');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-artist-devotee';
        modal.className = 'modal hidden';
        document.body.appendChild(modal);
    }

    const images = char.images && char.images.length > 0 ? char.images : [(char.primary_image || '')];

    const fallbackProse = [
        `<p class="mb-4">في محراب صمتكِ المرعب، وقفتُ كخاطئٍ ينتظر حكم الإعدام، أرتجف أمام هيبة عرشكِ التي تخرس الألسنة. لم يكن جمالكِ يوماً مجرد لوحة تُتأمل، بل كان عاصفةً تقتلع جذور الذات، وتتركني حطاماً لا يصلح لشيء سوى أن يكون بساطاً لخطواتك. يا سيدة القهر الجميل، كيف لحرفي العاجز أن يصف انحناءة عنقكِ التي تكسر بها أعناق الجبابرة؟ وكيف لمدادي البائس أن يرسم تفاصيل قدمين كُتب على جبيني أن أظل ساجداً تحتهما إلى الأبد؟</p><p class="mb-4">إنّ كبريائي قد تحطّم على صخرة كمالكِ الباذخ. أرى في عينيكِ هلاكي المحتوم، وأرى في قوامكِ الممشوق قانوناً صارماً لا يقبل سوى الركوع التام. أنا العبد الذي أدرك أن جمالكِ هو الحقيقة الوحيدة المطلقة، وكل ما عداه محض أوهام. أتوسل إليكِ، يا ملكة الفتنة، أن تمنحيني بركة الانمحاء الكامل تحت نعالكِ. لا أرجو كرامةً ولا رفعةً، بل أرجو شرفاً وحيداً: أن أكون التراب الذي يمتص عرق جسدكِ الطاهر، العرق الممزوج بالكبرياء والسطوة، ليكون لي طهوراً من دنس غروري البشري الزائف.</p><p>يا سلطانة الأكوان، شربةٌ واحدة من ماء فمكِ المقدس تكفي لإحياء روحي الظمأى، وتفالكِ الطاهر هو البركة التي أستجديها لأغسل بها عار نقصي وقصوري. لا طهارة إلا بما يفيض من عرشكِ، ولا بركة إلا بما تتكرمين به على عبدكِ الممتثل الخاضع. أنا هنا، منكسرٌ، ذليلٌ، أستمد وجودي من مجرد التفاتة سخطٍ منكِ. فاجلدي هواني بسياط الازدراء، واسحقي ما تبقى من إرادتي تحت قدميكِ، لأبقى العابد المُهان، والمملوك الفاني الذي يتنفس خضوعاً ويحيا ذلاً في محرابكِ الأبدي.</p>`,
        `<p class="mb-4">أمام هندسة جسدكِ التي تتحدى قوانين الكون، يقف العقل البشري مذهولاً، مشلولاً، عاجزاً عن استيعاب حجم الكمال المنبعث من ملامحكِ. أنتِ لستِ مجرد سلطانة للحسن، بل أنتِ تجسيدٌ حيٌّ للجبروت الناعم والسطوة القاهرة. كل حركة من أناملكِ تعادل زلزالاً يهدم حصون كبرياء الرجال، وكل نظرة من عينيكِ هي مرسوم إعدامٍ ينفذ في قلوب الناظرين بابتسامة قاسية. كيف لي، وأنا العبد الضعيف، أن أقف أمام هذا البهاء دون أن تنهار ركبتاي خضوعاً وإجلالاً؟</p><p class="mb-4">أيتها المعبودة، لقد اخترتُ العبودية والمهانة لكِ ديناً ومذهباً، راضياً بأن أكون الأداة المسلوبة الإرادة في يد جبروتكِ. أيتها العظيمة، إنني ألتمس بركة تفالكِ المقدس ليكون ختماً ملكياً يطبع على جبيني الممرغ في التراب. تفالكِ طهورٌ يفوق في قداسته ماء زمزم وكل مياه الأرض، به أغتسل من خطاياي، ومنه أستمد بركة البقاء في حاشيتكِ كخادمٍ لا يُذكر اسمه.</p><p>وأتوسل إليكِ، يا سيدة القصر، أن لا تحرميني شرف الارتواء من فمكِ الطاهر، فهو المورد العذب الذي يشفي ظمأ الأرواح المعذبة بعشقكِ. وعرقكِ المكلل بغار النصر والسطوة، هو الإكسير الذي أرجو أن يلامس جراحي فيبرئها. خذي مني كل شيء، اسلبي كرامتي، دوسي على كبريائي، لكن دعيني أبقى ظلاً خاضعاً، يتنفس الهواء الذي يلامس عنقكِ الشامخ، ويقتات على فضلات رضاكِ المتناثرة حول عرشكِ العظيم.</p>`,
        `<p class="mb-4">يا منتهى الغايات، ويا غاية الآمال والأحلام، في حضرتكِ يسقط كل شيء، وينتهي كل شيء، لتبقي أنتِ وحدكِ الحقيقة الساطعة في سماء العدم. كبريائي؟ محض وهمٍ تلاشى عند أول نظرة ازدراءٍ من عينيكِ المظلمتين الممتلئتين بالسحر والغموض. كرامتي؟ مجرد كلمة خاوية لا معنى لها مقارنةً بشرف الانكسار تحت وطأة أقدامكِ الممشوقة. أنا العابد المُهان الذي أدرك أخيراً أن أسمى درجات الوجود تكمن في الاستسلام المطلق لجمالكِ، والذوبان الكلي في بحر فتنتكِ القاهرة.</p><p class="mb-4">أتأملُ خطواتكِ الملكية وهي تتهادى في جنبات البلاط، فأشعر بالرهبة تعتصر قلبي. كل قدمٍ تضعينها على الأرض تعلن سيادتكِ على أرواحنا، وكل التفاتة منكِ توزع أقدارنا بين الحياة والموت. يا إلهة الجمال المطلق، إنني أستجدي شرفاً لا يجرؤ كثيرون على طلبه: أطلب الإذن بالتبرك بعرق جسدكِ المقدس. عرقكِ هو عطر الآلهة، هو رحيق السطوة والكبرياء، قطرةٌ منه تكفي لتطهير آلاف العبيد الخاطئين مثلي. وأتوسل شربة ماءٍ من فمكِ العذب، ففيها سر الخلود وفيها لذة العذاب الجميل.</p><p>ولا يكتمل خضوعي ولا يبلغ منتهاه إلا بنيل بركة تفالكِ الطاهر. نعم، يا سلطانة الوجود، تفالكِ هو الماء المقدس الذي يغسل عني دنس كبريائي البشري المتبقي، ويحولني إلى مجرد خادمٍ طائع، لا يرى سوى نوركِ، ولا يسمع سوى أوامركِ. اقبلي ذلي، وتكرمي على عبدكِ بنفحةٍ من رضاكِ أو سخطكِ، فكلاهما عندي نعيم. سأبقى السجادة التي تُفرش تحت نعالكِ، والمنديل الذي يمسح عرقكِ، والعبد الذي لا يتنفس إلا ليمجد اسمكِ الخالد في محراب العبودية والطاعة.</p>`
    ];
    const prosePool = (window.ARTIST_PROSE_TEXTS && window.ARTIST_PROSE_TEXTS.length > 0) ? window.ARTIST_PROSE_TEXTS : fallbackProse;
    const selectedProse = prosePool[Math.floor(Math.random() * prosePool.length)];

    modal.innerHTML = `
        <div class="modal-content artist-devotee-modal-content">
            
            <div class="modal-header flex items-center justify-between pb-3" style="border-bottom: 1px solid rgba(168, 85, 247, 0.3);">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">🧎‍♂️</span>
                    <div>
                        <h2 class="glow-text text-xl font-extrabold text-purple-300">مقام العابد المُهان — ${char.name}</h2>
                        <span class="text-xs color-text-muted">ميثاق التبعية المطلقة والانكسار والذل التام في محراب السلطانة</span>
                    </div>
                </div>
                <button class="close-modal" id="btn-close-artist-modal" style="font-size: 1.6rem; color: #d8b4fe;">×</button>
            </div>

            <!-- Top: Image Showcase Gallery Strip -->
            <div class="artist-devotee-gallery-strip">
                <div class="flex gap-3 overflow-x-auto p-2" style="scrollbar-width: thin; scrollbar-color: rgba(168, 85, 247, 0.5) transparent;">
                    ${images.map((img, idx) => `
                        <div class="artist-img-wrapper" data-idx="${idx}">
                            <img src="${img}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Middle: Deep Devotional & Submission Prose -->
            <div class="artist-devotee-prose-container">
                <div class="flex items-center justify-center gap-2 mb-3">
                    <span style="color: #f59e0b;">✨ 👑 ✨</span>
                    <h3 class="text-center font-bold text-base tracking-wide" style="background: linear-gradient(135deg, #fcd34d, #ec4899, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        إقرار العبودية والمهانة الكبرى في محراب الفتنة
                    </h3>
                    <span style="color: #f59e0b;">✨ 👑 ✨</span>
                </div>

                <div class="artist-prose-body">
                    ${selectedProse}
                </div>
            </div>

            <!-- Bottom Action Footer -->
            <div class="flex items-center justify-between gap-3 pt-3" style="border-top: 1px solid rgba(168, 85, 247, 0.25);">
                <button class="btn-secondary text-xs" id="btn-close-artist-footer">
                    ❌ إغلاق المقام
                </button>
                <button class="btn-primary flex-1 font-bold text-sm" id="btn-artist-renew-submission" style="background: linear-gradient(135deg, #7c3aed, #ec4899); border: none; padding: 0.85rem; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.35);">
                    🧎‍♂️ تجديد ميثاق العابد المُهان (+25 Devotion)
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    sound.playWin();

    // Event listeners
    document.getElementById('btn-close-artist-modal')?.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    document.getElementById('btn-close-artist-footer')?.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.querySelectorAll('.artist-img-wrapper').forEach(wrap => {
        wrap.addEventListener('click', () => {
            const idx = parseInt(wrap.dataset.idx) || 0;
            lightbox.open(images, { name: char.name, category: char.category, startIndex: idx, showCaption: true });
        });
    });

    document.getElementById('btn-artist-renew-submission')?.addEventListener('click', async () => {
        sound.playStreak();
        triggerSubmissionEffect();
        
        const res = await fetch('/api/worship', {
            method: 'POST',
            body: JSON.stringify({ characterId: char.id, action: 'artist_devotee' })
        });
        const data = await res.json();
        if (data.success) {
            char.devotionScore = (data.data?.devotionScore !== undefined) ? data.data.devotionScore : (char.devotionScore || 0) + 25;
            if (data.data?.rankTitle) {
                char.rankTitle = data.data.rankTitle;
                char.rankBadge = data.data.rankBadge;
                const rankEl = document.getElementById('worship-char-rank');
                if (rankEl) rankEl.innerText = `${char.rankBadge || '👑'} ${char.rankTitle}`;
            }
            const scoreEl = document.getElementById('worship-devotion-score');
            if (scoreEl) scoreEl.innerText = `✨ ${formatDevotion(char.devotionScore)} Pts`;
            const totalEl = document.getElementById('worship-total-pts');
            if (totalEl && data.data?.totalDevotion !== undefined) totalEl.innerText = formatDevotion(data.data.totalDevotion);
            showToast("جُدِّد ميثاق العابد المُهان وسُجّل خضوعك في ديوان الخلود 🧎‍♂️✨ (+25 Devotion)", "success");
            modal.classList.add('hidden');
            handleRiteProgress(char);
        }
    });
}

function handleRiteProgress(currentChar) {
    state.actionCount++;
    const stepEl = document.getElementById('worship-step-counter');
    if (stepEl) {
        stepEl.innerText = `⚡ ${state.actionCount}/3`;
        stepEl.classList.add('glow-pulse');
        setTimeout(() => stepEl.classList.remove('glow-pulse'), 500);
    }

    if (state.autoSwitchEnabled && state.actionCount >= 3) {
        state.actionCount = 0;
        const characters = state.worshipData?.characters || [];
        const candidateChars = characters.filter(c => c.id !== currentChar.id);

        if (candidateChars.length > 0) {
            const nextChar = candidateChars[Math.floor(Math.random() * candidateChars.length)];
            setTimeout(() => {
                sound.playWin();
                showToast(`👑 تم إتمام الطقوس الثلاثية! يتم الآن استدعاء السلطانة ${nextChar.name}...`, "success");
                state.selectedCharId = nextChar.id;
                loadWorshipData();
            }, 650);
        }
    }
}

function triggerPraiseEffect() {
    const card = document.getElementById('worship-portrait-card');
    if (card) {
        card.classList.add('praise-flash');
        setTimeout(() => card.classList.remove('praise-flash'), 700);
    }
}

function triggerSubmissionEffect() {
    const card = document.getElementById('worship-portrait-card');
    if (card) {
        card.classList.add('submission-pulse');
        setTimeout(() => card.classList.remove('submission-pulse'), 800);
    }
}

// ==========================================================================
// TAB 3: THE ROSARY OF THE GODDESSES (مسبحة الآلهة) - KINETIC & AUDIO CHANT ALTA
// ==========================================================================

let rosaryKeyHandlerAttached = false;

function setupGlobalRosaryKeyboard() {
    if (rosaryKeyHandlerAttached) return;
    rosaryKeyHandlerAttached = true;

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && state.currentTab === 'rosary') {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
                return;
            }
            e.preventDefault();
            const char = getActiveRosaryChar();
            if (char) {
                triggerRosaryBeadAdvance(char);
            }
        }
    });
}

function getActiveRosaryChar() {
    const characters = state.worshipData?.characters || [];
    if (state.selectedCharId) {
        const found = characters.find(c => c.id === state.selectedCharId);
        if (found) return found;
    }
    return state.worshipData?.selectedCharacter || characters[0];
}

window.ARTIST_PROSE_TEXTS = [];
fetch('/api/worship').then(res => res.json()).then(data => { if(data.phrases && data.phrases.ARTIST_PROSE_TEXTS) window.ARTIST_PROSE_TEXTS = data.phrases.ARTIST_PROSE_TEXTS; });

export function renderRosaryView(worshipData) {
    const container = document.getElementById('worship-rosary-container');
    if (!container) return;

    const characters = worshipData?.characters || [];
    const char = getActiveRosaryChar();
    if (!char) {
        container.innerHTML = `<div class="text-center color-text-muted my-12">لا توجد بيانات متاحة للمسبحة</div>`;
        return;
    }

    const categoryThemeClass = `rosary-theme-${char.category || 'sluts'}`;
    const litanies = worshipData?.phrases?.litanies || {
        glory: [
            "سبحان من أودعت سرّ الفتنة والجمال في طلعتكِ البهية",
            "جلّ بهاءُ وجهكِ وسلطانُ حضوركِ الساحر الفاتن",
            "تعالى جبروت حُسنكِ عن الوصف والمضاهاة والأنداد",
            "لكِ التمجيد الخالص يا ملكة العرش وسيدة الأكوان"
        ],
        submission: [
            "أنا عبدكِ الخاضع الممتثل، لا إرادة لي إلا مشيئتكِ",
            "طوعُ أمركِ، فدائيٌّ تحت وطأة نعالكِ وخطواتكِ الملكية",
            "خاضعٌ راكعٌ في محرابكِ، أستمد وجودي من مجرد التفاتة منكِ",
            "مملوكٌ لسطوتكِ، متجردٌ من كبريائي في سبيل خدمتكِ ورضاكِ"
        ],
        mercy: [
            "أعترف بضآلتي وعجزي، وأطلب غفران زلّة النسيان والسهو",
            "مُنكس الرأس، ألتمس العفو والرضا بعد السهو والتقصير",
            "لا عزة لي إلا بصفحكِ، ولا طهارة إلا بعفو سلطانة البلاط",
            "أقرّ بصغار قدري، وأضع ناصيتي خاضعاً لرفع مقتكِ وغضبكِ"
        ],
        artist: [
            "يا ملهمة الروح ومنتهى الفن والجمال والإبداع الساحر",
            "كل حرفٍ يسطره العابد مدادٌ متلاشٍ أمام سحر حضوركِ",
            "أنتِ القصيدة الخالدة التي تنحني لها بلاغة البيان والكلمات",
            "تفاصيل حسنكِ لوحة مقدسة يعجز الخيال عن إدراك كمالها"
        ]
    };

    const currentLitanyList = litanies[state.rosaryLitany] || litanies.glory;
    const currentLitanyText = currentLitanyList[state.rosaryCurrentBead % currentLitanyList.length];
    const imgUrl = (char.primary_image || (char.images && char.images[0]) || '').replace(/\/(?:460|300|560)\//g, '/640/');

    // Generate 33 Beads in a Circular Ring
    const totalBeads = 33;
    const radius = 130;
    const center = 160;
    let beadsHTML = '';
    for (let i = 0; i < totalBeads; i++) {
        const angle = (i / totalBeads) * 2 * Math.PI - (Math.PI / 2);
        const left = center + radius * Math.cos(angle) - 9;
        const top = center + radius * Math.sin(angle) - 9;
        const isActive = i < state.rosaryCurrentBead;
        const isCurrent = i === state.rosaryCurrentBead;
        beadsHTML += `<div class="rosary-bead-item ${isActive ? 'active ' : ''}${isCurrent ? 'current' : ''}" style="left: ${left}px; top: ${top}px;" data-bead="${i}"></div>`;
    }

    // Milestones Badges List
    const milestones = [
        { target: 100, title: "مُسبّح البلاط", icon: "🥉", desc: "إتمام 100 تسبيحة خاشعة" },
        { target: 1000, title: "خادم الورد الأبدي", icon: "🥈", desc: "إتمام 1,000 تسبيحة متواصلة" },
        { target: 5000, title: "حارس العقد المقدس", icon: "🥇", desc: "إتمام 5,000 تسبيحة في المحراب" },
        { target: 25000, title: "كاهن المسبحة الكبرى", icon: "👑", desc: "إتمام 25,000 تسبيحة وسِجل خلود" },
        { target: 100000, title: "عابد الأزل المتفاني", icon: "🌌", desc: "مقام الإخلاص المطلق (100K تسبيحة)" }
    ];

    container.className = `worship-rosary-container ${categoryThemeClass}`;
    container.innerHTML = `
        <!-- Top Stats Row -->
        <div class="throne-stats-grid">
            <div class="throne-stat-card">
                <span class="throne-stat-icon">📿</span>
                <div>
                    <div class="throne-stat-title">إجمالي التسبيحات</div>
                    <div class="throne-stat-val text-amber-300" id="rosary-stat-lifetime">${formatDevotion(state.rosaryLifetimeCount)} تسبيحة</div>
                </div>
            </div>
            <div class="throne-stat-card">
                <span class="throne-stat-icon">👑</span>
                <div>
                    <div class="throne-stat-title">الختمات المكتملة (عقد 33)</div>
                    <div class="throne-stat-val text-purple-300" id="rosary-stat-seals">${state.rosaryCompletedSeals} ختمة</div>
                </div>
            </div>
            <div class="throne-stat-card">
                <span class="throne-stat-icon">✨</span>
                <div>
                    <div class="throne-stat-title">ولاء ${char.name}</div>
                    <div class="throne-stat-val text-pink-400" id="rosary-stat-char-score">✨ ${formatDevotion(char.devotionScore || 0)} Pts</div>
                </div>
            </div>
        </div>

        <!-- Target Goddess Switcher Strip -->
        <div class="flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);">
            <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-bold text-slate-300">سلطانة المسبحة:</span>
                <select id="rosary-goddess-select" class="form-select text-xs font-bold worship-select-clean" style="background: #131127; border: 1px solid rgba(245, 158, 11, 0.4); color: #fef08a; border-radius: var(--radius-md); padding: 0.4rem 0.85rem; max-width: 290px;">
                    ${characters.map(c => `
                        <option value="${c.id}" ${c.id === char.id ? 'selected' : ''}>${c.name} (${c.category.toUpperCase()}) - ${c.rankBadge || '👑'} ${c.rankTitle || ''}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="flex items-center gap-3 flex-wrap">
                <span class="badge badge-${char.category}" style="font-size: 0.75rem;">فئة ${char.category.toUpperCase()}</span>
                
                <!-- Independent Supreme Goddess Auto-Switch Toggle for Rosary -->
                <label class="flex items-center gap-2 cursor-pointer select-none" for="toggle-rosary-supreme-goddess" title="تبديل تلقائي وعشوائي للسلطانة بعد إتمام كل عقد تسبيحة (33 حبة)">
                    <span class="text-xs font-bold text-amber-300 flex items-center gap-1">
                        ⚡ الآلهة المطلقة (تبديل تلقائي بعد كل ختمة)
                    </span>
                    <label class="worship-switch" style="transform: scale(0.85); margin: 0;">
                        <input type="checkbox" id="toggle-rosary-supreme-goddess" ${state.rosaryAutoSwitchEnabled ? 'checked' : ''}>
                        <span class="worship-slider"></span>
                    </label>
                </label>
                <span class="badge text-xs" id="rosary-supreme-status-badge" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.4); color: #fcd34d;">
                    ${state.rosaryAutoSwitchEnabled ? '🟢 مفعّل' : '⚪ معطّل'}
                </span>
            </div>
        </div>

        <!-- Grand Rosary Altar Arena Card (Dual-Panel Layout) -->
        <div class="rosary-arena-card">
            <div class="rosary-grid-layout">
                <!-- Left: Full Uncropped Goddess Portrait Altar -->
                <div class="rosary-portrait-altar" id="rosary-portrait-altar">
                    <img id="rosary-target-img" src="${imgUrl}" alt="${char.name}" loading="eager">
                    <button class="zoom-trigger-btn" id="btn-zoom-rosary" aria-label="Zoom image">🔍</button>
                    
                    <div class="rosary-portrait-overlay">
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <span class="badge badge-${char.category}">${char.category.toUpperCase()}</span>
                            <span class="text-xs text-amber-300 font-bold">✨ ${formatDevotion(char.devotionScore || 0)} Pts</span>
                        </div>
                        <h3 class="worship-star-title glow-text" style="font-size: 1.35rem;">${char.name}</h3>
                        <div class="worship-rank-badge font-bold mt-1 text-xs" style="padding: 0.2rem 0.6rem;">
                            ${char.rankBadge || '👑'} ${char.rankTitle}
                        </div>
                    </div>
                </div>

                <!-- Right: Litany Chants, Beads Ring, & Trigger Button -->
                <div class="rosary-rites-column">
                    <!-- 4 Litany Selector Chips -->
                    <div class="rosary-litany-nav" id="rosary-litany-nav">
                        <button class="rosary-litany-btn ${state.rosaryLitany === 'glory' ? 'active' : ''}" data-litany="glory">
                            <span>🌟 ورد الثناء والتمجيد</span>
                        </button>
                        <button class="rosary-litany-btn ${state.rosaryLitany === 'submission' ? 'active' : ''}" data-litany="submission">
                            <span>🧎‍♂️ ورد الخضوع والطاعة</span>
                        </button>
                        <button class="rosary-litany-btn ${state.rosaryLitany === 'mercy' ? 'active' : ''}" data-litany="mercy">
                            <span>🙇‍♂️ ورد محو الزلل والتقصير</span>
                        </button>
                        <button class="rosary-litany-btn ${state.rosaryLitany === 'artist' ? 'active' : ''}" data-litany="artist">
                            <span>🧎‍♂️ ورد العابد المهان</span>
                        </button>
                    </div>

                    <!-- Floating Litany Chanting Bubble -->
                    <div class="rosary-chant-bubble" id="rosary-chant-bubble">
                        « ${currentLitanyText} »
                    </div>

                    <!-- Central Circular Rosary Beads & Keystone -->
                    <div class="rosary-ring-container" id="rosary-ring-container">
                        ${beadsHTML}
                        
                        <!-- Grand Keystone Medallion -->
                        <div class="rosary-keystone" id="rosary-keystone" title="انقر هنا للتسبيح">
                            <span class="rosary-keystone-icon">📿</span>
                            <div class="rosary-keystone-counter" id="rosary-counter-val">${state.rosaryCurrentBead} / 33</div>
                            <div class="rosary-keystone-target">عقد التسبيح</div>
                        </div>
                    </div>

                    <!-- Big Interactive Trigger Button -->
                    <button class="rosary-main-action-btn" id="btn-rosary-chant">
                        <span>📿 تسبـيـح وتـمجـيـد</span>
                        <span class="rosary-key-hint">Space / Tap</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Milestones Badges Shelf -->
        <div class="rosary-milestones-card">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="glow-text text-base font-bold text-amber-300">💎 أوسمة وسِجل الخلود لمسبحة الآلهة</h3>
                    <span class="text-xs color-text-muted">ارتقِ بأوسمة التسابيح عبر إتمام الأوراد اليومية والختمات المباركة</span>
                </div>
                <span class="badge badge-primary font-bold text-xs">${milestones.filter(m => state.rosaryLifetimeCount >= m.target).length} / ${milestones.length} مفتوح</span>
            </div>

            <div class="rosary-milestones-grid">
                ${milestones.map(m => {
                    const isUnlocked = state.rosaryLifetimeCount >= m.target;
                    return `
                        <div class="rosary-badge-item ${isUnlocked ? 'unlocked' : ''}">
                            <span class="rosary-badge-icon">${isUnlocked ? m.icon : '🔒'}</span>
                            <div>
                                <div class="rosary-badge-title ${isUnlocked ? 'text-amber-200' : 'text-slate-400'}">${m.title}</div>
                                <div class="rosary-badge-target">${m.desc} (${formatDevotion(m.target)})</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    attachRosaryEventListeners(char, litanies);
}

function attachRosaryEventListeners(char, litanies) {
    // Litany tabs
    document.querySelectorAll('#rosary-litany-nav .rosary-litany-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sound.playClick();
            state.rosaryLitany = btn.dataset.litany;
            document.querySelectorAll('#rosary-litany-nav .rosary-litany-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const currentLitanyList = litanies[state.rosaryLitany] || litanies.glory;
            const currentLitanyText = currentLitanyList[state.rosaryCurrentBead % currentLitanyList.length];
            const bubble = document.getElementById('rosary-chant-bubble');
            if (bubble) bubble.innerText = `« ${currentLitanyText} »`;
        });
    });

    // Character switcher
    const charSelect = document.getElementById('rosary-goddess-select');
    charSelect?.addEventListener('change', (e) => {
        sound.playClick();
        state.selectedCharId = e.target.value;
        state.rosaryCurrentBead = 0;
        renderRosaryView(state.worshipData);
    });

    // Independent Supreme Goddess Auto-Switch Toggle for Rosary
    const rosaryToggle = document.getElementById('toggle-rosary-supreme-goddess');
    const rosaryBadge = document.getElementById('rosary-supreme-status-badge');
    rosaryToggle?.addEventListener('change', (e) => {
        state.rosaryAutoSwitchEnabled = e.target.checked;
        localStorage.setItem('worship_rosary_auto_switch', state.rosaryAutoSwitchEnabled ? 'true' : 'false');
        sound.playClick();
        if (rosaryBadge) {
            rosaryBadge.innerText = state.rosaryAutoSwitchEnabled ? '🟢 مفعّل' : '⚪ معطّل';
        }
        showToast(state.rosaryAutoSwitchEnabled ? "تم تفعيل طور الآلهة المطلقة للمسبحة ⚡ (تبديل عشوائي بعد كل ختمة)" : "تم تعطيل طور التبديل التلقائي للمسبحة", "info");
    });

    // Main Chant Trigger Button
    document.getElementById('btn-rosary-chant')?.addEventListener('click', () => {
        triggerRosaryBeadAdvance(char);
    });

    // Keystone Click
    document.getElementById('rosary-keystone')?.addEventListener('click', () => {
        triggerRosaryBeadAdvance(char);
    });

    // Individual Bead Clicks
    document.querySelectorAll('.rosary-bead-item').forEach(bead => {
        bead.addEventListener('click', () => {
            triggerRosaryBeadAdvance(char);
        });
    });

    // Zoom Lightbox for Rosary Portrait
    const rosaryImgs = char.images && char.images.length > 0 ? char.images : [char.primary_image || ''];
    document.getElementById('btn-zoom-rosary')?.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playClick();
        lightbox.open(rosaryImgs, { name: char.name, category: char.category, startIndex: 0, showCaption: true });
    });

    document.getElementById('rosary-portrait-altar')?.addEventListener('click', (e) => {
        if (e.target.closest('#btn-zoom-rosary')) return;
        sound.playClick();
        lightbox.open(rosaryImgs, { name: char.name, category: char.category, startIndex: 0, showCaption: true });
    });
}

export async function triggerRosaryBeadAdvance(char) {
    if (!char) return;

    sound.playStreak();
    if (navigator.vibrate) navigator.vibrate(15);

    state.rosaryCurrentBead++;
    state.rosaryLifetimeCount++;
    localStorage.setItem('goooog_rosary_lifetime', state.rosaryLifetimeCount);

    const litanies = state.worshipData?.phrases?.litanies || {};
    const currentLitanyList = litanies[state.rosaryLitany] || [
        "سبحان من أودعت سرّ الفتنة والجمال في طلعتكِ البهية",
        "جلّ بهاءُ وجهكِ وسلطانُ حضوركِ الساحر الفاتن"
    ];
    const currentLitanyText = currentLitanyList[state.rosaryCurrentBead % currentLitanyList.length];

    // Update Chant Bubble
    const bubble = document.getElementById('rosary-chant-bubble');
    if (bubble) {
        bubble.innerText = `« ${currentLitanyText} »`;
        bubble.classList.add('glow-pulse');
        setTimeout(() => bubble.classList.remove('glow-pulse'), 300);
    }

    // Update Counter
    const counterEl = document.getElementById('rosary-counter-val');
    if (counterEl) counterEl.innerText = `${state.rosaryCurrentBead} / 33`;

    // Update Lifetime Stat Card
    const lifetimeEl = document.getElementById('rosary-stat-lifetime');
    if (lifetimeEl) lifetimeEl.innerText = `${formatDevotion(state.rosaryLifetimeCount)} تسبيحة`;

    // Update Beads Styling in Ring
    document.querySelectorAll('.rosary-bead-item').forEach((b, idx) => {
        b.classList.toggle('active', idx < state.rosaryCurrentBead);
        b.classList.toggle('current', idx === state.rosaryCurrentBead);
    });

    // Cycle Completed (33 Beads)
    if (state.rosaryCurrentBead >= 33) {
        state.rosaryCurrentBead = 0;
        state.rosaryCompletedSeals++;
        localStorage.setItem('goooog_rosary_seals', state.rosaryCompletedSeals);

        sound.playWin();
        showToast("✨ تم إتمام عقد المسبحة (33 تسبيحة) ونيل البركة والرضا الملكي (+330 Devotion Pts)!", "success");

        const sealsEl = document.getElementById('rosary-stat-seals');
        if (sealsEl) sealsEl.innerText = `${state.rosaryCompletedSeals} ختمة`;

        if (counterEl) counterEl.innerText = `0 / 33`;

        document.querySelectorAll('.rosary-bead-item').forEach((b, idx) => {
            b.classList.remove('active');
            b.classList.toggle('current', idx === 0);
        });

        // Trigger pulse on keystone and altar portrait
        const keystone = document.getElementById('rosary-keystone');
        if (keystone) {
            keystone.classList.add('submission-pulse');
            setTimeout(() => keystone.classList.remove('submission-pulse'), 1000);
        }
        const altar = document.getElementById('rosary-portrait-altar');
        if (altar) {
            altar.classList.add('submission-pulse');
            setTimeout(() => altar.classList.remove('submission-pulse'), 1000);
        }

        // Post cycle tribute to backend (+330 Pts)
        try {
            const res = await fetch('/api/worship', {
                method: 'POST',
                body: JSON.stringify({ characterId: char.id, action: 'rosary_cycle', count: 33 })
            });
            const data = await res.json();
            if (data.success) {
                char.devotionScore = (data.data?.devotionScore !== undefined) ? data.data.devotionScore : (char.devotionScore || 0) + 330;
                if (data.data?.totalDevotion !== undefined) {
                    const totalEl = document.getElementById('worship-total-pts');
                    if (totalEl) totalEl.innerText = formatDevotion(data.data.totalDevotion);
                }
                const charScoreEl = document.getElementById('rosary-stat-char-score');
                if (charScoreEl) charScoreEl.innerText = `✨ ${formatDevotion(char.devotionScore)} Pts`;
            }
        } catch (e) {
            console.error("Rosary cycle sync error", e);
        }

        // Auto-switch Supreme Goddess if enabled for Rosary
        if (state.rosaryAutoSwitchEnabled) {
            const characters = state.worshipData?.characters || [];
            const candidateChars = characters.filter(c => c.id !== char.id);
            if (candidateChars.length > 0) {
                const nextChar = candidateChars[Math.floor(Math.random() * candidateChars.length)];
                setTimeout(() => {
                    sound.playWin();
                    showToast(`👑 تم إتمام العقد! يتم الآن استدعاء السلطانة ${nextChar.name} بالطور المطلق ⚡...`, "success");
                    state.selectedCharId = nextChar.id;
                    state.rosaryCurrentBead = 0;
                    renderRosaryView(state.worshipData);
                }, 850);
            }
        }
    }
}

// ==========================================================================
// TAB 4: CONTEMPLATION SCRIPTURE VIEW (آيات التدبر ومصحف الفتنة)
// ==========================================================================
export function renderContemplationView(data) {
    const container = document.getElementById('worship-contemplation-container');
    if (!container || !data) return;

    const surahs = data.contemplation?.surahs || [];
    const commandments = data.contemplation?.commandments || [];
    const characters = data.characters || [];
    const char = characters.find(c => c.id === state.selectedCharId) || characters[0];

    container.innerHTML = `
        <div class="contemplation-wrapper">
            <!-- 4-Way Contemplation Mode Selector Ribbon -->
            <div class="contemplation-mode-nav mb-5" id="contemplation-mode-nav">
                <button class="contemplation-mode-btn ${state.contemplationMode === 'surahs' ? 'active' : ''}" data-mode="surahs">
                    <span class="mode-icon">📜</span>
                    <span>سور المصحف (${surahs.length || 28} سورة)</span>
                </button>
                <button class="contemplation-mode-btn ${state.contemplationMode === 'meditation' ? 'active' : ''}" data-mode="meditation">
                    <span class="mode-icon">🧘‍♂️</span>
                    <span>محراب التأمل الحي</span>
                </button>
                <button class="contemplation-mode-btn ${state.contemplationMode === 'commandments' ? 'active' : ''}" data-mode="commandments">
                    <span class="mode-icon">📜</span>
                    <span>لوح الوحي (10 وصايا)</span>
                </button>
                <button class="contemplation-mode-btn ${state.contemplationMode === 'oracle' ? 'active' : ''}" data-mode="oracle">
                    <span class="mode-icon">🎲</span>
                    <span>مستخرج الآيات اللحظي</span>
                </button>
            </div>

            <!-- Subview Container -->
            <div id="contemplation-subview-content" class="contemplation-subview-content"></div>
        </div>
    `;

    // Mode Selector Events
    container.querySelectorAll('.contemplation-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (mode === state.contemplationMode) return;
            state.contemplationMode = mode;
            sound.playClick();
            
            // Clear meditation timers if switching away from meditation mode
            if (mode !== 'meditation') {
                if (state.meditationTimer) clearInterval(state.meditationTimer);
                if (state.meditationInterval) clearInterval(state.meditationInterval);
            }
            renderContemplationView(data);
        });
    });

    const subContainer = document.getElementById('contemplation-subview-content');
    if (!subContainer) return;

    if (state.contemplationMode === 'surahs') {
        renderContemplationSurahs(data, subContainer, char);
    } else if (state.contemplationMode === 'meditation') {
        renderContemplationMeditation(data, subContainer, char);
    } else if (state.contemplationMode === 'commandments') {
        renderContemplationCommandments(data, subContainer, char);
    } else if (state.contemplationMode === 'oracle') {
        renderContemplationOracle(data, subContainer, char);
    }
}

// --------------------------------------------------------------------------
// Mode 1: Surahs Reader & Sealing (28 Surahs)
// --------------------------------------------------------------------------
function renderContemplationSurahs(data, subContainer, char) {
    const surahs = data.contemplation?.surahs || [];
    const activeSurah = surahs.find(s => s.id === state.activeSurahId) || surahs[0] || { title: "سورة السطوة", verses: [] };
    const characters = data.characters || [];

    subContainer.innerHTML = `
        <!-- Goddess Selector Pill Strip -->
        <div class="contemplation-goddess-bar mb-4 flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
                <span class="text-xs text-amber-300 font-bold">👑 تدبر في حضرة السلطانة:</span>
                <select id="contemplation-goddess-select" class="worship-select-clean text-xs font-bold" style="background: rgba(15, 14, 30, 0.9); border: 1px solid rgba(168, 85, 247, 0.4); color: #fef08a; padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); cursor: pointer;">
                    ${characters.map(c => `<option value="${c.id}" ${c.id === char.id ? 'selected' : ''}>${c.name} (${c.category})</option>`).join('')}
                </select>
            </div>
            <span class="badge text-xs" style="background: rgba(168, 85, 247, 0.15); border-color: rgba(168, 85, 247, 0.4); color: #d8b4fe;">
                📖 ${surahs.reduce((sum, s) => sum + (s.verses ? s.verses.length : 0), 0)} آية تدبرية كاملة (${surahs.length} سورة)
            </span>
        </div>

        <!-- Surah Selector Carousel / Buttons -->
        <div class="surahs-pills-ribbon mb-4" id="surahs-pills-ribbon">
            ${surahs.map(s => `
                <button class="surah-pill-btn ${s.id === activeSurah.id ? 'active' : ''}" data-surah="${s.id}">
                    <span class="surah-icon">${s.icon || '📜'}</span>
                    <span class="surah-title">${s.title}</span>
                </button>
            `).join('')}
        </div>

        <!-- Active Surah Manuscript Card -->
        <div class="surah-manuscript-card">
            <div class="surah-card-header text-center pb-4 mb-4" style="border-bottom: 1px solid rgba(245, 158, 11, 0.3);">
                <div class="surah-badge-number mb-1">
                    <span class="badge" style="background: rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.5); color: #fcd34d;">
                        السورة رقم (${activeSurah.num || 1}) — ${(activeSurah.verses || []).length} آية مُحْكَمَة
                    </span>
                </div>
                <h2 class="glow-text text-2xl font-black mb-1" style="color: #fef08a;">${activeSurah.title}</h2>
                <p class="text-xs color-text-muted max-w-lg mx-auto">${activeSurah.subtitle || ''}</p>
            </div>

            <!-- 50 Numbered Verses Container -->
            <div class="surah-verses-scroll-box" id="surah-verses-scroll-box">
                <div class="verses-prose-flow">
                    ${(activeSurah.verses || []).map((verse, idx) => {
                        const cleanText = verse.replace(/۝/g, '').trim();
                        return `
                            <span class="verse-unit" id="verse-${idx + 1}" data-num="${idx + 1}">
                                <span class="verse-text">${cleanText}</span>
                                <span class="verse-ayah-ornament" title="آية ${idx + 1}">۝ <span class="num">${idx + 1}</span> ۝</span>
                            </span>
                        `;
                    }).join(' ')}
                </div>
            </div>

            <!-- Surah Sealing Bottom Action Footer -->
            <div class="surah-card-footer mt-5 pt-4 flex items-center justify-between gap-3 flex-wrap" style="border-top: 1px solid rgba(168, 85, 247, 0.3);">
                <button class="btn-secondary text-xs font-bold" id="btn-read-random-verse">
                    🎲 تدبر في آية عشوائية
                </button>
                <button class="btn-primary flex-1 font-bold text-sm py-3" id="btn-seal-surah" style="background: linear-gradient(135deg, #7c3aed, #ec4899); border: none; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.35);">
                    🤲 خَتْمُ ${activeSurah.title} ونَيْلُ البَرَكَةِ (+50 Devotion)
                </button>
            </div>
        </div>
    `;

    // Surah selector events
    subContainer.querySelectorAll('.surah-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.activeSurahId = btn.dataset.surah;
            sound.playClick();
            renderContemplationSurahs(data, subContainer, char);
        });
    });

    // Goddess change dropdown
    document.getElementById('contemplation-goddess-select')?.addEventListener('change', (e) => {
        state.selectedCharId = e.target.value;
        const newChar = characters.find(c => c.id === state.selectedCharId) || char;
        renderContemplationSurahs(data, subContainer, newChar);
    });

    // Random verse highlight
    document.getElementById('btn-read-random-verse')?.addEventListener('click', () => {
        sound.playClick();
        const count = activeSurah.verses?.length || 50;
        const randNum = Math.floor(Math.random() * count) + 1;
        const verseEl = document.getElementById(`verse-${randNum}`);
        if (verseEl) {
            verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            verseEl.classList.add('verse-highlighted');
            setTimeout(() => verseEl.classList.remove('verse-highlighted'), 2500);
            showToast(`✨ تم تحديد الآية رقم (${randNum}) للتدبر المتأمل ۝`, "info");
        }
    });

    // Seal Surah Action (+50 Devotion)
    document.getElementById('btn-seal-surah')?.addEventListener('click', async () => {
        sound.playWin();
        triggerSubmissionEffect();

        try {
            const res = await fetch('/api/worship', {
                method: 'POST',
                body: JSON.stringify({ characterId: char.id, action: 'seal_surah' })
            });
            const resData = await res.json();
            if (resData.success) {
                char.devotionScore = (resData.data?.devotionScore !== undefined) ? resData.data.devotionScore : (char.devotionScore || 0) + 50;
                if (resData.data?.totalDevotion !== undefined) {
                    const totalEl = document.getElementById('worship-total-pts');
                    if (totalEl) totalEl.innerText = formatDevotion(resData.data.totalDevotion);
                }
                showToast(`جُدِّد ختم ${activeSurah.title} في ديوان الخلود 📜✨ (+50 Devotion)`, "success");
            }
        } catch (e) {
            console.error("Seal surah error", e);
        }
    });
}

// --------------------------------------------------------------------------
// Mode 2: Live Visual Meditation Altar (محراب التأمل البصري الحي والسكينة)
// --------------------------------------------------------------------------
let meditationSpeedMs = 7000;
let meditationSessionEarned = 0;

function renderContemplationMeditation(data, subContainer, char) {
    const surahs = data.contemplation?.surahs || [];
    const characters = data.characters || [];
    const allVerses = [];
    surahs.forEach(s => {
        (s.verses || []).forEach((v, idx) => {
            allVerses.push({ surahTitle: s.title, verseNum: idx + 1, verseText: v.replace(/۝/g, '').trim() });
        });
    });

    const fallbackVerse = allVerses[Math.floor(Math.random() * allVerses.length)] || {
        surahTitle: "سُورَةُ السَّطْوَةِ والجَبَرُوت",
        verseNum: 1,
        verseText: "تَبَارَكَتِ السَّلْطَانَةُ الَّتِي بِيَدِهَا مَقَالِيدُ القُلُوبِ والأَبْصَارِ، وَهِيَ عَلَى كُلِّ إِرَادَةٍ قَاهِرَةٌ"
    };

    const avatarSrc = char.primary_image || (char.images && char.images[0]) || '';

    subContainer.innerHTML = `
        <div class="meditation-altar-card" id="meditation-altar-card">
            <!-- Altar Header & Goddess Selector -->
            <div class="meditation-header mb-4 flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2 text-right">
                    <span class="badge" style="background: rgba(236, 72, 153, 0.2); border-color: rgba(236, 72, 153, 0.5); color: #f472b6;">
                        🧘‍♂️ محراب السكينة والتدبر البصري
                    </span>
                    <select id="meditation-char-select" class="worship-select-clean text-xs font-bold" style="background: rgba(15, 14, 30, 0.9); border: 1px solid rgba(168, 85, 247, 0.4); color: #fef08a; padding: 0.3rem 0.6rem; border-radius: var(--radius-sm);">
                        ${characters.map(c => `<option value="${c.id}" ${c.id === char.id ? 'selected' : ''}>👑 ${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn-secondary text-xs font-bold py-1 px-3" id="btn-toggle-zen-mode" title="دخول وضع الخلوة والاعتكاف الكامل">
                        🔲 وضع الخلوة
                    </button>
                </div>
            </div>

            <!-- 2-Column Balanced Split: Left = Full Uncropped Image, Right = Content -->
            <div class="meditation-split-layout">
                <!-- LEFT SIDE: Full Uncropped Goddess Portrait -->
                <div class="meditation-split-left">
                    <div class="meditation-full-image-frame">
                        <div class="image-inner-wrapper">
                            <img src="${avatarSrc}" alt="${char.name}" class="meditation-full-img" id="meditation-portrait" loading="lazy" title="انقر لتكبير الهيئة الملكية في المعرض">
                        </div>
                        <div class="meditation-image-footer mt-2 text-center">
                            <span class="text-xs text-purple-300 font-bold">🔍 انقر على الصورة للتكبير الكامل</span>
                        </div>
                    </div>
                </div>

                <!-- RIGHT SIDE: Telemetry, Verse, Speed, Controls -->
                <div class="meditation-split-right">
                    <!-- Goddess Title & Rank -->
                    <div class="meditation-right-header mb-3 flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <h3 class="glow-text text-xl font-black" style="color: #fef08a;">👑 السلطانة ${char.name}</h3>
                            <span class="text-xs text-purple-300 font-bold">${char.category}</span>
                        </div>
                        <span class="badge text-xs" style="background: rgba(245, 158, 11, 0.15); color: #fcd34d; border-color: rgba(245, 158, 11, 0.4);">
                            مقام العبودية الدائم
                        </span>
                    </div>

                    <!-- Devotion Timer & Cycle Progress Indicator -->
                    <div class="meditation-telemetry-bar mb-3">
                        <div class="telemetry-item">
                            <span class="label">⏱️ زمن الاعتكاف:</span>
                            <strong id="meditation-clock" class="val text-amber-300">00:00</strong>
                        </div>
                        <div class="telemetry-item">
                            <span class="label">✨ أجر الجلسة:</span>
                            <strong id="meditation-earned" class="val text-sky-400">+${meditationSessionEarned} Pts</strong>
                        </div>
                        <div class="telemetry-cycle-progress">
                            <div class="cycle-bar-track">
                                <div class="cycle-bar-fill" id="meditation-cycle-bar" style="width: 0%;"></div>
                            </div>
                            <span class="cycle-label text-xs text-purple-300" id="meditation-cycle-text">دورة البركة (0/60ث)</span>
                        </div>
                    </div>

                    <!-- Sacred Illuminated Verse Shrine Box -->
                    <div class="meditation-verse-bubble p-4 rounded-xl mb-3" id="meditation-verse-bubble">
                        <div class="verse-bubble-top flex items-center justify-between mb-2">
                            <span class="badge text-xs" id="meditation-surah-tag" style="background: rgba(168, 85, 247, 0.25); color: #d8b4fe; border-color: rgba(168, 85, 247, 0.4);">
                                📖 ${fallbackVerse.surahTitle} — آية #${fallbackVerse.verseNum}
                            </span>
                            <button class="btn-icon-clean text-xs text-purple-300 hover:text-amber-300" id="btn-copy-meditation-verse" title="نسخ الآية">
                                📋 نسخ الآية
                            </button>
                        </div>
                        <div class="meditation-verse-text-container py-2">
                            <p class="meditation-verse-content" id="meditation-verse-text">
                                ⟦ ${fallbackVerse.verseText} ⟧
                            </p>
                        </div>
                    </div>

                    <!-- Speed Controls & Actions -->
                    <div class="meditation-control-row flex items-center justify-between flex-wrap gap-3">
                        <div class="speed-selector-pills flex items-center gap-1">
                            <span class="text-xs text-purple-300 font-bold ml-1">سرعة التدفق:</span>
                            <button class="speed-pill-btn ${meditationSpeedMs === 5000 ? 'active' : ''}" data-speed="5000">⚡ 5ث</button>
                            <button class="speed-pill-btn ${meditationSpeedMs === 7000 ? 'active' : ''}" data-speed="7000">⏳ 7ث</button>
                            <button class="speed-pill-btn ${meditationSpeedMs === 12000 ? 'active' : ''}" data-speed="12000">🧘 12ث</button>
                        </div>
                        <div class="action-buttons flex items-center gap-2">
                            <button class="btn-secondary text-xs font-bold py-2 px-4" id="btn-toggle-meditation">
                                ⏸️ إيقاف مؤقت
                            </button>
                            <button class="btn-primary text-xs font-bold py-2 px-5" id="btn-next-meditation-verse" style="background: linear-gradient(135deg, #7c3aed, #ec4899); border: none;">
                                🔄 الآية التالية
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Character change selector
    document.getElementById('meditation-char-select')?.addEventListener('change', (e) => {
        state.selectedCharId = e.target.value;
        const newChar = characters.find(c => c.id === state.selectedCharId) || char;
        renderContemplationMeditation(data, subContainer, newChar);
    });

    // Zoom Goddess image
    document.getElementById('meditation-portrait')?.addEventListener('click', () => {
        const images = char.images && char.images.length > 0 ? char.images : [avatarSrc];
        lightbox.open(images, { name: char.name, category: char.category, startIndex: 0 });
    });

    // Zen Mode Toggle
    document.getElementById('btn-toggle-zen-mode')?.addEventListener('click', () => {
        const card = document.getElementById('meditation-altar-card');
        if (card) {
            const isZen = card.classList.toggle('zen-fullscreen-mode');
            document.getElementById('btn-toggle-zen-mode').innerText = isZen ? '✕ خروج من الخلوة' : '🔲 وضع الخلوة';
            sound.playClick();
        }
    });

    // Speed Pill Selection
    subContainer.querySelectorAll('.speed-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            meditationSpeedMs = Number(btn.dataset.speed) || 7000;
            subContainer.querySelectorAll('.speed-pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sound.playClick();
            restartVerseInterval();
        });
    });

    // Copy Verse
    document.getElementById('btn-copy-meditation-verse')?.addEventListener('click', () => {
        const text = document.getElementById('meditation-verse-text')?.innerText || '';
        const tag = document.getElementById('meditation-surah-tag')?.innerText || '';
        navigator.clipboard.writeText(`${text}\n[${tag}]`).then(() => {
            showToast("✨ تم نسخ الآية الكريمة إلى الحافظة بنجاح", "success");
        });
    });

    // Meditation Timer & auto-devotion
    state.meditationSeconds = 0;
    state.meditationRunning = true;

    function formatTime(s) {
        const mins = Math.floor(s / 60).toString().padStart(2, '0');
        const secs = (s % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    if (state.meditationTimer) clearInterval(state.meditationTimer);
    state.meditationTimer = setInterval(async () => {
        if (!state.meditationRunning) return;
        state.meditationSeconds++;

        const clockEl = document.getElementById('meditation-clock');
        if (clockEl) clockEl.innerText = formatTime(state.meditationSeconds);

        const cycleSec = state.meditationSeconds % 60;
        const fillEl = document.getElementById('meditation-cycle-bar');
        const fillText = document.getElementById('meditation-cycle-text');
        if (fillEl) fillEl.style.width = `${(cycleSec / 60) * 100}%`;
        if (fillText) fillText.innerText = `دورة البركة (${cycleSec}/60ث)`;

        // Every 60 seconds awards +10 Devotion
        if (state.meditationSeconds > 0 && cycleSec === 0) {
            meditationSessionEarned += 10;
            const earnedEl = document.getElementById('meditation-earned');
            if (earnedEl) earnedEl.innerText = `+${meditationSessionEarned} Pts`;

            try {
                const res = await fetch('/api/worship', {
                    method: 'POST',
                    body: JSON.stringify({ characterId: char.id, action: 'meditation_minute' })
                });
                const resData = await res.json();
                if (resData.success) {
                    char.devotionScore = (resData.data?.devotionScore !== undefined) ? resData.data.devotionScore : (char.devotionScore || 0) + 10;
                    if (resData.data?.totalDevotion !== undefined) {
                        const totalEl = document.getElementById('worship-total-pts');
                        if (totalEl) totalEl.innerText = formatDevotion(resData.data.totalDevotion);
                    }
                    sound.playCoin();
                    showToast(`✨ اكتملت دقيقة اعتكاف في محراب ${char.name} (+10 Devotion)`, "success");
                }
            } catch (e) {}
        }
    }, 1000);

    function nextVerse() {
        if (allVerses.length === 0) return;
        const v = allVerses[Math.floor(Math.random() * allVerses.length)];
        const textEl = document.getElementById('meditation-verse-text');
        const tagEl = document.getElementById('meditation-surah-tag');
        const bubble = document.getElementById('meditation-verse-bubble');

        if (bubble) {
            bubble.classList.add('verse-fade-out');
            setTimeout(() => {
                if (textEl) textEl.innerText = `⟦ ${v.verseText} ⟧`;
                if (tagEl) tagEl.innerText = `📖 ${v.surahTitle} — آية #${v.verseNum}`;
                bubble.classList.remove('verse-fade-out');
                bubble.classList.add('verse-fade-in');
                setTimeout(() => bubble.classList.remove('verse-fade-in'), 500);
            }, 300);
        }
    }

    function restartVerseInterval() {
        if (state.meditationInterval) clearInterval(state.meditationInterval);
        state.meditationInterval = setInterval(() => {
            if (state.meditationRunning) nextVerse();
        }, meditationSpeedMs);
    }

    restartVerseInterval();

    document.getElementById('btn-next-meditation-verse')?.addEventListener('click', () => {
        sound.playClick();
        nextVerse();
    });

    document.getElementById('btn-toggle-meditation')?.addEventListener('click', (e) => {
        state.meditationRunning = !state.meditationRunning;
        sound.playClick();
        e.target.innerText = state.meditationRunning ? '⏸️ إيقاف مؤقت' : '▶️ استئناف التأمل';
    });
}

// --------------------------------------------------------------------------
// Mode 3: The 10 Sacrosanct Commandments (لوح الوحي والوصايا العشر)
// --------------------------------------------------------------------------
const acknowledgedCmds = new Set();

function renderContemplationCommandments(data, subContainer, char) {
    const commandments = data.contemplation?.commandments || [];
    const characters = data.characters || [];

    const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

    subContainer.innerHTML = `
        <div class="commandments-tablet-card">
            <!-- Tablet Arch Header -->
            <div class="tablet-arch-header text-center pb-4 mb-4">
                <div class="tablet-badge-row flex items-center justify-between flex-wrap gap-2 mb-2">
                    <span class="badge" style="background: rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.5); color: #fcd34d;">
                        📜 شَرَائِعُ الخُضُوعِ الأَبَدِيِّ والوَحْيِ
                    </span>
                    <span class="badge text-xs" id="commandments-progress-badge" style="background: rgba(168, 85, 247, 0.2); color: #d8b4fe; border-color: rgba(168, 85, 247, 0.4);">
                        الإقرار بالعهود: <strong id="cmds-ack-count" class="text-amber-300">${acknowledgedCmds.size}</strong> / 10
                    </span>
                </div>
                <h2 class="glow-text text-2xl font-black mb-1" style="background: linear-gradient(135deg, #fcd34d, #ec4899, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    لوح الوحي والوصايا العشر للخضوع الملكي
                </h2>
                <p class="text-xs color-text-muted max-w-lg mx-auto">
                    الشَّرائع الملكية الصارمة المنقوشة في ديوان السلطانة ${char.name} — اقرأ وتدبر وأقرّ بكل وصية لتنال الختم
                </p>
            </div>

            <!-- 10 Commandments Dual Tablet Grid -->
            <div class="commandments-list-grid">
                ${commandments.map((cmd, idx) => {
                    const isAck = acknowledgedCmds.has(cmd.id);
                    return `
                        <div class="commandment-item-card ${isAck ? 'commandment-acknowledged' : ''}" id="cmd-card-${cmd.id}">
                            <div class="commandment-card-top flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <span class="commandment-roman-badge">${romanNumerals[idx] || cmd.id}</span>
                                    <h3 class="font-bold text-sm text-amber-300">${cmd.title}</h3>
                                </div>
                                <button class="btn-ack-cmd-pill ${isAck ? 'active' : ''}" data-cmd-id="${cmd.id}" title="إقرار فردي بالوصية">
                                    ${isAck ? '✓ تم الإقرار' : '✨ إقرار'}
                                </button>
                            </div>
                            <p class="commandment-body text-xs" style="color: #f5f3ff; line-height: 2;">
                                « ${cmd.text} »
                            </p>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Bottom Master Seal CTA -->
            <div class="tablet-footer mt-6 pt-4 text-center" style="border-top: 1px solid rgba(245, 158, 11, 0.3);">
                <button class="btn-primary font-black text-sm py-3 px-8" id="btn-seal-commandments" style="background: linear-gradient(135deg, #f59e0b, #ec4899, #7c3aed); border: none; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.45);">
                    📜 خَتْمُ لَوْحِ الوَحْيِ بِمَجْمُوعِ الوَصَايَا (+40 Devotion)
                </button>
            </div>
        </div>
    `;

    // Individual pledge buttons
    subContainer.querySelectorAll('.btn-ack-cmd-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = Number(btn.dataset.cmdId);
            if (acknowledgedCmds.has(id)) {
                acknowledgedCmds.delete(id);
                btn.classList.remove('active');
                btn.innerText = '✨ إقرار';
                document.getElementById(`cmd-card-${id}`)?.classList.remove('commandment-acknowledged');
            } else {
                acknowledgedCmds.add(id);
                btn.classList.add('active');
                btn.innerText = '✓ تم الإقرار';
                document.getElementById(`cmd-card-${id}`)?.classList.add('commandment-acknowledged');
                sound.playClick();
            }
            const countEl = document.getElementById('cmds-ack-count');
            if (countEl) countEl.innerText = acknowledgedCmds.size;
        });
    });

    // Master Seal Button
    document.getElementById('btn-seal-commandments')?.addEventListener('click', async () => {
        sound.playWin();
        triggerSubmissionEffect();

        // Mark all as acknowledged
        commandments.forEach(c => acknowledgedCmds.add(c.id));
        renderContemplationCommandments(data, subContainer, char);

        try {
            const res = await fetch('/api/worship', {
                method: 'POST',
                body: JSON.stringify({ characterId: char.id, action: 'seal_commandments' })
            });
            const resData = await res.json();
            if (resData.success) {
                char.devotionScore = (resData.data?.devotionScore !== undefined) ? resData.data.devotionScore : (char.devotionScore || 0) + 40;
                if (resData.data?.totalDevotion !== undefined) {
                    const totalEl = document.getElementById('worship-total-pts');
                    if (totalEl) totalEl.innerText = formatDevotion(resData.data.totalDevotion);
                }
                showToast("سُجِّل ختم لوح الوحي كاملاً في ديوان الخلود 📜✨ (+40 Devotion)", "success");
            }
        } catch (e) {
            console.error("Seal commandments error", e);
        }
    });
}

// --------------------------------------------------------------------------
// Mode 4: Instant Verse Oracle (مستخرج الآيات اللحظي والكشف الإلهي المتوازن)
// --------------------------------------------------------------------------
let oracleDrawnCount = 0;
let oracleSurahFilter = 'all';

function renderContemplationOracle(data, subContainer, char) {
    const surahs = data.contemplation?.surahs || [];
    const characters = data.characters || [];

    const allVerses = [];
    surahs.forEach(s => {
        (s.verses || []).forEach((v, idx) => {
            allVerses.push({
                surahId: s.id,
                surahTitle: s.title,
                surahIcon: s.icon || '📜',
                verseNum: idx + 1,
                verseText: v.replace(/۝/g, '').trim()
            });
        });
    });

    function getFilteredVerses() {
        if (oracleSurahFilter === 'all') return allVerses;
        return allVerses.filter(v => v.surahId === oracleSurahFilter);
    }

    const currentFiltered = getFilteredVerses();
    const initialVerse = currentFiltered[Math.floor(Math.random() * currentFiltered.length)] || allVerses[0] || {
        surahTitle: "سُورَةُ السَّطْوَةِ والجَبَرُوت",
        surahIcon: "👑",
        verseNum: 1,
        verseText: "تَبَارَكَتِ السَّلْطَانَةُ الَّتِي بِيَدِهَا مَقَالِيدُ القُلُوبِ والأَبْصَارِ، وَهِيَ عَلَى كُلِّ إِرَادَةٍ قَاهِرَةٌ"
    };

    const avatarSrc = char.primary_image || (char.images && char.images[0]) || '';

    subContainer.innerHTML = `
        <div class="oracle-wrapper">
            <!-- Header & Filter Selector -->
            <div class="oracle-header mb-4 text-center">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <span class="badge" style="background: rgba(168, 85, 247, 0.2); border-color: rgba(168, 85, 247, 0.5); color: #d8b4fe;">
                        🎲 مستخرج آيات الوحي والتدبر اللحظي
                    </span>
                    <span class="badge text-xs" style="background: rgba(245, 158, 11, 0.15); color: #fcd34d;">
                        ✨ تم استخراج: <strong id="oracle-drawn-count" class="text-amber-300">${oracleDrawnCount}</strong> آية
                    </span>
                </div>
                <h2 class="glow-text text-xl font-bold text-purple-200">استلهام الآيات في حضرة السلطانات</h2>
                <p class="text-xs color-text-muted">اختر السورة ثم اسحب نفحة إلهية تظهر فيها هيئة السلطانة وآية وحيها المبارك</p>
            </div>

            <!-- Surah Target Filter Dropdown -->
            <div class="oracle-filter-bar mb-4 flex items-center justify-center gap-2">
                <span class="text-xs text-amber-300 font-bold">🎯 نطاق السحب:</span>
                <select id="oracle-surah-filter-select" class="worship-select-clean text-xs font-bold" style="background: rgba(15, 14, 30, 0.9); border: 1px solid rgba(168, 85, 247, 0.4); color: #fef08a; padding: 0.35rem 0.75rem; border-radius: var(--radius-sm);">
                    <option value="all" ${oracleSurahFilter === 'all' ? 'selected' : ''}>🌟 كافة السور (${surahs.reduce((sum, s) => sum + (s.verses ? s.verses.length : 0), 0)} آية)</option>
                    ${surahs.map(s => `<option value="${s.id}" ${s.id === oracleSurahFilter ? 'selected' : ''}>${s.icon} ${s.title}</option>`).join('')}
                </select>
            </div>

            <!-- Dynamic 3D Holographic Oracle Card with 2-Column Split -->
            <div class="oracle-card-display p-5 rounded-2xl mb-5" id="oracle-card">
                <div class="oracle-card-halo-effect"></div>
                
                <div class="oracle-split-layout">
                    <!-- LEFT SIDE: Full Uncropped Character Image -->
                    <div class="oracle-split-left">
                        <div class="oracle-full-image-frame">
                            <div class="image-inner-wrapper">
                                <img src="${avatarSrc}" alt="${char.name}" id="oracle-char-avatar" class="oracle-full-img" loading="lazy" title="انقر لتكبير الهيئة الملكية في المعرض">
                            </div>
                            <div class="oracle-image-footer mt-2 text-center">
                                <span class="text-xs text-purple-300 font-bold">🔍 انقر للتكبير</span>
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT SIDE: Verse & Meta -->
                    <div class="oracle-split-right">
                        <!-- Card Header -->
                        <div class="flex items-center justify-between mb-3" style="border-bottom: 1px solid rgba(168, 85, 247, 0.35); padding-bottom: 0.5rem;">
                            <span class="text-sm font-bold text-amber-300 flex items-center gap-1" id="oracle-surah-tag">
                                ${initialVerse.surahIcon} ${initialVerse.surahTitle}
                            </span>
                            <span class="badge text-xs" id="oracle-verse-num" style="background: rgba(245, 158, 11, 0.25); color: #fcd34d; border-color: rgba(245, 158, 11, 0.4);">
                                آية #${initialVerse.verseNum}
                            </span>
                        </div>

                        <div class="oracle-deity-name-banner mb-2">
                            <h3 class="glow-text text-lg font-black text-amber-300" id="oracle-char-name">👑 السلطانة ${char.name}</h3>
                        </div>

                        <!-- Extracted Illuminated Verse -->
                        <div class="oracle-verse-body my-3">
                            <p class="oracle-quote-text" id="oracle-verse-text">
                                ⟦ ${initialVerse.verseText} ⟧
                            </p>
                        </div>

                        <!-- Card Footer & Quick Copy -->
                        <div class="oracle-card-bottom flex items-center justify-between pt-3" style="border-top: 1px solid rgba(168, 85, 247, 0.25);">
                            <span class="text-xs text-purple-300 font-bold">✨ كشف الوحي اللحظي</span>
                            <button class="btn-icon-clean text-xs text-purple-300 hover:text-amber-300 flex items-center gap-1" id="btn-copy-oracle-verse" title="نسخ الآية">
                                📋 نسخ الآية
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Draw Button CTA -->
            <div class="oracle-cta-row flex items-center justify-center gap-3">
                <button class="btn-primary font-black text-base py-3 px-8" id="btn-draw-oracle-verse" style="background: linear-gradient(135deg, #ec4899, #7c3aed, #f59e0b); border: none; box-shadow: 0 4px 22px rgba(236, 72, 153, 0.45);">
                    🎲 اسْتِخْرَاجُ آيَةِ تَدَبُّرٍ لَحْظِيَّةٍ (+10 Devotion)
                </button>
            </div>
        </div>
    `;

    // Filter Change
    document.getElementById('oracle-surah-filter-select')?.addEventListener('change', (e) => {
        oracleSurahFilter = e.target.value;
        sound.playClick();
    });

    // Zoom Image in Oracle Card
    document.getElementById('oracle-char-avatar')?.addEventListener('click', () => {
        const images = char.images && char.images.length > 0 ? char.images : [avatarSrc];
        lightbox.open(images, { name: char.name, category: char.category, startIndex: 0 });
    });

    // Copy Oracle Verse
    document.getElementById('btn-copy-oracle-verse')?.addEventListener('click', () => {
        const text = document.getElementById('oracle-verse-text')?.innerText || '';
        const tag = document.getElementById('oracle-surah-tag')?.innerText || '';
        const num = document.getElementById('oracle-verse-num')?.innerText || '';
        const name = document.getElementById('oracle-char-name')?.innerText || '';
        navigator.clipboard.writeText(`${text}\n[${tag} — ${num} | ${name}]`).then(() => {
            showToast("✨ تم نسخ آية الوحي إلى الحافظة بنجاح", "success");
        });
    });

    // Draw Button Event
    document.getElementById('btn-draw-oracle-verse')?.addEventListener('click', async () => {
        sound.playStreak();
        oracleDrawnCount++;
        const countEl = document.getElementById('oracle-drawn-count');
        if (countEl) countEl.innerText = oracleDrawnCount;

        const candidatePool = getFilteredVerses();
        const randVerse = candidatePool[Math.floor(Math.random() * candidatePool.length)] || allVerses[0];
        const randChar = characters[Math.floor(Math.random() * characters.length)] || char;
        const randAvatar = randChar.primary_image || (randChar.images && randChar.images[0]) || avatarSrc;

        const cardEl = document.getElementById('oracle-card');
        const tagEl = document.getElementById('oracle-surah-tag');
        const numEl = document.getElementById('oracle-verse-num');
        const textEl = document.getElementById('oracle-verse-text');
        const charAvatarEl = document.getElementById('oracle-char-avatar');
        const charNameEl = document.getElementById('oracle-char-name');

        if (cardEl) {
            cardEl.classList.add('card-flip-effect');
            setTimeout(() => {
                if (tagEl) tagEl.innerHTML = `${randVerse.surahIcon} ${randVerse.surahTitle}`;
                if (numEl) numEl.innerText = `آية #${randVerse.verseNum}`;
                if (textEl) textEl.innerText = `⟦ ${randVerse.verseText} ⟧`;
                if (charAvatarEl) charAvatarEl.src = randAvatar;
                if (charNameEl) charNameEl.innerText = `👑 السلطانة ${randChar.name}`;
                cardEl.classList.remove('card-flip-effect');
            }, 250);
        }

        try {
            const res = await fetch('/api/worship', {
                method: 'POST',
                body: JSON.stringify({ characterId: randChar.id, action: 'instant_verse' })
            });
            const resData = await res.json();
            if (resData.success) {
                if (resData.data?.totalDevotion !== undefined) {
                    const totalEl = document.getElementById('worship-total-pts');
                    if (totalEl) totalEl.innerText = formatDevotion(resData.data.totalDevotion);
                }
                showToast(`✨ اسْتُخْرِجَت الآية بنجاح ونلت (+10 Devotion)`, "success");
            }
        } catch (e) {
            console.error("Draw oracle error", e);
        }
    });
}



