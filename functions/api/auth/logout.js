import { successResponse, errorResponse } from '../../lib/response.js';
import { createCookieHeader, parseCookies, SESSION_COOKIE_NAME } from '../../lib/auth.js';
import { hashToken } from '../../lib/crypto.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    const cookieHeader = request.headers.get('Cookie');
    
    if (cookieHeader) {
        const cookies = parseCookies(cookieHeader);
        const sessionToken = cookies[SESSION_COOKIE_NAME];
        
        if (sessionToken) {
            const tokenHash = await hashToken(sessionToken);
            const db = env.DB;
            const nowMs = Date.now();
            
            await db.prepare("UPDATE sessions SET revoked_at_ms = ? WHERE token_hash = ?").bind(nowMs, tokenHash).run();
        }
    }
    
    const logoutCookie = createCookieHeader(SESSION_COOKIE_NAME, '', 0, true);
    
    return successResponse({ message: "Logout successful" }, 200, {
        'Set-Cookie': logoutCookie
    });
}
