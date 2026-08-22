import { describe, it, expect } from 'vitest';
import {
    validateCharacterName,
    validateLabel,
    validateImageUrls,
    hqImageUrl
} from '../functions/lib/validation.js';

describe('validateCharacterName', () => {
    it('accepts normal names in any script', () => {
        expect(validateCharacterName('Riley Reid')).toBe(true);
        expect(validateCharacterName("Riley O'Neil")).toBe(true);
        expect(validateCharacterName('سلمى حايك')).toBe(true);
        expect(validateCharacterName('A.J. Applegate-2')).toBe(true);
    });

    it('rejects HTML/JS metacharacters outright', () => {
        expect(validateCharacterName('<img src=x onerror=alert(1>')).toBe(false);
        expect(validateCharacterName('Riley"Reid')).toBe(false);
        expect(validateCharacterName('Riley=Reid')).toBe(false);
        expect(validateCharacterName('<script>')).toBe(false);
    });

    it('enforces length bounds', () => {
        expect(validateCharacterName('A')).toBe(false);
        expect(validateCharacterName('A'.repeat(81))).toBe(false);
        expect(validateCharacterName('A'.repeat(80))).toBe(true);
    });

    it('rejects non-string input', () => {
        expect(validateCharacterName(null)).toBe(false);
        expect(validateCharacterName(undefined)).toBe(false);
        expect(validateCharacterName(42)).toBe(false);
    });
});

describe('validateLabel', () => {
    it('allows empty/undefined and short clean labels', () => {
        expect(validateLabel(undefined)).toBe(true);
        expect(validateLabel('')).toBe(true);
        expect(validateLabel('Top Rated')).toBe(true);
    });
    it('blocks markup and oversize labels', () => {
        expect(validateLabel('<b>bold</b>')).toBe(false);
        expect(validateLabel('x'.repeat(61))).toBe(false);
    });
});

describe('validateImageUrls', () => {
    it('accepts https URLs', () => {
        expect(validateImageUrls(['https://cdni.pornpics.com/models/r/r.jpg'])).toBeNull();
    });
    it('rejects http, credentials, junk, and oversized URLs', () => {
        expect(validateImageUrls(['http://cdni.pornpics.com/x.jpg'])).toMatch(/https/);
        expect(validateImageUrls(['https://user:pass@cdn.example.com/x.jpg'])).toMatch(/credentials/);
        expect(validateImageUrls(['not a url'])).toMatch(/format/);
        expect(validateImageUrls(['https://x.com/' + 'a'.repeat(600)])).toMatch(/too long/i);
    });
});

describe('hqImageUrl', () => {
    it('upgrades resolution only on known CDN hosts', () => {
        expect(hqImageUrl('https://cdni.pornpics.com/460/7/277/a.jpg'))
            .toBe('https://cdni.pornpics.com/1280/7/277/a.jpg');
    });
    it('leaves foreign hosts untouched', () => {
        const url = 'https://evil.example.com/460/a.jpg';
        expect(hqImageUrl(url)).toBe(url);
    });
    it('returns garbage input unchanged without throwing', () => {
        expect(hqImageUrl('::::not-a-url:::')).toBe('::::not-a-url:::');
        expect(hqImageUrl('')).toBe('');
    });
});
