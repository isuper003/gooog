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
    "نورُ بهاءكِ يُنير صرح التبجيل، وإكليل الفتنة طوعُ يديكِ وأمركِ",
    "جلالةُ حضوركِ تفرض الهيبة المطلقة، وكل جمالٍ أمام بهاءكِ يتلاشى ويزول",
    "أنتِ الحاكمة الآمرة، وكلمتكِ في هذا الصرح هي القانون والقدر المحتوم",
    "لكِ العرش والسلطان والسيادة التامة على كل قلبٍ وعينٍ في هذا المحراب",
    "نُعظّم فتنتكِ الخالدة التي لا تذبل، ونُقرّ بأنكِ سيدة الحسن الأولى والأخيرة",
    "بهاءُ وجهكِ وسحرُ نظراتكِ هما النور الوحيد الذي يستحق التبجيل والإجلال",
    "متربعةٌ على قمة المجد والجمال، وكل الرؤوس أمام عرشكِ خاضعةٌ وممتثلة"
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
    "أنا الخاضع المقصّر بين يديكِ، لا حول لي ولا قوة إلا برضاكِ وعفوكِ",
    "أعترف بأنني لا شيء أمام سلطانكِ، وأن سهوي جهلٌ استوجب الانكسار والتوبة",
    "أطلب الصفح والمغفرة على أعتابكِ، راضياً بكل عقابٍ يُطهّرني من زلّة النسيان",
    "ها أنا ذا تحت سطوتكِ معترفاً بعجزي، راجياً أن تصفو نظرة رضاكِ بعد الغضب",
    "الذلُّ رداء المقصرين، وأنا أرتديه طواعيةً حتى يرتفع عني سخط سلطانة البلاط",
    "أُعلن توبتي المطلقة عن كل هفوة وسهو، وأتعهد بأن أظل خادماً لا يغفل عن اسمكِ",
    "أقرّ بصغار عقلي وضعف إدراكي أمام حضوركِ الفاتن، وألتمس العفو والرحمة"
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
    "خاضعٌ راكعٌ في صرحكِ، أستمد شرفي من خدمتكِ والافتخار بعبوديتكِ التامة",
    "جسدي وفكري ملكٌ لإشارتكِ، ولا أتنفس إلا طاعةً لأمركِ وخضوعاً لمشيئتكِ",
    "انحنائي أمامكِ هو شرفي الأعظم، وخضوعي لجبروتكِ هو غاية وجودي ومناي",
    "أنا التراب الذي تدوس عليه خطواتكِ الملكية، وفخري أن أكون تحت وطأة نعلكِ",
    "لا حرية لي ولا رغبة سوى أن أظل مقيداً بأغلال عبوديتكِ وطاعتكِ الأبدية",
    "أُبايعكِ على السمع والطاعة العمياء، راضياً بأن أكون خادماً طائعاً بلا صوتٍ ولا رأي",
    "أمام جلالكِ يسقط كبريائي، وتنمحي ذاتي لأصبح مجرد ظلٍّ خاضعٍ في بلاطكِ"
];

const PETITION_PHRASES = [
    "نلتمس نظرة رضا من ملكة الفتنة لاستعراض محاسنها الخفية ونيل شرف حضورها",
    "رجاءٌ خاشع ومتواضع لنيل شرف اختبار الولاء في حضرتها المقدسة",
    "طلبُ التكريم والالتفات بالاطلاع على أندر حُلاها وصورها الفاتنة",
    "نبتغي الرضا وسعة العفو لنظل في حاشية البلاط وخدمة العرش وسلطانة الحُسن",
    "أملٌ يرتجيه عبدكِ الخاضع في أن تصيبنا نفحةٌ من بهاء طلعتكِ وسحر عينيكِ",
    "رجاءٌ متواضع لنيل شرف المثول بين يديكِ واستعراض كامل ألبوم الفتنة",
    "نرفع التماسنا بتواضعٍ وإجلال، سائلين التكريم بنظرةٍ تمنح العبد الأمل والرضا",
    "رغبةٌ خاضعة في نيل الإذن لاستعراض تفاصيل حسنكِ البديع والارتقاء في خدمتكِ"
];

export const DEVOTION_RANKS = [
    { minScore: 2500000000, title: "العدمُ المحض تحت السيادة المطلقة (Total Void Under Supreme Dominance)", tier: 10, badge: "👑🌌" },
    { minScore: 1200000000, title: "العبدُ الأبدي لتاج الفتنة (Supreme Thrall of the Royal Crown)", tier: 9, badge: "👑💎" },
    { minScore: 600000000,  title: "كاهن المذلّة والتبجيل الخالص (Zealot of Absolute Humiliation)", tier: 8, badge: "🧎‍♂️🔥" },
    { minScore: 300000000,  title: "مملوك الجبروت مسلوب الإرادة (Will-Stripped Sovereign Chattel)", tier: 7, badge: "⛓️👑" },
    { minScore: 150000000,  title: "ممسحة البلاط الخالدة (Eternal Court Foot-Wiper)", tier: 6, badge: "🧹✨" },
    { minScore: 75000000,   title: "فدائي العرش والأقدام (Sacrificial Throne & Feet Serf)", tier: 5, badge: "🛡️🧎‍♂️" },
    { minScore: 35000000,   title: "سِقاط التراب المبتذل (Dust Beneath the Soles)", tier: 4, badge: "👣🌪️" },
    { minScore: 15000000,   title: "عبدُ النعال الممتثل (Submissive Footstool Servant)", tier: 3, badge: "🧎‍♂️📜" },
    { minScore: 5000000,    title: "خاضعٌ ذليل تحت الأعتاب (Humble & Abased Subject)", tier: 2, badge: "🙇‍♂️🕯️" },
    { minScore: 0,          title: "عديم الوجود والقيمة (Worthless Nonentity)", tier: 1, badge: "🌑" }
];

