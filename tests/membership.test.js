import { describe, it, expect } from 'vitest';
import {
    validateUsername,
    sanitizeXHandle,
    validateXHandle,
    validateApplicationNote,
    validateCharacterName
} from '../functions/lib/validation.js';

describe('Temple gateway — username', () => {
    it('accepts 3-20 chars of a-z/0-9/-/_ only', () => {
        expect(validateUsername('abc')).toBe(true);
        expect(validateUsername('User_01-x')).toBe(true);
        expect(validateUsername('ab')).toBe(false);
        expect(validateUsername('a'.repeat(21))).toBe(false);
        expect(validateUsername('has space')).toBe(false);
        expect(validateUsername('عربي')).toBe(false); // blueprint charset is latin-only
    });
});

describe('Temple gateway — 𝕏 handle', () => {
    it('sanitizes @ prefix and whitespace', () => {
        expect(sanitizeXHandle('@riley_reid ')).toBe('riley_reid');
        expect(sanitizeXHandle('  @Handle99')).toBe('Handle99');
        expect(sanitizeXHandle('plain')).toBe('plain');
        expect(sanitizeXHandle(null)).toBe('');
    });
    it('enforces official 𝕏 rules (1-15 letters/digits/_)', () => {
        expect(validateXHandle('riley_reid')).toBe(true);
        expect(validateXHandle('A')).toBe(true);
        expect(validateXHandle('')).toBe(false);
        expect(validateXHandle('a'.repeat(16))).toBe(false);
        expect(validateXHandle('no-dashes!')).toBe(false);
        expect(validateXHandle('مقبول')).toBe(false);
    });
});

describe('Temple gateway — application statement', () => {
    it('requires at least 15 trimmed characters', () => {
        expect(validateApplicationNote('short')).toBe(false);
        expect(validateApplicationNote('   ')).toBe(false);
        expect(validateApplicationNote('I wish to serve the Temple faithfully')).toBe(true);
        expect(validateApplicationNote('        exactly twenty chars      ')).toBe(true); // 18 trimmed
    });
    it('caps oversized essays', () => {
        expect(validateApplicationNote('x'.repeat(2001))).toBe(false);
        expect(validateApplicationNote('x'.repeat(2000))).toBe(true);
    });
});

describe('regression — character name validation intact', () => {
    it('still blocks markup names', () => {
        expect(validateCharacterName('<img src=x>')).toBe(false);
        expect(validateCharacterName('Riley Reid')).toBe(true);
    });
});
