import { showToast } from './toast.js';
import { getCsrfToken } from './csrf.js';
import { esc } from './esc.js';

// ==========================================================================
// 👑 Admin Users Control Center (Temple blueprint §2)
// Mounted into #pane-users by the admin page shell in app.js.
// ==========================================================================

let activeTab = 'pending'; // 'pending' | 'directory' (persists across navigation)
let directoryState = { q: '', status: 'all', role: 'all', page: 1 };
let pendingState = { page: 1 };
const PENDING_PAGE_SIZE = 20;
let viewerRole = 'user';
const selectedIds = new Set();

async function api(path, options = {}) {
    const res = await fetch(path, {
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            'X-CSRF-Token': getCsrfToken(),
            ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
        throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data.data;
}

function relTime(ms) {
    if (!ms) return '—';
    const diff = Date.now() - ms;
    if (diff < 60_000) return 'just now';
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ms).toLocaleDateString();
}

function fmtDate(ms) {
    return ms ? new Date(ms).toLocaleDateString() : '—';
}

function fmtNum(n) {
    return Number(n || 0).toLocaleString();
}

function roleBadge(role) {
    if (role === 'admin') return '<span class="au-badge au-badge-admin">👑 Admin</span>';
    if (role === 'moderator') return '<span class="au-badge au-badge-mod">🛡️ Moderator</span>';
    return '<span class="au-badge">👤 Member</span>';
}

function statusBadge(status) {
    const map = {
        pending: ['⏳ Pending', 'au-status-pending'],
        approved: ['✅ Active', 'au-status-active'],
        banned: ['🚫 Banned', 'au-status-banned'],
        rejected: ['❌ Rejected', 'au-status-rejected']
    };
    const [label, cls] = map[status] || [status, ''];
    return `<span class="au-badge ${cls}">${label}</span>`;
}

function xLink(handle) {
    if (!handle) return '<span class="text-xs color-text-muted">(no 𝕏 handle)</span>';
    return `<a class="au-x-link" href="https://x.com/${encodeURIComponent(handle)}"
              target="_blank" rel="noopener noreferrer no-referrer"
              title="Open 𝕏 profile for authenticity check">𝕏 @${esc(handle)} ↗</a>`;
}

export function initAdminUsers(currentUser) {
    const root = document.getElementById('pane-users');
    if (!root) return;

    if (!currentUser || !['admin', 'moderator'].includes(currentUser.role)) {
        root.innerHTML = `<div class="text-center color-text-muted my-12">🔒 Admin privileges required.</div>`;
        return;
    }

    viewerRole = currentUser.role;
    selectedIds.clear();
    renderShell(root);
    refreshTelemetry(root);
    if (activeTab === 'pending') loadPendingPane(root, 1);
    else loadDirectoryPane(root);
}

function refreshAfterMutation() {
    const root = document.getElementById('pane-users');
    if (!root) return;
    refreshTelemetry(root);
    if (activeTab === 'pending') loadPendingPane(root, 1);
    else loadDirectoryPane(root);
}

/* ── Shell ──────────────────────────────────────────────────────────── */

function renderShell(root) {
    root.innerHTML = `
        <div class="admin-users-panel">
            <h2 class="glow-text text-xl mb-3 text-center">👑 Admin Users Control Center</h2>

            <div class="au-telemetry-row" id="au-telemetry">
                <span class="color-text-muted text-xs">Loading telemetry…</span>
            </div>

            <div class="au-tabs">
                <button class="au-tab-btn ${activeTab === 'pending' ? 'active' : ''}" data-tab="pending">
                    ⏳ Pending Applications (<span id="au-pending-count">0</span>)
                </button>
                <button class="au-tab-btn ${activeTab === 'directory' ? 'active' : ''}" data-tab="directory">
                    👥 User Directory &amp; Records
                </button>
            </div>

            <div id="au-pane-content"></div>
        </div>
        <div id="au-modal-root"></div>
    `;

    root.querySelectorAll('.au-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeTab = btn.dataset.tab;
            root.querySelectorAll('.au-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (activeTab === 'pending') loadPendingPane(root, 1);
            else loadDirectoryPane(root);
        });
    });
}

