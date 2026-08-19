const MIN_EASE = 1.3;
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
    
    if (isCorrect && usedLifeline === 'none') {
        newCorrectStreak += 1;
        if (newCorrectStreak > 1) {
            newInterval = Math.max(1, Math.round((newInterval || 1) * newEase));
            newMastery = Math.min(MAX_MASTERY, newMastery + 1);
        } else {
            newInterval = 1;
        }
    } else if (!isCorrect) {
        newCorrectStreak = 0;
        newLapseCount += 1;
        newEase = Math.max(MIN_EASE, newEase - 0.2);
        newInterval = 0;
        newMastery = Math.max(0, newMastery - 2);
    }
    
    return {
        mastery_level: newMastery,
        correct_streak: newCorrectStreak,
        ease: newEase,
        interval_days: newInterval,
        lapse_count: newLapseCount
    };
}
