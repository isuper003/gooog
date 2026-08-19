import { successResponse, errorResponse } from '../../lib/response.js';

export async function onRequestGet(context) {
    const { env, data } = context;
    const db = env.DB;
    
    try {
        const statsStmt = db.prepare(`
            SELECT 
                COUNT(*) as total_tracked,
                SUM(CASE WHEN mastery_level = 5 THEN 1 ELSE 0 END) as mastered_count,
                SUM(CASE WHEN mastery_level BETWEEN 1 AND 4 THEN 1 ELSE 0 END) as learning_count,
                SUM(CASE WHEN mastery_level = 0 OR (times_wrong > times_correct AND times_shown > 0) THEN 1 ELSE 0 END) as weak_count,
                SUM(CASE WHEN due_at_ms <= ? THEN 1 ELSE 0 END) as due_count,
                SUM(times_shown) as total_answers,
                SUM(times_correct) as total_correct,
                SUM(times_wrong) as total_wrong
            FROM user_character_progress
            WHERE user_id = ?
        `).bind(Date.now(), data.user.id);
        
        const summary = await statsStmt.first();
        
        const sessionsStmt = db.prepare(`
            SELECT COUNT(*) as total_sessions,
                   SUM(score) as total_score
            FROM game_sessions
            WHERE user_id = ? AND state = 'completed'
        `).bind(data.user.id);
        
        const sessionStats = await sessionsStmt.first();
        
        const totalAnswers = summary?.total_answers || 0;
        const totalCorrect = summary?.total_correct || 0;
        const accuracyRate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
        
        return successResponse({
            userId: data.user.id,
            username: data.user.username,
            totalTracked: summary?.total_tracked || 0,
            masteredCount: summary?.mastered_count || 0,
            learningCount: summary?.learning_count || 0,
            weakCount: summary?.weak_count || 0,
            dueCount: summary?.due_count || 0,
            totalAnswers,
            totalCorrect,
            accuracyRate,
            completedSessions: sessionStats?.total_sessions || 0,
            totalScore: sessionStats?.total_score || 0
        });
    } catch (e) {
        console.error("User progress fetch error", e);
        return errorResponse("Failed to fetch progress", 500);
    }
}
