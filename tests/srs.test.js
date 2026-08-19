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
        expect(result.interval_days).toBe(0);
        expect(result.mastery_level).toBe(0);
        expect(result.ease).toBe(2.3);
        expect(result.lapse_count).toBe(1);
    });

    it('should increase interval based on ease for consecutive correct answers', () => {
        const progress = {
            mastery_level: 1,
            correct_streak: 1,
            ease: 2.5,
            interval_days: 1,
            lapse_count: 0
        };
        
        const result = calculateSRS(progress, true, 'none');
        
        expect(result.correct_streak).toBe(2);
        expect(result.interval_days).toBe(3); // Math.round(1 * 2.5)
        expect(result.mastery_level).toBe(2);
    });

    it('should cap mastery level at 5', () => {
        const progress = {
            mastery_level: 5,
            correct_streak: 10,
            ease: 2.8,
            interval_days: 10,
            lapse_count: 0
        };
        
        const result = calculateSRS(progress, true, 'none');
        
        expect(result.mastery_level).toBe(5);
    });
});
