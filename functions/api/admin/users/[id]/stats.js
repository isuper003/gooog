import { successResponse, errorResponse } from '../../../../lib/response.js';
import { isStaff, forbidden } from '../../_guard.js';
import { getDevotionRank, computeDevotionScore } from '../../../worship.js';

// GET /api/admin/users/:id/stats
// Blueprint §2.C — deep-dive dossier: gameplay, SRS mastery and Temple
// telemetry. Only metrics actually persisted in D1 are reported; rites that
// are not tracked server-side come back as null with an explicit note rather
// than fabricated numbers.
export async function onRequestGet(context) {
    const { env, params, data } = context;
    const db = env.DB;
    const targetId = params.id;

    if (!isStaff(data.user)) return forbidden();

    try {
        const user = await db.prepare(`
            SELECT id, username, x_handle, role, status, rejection_reason,
                   created_at_ms, deletion_requested_at_ms
            FROM users WHERE id = ?
        `).bind(targetId).first();
        if (!user) return errorResponse("User not found", 404);

        // ── Gameplay telemetry ────────────────────────────────────────────
        const gameplayRow = await db.prepare(`
            SELECT COUNT(*) as games_played,
                   COALESCE(SUM(score), 0) as total_score,
                   COALESCE(SUM(current_question_number), 0) as total_rounds
            FROM game_sessions WHERE user_id = ? AND state = 'completed'
        `).bind(targetId).first();

        const answersRow = await db.prepare(`
            SELECT COUNT(*) as total_answers,
                   SUM(is_correct) as correct_answers,
                   COALESCE(AVG(answer_time_ms), 0) as avg_answer_ms
            FROM answer_events WHERE user_id = ?
        `).bind(targetId).first();

        const streakRow = await db.prepare(
            "SELECT current_streak, longest_streak FROM daily_streaks WHERE user_id = ?"
        ).bind(targetId).first();

        // ── SRS mastery (disjoint buckets, same rules as /api/me/progress) ──
        const srsRow = await db.prepare(`
            SELECT
                COUNT(*) as tracked,
                SUM(CASE WHEN mastery_level = 5 THEN 1 ELSE 0 END) as mastered,
                SUM(CASE WHEN mastery_level BETWEEN 1 AND 4 AND NOT (
                        mastery_level = 0 OR (times_wrong > times_correct AND times_shown > 0)
                    ) THEN 1 ELSE 0 END) as learning,
                SUM(CASE WHEN (mastery_level = 0 OR (times_wrong > times_correct AND times_shown > 0))
                        AND mastery_level <= 4 THEN 1 ELSE 0 END) as weak
            FROM user_character_progress WHERE user_id = ?
        `).bind(targetId).first();

        // ── Temple & worship telemetry ─────────────────────────────────────
        const worshipRow = await db.prepare(`
            SELECT COALESCE(SUM(times_correct), 0) as tributes,
                   MAX(0, SUM(times_correct * 10 - times_wrong * 5)) as devotion
            FROM user_character_progress WHERE user_id = ?
        `).bind(targetId).first();

        const devotionScore = worshipRow?.devotion || 0;
        const rank = getDevotionRank(devotionScore);

        const lastActiveRow = await db.prepare(
            "SELECT MAX(last_seen_at_ms) as last_active FROM sessions WHERE user_id = ?"
        ).bind(targetId).first();

        return successResponse({
            account: {
                id: user.id,
                username: user.username,
                xHandle: user.x_handle || null,
                role: user.role,
                status: user.status,
                rejectionReason: user.rejection_reason || null,
                createdAtMs: user.created_at_ms,
                lastActiveMs: lastActiveRow?.last_active || null,
                deletionRequestedAtMs: user.deletion_requested_at_ms || null
            },
            gameplay: {
                gamesPlayed: gameplayRow?.games_played || 0,
                totalScore: gameplayRow?.total_score || 0,
                totalRounds: gameplayRow?.total_rounds || 0,
                winRatePct: answersRow?.total_answers > 0
                    ? Math.round((answersRow.correct_answers / answersRow.total_answers) * 1000) / 10
                    : null,
                avgAnswerSec: answersRow?.total_answers > 0
                    ? Math.round((answersRow.avg_answer_ms / 1000) * 10) / 10
                    : null,
                loginStreak: {
                    current: streakRow?.current_streak || 0,
                    longest: streakRow?.longest_streak || 0
                }
            },
            srs: {
                tracked: srsRow?.tracked || 0,
                mastered: srsRow?.mastered || 0,
                learning: srsRow?.learning || 0,
                weak: srsRow?.weak || 0
            },
            temple: {
                devotionPoints: devotionScore,
                rank: { title: rank.title, badge: rank.badge, tier: rank.tier },
                tributeCount: worshipRow?.tributes || 0,
                // Per-rite counters (sealed surahs, meditation minutes,
                // acknowledged commandments) are not persisted server-side yet.
                sealedSurahs: null,
                meditationMinutes: null,
                acknowledgedCommandments: null,
                untrackedNote: "Rite-specific counters require a worship events log; only aggregate tributes are tracked today."
            }
        });
    } catch (e) {
        console.error("User stats error", e);
        return errorResponse("Failed to fetch user stats", 500);
    }
}
