import { sound } from './sound.js';
import { lightbox } from './lightbox.js';
import { showToast } from './toast.js';
import { initGame } from './game.js';

let cachedCharacters = null;
let isSpinning = false;

export async function openRandomPicker() {
    let modal = document.getElementById('modal-random-picker');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-random-picker';
        modal.className = 'modal hidden';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content roulette-modal-content">
            <div class="modal-header">
                <div class="flex items-center gap-2">
                    <span class="auth-badge" style="margin: 0; font-size: 0.75rem;">🎲 STAR ROULETTE</span>
                </div>
                <button class="close-modal" id="btn-close-roulette" aria-label="Close">×</button>
            </div>

            <!-- Main Stage Card -->
            <div class="roulette-stage">
                <div class="roulette-card-box" id="roulette-card-box">
                    <div class="roulette-img-container" id="roulette-img-container">
                        <img id="roulette-img" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='380' fill='%23111'%3E%3C/svg%3E" alt="Roulette Character">
                        <div class="roulette-scanline"></div>
                        <div class="roulette-blur-overlay" id="roulette-blur-overlay"></div>
                    </div>

                    <div class="roulette-details-overlay" id="roulette-details-overlay">
                        <div class="roulette-status-text glow-text" id="roulette-status">
                            🎰 Shuffling celebrities...
                        </div>
                        <div class="roulette-revealed-info hidden" id="roulette-revealed-info">
                            <h2 class="roulette-char-name glow-text" id="roulette-char-name">Celebrity Name</h2>
                            <div class="flex items-center justify-center gap-2 mt-1">
                                <span class="badge badge-sluts" id="roulette-char-cat">SLUTS</span>
                                <span class="text-xs color-text-muted" id="roulette-char-photos-count">0 Photos</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Action Controls -->
                <div class="roulette-actions-row mt-4 flex gap-3 flex-wrap justify-center">
                    <button id="btn-spin-again" class="btn-primary flex-1" style="min-width: 140px;">
                        🎲 Spin Again
                    </button>
                    <button id="btn-view-roulette-gallery" class="btn-secondary" style="display: none;">
                        🖼️ Full Gallery
                    </button>
                    <button id="btn-play-roulette-char" class="btn-secondary" style="display: none;">
                        🎮 Play Mode
                    </button>
                </div>
            </div>
        </div>
    `;

    // Event listeners
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

    document.getElementById('btn-spin-again')?.addEventListener('click', () => {
        if (!isSpinning) runRouletteAnimation();
    });

    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    // Fetch characters and start spin
    await runRouletteAnimation();
}

async function runRouletteAnimation() {
    if (isSpinning) return;
    isSpinning = true;

    const imgEl = document.getElementById('roulette-img');
    const containerEl = document.getElementById('roulette-img-container');
    const statusEl = document.getElementById('roulette-status');
    const infoEl = document.getElementById('roulette-revealed-info');
    const nameEl = document.getElementById('roulette-char-name');
    const catEl = document.getElementById('roulette-char-cat');
    const countEl = document.getElementById('roulette-char-photos-count');
    const spinBtn = document.getElementById('btn-spin-again');
    const galleryBtn = document.getElementById('btn-view-roulette-gallery');
    const playBtn = document.getElementById('btn-play-roulette-char');

    if (spinBtn) spinBtn.disabled = true;
    if (galleryBtn) galleryBtn.style.display = 'none';
    if (playBtn) playBtn.style.display = 'none';

    // Reset visual state
    if (statusEl) {
        statusEl.classList.remove('hidden');
        statusEl.innerText = "🎰 Shuffling Celebrities...";
    }
    if (infoEl) infoEl.classList.add('hidden');
    if (containerEl) {
        containerEl.classList.add('roulette-spinning');
        containerEl.classList.remove('roulette-revealed');
    }

    try {
        if (!cachedCharacters || cachedCharacters.length === 0) {
            try {
                const res = await fetch(`/api/characters?limit=300&status=approved&_t=${Date.now()}`, {
                    cache: 'no-store'
                });
                const data = await res.json();
                if (data.success && data.data?.characters) {
                    cachedCharacters = data.data.characters.filter(c => c.images && c.images.length > 0);
                }
            } catch (fetchErr) {
                console.warn("Primary fetch error, trying fallback", fetchErr);
                const res2 = await fetch('/api/characters?limit=100');
                const data2 = await res2.json();
                if (data2.success && data2.data?.characters) {
                    cachedCharacters = data2.data.characters.filter(c => c.images && c.images.length > 0);
                }
            }
        }

        if (!cachedCharacters || cachedCharacters.length === 0) {
            showToast("No approved characters found in library", "error");
            isSpinning = false;
            if (spinBtn) spinBtn.disabled = false;
            if (statusEl) statusEl.innerText = "⚠️ No characters available";
            return;
        }

        const characters = cachedCharacters;
        const totalSteps = 22; // Total shuffle steps
        const chosenCharacter = characters[Math.floor(Math.random() * characters.length)];

        // Generate rapid shuffle sequence
        const sequence = [];
        for (let i = 0; i < totalSteps - 1; i++) {
            sequence.push(characters[Math.floor(Math.random() * characters.length)]);
        }
        sequence.push(chosenCharacter);

        // Exponential deceleration delays
        let currentStep = 0;
        
        function step() {
            if (currentStep >= sequence.length) {
                // Finale reveal
                finishSpin(chosenCharacter);
                return;
            }

            const char = sequence[currentStep];
            const primaryImg = (char.images && char.images[0]) || '';
            if (imgEl && primaryImg) {
                imgEl.src = primaryImg.replace(/\/(?:460|300|560)\//g, '/1280/');
            }

            sound.playTick();
            currentStep++;

            // Calculate delay: starts at 50ms, ramps up to 450ms at the end
            const progress = currentStep / totalSteps;
            const delay = Math.round(45 + Math.pow(progress, 3) * 400);

            setTimeout(step, delay);
        }

        step();

    } catch (e) {
        console.error("Roulette error", e);
        isSpinning = false;
        if (spinBtn) spinBtn.disabled = false;
    }
}

function finishSpin(char) {
    isSpinning = false;
    const containerEl = document.getElementById('roulette-img-container');
    const statusEl = document.getElementById('roulette-status');
    const infoEl = document.getElementById('roulette-revealed-info');
    const nameEl = document.getElementById('roulette-char-name');
    const catEl = document.getElementById('roulette-char-cat');
    const countEl = document.getElementById('roulette-char-photos-count');
    const spinBtn = document.getElementById('btn-spin-again');
    const galleryBtn = document.getElementById('btn-view-roulette-gallery');
    const playBtn = document.getElementById('btn-play-roulette-char');

    if (containerEl) {
        containerEl.classList.remove('roulette-spinning');
        containerEl.classList.add('roulette-revealed');
    }

    if (statusEl) statusEl.classList.add('hidden');
    if (infoEl) infoEl.classList.remove('hidden');

    if (nameEl) nameEl.innerText = char.name;
    if (catEl) {
        catEl.innerText = char.category.toUpperCase();
        catEl.className = `badge badge-${char.category}`;
    }
    if (countEl) {
        countEl.innerText = `${char.images?.length || 1} Ultra-HD Photos`;
    }

    sound.playWin();

    if (spinBtn) spinBtn.disabled = false;

    // Show action buttons
    if (galleryBtn) {
        galleryBtn.style.display = 'inline-flex';
        galleryBtn.onclick = () => {
            sound.playClick();
            lightbox.open(char.images, {
                name: char.name,
                category: char.category,
                showCaption: true
            });
        };
    }

    if (playBtn) {
        playBtn.style.display = 'inline-flex';
        playBtn.onclick = () => {
            sound.playClick();
            const modal = document.getElementById('modal-random-picker');
            if (modal) modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            initGame(char.category, 'classic', 15);
        };
    }
}
