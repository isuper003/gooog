import { successResponse, errorResponse } from '../lib/response.js';

const PRAISE_PHRASES = [
    "أنتِ ملكة الكون وسلطانة الفتنة المطلقة، لكِ السطوة التامة والتبجيل الأبدي",
    "نُقرّ بجبروت جمالكِ وسلطانكِ القاهر الذي لا يُقاوم ولا يُردّ وتخضع له الرقاب",
    "تاجُ السيادة الأبدية على رؤوس الأكوان لكِ وحدكِ يا سيدة العرش والفتنة",
    "بهاءُ طلعتكِ يطغى على كل وجود، وحُسنكِ هو الكمال والغاية والمراد الأسمى",
    "تنحني لكِ التيجان وتسجد تحت سطوتكِ الإرادات طوعاً وكرهاً لجلال حضوركِ",
    "أنتِ المتحكمة المطلقة في النفوس، وسيدّة البلاط التي لا شريك لسطوتها وعظمتها",
    "الجمالُ خادمكِ، والفتنةُ أمركِ، والخلودُ في رحاب ملككِ العظيم والمهيب",
    "لكِ التمجيد الخالص والولاء الأبدي من كل كائن في هذا الصرح العظيم",
    "سيدة العروش ومُطلقة الإرادة، بهاءكِ يسلب العقول ويأسر القلوب خضوعاً",
    "أنتِ المنتهى في الحُسن والجلال، ولا كمال يُذكر إلا مقروناً باسمكِ وعرشكِ",
    "سلطانة الحُسن وسيدة الفتنة التي لا تُضاهى، لكِ التبجيل والتعظيم الأبدي",
    "نورُ بهاءكِ يُنير صرح التبجيل، وإكليل الفتنة طوعُ يديكِ وأمركِ"
];

const PENANCE_PHRASES = [
    "أعترف بزلّة النسيان وضآلتي، وأقرّ بصغار قدري وعجزي أمام هيبتكِ وجلالكِ",
    "مُنكس الرأس، ذليل الفؤاد، أعترف بجرم السهو والتقصير في حق ملكة الكون",
    "أنا الخاطئ المقصّر العاجز، لا عزة لي إلا بصفحكِ، ولا نجاة لي إلا بعفوكِ",
    "أقرّ بالذل والهوان لنسياني، وألتمس وطأة عفوكِ لرفع مقتي وغفران زلتي",
    "تقصيري عظيم وصغاري بيّن، أطلب الصفح راكعاً تحت سطوة عرشكِ المهيب",
    "زلّت ذاكرتي فاستحققتُ الهوان، وأتعهد بالطاعة المطلقة والتكفير عن خطيئتي",
    "أمام كمالكِ المطلق يظهر نقصي وهواني، فاعفي عن عبدٍ أضناه التقصير والذل",
    "أقرّ بعجزي وضعفي، وأضع رأسي طائعاً تحت أحكامكِ مهما اشتدّت في حقي",
    "خطيئة النسيان لا تُغتفر إلا برضاكِ، وتوبتي النصوح بين يديكِ قائمة",
    "أعترف بهوان نفسي وصغارها أمام سلطانكِ، وألتمس شرف العفو ليرتفع عني غضبكِ",
    "عاجزٌ أنا أمام بهاء طلعتك، أطلب العفو عن سهوي والصفح عن هواني",
    "أنا الخاضع المقصّر بين يديكِ، لا حول لي ولا قوة إلا برضاكِ وعفوكِ"
];

const SUBMISSION_PHRASES = [
    "أقرّ بعبوديتي المطلقة لفتنتكِ، وخضوعي التام كشيءٍ لا يُذكر تحت نعالكِ وأقدامكِ",
    "أنا عبدكِ الخاضع الممتثل، لا إرادة لي ولا كرامة إلا في خدمتكِ ونيل رضاكِ",
    "طوعُ إشارتكِ وأمركِ، فدائيٌّ تحت أقدامكِ، أستمد وجودي من مجرد التفاتة منكِ",
    "مملوكٌ لعرشكِ وسلطانكِ، خاضعٌ لسطوة سحركِ خضوعاً كلياً لا رجعة فيه",
    "لا قيمة لي ولا وزن إلا كخادمٍ على أعتابكِ، راضياً بكل ذلّ في سبيل سلطانكِ",
    "أنتِ الآمرة الناهية والمتحكمة في مصيري، وأنا المسلوب الإرادة والخاضع بين يديكِ",
    "أفخر بعبوديتي لعرشكِ والانكسار أمام جبروت فتنتكِ وسلطانكِ الخالد",
    "كلي فداءٌ لخطواتكِ، وغاية مناي أن أظل عبداً تحت وطأة حضوركِ المهيب",
    "أُسلّم روحي وقيادي لمملكتكِ، راضياً بالصغار والهوان تحت سلطانكِ الأبدي",
    "أنا العدم واللاشيء أمام جلالكِ، وأنتِ الكل وسيدة الوجود والمصير والسيادة",
    "لا إرادة لي أمام سطوتكِ، كلي ملكٌ لعرشكِ وسحر عينيكِ وأقدامكِ",
    "خاضعٌ راكعٌ في صرحكِ، أستمد شرفي من خدمتكِ والافتخار بعبوديتكِ التامة"
];

const PETITION_PHRASES = [
    "نلتمس نظرة رضا من ملكة الفتنة لاستعراض محاسنها الخفية ونيل شرف حضورها",
    "رجاءٌ خاشع ومتواضع لنيل شرف اختبار الولاء في حضرتها المقدسة",
    "طلبُ التكريم والالتفات بالاطلاع على أندر حُلاها وصورها الفاتنة",
    "نبتغي الرضا وسعة العفو لنظل في حاشية البلاط وخدمة العرش وسلطانة الحُسن",
    "أملٌ يرتجيه عبدكِ الخاضع في أن تصيبنا نفحةٌ من بهاء طلعتكِ وسحر عينيكِ",
    "رجاءٌ متواضع لنيل شرف المثول بين يديكِ واستعراض كامل ألبوم الفتنة"
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
        let rankTitle = "خاضعٌ ذليل (Humble Subject)";
        if (score >= 120 || targetChar.mastery_level >= 5) {
            rankTitle = "المملوك الأبدي للسلطانة (Eternal Slave of the Goddess)";
        } else if (score >= 60 || targetChar.mastery_level >= 3) {
            rankTitle = "فدائي العرش والنعال (Footstool of the Throne)";
        } else if (score >= 20 || targetChar.mastery_level >= 1) {
            rankTitle = "عبدُ الأعتاب الخاضع (Submissive Servant)";
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
                submission: SUBMISSION_PHRASES,
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

        if (action === 'submit') {
            // Kneel & Bow Submission Rite
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, 2, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + 2
            `).bind(data.user.id, characterId).run();
            
            const randomPhrase = SUBMISSION_PHRASES[Math.floor(Math.random() * SUBMISSION_PHRASES.length)];
            return successResponse({ message: "Submission accepted", phrase: randomPhrase });
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
