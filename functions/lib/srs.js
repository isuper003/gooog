const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const EASE_INCREMENT = 0.1; // SM-2 style bump, applied after the 1d/3d learning steps
const MAX_MASTERY = 5;

export function calculateSRS(progress, isCorrect, usedLifeline) {
    let newMastery = 0;
    let newCorrectStreak = 0;
    let newEase = 2.5;
    let newInterval = 0;
    let newLapseCount = 0;

    if (progress) {
        newMastery = progress.mastery_level || 0;
        newCorrectStreak = progress.correct_streak || 0;
        newEase = progress.ease || 2.5;
        newInterval = progress.interval_days || 0;
        newLapseCount = progress.lapse_count || 0;
    }

    const lifelineUsed = usedLifeline && usedLifeline !== 'none';

    if (isCorrect && !lifelineUsed) {
        newCorrectStreak += 1;
        if (newCorrectStreak === 1) {
            // First success: fixed 1 day learning step
            newInterval = 1;
        } else if (newCorrectStreak === 2) {
            // Second success: fixed 3 days learning step
            newInterval = 3;
            newMastery = Math.min(MAX_MASTERY, newMastery + 1);
        } else {
            // Graduated schedule: interval grows by ease, ease creeps up to its cap
            newInterval = Math.max(1, Math.round(Math.max(1, newInterval) * newEase));
            newEase = Math.min(MAX_EASE, Math.round((newEase + EASE_INCREMENT) * 100) / 100);
            newMastery = Math.min(MAX_MASTERY, newMastery + 1);
        }
    } else if (!isCorrect && lifelineUsed) {
        // Skipped questions are shown but never scored; they come back tomorrow
        // so that skipping cannot be abused to dodge learning.
        newInterval = 1;
    } else if (!isCorrect) {
        newCorrectStreak = 0;
        newLapseCount += 1;
        newEase = Math.max(MIN_EASE, Math.round((newEase - 0.2) * 100) / 100);
        // interval_days = 0 acts as a "relearn" sentinel; answers.js maps it to a
        // 10-minute re-show delay instead of an instant re-due spam loop.
        newInterval = 0;
        // Graduated demotion (-1 per lapse, clamped to the plan's Weak/Learning band)
        newMastery = Math.max(0, newMastery - 1);
    }
    // isCorrect && lifelineUsed -> shown only: no mastery/streak/interval/ease change

    return {
        mastery_level: newMastery,
        correct_streak: newCorrectStreak,
        ease: newEase,
        interval_days: newInterval,
        lapse_count: newLapseCount
    };
}
