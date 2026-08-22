import { successResponse, errorResponse } from '../../../lib/response.js';
import { generateUUID } from '../../../lib/crypto.js';
import { isStaff, forbidden } from '../_guard.js';

// POST /api/admin/users/bulk-approve
// Blueprint §2.A — batch activation of pending applicants in one transaction.
export async function onRequestPost(context) {
    const { env, request, data } = context;
    const db = env.DB;

    if (!isStaff(data.user)) return forbidden();

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }

    const ids = Array.isArray(body.userIds)
        ? body.userIds.filter(id => typeof id === 'string' && id.length > 0).slice(0, 100)
        : [];
    if (ids.length === 0) {
        return errorResponse("Provide a non-empty userIds array (max 100).", 400);
    }

    const nowMs = Date.now();
    const placeholders = ids.map(() => '?').join(',');

    try {
        const result = await db.prepare(`
            UPDATE users
            SET status = 'approved', rejection_reason = NULL,
                reviewed_by_user_id = ?, reviewed_at_ms = ?
            WHERE id IN (${placeholders}) AND status = 'pending'
        `).bind(data.user.id, nowMs, ...ids).run();

        // One audit entry per actually-activated applicant.
        const changed = result.meta?.changes || 0;
        if (changed > 0) {
            const { results: activated } = await db.prepare(`
                SELECT id FROM users
                WHERE status = 'approved' AND reviewed_by_user_id = ? AND reviewed_at_ms = ?
                  AND id IN (${placeholders})
            `).bind(data.user.id, nowMs, ...ids).all();

            const auditStmts = (activated || []).map(row => db.prepare(`
                INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, reason, metadata_json, created_at_ms)
                VALUES (?, ?, 'user_bulk_approve', 'user', ?, NULL, ?, ?)
            `).bind(generateUUID(), data.user.id, row.id, JSON.stringify({ previousStatus: 'pending', newStatus: 'approved' }), nowMs));

            if (auditStmts.length > 0) await db.batch(auditStmts);
        }

        return successResponse({ approved: changed });
    } catch (e) {
        console.error("Bulk approve error", e);
        return errorResponse("Failed to approve applications", 500);
    }
}
