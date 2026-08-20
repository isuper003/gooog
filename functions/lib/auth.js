import { errorResponse } from './response.js';
import { hashToken } from './crypto.js';

export const SESSION_COOKIE_NAME = 'goooog_session';
export const SECURE_SESSION_COOKIE_NAME = '__Host-goooog_session';

export function createCookieHeader(name, value, maxAge, isLogout = false, isSecure = false) {
    const secureFlag = isSecure ? '; Secure' : '';
    if (isLogout) {
        return `${name}=; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=0`;
    }
    return `${name}=${value}; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=${maxAge}`;
}

export function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};
    const cookies = {};
    const items = cookieHeader.split(';');
    for (const item of items) {
        const idx = item.indexOf('=');
        if (idx !== -1) {
            const key = item.slice(0, idx).trim();
            const val = item.slice(idx + 1).trim();
            cookies[key] = val;
        }
    }
    return cookies;
}

export async function authenticateUser(request, db) {
    const cookieHeader = request.headers.get('Cookie');
    const cookies = parseCookies(cookieHeader);
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const headerToken = request.headers.get('X-Session-Token');
    
    const sessionToken = cookies[SECURE_SESSION_COOKIE_NAME] || cookies[SESSION_COOKIE_NAME] || bearerToken || headerToken;
    
    if (!sessionToken) return { error: "Unauthorized", status: 401 };
    
    const tokenHash = await hashToken(sessionToken);
    
    const stmt = db.prepare(`
        SELECT s.user_id, s.csrf_token_hash, u.role, u.username, u.deleted_at_ms, u.deletion_requested_at_ms,
               s.id as session_id, s.expires_at_ms, s.revoked_at_ms
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = ?
    `).bind(tokenHash);
    
    const session = await stmt.first();
    if (!session) return { error: "Unauthorized", status: 401 };
    if (session.deleted_at_ms) return { error: "This account has been deleted", status: 403 };
    
    const now = Date.now();
    if (session.revoked_at_ms) return { error: 'Session revoked', status: 401 };
    if (session.expires_at_ms < now) return { error: 'Session expired', status: 401 };
    
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase())) {
        const csrfToken = request.headers.get('X-CSRF-Token');
        if (!csrfToken) return { error: "CSRF token missing", status: 403 };
        
        const providedCsrfHash = await hashToken(csrfToken);
        if (providedCsrfHash !== session.csrf_token_hash) {
             return { error: "CSRF token invalid", status: 403 };
        }
    }
    
    return {
        user: {
            id: session.user_id,
            role: session.role,
            username: session.username,
            deletionRequestedAtMs: session.deletion_requested_at_ms
        },
        sessionId: session.session_id,
        sessionCsrfTokenHash: session.csrf_token_hash,
        tokenHash: tokenHash
    };
}
