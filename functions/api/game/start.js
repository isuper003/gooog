import { successResponse, errorResponse } from '../../lib/response.js';
import { generateUUID } from '../../lib/crypto.js';

export async function onRequestPost(context) {
    const { env, request, data } = context;
    const db = env.DB;
    
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }
    
    const { category, mode, rounds } = body;
    const validCategories = ['trans', 'sluts', 'twinks', 'mix'];
    const validModes = ['classic', 'hot_or_not', 'sudden_death', 'review'];
    
    if (!validCategories.includes(category) || !validModes.includes(mode)) {
        return errorResponse("Invalid category or mode", 400);
    }
    
    const isUnlimited = rounds === 'unlimited' || rounds === 'infinity' || rounds === '∞';
    const numRounds = mode === 'sudden_death' ? 50 : (isUnlimited ? 100 : Math.min(100, parseInt(rounds) || 15));
    const gameSessionId = generateUUID();
    
    try {
        await db.prepare(`
            INSERT INTO game_sessions (id, user_id, category, mode, state, rounds_requested, started_at_ms)
            VALUES (?, ?, ?, ?, 'active', ?, ?)
        `).bind(gameSessionId, data.user.id, category, mode, isUnlimited ? 9999 : numRounds, Date.now()).run();
        
        let charQuery = `
            SELECT c.id, c.name, c.category,
                   COALESCE(p.due_at_ms, (unixepoch() * 1000)) as due_at_ms,
                   COALESCE(p.mastery_level, 0) as mastery_level
            FROM characters c
            LEFT JOIN user_character_progress p ON c.id = p.character_id AND p.user_id = ?
            WHERE c.status = 'approved' AND c.deleted_at_ms IS NULL
        `;
        
        const params = [data.user.id];
        if (category !== 'mix') {
            charQuery += " AND c.category = ?";
            params.push(category);
        }
        
        if (mode === 'review') {
            charQuery += ` ORDER BY due_at_ms ASC, p.mastery_level ASC LIMIT ?`;
            params.push(Math.max(20, numRounds * 4));
        } else {
            charQuery += ` ORDER BY due_at_ms ASC, RANDOM() LIMIT ?`;
            params.push(Math.max(20, numRounds * 4));
        }
        
        const { results: characters } = await db.prepare(charQuery).bind(...params).all();
        
        const minCharsRequired = mode === 'hot_or_not' ? 2 : 4;
        if (!characters || characters.length < minCharsRequired) {
            return errorResponse(`Not enough approved characters (need at least ${minCharsRequired}).`, 400);
        }
        
        // Fetch character images in bulk
        const charIds = characters.map(c => `'${c.id}'`).join(',');
        const { results: allImages } = await db.prepare(`
            SELECT character_id, image_url, display_order 
            FROM character_images 
            WHERE character_id IN (${charIds})
            ORDER BY character_id, display_order
        `).all();
        
        const charImagesMap = {};
        (allImages || []).forEach(img => {
            if (!charImagesMap[img.character_id]) charImagesMap[img.character_id] = [];
            charImagesMap[img.character_id].push(img.image_url);
        });
        
        const questionsToInsert = [];
        const clientQuestions = [];
        const optionCount = mode === 'hot_or_not' ? 2 : 4;
        const totalGeneratedRounds = numRounds;
        
        for (let i = 0; i < totalGeneratedRounds; i++) {
            const questionId = generateUUID();
            
            // Pick target character (cycle through available characters or pick by priority)
            const targetChar = characters[i % characters.length];
            
            // Pick (optionCount - 1) distractors from other characters in library
            const otherChars = characters.filter(c => c.id !== targetChar.id);
            const shuffledOthers = otherChars.sort(() => 0.5 - Math.random()).slice(0, optionCount - 1);
            
            const selectedChars = [targetChar, ...shuffledOthers];
            
            const options = selectedChars.map(char => {
                const images = charImagesMap[char.id] || [];
                const randomImg = images.length > 0 ? images[Math.floor(Math.random() * images.length)] : '';
                return {
                    id: char.id,
                    name: char.name,
                    imageUrl: randomImg
                };
            });
            
            // Target image
            const targetImages = charImagesMap[targetChar.id] || [];
            const targetImg = targetImages.length > 0 ? targetImages[Math.floor(Math.random() * targetImages.length)] : '';
            
            // Calculate 2 incorrect options for 50/50 lifeline
            const incorrectIds = options.filter(o => o.id !== targetChar.id).map(o => o.id);
            const twoIncorrectIds = incorrectIds.sort(() => 0.5 - Math.random()).slice(0, 2);
            
            // Shuffle options
            for (let k = options.length - 1; k > 0; k--) {
                const l = Math.floor(Math.random() * (k + 1));
                [options[k], options[l]] = [options[l], options[k]];
            }
            
            questionsToInsert.push(
                db.prepare(`
                    INSERT INTO game_questions (id, game_session_id, question_number, character_id, option_ids_json, issued_at_ms)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).bind(questionId, gameSessionId, i + 1, targetChar.id, JSON.stringify(options.map(o => o.id)), Date.now())
            );
            
            if (mode === 'hot_or_not') {
                // Hot or Not: Target Name shown, 2 image cards to choose
                clientQuestions.push({
                    questionId,
                    questionNumber: i + 1,
                    targetName: targetChar.name,
                    options: options.map(o => ({ id: o.id, imageUrl: o.imageUrl }))
                });
            } else {
                // Classic / Sudden Death / Review: 1 Image shown, 4 Name options
                clientQuestions.push({
                    questionId,
                    questionNumber: i + 1,
                    imageUrl: targetImg,
                    options: options.map(o => ({ id: o.id, name: o.name })),
                    twoIncorrectIds
                });
            }
        }
        
        await db.batch(questionsToInsert);
        
        return successResponse({
            gameSessionId,
            mode,
            questions: clientQuestions
        });
        
    } catch (e) {
        console.error("Game Start Error", e);
        return errorResponse("Failed to start game", 500);
    }
}
