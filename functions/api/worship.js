import { successResponse, errorResponse } from '../lib/response.js';
import { generateUUID } from '../lib/crypto.js';
import {
    PRAISE_PHRASES, 
    SUBMISSION_PHRASES, 
    PENANCE_PHRASES, 
    PETITION_PHRASES, 
    GLORY_LITANY, 
    SUBMISSION_LITANY, 
    MERCY_LITANY, 
    ARTIST_LITANY, 
    ARTIST_PROSE_TEXTS 
} from './data/phrases.js';
import {
    CONTEMPLATION_SURAHS,
    CONTEMPLATION_COMMANDMENTS
} from './data/contemplation.js';

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
        // Fetch list of approved characters for the selector and pantheon throne.
        // Primary image comes from one window-function join instead of a
        // correlated subquery executed per row.
        let charQuery = `
            SELECT c.id, c.name, c.category,
                   COALESCE(p.times_correct, 0) as times_correct,
                   COALESCE(p.times_wrong, 0) as times_wrong,
                   COALESCE(p.mastery_level, 0) as mastery_level,
                   ci.image_url as primary_image
            FROM characters c
            LEFT JOIN user_character_progress p ON c.id = p.character_id AND p.user_id = ?
            LEFT JOIN (
                SELECT character_id, image_url,
                       ROW_NUMBER() OVER (PARTITION BY character_id ORDER BY display_order ASC) as rn
                FROM character_images
            ) ci ON ci.character_id = c.id AND ci.rn = 1
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
            contemplation: {
                surahs: CONTEMPLATION_SURAHS,
                commandments: CONTEMPLATION_COMMANDMENTS
            },
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
    
    const { characterId, action, count, surahId } = body;
    if (!characterId) {
        return errorResponse("Missing characterId", 400);
    }

    // Rite telemetry (blueprint §2.C): every recognized rite appends an event
    // row so the admin dossier reports real counts. `meta` carries the surah
    // id for seal_surah so DISTINCT(meta) = distinct sealed surahs (of 28).
    const RITES = new Set([
        'seal_surah', 'meditation_minute', 'instant_verse',
        'seal_commandments', 'rosary_cycle'
    ]);
    const riteMeta = action === 'seal_surah'
        ? (typeof surahId === 'string' ? surahId.slice(0, 64) : null)
        : null;
    
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
        } else if (action === 'seal_surah') {
            // Seal Contemplation Surah Rite (+50 pts / 5 increments)
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, 5, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + 5
            `).bind(data.user.id, characterId).run();
        } else if (action === 'meditation_minute' || action === 'instant_verse') {
            // Meditation minute or instant verse oracle draw (+10 pts)
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, 1, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + 1
            `).bind(data.user.id, characterId).run();
        } else if (action === 'seal_commandments') {
            // Acknowledge the 10 Commandments (+40 pts)
            await db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, times_correct, due_at_ms)
                VALUES (?, ?, 4, (unixepoch() * 1000))
                ON CONFLICT(user_id, character_id) DO UPDATE SET
                  times_correct = times_correct + 4
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

        // Append rite telemetry event (fire-and-forget semantics: a telemetry
        // failure must never fail the tribute itself).
        if (RITES.has(action)) {
            try {
                await db.prepare(`
                    INSERT INTO worship_events (id, user_id, character_id, rite, meta, created_at_ms)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).bind(generateUUID(), data.user.id, characterId, action, riteMeta, Date.now()).run();
            } catch (telemetryErr) {
                console.error('Worship event log failed', telemetryErr);
            }
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
