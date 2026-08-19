import { successResponse, errorResponse } from '../../lib/response.js';

export async function onRequestGet(context) {
    const { env, data } = context;
    const db = env.DB;
    
    try {
        const stmt = db.prepare("SELECT current_streak, longest_streak, last_login_date_utc, unlocked_milestones_json FROM daily_streaks WHERE user_id = ?").bind(data.user.id);
        const streak = await stmt.first();
        
        let milestones = [];
        try {
            if (streak?.unlocked_milestones_json) {
                milestones = JSON.parse(streak.unlocked_milestones_json);
            }
        } catch (e) {}
        
        return successResponse({
            currentStreak: streak ? streak.current_streak : 1,
            longestStreak: streak ? streak.longest_streak : 1,
            lastLoginDateUtc: streak ? streak.last_login_date_utc : new Date().toISOString().split('T')[0],
            unlockedMilestones: milestones
        });
    } catch (e) {
        console.error("Streak fetch error", e);
        return errorResponse("Failed to fetch streak", 500);
    }
}
