import { successResponse, errorResponse } from '../../../../lib/response.js';
import { generateUUID, hashPassword, generateRandomString } from '../../../../lib/crypto.js';
import { isAdmin, forbidden } from '../../_guard.js';

// POST /api/admin/users/:id/reset-password
// Blueprint §2.C — 🔑 generates a temporary credential, stores only its hash,
// revokes all sessions so the old password stops working everywhere, and
// returns the plaintext exactly once to the acting admin.
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

        // 12-char URL-safe temporary password (43 bits of entropy).
        const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
        const bytes = new Uint8Array(12);
        crypto.getRandomValues(bytes);
        const tempPassword = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');

        const salt = generateRandomString(32);
        const passwordHash = await hashPassword(tempPassword, salt);
        const nowMs = Date.now();

        await db.batch([
            db.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?")
                .bind(passwordHash, salt, targetId),
            db.prepare("UPDATE sessions SET revoked_at_ms = ? WHERE user_id = ? AND revoked_at_ms IS NULL")
                .bind(nowMs, targetId)
        ]);

        await db.prepare(`
            INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, reason, metadata_json, created_at_ms)
            VALUES (?, ?, 'user_reset_password', 'user', ?, NULL, ?, ?)
        `).bind(generateUUID(), data.user.id, targetId,
            JSON.stringify({ note: 'temporary credential issued; plaintext never stored' }), nowMs).run();

        return successResponse({
            message: "Temporary password generated. All previous sessions were revoked.",
            temporaryPassword: tempPassword
        });
    } catch (e) {
        console.error("Reset password error", e);
        return errorResponse("Failed to reset password", 500);
    }
}
