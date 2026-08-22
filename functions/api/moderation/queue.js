import { successResponse, errorResponse } from '../../lib/response.js';
import { generateUUID } from '../../lib/crypto.js';

export async function onRequestGet(context) {
    const { env, data } = context;
    const db = env.DB;
    
    if (data.user.role !== 'admin' && data.user.role !== 'moderator') {
        return errorResponse("Access denied: Admin or Moderator role required", 403);
    }
    
    try {
        const { results: pendingChars } = await db.prepare(`
            SELECT c.id, c.name, c.category, c.label, c.status, c.created_at_ms, u.username as submitted_by
            FROM characters c
            LEFT JOIN users u ON c.submitted_by_user_id = u.id
            WHERE c.status = 'pending' AND c.deleted_at_ms IS NULL
            ORDER BY c.created_at_ms ASC
        `).all();
        
        if (pendingChars && pendingChars.length > 0) {
            const charIds = pendingChars.map(c => c.id);
            const imageMap = {};
            const chunkSize = 30;

            for (let i = 0; i < charIds.length; i += chunkSize) {
                const chunk = charIds.slice(i, i + chunkSize);
                const placeholders = chunk.map(() => '?').join(',');
                const { results: imagesChunk } = await db.prepare(`
                    SELECT character_id, image_url, display_order 
                    FROM character_images 
                    WHERE character_id IN (${placeholders})
                    ORDER BY character_id, display_order ASC
                `).bind(...chunk).all();

                (imagesChunk || []).forEach(img => {
                    if (!imageMap[img.character_id]) imageMap[img.character_id] = [];
                    imageMap[img.character_id].push(img.image_url);
                });
            }
            
            pendingChars.forEach(char => {
                char.images = imageMap[char.id] || [];
            });
        }
        
        return successResponse({ queue: pendingChars || [] });
    } catch (e) {
        console.error("Moderation queue fetch error", e);
        return errorResponse("Database error", 500);
    }
}

export async function onRequestPost(context) {
    const { env, request, data } = context;
    const db = env.DB;
    
    if (data.user.role !== 'admin' && data.user.role !== 'moderator') {
        return errorResponse("Access denied: Admin or Moderator role required", 403);
    }
    
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }
    
    const { characterId, action, reason } = body;
    
    if (!characterId || !['approve', 'reject', 'delete'].includes(action)) {
        return errorResponse("Invalid parameters. Provide characterId and valid action (approve, reject, delete).", 400);
    }
    
    const nowMs = Date.now();
    let newStatus = action === 'approve' ? 'approved' : (action === 'reject' ? 'rejected' : 'deleted');
    
    try {
        // Load the current status first: moderation actions only apply to the
        // pending queue, and the audit entry must record the real previous
        // state — never a hardcoded assumption.
        const character = await db.prepare(
            "SELECT id, status FROM characters WHERE id = ? AND deleted_at_ms IS NULL"
        ).bind(characterId).first();

        if (!character) {
            return errorResponse("Character not found", 404);
        }
        if (character.status !== 'pending') {
            return errorResponse(`Character is not pending review (current status: ${character.status})`, 409);
        }

        const stmts = [];

        if (action === 'delete') {
            stmts.push(db.prepare(`
                UPDATE characters
                SET status = 'deleted', deleted_at_ms = ?, reviewed_by_user_id = ?, reviewed_at_ms = ?, review_reason = ?
                WHERE id = ? AND status = 'pending'
            `).bind(nowMs, data.user.id, nowMs, reason || 'Deleted by moderator', characterId));
        } else {
            stmts.push(db.prepare(`
                UPDATE characters
                SET status = ?, reviewed_by_user_id = ?, reviewed_at_ms = ?, review_reason = ?
                WHERE id = ? AND status = 'pending'
            `).bind(newStatus, data.user.id, nowMs, reason || null, characterId));
        }

        // Log in audit log
        const auditId = generateUUID();
        stmts.push(db.prepare(`
            INSERT INTO audit_log (id, actor_user_id, action, target_type, target_id, reason, metadata_json, created_at_ms)
            VALUES (?, ?, ?, 'character', ?, ?, ?, ?)
        `).bind(auditId, data.user.id, `character_${action}`, characterId, reason || null, JSON.stringify({ previousStatus: character.status, newStatus }), nowMs));

        await db.batch(stmts);

        return successResponse({ message: `Character ${action}d successfully`, characterId, status: newStatus });
    } catch (e) {
        console.error("Moderation action error", e);
        return errorResponse("Failed to update character status", 500);
    }
}
