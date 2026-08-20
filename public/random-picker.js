import { sound } from './sound.js';
import { lightbox } from './lightbox.js';
import { showToast } from './toast.js';
import { initGame } from './game.js';

let currentRandomCharacter = null;
let isLoading = false;

export async function openRandomPicker() {
    let modal = document.getElementById('modal-random-picker');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-random-picker';
        modal.className = 'modal hidden';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content random-picker-modal-content">
            <div class="modal-header" style="margin-bottom: 0.5rem; justify-content: flex-end; padding: 0;">
                <button class="close-modal" id="btn-close-roulette" aria-label="Close" style="margin-left: auto;">×</button>
            </div>

            <!-- Character Card Stage -->
            <div class="random-picker-stage" id="random-picker-stage">
                <div class="random-card-wrapper" id="random-card-wrapper">
                    <!-- Loading state indicator -->
                    <div class="random-loader-wrap" id="random-loader" style="display: none;">
                        <div class="spinner"></div>
                        <div class="text-sm color-text-muted mt-2">Picking random star...</div>
                    </div>

                    <!-- Full Uncropped Image Display -->
                    <div class="random-img-box" id="random-img-box">
                        <img id="random-char-img" src="" alt="Random Celebrity" style="display: none;">
                        <button class="zoom-trigger-btn" id="btn-zoom-random" aria-label="Zoom image" title="Zoom full resolution">🔍</button>
                    </div>

                    <!-- Character Name & Details Below Image -->
                    <div class="random-info-bar mt-3" id="random-info-bar" style="display: none;">
                        <h2 class="random-winner-name glow-text" id="random-char-name">Celebrity Name</h2>
                        <div class="flex items-center justify-center gap-2 mt-1">
                            <span class="badge" id="random-char-cat">CATEGORY</span>
                            <span class="text-xs color-text-muted" id="random-char-photos-count">0 Photos</span>
                        </div>
                    </div>
                </div>

                <!-- Action Controls Row -->
                <div class="random-actions-row mt-4 flex gap-2 flex-wrap justify-center w-full">
                    <button id="btn-spin-again" class="btn-primary flex-1" style="min-width: 140px;">
                        🎲 Pick Another
                    </button>
                    <button id="btn-view-random-gallery" class="btn-secondary">
                        🖼️ Gallery
                    </button>
                    <button id="btn-play-random-char" class="btn-secondary">
                        🎮 Play
                    </button>
                </div>
            </div>
        </div>
    `;

    // Modal Close handlers
    document.getElementById('btn-close-roulette')?.addEventListener('click', () => {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        }
    });

    // "Pick Another" Button
    document.getElementById('btn-spin-again')?.addEventListener('click', () => {
        sound.playClick();
        fetchAndDisplayRandomCharacter();
    });

    // Zoom Image click
    document.getElementById('btn-zoom-random')?.addEventListener('click', () => {
        if (currentRandomCharacter && currentRandomCharacter.images?.length > 0) {
            sound.playClick();
            lightbox.open(currentRandomCharacter.images, {
                name: currentRandomCharacter.name,
                category: currentRandomCharacter.category,
                showCaption: true
            });
        }
    });

    document.getElementById('random-char-img')?.addEventListener('click', () => {
        if (currentRandomCharacter && currentRandomCharacter.images?.length > 0) {
            sound.playClick();
            lightbox.open(currentRandomCharacter.images, {
                name: currentRandomCharacter.name,
                category: currentRandomCharacter.category,
                showCaption: true
            });
        }
    });

    // Gallery button
    document.getElementById('btn-view-random-gallery')?.addEventListener('click', () => {
        if (currentRandomCharacter && currentRandomCharacter.images?.length > 0) {
            sound.playClick();
            lightbox.open(currentRandomCharacter.images, {
                name: currentRandomCharacter.name,
                category: currentRandomCharacter.category,
                showCaption: true
            });
        }
    });

    // Play button
    document.getElementById('btn-play-random-char')?.addEventListener('click', () => {
        if (currentRandomCharacter) {
            sound.playClick();
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            initGame(currentRandomCharacter.category, 'classic', 15);
        }
    });

    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    // Fetch initial random character
    await fetchAndDisplayRandomCharacter();
}

async function fetchAndDisplayRandomCharacter() {
    if (isLoading) return;
    isLoading = true;

    const loaderEl = document.getElementById('random-loader');
    const imgEl = document.getElementById('random-char-img');
    const infoEl = document.getElementById('random-info-bar');
    const nameEl = document.getElementById('random-char-name');
    const catEl = document.getElementById('random-char-cat');
    const countEl = document.getElementById('random-char-photos-count');
    const spinBtn = document.getElementById('btn-spin-again');

    if (spinBtn) spinBtn.disabled = true;
    if (loaderEl) loaderEl.style.display = 'flex';
    if (imgEl) imgEl.style.opacity = '0.3';

    try {
        const res = await fetch(`/api/characters?random=true&_t=${Date.now()}`);
        const data = await res.json();

        if (!data.success || !data.data?.character) {
            showToast(data.error || "Failed to pick random character", "error");
            if (loaderEl) loaderEl.style.display = 'none';
            if (spinBtn) spinBtn.disabled = false;
            isLoading = false;
            return;
        }

        const char = data.data.character;
        currentRandomCharacter = char;

        const primaryImg = (char.images && char.images.length > 0) ? char.images[0] : '';
        const hdImg = primaryImg ? primaryImg.replace(/\/(?:460|300|560)\//g, '/1280/') : '';

        if (imgEl && hdImg) {
            const preloader = new Image();
            preloader.onload = () => {
                imgEl.src = hdImg;
                imgEl.style.display = 'block';
                imgEl.style.opacity = '1';
                if (loaderEl) loaderEl.style.display = 'none';
                if (infoEl) infoEl.style.display = 'block';
                if (nameEl) nameEl.innerText = char.name;
                if (catEl) {
                    catEl.innerText = char.category.toUpperCase();
                    catEl.className = `badge badge-${char.category}`;
                }
                if (countEl) {
                    countEl.innerText = `${char.images?.length || 1} Ultra-HD Photos`;
                }
                sound.playCorrect();
                if (spinBtn) spinBtn.disabled = false;
                isLoading = false;
            };
            preloader.onerror = () => {
                imgEl.src = hdImg;
                imgEl.style.display = 'block';
                imgEl.style.opacity = '1';
                if (loaderEl) loaderEl.style.display = 'none';
                if (infoEl) infoEl.style.display = 'block';
                if (nameEl) nameEl.innerText = char.name;
                if (catEl) {
                    catEl.innerText = char.category.toUpperCase();
                    catEl.className = `badge badge-${char.category}`;
                }
                if (countEl) {
                    countEl.innerText = `${char.images?.length || 1} Ultra-HD Photos`;
                }
                if (spinBtn) spinBtn.disabled = false;
                isLoading = false;
            };
            preloader.src = hdImg;
        } else {
            if (loaderEl) loaderEl.style.display = 'none';
            if (infoEl) infoEl.style.display = 'block';
            if (nameEl) nameEl.innerText = char.name;
            if (spinBtn) spinBtn.disabled = false;
            isLoading = false;
        }

    } catch (e) {
        console.error("Random character pick error", e);
        showToast("Error picking random character", "error");
        if (loaderEl) loaderEl.style.display = 'none';
        if (spinBtn) spinBtn.disabled = false;
        isLoading = false;
    }
}