async function refreshTelemetry(root) {
    try {
        // limit=1 keeps the payload tiny; the telemetry aggregates ride along.
        const data = await api('/api/admin/users?limit=1');
        const t = data.telemetry || {};
        root.querySelector('#au-telemetry').innerHTML = `
            <span class="au-chip">👥 Total Members: <strong>${fmtNum(t.total_members)}</strong></span>
            <span class="au-chip au-chip-pending">⏳ Pending Requests: <strong>${t.pending_count || 0}</strong></span>
            <span class="au-chip au-chip-active">✅ Active: <strong>${fmtNum(t.active_count)}</strong></span>
            <span class="au-chip au-chip-banned">🚫 Banned: <strong>${t.banned_count || 0}</strong></span>
        `;
        const pendCount = root.querySelector('#au-pending-count');
        if (pendCount) pendCount.innerText = t.pending_count || 0;
    } catch (e) {
        root.querySelector('#au-telemetry').innerHTML =
            `<span class="text-xs" style="color:#f87171;">Telemetry failed: ${esc(e.message)}</span>`;
    }
}

/* ── Tab 1: Pending Applications ────────────────────────────────────── */

async function loadPendingPane(root, page = pendingState.page) {
    const pane = root.querySelector('#au-pane-content');
    pane.innerHTML = `<div class="spinner mx-auto my-6"></div>`;
    pendingState.page = page;

    try {
        const data = await api(`/api/admin/users?status=pending&limit=${PENDING_PAGE_SIZE}&page=${pendingState.page}`);
        const users = data.users || [];
        const totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.limit || PENDING_PAGE_SIZE)));
        selectedIds.clear();

        if (users.length === 0) {
            pane.innerHTML = `<div class="text-center color-text-muted my-10">🎉 No pending applications — the queue is clear.</div>`;
            return;
        }

        pane.innerHTML = `
            <div class="au-bulk-bar">
                <label class="flex items-center gap-2 text-sm font-bold cursor-pointer select-none">
                    <input type="checkbox" id="au-select-all"> ☑️ Select All (page: ${users.length})
                </label>
                <button class="btn-primary text-xs font-bold py-2 px-4" id="au-bulk-approve" disabled>
                    ⚡ Bulk Approve Selected (<span id="au-sel-count">0</span>)
                </button>
            </div>
            <div class="au-applicant-list">
                ${users.map(applicantCard).join('')}
            </div>
            ${totalPages > 1 ? `
            <div class="au-pagination">
                <button id="au-pend-prev" ${pendingState.page <= 1 ? 'disabled' : ''}>‹ Prev</button>
                <span>Page ${pendingState.page} / ${totalPages} — ${fmtNum(data.total)} waiting</span>
                <button id="au-pend-next" ${pendingState.page >= totalPages ? 'disabled' : ''}>Next ›</button>
            </div>` : ''}
        `;
        bindPendingEvents(pane, root);

        pane.querySelector('#au-pend-prev')?.addEventListener('click', () => loadPendingPane(root, pendingState.page - 1));
        pane.querySelector('#au-pend-next')?.addEventListener('click', () => loadPendingPane(root, pendingState.page + 1));
    } catch (e) {
        pane.innerHTML = `<div class="text-center my-10" style="color:#f87171;">${esc(e.message)}</div>`;
    }
}

function applicantCard(u) {
    return `
        <div class="au-applicant-card" data-id="${esc(u.id)}">
            <div class="au-applicant-head">
                <input type="checkbox" class="au-select-one" data-id="${esc(u.id)}">
                <span class="font-black">@${esc(u.username)}</span>
                ${roleBadge(u.role)}
                ${xLink(u.xHandle)}
                <span class="au-time ms-auto">${relTime(u.createdAtMs)}</span>
            </div>
            <div class="au-statement-box">${esc(u.applicationNote || '(no statement provided)')}</div>
            <div class="au-applicant-actions">
                <button class="btn-primary text-xs font-bold py-2 px-4 au-approve-one" data-id="${esc(u.id)}">
                    ✅ Approve Application
                </button>
                <button class="btn-secondary text-xs font-bold py-2 px-4 au-reject-one" data-id="${esc(u.id)}"
                        data-name="${esc(u.username)}">
                    ❌ Reject Application
                </button>
            </div>
        </div>
    `;
}

