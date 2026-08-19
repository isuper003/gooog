import { sound } from './sound.js';
import { lightbox } from './lightbox.js';
import { showToast } from './toast.js';
import { getCsrfToken } from './csrf.js';

export function initCrawler(currentUser) {
    const container = document.getElementById('page-admin');
    if (!container) return;

    const isAdminOrMod = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');

    container.innerHTML = `
        <div class="mb-4">
            <div class="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 class="glow-text text-2xl mb-1">🕷️ Smart Import & Bulk Crawler</h1>
                    <p class="color-text-muted text-sm">Automated 1280px Ultra-HD character & photo gallery extraction</p>
                </div>
                ${isAdminOrMod ? `
                    <div class="flex gap-2">
                        <button id="tab-admin-crawler" class="btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">🕷️ Smart Import</button>
                        <button id="tab-admin-mod" class="btn-secondary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">🛡️ Mod Queue (<span id="mod-queue-count">0</span>)</button>
                        <button id="tab-admin-reports" class="btn-secondary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">🚩 Reports (<span id="mod-reports-count">0</span>)</button>
                    </div>
                ` : ''}
            </div>
        </div>

        <!-- Section 1: Crawler Panel -->
        <div id="section-crawler-panel">
            <!-- Row 1: Fixed/Sticky Customization & Controls Toolbar -->
            <div class="crawler-top-toolbar">
                <div class="crawler-controls-row">
                    <!-- Category Selector Group -->
                    <div class="toolbar-group">
                        <label class="toolbar-label">Category</label>
                        <select id="crawler-category" class="toolbar-select">
                            <option value="sluts">♀️ Sluts (Female)</option>
                            <option value="trans">⚧️ Trans (Shemale)</option>
                            <option value="twinks">♂️ Twinks (Gay)</option>
                        </select>
                    </div>

                    <!-- Page Stepper Group -->
                    <div class="toolbar-group">
                        <label class="toolbar-label">Source Page</label>
                        <div class="crawler-page-stepper">
                            <button class="btn-step" id="btn-page-prev" title="Previous Page">◀</button>
                            <input type="number" id="crawler-page-input" value="1" min="1" max="500">
                            <button class="btn-step" id="btn-page-next" title="Next Page">▶</button>
                        </div>
                    </div>

                    <!-- Quick Page Shortcuts Group -->
                    <div class="toolbar-group">
                        <label class="toolbar-label">Quick Jump</label>
                        <div class="page-pills" id="crawler-page-pills">
                            <button class="page-pill active" data-page="1">1</button>
                            <button class="page-pill" data-page="2">2</button>
                            <button class="page-pill" data-page="3">3</button>
                            <button class="page-pill" data-page="4">4</button>
                            <button class="page-pill" data-page="5">5</button>
                            <button class="page-pill" data-page="10">10</button>
                            <button class="page-pill" data-page="20">20</button>
                            <button class="page-pill" data-page="50">50</button>
                        </div>
                    </div>

                    <!-- Fetch Button -->
                    <button id="btn-fetch-crawler" class="btn-primary btn-fetch-action">
                        ⚡ Fetch 40 Characters
                    </button>
                </div>

                <!-- Sub-Row: Direct Model Scraper & Quick Filters Ribbon -->
                <div class="crawler-ribbon-row">
                    <!-- Direct Model Search -->
                    <div class="direct-search-wrapper">
                        <input type="text" id="crawler-direct-url" placeholder="Paste model URL or name (e.g. riley-reid)..." class="direct-search-input">
                        <button id="btn-fetch-direct" class="btn-secondary btn-scrape-action">
                            🔍 Scrape Model
                        </button>
                    </div>

                    <!-- Quick Select Helpers & Live Stats Badges -->
                    <div class="ribbon-actions-group">
                        <div class="flex gap-1">
                            <button id="btn-select-all" class="btn-secondary btn-compact">✓ Check All</button>
                            <button id="btn-deselect-all" class="btn-secondary btn-compact">✕ Uncheck All</button>
                        </div>

                        <div class="stats-pills-wrap">
                            <div class="crawler-stat-pill" title="Total Extracted">
                                <span class="color-text-muted">Total:</span>
                                <span id="crawler-stat-total" class="font-bold">0</span>
                            </div>
                            <div class="crawler-stat-pill pill-new" title="New Characters">
                                <span style="color: #34d399;">New:</span>
                                <span id="crawler-stat-new" class="font-bold" style="color: #34d399;">0</span>
                            </div>
                            <div class="crawler-stat-pill pill-exists" title="Already in Library">
                                <span style="color: #fb7185;">Exists:</span>
                                <span id="crawler-stat-exists" class="font-bold" style="color: #fb7185;">0</span>
                            </div>
                            <div class="crawler-stat-pill pill-selected" title="Selected to Import">
                                <span class="glow-text" style="color: var(--accent-cyan);">Selected:</span>
                                <span id="crawler-stat-selected" class="font-bold glow-text" style="color: var(--accent-cyan);">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Row 2 & Below: Character Rows List -->
            <div id="crawler-results-grid" class="crawler-rows-list">
                <div class="result-stat-box text-center py-12">
                    <p class="color-text-muted">Select category and page above, then click <strong>"⚡ Fetch 40 Characters"</strong> to load all candidates and choose their photos.</p>
                </div>
            </div>

            <!-- Sticky Floating Footer -->
            <div id="crawler-sticky-footer" class="crawler-sticky-footer hidden">
                <div>
                    <div class="font-bold text-base">
                        Selected: <span id="crawler-selected-count" class="glow-text" style="color: var(--accent-cyan); font-size: 1.25rem;">0</span> models
                    </div>
                    <div class="text-xs color-text-muted" id="crawler-selected-imgs-count">0 Ultra-HD images ready for import</div>
                </div>
                <button id="btn-batch-import" class="btn-primary" style="padding: 0.75rem 1.75rem; font-weight: bold; box-shadow: var(--glow-purple);">
                    📥 Import Selected to Library
                </button>
            </div>
        </div>

        <!-- Section 2: Moderation Queue -->
        <div id="section-mod-queue" class="hidden">
            <div id="mod-queue-grid" class="gallery-grid">
                <div class="result-stat-box text-center py-12" style="grid-column: 1 / -1;">
                    <span class="color-text-muted">Loading pending approvals...</span>
                </div>
            </div>
        </div>

        <!-- Section 3: Reports List -->
        <div id="section-mod-reports" class="hidden">
            <div id="mod-reports-container" class="flex flex-col gap-3">
                <div class="result-stat-box text-center py-12">
                    <span class="color-text-muted">Loading reports...</span>
                </div>
            </div>
        </div>
    `;

    let activePage = 1;
    let crawledCharacters = []; // { id, name, slug, category, profileImage, allImages: [], selectedImages: [], isDuplicate, isFullGalleryLoaded }
    let selectedCharIds = new Set();

    // Tab Switching for Admins/Moderators
    if (isAdminOrMod) {
        const tabCrawler = document.getElementById('tab-admin-crawler');
        const tabMod = document.getElementById('tab-admin-mod');
        const tabReports = document.getElementById('tab-admin-reports');
        const secCrawler = document.getElementById('section-crawler-panel');
        const secMod = document.getElementById('section-mod-queue');
        const secReports = document.getElementById('section-mod-reports');

        tabCrawler?.addEventListener('click', () => {
            tabCrawler.className = 'btn-primary';
            tabMod.className = 'btn-secondary';
            tabReports.className = 'btn-secondary';
            secCrawler?.classList.remove('hidden');
            secMod?.classList.add('hidden');
            secReports?.classList.add('hidden');
        });

        tabMod?.addEventListener('click', () => {
            tabMod.className = 'btn-primary';
            tabCrawler.className = 'btn-secondary';
            tabReports.className = 'btn-secondary';
            secMod?.classList.remove('hidden');
            secCrawler?.classList.add('hidden');
            secReports?.classList.add('hidden');
            loadModerationQueue();
        });

        tabReports?.addEventListener('click', () => {
            tabReports.className = 'btn-primary';
            tabCrawler.className = 'btn-secondary';
            tabMod.className = 'btn-secondary';
            secReports?.classList.remove('hidden');
            secCrawler?.classList.add('hidden');
            secMod?.classList.add('hidden');
            loadReports();
        });

        loadModCounts();
    }

    // Dynamic Page Selection Logic
    const pageInput = document.getElementById('crawler-page-input');
    const btnPrev = document.getElementById('btn-page-prev');
    const btnNext = document.getElementById('btn-page-next');

    function setPage(pageNum, triggerFetch = false) {
        activePage = Math.max(1, Math.min(500, parseInt(pageNum) || 1));
        if (pageInput) pageInput.value = activePage;

        document.querySelectorAll('.page-pill').forEach(p => {
            if (parseInt(p.dataset.page) === activePage) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });

        if (triggerFetch) {
            document.getElementById('btn-fetch-crawler')?.click();
        }
    }

    pageInput?.addEventListener('change', () => {
        setPage(pageInput.value);
    });

    btnPrev?.addEventListener('click', () => {
        if (activePage > 1) {
            sound.playClick();
            setPage(activePage - 1);
        }
    });

    btnNext?.addEventListener('click', () => {
        sound.playClick();
        setPage(activePage + 1);
    });

    // Page Pills Selection
    document.querySelectorAll('.page-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            sound.playClick();
            setPage(pill.dataset.page);
        });
    });

    // Check All / Uncheck All
    document.getElementById('btn-select-all')?.addEventListener('click', () => {
        crawledCharacters.forEach(char => {
            if (!char.isDuplicate) {
                selectedCharIds.add(char.id);
                const cb = document.querySelector(`.crawler-checkbox[data-id="${char.id}"]`);
                if (cb) cb.checked = true;
            }
        });
        updateStatsAndFooter();
    });

    document.getElementById('btn-deselect-all')?.addEventListener('click', () => {
        selectedCharIds.clear();
        document.querySelectorAll('.crawler-checkbox').forEach(cb => cb.checked = false);
        updateStatsAndFooter();
    });

    // Direct Single Model Scraper
    document.getElementById('btn-fetch-direct')?.addEventListener('click', async () => {
        const directInput = document.getElementById('crawler-direct-url');
        const query = directInput ? directInput.value.trim() : '';
        if (!query) {
            showToast("Please enter a model name, slug, or pornpics URL", "warning");
            return;
        }

        sound.playClick();
        const category = document.getElementById('crawler-category').value;
        const btn = document.getElementById('btn-fetch-direct');
        if (btn) {
            btn.disabled = true;
            btn.innerText = "⏳ Scraping...";
        }

        try {
            const res = await fetch(`/api/crawler/model-photos?url=${encodeURIComponent(query)}&slug=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (btn) {
                btn.disabled = false;
                btn.innerText = "🔍 Scrape Model";
            }

            if (!data.success || !data.data) {
                showToast(data.error || "Failed to find model photos", "error");
                return;
            }

            const model = data.data;
            const existingRes = await fetch('/api/characters?limit=2000');
            const existingData = await existingRes.json();
            const existingNames = new Set((existingData.data?.characters || []).map(c => c.name.toLowerCase().trim()));
            const isDup = existingNames.has(model.name.toLowerCase().trim());

            const galleryPhotos = model.photos || [];
            const newChar = {
                id: `direct_${Date.now()}`,
                name: model.name,
                slug: model.slug,
                category: category,
                profileImage: model.profileImage,
                allImages: galleryPhotos,
                selectedImages: galleryPhotos.slice(0, Math.min(4, galleryPhotos.length)),
                isDuplicate: isDup,
                isFullGalleryLoaded: true
            };

            crawledCharacters.unshift(newChar);
            if (!isDup) selectedCharIds.add(newChar.id);

            renderCrawlerRows();
            showToast(`Loaded ${galleryPhotos.length} Ultra-HD gallery photos for ${model.name}!`, "success");
        } catch (e) {
            if (btn) {
                btn.disabled = false;
                btn.innerText = "🔍 Scrape Model";
            }
            showToast("Network error while scraping model", "error");
        }
    });

    // Batch Fetch Characters Handler
    document.getElementById('btn-fetch-crawler')?.addEventListener('click', async () => {
        sound.playClick();
        const category = document.getElementById('crawler-category').value;
        const grid = document.getElementById('crawler-results-grid');
        
        grid.innerHTML = Array(4).fill('<div class="crawler-row-card skeleton" style="height: 280px;"></div>').join('');
        
        try {
            const [existingRes, crawlerRes] = await Promise.all([
                fetch('/api/characters?limit=2000'),
                fetch(`/api/crawler/fetch?category=${encodeURIComponent(category)}&page=${activePage}`)
            ]);

            const existingData = await existingRes.json();
            const crawlerData = await crawlerRes.json();

            if (!crawlerData.success) {
                showToast(crawlerData.error || "Failed to fetch crawler data", "error");
                grid.innerHTML = `<div class="result-stat-box text-center py-12"><p class="color-text-muted">Error loading crawler candidates. Please try again.</p></div>`;
                return;
            }

            const existingNames = new Set((existingData.data?.characters || []).map(c => c.name.toLowerCase().trim()));
            const fetched = crawlerData.data?.characters || [];

            crawledCharacters = fetched.map((item, idx) => {
                const isDup = existingNames.has(item.name.toLowerCase().trim());
                const defaultAvatar = item.profileImage || '';
                return {
                    id: `crawl_${activePage}_${idx}`,
                    name: item.name,
                    slug: item.slug,
                    category: category,
                    profileImage: defaultAvatar,
                    allImages: [], // Will be populated with scraped gallery photos only
                    selectedImages: [],
                    isDuplicate: isDup,
                    isFullGalleryLoaded: false
                };
            });

            selectedCharIds.clear();
            crawledCharacters.forEach(c => {
                if (!c.isDuplicate) {
                    selectedCharIds.add(c.id);
                }
            });

            renderCrawlerRows();
            sound.playWin();
            showToast(`Loaded ${crawledCharacters.length} candidates from Page ${activePage}!`, 'success');

            // Preload gallery photos automatically in batches of 4
            preloadCardGalleries();
        } catch (err) {
            console.error("Crawler fetch error", err);
            showToast("Network error while connecting to crawler", "error");
            grid.innerHTML = `<div class="result-stat-box text-center py-12"><p class="color-text-muted">Network error. Please try again.</p></div>`;
        }
    });

    async function preloadCardGalleries() {
        const queue = [...crawledCharacters.filter(c => !c.isFullGalleryLoaded)];
        const batchSize = 4;

        for (let i = 0; i < queue.length; i += batchSize) {
            const batch = queue.slice(i, i + batchSize);
            await Promise.allSettled(batch.map(async (char) => {
                try {
                    const res = await fetch(`/api/crawler/model-photos?slug=${encodeURIComponent(char.slug)}`);
                    const data = await res.json();
                    if (data.success && data.data?.photos?.length > 0) {
                        char.allImages = data.data.photos;
                        if (char.selectedImages.length === 0) {
                            char.selectedImages = data.data.photos.slice(0, Math.min(4, data.data.photos.length));
                        }
                        char.isFullGalleryLoaded = true;
                        updateRowCardState(char);
                    }
                } catch (e) {}
            }));
            updateStatsAndFooter();
        }
    }

    // Render Row-by-Row Layout
    function renderCrawlerRows() {
        const listContainer = document.getElementById('crawler-results-grid');
        const footer = document.getElementById('crawler-sticky-footer');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (crawledCharacters.length === 0) {
            listContainer.innerHTML = `<div class="result-stat-box text-center py-12"><p class="color-text-muted">No characters found for this page.</p></div>`;
            if (footer) footer.classList.add('hidden');
            return;
        }

        if (footer) footer.classList.remove('hidden');

        crawledCharacters.forEach(char => {
            const rowCard = document.createElement('div');
            rowCard.className = `crawler-row-card ${char.isDuplicate ? 'is-duplicate' : ''}`;
            rowCard.id = `card-${char.id}`;

            const avatarSrc = char.profileImage || (char.allImages[0] || '');

            rowCard.innerHTML = `
                <!-- Top Row inside Card: Main Profile Portrait (Left) + Name & Controls (Right) -->
                <div class="row-card-header">
                    <div class="row-main-avatar" title="${char.name} Profile">
                        <img src="${avatarSrc}" alt="${char.name}" loading="lazy" referrerpolicy="no-referrer">
                    </div>

                    <div class="row-info-col">
                        <div class="row-title-bar">
                            <span class="row-name" title="${char.name}">${char.name}</span>
                            <span class="badge" style="background: var(--bg-surface-elevated); font-size: 0.75rem;">Page ${activePage}</span>
                            ${char.isDuplicate ? `<span class="badge" style="background: var(--accent-red); font-size: 0.75rem;">ALREADY IN LIBRARY</span>` : ''}
                        </div>

                        <div class="row-meta-bar">
                            <label class="crawler-select-label">
                                <input type="checkbox" 
                                       class="crawler-checkbox" 
                                       data-id="${char.id}" 
                                       ${char.isDuplicate ? 'disabled' : (selectedCharIds.has(char.id) ? 'checked' : '')}>
                                <span class="font-bold">${char.isDuplicate ? 'Already in Library' : 'Select for Import'}</span>
                            </label>

                            <span class="photos-selected-tag">
                                Selected: <strong class="glow-text" style="color: var(--accent-cyan);" id="count-imgs-${char.id}">${char.selectedImages.length}</strong> / 4 photos
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Bottom Row inside Card: Full Horizontal Scroll Photo Strip -->
                <div class="row-photos-strip-container">
                    <div class="text-xs color-text-muted mb-1 flex justify-between items-center">
                        <span>Gallery Photos (${char.allImages.length} available) — Click photo to select 1..4:</span>
                        <span class="color-text-muted font-bold" style="color: var(--accent-purple);">1280px Ultra-HD (Scroll ➔)</span>
                    </div>
                    <div class="row-photos-strip" id="strip-${char.id}">
                        ${renderThumbnailsHtml(char)}
                    </div>
                </div>
            `;

            // Avatar Lightbox Zoom on Click
            rowCard.querySelector('.row-main-avatar')?.addEventListener('click', () => {
                lightbox.open(char.allImages.length > 0 ? char.allImages : [avatarSrc], {
                    showCaption: true,
                    name: char.name,
                    category: char.category
                });
            });

            // Bind thumbnail events
            bindThumbnailEvents(rowCard, char);

            // Card Checkbox Toggle
            rowCard.querySelector('.crawler-checkbox')?.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (char.selectedImages.length === 0 && char.allImages.length > 0) {
                        char.selectedImages = char.allImages.slice(0, Math.min(4, char.allImages.length));
                        updateRowCardState(char);
                    }
                    selectedCharIds.add(char.id);
                } else {
                    selectedCharIds.delete(char.id);
                }
                updateStatsAndFooter();
            });

            listContainer.appendChild(rowCard);
        });

        updateStatsAndFooter();
    }

    function renderThumbnailsHtml(char) {
        if (char.allImages.length === 0) {
            return `<div class="py-6 px-4 text-xs color-text-muted" style="white-space: nowrap;">⏳ Loading full album photos...</div>`;
        }

        return char.allImages.map((imgUrl, imgIdx) => {
            const isSelected = char.selectedImages.includes(imgUrl);
            const selOrder = char.selectedImages.indexOf(imgUrl) + 1;
            return `
                <div class="img-strip-thumb ${isSelected ? 'selected' : ''}" 
                     data-char-id="${char.id}" 
                     data-img-url="${imgUrl}" 
                     data-img-idx="${imgIdx}"
                     title="Photo #${imgIdx + 1} - Click to select (1..4)">
                    <img src="${imgUrl}" alt="${char.name} #${imgIdx + 1}" loading="lazy" referrerpolicy="no-referrer">
                    <div class="thumb-check">${isSelected ? selOrder : '+'}</div>
                    <button class="thumb-zoom-btn" title="Zoom in full size">🔍</button>
                </div>
            `;
        }).join('');
    }

    function bindThumbnailEvents(rowCard, char) {
        rowCard.querySelectorAll('.img-strip-thumb').forEach(thumb => {
            // Zoom button click
            thumb.querySelector('.thumb-zoom-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const imgIdx = parseInt(thumb.dataset.imgIdx) || 0;
                lightbox.open(char.allImages, {
                    initialIndex: imgIdx,
                    showCaption: true,
                    name: char.name,
                    category: char.category
                });
            });

            // Main thumbnail click (toggle selection)
            thumb.addEventListener('click', (e) => {
                e.stopPropagation();
                const imgUrl = thumb.dataset.imgUrl;
                const isCurrentlySelected = char.selectedImages.includes(imgUrl);

                if (isCurrentlySelected) {
                    if (char.selectedImages.length <= 1 && selectedCharIds.has(char.id)) {
                        showToast("Each character needs at least 1 image selected.", "warning");
                        return;
                    }
                    char.selectedImages = char.selectedImages.filter(u => u !== imgUrl);
                } else {
                    if (char.selectedImages.length >= 4) {
                        showToast("Maximum 4 images allowed per character.", "warning");
                        return;
                    }
                    char.selectedImages.push(imgUrl);
                }

                sound.playClick();
                updateRowCardState(char);
                updateStatsAndFooter();
            });
        });
    }

    function updateRowCardState(char) {
        const rowCard = document.getElementById(`card-${char.id}`);
        if (!rowCard) return;

        const countEl = rowCard.querySelector(`#count-imgs-${char.id}`);
        if (countEl) countEl.innerText = char.selectedImages.length;

        const stripContainer = rowCard.querySelector(`#strip-${char.id}`);
        if (stripContainer) {
            stripContainer.innerHTML = renderThumbnailsHtml(char);
            bindThumbnailEvents(rowCard, char);
        }

        const cb = rowCard.querySelector('.crawler-checkbox');
        if (char.selectedImages.length === 0) {
            selectedCharIds.delete(char.id);
            if (cb) cb.checked = false;
        }
    }

    function updateStatsAndFooter() {
        const total = crawledCharacters.length;
        const exists = crawledCharacters.filter(c => c.isDuplicate).length;
        const newCount = total - exists;
        const selectedCount = selectedCharIds.size;

        let totalSelectedImages = 0;
        crawledCharacters.forEach(c => {
            if (selectedCharIds.has(c.id)) {
                totalSelectedImages += c.selectedImages.length;
            }
        });

        // Update Stats Badges
        const statTotal = document.getElementById('crawler-stat-total');
        const statNew = document.getElementById('crawler-stat-new');
        const statExists = document.getElementById('crawler-stat-exists');
        const statSelected = document.getElementById('crawler-stat-selected');

        if (statTotal) statTotal.innerText = total;
        if (statNew) statNew.innerText = newCount;
        if (statExists) statExists.innerText = exists;
        if (statSelected) statSelected.innerText = selectedCount;

        // Update Sticky Footer
        const footerCount = document.getElementById('crawler-selected-count');
        const footerImgsCount = document.getElementById('crawler-selected-imgs-count');
        if (footerCount) footerCount.innerText = selectedCount;
        if (footerImgsCount) footerImgsCount.innerText = `${totalSelectedImages} Ultra-HD images ready for import`;
    }

    // Batch Import Handler
    document.getElementById('btn-batch-import')?.addEventListener('click', async () => {
        if (selectedCharIds.size === 0) {
            showToast("No characters selected for import.", 'warning');
            return;
        }

        const itemsToImport = crawledCharacters.filter(c => selectedCharIds.has(c.id) && !c.isDuplicate && c.selectedImages.length > 0);
        if (itemsToImport.length === 0) {
            showToast("Selected characters have no valid images.", 'error');
            return;
        }

        sound.playClick();
        const btn = document.getElementById('btn-batch-import');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `⏳ Importing (${itemsToImport.length})...`;
        }

        let importedCount = 0;
        let failedCount = 0;

        for (let item of itemsToImport) {
            try {
                const res = await fetch('/api/characters', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': getCsrfToken()
                    },
                    body: JSON.stringify({
                        name: item.name,
                        category: item.category,
                        label: 'Smart Import',
                        images: item.selectedImages.map(u => u.replace(/\/(?:460|300|560)\//g, '/1280/'))
                    })
                });
                if (res.ok) {
                    importedCount++;
                } else {
                    failedCount++;
                }
            } catch (e) {
                console.error("Import error for " + item.name, e);
                failedCount++;
            }
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `📥 Import Selected to Library`;
        }

        if (importedCount > 0) {
            sound.playWin();
            const msg = isAdminOrMod
                ? `🎉 Successfully imported ${importedCount} characters to the library!`
                : `🎉 Submitted ${importedCount} characters for review! Thank you for contributing to GoooG.`;
            showToast(msg, 'success');
            window.location.hash = 'gallery';
        } else {
            showToast("Failed to import characters. Check server permissions.", 'error');
        }
    });

    // Moderation Queue & Reports Helper Functions
    async function loadModCounts() {
        try {
            const [qRes, rRes] = await Promise.all([
                fetch('/api/moderation/queue'),
                fetch('/api/moderation/reports')
            ]);
            const qData = await qRes.json();
            const rData = await rRes.json();

            const queueCount = (qData.data?.queue || []).length;
            const reportsCount = (rData.data?.reports || []).length;

            const qCountEl = document.getElementById('mod-queue-count');
            const rCountEl = document.getElementById('mod-reports-count');
            if (qCountEl) qCountEl.innerText = queueCount;
            if (rCountEl) rCountEl.innerText = reportsCount;
        } catch (e) {}
    }

    async function loadModerationQueue() {
        const grid = document.getElementById('mod-queue-grid');
        if (!grid) return;

        grid.innerHTML = '<div class="result-stat-box text-center py-12" style="grid-column: 1 / -1;"><span class="color-text-muted">Loading queue...</span></div>';

        try {
            const res = await fetch('/api/moderation/queue');
            const data = await res.json();

            if (data.success) {
                const items = data.data.queue || [];
                const qCountEl = document.getElementById('mod-queue-count');
                if (qCountEl) qCountEl.innerText = items.length;

                if (items.length === 0) {
                    grid.innerHTML = '<div class="result-stat-box text-center py-12" style="grid-column: 1 / -1;"><p class="color-text-muted">🎉 Moderation queue is empty! All submissions reviewed.</p></div>';
                    return;
                }

                grid.innerHTML = '';
                items.forEach(char => {
                    const primaryImg = (char.images && char.images[0]) || '';
                    const card = document.createElement('div');
                    card.className = 'char-card';
                    card.innerHTML = `
                        <div class="char-img-container cursor-pointer">
                            <img src="${primaryImg}" alt="${char.name}" loading="lazy" referrerpolicy="no-referrer">
                            <span class="badge badge-${char.category}" style="position: absolute; top: 10px; left: 10px; z-index: 2;">${char.category.toUpperCase()}</span>
                            <span class="badge" style="position: absolute; top: 10px; right: 10px; background: rgba(245, 158, 11, 0.3); color: #fbbf24; z-index: 2;">PENDING</span>
                        </div>
                        <div class="char-info">
                            <div class="char-name">${char.name}</div>
                            <div class="char-meta">
                                <span class="added-by-tag">By: @${char.submitted_by || 'unknown'}</span>
                                ${char.label ? `<span class="badge" style="background: var(--bg-surface-elevated);">${char.label}</span>` : ''}
                            </div>
                            <div class="char-actions mt-3">
                                <button class="btn-card-action btn-approve" data-id="${char.id}" style="color: #34d399; border-color: rgba(52, 211, 153, 0.4);">✓ Approve</button>
                                <button class="btn-card-action danger btn-reject" data-id="${char.id}">✕ Reject</button>
                            </div>
                        </div>
                    `;

                    card.querySelector('.char-img-container')?.addEventListener('click', () => {
                        lightbox.open(char.images || [primaryImg], {
                            showCaption: true,
                            name: char.name,
                            category: char.category,
                            label: char.label
                        });
                    });

                    card.querySelector('.btn-approve')?.addEventListener('click', async () => {
                        await moderateCharacter(char.id, 'approve');
                    });

                    card.querySelector('.btn-reject')?.addEventListener('click', async () => {
                        await moderateCharacter(char.id, 'reject');
                    });

                    grid.appendChild(card);
                });
            }
        } catch (e) {
            console.error(e);
            grid.innerHTML = '<div class="result-stat-box text-center py-12" style="grid-column: 1 / -1;"><p class="color-text-muted">Failed to load moderation queue.</p></div>';
        }
    }

    async function moderateCharacter(characterId, action) {
        try {
            const res = await fetch('/api/moderation/queue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCsrfToken()
                },
                body: JSON.stringify({ characterId, action })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast(`Character ${action}d successfully`, 'success');
                loadModerationQueue();
            } else {
                showToast(data.error || 'Action failed', 'error');
            }
        } catch (e) {
            showToast('Error processing moderation action', 'error');
        }
    }

    async function loadReports() {
        const containerEl = document.getElementById('mod-reports-container');
        if (!containerEl) return;

        try {
            const res = await fetch('/api/moderation/reports');
            const data = await res.json();
            if (data.success) {
                const reports = data.data.reports || [];
                const rCountEl = document.getElementById('mod-reports-count');
                if (rCountEl) rCountEl.innerText = reports.length;

                if (reports.length === 0) {
                    containerEl.innerHTML = '<div class="result-stat-box text-center py-12"><p class="color-text-muted">🎉 No active reports! Community is clean.</p></div>';
                    return;
                }

                containerEl.innerHTML = '';
                reports.forEach(r => {
                    const box = document.createElement('div');
                    box.className = 'result-stat-box flex justify-between items-center flex-wrap gap-3';
                    box.style.textAlign = 'left';
                    box.innerHTML = `
                        <div>
                            <div class="font-bold flex items-center gap-2">
                                <span class="badge" style="background: rgba(225, 29, 72, 0.2); color: #fb7185;">${r.reason.toUpperCase()}</span>
                                <span>Target: ${r.character_name || 'Deleted'}</span>
                            </div>
                            <div class="text-xs color-text-muted mt-1">
                                Reported by: @${r.reporter} | Note: "${r.note || 'No note'}"
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button class="btn-card-action danger btn-dismiss-report" data-id="${r.id}">Dismiss</button>
                            <button class="btn-card-action btn-resolve-report" data-id="${r.id}" style="color: #38bdf8;">Resolve</button>
                        </div>
                    `;

                    box.querySelector('.btn-dismiss-report')?.addEventListener('click', async () => {
                        await handleReport(r.id, 'dismissed');
                    });
                    box.querySelector('.btn-resolve-report')?.addEventListener('click', async () => {
                        await handleReport(r.id, 'resolved');
                    });

                    containerEl.appendChild(box);
                });
            }
        } catch (e) {}
    }

    async function handleReport(reportId, status) {
        try {
            const res = await fetch('/api/moderation/reports', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCsrfToken()
                },
                body: JSON.stringify({ reportId, status })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast(`Report marked as ${status}`, 'success');
                loadReports();
            }
        } catch (e) {}
    }
}
