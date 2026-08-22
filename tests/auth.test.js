import { describe, it, expect } from 'vitest';
import { parseCookies, createCookieHeader } from '../functions/lib/auth.js';

describe('Auth Helpers', () => {
    it('should parse cookie headers correctly even with = in token values', () => {
        const header = '__Host-goooog_session=abc123==; theme=dark; user=john=doe';
        const parsed = parseCookies(header);
        expect(parsed['__Host-goooog_session']).toBe('abc123==');
        expect(parsed['theme']).toBe('dark');
        expect(parsed['user']).toBe('john=doe');
    });

    it('should handle empty or null cookie headers', () => {
        expect(parseCookies('')).toEqual({});
        expect(parseCookies(null)).toEqual({});
        expect(parseCookies(undefined)).toEqual({});
    });

    it('should format session cookie correctly for login and logout', () => {
        const loginCookie = createCookieHeader('__Host-goooog_session', 'mytoken', 86400);
        expect(loginCookie).toContain('__Host-goooog_session=mytoken');
        expect(loginCookie).toContain('HttpOnly');
        expect(loginCookie).toContain('Secure');
        expect(loginCookie).toContain('SameSite=Lax');
        expect(loginCookie).toContain('Max-Age=86400');

        const logoutCookie = createCookieHeader('__Host-goooog_session', '', 0, true);
        expect(logoutCookie).toContain('Max-Age=0');
    });

    it('plain fallback cookie mirrors the request protocol (http dev persistence)', () => {
        const httpsCookie = createCookieHeader('goooog_session', 't', 86400, false, true);
        expect(httpsCookie).toContain('Secure');

        // http dev: Secure must be OMITTED or browsers drop the cookie and
        // every page refresh logs the user out.
        const httpCookie = createCookieHeader('goooog_session', 't', 86400, false, false);
        expect(httpCookie).not.toContain('Secure');
        expect(httpCookie).toContain('HttpOnly');
        expect(httpCookie).toContain('SameSite=Lax');
    });

    it('__Host- prefix always forces Secure regardless of the flag', () => {
        expect(createCookieHeader('__Host-goooog_session', 't', 86400, false, false)).toContain('Secure');
    });
});
