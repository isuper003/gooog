import { sound } from './sound.js';
import { lightbox } from './lightbox.js';
import { showToast } from './toast.js';
import { initGame } from './game.js';
import { getCsrfToken } from './csrf.js';

let state = {
    selectedCategory: 'all',
    selectedCharId: null,
    worshipData: null,
    autoSwitchEnabled: localStorage.getItem('worship_auto_switch') === 'true',
    actionCount: 0
};

export async function initWorship() {
    const container = document.getElementById('page-worship');
    if (!container) return;

    container.innerHTML = `
        <div class="page-container worship-page-container">
            <!-- Header Banner -->
            <div class="worship-header text-center mb-4">
                <div class="inline-flex items-center gap-2 mb-2">
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
    `;

    attachRibbonEvents();
    attachToggleEvents();
    await loadWorshipData();
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
                                <span class="text-xs text-amber-300 font-bold" id="worship-devotion-score">✨ ${char.devotionScore || 0} Devotion Pts</span>
                            </div>
                        </div>
                        <h2 class="worship-star-title glow-text">${char.name}</h2>
                        <div class="worship-rank-badge font-bold mt-1" id="worship-char-rank">👑 ${char.rankTitle}</div>
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
                        <button class="btn-primary flex-1" id="btn-offer-praise" style="background: linear-gradient(135deg, #d97706, #ec4899); border: none;">
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
                        <button class="btn-primary flex-1" id="btn-offer-submission" style="background: linear-gradient(135deg, #ec4899, #8b5cf6); border: none;">
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
                        <button class="btn-secondary flex-1" id="btn-offer-penance" style="border-color: rgba(244, 63, 94, 0.5); color: #fda4af;">
                            🙇‍♂️ إقرار التقصير ومحو الزلل
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
                            🎨 العابد الفنان
                        </button>
                    </div>
                </div>

            </div>
        </div>
    `;

    attachChamberListeners(char, phrases);
}

function attachChamberListeners(char, phrases) {
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
                const rankEl = document.getElementById('worship-char-rank');
                if (rankEl) rankEl.innerText = `👑 ${char.rankTitle}`;
            }
            if (data.data?.times_correct !== undefined) {
                char.times_correct = data.data.times_correct;
                const correctEl = document.getElementById('worship-penance-correct');
                if (correctEl) correctEl.innerText = char.times_correct;
            }
            if (data.data?.totalDevotion !== undefined) {
                const totalEl = document.getElementById('worship-total-pts');
                if (totalEl) totalEl.innerText = data.data.totalDevotion;
            }
            const scoreEl = document.getElementById('worship-devotion-score');
            if (scoreEl) scoreEl.innerText = `✨ ${char.devotionScore} Devotion Pts`;
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
                const rankEl = document.getElementById('worship-char-rank');
                if (rankEl) rankEl.innerText = `👑 ${char.rankTitle}`;
            }
            if (data.data?.times_correct !== undefined) {
                char.times_correct = data.data.times_correct;
                const correctEl = document.getElementById('worship-penance-correct');
                if (correctEl) correctEl.innerText = char.times_correct;
            }
            if (data.data?.totalDevotion !== undefined) {
                const totalEl = document.getElementById('worship-total-pts');
                if (totalEl) totalEl.innerText = data.data.totalDevotion;
            }
            const scoreEl = document.getElementById('worship-devotion-score');
            if (scoreEl) scoreEl.innerText = `✨ ${char.devotionScore} Devotion Pts`;
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
                const rankEl = document.getElementById('worship-char-rank');
                if (rankEl) rankEl.innerText = `👑 ${char.rankTitle}`;
            }
            if (data.data?.totalDevotion !== undefined) {
                const totalEl = document.getElementById('worship-total-pts');
                if (totalEl) totalEl.innerText = data.data.totalDevotion;
            }
            const scoreEl = document.getElementById('worship-devotion-score');
            if (scoreEl) scoreEl.innerText = `✨ ${char.devotionScore} Devotion Pts`;
            showToast("قُبِل الاعتراف ورُفِع عنك التقصير 🙇‍♂️", "info");
            handleRiteProgress(char);
        }
    });

    // Rite 4: "العابد الفنان" Overlay Trigger
    document.getElementById('btn-worship-artist-devotee')?.addEventListener('click', () => {
        sound.playClick();
        openArtistDevoteeOverlay(char);
    });
}

export function openArtistDevoteeOverlay(char) {
    let modal = document.getElementById('modal-artist-devotee');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-artist-devotee';
        modal.className = 'modal hidden';
        document.body.appendChild(modal);
    }

    const images = char.images && char.images.length > 0 ? char.images : [char.primaryImage || ''];

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
            body: JSON.stringify({ characterId: char.id, action: 'submit' })
        });
        const data = await res.json();
        if (data.success) {
            char.devotionScore = (data.data?.devotionScore !== undefined) ? data.data.devotionScore : (char.devotionScore || 0) + 25;
            const scoreEl = document.getElementById('worship-devotion-score');
            if (scoreEl) scoreEl.innerText = `✨ ${char.devotionScore} Devotion Pts`;
            const totalEl = document.getElementById('worship-total-pts');
            if (totalEl && data.data?.totalDevotion !== undefined) totalEl.innerText = data.data.totalDevotion;
            showToast("جُدِّد ميثاق العابد الفنان وسُجّل خضوعك في ديوان الخلود 🎨🧎‍♂️✨", "success");
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
