import { successResponse, errorResponse } from '../lib/response.js';
import { getDevotionRank } from './worship.js';

export async function onRequestGet(context) {
    const { env, request, data } = context;
    const db = env.DB;
    const url = new URL(request.url);
    
    const type = url.searchParams.get('type') || 'devotees'; // 'devotees', 'stars', 'users'
    const category = url.searchParams.get('category') || 'all'; // 'all', 'trans', 'sluts', 'twinks'
    const filter = url.searchParams.get('filter') || 'devotion'; // 'devotion', 'surahs', 'meditation', 'streaks', 'character'
    const characterId = url.searchParams.get('characterId');
    const nowMs = Date.now();
    const oneWeekAgoMs = nowMs - (7 * 24 * 60 * 60 * 1000);

    try {
        // ── 1. Devotee Pantheon Leaderboard (ديوان صفوة العباد) ───────────────
        if (type === 'devotees' || type === 'worship') {
            if (filter === 'character' && characterId) {
                // Character-specific devotee leaderboard
                const { results: devoteeRows } = await db.prepare(`
                    SELECT 
                        u.id, u.username, u.x_handle, u.role,
                        COALESCE(MAX(0, p.times_correct * 10 - p.times_wrong * 5), 0) as char_devotion,
                        COALESCE(p.times_correct, 0) as char_tributes,
                        COALESCE(dev.total_devotion, 0) as devotion_points,
                        COALESCE(sur.sealed_count, 0) as sealed_surahs,
                        COALESCE(med.meditation_minutes, 0) as meditation_minutes,
                        COALESCE(str.current_streak, 0) as current_streak
                    FROM user_character_progress p
                    JOIN users u ON u.id = p.user_id
                    LEFT JOIN (
                        SELECT user_id, MAX(0, SUM(times_correct * 10 - times_wrong * 5)) as total_devotion
                        FROM user_character_progress GROUP BY user_id
                    ) dev ON dev.user_id = u.id
                    LEFT JOIN (
                        SELECT user_id, COUNT(DISTINCT meta) as sealed_count
                        FROM worship_events WHERE rite = 'seal_surah' AND meta IS NOT NULL GROUP BY user_id
                    ) sur ON sur.user_id = u.id
                    LEFT JOIN (
                        SELECT user_id, COUNT(*) as meditation_minutes
                        FROM worship_events WHERE rite = 'meditation_minute' GROUP BY user_id
                    ) med ON med.user_id = u.id
                    LEFT JOIN daily_streaks str ON str.user_id = u.id
                    WHERE p.character_id = ? AND u.status = 'approved' AND u.deleted_at_ms IS NULL
                    ORDER BY char_devotion DESC, char_tributes DESC, u.username ASC
                    LIMIT 50
                `).bind(characterId).all();

                const leaderboard = (devoteeRows || []).map((row, index) => {
                    const rankObj = getDevotionRank(row.devotion_points || 0);
                    return {
                        rank: index + 1,
                        userId: row.id,
                        username: row.username,
                        xHandle: row.x_handle || null,
                        role: row.role,
                        charDevotion: row.char_devotion || 0,
                        charTributes: row.char_tributes || 0,
                        devotionPoints: row.devotion_points || 0,
                        sealedSurahs: row.sealed_surahs || 0,
                        meditationMinutes: row.meditation_minutes || 0,
                        currentStreak: row.current_streak || 0,
                        rankTitle: rankObj?.title || 'عديم الوجود والقيمة',
                        rankBadge: rankObj?.badge || '👑',
                        isMe: row.id === data.user.id
                    };
                });

                return successResponse({ leaderboard, type: 'devotees', filter, characterId });
            }

            // General Devotee Leaderboards (devotion, surahs, meditation, streaks)
            let orderBy = 'devotion_points DESC, tributes_count DESC, u.created_at_ms ASC';
            if (filter === 'surahs') {
                orderBy = 'sealed_surahs DESC, devotion_points DESC, u.created_at_ms ASC';
            } else if (filter === 'meditation') {
                orderBy = 'meditation_minutes DESC, devotion_points DESC, u.created_at_ms ASC';
            } else if (filter === 'streaks') {
                orderBy = 'current_streak DESC, longest_streak DESC, devotion_points DESC, u.created_at_ms ASC';
            }

            let devoteeRows = [];
            try {
                const { results } = await db.prepare(`
                    SELECT 
                        u.id, u.username, u.x_handle, u.role,
                        COALESCE(dev.devotion, 0) as devotion_points,
                        COALESCE(dev.tributes, 0) as tributes_count,
                        COALESCE(sur.sealed_count, 0) as sealed_surahs,
                        COALESCE(med.meditation_minutes, 0) as meditation_minutes,
                        COALESCE(str.current_streak, 0) as current_streak,
                        COALESCE(str.longest_streak, 0) as longest_streak
                    FROM users u
                    LEFT JOIN (
                        SELECT user_id, 
                               MAX(0, SUM(times_correct * 10 - times_wrong * 5)) as devotion,
                               SUM(times_correct) as tributes
                        FROM user_character_progress 
                        GROUP BY user_id
                    ) dev ON dev.user_id = u.id
                    LEFT JOIN (
                        SELECT user_id, COUNT(DISTINCT meta) as sealed_count
                        FROM worship_events
                        WHERE rite = 'seal_surah' AND meta IS NOT NULL
                        GROUP BY user_id
                    ) sur ON sur.user_id = u.id
                    LEFT JOIN (
                        SELECT user_id, COUNT(*) as meditation_minutes
                        FROM worship_events
                        WHERE rite = 'meditation_minute'
                        GROUP BY user_id
                    ) med ON med.user_id = u.id
                    LEFT JOIN daily_streaks str ON str.user_id = u.id
                    WHERE u.status = 'approved' AND u.deleted_at_ms IS NULL
                    ORDER BY ${orderBy}
                    LIMIT 50
                `).all();
                devoteeRows = results || [];
            } catch (err) {
                console.warn("Devotee leaderboard query fallback", err);
                const { results } = await db.prepare(`
                    SELECT 
                        u.id, u.username, u.x_handle, u.role,
                        COALESCE(dev.devotion, 0) as devotion_points,
                        COALESCE(dev.tributes, 0) as tributes_count,
                        0 as sealed_surahs,
                        0 as meditation_minutes,
                        COALESCE(str.current_streak, 0) as current_streak,
                        COALESCE(str.longest_streak, 0) as longest_streak
                    FROM users u
                    LEFT JOIN (
                        SELECT user_id, 
                               MAX(0, SUM(times_correct * 10 - times_wrong * 5)) as devotion,
                               SUM(times_correct) as tributes
                        FROM user_character_progress 
                        GROUP BY user_id
                    ) dev ON dev.user_id = u.id
                    LEFT JOIN daily_streaks str ON str.user_id = u.id
                    WHERE u.status = 'approved' AND u.deleted_at_ms IS NULL
                    ORDER BY devotion_points DESC, tributes_count DESC
                    LIMIT 50
                `).all();
                devoteeRows = results || [];
            }

            const leaderboard = devoteeRows.map((row, index) => {
                const rankObj = getDevotionRank(row.devotion_points || 0);
                return {
                    rank: index + 1,
                    userId: row.id,
                    username: row.username,
                    xHandle: row.x_handle || null,
                    role: row.role,
                    devotionPoints: row.devotion_points || 0,
                    tributesCount: row.tributes_count || 0,
                    sealedSurahs: row.sealed_surahs || 0,
                    meditationMinutes: row.meditation_minutes || 0,
                    currentStreak: row.current_streak || 0,
                    longestStreak: row.longest_streak || 0,
                    rankTitle: rankObj?.title || 'عديم الوجود والقيمة',
                    rankBadge: rankObj?.badge || '👑',
                    isMe: row.id === data.user.id
                };
            });

            return successResponse({ leaderboard, type: 'devotees', filter });
        }

        // ── 2. Supreme Deity Leaderboard (عَرْشُ الإِلَهِ الأَكْبَر) ─────────────
        if (type === 'goddesses' || type === 'supreme' || type === 'deity') {
            // Community aggregates count APPROVED members only — consistent
            // with the topDevotee gate below (a banned whale must not crown a
            // goddess while being barred from her champion card).
            // NOTE: MAX(0, expr) is SQLite's two-argument SCALAR max here;
            // do not collapse it to single-arg MAX inside SUM or the query
            // becomes an illegal nested aggregate.
            let query = `
                SELECT
                    c.id,
                    c.name,
                    c.category,
                    c.label,
                    c.created_at_ms,
                    COALESCE(SUM(CASE WHEN pu.id IS NOT NULL THEN MAX(0, p.times_correct * 10 - p.times_wrong * 5) ELSE 0 END), 0) as total_community_devotion,
                    COALESCE(SUM(CASE WHEN pu.id IS NOT NULL THEN p.times_correct ELSE 0 END), 0) as total_community_tributes,
                    COUNT(DISTINCT CASE WHEN pu.id IS NOT NULL AND (p.times_correct > 0 OR p.times_wrong > 0) THEN p.user_id ELSE NULL END) as total_devotees_count
                FROM characters c
                LEFT JOIN user_character_progress p ON c.id = p.character_id
                LEFT JOIN users pu ON pu.id = p.user_id AND pu.status = 'approved' AND pu.deleted_at_ms IS NULL
                WHERE c.status = 'approved' AND c.deleted_at_ms IS NULL
            `;
            const params = [];
            if (category && category !== 'all' && category !== 'total') {
                query += ` AND c.category = ?`;
                params.push(category);
            }

            query += `
                GROUP BY c.id
                ORDER BY total_community_devotion DESC, total_community_tributes DESC, c.name ASC
                LIMIT 50
            `;

            const { results } = await db.prepare(query).bind(...params).all();
            const charList = results || [];

            if (charList.length > 0) {
                const charIds = charList.map(c => c.id);
                const imgMap = {};
                const topDevoteeMap = {};

                // Fetch primary images in chunks
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
                        if (!imgMap[img.character_id]) imgMap[img.character_id] = img.image_url;
                    });

                    // Fetch top devotee champion for each character
                    const { results: topDevoteesChunk } = await db.prepare(`
                        SELECT p.character_id, u.username,
                               MAX(0, p.times_correct * 10 - p.times_wrong * 5) as devotion
                        FROM user_character_progress p
                        JOIN users u ON u.id = p.user_id
                        WHERE p.character_id IN (${placeholders}) 
                          AND u.status = 'approved' AND (p.times_correct > 0 OR p.times_wrong > 0)
                        ORDER BY p.character_id, devotion DESC, p.times_correct DESC, u.username ASC
                    `).bind(...chunk).all();

                    (topDevoteesChunk || []).forEach(dev => {
                        if (!topDevoteeMap[dev.character_id]) {
                            topDevoteeMap[dev.character_id] = {
                                username: dev.username,
                                devotion: dev.devotion
                            };
                        }
                    });
                }

                charList.forEach(char => {
                    char.image = imgMap[char.id] || '';
                    char.topDevotee = topDevoteeMap[char.id] || null;
                });
            }

            const leaderboard = charList.map((row, index) => ({
                rank: index + 1,
                id: row.id,
                name: row.name,
                category: row.category,
                label: row.label,
                image: row.image || '',
                totalCommunityDevotion: row.total_community_devotion || 0,
                totalCommunityTributes: row.total_community_tributes || 0,
                totalDevoteesCount: row.total_devotees_count || 0,
                topDevotee: row.topDevotee || null
            }));

            return successResponse({ leaderboard, type: 'goddesses', category });
        }

        if (type === 'stars' || type === 'characters' || type === 'pornstars') {
            // Character / Pornstar accuracy leaderboard (least errors by players)
            let query = `
                SELECT 
                    c.id, 
                    c.name, 
                    c.category, 
                    c.label, 
                    c.created_at_ms,
                    COALESCE(SUM(CASE WHEN ae.is_correct = 1 THEN 1 ELSE 0 END), 0) as correct_count,
                    COALESCE(SUM(CASE WHEN ae.is_correct = 0 THEN 1 ELSE 0 END), 0) as wrong_count,
                    COUNT(ae.answer_id) as total_answers,
                    COALESCE(SUM(CASE WHEN ae.is_correct = 1 AND ae.created_at_ms >= ? THEN 1 ELSE 0 END), 0) as recent_correct,
                    COALESCE(SUM(CASE WHEN ae.is_correct = 0 AND ae.created_at_ms >= ? THEN 1 ELSE 0 END), 0) as recent_wrong
                FROM characters c
                LEFT JOIN answer_events ae ON c.id = ae.character_id
                WHERE c.status = 'approved' AND c.deleted_at_ms IS NULL
            `;
            
            const params = [oneWeekAgoMs, oneWeekAgoMs];
            
            if (category && category !== 'all' && category !== 'total') {
                query += ` AND c.category = ?`;
                params.push(category);
            }
            
            query += `
                GROUP BY c.id
                ORDER BY 
                    CASE WHEN (COALESCE(SUM(CASE WHEN ae.is_correct = 1 THEN 1 ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN ae.is_correct = 0 THEN 1 ELSE 0 END), 0)) > 0 THEN 0 ELSE 1 END,
                    (CAST(COALESCE(SUM(CASE WHEN ae.is_correct = 1 THEN 1 ELSE 0 END), 0) AS FLOAT) / (COALESCE(SUM(CASE WHEN ae.is_correct = 1 THEN 1 ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN ae.is_correct = 0 THEN 1 ELSE 0 END), 0) + 0.0001)) DESC,
                    wrong_count ASC,
                    correct_count DESC,
                    c.created_at_ms DESC
                LIMIT 50
            `;
            
            const { results } = await db.prepare(query).bind(...params).all();
            const charList = results || [];

            // Fetch primary image for each character
            if (charList.length > 0) {
                const charIds = charList.map(c => c.id);
                const imgMap = {};
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
                        if (!imgMap[img.character_id]) imgMap[img.character_id] = img.image_url;
                    });
                }

                charList.forEach(char => {
                    char.image = imgMap[char.id] || '';
                });
            }

            const leaderboard = charList.map((row, index) => {
                const total = row.correct_count + row.wrong_count;
                const accuracy = total > 0 ? ((row.correct_count / total) * 100) : 100;
                
                // Calculate trend movement from real recent activity only;
                // low-activity entries honestly report 'same' instead of a
                // fabricated pseudo-random direction.
                const recentTotal = row.recent_correct + row.recent_wrong;
                let trend = 'same'; // 'up', 'down', 'same'
                if (recentTotal >= 3) {
                    const recentAccuracy = (row.recent_correct / recentTotal) * 100;
                    if (recentAccuracy > accuracy + 1.5) trend = 'up';
                    else if (recentAccuracy < accuracy - 1.5) trend = 'down';
                }

                // Format duration in rank / on charts
                const ageMs = Math.max(1000, nowMs - (row.created_at_ms || (nowMs - 86400000)));
                const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
                let durationText = '';
                if (ageDays === 0) durationText = 'Today';
                else if (ageDays === 1) durationText = '1d in rank';
                else if (ageDays < 7) durationText = `${ageDays}d in rank`;
                else if (ageDays < 30) durationText = `${Math.floor(ageDays / 7)}w in rank`;
                else durationText = `${Math.floor(ageDays / 30)}mo in rank`;

                return {
                    rank: index + 1,
                    id: row.id,
                    name: row.name,
                    category: row.category,
                    label: row.label,
                    image: row.image,
                    correctAnswers: row.correct_count,
                    wrongAnswers: row.wrong_count,
                    totalAnswers: total,
                    accuracy: Math.round(accuracy * 10) / 10,
                    trend: trend,
                    duration: durationText
                };
            });

            return successResponse({ leaderboard, type: 'stars', category });
        }

        // Users Contributor Leaderboard
        let query = `
            SELECT u.id, u.username, u.role,
                   COUNT(c.id) as total_added,
                   SUM(CASE WHEN c.category = 'trans' THEN 1 ELSE 0 END) as trans_count,
                   SUM(CASE WHEN c.category = 'sluts' THEN 1 ELSE 0 END) as sluts_count,
                   SUM(CASE WHEN c.category = 'twinks' THEN 1 ELSE 0 END) as twinks_count
            FROM users u
            JOIN characters c ON u.id = c.submitted_by_user_id
            WHERE c.status = 'approved' AND c.deleted_at_ms IS NULL
            GROUP BY u.id
        `;
        
        if (category === 'trans') {
            query += ` ORDER BY trans_count DESC, total_added DESC, u.username ASC LIMIT 50`;
        } else if (category === 'sluts') {
            query += ` ORDER BY sluts_count DESC, total_added DESC, u.username ASC LIMIT 50`;
        } else if (category === 'twinks') {
            query += ` ORDER BY twinks_count DESC, total_added DESC, u.username ASC LIMIT 50`;
        } else {
            query += ` ORDER BY total_added DESC, trans_count DESC, sluts_count DESC, twinks_count DESC, u.username ASC LIMIT 50`;
        }
        
        const { results } = await db.prepare(query).all();
        
        const leaderboard = (results || []).map((row, index) => ({
            rank: index + 1,
            userId: row.id,
            username: row.username,
            role: row.role,
            totalAdded: row.total_added,
            transCount: row.trans_count,
            slutsCount: row.sluts_count,
            twinksCount: row.twinks_count,
            isMe: row.id === data.user.id
        }));
        
        return successResponse({ leaderboard, type: 'users', category });
        
    } catch (e) {
        console.error("Leaderboard fetch error", e);
        return errorResponse("Failed to fetch leaderboard", 500);
    }
}
