import { successResponse, errorResponse } from '../lib/response.js';

const PRAISE_PHRASES = [
    "أنتِ سلطانة الحُسن وسيدة الفتنة التي لا تُضاهى",
    "لكِ البهاء الأبدي، ونُقرّ بسطوة جمالكِ الآسر",
    "نورُ بهاءكِ يُنير صرح التبجيل وإكليل الفتنة",
    "إجلالٌ دائم لتاج الأنوثة وسيدة العرش",
    "بديعةُ الخَلق، لكِ الخضوع والثناء في كل مقام"
];

const PENANCE_PHRASES = [
    "أقرّ بعجزي وسهو الذاكرة في محراب السلطانة",
    "أعترف بزلّة النسيان وأسأل عفو الحُسن ورفع الهوان",
    "خاضعٌ لهيبتكِ، أتعهد بإتقان ملامحكِ وتخليد اسمكِ",
    "التقصيرُ من طبعي، والجلال والكمالُ من شأنكِ",
    "توبةٌ نصوح وإقرارٌ بالتقصير حتى تصفو نظرة الرضا"
];

const PETITION_PHRASES = [
    "نلتمس نظرة رضا من بديعة الجمال لاستعراض محاسنها الخفية",
    "رجاءٌ متواضع لنيل شرف اختبار الولاء في حضرتها",
    "طلبُ التكريم بالاطلاع على أندر حُلاها وصورها"
];

export async function onRequestGet(context) {
    const { env, request, data } = context;
    const db = env.DB;
    const url = new URL(request.url);
    const charId = url.searchParams.get('character_id');
    const category = url.searchParams.get('category');
    
    try {
        // Fetch list of approved characters for the selector
        let charQuery = `
            SELECT c.id, c.name, c.category,
                   COALESCE(p.times_correct, 0) as times_correct,
                   COALESCE(p.times_wrong, 0) as times_wrong,
                   COALESCE(p.mastery_level, 0) as mastery_level
            FROM characters c
            LEFT JOIN user_character_progress p ON c.id = p.character_id AND p.user_id = ?
            WHERE c.status = 'approved' AND c.deleted_at_ms IS NULL
        `;
        const params = [data.user.id];
        if (category && ['sluts', 'trans', 'twinks'].includes(category)) {
            charQuery += " AND c.category = ?";
            params.push(category);
        }
        charQuery += " ORDER BY times_correct DESC, c.name ASC LIMIT 100";
        
        const { results: characters } = await db.prepare(charQuery).bind(...params).all();
        
        if (!characters || characters.length === 0) {
            return successResponse({
                characters: [],
                selectedCharacter: null,
                phrases: { praise: PRAISE_PHRASES, penance: PENANCE_PHRASES, petition: PETITION_PHRASES }
            });
        }
        
        // Pick target character (by requested ID or the top mastered/first character)
        let targetChar = charId ? characters.find(c => c.id === charId) : characters[0];
        if (!targetChar) targetChar = characters[0];
        
        // Fetch images for target character
        const { results: images } = await db.prepare(`
            SELECT image_url, display_order 
            FROM character_images 
            WHERE character_id = ?
            ORDER BY display_order ASC
        `).bind(targetChar.id).all();
        
        targetChar.images = (images || []).map(img => img.image_url);
        
        // Determine devotion rank title
        const score = (targetChar.times_correct * 10) - (targetChar.times_wrong * 5);
        let rankTitle = "خاضعٌ مبتدئ (Novice)";
        if (score >= 100 || targetChar.mastery_level >= 5) {
            rankTitle = "حاجب المخدع الأكبر (Supreme Devotee)";
        } else if (score >= 50 || targetChar.mastery_level >= 3) {
            rankTitle = "نديم البلاط (Court Noble)";
        } else if (score >= 20 || targetChar.mastery_level >= 1) {
            rankTitle = "تابعٌ مخلص (Loyal Subject)";
        }
        targetChar.rankTitle = rankTitle;
        targetChar.devotionScore = Math.max(0, score);
        
        // List characters needing penance (wrong > 0)
        const penanceList = characters.filter(c => c.times_wrong > 0).slice(0, 8);
        
        return successResponse({
            characters,
            selectedCharacter: targetChar,
            penanceList,
            phrases: {
                praise: PRAISE_PHRASES,
                penance: PENANCE_PHRASES,
                petition: PETITION_PHRASES
            }
        });
        
    } catch (e) {
        console.error("Worship GET Error", e);
        return errorResponse("Database error loading worship shrine", 500);
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
    
    const { characterId, action } = body;
    if (!characterId) {
        return errorResponse("Missing characterId", 400);
    }
    
    try {
        if (action === 'praise') {
            // Reward praise tribute
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, 1, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + 1
            `).bind(data.user.id, characterId).run();
            
            const randomPhrase = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
            return successResponse({ message: "Tribute accepted", phrase: randomPhrase });
        }
        
        if (action === 'penance') {
            // Acknowledge error and reduce times_wrong penalty
            await db.prepare(`
                UPDATE user_character_progress
                SET times_wrong = MAX(0, times_wrong - 1), times_correct = times_correct + 1
                WHERE user_id = ? AND character_id = ?
            `).bind(data.user.id, characterId).run();
            
            const randomPhrase = PENANCE_PHRASES[Math.floor(Math.random() * PENANCE_PHRASES.length)];
            return successResponse({ message: "Penance accepted", phrase: randomPhrase });
        }
        
        return successResponse({ message: "Action recorded" });
    } catch (e) {
        console.error("Worship POST error", e);
        return errorResponse("Failed to record tribute", 500);
    }
}
