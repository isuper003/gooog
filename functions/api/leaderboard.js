import { successResponse, errorResponse } from '../lib/response.js';

export async function onRequestGet(context) {
    const { env, request, data } = context;
    const db = env.DB;
    const url = new URL(request.url);
    
    const type = url.searchParams.get('type') || 'users'; // 'users' or 'stars' / 'pornstars'
    const category = url.searchParams.get('category') || 'all'; // 'all' (or 'total'), 'trans', 'sluts', 'twinks'
    const nowMs = Date.now();
    const oneWeekAgoMs = nowMs - (7 * 24 * 60 * 60 * 1000);

    try {
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
