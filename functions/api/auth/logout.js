import { successResponse, errorResponse } from '../../lib/response.js';
import { createCookieHeader, parseCookies, SESSION_COOKIE_NAME, SECURE_SESSION_COOKIE_NAME } from '../../lib/auth.js';
import { hashToken } from '../../lib/crypto.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    const cookieHeader = request.headers.get('Cookie');
    const cookies = parseCookies(cookieHeader);
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const headerToken = request.headers.get('X-Session-Token');
    
    const sessionToken = cookies[SECURE_SESSION_COOKIE_NAME] || cookies[SESSION_COOKIE_NAME] || bearerToken || headerToken;
    
    if (sessionToken) {
        try {
            const tokenHash = await hashToken(sessionToken);
            const db = env.DB;
            const nowMs = Date.now();
            await db.prepare("UPDATE sessions SET revoked_at_ms = ? WHERE token_hash = ?").bind(nowMs, tokenHash).run();
        } catch (e) {
            console.error("Session revoke error", e);
        }
    }
    
    // Mirror the login protocol so clearing matches how each cookie was set.
    const isHttps = new URL(request.url).protocol === 'https:';
    const logoutCookies = [
        createCookieHeader(SECURE_SESSION_COOKIE_NAME, '', 0, true, true),
        createCookieHeader(SESSION_COOKIE_NAME, '', 0, true, isHttps)
    ];
    
    return successResponse({ message: "Logout successful" }, 200, {
        'Set-Cookie': logoutCookies
    });
}
