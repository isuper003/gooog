import { successResponse, errorResponse } from '../../lib/response.js';
import { generateUUID, hashPassword, generateRandomString, hashToken } from '../../lib/crypto.js';
import { createCookieHeader, generateCsrfTokenForSession } from '../../lib/auth.js';
import { checkRateLimit, getClientIp, tooManyRequests } from '../../lib/ratelimit.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }

    const { username, password, rememberMe, timezoneOffsetMinutes } = body;

    if (!username || !password) {
        return errorResponse("Username and password are required.", 400);
    }

    const normalizedUsername = username.trim().toLowerCase();
    const db = env.DB;

    // Brute-force guard: per-IP and per-username fixed windows.
    try {
        const ipLimit = await checkRateLimit(db, `login:ip:${getClientIp(request)}`, 15, 5 * 60 * 1000);
        if (!ipLimit.allowed) return tooManyRequests();
        const userLimit = await checkRateLimit(db, `login:user:${normalizedUsername}`, 10, 5 * 60 * 1000);
        if (!userLimit.allowed) return tooManyRequests();
    } catch (e) {
        console.error('Login rate limit error', e);
    }

    try {
        const stmt = db.prepare("SELECT id, password_hash, password_salt, role, deleted_at_ms, deletion_requested_at_ms FROM users WHERE username_normalized = ?").bind(normalizedUsername);
        const user = await stmt.first();
        
        if (!user) {
            // Burn comparable CPU on unknown users so response timing does not
            // reveal whether a username exists.
            await hashPassword(password, generateRandomString(32));
            return errorResponse("Invalid username or password", 401);
        }

        const providedHash = await hashPassword(password, user.password_salt);

        if (providedHash !== user.password_hash || user.deleted_at_ms) {
            // Deleted accounts get the same generic verdict as wrong passwords:
            // no pre-auth oracle that discloses account state.
            return errorResponse("Invalid username or password", 401);
        }

        // If user had requested deletion within grace period, cancel it upon successful login
        if (user.deletion_requested_at_ms) {
            await db.prepare("UPDATE users SET deletion_requested_at_ms = NULL WHERE id = ?").bind(user.id).run();
        }
        
        const sessionId = generateUUID();
        const sessionToken = generateRandomString(64); 
        const tokenHash = await hashToken(sessionToken);
        const csrfToken = await generateCsrfTokenForSession(tokenHash);
        const csrfTokenHash = await hashToken(csrfToken);
        
        const isRememberMe = rememberMe !== false;
        const maxAge = 365 * 24 * 60 * 60; // 1 year perpetual session
        const expiresAtMs = Date.now() + (maxAge * 1000);
        
        await db.prepare(`
            INSERT INTO sessions (id, user_id, token_hash, csrf_token_hash, remember_me, expires_at_ms)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(sessionId, user.id, tokenHash, csrfTokenHash, isRememberMe ? 1 : 0, expiresAtMs).run();
        
        await updateDailyStreak(db, user.id, timezoneOffsetMinutes);
        
        // Cookies are always Secure: production is HTTPS-only (plan.md PWA
        // policy) and the __Host- prefix requires it. The duplicate plain-name
        // cookie eases transitions; both carry identical flags now.
        const cookieHeaders = [
            createCookieHeader('goooog_session', sessionToken, maxAge, false, true),
            createCookieHeader('__Host-goooog_session', sessionToken, maxAge, false, true)
        ];
        
        return successResponse({
            message: "Login successful",
            role: user.role,
            user: {
                id: user.id,
                username: normalizedUsername,
                role: user.role
            },
            // The raw session token intentionally stays out of the body:
            // the HttpOnly+Secure cookies above are the single transport.
            csrfToken: csrfToken
        }, 200, {
            'Set-Cookie': cookieHeaders
        });
        
    } catch (error) {
        console.error("Login error", error);
        return errorResponse("Internal server error", 500);
    }
}

async function updateDailyStreak(db, userId, timezoneOffsetMinutes) {
    try {
        // Resolve the user's calendar day. Defaults to UTC (plan.md contract);
        // when the client supplies its getTimezoneOffset() the local date is
        // derived so users near UTC boundaries do not lose daily streaks.
        const offsetMin = Number.isFinite(timezoneOffsetMinutes)
            ? Math.max(-840, Math.min(840, Math.trunc(timezoneOffsetMinutes)))
            : 0;
        const localNowMs = Date.now() - (offsetMin * 60 * 1000);
        const today = new Date(localNowMs).toISOString().split('T')[0];
        const yesterday = new Date(localNowMs - 86400000).toISOString().split('T')[0];

        // Single-statement upsert + conditional advance: no read-modify-write
        // window, so concurrent logins can never double-increment or clobber
        // each other. String dates compare chronologically (YYYY-MM-DD).
        await db.prepare(`
            INSERT INTO daily_streaks (user_id, current_streak, longest_streak, last_login_date_utc, unlocked_milestones_json)
            VALUES (?, 1, 1, ?, '[]')
            ON CONFLICT(user_id) DO UPDATE SET
                current_streak = CASE
                    WHEN daily_streaks.last_login_date_utc = ? THEN daily_streaks.current_streak
                    WHEN daily_streaks.last_login_date_utc = ? THEN daily_streaks.current_streak + 1
                    ELSE 1
                END,
                longest_streak = CASE
                    WHEN daily_streaks.last_login_date_utc = ? THEN daily_streaks.longest_streak
                    ELSE MAX(daily_streaks.longest_streak, CASE
                        WHEN daily_streaks.last_login_date_utc = ? THEN daily_streaks.current_streak + 1
                        ELSE 1
                    END)
                END,
                last_login_date_utc = ?
            WHERE daily_streaks.last_login_date_utc IS NULL OR daily_streaks.last_login_date_utc < ?
        `).bind(userId, today, today, yesterday, today, yesterday, today, userId, today).run();
    } catch (e) {
        console.error("Failed to update daily streak", e);
    }
}
