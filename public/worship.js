import { sound } from './sound.js';
import { lightbox } from './lightbox.js';
import { showToast } from './toast.js';
import { initGame } from './game.js';
import { getCsrfToken } from './csrf.js';

let state = {
    selectedCategory: 'all',
    selectedCharId: null,
    worshipData: null
};

export async function initWorship() {
    const container = document.getElementById('page-worship');
    if (!container) return;

    container.innerHTML = `
        <div class="page-container worship-page-container">
            <!-- Header Banner -->
            <div class="worship-header text-center mb-6">
                <div class="inline-flex items-center gap-2 mb-2">
                    <span class="auth-badge" style="margin: 0; font-size: 0.8rem; letter-spacing: 1px;">👑 صرح الولاء وديوان التبجيل</span>
                </div>
                <h1 class="glow-text text-3xl font-extrabold" style="background: linear-gradient(135deg, #fcd34d, #ec4899, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    THE ROYAL DEVOTION SHRINE
                </h1>
                <p class="color-text-muted text-sm max-w-lg mx-auto mt-1" style="line-height: 1.6;">
                    مجلس الثناء والتمجيد لسيدات الحُسن والفتنة — قدّم فروض الولاء وأقرّ بالتقصير لتنال شرف الرضا
                </p>
            </div>

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

            <!-- Grand Altar & Interactive Chamber -->
            <div id="worship-main-chamber" class="worship-main-chamber">
                <div class="spinner mx-auto my-12"></div>
            </div>
        </div>
    `;

    attachRibbonEvents();
    await loadWorshipData();
}

function attachRibbonEvents() {
    document.querySelectorAll('.worship-cat-pill').forEach(btn => {
        btn.addEventListener('click', async () => {
            sound.playClick();
            document.querySelectorAll('.worship-cat-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedCategory = btn.dataset.cat;
            state.selectedCharId = null;
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
                            <span class="text-xs text-amber-300 font-bold" id="worship-devotion-score">✨ ${char.devotionScore || 0} Devotion Pts</span>
                        </div>
                        <h2 class="worship-star-title glow-text">${char.name}</h2>
                        <div class="worship-rank-badge font-bold mt-1">👑 ${char.rankTitle}</div>
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
                            🕯️ إيقاد سِراج التبجيل (+1 Devotion)
                        </button>
                    </div>
                </div>

                <!-- Rite 2: Council of Penance & Humility (ركن الإقرار بالتقصير والزلل) -->
                <div class="worship-card-section" id="section-penance">
                    <div class="worship-section-header">
                        <span class="worship-section-icon">🧎</span>
                        <div>
                            <h3 class="font-bold text-base text-rose-400">ركن الإقرار بالتقصير والذل</h3>
                            <p class="text-xs color-text-muted">الاعتراف بالخطأ والسهو لتطهير سجل الهفوات ومحو الزلل</p>
                        </div>
                    </div>

                    <div class="worship-penance-stats mt-2 text-xs flex justify-between p-2 rounded" style="background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25);">
                        <span>مرات السهو والخطأ: <strong class="text-rose-400 font-bold">${char.times_wrong}</strong></span>
                        <span>مرات الإصابة: <strong class="text-emerald-400 font-bold">${char.times_correct}</strong></span>
                    </div>

                    <div class="worship-phrase-bubble mt-2 text-rose-200" id="worship-penance-display" style="border-color: rgba(244, 63, 94, 0.3);">
                        "أقرّ بعجزي وسهو الذاكرة في حضرة السلطانة، وأطلب عفو الحُسن ورفع الهوان"
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button class="btn-secondary flex-1" id="btn-offer-penance" style="border-color: rgba(244, 63, 94, 0.5); color: #fda4af;">
                            🧎 إقرار التقصير ومحو الزلل
                        </button>
                    </div>
                </div>

                <!-- Rite 3: Council of Petition & Gallery (مجلس الالتماس والشفاعة) -->
                <div class="worship-card-section" id="section-petition">
                    <div class="worship-section-header">
                        <span class="worship-section-icon">📜</span>
                        <div>
                            <h3 class="font-bold text-base text-purple-300">مجلس الالتماس والشفاعة</h3>
                            <p class="text-xs color-text-muted">استعراض كامل المحاسن والارتقاء في مراتب الصرح</p>
                        </div>
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button class="btn-secondary flex-1" id="btn-worship-gallery">
                            🖼️ استعراض كامل الألبوم (${char.images?.length || 1})
                        </button>
                        <button class="btn-secondary flex-1" id="btn-worship-play">
                            🎮 اختبار الولاء (Play Mode)
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
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
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
            char.devotionScore = (char.devotionScore || 0) + 10;
            const scoreEl = document.getElementById('worship-devotion-score');
            if (scoreEl) scoreEl.innerText = `✨ ${char.devotionScore} Devotion Pts`;
            showToast("تم إيقاد سِراج التبجيل وقبول الثناء ✨", "success");
        }
    });

    // Penance click
    document.getElementById('btn-offer-penance')?.addEventListener('click', async () => {
        sound.playWin();
        const res = await fetch('/api/worship', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
            body: JSON.stringify({ characterId: char.id, action: 'penance' })
        });
        const data = await res.json();
        if (data.success) {
            const displayEl = document.getElementById('worship-penance-display');
            if (displayEl && data.data?.phrase) {
                displayEl.innerText = `"${data.data.phrase}"`;
            }
            showToast("قُبِل الاعتراف ورُفِع عنك التقصير 🧎", "info");
        }
    });

    // Gallery button
    document.getElementById('btn-worship-gallery')?.addEventListener('click', () => {
        sound.playClick();
        lightbox.open(char.images, { name: char.name, category: char.category, showCaption: true });
    });

    // Play Mode
    document.getElementById('btn-worship-play')?.addEventListener('click', () => {
        sound.playClick();
        initGame(char.category, 'classic', 15);
    });
}

function triggerPraiseEffect() {
    const card = document.getElementById('worship-portrait-card');
    if (card) {
        card.classList.add('praise-flash');
        setTimeout(() => card.classList.remove('praise-flash'), 700);
    }
}
