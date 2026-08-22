import { successResponse, errorResponse } from '../../lib/response.js';
import { calculateSRS } from '../../lib/srs.js';

const ALLOWED_LIFELINES = ['none', 'fifty_fifty', 'skip', 'hint'];
// Wrong answers become due again after 10 minutes (plan.md SRS rule 2),
// expressed as the interval_days = 0 "relearn" sentinel from calculateSRS().
const RELEARN_DELAY_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function computeNextDueMs(intervalDays) {
    return Date.now() + (intervalDays > 0 ? intervalDays * DAY_MS : RELEARN_DELAY_MS);
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

    const { answerId, gameSessionId, questionId, selectedCharacterId } = body;

    // Schema CHECK constraint allows only ('none','fifty_fifty','skip','hint');
    // coerce anything unexpected (including client defaults) to 'none'.
    const usedLifeline = ALLOWED_LIFELINES.includes(body.usedLifeline) ? body.usedLifeline : 'none';
    const answerTimeMs = Math.max(0, Math.min(600000, Number(body.answerTimeMs) || 0));

    if (!answerId || !gameSessionId || !questionId) {
        return errorResponse("Missing required fields", 400);
    }

    // Skips never create answer_events (they would pollute character accuracy
    // stats); they only claim the question, bump the session counter and push
    // the character's next review to tomorrow (plan.md SRS rule 3).
    if (usedLifeline === 'skip' && !selectedCharacterId) {
        return handleSkippedQuestion(db, { answerId, gameSessionId, questionId }, data.user.id);
    }

    try {
        // Idempotency fast path: same answerId replayed returns the stored verdict.
        const existingAnswer = await db.prepare("SELECT is_correct FROM answer_events WHERE answer_id = ?").bind(answerId).first();
        if (existingAnswer) {
            const replay = await loadAnswerResponse(db, answerId, data.user.id);
            if (replay) return successResponse(replay);
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

        const characterId = question.correct_character_id;

        const validOptions = JSON.parse(question.option_ids_json);
        if (selectedCharacterId && !validOptions.includes(selectedCharacterId)) {
            return errorResponse("Invalid selected option", 400);
        }

        const isCorrect = (characterId === selectedCharacterId);
        const nowMs = Date.now();

        const progressStmt = db.prepare("SELECT * FROM user_character_progress WHERE user_id = ? AND character_id = ?").bind(data.user.id, characterId);
        let progress = await progressStmt.first();

        const oldMastery = progress ? progress.mastery_level : 0;
        const newSrs = calculateSRS(progress, isCorrect, usedLifeline);
        const nextDueMs = computeNextDueMs(newSrs.interval_days);

        // Atomic claim sequence. The INSERT is gated by UNIQUE(question_id) and
        // the claim UPDATE only lands when the question is still unanswered, so
        // a concurrent duplicate submission fails here instead of double-counting
        // SRS progress. D1 batch runs inside one implicit transaction.
        const stmts = [
            db.prepare(`
                INSERT INTO answer_events (answer_id, game_session_id, question_id, user_id, character_id, selected_character_id, used_lifeline, answer_time_ms, is_correct, created_at_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(answerId, gameSessionId, questionId, data.user.id, characterId, selectedCharacterId || null, usedLifeline, answerTimeMs, isCorrect ? 1 : 0, nowMs),

            db.prepare(`UPDATE game_questions SET answered_at_ms = ? WHERE id = ? AND answered_at_ms IS NULL`).bind(nowMs, questionId)
        ];

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

        try {
            await db.batch(stmts);
        } catch (batchError) {
            // Lost the race: another request answered this question first
            // (UNIQUE(question_id)) or this exact answerId was recorded between
            // the pre-check and the batch (PRIMARY KEY). Return the stored result
            // instead of a 500 so network retries stay idempotent.
            console.warn("Answer batch conflict, resolving idempotently", batchError.message);
            const replay = await loadAnswerResponse(db, answerId, data.user.id);
            if (replay) return successResponse(replay);
            throw batchError;
        }

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

// Skip flow: idempotent claim of an unanswered question with no answer_event.
async function handleSkippedQuestion(db, { gameSessionId, questionId }, userId) {
    try {
        const question = await db.prepare(`
            SELECT g.user_id, g.state, g.mode, g.rounds_requested, g.current_question_number,
                   q.character_id as correct_character_id, q.answered_at_ms
            FROM game_questions q
            JOIN game_sessions g ON q.game_session_id = g.id
            WHERE q.id = ? AND q.game_session_id = ?
        `).bind(questionId, gameSessionId).first();

        if (!question) return errorResponse("Question not found", 404);
        if (question.user_id !== userId) return errorResponse("Unauthorized", 403);
        if (question.state !== 'active') return errorResponse("Game session is not active", 400);
        if (question.answered_at_ms !== null) return successResponse({ skipped: true, replayed: true });

        const nowMs = Date.now();
        const progressStmt = db.prepare("SELECT * FROM user_character_progress WHERE user_id = ? AND character_id = ?").bind(userId, question.correct_character_id);
        const progress = await progressStmt.first();
        const newSrs = calculateSRS(progress, false, 'skip');
        const nextDueMs = computeNextDueMs(newSrs.interval_days);

        const stmts = [
            db.prepare(`UPDATE game_questions SET answered_at_ms = ? WHERE id = ? AND answered_at_ms IS NULL`).bind(nowMs, questionId)
        ];

        if (progress) {
            stmts.push(db.prepare(`
                UPDATE user_character_progress
                SET interval_days = ?, due_at_ms = ?, last_reviewed_at_ms = ?, times_shown = times_shown + 1
                WHERE user_id = ? AND character_id = ?
            `).bind(newSrs.interval_days, nextDueMs, nowMs, userId, question.correct_character_id));
        } else {
            stmts.push(db.prepare(`
                INSERT INTO user_character_progress (user_id, character_id, mastery_level, correct_streak, ease, interval_days, due_at_ms, last_reviewed_at_ms, lapse_count, times_shown, times_correct, times_wrong)
                VALUES (?, ?, 0, 0, 2.5, ?, ?, ?, 0, 1, 0, 0)
            `).bind(userId, question.correct_character_id, newSrs.interval_days, nextDueMs, nowMs));
        }

        const isSessionFinished = question.current_question_number + 1 >= question.rounds_requested;
        if (isSessionFinished) {
            stmts.push(db.prepare(`
                UPDATE game_sessions
                SET current_question_number = current_question_number + 1, state = 'completed', completed_at_ms = ?
                WHERE id = ?
            `).bind(nowMs, gameSessionId));
        } else {
            stmts.push(db.prepare(`
                UPDATE game_sessions
                SET current_question_number = current_question_number + 1
                WHERE id = ?
            `).bind(gameSessionId));
        }

        await db.batch(stmts);

        return successResponse({ skipped: true, isSessionFinished });
    } catch (e) {
        console.error("Skip submission error", e);
        return errorResponse("Failed to process skip", 500);
    }
}

// Rebuilds the full response payload from persisted state for both replay paths
// Scoped to the owning user so a foreign answerId leaks nothing.
async function loadAnswerResponse(db, answerId, userId) {
    try {
        const row = await db.prepare(`
            SELECT ae.is_correct,
                   q.character_id as correct_character_id, q.question_number,
                   g.mode, g.rounds_requested, g.state as session_state,
                   c.name as correct_name, c.category as correct_category, c.label as correct_label,
                   u.username as added_by
            FROM answer_events ae
            JOIN game_questions q ON q.id = ae.question_id
            JOIN game_sessions g ON g.id = ae.game_session_id
            JOIN characters c ON q.character_id = c.id
            LEFT JOIN users u ON c.submitted_by_user_id = u.id
            WHERE ae.answer_id = ? AND ae.user_id = ?
            LIMIT 1
        `).bind(answerId, userId).first();

        if (!row) return null;

        const isCorrect = row.is_correct === 1;
        const isSessionFinished = (row.mode === 'sudden_death' && !isCorrect) || (row.question_number >= row.rounds_requested);

        const progressRow = await db.prepare(
            "SELECT mastery_level, interval_days, due_at_ms FROM user_character_progress WHERE user_id = ? AND character_id = ?"
        ).bind(userId, row.correct_character_id).first();

        return {
            isCorrect,
            correctCharacterId: row.correct_character_id,
            correctName: row.correct_name,
            correctCategory: row.correct_category,
            correctLabel: row.correct_label,
            addedBy: row.added_by,
            isSessionFinished,
            replayed: true,
            srs: {
                oldMastery: null,
                newMastery: progressRow?.mastery_level ?? null,
                intervalDays: progressRow?.interval_days ?? null,
                nextDueMs: progressRow?.due_at_ms ?? null
            }
        };
    } catch (e) {
        console.error("Replay reconstruction failed", e);
        return null;
    }
}
