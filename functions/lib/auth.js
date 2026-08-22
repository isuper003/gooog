import { errorResponse } from './response.js';
import { hashToken } from './crypto.js';

export const SESSION_COOKIE_NAME = 'goooog_session';
export const SECURE_SESSION_COOKIE_NAME = '__Host-goooog_session';

export function createCookieHeader(name, value, maxAge, isLogout = false, isSecure = false) {
    const isHostPrefix = typeof name === 'string' && name.startsWith('__Host-');
    const secureFlag = (isSecure || isHostPrefix) ? '; Secure' : '';
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
    if (csrfToken && sessionToken) {
        const expectedDeterministicToken = await generateCsrfTokenForSession(sessionToken);
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

export async function authenticateUser(request, db) {    const cookieHeader = request.headers.get('Cookie');
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

    // Expiry is a hard boundary: expired sessions are rejected, never
    // resurrected (plan.md: 24h normal / 30d remember-me).
    if (session.expires_at_ms < now) return { error: 'Session expired', status: 401 };

    // Bounded rolling extension: only near-expiry sessions get pushed forward,
    // to the 30-day remember-me ceiling — not an infinite yearly lease.
    if (!session.revoked_at_ms && (session.expires_at_ms - now < 24 * 60 * 60 * 1000)) {
        const newExpiry = now + (30 * 24 * 60 * 60 * 1000);
        try {
            await db.prepare("UPDATE sessions SET expires_at_ms = ?, last_seen_at_ms = ? WHERE id = ? AND revoked_at_ms IS NULL")
                .bind(newExpiry, now, session.session_id)
                .run();
        } catch (e) {
            console.error('Session extension failed', e);
        }
    }

    // Deferred account deletion (plan.md §3): once the 14-day grace window has
    // passed, execute the promised purge lazily on the next authenticated hit.
    if (session.deletion_requested_at_ms && (now - session.deletion_requested_at_ms > 14 * 24 * 60 * 60 * 1000)) {
        await purgeDeletedAccount(db, session.user_id);
        return { error: 'This account has been permanently deleted.', status: 403 };
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

// Executes the permanent-deletion promise after the 14-day grace window:
// revokes every session, strips credentials and personal data, anonymizes the
// identity, but keeps a minimal audit trail (append-only, per plan.md §3).
async function purgeDeletedAccount(db, userId) {
    const now = Date.now();
    try {
        await db.batch([
            db.prepare("UPDATE sessions SET revoked_at_ms = ? WHERE user_id = ? AND revoked_at_ms IS NULL").bind(now, userId),
            db.prepare(`
                UPDATE users
                SET password_hash = '', password_salt = '', username = 'deleted-user',
                    deletion_requested_at_ms = NULL, deleted_at_ms = ?
                WHERE id = ?
            `).bind(now, userId),
            db.prepare("DELETE FROM user_character_progress WHERE user_id = ?").bind(userId),
            db.prepare("DELETE FROM daily_streaks WHERE user_id = ?").bind(userId),
            db.prepare("DELETE FROM user_settings WHERE user_id = ?").bind(userId)
        ]);
    } catch (e) {
        console.error('Deferred account purge failed', e);
    }
}
