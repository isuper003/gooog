import { successResponse, errorResponse } from '../../../../lib/response.js';
import { generateUUID } from '../../../../lib/crypto.js';
import { isAdmin, forbidden } from '../../_guard.js';

// PATCH /api/admin/users/:id/role
// Blueprint §2.C — promote/demote between admin / moderator / user.
// Admin-only, self-role-change blocked, every transition audited.
export async function onRequestPatch(context) {
    const { env, request, params, data } = context;
    const db = env.DB;
    const targetId = params.id;

    if (!isAdmin(data.user)) return forbidden();

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }

    const { role } = body;
    if (!['admin', 'moderator', 'user'].includes(role)) {
        return errorResponse("Invalid role. Use admin, moderator or user.", 400);
    }
    if (targetId === data.user.id && role !== 'admin') {
        return errorResponse("You cannot demote your own admin account.", 400);
    }

    try {
        const target = await db.prepare(
            "SELECT id, role FROM users WHERE id = ? AND deleted_at_ms IS NULL"
        ).bind(targetId).first();
        if (!target) return errorResponse("User not found", 404);

        // Guard against removing the last active admin by accident.
        if (target.role === 'admin' && role !== 'admin') {
            const { results: otherAdmins } = await db.prepare(`
                SELECT COUNT(*) as n FROM users
                WHERE role = 'admin' AND id != ? AND deleted_at_ms IS NULL
            `).bind(targetId).all();
            if (!otherAdmins || otherAdmins[0].n === 0) {
                return errorResponse("Cannot demote the last remaining admin.", 409);
            }
        }

        await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, targetId).run();

        await db.prepare(`
            INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, reason, metadata_json, created_at_ms)
            VALUES (?, ?, 'user_role_change', 'user', ?, NULL, ?, ?)
        `).bind(generateUUID(), data.user.id, targetId,
            JSON.stringify({ previousRole: target.role, newRole: role }), Date.now()).run();

        return successResponse({ message: `Role updated to ${role}`, userId: targetId, role });
    } catch (e) {
        console.error("Role change error", e);
        return errorResponse("Failed to update role", 500);
    }
}
