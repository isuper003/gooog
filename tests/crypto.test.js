import { describe, it, expect } from 'vitest';
import { generateUUID, hashPassword, generateRandomString, hashToken } from '../functions/lib/crypto.js';

describe('Crypto Library', () => {
    it('should generate a valid UUID', () => {
        const uuid = generateUUID();
        expect(uuid).toBeDefined();
        expect(typeof uuid).toBe('string');
        expect(uuid.length).toBe(36);
    });

    it('should generate random strings of correct length', () => {
        const str = generateRandomString(32);
        expect(str).toBeDefined();
        expect(str.length).toBe(64); // hex representation of 32 bytes
    });

    it('should consistently hash a password with a salt', async () => {
        const password = "mySecurePassword123";
        const salt = generateRandomString(16);
        
        const hash1 = await hashPassword(password, salt);
        const hash2 = await hashPassword(password, salt);
        
        expect(hash1).toBe(hash2);
    });
    
    it('should consistently hash a token', async () => {
        const token = "sessionToken123456789";
        
        const hash1 = await hashToken(token);
        const hash2 = await hashToken(token);
        
        expect(hash1).toBe(hash2);
    });
});
