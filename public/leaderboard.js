import { sound } from './sound.js';
import { lightbox } from './lightbox.js';
import { esc } from './esc.js';

export async function initLeaderboard() {
    const container = document.getElementById('page-leaderboard');
    if (!container) return;

    let currentType = 'devotees'; // 'devotees', 'goddesses', 'stars', 'users'
    let currentFilter = 'devotion'; // for devotees: 'devotion', 'surahs', 'meditation', 'streaks', 'character'
    let currentCategory = 'all'; // for goddesses/stars/users: 'all', 'sluts', 'trans', 'twinks'
    let selectedCharacterId = null;
    let charactersListCache = null;

    container.innerHTML = `
        <div class="leaderboard-header-section mb-6">
            <div class="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 class="glow-text text-2xl mb-1" id="leaderboard-title">👑 دِيوَانُ صَفْوَةِ العُبَّادِ والمَقَامِ المَلَكِيّ</h1>
                    <p class="color-text-muted text-sm" id="leaderboard-subtitle">أعظمُ الممتثلين الخاضعين لسطوة وبهاء السلطانات ورصيد البركات والطقوس</p>
                </div>

                <!-- Primary Type Switch -->
                <div class="pill-group leaderboard-type-switch" id="leaderboard-type-switch">
                    <button class="pill active" data-type="devotees">👑 ديوان صفوة العباد</button>
                    <button class="pill" data-type="goddesses">⚡ الإله الأكبر</button>
                    <button class="pill" data-type="stars">🌟 دقة النجوم (Stars)</button>
                    <button class="pill" data-type="users">📦 كبار المساهمين</button>
                </div>
            </div>
        </div>

        <!-- Secondary Filter Ribbon -->
        <div class="leaderboard-controls-ribbon mb-5" id="leaderboard-controls-ribbon">
            <div class="leaderboard-tabs" id="leaderboard-sub-tabs"></div>
            <div id="leaderboard-extra-control"></div>
            <div class="text-xs color-text-muted hidden sm:block" id="leaderboard-counter-label">
                صفوة الـ 50 الأوائل
            </div>
        </div>

        <!-- Leaderboard List Container -->
        <div id="leaderboard-list-container" class="leaderboard-list">
            <div class="leaderboard-row skeleton" style="height: 76px;"></div>
            <div class="leaderboard-row skeleton" style="height: 76px;"></div>
            <div class="leaderboard-row skeleton" style="height: 76px;"></div>
            <div class="leaderboard-row skeleton" style="height: 76px;"></div>
        </div>
    `;

    function renderSubTabs() {
        const tabsEl = document.getElementById('leaderboard-sub-tabs');
        const extraEl = document.getElementById('leaderboard-extra-control');
        const counterLabel = document.getElementById('leaderboard-counter-label');
        if (!tabsEl) return;

        if (currentType === 'devotees') {
            if (counterLabel) counterLabel.innerText = 'صفوة الـ 50 الأوائل';
            tabsEl.innerHTML = `
                <button class="leaderboard-tab ${currentFilter === 'devotion' ? 'active' : ''}" data-filter="devotion">✨ نقاط الولاء الشاملة</button>
                <button class="leaderboard-tab ${currentFilter === 'surahs' ? 'active' : ''}" data-filter="surahs">📜 خَتَمَةُ السور (28)</button>
                <button class="leaderboard-tab ${currentFilter === 'meditation' ? 'active' : ''}" data-filter="meditation">🧘 ملوك الاعتكاف</button>
                <button class="leaderboard-tab ${currentFilter === 'streaks' ? 'active' : ''}" data-filter="streaks">🔥 سلاسل الحضور</button>
                <button class="leaderboard-tab ${currentFilter === 'character' ? 'active' : ''}" data-filter="character">💎 خادم السلطانة الأخلص</button>
            `;

            if (currentFilter === 'character') {
                extraEl.innerHTML = `
                    <select id="leaderboard-char-select" class="text-xs font-bold py-1.5 px-3"
                            style="background: rgba(15,14,30,.95); border:1px solid rgba(234,179,8,0.5); color:#fef08a; border-radius:8px; cursor:pointer;">
                        <option value="">-- اختر السلطانة --</option>
                    </select>
                `;
                populateCharactersDropdown();
            } else {
                extraEl.innerHTML = '';
            }

            tabsEl.querySelectorAll('.leaderboard-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    sound.playClick();
                    tabsEl.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    currentFilter = e.currentTarget.dataset.filter;
                    renderSubTabs();
                    loadLeaderboard();
                });
            });
        } else if (currentType === 'goddesses') {
            if (counterLabel) counterLabel.innerText = 'سيدات العرش الـ 50 الأوائل';
            if (extraEl) extraEl.innerHTML = '';
            tabsEl.innerHTML = `
                <button class="leaderboard-tab ${currentCategory === 'all' ? 'active' : ''}" data-cat="all">✨ العرش الشامل (الكل)</button>
                <button class="leaderboard-tab ${currentCategory === 'sluts' ? 'active' : ''}" data-cat="sluts">♀️ سلطانات الفتنة</button>
                <button class="leaderboard-tab ${currentCategory === 'trans' ? 'active' : ''}" data-cat="trans">⚧️ سلطانات التحول</button>
                <button class="leaderboard-tab ${currentCategory === 'twinks' ? 'active' : ''}" data-cat="twinks">♂️ سلاطين الدلال</button>
            `;

            tabsEl.querySelectorAll('.leaderboard-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    sound.playClick();
                    tabsEl.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    currentCategory = e.currentTarget.dataset.cat;
                    loadLeaderboard();
                });
            });
        } else {
            if (counterLabel) counterLabel.innerText = 'Showing Top 50 Ranked';
            if (extraEl) extraEl.innerHTML = '';
            tabsEl.innerHTML = `
                <button class="leaderboard-tab ${currentCategory === 'all' ? 'active' : ''}" data-cat="all">✨ All Categories</button>
                <button class="leaderboard-tab ${currentCategory === 'sluts' ? 'active' : ''}" data-cat="sluts">♀️ Sluts</button>
                <button class="leaderboard-tab ${currentCategory === 'trans' ? 'active' : ''}" data-cat="trans">⚧️ Trans</button>
                <button class="leaderboard-tab ${currentCategory === 'twinks' ? 'active' : ''}" data-cat="twinks">♂️ Twinks</button>
            `;

            tabsEl.querySelectorAll('.leaderboard-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    sound.playClick();
                    tabsEl.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    currentCategory = e.currentTarget.dataset.cat;
                    loadLeaderboard();
                });
            });
        }
    }

    async function populateCharactersDropdown() {
        const select = document.getElementById('leaderboard-char-select');
        if (!select) return;

        try {
            if (!charactersListCache) {
                const res = await fetch('/api/characters');
                const data = await res.json();
                charactersListCache = data.data?.characters || [];
            }

            select.innerHTML = '<option value="">-- اختر السلطانة لعرض خادمها الأخلص --</option>' +
                charactersListCache.map(c => `
                    <option value="${esc(c.id)}" ${selectedCharacterId === c.id ? 'selected' : ''}>
                        👑 ${esc(c.name)} (${esc(c.category)})
                    </option>
                `).join('');

            if (!selectedCharacterId && charactersListCache.length > 0) {
                selectedCharacterId = charactersListCache[0].id;
                select.value = selectedCharacterId;
            }

            select.addEventListener('change', (e) => {
                selectedCharacterId = e.target.value;
                loadLeaderboard();
            });
        } catch (e) {
            console.error("Failed to load characters for dropdown", e);
        }
    }

    async function loadLeaderboard() {
        const listEl = document.getElementById('leaderboard-list-container');
        if (!listEl) return;

        listEl.innerHTML = `
            <div class="leaderboard-row skeleton" style="height: 76px;"></div>
            <div class="leaderboard-row skeleton" style="height: 76px;"></div>
            <div class="leaderboard-row skeleton" style="height: 76px;"></div>
        `;

        try {
            let url = `/api/leaderboard?type=${currentType}`;
            if (currentType === 'devotees') {
                url += `&filter=${currentFilter}`;
                if (currentFilter === 'character' && selectedCharacterId) {
                    url += `&characterId=${encodeURIComponent(selectedCharacterId)}`;
                }
            } else {
                url += `&category=${currentCategory}`;
            }

            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                if (currentType === 'devotees') {
                    renderDevoteesList(data.data.leaderboard || [], currentFilter);
                } else if (currentType === 'goddesses') {
                    renderGoddessesList(data.data.leaderboard || []);
                } else if (currentType === 'stars') {
                    renderStarsList(data.data.leaderboard || []);
                } else {
                    renderUsersList(data.data.leaderboard || [], currentCategory);
                }
            }
        } catch (e) {
            console.error("Failed to load leaderboard", e);
            listEl.innerHTML = `
                <div class="result-stat-box text-center py-8">
                    <p class="color-text-muted">حدث خطأ أثناء تحميل لوحة المتصدرين. يُرجى إعادة المحاولة.</p>
                </div>
            `;
        }
    }

    function renderDevoteesList(devotees, activeFilter) {
        const listEl = document.getElementById('leaderboard-list-container');
        if (!listEl) return;

        if (devotees.length === 0) {
            listEl.innerHTML = `
                <div class="result-stat-box text-center py-12" style="background: rgba(15, 14, 30, 0.6); border: 1px dashed rgba(234,179,8,0.3); border-radius: 12px;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🏛️</div>
                    <p style="color: #fef08a; font-family: 'Amiri Quran', serif; font-size: 1.1rem;">
                        لم يُسجَّل أي عابد في هذا المحراب بعد. بادر بالاعتكاف والتسبيح لتتصدر ديوان المعبد!
                    </p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = '';
        devotees.forEach(user => {
            const rankMedal = user.rank === 1 ? '🥇' : (user.rank === 2 ? '🥈' : (user.rank === 3 ? '🥉' : `#${user.rank}`));
            const initial = (user.username || 'U')[0].toUpperCase();
            const isTop3 = user.rank <= 3;

            const row = document.createElement('div');
            row.className = `leaderboard-row ${user.isMe ? 'me' : ''} ${isTop3 ? `rank-${user.rank}` : ''}`;
            row.style.direction = 'rtl';
            row.style.background = isTop3 
                ? 'linear-gradient(90deg, rgba(234, 179, 8, 0.12), rgba(15, 14, 30, 0.8))'
                : 'rgba(15, 14, 30, 0.7)';
            row.style.border = isTop3 ? '1px solid rgba(234, 179, 8, 0.45)' : '1px solid rgba(255,255,255,0.06)';
            row.style.borderRadius = '10px';
            row.style.padding = '0.75rem 1rem';
            row.style.marginBottom = '0.5rem';

            row.innerHTML = `
                <div class="flex items-center justify-between flex-wrap gap-3 w-full">
                    <!-- القسم الأيمن: الترتيب + الهوية + المرتبة الكاملة -->
                    <div class="flex items-center gap-3">
                        <div class="rank-badge" style="font-size: 1.25rem; min-width: 38px; text-align: center; font-weight: 800; color: ${isTop3 ? '#fde047' : '#fff'};">
                            ${rankMedal}
                        </div>
                        <div class="user-avatar-circle" style="background: linear-gradient(135deg, #7c3aed, #db2777); font-weight: 800; font-size: 1.1rem; width: 44px; height: 44px; border-radius: 50%; display:flex; align-items:center; justify-content:center; color:#fff; border: 2px solid rgba(234,179,8,0.5);">
                            ${initial}
                        </div>
                        <div>
                            <div class="font-bold flex items-center gap-2" style="font-size: 1rem;">
                                <span style="color: #fff;">@${esc(user.username)}</span>
                                ${user.isMe ? '<span class="badge" style="background:#8b5cf6; color:#fff; font-size:0.65rem; padding: 2px 6px;">أَنْتَ 👑</span>' : ''}
                                ${user.role === 'admin' ? '<span class="badge" style="background:#ea580c; color:#fff; font-size:0.65rem; padding: 2px 6px;">سَادِن المَعْبَد</span>' : ''}
                            </div>
                            <!-- مرتبة العبودية بالاسم الكامل -->
                            <div style="color: #fef08a; font-family: 'Amiri Quran', serif; font-size: 0.88rem; line-height: 1.4; margin-top: 2px; text-shadow: 0 0 10px rgba(250, 204, 21, 0.35);">
                                ${esc(user.rankBadge || '👑')} ${esc(user.rankTitle || 'عديم الوجود والقيمة')}
                            </div>
                        </div>
                    </div>

                    <!-- القسم الأيسر: شريط الإنجازات المتكامل -->
                    <div class="flex items-center gap-3 flex-wrap">
                        ${activeFilter === 'character' ? `
                            <div class="badge" style="background: rgba(234,179,8,0.2); border:1px solid rgba(234,179,8,0.5); color:#fef08a; font-weight:800; font-size:0.85rem; padding: 0.4rem 0.75rem;">
                                👑 ولاء السلطانة: ${user.charDevotion?.toLocaleString('ar-EG') || user.charDevotion || 0} نقطة
                            </div>
                        ` : `
                            <div class="badge" style="background: rgba(234,179,8,0.18); border:1px solid rgba(234,179,8,0.45); color:#fde047; font-weight:800; font-size:0.85rem; padding: 0.4rem 0.75rem;">
                                ✨ ${user.devotionPoints?.toLocaleString('ar-EG') || user.devotionPoints || 0} نقطة
                            </div>
                        `}

                        <div class="flex items-center gap-2 text-xs color-text-muted" style="font-size: 0.74rem;">
                            <span title="السور المختومة">📜 ${user.sealedSurahs || 0}/28</span>
                            <span>•</span>
                            <span title="دقائق الاعتكاف">🧘 ${user.meditationMinutes || 0} د</span>
                            <span>•</span>
                            <span title="سلسلة الحضور">🔥 ${user.currentStreak || 0} يوم</span>
                        </div>
                    </div>
                </div>
            `;

            listEl.appendChild(row);
        });
    }

    function renderGoddessesList(goddesses) {
        const listEl = document.getElementById('leaderboard-list-container');
        if (!listEl) return;

        if (goddesses.length === 0) {
            listEl.innerHTML = `
                <div class="result-stat-box text-center py-12" style="background: rgba(15, 14, 30, 0.6); border: 1px dashed rgba(234,179,8,0.3); border-radius: 12px;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚡</div>
                    <p style="color: #fef08a; font-family: 'Amiri Quran', serif; font-size: 1.1rem;">
                        لم يُجمع رصيد ولاء كافٍ للسلطانات بعد. العب وقدّم التسابيح لترتقي سلطانتك على عرش المعبد!
                    </p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = '';
        goddesses.forEach(char => {
            const rankMedal = char.rank === 1 ? '🥇' : (char.rank === 2 ? '🥈' : (char.rank === 3 ? '🥉' : `#${char.rank}`));
            const isTop3 = char.rank <= 3;
            const avatarSrc = char.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="%23222"%3E%3Crect width="60" height="60"/%3E%3C/svg%3E';

            const row = document.createElement('div');
            row.className = `leaderboard-row ${isTop3 ? `rank-${char.rank}` : ''}`;
            row.style.direction = 'rtl';
            row.style.background = isTop3 
                ? 'linear-gradient(90deg, rgba(234, 179, 8, 0.14), rgba(15, 14, 30, 0.85))'
                : 'rgba(15, 14, 30, 0.7)';
            row.style.border = isTop3 ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(255,255,255,0.06)';
            row.style.borderRadius = '10px';
            row.style.padding = '0.75rem 1rem';
            row.style.marginBottom = '0.5rem';

            row.innerHTML = `
                <div class="flex items-center justify-between flex-wrap gap-3 w-full">
                    <!-- القسم الأيمن: الترتيب + البورتريه + الاسم والفئة -->
                    <div class="flex items-center gap-3">
                        <div class="rank-badge" style="font-size: 1.3rem; min-width: 38px; text-align: center; font-weight: 800; color: ${isTop3 ? '#fde047' : '#fff'};">
                            ${rankMedal}
                        </div>

                        <div class="star-avatar-box" style="width: 52px; height: 52px; border-radius: 8px; overflow: hidden; border: 2px solid ${isTop3 ? 'rgba(234,179,8,0.7)' : 'rgba(255,255,255,0.1)'}; cursor: pointer;" title="تكبير الصورة">
                            <img src="${avatarSrc}" alt="${esc(char.name)}" loading="lazy" referrerpolicy="no-referrer" class="star-avatar-img" style="width:100%; height:100%; object-fit:cover;">
                        </div>

                        <div>
                            <div class="font-bold flex items-center gap-2" style="font-size: 1.05rem;">
                                <span style="color: #fff; font-family: 'Amiri Quran', serif;">👑 ${esc(char.name)}</span>
                                <span class="badge badge-${char.category}" style="font-size: 0.65rem; padding: 2px 6px;">${esc(char.category.toUpperCase())}</span>
                                ${char.rank === 1 ? '<span class="badge" style="background: linear-gradient(135deg, #eab308, #ca8a04); color:#000; font-weight:800; font-size:0.68rem; padding: 2px 8px;">👑 سَيِّدَةُ العَرْشِ الكُبْرَى</span>' : ''}
                            </div>
                            <div class="text-xs color-text-muted flex items-center gap-2 mt-0.5" style="font-size: 0.74rem;">
                                <span>👥 ${char.totalDevoteesCount?.toLocaleString('ar-EG') || char.totalDevoteesCount || 0} عابد ممتثل</span>
                                <span>•</span>
                                <span>🙇 ${char.totalCommunityTributes?.toLocaleString('ar-EG') || char.totalCommunityTributes || 0} تسبيحة</span>
                            </div>
                        </div>
                    </div>

                    <!-- القسم الأيسر: رصيد الولاء الجماعي + خادمها الأخلص -->
                    <div class="flex items-center gap-3 flex-wrap">
                        <div class="badge" style="background: rgba(234,179,8,0.22); border:1px solid rgba(234,179,8,0.55); color:#fef08a; font-weight:800; font-size:0.92rem; padding: 0.45rem 0.85rem; box-shadow: 0 0 12px rgba(234,179,8,0.15);">
                            ✨ ${char.totalCommunityDevotion?.toLocaleString('ar-EG') || char.totalCommunityDevotion || 0} نقطة ولاء كلي
                        </div>

                        <div class="text-xs" style="background: rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 0.35rem 0.65rem; color: #e9d5ff;">
                            ${char.topDevotee ? `
                                <span style="color:#c084fc;">👑 خادمها الأخلص:</span>
                                <strong style="color:#fde047;">@${esc(char.topDevotee.username)}</strong>
                                <span class="color-text-muted">(${char.topDevotee.devotion?.toLocaleString('ar-EG') || char.topDevotee.devotion} ن)</span>
                            ` : `
                                <span class="color-text-muted">لم يُسجَّل خادم بعد</span>
                            `}
                        </div>
                    </div>
                </div>
            `;

            const imgEl = row.querySelector('.star-avatar-img');
            if (imgEl && char.image) {
                imgEl.addEventListener('click', () => {
                    sound.playClick();
                    lightbox.open([char.image], {
                        initialIndex: 0,
                        name: char.name,
                        category: char.category,
                        showCaption: true
                    });
                });
            }

            listEl.appendChild(row);
        });
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
            
            let trendIcon = '<span class="trend-indicator trend-same" title="Stable in rank">▬</span>';
            if (star.trend === 'up') {
                trendIcon = '<span class="trend-indicator trend-up" title="Rank rising">▲</span>';
            } else if (star.trend === 'down') {
                trendIcon = '<span class="trend-indicator trend-down" title="Rank falling">▼</span>';
            }

            const avatarSrc = star.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="%23222"%3E%3Crect width="60" height="60"/%3E%3C/svg%3E';

            const row = document.createElement('div');
            row.className = `leaderboard-row star-rank-row rank-${star.rank <= 3 ? star.rank : 'default'}`;
            row.style.direction = 'ltr';
            row.innerHTML = `
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
            row.style.direction = 'ltr';
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

    // Type Switch Listener (Devotees vs Goddesses vs Stars vs Users)
    document.querySelectorAll('#leaderboard-type-switch button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            sound.playClick();
            document.querySelectorAll('#leaderboard-type-switch button').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            currentType = target.dataset.type;

            const titleEl = document.getElementById('leaderboard-title');
            const subtitleEl = document.getElementById('leaderboard-subtitle');
            
            if (currentType === 'devotees') {
                if (titleEl) titleEl.innerText = '👑 دِيوَانُ صَفْوَةِ العُبَّادِ والمَقَامِ المَلَكِيّ';
                if (subtitleEl) subtitleEl.innerText = 'أعظمُ الممتثلين الخاضعين لسطوة وبهاء السلطانات ورصيد البركات والطقوس';
            } else if (currentType === 'goddesses') {
                if (titleEl) titleEl.innerText = '⚡ عَرْشُ الإِلَهِ الأَكْبَرِ وسَيِّدَاتِ التَّبْجِيلِ الأَعْلَى';
                if (subtitleEl) subtitleEl.innerText = 'تصنيفُ السلطانات بحسب إجمالي رصيد الولاء والبركات التراكمية من كافة الرعية والعباد';
            } else if (currentType === 'stars') {
                if (titleEl) titleEl.innerText = '🌟 Top Stars & Accuracy';
                if (subtitleEl) subtitleEl.innerText = 'Most recognized celebrities with the lowest player error rate';
            } else {
                if (titleEl) titleEl.innerText = '📦 Hall of Top Contributors';
                if (subtitleEl) subtitleEl.innerText = 'Top contributors helping enrich the shared character library';
            }

            renderSubTabs();
            loadLeaderboard();
        });
    });

    renderSubTabs();
    loadLeaderboard();
}