function updateSelectionUI(pane) {
    const countEl = pane.querySelector('#au-sel-count');
    const bulkBtn = pane.querySelector('#au-bulk-approve');
    if (countEl) countEl.innerText = selectedIds.size;
    if (bulkBtn) bulkBtn.disabled = selectedIds.size === 0;
}

function bindPendingEvents(pane, root) {
    pane.querySelector('#au-select-all')?.addEventListener('change', (e) => {
        selectedIds.clear();
        if (e.target.checked) {
            pane.querySelectorAll('.au-select-one').forEach(cb => {
                cb.checked = true;
                selectedIds.add(cb.dataset.id);
            });
        } else {
            pane.querySelectorAll('.au-select-one').forEach(cb => { cb.checked = false; });
        }
        updateSelectionUI(pane);
    });

    pane.querySelectorAll('.au-select-one').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) selectedIds.add(cb.dataset.id);
            else selectedIds.delete(cb.dataset.id);
            updateSelectionUI(pane);
        });
    });

    pane.querySelector('#au-bulk-approve')?.addEventListener('click', async () => {
        if (selectedIds.size === 0) return;
        try {
            const data = await api('/api/admin/users/bulk-approve', {
                method: 'POST',
                body: { userIds: [...selectedIds] }
            });
            sound.playWin();
            showToast(`⚡ Approved ${data.approved} application(s).`, 'success');
            refreshTelemetry(root);
            loadPendingPane(root, 1);
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    pane.querySelectorAll('.au-approve-one').forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await api(`/api/admin/users/${encodeURIComponent(btn.dataset.id)}/status`, {
                    method: 'PATCH',
                    body: { status: 'approved' }
                });
                showToast('✅ Application approved — the member can now sign in.', 'success');
                refreshTelemetry(root);
                loadPendingPane(root, 1);
            } catch (e) {
                btn.disabled = false;
                showToast(e.message, 'error');
            }
        });
    });

    pane.querySelectorAll('.au-reject-one').forEach(btn => {
        btn.addEventListener('click', async () => {
            const reason = prompt(`Optional rejection reason for @${btn.dataset.name}:`) ?? undefined;
            if (reason === null) return; // user cancelled via Cancel button
            btn.disabled = true;
            try {
                await api(`/api/admin/users/${encodeURIComponent(btn.dataset.id)}/status`, {
                    method: 'PATCH',
                    body: { status: 'rejected', reason: reason || '' }
                });
                showToast('❌ Application rejected.', 'info');
                refreshTelemetry(root);
                loadPendingPane(root, 1);
            } catch (e) {
                btn.disabled = false;
                showToast(e.message, 'error');
            }
        });
    });
}

/* ── Tab 2: User Directory & Records ───────────────────────────────── */

async function loadDirectoryPane(root) {
    const pane = root.querySelector('#au-pane-content');
    pane.innerHTML = `
        <div class="au-directory-controls">
            <input type="search" id="au-search" placeholder="🔍 Search by username or 𝕏 handle…"
                   value="${esc(directoryState.q)}">
            <select id="au-filter-status">
                <option value="all">All Statuses</option>
                <option value="approved">✅ Active</option>
                <option value="pending">⏳ Pending</option>
                <option value="banned">🚫 Banned</option>
                <option value="rejected">❌ Rejected</option>
            </select>
            <select id="au-filter-role">
                <option value="all">All Roles</option>
                <option value="staff">👑 Admins &amp; Moderators</option>
            </select>
        </div>
        <div id="au-table-wrap"><div class="spinner mx-auto my-6"></div></div>
    `;

    // Restore current filter selections.
    pane.querySelector('#au-filter-status').value = directoryState.status;
    pane.querySelector('#au-filter-role').value = directoryState.role;

    let debounceTimer = null;
    pane.querySelector('#au-search')?.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            directoryState.q = e.target.value.trim();
            directoryState.page = 1;
            loadDirectoryTable(root);
        }, 300);
    });
    pane.querySelector('#au-filter-status')?.addEventListener('change', (e) => {
        directoryState.status = e.target.value;
        directoryState.page = 1;
        loadDirectoryTable(root);
    });
    pane.querySelector('#au-filter-role')?.addEventListener('change', (e) => {
        directoryState.role = e.target.value;
        directoryState.page = 1;
        loadDirectoryTable(root);
    });

    await loadDirectoryTable(root);
}

