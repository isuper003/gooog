import { lightbox } from './lightbox.js';
import { sound } from './sound.js';
import { initGame } from './game.js';
import { showToast } from './toast.js';
import { getCsrfToken } from './csrf.js';

export async function initGallery(currentUser) {
    const container = document.getElementById('page-gallery');
    if (!container) return;

    container.innerHTML = `
        <!-- Weak Spotlight Section -->
        <div id="weak-spotlight-container"></div>

        <div class="gallery-header">
            <div class="flex justify-between items-center flex-wrap gap-3">
                <h1 class="glow-text text-2xl">🖼️ Celebrity Gallery</h1>
                <div class="flex gap-2">
                    <button id="btn-open-add-char" class="btn-primary">
                        + Add Character
                    </button>
                    <button id="btn-export-json" class="btn-secondary" title="Export JSON">
                        📥 JSON
                    </button>
                    <button id="btn-export-csv" class="btn-secondary" title="Export CSV">
                        📥 CSV
                    </button>
                </div>
            </div>
            <div class="gallery-controls">
                <div class="gallery-search-row">
                    <input type="text" id="gallery-search" placeholder="🔍 Search celebrity name or label..." class="gallery-search-input">
                    
                    <select id="gallery-category-filter" class="gallery-category-select">
                        <option value="">All Categories</option>
                        <option value="trans">⚧️ Trans</option>
                        <option value="sluts">♀️ Sluts</option>
                        <option value="twinks">♂️ Twinks</option>
                    </select>

                    <div class="flex gap-2">
                        <button id="btn-view-grid" class="btn-icon" title="Grid View">⊞</button>
                        <button id="btn-view-list" class="btn-icon" title="List View">☰</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Characters Grid -->
        <div id="gallery-grid" class="gallery-grid">
            <div class="char-card skeleton" style="height: 280px;"></div>
            <div class="char-card skeleton" style="height: 280px;"></div>
            <div class="char-card skeleton" style="height: 280px;"></div>
            <div class="char-card skeleton" style="height: 280px;"></div>
        </div>

        <div id="gallery-loading" class="text-center mt-6 py-4 hidden">
            <span class="glow-text">Loading more characters...</span>
        </div>

        <!-- Add / Edit Character Modal -->
        <div id="modal-char-form" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modal-char-title" class="glow-text text-xl">Add New Character</h2>
                    <button class="close-modal" id="btn-close-char-modal">×</button>
                </div>
                <form id="form-char-crud">
                    <input type="hidden" id="char-form-id">
                    
                    <div>
                        <label class="text-xs color-text-muted">Character Name *</label>
                        <input type="text" id="char-form-name" required placeholder="e.g. Riley Reid">
                    </div>

                    <div>
                        <label class="text-xs color-text-muted">Category *</label>
                        <select id="char-form-category" required>
                            <option value="sluts">Sluts</option>
                            <option value="trans">Trans</option>
                            <option value="twinks">Twinks</option>
                        </select>
                    </div>

                    <div>
                        <label class="text-xs color-text-muted">Custom Label / Tags (Optional)</label>
                        <input type="text" id="char-form-label" placeholder="e.g. Brunette, Petite">
                    </div>

                    <div>
                        <label class="text-xs color-text-muted">Image URLs (1 to 4 URLs) *</label>
                        <div class="flex flex-col gap-2 mt-1">
                            <input type="url" id="char-form-img-1" placeholder="Primary Image URL (Required)" required>
                            <input type="url" id="char-form-img-2" placeholder="Image URL 2 (Optional)">
                            <input type="url" id="char-form-img-3" placeholder="Image URL 3 (Optional)">
                            <input type="url" id="char-form-img-4" placeholder="Image URL 4 (Optional)">
                        </div>
                    </div>

                    <button type="submit" class="btn-primary w-full mt-4">Save Character</button>
                </form>
            </div>
        </div>

        <!-- Report Issue Modal -->
        <div id="modal-report" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="glow-text text-xl">🚩 Report Character</h2>
                    <button class="close-modal" id="btn-close-report-modal">×</button>
                </div>
                <form id="form-report-char">
                    <input type="hidden" id="report-char-id">
                    
                    <p class="text-sm color-text-muted mb-3">Report issue for: <strong id="report-char-name" class="color-text"></strong></p>

                    <div>
                        <label class="text-xs color-text-muted">Reason *</label>
                        <select id="report-reason" required>
                            <option value="broken_image">Broken / Blank Image</option>
                            <option value="wrong_name">Incorrect Celebrity Name</option>
                            <option value="wrong_category">Wrong Category</option>
                            <option value="duplicate">Duplicate Entry</option>
                            <option value="other">Other Violation</option>
                        </select>
                    </div>

                    <div class="mt-3">
                        <label class="text-xs color-text-muted">Details / Notes (Optional)</label>
                        <textarea id="report-note" rows="3" placeholder="Explain the issue..." style="width: 100%; border-radius: var(--radius-md); padding: 0.5rem; background: var(--bg-surface-elevated); color: var(--color-text); border: 1px solid var(--color-border);"></textarea>
                    </div>

                    <button type="submit" class="btn-primary w-full mt-4" style="background: linear-gradient(135deg, #f43f5e, #e11d48);">Submit Report</button>
                </form>
            </div>
        </div>
    `;

    let page = 1;
    let loading = false;
    let hasMore = true;
    let allLoadedCharacters = [];

    // Fetch and render weak spotlight
    async function loadWeakSpotlight() {
        try {
            const res = await fetch('/api/me/progress');
            const data = await res.json();
            if (data.success && data.data.weakCharacters && data.data.weakCharacters.length > 0) {
                renderWeakSpotlight(data.data.weakCharacters);
            }
        } catch (e) {}
    }

    function renderWeakSpotlight(weakList) {
        const spotContainer = document.getElementById('weak-spotlight-container');
        if (!spotContainer) return;

        spotContainer.innerHTML = `
            <div class="weak-spotlight-banner mb-6">
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-2">
                        <span class="pulsing-red-dot"></span>
                        <h2 class="glow-text text-lg font-bold">🧠 Memory Priority: Weak Items</h2>
                    </div>
                    <button id="btn-train-weak-spotlight" class="btn-primary" style="padding: 0.4rem 1rem; font-size: 0.8rem;">
                        ⚡ Train Weak Now
                    </button>
                </div>
                <div class="weak-spotlight-scroll">
                    ${weakList.map(c => `
                        <div class="weak-spotlight-card cursor-pointer" data-id="${c.character_id}">
                            <img src="${c.image_url || ''}" alt="${c.name}">
                            <div class="weak-spotlight-info">
                                <div class="font-bold text-xs truncate">${c.name}</div>
                                <div class="text-xs" style="color: #fb7185;">${c.times_wrong} Errors (${c.success_rate}%)</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.getElementById('btn-train-weak-spotlight')?.addEventListener('click', () => {
            sound.playClick();
            initGame('mix', 'review', 10);
        });
    }

    // Load Characters from API
    async function loadCharacters(reset = false) {
        if (loading) return;
        if (reset) {
            page = 1;
            hasMore = true;
            allLoadedCharacters = [];
            document.getElementById('gallery-grid').innerHTML = '';
        }
        if (!hasMore) return;

        loading = true;
        document.getElementById('gallery-loading')?.classList.remove('hidden');

        const category = document.getElementById('gallery-category-filter')?.value || '';
        const search = document.getElementById('gallery-search')?.value.toLowerCase() || '';

        const url = `/api/characters?page=${page}&limit=24${category ? `&category=${category}` : ''}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                const chars = data.data.characters || [];
                if (chars.length < 24) hasMore = false;

                allLoadedCharacters = [...allLoadedCharacters, ...chars];
                renderCharacters(allLoadedCharacters, search);
                page++;
            }
        } catch (e) {
            console.error("Gallery load error", e);
            showToast('Failed to load gallery characters', 'error');
        } finally {
            loading = false;
            document.getElementById('gallery-loading')?.classList.add('hidden');
        }
    }

    function renderCharacters(characters, searchFilter = '') {
        const grid = document.getElementById('gallery-grid');
        if (!grid) return;

        const filtered = searchFilter 
            ? characters.filter(c => c.name.toLowerCase().includes(searchFilter) || (c.label && c.label.toLowerCase().includes(searchFilter)))
            : characters;

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="text-center py-12 w-full" style="grid-column: 1 / -1;">
                    <p class="color-text-muted">No characters found matching your filters.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        filtered.forEach(char => {
            const primaryImg = (char.images && char.images[0]) || '';
            const card = document.createElement('div');
            card.className = 'char-card';
            
            const isOwner = currentUser && (char.submitted_by_user_id === currentUser.id || char.added_by === currentUser.username || currentUser.role === 'admin' || currentUser.role === 'moderator');

            card.innerHTML = `
                <div class="char-img-container cursor-pointer">
                    <img src="${primaryImg}" alt="${char.name}" loading="lazy">
                    ${char.images && char.images.length > 1 ? `<span class="badge badge-mix" style="position: absolute; bottom: 10px; right: 10px; z-index: 2;">📷 ${char.images.length}</span>` : ''}
                </div>
                <div class="char-info">
                    <div class="flex items-center justify-between gap-2 mb-1">
                        <div class="char-name" title="${char.name}">${char.name}</div>
                        <span class="badge badge-${char.category}">${char.category.toUpperCase()}</span>
                    </div>
                    <div class="char-meta">
                        <span class="added-by-tag">@${char.added_by || 'system'}</span>
                        ${char.label ? `<span class="badge" style="background: var(--bg-surface-elevated);">${char.label}</span>` : ''}
                    </div>
                    <div class="char-actions">
                        ${isOwner ? `<button class="btn-card-action btn-edit-char" data-id="${char.id}" title="Edit Character">✏️ Edit</button>` : ''}
                        ${isOwner ? `<button class="btn-card-action danger btn-del-char" data-id="${char.id}" title="Delete Character">🗑️ Delete</button>` : ''}
                        <button class="btn-card-action report btn-report-char" data-id="${char.id}" data-name="${char.name}" title="Report Issue">🚩 Report</button>
                    </div>
                </div>
            `;

            // Click image to open Multi-Image Lightbox
            card.querySelector('.char-img-container')?.addEventListener('click', () => {
                sound.playClick();
                lightbox.open(char.images && char.images.length > 0 ? char.images : [primaryImg], {
                    showCaption: true,
                    name: char.name,
                    category: char.category,
                    label: char.label
                });
            });

            // Edit button handler
            card.querySelector('.btn-edit-char')?.addEventListener('click', (e) => {
                e.stopPropagation();
                sound.playClick();
                openEditModal(char);
            });

            // Delete button handler
            card.querySelector('.btn-del-char')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                sound.playClick();
                if (confirm(`Are you sure you want to delete "${char.name}"?`)) {
                    await deleteCharacter(char.id);
                }
            });

            // Report button handler
            card.querySelector('.btn-report-char')?.addEventListener('click', (e) => {
                e.stopPropagation();
                sound.playClick();
                openReportModal(char);
            });

            grid.appendChild(card);
        });
    }

    function openEditModal(char) {
        document.getElementById('modal-char-title').innerText = 'Edit Character';
        document.getElementById('char-form-id').value = char.id;
        document.getElementById('char-form-name').value = char.name;
        document.getElementById('char-form-category').value = char.category;
        document.getElementById('char-form-label').value = char.label || '';

        const images = char.images || [];
        document.getElementById('char-form-img-1').value = images[0] || '';
        document.getElementById('char-form-img-2').value = images[1] || '';
        document.getElementById('char-form-img-3').value = images[2] || '';
        document.getElementById('char-form-img-4').value = images[3] || '';

        document.getElementById('modal-char-form')?.classList.remove('hidden');
    }

    async function deleteCharacter(charId) {
        try {
            const res = await fetch(`/api/characters/${charId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-Token': getCsrfToken()
                }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Character deleted successfully', 'success');
                loadCharacters(true);
            } else {
                showToast(data.error || 'Failed to delete character', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error deleting character', 'error');
        }
    }

    function openReportModal(char) {
        document.getElementById('report-char-id').value = char.id;
        document.getElementById('report-char-name').innerText = char.name;
        document.getElementById('report-note').value = '';
        document.getElementById('modal-report')?.classList.remove('hidden');
    }

    // Event Listeners
    document.getElementById('gallery-category-filter')?.addEventListener('change', () => {
        sound.playClick();
        loadCharacters(true);
    });

    document.getElementById('gallery-search')?.addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        renderCharacters(allLoadedCharacters, search);
    });

    // View toggles
    document.getElementById('btn-view-grid')?.addEventListener('click', () => {
        sound.playClick();
        const grid = document.getElementById('gallery-grid');
        if (grid) grid.className = 'gallery-grid';
    });
    document.getElementById('btn-view-list')?.addEventListener('click', () => {
        sound.playClick();
        const grid = document.getElementById('gallery-grid');
        if (grid) grid.className = 'gallery-grid flex flex-col gap-3';
    });

    // Add Character Modal
    const charModal = document.getElementById('modal-char-form');
    document.getElementById('btn-open-add-char')?.addEventListener('click', () => {
        sound.playClick();
        document.getElementById('modal-char-title').innerText = 'Add New Character';
        document.getElementById('form-char-crud').reset();
        document.getElementById('char-form-id').value = '';
        charModal.classList.remove('hidden');
    });

    document.getElementById('btn-close-char-modal')?.addEventListener('click', () => {
        charModal.classList.add('hidden');
    });

    // Report Modal Close
    document.getElementById('btn-close-report-modal')?.addEventListener('click', () => {
        document.getElementById('modal-report')?.classList.add('hidden');
    });

    // Submit Report Form
    document.getElementById('form-report-char')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const characterId = document.getElementById('report-char-id').value;
        const reason = document.getElementById('report-reason').value;
        const note = document.getElementById('report-note').value;

        try {
            const res = await fetch('/api/moderation/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCsrfToken()
                },
                body: JSON.stringify({ characterId, reason, note })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Report submitted. Thank you for your feedback!', 'success');
                document.getElementById('modal-report')?.classList.add('hidden');
            } else {
                showToast(data.error || 'Failed to submit report', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error submitting report', 'error');
        }
    });

    // Save Character Submission
    document.getElementById('form-char-crud')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const charId = document.getElementById('char-form-id').value;
        const name = document.getElementById('char-form-name').value;
        const category = document.getElementById('char-form-category').value;
        const label = document.getElementById('char-form-label').value;
        
        const images = [
            document.getElementById('char-form-img-1').value,
            document.getElementById('char-form-img-2').value,
            document.getElementById('char-form-img-3').value,
            document.getElementById('char-form-img-4').value
        ].filter(url => url && url.trim().length > 0);

        try {
            const url = charId ? `/api/characters/${charId}` : '/api/characters';
            const method = charId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCsrfToken()
                },
                body: JSON.stringify({ name, category, label, images })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                sound.playCorrect();
                showToast(charId ? "Character updated!" : (data.data.status === 'approved' ? "Character added successfully!" : "Character submitted for moderator review!"), 'success');
                charModal.classList.add('hidden');
                loadCharacters(true);
            } else {
                showToast(data.error || "Failed to save character", 'error');
            }
        } catch (err) {
            console.error(err);
            showToast("An error occurred saving character", 'error');
        }
    });

    // Export JSON
    document.getElementById('btn-export-json')?.addEventListener('click', () => {
        sound.playClick();
        const blob = new Blob([JSON.stringify(allLoadedCharacters, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `gooog_characters_${Date.now()}.json`;
        a.click();
        showToast('Exported library as JSON', 'info');
    });

    // Export CSV
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
        sound.playClick();
        let csv = 'Name,Category,Label,AddedBy,Images\n';
        allLoadedCharacters.forEach(c => {
            const cleanName = (c.name || '').replace(/"/g, '""');
            const cleanCat = (c.category || '').replace(/"/g, '""');
            const cleanLabel = (c.label || '').replace(/"/g, '""');
            const cleanAddedBy = (c.added_by || '').replace(/"/g, '""');
            csv += `"${cleanName}","${cleanCat}","${cleanLabel}","${cleanAddedBy}","${(c.images || []).join(';')}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `gooog_characters_${Date.now()}.csv`;
        a.click();
        showToast('Exported library as CSV', 'info');
    });

    // Infinite scroll
    window.addEventListener('scroll', () => {
        if (document.getElementById('page-gallery')?.classList.contains('hidden')) return;
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
            loadCharacters();
        }
    });

    loadWeakSpotlight();
    loadCharacters(true);
}