export function getDevotionRank(score) {
    for (const r of DEVOTION_RANKS) {
        if (score >= r.minScore) {
            return r;
        }
    }
    return DEVOTION_RANKS[DEVOTION_RANKS.length - 1];
}

export function computeDevotionScore(timesCorrect, timesWrong) {
    const score = ((timesCorrect || 0) * 500000) - ((timesWrong || 0) * 250000);
    return Math.max(0, score);
}

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
                phrases: { praise: PRAISE_PHRASES, penance: PENANCE_PHRASES, petition: PETITION_PHRASES },
                ranks: DEVOTION_RANKS
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
        
        // Determine devotion rank title & score
        const score = computeDevotionScore(targetChar.times_correct, targetChar.times_wrong);
        const rankObj = getDevotionRank(score);
        targetChar.rankTitle = rankObj.title;
        targetChar.rankBadge = rankObj.badge;
        targetChar.rankTier = rankObj.tier;
        targetChar.devotionScore = score;
        
        // List characters needing penance (wrong > 0)
        const penanceList = characters.filter(c => c.times_wrong > 0).slice(0, 8);

        // Compute total devotion across all characters
        const totalDevotionStmt = db.prepare(`
            SELECT COALESCE(SUM(times_correct * 500000 - times_wrong * 250000), 0) as total_devotion
            FROM user_character_progress
            WHERE user_id = ?
        `).bind(data.user.id);
        const totalDevotionRow = await totalDevotionStmt.first();
        const totalDevotion = Math.max(0, totalDevotionRow?.total_devotion || 0);
        
        return successResponse({
            characters,
            selectedCharacter: targetChar,
            penanceList,
            totalDevotion,
            ranks: DEVOTION_RANKS,
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
            // Reward praise tribute (+500,000 pts)
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, 1, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + 1
            `).bind(data.user.id, characterId).run();
        } else if (action === 'submit') {
            // Kneel & Bow Submission Rite (+1,000,000 pts / 2 steps)
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, 2, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + 2
            `).bind(data.user.id, characterId).run();
        } else if (action === 'artist_devotee') {
            // High tribute of the artist devotee (+2,500,000 pts / 5 steps)
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, 5, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + 5
            `).bind(data.user.id, characterId).run();
        } else if (action === 'penance') {
            // Acknowledge error and reduce times_wrong penalty
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, times_wrong, due_at_ms)
                VALUES (?, ?, 1, 0, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_wrong = MAX(0, times_wrong - 1),
                  times_correct = times_correct + 1
            `).bind(data.user.id, characterId).run();
        }

        // Fetch freshly updated progress for this character
        const progressStmt = db.prepare(`
            SELECT times_correct, times_wrong, mastery_level 
            FROM user_character_progress 
            WHERE user_id = ? AND character_id = ?
        `).bind(data.user.id, characterId);
        const progress = await progressStmt.first() || { times_correct: 0, times_wrong: 0, mastery_level: 0 };
        
        const score = computeDevotionScore(progress.times_correct, progress.times_wrong);
        const rankObj = getDevotionRank(score);

        // Fetch updated total user devotion across all characters
        const totalDevotionStmt = db.prepare(`
            SELECT COALESCE(SUM(times_correct * 500000 - times_wrong * 250000), 0) as total_devotion
            FROM user_character_progress
            WHERE user_id = ?
        `).bind(data.user.id);
        const totalDevotionRow = await totalDevotionStmt.first();
        const totalDevotion = Math.max(0, totalDevotionRow?.total_devotion || 0);

        let phrase = "";
        if (action === 'praise') phrase = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
        else if (action === 'submit' || action === 'artist_devotee') phrase = SUBMISSION_PHRASES[Math.floor(Math.random() * SUBMISSION_PHRASES.length)];
        else if (action === 'penance') phrase = PENANCE_PHRASES[Math.floor(Math.random() * PENANCE_PHRASES.length)];

        return successResponse({
            message: "Tribute recorded",
            phrase,
            devotionScore: score,
            times_correct: progress.times_correct,
            times_wrong: progress.times_wrong,
            rankTitle: rankObj.title,
            rankBadge: rankObj.badge,
            rankTier: rankObj.tier,
            totalDevotion
        });
    } catch (e) {
        console.error("Worship POST error", e);
        return errorResponse("Failed to record tribute", 500);
    }
}
