import { successResponse, errorResponse } from '../../lib/response.js';
import { generateUUID } from '../../lib/crypto.js';

export async function onRequestPost(context) {
    const { env, data } = context;
    const db = env.DB;
    
    try {
        const nowMs = Date.now();
        
        await db.prepare("UPDATE users SET deletion_requested_at_ms = ? WHERE id = ?").bind(nowMs, data.user.id).run();
        
        // Log action in audit_log
        const auditId = generateUUID();
        await db.prepare(`
            INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, reason, metadata_json, created_at_ms)
            VALUES (?, ?, 'request_account_deletion', 'user', ?, 'User requested self deletion with 14-day grace', '{}', ?)
        `).bind(auditId, data.user.id, data.user.id, nowMs).run();
        
        return successResponse({
            message: "Account deletion requested. Your account and personal data will be scheduled for permanent purge in 14 days.",
            deletionRequestedAtMs: nowMs
        });
    } catch (e) {
        console.error("Account deletion request error", e);
        return errorResponse("Failed to process account deletion request", 500);
    }
}
