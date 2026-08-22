import { successResponse, errorResponse } from '../../../../lib/response.js';
import { generateUUID } from '../../../../lib/crypto.js';
import { isStaff, isAdmin, forbidden } from '../../_guard.js';

// PATCH /api/admin/users/:id/status
// Blueprint §1.C + §2.C — approve / reject (+reason) / ban / unban.
// Ban also revokes every live session so suspension is immediate.
export async function onRequestPatch(context) {
    const { env, request, params, data } = context;
    const db = env.DB;
    const targetId = params.id;

    if (!isStaff(data.user)) return forbidden();

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }

    const { status, reason } = body;
    if (!['approved', 'rejected', 'banned'].includes(status)) {
        return errorResponse("Invalid status. Use approved, rejected or banned.", 400);
    }

    // Ban/unban is a moderation-heavy power: admins only. Approve/reject of
    // pending applications is available to moderators too.
    if ((status === 'banned' || body.unban === true) && !isAdmin(data.user)) {
        return forbidden('Ban and unban actions require admin privileges');
    }
    if (targetId === data.user.id && status !== 'approved') {
        return errorResponse("You cannot change your own account status.", 400);
    }

    const nowMs = Date.now();

    try {
        const target = await db.prepare(
            "SELECT id, role, status FROM users WHERE id = ? AND deleted_at_ms IS NULL"
        ).bind(targetId).first();
        if (!target) return errorResponse("User not found", 404);

        if (target.role === 'admin' && data.user.role !== 'admin') {
            return forbidden('Only admins can act on admin accounts');
        }

        const rejectionReason = status === 'rejected'
            ? String(reason || '').slice(0, 300) || null
            : null;

        const result = await db.prepare(`
            UPDATE users
            SET status = ?, rejection_reason = ?, reviewed_by_user_id = ?, reviewed_at_ms = ?
            WHERE id = ?
        `).bind(status, rejectionReason, data.user.id, nowMs, targetId).run();

        if (!result.meta || result.meta.changes === 0) {
            return errorResponse("Status unchanged", 409);
        }

        const stmts = [];

        if (status === 'banned') {
            // Suspension takes effect immediately across all devices.
            stmts.push(db.prepare(
                "UPDATE sessions SET revoked_at_ms = ? WHERE user_id = ? AND revoked_at_ms IS NULL"
            ).bind(nowMs, targetId));
        }

        stmts.push(db.prepare(`
            INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, reason, metadata_json, created_at_ms)
            VALUES (?, ?, 'user_status_change', 'user', ?, ?, ?, ?)
        `).bind(generateUUID(), data.user.id, targetId,
            status === 'rejected' ? (rejectionReason || 'No reason given') : (reason ? String(reason).slice(0,300) : null),
            JSON.stringify({ previousStatus: target.status, newStatus: status }), nowMs));

        await db.batch(stmts);

        return successResponse({
            message: `User status set to ${status}`,
            userId: targetId,
            status,
            sessionsRevoked: status === 'banned'
        });
    } catch (e) {
        console.error("User status change error", e);
        return errorResponse("Failed to update user status", 500);
    }
}