async function loadDirectoryTable(root) {
    const wrap = root.querySelector('#au-table-wrap');
    if (!wrap) return;
    wrap.innerHTML = `<div class="spinner mx-auto my-6"></div>`;

    const params = new URLSearchParams({
        page: String(directoryState.page),
        limit: '20'
    });
    if (directoryState.q) params.set('q', directoryState.q);
    if (directoryState.status !== 'all') params.set('status', directoryState.status);
    if (directoryState.role !== 'all') params.set('role', directoryState.role);

    try {
        const data = await api(`/api/admin/users?${params}`);
        const users = data.users || [];

        if (users.length === 0) {
            wrap.innerHTML = `<div class="text-center color-text-muted my-10">No members match these filters.</div>`;
            return;
        }

        const totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.limit || 20)));

        wrap.innerHTML = `
            <div class="au-table-scroll">
                <table class="au-table">
                    <thead>
                        <tr>
                            <th>Member</th><th>𝕏 Handle</th><th>Status</th><th>Devotion ✨</th>
                            <th>Accuracy</th><th>Games</th><th>Last Active</th><th>Registered</th><th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(rowHtml).join('')}
                    </tbody>
                </table>
            </div>
            <div class="au-pagination">
                <button id="au-prev-page" ${directoryState.page <= 1 ? 'disabled' : ''}>‹ Prev</button>
                <span>Page ${data.page} / ${totalPages} — ${fmtNum(data.total)} member(s)</span>
                <button id="au-next-page" ${directoryState.page >= totalPages ? 'disabled' : ''}>Next ›</button>
            </div>
        `;

        wrap.querySelectorAll('.au-view-profile').forEach(btn => {
            btn.addEventListener('click', () => openUserModal(btn.dataset.id));
        });
        wrap.querySelector('#au-prev-page')?.addEventListener('click', () => {
            if (directoryState.page > 1) { directoryState.page--; loadDirectoryTable(root); }
        });
        wrap.querySelector('#au-next-page')?.addEventListener('click', () => {
            directoryState.page++;
            loadDirectoryTable(root);
        });
    } catch (e) {
        wrap.innerHTML = `<div class="text-center my-10" style="color:#f87171;">${esc(e.message)}</div>`;
    }
}

function rowHtml(u) {
    return `
        <tr data-id="${esc(u.id)}">
            <td>
                <div class="font-bold">@${esc(u.username)}</div>
                ${roleBadge(u.role)}
            </td>
            <td>${xLink(u.xHandle)}</td>
            <td>${statusBadge(u.status)}</td>
            <td><strong>✨ ${fmtNum(u.telemetry?.devotionPoints)}</strong></td>
            <td>${u.telemetry?.accuracyPct != null ? u.telemetry.accuracyPct + '%' : '—'}
                <span class="text-xs color-text-muted">(${fmtNum(u.telemetry?.totalAnswers)})</span></td>
            <td>${fmtNum(u.telemetry?.gamesPlayed)}</td>
            <td>${relTime(u.lastActiveMs)}</td>
            <td>${fmtDate(u.createdAtMs)}</td>
            <td><button class="btn-secondary text-xs py-1 px-3 au-view-profile" data-id="${esc(u.id)}">
                🔍 View Profile &amp; Actions</button></td>
        </tr>
    `;
}

/* ── Tab 3: Deep-Dive Modal (blueprint §2.C) ────────────────────────── */

let modalEscapeHandler = null;

function closeUserModal() {
    document.getElementById('au-modal')?.remove();
    if (modalEscapeHandler) {
        document.removeEventListener('keydown', modalEscapeHandler);
        modalEscapeHandler = null;
    }
}

