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

export async function generateCsrfTokenForSession(tokenOrHash) {
    if (!tokenOrHash) return '';
    return await hashToken(tokenOrHash + "_goooog_csrf_v1");
}

export async function validateCsrfProtection(request, session, sessionToken) {
    const method = request.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return { valid: true };
    }

    // 1. Custom Header Authentication (Bearer token or X-Session-Token) is immune to CSRF
    const authHeader = request.headers.get('Authorization');
    const hasBearer = authHeader?.startsWith('Bearer ') && authHeader.slice(7).trim().length > 0;
    const hasHeaderToken = !!request.headers.get('X-Session-Token');
    if (hasBearer || hasHeaderToken) {
        return { valid: true };
    }

    // 2. Same-Origin & Sec-Fetch-Site verification
    const secFetchSite = request.headers.get('Sec-Fetch-Site');
    if (secFetchSite === 'same-origin' || secFetchSite === 'same-site') {
        return { valid: true };
    }

    const origin = request.headers.get('Origin');
    if (origin) {
        try {
            const requestUrl = new URL(request.url);
            const originUrl = new URL(origin);
            if (originUrl.origin === requestUrl.origin || originUrl.host === requestUrl.host) {
                return { valid: true };
            }
        } catch (e) {}
    }

    // 3. X-Requested-With Header check (blocks simple cross-site HTML form submissions)
    const requestedWith = request.headers.get('X-Requested-With');
    if (requestedWith === 'XMLHttpRequest') {
        return { valid: true };
    }

    // 4. Token validation (Deterministic session CSRF or Database hash)
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (csrfToken) {
        const expectedDeterministicToken = await generateCsrfTokenForSession(tokenHash || sessionToken);
        if (csrfToken === expectedDeterministicToken) {
            return { valid: true };
        }
        const providedCsrfHash = await hashToken(csrfToken);
        if (session.csrf_token_hash && (providedCsrfHash === session.csrf_token_hash || csrfToken === session.csrf_token_hash)) {
            return { valid: true };
        }
    }

    return { valid: false, error: "Cross-site request forgery protection check failed", status: 403 };
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
    
    // Auto-extend rolling session so active users never expire unless they click logout
    if (session.expires_at_ms < now || (session.expires_at_ms - now < 60 * 24 * 60 * 60 * 1000)) {
        const newExpiry = now + (365 * 24 * 60 * 60 * 1000);
        try {
            await db.prepare("UPDATE sessions SET expires_at_ms = ?, last_seen_at_ms = ? WHERE id = ?")
                .bind(newExpiry, now, session.session_id)
                .run();
        } catch (e) {}
    }
    
    // Multi-layer CSRF validation
    const csrfCheck = await validateCsrfProtection(request, session, sessionToken);
    if (!csrfCheck.valid) {
        return { error: csrfCheck.error, status: csrfCheck.status };
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
        sessionToken: sessionToken,
        tokenHash: tokenHash
    };
}
