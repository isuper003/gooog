import { describe, it, expect } from 'vitest';
import { calculateSRS } from '../functions/lib/srs.js';

describe('SRS Engine', () => {
    it('should initialize a new progress object when answering correctly', () => {
        const result = calculateSRS(null, true, 'none');
        expect(result.correct_streak).toBe(1);
        expect(result.interval_days).toBe(1);
        expect(result.mastery_level).toBe(0);
        expect(result.ease).toBe(2.5);
    });

    it('should drop ease and reset streak when answering incorrectly', () => {
        const progress = {
            mastery_level: 2,
            correct_streak: 3,
            ease: 2.5,
            interval_days: 3,
            lapse_count: 0
        };

        const result = calculateSRS(progress, false, 'none');

        expect(result.correct_streak).toBe(0);
        expect(result.interval_days).toBe(0); // sentinel: relearn, mapped to 10min by answers.js
        expect(result.mastery_level).toBe(1); // graduated drop: -1 per lapse (was flat -2)
        expect(result.ease).toBe(2.3);
        expect(result.lapse_count).toBe(1);
    });

    it('should never drop mastery below 0 on repeated lapses', () => {
        const progress = {
            mastery_level: 1,
            correct_streak: 0,
            ease: 1.5,
            interval_days: 1,
            lapse_count: 4
        };

        const result = calculateSRS(progress, false, 'none');
        expect(result.mastery_level).toBe(0);
        expect(result.lapse_count).toBe(5);
    });

    it('should use fixed intervals 1 then 3 days for the first two successes', () => {
        const first = calculateSRS(null, true, 'none');
        const second = calculateSRS({ ...first, lapse_count: 0 }, true, 'none');
        expect(second.correct_streak).toBe(2);
        expect(second.interval_days).toBe(3);
        expect(second.ease).toBe(2.5); // ease untouched for first two successes
        expect(second.mastery_level).toBe(1);
    });

    it('should grow interval by ease and bump ease after the learning steps', () => {
        const progress = {
            mastery_level: 2,
            correct_streak: 2,
            ease: 2.5,
            interval_days: 3,
            lapse_count: 0
        };

        const result = calculateSRS(progress, true, 'none');

        expect(result.correct_streak).toBe(3);
        expect(result.interval_days).toBe(8); // Math.round(3 * 2.5)
        expect(result.ease).toBe(2.6); // SM-2 style ease increment kicks in after step 2
        expect(result.mastery_level).toBe(3);
    });

    it('should cap ease at 3.0 and mastery level at 5', () => {
        const progress = {
            mastery_level: 5,
            correct_streak: 10,
            ease: 2.98,
            interval_days: 10,
            lapse_count: 0
        };

        const result = calculateSRS(progress, true, 'none');

        expect(result.ease).toBe(3.0);
        expect(result.interval_days).toBe(30); // Math.round(10 * 2.98)
        expect(result.mastery_level).toBe(5);
    });

    it('should schedule skipped questions for tomorrow without scoring them', () => {
        const progress = {
            mastery_level: 3,
            correct_streak: 2,
            ease: 2.5,
            interval_days: 6,
            lapse_count: 0
        };

        const result = calculateSRS(progress, false, 'skip');

        expect(result.correct_streak).toBe(2); // unchanged
        expect(result.mastery_level).toBe(3); // unchanged
        expect(result.ease).toBe(2.5); // unchanged
        expect(result.interval_days).toBe(1); // due soon so skip is not an escape hatch
        expect(result.lapse_count).toBe(0); // a skip is not a lapse
    });

    it('should leave SRS state unchanged when 50/50 is used (shown only)', () => {
        const progress = {
            mastery_level: 3,
            correct_streak: 2,
            ease: 2.5,
            interval_days: 6,
            lapse_count: 1
        };

        const result = calculateSRS(progress, true, 'fifty_fifty');

        expect(result.mastery_level).toBe(3);
        expect(result.correct_streak).toBe(2);
        expect(result.ease).toBe(2.5);
        expect(result.interval_days).toBe(6);
        expect(result.lapse_count).toBe(1);
    });
});
