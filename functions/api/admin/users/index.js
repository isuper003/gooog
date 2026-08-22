import { successResponse, errorResponse } from '../../../lib/response.js';
import { isStaff, forbidden } from '../_guard.js';

// GET /api/admin/users
// Blueprint §2.B — paginated directory with search + status/role filters and
// per-user telemetry aggregates (devotion, accuracy, games) joined in one pass.
export async function onRequestGet(context) {
    const { env, request, data } = context;
    const db = env.DB;

    if (!isStaff(data.user)) return forbidden();

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status') || 'all';
    const roleFilter = url.searchParams.get('role') || 'all';
    const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 40);
    const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit')) || 50));
    const offset = (page - 1) * limit;

    try {
        let where = 'WHERE 1=1';
        const params = [];

        if (statusFilter === 'active') {
            where += ` AND u.status = 'approved'`;
        } else if (['pending', 'rejected', 'banned', 'approved'].includes(statusFilter)) {
            where += ` AND u.status = ?`;
            params.push(statusFilter);
        }

        if (roleFilter === 'staff') {
            where += ` AND u.role IN ('admin','moderator')`;
        }

        if (q) {
            where += ` AND (LOWER(u.username) LIKE ? OR LOWER(COALESCE(u.x_handle,'')) LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }

        const listQuery = `
            SELECT u.id, u.username, u.x_handle, u.role, u.status,
                   u.rejection_reason, u.application_note, u.created_at_ms, u.deleted_at_ms,
                   COALESCE(s.last_seen_at_ms, 0) as last_active_ms,
                   COALESCE(dev.devotion, 0) as devotion_points,
                   COALESCE(ae.total_answers, 0) as total_answers,
                   COALESCE(ae.correct_answers, 0) as correct_answers,
                   COALESCE(gs.games_played, 0) as games_played
            FROM users u
            LEFT JOIN (
                SELECT user_id, MAX(last_seen_at_ms) as last_seen_at_ms
                FROM sessions GROUP BY user_id
            ) s ON s.user_id = u.id
            LEFT JOIN (
                SELECT p.user_id,
                       MAX(0, SUM(p.times_correct * 10 - p.times_wrong * 5)) as devotion
                FROM user_character_progress p GROUP BY p.user_id
            ) dev ON dev.user_id = u.id
            LEFT JOIN (
                SELECT user_id,
                       COUNT(*) as total_answers,
                       SUM(is_correct) as correct_answers
                FROM answer_events GROUP BY user_id
            ) ae ON ae.user_id = u.id
            LEFT JOIN (
                SELECT user_id, COUNT(*) as games_played
                FROM game_sessions WHERE state = 'completed' GROUP BY user_id
            ) gs ON gs.user_id = u.id
            ${where}
            ORDER BY u.created_at_ms DESC
            LIMIT ? OFFSET ?
        `;
        const { results } = await db.prepare(listQuery).bind(...params, limit, offset).all();

        const countParams = params.slice();
        const { results: countRows } = await db.prepare(
            `SELECT COUNT(*) as total FROM users u ${where}`
        ).bind(...countParams).all();

        // Global telemetry chips (blueprint §2 header).
        const { results: telemetry } = await db.prepare(`
            SELECT COUNT(*) as total_members,
                   SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                   SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as active_count,
                   SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) as banned_count
            FROM users WHERE deleted_at_ms IS NULL
        `).all();

        return successResponse({
            users: (results || []).map(row => ({
                id: row.id,
                username: row.username,
                xHandle: row.x_handle || null,
                role: row.role,
                status: row.status,
                rejectionReason: row.rejection_reason || null,
                applicationNote: row.application_note || null,
                createdAtMs: row.created_at_ms,
                deleted: !!row.deleted_at_ms,
                lastActiveMs: row.last_active_ms || null,
                telemetry: {
                    devotionPoints: row.devotion_points,
                    accuracyPct: row.total_answers > 0
                        ? Math.round((row.correct_answers / row.total_answers) * 1000) / 10
                        : null,
                    totalAnswers: row.total_answers,
                    gamesPlayed: row.games_played
                }
            })),
            page,
            limit,
            total: countRows?.[0]?.total || 0,
            telemetry: telemetry?.[0] || {}
        });
    } catch (e) {
        console.error("Admin users list error", e);
        return errorResponse("Failed to fetch users", 500);
    }
}
