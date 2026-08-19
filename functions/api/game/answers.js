import { successResponse, errorResponse } from '../../lib/response.js';
import { calculateSRS } from '../../lib/srs.js';

export async function onRequestPost(context) {
    const { env, request, data } = context;
    const db = env.DB;
    
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }
    
    const { answerId, gameSessionId, questionId, selectedCharacterId, usedLifeline, answerTimeMs } = body;
    
    if (!answerId || !gameSessionId || !questionId) {
        return errorResponse("Missing required fields", 400);
    }
    
    try {
        const existingAnswer = await db.prepare("SELECT is_correct FROM answer_events WHERE answer_id = ?").bind(answerId).first();
        if (existingAnswer) {
            return successResponse({ isCorrect: existingAnswer.is_correct === 1 });
        }
        
        const qStmt = db.prepare(`
            SELECT g.user_id, g.state, g.mode, g.rounds_requested, g.current_question_number,
                   q.character_id as correct_character_id, q.answered_at_ms, q.option_ids_json,
                   c.name as correct_name, c.category as correct_category, c.label as correct_label, u.username as added_by
            FROM game_questions q
            JOIN game_sessions g ON q.game_session_id = g.id
            JOIN characters c ON q.character_id = c.id
            LEFT JOIN users u ON c.submitted_by_user_id = u.id
            WHERE q.id = ? AND q.game_session_id = ?
        `).bind(questionId, gameSessionId);
        
        const question = await qStmt.first();
        
        if (!question) return errorResponse("Question not found", 404);
        if (question.user_id !== data.user.id) return errorResponse("Unauthorized", 403);
        if (question.state !== 'active') return errorResponse("Game session is not active", 400);
        if (question.answered_at_ms !== null) return errorResponse("Question already answered", 409);
        
        const characterId = question.correct_character_id;
        
        const validOptions = JSON.parse(question.option_ids_json);
        if (selectedCharacterId && !validOptions.includes(selectedCharacterId)) {
            return errorResponse("Invalid selected option", 400);
        }
        
        const isCorrect = (characterId === selectedCharacterId);
        
        const progressStmt = db.prepare("SELECT * FROM user_character_progress WHERE user_id = ? AND character_id = ?").bind(data.user.id, characterId);
        let progress = await progressStmt.first();
        
        const oldMastery = progress ? progress.mastery_level : 0;
        const newSrs = calculateSRS(progress, isCorrect, usedLifeline);
        
        const nextDueMs = Date.now() + (newSrs.interval_days * 24 * 60 * 60 * 1000);
        const nowMs = Date.now();
        
        const stmts = [];
        
        stmts.push(db.prepare(`
            INSERT INTO answer_events (answer_id, game_session_id, question_id, user_id, character_id, selected_character_id, used_lifeline, answer_time_ms, is_correct, created_at_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(answerId, gameSessionId, questionId, data.user.id, characterId, selectedCharacterId, usedLifeline || 'none', answerTimeMs || 0, isCorrect ? 1 : 0, nowMs));
        
        stmts.push(db.prepare(`UPDATE game_questions SET answered_at_ms = ? WHERE id = ?`).bind(nowMs, questionId));
        
        if (progress) {
            stmts.push(db.prepare(`
                UPDATE user_character_progress 
                SET mastery_level = ?, correct_streak = ?, ease = ?, interval_days = ?, due_at_ms = ?, last_reviewed_at_ms = ?, lapse_count = ?, times_shown = times_shown + 1, times_correct = times_correct + ?, times_wrong = times_wrong + ?
                WHERE user_id = ? AND character_id = ?
            `).bind(newSrs.mastery_level, newSrs.correct_streak, newSrs.ease, newSrs.interval_days, nextDueMs, nowMs, newSrs.lapse_count, isCorrect ? 1 : 0, isCorrect ? 0 : 1, data.user.id, characterId));
        } else {
            stmts.push(db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, mastery_level, correct_streak, ease, interval_days, due_at_ms, last_reviewed_at_ms, lapse_count, times_shown, times_correct, times_wrong)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            `).bind(data.user.id, characterId, newSrs.mastery_level, newSrs.correct_streak, newSrs.ease, newSrs.interval_days, nextDueMs, nowMs, newSrs.lapse_count, isCorrect ? 1 : 0, isCorrect ? 0 : 1));
        }
        
        const isSessionFinished = (question.mode === 'sudden_death' && !isCorrect) || (question.current_question_number + 1 >= question.rounds_requested);
        
        if (isSessionFinished) {
            stmts.push(db.prepare(`
                UPDATE game_sessions 
                SET score = score + ?, current_question_number = current_question_number + 1, state = 'completed', completed_at_ms = ?
                WHERE id = ?
            `).bind(isCorrect ? 1 : 0, nowMs, gameSessionId));
        } else {
            stmts.push(db.prepare(`
                UPDATE game_sessions 
                SET score = score + ?, current_question_number = current_question_number + 1
                WHERE id = ?
            `).bind(isCorrect ? 1 : 0, gameSessionId));
        }
        
        await db.batch(stmts);
        
        return successResponse({
            isCorrect,
            correctCharacterId: characterId,
            correctName: question.correct_name,
            correctCategory: question.correct_category,
            correctLabel: question.correct_label,
            addedBy: question.added_by,
            isSessionFinished,
            srs: {
                oldMastery,
                newMastery: newSrs.mastery_level,
                intervalDays: newSrs.interval_days,
                nextDueMs
            }
        });
        
    } catch (e) {
        console.error("Answer submission error", e);
        return errorResponse("Failed to process answer", 500);
    }
}
