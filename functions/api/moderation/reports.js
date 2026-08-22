import { successResponse, errorResponse } from '../../lib/response.js';
import { generateUUID } from '../../lib/crypto.js';

export async function onRequestGet(context) {
    const { env, data } = context;
    const db = env.DB;
    
    if (data.user.role !== 'admin' && data.user.role !== 'moderator') {
        return errorResponse("Access denied: Admin or Moderator role required", 403);
    }
    
    try {
        // Paginated backlog: clamped limit + offset so item #51+ is reachable.
        const url = new URL(request.url);
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit')) || 50));
        const offset = Math.max(0, parseInt(url.searchParams.get('offset')) || 0);

        const { results: reports } = await db.prepare(`
            SELECT r.id, r.reason, r.note, r.status, r.created_at_ms,
                   u.username as reporter,
                   c.id as character_id, c.name as character_name, c.category as character_category
            FROM content_reports r
            JOIN users u ON r.reporter_user_id = u.id
            LEFT JOIN characters c ON r.character_id = c.id
            WHERE r.status = 'open'
            ORDER BY r.created_at_ms DESC
            LIMIT ? OFFSET ?
        `).bind(limit, offset).all();

        return successResponse({ reports: reports || [], limit, offset });
    } catch (e) {
        console.error("Fetch reports error", e);
        return errorResponse("Failed to fetch reports", 500);
    }
}

export async function onRequestPost(context) {
    const { env, request, data } = context;
    const db = env.DB;
    
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }
    
    const { characterId, reason, note } = body;
    const validReasons = ['copyright', 'wrong_identity', 'duplicate', 'unsafe_content', 'other'];
    
    if (!characterId || !validReasons.includes(reason)) {
        return errorResponse("Invalid report data. Specify characterId and valid reason.", 400);
    }
    
    const reportId = generateUUID();
    const nowMs = Date.now();
    
    try {
        await db.prepare(`
            INSERT INTO content_reports (id, reporter_user_id, character_id, reason, note, status, created_at_ms)
            VALUES (?, ?, ?, ?, ?, 'open', ?)
        `).bind(reportId, data.user.id, characterId, reason, (note || '').slice(0, 1000), nowMs).run();
        
        return successResponse({ message: "Report submitted for review. Thank you for keeping the community safe!", id: reportId }, 201);
    } catch (e) {
        console.error("Submit report error", e);
        return errorResponse("Failed to submit report", 500);
    }
}

export async function onRequestPatch(context) {
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
    
    const { reportId, status } = body;
    if (!reportId || !['resolved', 'dismissed'].includes(status)) {
        return errorResponse("Invalid parameters", 400);
    }
    
    const nowMs = Date.now();
    
    try {
        // Only open reports are resolvable: re-resolving or acting on unknown
        // ids must fail loudly instead of silently "succeeding" on 0 rows.
        const result = await db.prepare(`
            UPDATE content_reports
            SET status = ?, resolved_by_user_id = ?, resolved_at_ms = ?
            WHERE id = ? AND status = 'open'
        `).bind(status, data.user.id, nowMs, reportId).run();

        if (!result.meta || result.meta.changes === 0) {
            return errorResponse("Report not found or already resolved", 404);
        }

        return successResponse({ message: `Report marked as ${status}`, reportId });
    } catch (e) {
        console.error("Resolve report error", e);
        return errorResponse("Failed to update report", 500);
    }
}