async function openUserModal(userId) {
    // Viewer privileges come from the module-level role set at init time.
    const isAdminViewer = viewerRole === 'admin';
    const modalRoot = document.getElementById('au-modal-root');
    if (!modalRoot) return;
    closeUserModal();

    modalRoot.innerHTML = `
        <div class="modal" id="au-modal">
            <div class="modal-content" id="au-modal-content">
                <div class="spinner mx-auto my-8"></div>
            </div>
        </div>
    `;
    const modal = document.getElementById('au-modal');
    modal.addEventListener('click', (e) => { if (e.target === modal) closeUserModal(); });
    modalEscapeHandler = (e) => { if (e.key === 'Escape') closeUserModal(); };
    document.addEventListener('keydown', modalEscapeHandler);

    let stats;
    try {
        stats = await api(`/api/admin/users/${encodeURIComponent(userId)}/stats`);
    } catch (e) {
        document.getElementById('au-modal-content').innerHTML =
            `<p class="text-center my-6" style="color:#f87171;">${esc(e.message)}</p>
             <button class="btn-secondary w-full" id="au-modal-close">Close</button>`;
        document.getElementById('au-modal-close').addEventListener('click', closeUserModal);
        return;
    }

    const { account, gameplay, srs, temple } = stats;
    const isBanned = account.status === 'banned';

    const statBox = (label, value) => `
        <div class="result-stat-box text-center">
            <div class="result-stat-value">${value}</div>
            <div class="result-stat-label">${label}</div>
        </div>`;

    const content = document.getElementById('au-modal-content');
    content.innerHTML = `
        <div class="modal-header">
            <h2 class="glow-text text-lg">🔍 @${esc(account.username)} — Dossier</h2>
            <button class="close-modal" id="au-modal-close">×</button>
        </div>

        <div class="flex items-center gap-2 flex-wrap mb-3">
            ${roleBadge(account.role)} ${statusBadge(account.status)}
            ${xLink(account.xHandle)}
            <span class="text-xs color-text-muted ms-auto">Registered ${fmtDate(account.createdAtMs)} • Last active ${relTime(account.lastActiveMs)}</span>
        </div>
        ${account.rejectionReason ? `<p class="text-xs mb-3" style="color:#f87171;">❌ Rejection reason: ${esc(account.rejectionReason)}</p>` : ''}

        <h4 class="font-bold text-sm mt-2 mb-2">🎮 Gameplay Metrics</h4>
        <div class="grid" style="display:grid; grid-template-columns: repeat(4,1fr); gap:6px;">
            ${statBox('Games Played', fmtNum(gameplay.gamesPlayed))}
            ${statBox('Win Rate %', gameplay.winRatePct != null ? gameplay.winRatePct + '%' : '—')}
            ${statBox('Avg Speed', gameplay.avgAnswerSec != null ? gameplay.avgAnswerSec + 's' : '—')}
            ${statBox('Login Streak 🔥', `${gameplay.loginStreak?.current || 0} (best ${gameplay.loginStreak?.longest || 0})`)}
        </div>

        <h4 class="font-bold text-sm mt-4 mb-2">🧠 SRS Mastery</h4>
        <div class="grid" style="display:grid; grid-template-columns: repeat(4,1fr); gap:6px;">
            ${statBox('Tracked', fmtNum(srs.tracked))}
            ${statBox('★5 Mastered', fmtNum(srs.mastered))}
            ${statBox('Learning', fmtNum(srs.learning))}
            ${statBox('Weak', fmtNum(srs.weak))}
        </div>

        <h4 class="font-bold text-sm mt-4 mb-2">🏛️ Temple &amp; Worship</h4>
        <div class="grid" style="display:grid; grid-template-columns: repeat(3,1fr); gap:6px;">
            ${statBox('Devotion ✨', fmtNum(temple.devotionPoints))}
            ${statBox('Rank', `${temple.rank?.badge || ''} T${temple.rank?.tier ?? '—'}`)}
            ${statBox('Tributes 🙇', fmtNum(temple.tributeCount))}
        </div>
        <div class="grid" style="display:grid; grid-template-columns: repeat(3,1fr); gap:6px; margin-top:6px;">
            ${statBox('📜 Sealed Surahs', `${temple.sealedSurahs ?? 0} / 28`)}
            ${statBox('🧘 Meditation Min', fmtNum(temple.meditationMinutes))}
            ${statBox('📜 Commandments', `${temple.acknowledgedCommandments ?? 0} / 10`)}
        </div>

        ${isAdminViewer ? `
        <hr style="border-color: rgba(168,85,247,.35); margin: 1rem 0;">
        <h4 class="font-bold text-sm mb-2">⚙️ Administrative Power Controls</h4>
        <div class="flex flex-wrap gap-2">
            <div class="flex items-center gap-1">
                <select id="au-role-select" class="text-xs font-bold py-1 px-2"
                        style="background: rgba(15,14,30,.9); border:1px solid rgba(168,85,247,.4); color:#e9d5ff; border-radius:6px;">
                    <option value="user" ${account.role === 'user' ? 'selected' : ''}>👤 Member</option>
                    <option value="moderator" ${account.role === 'moderator' ? 'selected' : ''}>🛡️ Moderator</option>
                    <option value="admin" ${account.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
                </select>
                <button class="btn-secondary text-xs font-bold py-1 px-3" id="au-btn-role">👑 Change Role</button>
            </div>
            <button class="btn-secondary text-xs font-bold py-1 px-3" id="au-btn-ban">
                ${isBanned ? '✅ Unban Account' : '🚫 Ban Account'}
            </button>
            <button class="btn-secondary text-xs font-bold py-1 px-3" id="au-btn-logout-all">🚪 Force Logout</button>
            <button class="btn-secondary text-xs font-bold py-1 px-3" id="au-btn-reset-pwd">🔑 Reset Password</button>
            <button class="btn-secondary text-xs font-bold py-1 px-3 au-danger-btn" id="au-btn-delete">🗑️ Delete Permanently</button>
        </div>
        <div id="au-action-result" class="mt-3"></div>
        ` : `<p class="text-xs color-text-muted mt-3">🔒 Role/ban/reset/delete controls require admin privileges.</p>`}
    `;

    content.querySelector('#au-modal-close').addEventListener('click', closeUserModal);
    if (!isAdminViewer) return;

    // ── Admin action handlers ─────────────────────────────────────────
    const resultBox = content.querySelector('#au-action-result');

    content.querySelector('#au-btn-role')?.addEventListener('click', async () => {
        const role = content.querySelector('#au-role-select').value;
        try {
            await api(`/api/admin/users/${encodeURIComponent(userId)}/role`, { method: 'PATCH', body: { role } });
            showToast(`👑 Role updated to ${role}.`, 'success');
            refreshAfterMutation();
            openUserModal(userId, viewerRole);
        } catch (e) { showToast(e.message, 'error'); }
    });

    content.querySelector('#au-btn-ban')?.addEventListener('click', async () => {
        const body = isBanned
            ? { status: 'approved', unban: true }
            : { status: 'banned', reason: prompt('Optional ban reason:') || '' };
        try {
            await api(`/api/admin/users/${encodeURIComponent(userId)}/status`, { method: 'PATCH', body });
            showToast(isBanned ? '✅ Account reinstated.' : '🚫 Account banned and all sessions revoked.', isBanned ? 'success' : 'warning');
            refreshAfterMutation();
            closeUserModal();
        } catch (e) { showToast(e.message, 'error'); }
    });

    content.querySelector('#au-btn-logout-all')?.addEventListener('click', async () => {
        if (!confirm('Revoke ALL active sessions for this user across every device?')) return;
        try {
            const r = await api(`/api/admin/users/${encodeURIComponent(userId)}/logout-all`, { method: 'POST' });
            resultBox.innerHTML = `<p class="text-xs" style="color:#34d399;">🚪 Revoked ${r.revoked} session(s).</p>`;
            showToast('All sessions terminated.', 'success');
        } catch (e) { showToast(e.message, 'error'); }
    });

    content.querySelector('#au-btn-reset-pwd')?.addEventListener('click', async () => {
        if (!confirm('Generate a temporary password? All existing sessions will be revoked.')) return;
        try {
            const r = await api(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, { method: 'POST' });
            resultBox.innerHTML = `
                <div class="au-temp-password">
                    🔑 Temporary credential (shown once):<br>
                    <code>${esc(r.temporaryPassword)}</code><br>
                    <small>Share it securely — it is not stored anywhere in plain text.</small>
                </div>`;
        } catch (e) { showToast(e.message, 'error'); }
    });

    content.querySelector('#au-btn-delete')?.addEventListener('click', async () => {
        if (!confirm(`PERMANENTLY delete @${account.username}? Credentials and personal data will be purged.`)) return;
        if (!confirm('This action cannot be undone. Continue?')) return;
        try {
            await api(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
            showToast('🗑️ User permanently purged.', 'success');
            refreshAfterMutation();
            closeUserModal();
        } catch (e) { showToast(e.message, 'error'); }
    });
}
