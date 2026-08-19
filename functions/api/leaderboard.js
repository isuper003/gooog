import { successResponse, errorResponse } from '../lib/response.js';

export async function onRequestGet(context) {
    const { env, request, data } = context;
    const db = env.DB;
    const url = new URL(request.url);
    
    const category = url.searchParams.get('category') || 'total'; // 'total', 'trans', 'sluts', 'twinks'
    
    try {
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
            query += ` ORDER BY trans_count DESC, total_added DESC LIMIT 50`;
        } else if (category === 'sluts') {
            query += ` ORDER BY sluts_count DESC, total_added DESC LIMIT 50`;
        } else if (category === 'twinks') {
            query += ` ORDER BY twinks_count DESC, total_added DESC LIMIT 50`;
        } else {
            query += ` ORDER BY total_added DESC LIMIT 50`;
        }
        
        const { results } = await db.prepare(query).all();
        
        const leaderboard = results.map((row, index) => ({
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
        
        return successResponse({ leaderboard, category });
        
    } catch (e) {
        console.error("Leaderboard fetch error", e);
        return errorResponse("Failed to fetch leaderboard", 500);
    }
}
