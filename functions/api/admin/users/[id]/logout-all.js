import { successResponse, errorResponse } from '../../../../lib/response.js';
import { generateUUID } from '../../../../lib/crypto.js';
import { isAdmin, forbidden } from '../../_guard.js';

// POST /api/admin/users/:id/logout-all
// Blueprint §2.C — 🚪 Force Logout: revokes every live session across all
// devices immediately.
export async function onRequestPost(context) {
    const { env, params, data } = context;
    const db = env.DB;
    const targetId = params.id;

    if (!isAdmin(data.user)) return forbidden();

    try {
        const target = await db.prepare(
            "SELECT id FROM users WHERE id = ? AND deleted_at_ms IS NULL"
        ).bind(targetId).first();
        if (!target) return errorResponse("User not found", 404);

        const result = await db.prepare(`
            UPDATE sessions SET revoked_at_ms = ?
            WHERE user_id = ? AND revoked_at_ms IS NULL
        `).bind(Date.now(), targetId).run();

        const revoked = result.meta?.changes || 0;

        await db.prepare(`
            INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, reason, metadata_json, created_at_ms)
            VALUES (?, ?, 'user_force_logout', 'user', ?, NULL, ?, ?)
        `).bind(generateUUID(), data.user.id, targetId,
            JSON.stringify({ sessionsRevoked: revoked }), Date.now()).run();

        return successResponse({ message: `Revoked ${revoked} active session(s).`, revoked });
    } catch (e) {
        console.error("Force logout error", e);
        return errorResponse("Failed to revoke sessions", 500);
    }
}
