import { successResponse, errorResponse } from '../lib/response.js';

export async function onRequestGet(context) {
    const { env, request, data } = context;
    const db = env.DB;
    const url = new URL(request.url);
    
    const category = url.searchParams.get('category');
    const sort = url.searchParams.get('sort') || 'mastery'; // 'mastery', 'most_correct', 'most_wrong', 'success_rate'
    
    try {
        let query = `
            SELECT c.id, c.name, c.category, c.label,
                   COALESCE(p.mastery_level, 0) as mastery_level,
                   COALESCE(p.correct_streak, 0) as correct_streak,
                   COALESCE(p.times_shown, 0) as times_shown,
                   COALESCE(p.times_correct, 0) as times_correct,
                   COALESCE(p.times_wrong, 0) as times_wrong,
                   COALESCE(p.due_at_ms, 0) as due_at_ms,
                   CASE 
                       WHEN COALESCE(p.times_shown, 0) = 0 THEN 0
                       ELSE ROUND((CAST(p.times_correct AS REAL) / p.times_shown) * 100, 1)
                   END as success_rate
            FROM characters c
            LEFT JOIN user_character_progress p ON c.id = p.character_id AND p.user_id = ?
            WHERE c.status = 'approved' AND c.deleted_at_ms IS NULL
        `;
        
        const params = [data.user.id];
        if (category && category !== 'all') {
            query += ` AND c.category = ?`;
            params.push(category);
        }
        
        switch (sort) {
            case 'most_correct':
                query += ` ORDER BY times_correct DESC, times_shown DESC`;
                break;
            case 'most_wrong':
                query += ` ORDER BY times_wrong DESC, times_shown DESC`;
                break;
            case 'success_rate':
                query += ` ORDER BY success_rate DESC, times_shown DESC`;
                break;
            case 'mastery':
            default:
                query += ` ORDER BY mastery_level DESC, times_shown DESC`;
                break;
        }
        
        const { results } = await db.prepare(query).bind(...params).all();
        
        if (results.length > 0) {
            const charIds = results.map(r => `'${r.id}'`).join(',');
            const { results: images } = await db.prepare(`
                SELECT character_id, image_url, display_order 
                FROM character_images 
                WHERE character_id IN (${charIds})
                ORDER BY character_id, display_order
            `).all();
            
            const imageMap = {};
            images.forEach(img => {
                if (!imageMap[img.character_id]) imageMap[img.character_id] = [];
                imageMap[img.character_id].push(img.image_url);
            });
            
            results.forEach(char => {
                char.images = imageMap[char.id] || [];
            });
        }
        
        // Compute overall user stats summary
        const summary = {
            totalCharacters: results.length,
            masteredCount: results.filter(r => r.mastery_level >= 5).length,
            learningCount: results.filter(r => r.mastery_level >= 1 && r.mastery_level < 5).length,
            weakCount: results.filter(r => r.mastery_level === 1 || (r.times_wrong > r.times_correct && r.times_shown > 0)).length,
            dueCount: results.filter(r => r.due_at_ms > 0 && r.due_at_ms <= Date.now()).length
        };
        
        return successResponse({ stats: results, summary });
        
    } catch (e) {
        console.error("Stats fetch error", e);
        return errorResponse("Failed to fetch character stats", 500);
    }
}
