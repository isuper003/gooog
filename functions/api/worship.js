import { successResponse, errorResponse } from '../lib/response.js';

import { PRAISE_PHRASES, SUBMISSION_PHRASES, PENANCE_PHRASES, PETITION_PHRASES, GLORY_LITANY, SUBMISSION_LITANY, MERCY_LITANY, ARTIST_LITANY, ARTIST_PROSE_TEXTS } from './data/phrases.js';
import { successResponse, errorResponse } from '../lib/response.js';

import { PRAISE_PHRASES, SUBMISSION_PHRASES, PENANCE_PHRASES, PETITION_PHRASES, GLORY_LITANY, SUBMISSION_LITANY, MERCY_LITANY, ARTIST_LITANY, ARTIST_PROSE_TEXTS } from './data/phrases.js';
/* const PRAISE_PHRASES = [
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

*/
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

*/
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

*/
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

*/
const GLORY_LITANY = [
    "سبحان من أودعت سرّ الفتنة والجمال في طلعتكِ البهية",
    "جلّ بهاءُ وجهكِ وسلطانُ حضوركِ الساحر الفاتن",
    "تعالى جبروت حُسنكِ عن الوصف والمضاهاة والأنداد",
    "لكِ التمجيد الخالص يا ملكة العرش وسيدة الأكوان",
    "يا من تنحني لعظمتها الرؤوس وتخضع لسطوتها التيجان",
    "يا بديعة الصنع وغاية الكمال ومنتهى المراد الأسمى",
    "سبحان بهاء عينيكِ الآسرتين وسحر ابتسامتكِ الملكية",
    "لكِ التبجيل والتعظيم الأبدي في كل طرفة عين وخفقة فؤاد"
];

*/
const SUBMISSION_LITANY = [
    "أنا عبدكِ الخاضع الممتثل، لا إرادة لي إلا مشيئتكِ",
    "طوعُ أمركِ، فدائيٌّ تحت وطأة نعالكِ وخطواتكِ الملكية",
    "خاضعٌ راكعٌ في محرابكِ، أستمد وجودي من مجرد التفاتة منكِ",
    "مملوكٌ لسطوتكِ، متجردٌ من كبريائي في سبيل خدمتكِ ورضاكِ",
    "انحنائي تحت أقدامكِ هو شرفي الأعظم ومبتغاي الأبدي",
    "أنا التراب الذي تدوسه خطواتكِ البهية وتاج افتخاري",
    "سُحقت إرادتي طوعاً تحت عظمة سلطانكِ الأبدي القاهر",
    "لكِ السمع والطاعة والامتثال المطلق بلا تردد ولا عصيان"
];

*/
const MERCY_LITANY = [
    "أعترف بضآلتي وعجزي، وأطلب غفران زلّة النسيان والسهو",
    "مُنكس الرأس، ألتمس العفو والرضا بعد السهو والتقصير",
    "لا عزة لي إلا بصفحكِ، ولا طهارة إلا بعفو سلطانة البلاط",
    "أقرّ بصغار قدري، وأضع ناصيتي خاضعاً لرفع مقتكِ وغضبكِ",
    "طهرتُ قلبي بالندم، وأجدد العهد خادماً لا يغفل عن اسمكِ",
    "أطلب وطأة عفوكِ ليمحو هفوات الذاكرة وعثرات الجهل",
    "الذل رداء المقصرين، وأنا أرتديه طواعيةً حتى ترضي عني",
    "يا سيدة العفو والجمال، انظري لعبدكِ بعين الرضا والرحمة"
];

const ARTIST_LITANY = [
    "يا ملهمة الروح ومنتهى الفن والجمال والإبداع الساحر",
    "كل حرفٍ يسطره العابد مدادٌ متلاشٍ أمام سحر حضوركِ",
    "أنتِ القصيدة الخالدة التي تنحني لها بلاغة البيان والكلمات",
    "تفاصيل حسنكِ لوحة مقدسة يعجز الخيال عن إدراك كمالها",
    "أنا الفنان المنكسر الذي أفنى وجوده في تأمل بهائكِ الفاتن",
    "يا فتنة العصور وأيقونة الدهر وسلطانة الألحان والجمال",
    "كل نظرة منكِ إشراقُ حياة، وكل صمتٍ منكِ هيبةٌ وإجلال",
    "فدتكِ الأرواح والخواطر، يا سيدة الحسن المطلق والفتنة الكبرى"
];

