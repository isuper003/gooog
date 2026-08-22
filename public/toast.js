import { esc } from './esc.js';

const MAX_VISIBLE_TOASTS = 4;
const DUPLICATE_SUPPRESS_MS = 800;

let lastToastMessage = '';
let lastToastAt = 0;

export function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Suppress identical messages fired in rapid succession (e.g. double-taps
    // or a retry loop hammering the same failing endpoint).
    const now = Date.now();
    if (message === lastToastMessage && (now - lastToastAt) < DUPLICATE_SUPPRESS_MS) return;
    lastToastMessage = message;
    lastToastAt = now;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <span>${icon}</span>
        <span class="flex-1">${esc(message)}</span>
    `;

    container.appendChild(toast);

    // Keep the stack bounded: retire the oldest toast when over capacity.
    while (container.children.length > MAX_VISIBLE_TOASTS) {
        container.firstElementChild?.remove();
    }

    setTimeout(() => {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
