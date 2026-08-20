import { sound } from './sound.js';
import { showToast } from './toast.js';
import { getCsrfToken, clearCsrfToken } from './csrf.js';

export async function initSettingsModal(currentUser) {
    let modal = document.getElementById('modal-settings');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-settings';
        modal.className = 'modal hidden';
        document.body.appendChild(modal);
    }

    const soundEnabled = localStorage.getItem('sound_enabled') !== 'false';
    const timerEnabled = localStorage.getItem('timer_enabled') !== 'false';
    const timerSeconds = localStorage.getItem('timer_seconds') || '15';

    // Fetch user learning progress and streak data
    let progressData = null;
    try {
        const res = await fetch('/api/me/progress');
        const data = await res.json();
        if (data.success) progressData = data.data;
    } catch (e) {}

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="glow-text text-xl">⚙️ Settings & Profile</h2>
                <button class="close-modal" id="btn-close-settings">×</button>
            </div>

            <div class="flex flex-col gap-4">
                <!-- User Profile Info -->
                <div class="result-stat-box flex items-center justify-between" style="text-align: left;">
                    <div>
                        <div class="font-bold text-lg">@${currentUser?.username || 'User'}</div>
                        <div class="text-xs color-text-muted">Role: ${(currentUser?.role || 'user').toUpperCase()}</div>
                        ${currentUser?.deletionRequestedAtMs ? '<div class="text-xs text-rose-400 font-bold mt-1">⚠️ Deletion scheduled (14-day grace active)</div>' : ''}
                    </div>
                    <span class="badge badge-mix">${currentUser?.role === 'admin' ? '👑 Admin' : (currentUser?.role === 'moderator' ? '🛡️ Moderator' : '⭐ Member')}</span>
                </div>

                <!-- Personal Progress Overview -->
                ${progressData ? `
                    <div class="result-stat-box" style="text-align: left;">
                        <div class="font-bold text-sm mb-2">📊 Personal Memory Stats</div>
                        <div class="grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center;">
                            <div style="background: var(--bg-surface-elevated); padding: 8px; border-radius: var(--radius-sm);">
                                <div class="font-bold glow-text text-lg">${progressData.masteredCount}</div>
                                <div class="text-xs color-text-muted">Mastered</div>
                            </div>
                            <div style="background: var(--bg-surface-elevated); padding: 8px; border-radius: var(--radius-sm);">
                                <div class="font-bold text-lg" style="color: #38bdf8;">${progressData.totalAnswers}</div>
                                <div class="text-xs color-text-muted">Answers</div>
                            </div>
                            <div style="background: var(--bg-surface-elevated); padding: 8px; border-radius: var(--radius-sm);">
                                <div class="font-bold text-lg" style="color: #34d399;">${progressData.accuracyRate}%</div>
                                <div class="text-xs color-text-muted">Accuracy</div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Sound Effects Toggle -->
                <div class="flex justify-between items-center py-2" style="border-bottom: 1px solid var(--color-border);">
                    <div>
                        <div class="font-bold">Sound Effects</div>
                        <div class="text-xs color-text-muted">Web Audio synthesizer chimes and feedback</div>
                    </div>
                    <input type="checkbox" id="setting-sound-toggle" ${soundEnabled ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
                </div>

                <!-- Timer Toggle & Duration -->
                <div class="flex flex-col gap-2 py-2" style="border-bottom: 1px solid var(--color-border);">
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="font-bold">Gameplay Countdown Timer</div>
                            <div class="text-xs color-text-muted">Enforces time limits per question</div>
                        </div>
                        <input type="checkbox" id="setting-timer-toggle" ${timerEnabled ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
                    </div>

                    <div class="flex items-center gap-3 mt-2">
                        <label class="text-xs color-text-muted">Duration (seconds):</label>
                        <select id="setting-timer-seconds" style="max-width: 120px;">
                            <option value="5" ${timerSeconds === '5' ? 'selected' : ''}>5s (Blitz)</option>
                            <option value="10" ${timerSeconds === '10' ? 'selected' : ''}>10s</option>
                            <option value="15" ${timerSeconds === '15' ? 'selected' : ''}>15s (Default)</option>
                            <option value="30" ${timerSeconds === '30' ? 'selected' : ''}>30s</option>
                            <option value="60" ${timerSeconds === '60' ? 'selected' : ''}>60s</option>
                        </select>
                    </div>
                </div>

                <!-- Streak Milestone Badges -->
                <div class="py-2" style="border-bottom: 1px solid var(--color-border);">
                    <div class="font-bold mb-2">🔥 Streak Milestones</div>
                    <div class="flex gap-2 flex-wrap">
                        <span class="badge badge-trans">3 Days: +1 Lifeline</span>
                        <span class="badge badge-sluts">7 Days: Champion</span>
                        <span class="badge badge-twinks">14 Days: 2x Boost</span>
                        <span class="badge badge-mix">30 Days: Grand Master</span>
                    </div>
                </div>

                <!-- Account Actions -->
                <div class="py-2 flex flex-col gap-2">
                    <button id="btn-logout-settings" class="btn-secondary w-full font-bold" style="background: rgba(255, 255, 255, 0.08);">
                        🚪 Log Out of Account
                    </button>
                    <button id="btn-delete-account-flow" class="btn-secondary w-full text-xs" style="color: var(--accent-red); border-color: rgba(225, 29, 72, 0.3);">
                        🗑️ Request Account Deletion (14-day grace)
                    </button>
                </div>
            </div>
        </div>
    `;

    // Event listeners
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    document.getElementById('setting-sound-toggle')?.addEventListener('change', (e) => {
        sound.toggleSound(e.target.checked);
        if (e.target.checked) sound.playCorrect();
    });

    document.getElementById('setting-timer-toggle')?.addEventListener('change', (e) => {
        localStorage.setItem('timer_enabled', e.target.checked ? 'true' : 'false');
    });

    document.getElementById('setting-timer-seconds')?.addEventListener('change', (e) => {
        localStorage.setItem('timer_seconds', e.target.value);
    });

    document.getElementById('btn-logout-settings')?.addEventListener('click', async () => {
        sound.playClick();
        if (confirm("Are you sure you want to log out?")) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'X-CSRF-Token': getCsrfToken() }
                });
            } catch (e) {}
            clearCsrfToken();
            showToast('Logged out successfully', 'info');
            modal.classList.add('hidden');
            setTimeout(() => window.location.reload(), 300);
        }
    });

    document.getElementById('btn-delete-account-flow')?.addEventListener('click', async () => {
        if (confirm("Are you sure you want to request account deletion? You will have a 14-day grace period before data is permanently purged.")) {
            try {
                const res = await fetch('/api/me/delete-account', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-Token': getCsrfToken()
                    }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    showToast("Account deletion requested (14-day grace period).", 'warning');
                    modal.classList.add('hidden');
                } else {
                    showToast(data.error || "Failed to submit request", 'error');
                }
            } catch (err) {
                showToast("Connection error", 'error');
            }
        }
    });

    modal.classList.remove('hidden');
}