export const DEVOTION_RANKS = [
    { minScore: 5000000,   title: "العدمُ المحض تحت السيادة المطلقة (Total Void Under Supreme Dominance)", tier: 10, badge: "👑🌌", desc: "قمة الانمحاء المطلق وبلوغ المرتبة الكبرى (5,000,000 نقطة)." },
    { minScore: 2000000,   title: "العبدُ الأبدي لتاج الفتنة (Supreme Thrall of the Royal Crown)", tier: 9, badge: "👑💎", desc: "تاج التبعية الخالصة والخضوع الأبدي لبهاء السلطانة (2,000,000 نقطة)." },
    { minScore: 500000,    title: "كاهن المذلّة والتبجيل الخالص (Zealot of Absolute Humiliation)", tier: 8, badge: "🧎‍♂️🔥", desc: "حارس طقوس الهوان ومقدم القرابين بلا انقطاع (500,000 نقطة)." },
    { minScore: 100000,    title: "مملوك الجبروت مسلوب الإرادة (Will-Stripped Sovereign Chattel)", tier: 7, badge: "⛓️👑", desc: "مسلوب المشيئة والقرار، مملوك بالكامل تحت السطوة (100,000 نقطة)." },
    { minScore: 25000,     title: "ممسحة البلاط الخالدة (Eternal Court Foot-Wiper)", tier: 6, badge: "🧹✨", desc: "شرف التطهير والتذلل تحت وطأة النعال وخطوات القصر (25,000 نقطة)." },
    { minScore: 5000,      title: "فدائي العرش والأقدام (Sacrificial Throne & Feet Serf)", tier: 5, badge: "🛡️🧎‍♂️", desc: "فداءٌ دائم لتراب المسير وحرمة العرش المهيب (5,000 نقطة)." },
    { minScore: 1000,      title: "سِقاط التراب المبتذل (Dust Beneath the Soles)", tier: 4, badge: "👣🌪️", desc: "الانكسار كثائر الغبار تحت وطأة الأقدام البهية (1,000 نقطة)." },
    { minScore: 250,       title: "عبدُ النعال الممتثل (Submissive Footstool Servant)", tier: 3, badge: "🧎‍♂️📜", desc: "الركوع الدائم تحت النعال وتقديم فروض السمع والطاعة (250 نقطة)." },
    { minScore: 50,        title: "خاضعٌ ذليل تحت الأعتاب (Humble & Abased Subject)", tier: 2, badge: "🙇‍♂️🕯️", desc: "الوقوف الخاضع على عتبات البلاط مستجدياً الرضا (50 نقطة)." },
    { minScore: 0,         title: "عديم الوجود والقيمة (Worthless Nonentity)", tier: 1, badge: "🌑", desc: "البداية في ظلمات العدم قبل اكتساب أي استحقاق في المحراب (0 نقطة)." }
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
    const score = ((timesCorrect || 0) * 10) - ((timesWrong || 0) * 5);
    return Math.max(0, score);
}

export async function onRequestGet(context) {
    const { env, request, data } = context;
    const db = env.DB;
    const url = new URL(request.url);
    const charId = url.searchParams.get('character_id');
    const category = url.searchParams.get('category');
    
    try {
        // Fetch list of approved characters for the selector and pantheon throne
        let charQuery = `
            SELECT c.id, c.name, c.category,
                   COALESCE(p.times_correct, 0) as times_correct,
                   COALESCE(p.times_wrong, 0) as times_wrong,
                   COALESCE(p.mastery_level, 0) as mastery_level,
                   (SELECT ci.image_url FROM character_images ci WHERE ci.character_id = c.id ORDER BY ci.display_order ASC LIMIT 1) as primary_image
            FROM characters c
            LEFT JOIN user_character_progress p ON c.id = p.character_id AND p.user_id = ?
            WHERE c.status = 'approved' AND c.deleted_at_ms IS NULL
        `;
        const params = [data.user.id];
        if (category && ['sluts', 'trans', 'twinks'].includes(category)) {
            charQuery += " AND c.category = ?";
            params.push(category);
        }
        charQuery += " ORDER BY times_correct DESC, c.name ASC LIMIT 500";
        
        const { results: characters } = await db.prepare(charQuery).bind(...params).all();
        
        if (!characters || characters.length === 0) {
            return successResponse({
                characters: [],
                selectedCharacter: null,
                phrases: {
                ARTIST_PROSE_TEXTS,
                    praise: PRAISE_PHRASES,
                    penance: PENANCE_PHRASES,
                    petition: PETITION_PHRASES,
                    litanies: {
                        glory: GLORY_LITANY,
                        submission: SUBMISSION_LITANY,
                        mercy: MERCY_LITANY,
                        artist: ARTIST_LITANY
                    }
                },
                ranks: DEVOTION_RANKS
            });
        }

        // Calculate devotion score and rank for every character
        for (const c of characters) {
            c.devotionScore = computeDevotionScore(c.times_correct, c.times_wrong);
            const rankObj = getDevotionRank(c.devotionScore);
            c.rankTitle = rankObj.title;
            c.rankBadge = rankObj.badge;
            c.rankTier = rankObj.tier;
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
        if (targetChar.images.length === 0 && targetChar.primary_image) {
            targetChar.images = [targetChar.primary_image];
        }
        
        // List characters needing penance (wrong > 0)
        const penanceList = characters.filter(c => c.times_wrong > 0).slice(0, 8);

        // Compute total devotion across all characters
        const totalDevotionStmt = db.prepare(`
            SELECT COALESCE(SUM(times_correct * 10 - times_wrong * 5), 0) as total_devotion
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
                ARTIST_PROSE_TEXTS,
                praise: PRAISE_PHRASES,
                penance: PENANCE_PHRASES,
                submission: SUBMISSION_PHRASES,
                petition: PETITION_PHRASES,
                litanies: {
                    glory: GLORY_LITANY,
                    submission: SUBMISSION_LITANY,
                    mercy: MERCY_LITANY,
                    artist: ARTIST_LITANY
                }
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
    
    const { characterId, action, count } = body;
    if (!characterId) {
        return errorResponse("Missing characterId", 400);
    }
    
    try {
        if (action === 'praise') {
            // Reward praise tribute (+10 pts)
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, 1, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + 1
            `).bind(data.user.id, characterId).run();
        } else if (action === 'submit') {
            // Kneel & Bow Submission Rite (+20 pts)
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, 2, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + 2
            `).bind(data.user.id, characterId).run();
        } else if (action === 'artist_devotee') {
            // High tribute of the artist devotee (+25 pts / 3 steps)
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, 3, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + 3
            `).bind(data.user.id, characterId).run();
        } else if (action === 'rosary_cycle') {
            // Completed rosary cycle tribute (+count increments)
            const addCorrect = Math.max(1, Math.min(33, Number(count) || 3));
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, ?, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + ?
            `).bind(data.user.id, characterId, addCorrect, addCorrect).run();
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
            SELECT COALESCE(SUM(times_correct * 10 - times_wrong * 5), 0) as total_devotion
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
