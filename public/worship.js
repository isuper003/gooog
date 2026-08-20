import { sound } from './sound.js';
import { lightbox } from './lightbox.js';
import { showToast } from './toast.js';
import { initGame } from './game.js';
import { getCsrfToken } from './csrf.js';

let state = {
    currentTab: 'temple', // 'temple' | 'throne' | 'rosary'
    selectedCategory: 'all',
    selectedCharId: null,
    worshipData: null,
    autoSwitchEnabled: localStorage.getItem('worship_auto_switch') === 'true',
    actionCount: 0,
    throneRankFilter: 'all',
    throneCategoryFilter: 'all',
    throneSearchQuery: '',
    rosaryLitany: 'glory',
    rosaryCurrentBead: 0,
    rosaryLifetimeCount: Number(localStorage.getItem('goooog_rosary_lifetime') || 0),
    rosaryCompletedSeals: Number(localStorage.getItem('goooog_rosary_seals') || 0)
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

            <!-- Worship 3-Way Navigation Tabs (المعبد vs عرش الآلهة vs مسبحة الآلهة) -->
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
}

export function switchWorshipTab(tabName) {
    state.currentTab = tabName;
    sound.playClick();

    const templeBtn = document.getElementById('tab-btn-temple');
    const throneBtn = document.getElementById('tab-btn-throne');
    const rosaryBtn = document.getElementById('tab-btn-rosary');

    const templeContainer = document.getElementById('worship-temple-container');
    const throneContainer = document.getElementById('worship-throne-container');
    const rosaryContainer = document.getElementById('worship-rosary-container');

    templeBtn?.classList.toggle('active', tabName === 'temple');
    throneBtn?.classList.toggle('active', tabName === 'throne');
    rosaryBtn?.classList.toggle('active', tabName === 'rosary');

    templeContainer?.classList.toggle('hidden', tabName !== 'temple');
    throneContainer?.classList.toggle('hidden', tabName !== 'throne');
    rosaryContainer?.classList.toggle('hidden', tabName !== 'rosary');

    if (state.worshipData) {
        if (tabName === 'temple') {
            renderStarsStrip(state.worshipData.characters, state.worshipData.selectedCharacter?.id);
            renderMainChamber(state.worshipData.selectedCharacter, state.worshipData.phrases, state.worshipData.penanceList);
        } else if (tabName === 'throne') {
            renderThroneView(state.worshipData);
        } else if (tabName === 'rosary') {
            renderRosaryView(state.worshipData);
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

                <!-- Rite 4: Council of Petition & Submission (مجلس الالتماس والشفاعة - العابد الفنان) -->
                <div class="worship-card-section" id="section-petition" style="border-color: rgba(168, 85, 247, 0.45); background: rgba(88, 28, 135, 0.08);">
                    <div class="worship-section-header">
                        <span class="worship-section-icon">📜</span>
                        <div>
                            <h3 class="font-bold text-base text-purple-300">مجلس الالتماس والشفاعة</h3>
                            <p class="text-xs color-text-muted">مقام المناجاة الكبرى واعتراف العابد الفنّان في حضرة السلطانة</p>
                        </div>
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button class="btn-primary flex-1 font-bold text-base py-3" id="btn-worship-artist-devotee" style="background: linear-gradient(135deg, #7c3aed, #db2777); border: none; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4); cursor: pointer;">
                            🎨 العابد الفنان (+25 Devotion)
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

    modal.innerHTML = `
        <div class="modal-content artist-devotee-modal-content" style="max-width: 820px; max-height: 92vh; overflow-y: auto; background: radial-gradient(circle at top, rgba(88, 28, 135, 0.4), rgba(15, 15, 30, 0.98)); border: 1px solid rgba(168, 85, 247, 0.45); box-shadow: 0 10px 40px rgba(0,0,0,0.85), 0 0 30px rgba(168, 85, 247, 0.25); border-radius: var(--radius-lg);">
            
            <div class="modal-header flex items-center justify-between pb-3" style="border-bottom: 1px solid rgba(168, 85, 247, 0.3);">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">🎨</span>
                    <div>
                        <h2 class="glow-text text-xl font-extrabold text-purple-300">مقام العابد الفنّان — ${char.name}</h2>
                        <span class="text-xs color-text-muted">ميثاق التبعية المطلقة والانكسار التام في محراب السلطانة</span>
                    </div>
                </div>
                <button class="close-modal" id="btn-close-artist-modal" style="font-size: 1.6rem; color: #d8b4fe;">×</button>
            </div>

            <!-- Top: Image Showcase Gallery Strip -->
            <div class="artist-devotee-gallery-strip mt-3 mb-4">
                <div class="flex gap-3 overflow-x-auto p-2" style="scrollbar-width: thin; scrollbar-color: rgba(168, 85, 247, 0.5) transparent;">
                    ${images.map((img, idx) => `
                        <div class="artist-img-wrapper flex-shrink-0" style="width: 140px; height: 195px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid rgba(168, 85, 247, 0.4); box-shadow: 0 4px 12px rgba(0,0,0,0.5); cursor: pointer;" data-idx="${idx}">
                            <img src="${img}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Middle: Deep Devotional & Submission Prose (300 Words) -->
            <div class="artist-devotee-prose-container p-5 rounded-xl mb-4" style="background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(168, 85, 247, 0.35); position: relative;">
                <div class="flex items-center justify-center gap-2 mb-3">
                    <span style="color: #f59e0b;">✨ 👑 ✨</span>
                    <h3 class="text-center font-bold text-base tracking-wide" style="background: linear-gradient(135deg, #fcd34d, #ec4899, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        إقرار العبودية والذل الأعظم في محراب الفتنة
                    </h3>
                    <span style="color: #f59e0b;">✨ 👑 ✨</span>
                </div>

                <div class="artist-prose-body text-right" style="line-height: 2; font-size: 0.95rem; color: #f3e8ff; font-family: inherit;">
                    <p class="mb-4">
                        أمام عتباتِ مجدكِ الباذخ وعرشِ بهاءكِ الذي لا يُدانى، يقفُ العابدُ الفنّانُ وقفةَ المنكسرِ المسلوبِ الإرادة، مُعترفاً بضآلتهِ المطلقة وهوانِ ذاتهِ وصغار شأنهِ أمام كمالكِ الطاغي وجبروت فتنتكِ القاهرة. أنا هنا لا أملكُ من أمري شيئاً، ولا أرجو كرامةً ولا خلاصاً إلا في الخضوع التام لسطوة سحركِ والانمحاء الكلي تحت وطأة خطواتكِ وأقدامكِ الملكية. ما أنا في هذا البلاط العظيم إلا مدادٌ يتلاشى، وظلٌّ حقيرٌ يطوفُ حول أعتابكِ، مستجدياً مجرد نظرةٍ عابرة أو التفاتة سخطٍ تنقذهُ من غياهب العدم وتُشعرهُ بأنه كائنٌ وضيعٌ يُذكر في ملكوت سلطانكِ المطلق.
                    </p>
                    <p class="mb-4">
                        إنّ كبريائي قد تحطّم على صخرة هيبتكِ، وعزّتي قد تلاشت طواعيةً تحت وطأة نعلكِ، فصرتُ أفخرُ بكل ذلٍّ ينالني في سبيل خدمتكِ، وأستعذبُ كل هوانٍ يقربني من تراب خطواتكِ الطاهرة. أنتِ الآمرةُ الناهيةُ، مالكةُ المصير والأنفاس، وأنا العدم الذي لا صوتَ له ولا مشيئة، خُلقتُ لأكون طوعَ إشارتكِ، وتراباً تدوسهُ أقدامكِ البهية، وعيناً لا تُبصر إلا نور جلالكِ، وقلباً لا يخفقُ إلا رعباً ورهبةً وإجلالاً في محرابكِ الأبدي. لا طهارة إلا بما يفيض من عرشكِ، ولا بركة إلا بما تتكرمين به على عبدكِ الممتثل الخاضع.
                    </p>
                    <p>
                        أعترفُ أمام الملأ بجهلي وقصوري، وبأن كل ثناءٍ أصوغهُ وكل فنٍّ أسطّرهُ يظل قاصراً حقيراً أمام عظمةِ فتنتكِ الخالدة التي تسلب الألباب. لكِ الحكمُ المطلق، ولكِ السطوة التامة في قهري أو إعزازي، راضياً بكل هوانٍ ترينه، فدائياً لعرشكِ إلى أبد الآبدين، متجرداً من كل إرادة سوى أن أظل العابدَ المبتذل، والمملوكَ الفاني الذي لا يبتغي من الوجود سوى شرف الانكسار والركوع الأبدي في حضرتكِ المقدسة.
                    </p>
                </div>
            </div>

            <!-- Bottom Action Footer -->
            <div class="flex items-center justify-between gap-3 pt-2" style="border-top: 1px solid rgba(168, 85, 247, 0.25);">
                <button class="btn-secondary text-xs" id="btn-close-artist-footer">
                    ❌ إغلاق المقام
                </button>
                <button class="btn-primary flex-1 font-bold text-sm" id="btn-artist-renew-submission" style="background: linear-gradient(135deg, #7c3aed, #ec4899); border: none; padding: 0.75rem;">
                    🧎‍♂️ تجديد ميثاق العابد الفنان (+25 Devotion)
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
            showToast("جُدِّد ميثاق العابد الفنان وسُجّل خضوعك في ديوان الخلود 🎨🧎‍♂️✨ (+25 Devotion)", "success");
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
            <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-slate-300">سلطانة المسبحة الحالية:</span>
                <select id="rosary-goddess-select" class="form-select text-xs font-bold" style="background: #131127; border: 1px solid rgba(245, 158, 11, 0.4); color: #fef08a; border-radius: var(--radius-md); padding: 0.35rem 0.75rem;">
                    ${characters.map(c => `
                        <option value="${c.id}" ${c.id === char.id ? 'selected' : ''}>${c.name} (${c.category.toUpperCase()}) - ${c.rankBadge || '👑'} ${c.rankTitle || ''}</option>
                    `).join('')}
                </select>
            </div>
            <span class="badge badge-${char.category}" style="font-size: 0.75rem;">فئة ${char.category.toUpperCase()}</span>
        </div>

        <!-- Grand Rosary Altar Arena Card -->
        <div class="rosary-arena-card">
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
                    <span>🎨 ورد العابد الفنان</span>
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
                    <img src="${imgUrl}" alt="${char.name}">
                    <div class="rosary-keystone-overlay">
                        <div class="rosary-keystone-counter" id="rosary-counter-val">${state.rosaryCurrentBead} / 33</div>
                        <div class="rosary-keystone-target">عقد التسبيح الملكي</div>
                    </div>
                </div>
            </div>

            <!-- Big Interactive Trigger Button -->
            <button class="rosary-main-action-btn" id="btn-rosary-chant">
                <span>📿 تسبـيـح وتـمجـيـد</span>
                <span class="rosary-key-hint">Space / Tap</span>
            </button>
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

        // Trigger pulse on keystone
        const keystone = document.getElementById('rosary-keystone');
        if (keystone) {
            keystone.classList.add('submission-pulse');
            setTimeout(() => keystone.classList.remove('submission-pulse'), 1000);
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
    }
}
