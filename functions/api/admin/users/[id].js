import { successResponse, errorResponse } from '../../../lib/response.js';
import { generateUUID } from '../../../lib/crypto.js';
import { isAdmin, forbidden } from '../_guard.js';

// DELETE /api/admin/users/:id
// Blueprint §2.C — 🗑️ permanent purge: strips credentials and personal data,
// anonymizes the identity, revokes every session and bans the shell record.
// The user row itself is kept as a tombstone because gameplay rows reference
// it (FK ON DELETE SET NULL keeps content, but the audit trail needs an
// anchor) — the account is unrecoverable either way.
export async function onRequestDelete(context) {
    const { env, params, data } = context;
    const db = env.DB;
    const targetId = params.id;

    if (!isAdmin(data.user)) return forbidden();
    if (targetId === data.user.id) {
        return errorResponse("You cannot delete your own admin account from here.", 400);
    }

    try {
        const target = await db.prepare(
            "SELECT id FROM users WHERE id = ? AND deleted_at_ms IS NULL"
        ).bind(targetId).first();
        if (!target) return errorResponse("User not found", 404);

        const nowMs = Date.now();

        await db.batch([
            db.prepare("UPDATE sessions SET revoked_at_ms = ? WHERE user_id = ? AND revoked_at_ms IS NULL")
                .bind(nowMs, targetId),
            db.prepare(`
                UPDATE users
                SET password_hash = '', password_salt = '', username = 'deleted-user',
                    x_handle = NULL, application_note = NULL,
                    status = 'banned', rejection_reason = 'Account permanently deleted by admin',
                    deleted_at_ms = ?
                WHERE id = ?
            `).bind(nowMs, targetId),
            db.prepare("DELETE FROM user_character_progress WHERE user_id = ?").bind(targetId),
            db.prepare("DELETE FROM daily_streaks WHERE user_id = ?").bind(targetId),
            db.prepare("DELETE FROM user_settings WHERE user_id = ?").bind(targetId)
        ]);

        await db.prepare(`
            INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, reason, metadata_json, created_at_ms)
            VALUES (?, ?, 'user_delete', 'user', ?, NULL, ?, ?)
        `).bind(generateUUID(), data.user.id, targetId,
            JSON.stringify({ note: 'credentials stripped, personal data purged, tombstone kept for FK/audit integrity' }), nowMs).run();

        return successResponse({ message: "User permanently purged." });
    } catch (e) {
        console.error("Admin delete user error", e);
        return errorResponse("Failed to delete user", 500);
    }
}
