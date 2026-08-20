import { successResponse, errorResponse } from '../../lib/response.js';
import { generateUUID, hashPassword, generateRandomString, hashToken } from '../../lib/crypto.js';
import { createCookieHeader } from '../../lib/auth.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }

    const { username, password, rememberMe } = body;
    
    if (!username || !password) {
        return errorResponse("Username and password are required.", 400);
    }
    
    const normalizedUsername = username.trim().toLowerCase();
    const db = env.DB;
    
    try {
        const stmt = db.prepare("SELECT id, password_hash, password_salt, role, deleted_at_ms, deletion_requested_at_ms FROM users WHERE username_normalized = ?").bind(normalizedUsername);
        const user = await stmt.first();
        
        if (!user) {
            await hashPassword(password, generateRandomString(32));
            return errorResponse("Invalid username or password", 401);
        }

        if (user.deleted_at_ms) {
            return errorResponse("This account has been deleted.", 403);
        }
        
        const providedHash = await hashPassword(password, user.password_salt);
        
        if (providedHash !== user.password_hash) {
            return errorResponse("Invalid username or password", 401);
        }

        // If user had requested deletion within grace period, cancel it upon successful login
        if (user.deletion_requested_at_ms) {
            await db.prepare("UPDATE users SET deletion_requested_at_ms = NULL WHERE id = ?").bind(user.id).run();
        }
        
        const sessionId = generateUUID();
        const sessionToken = generateRandomString(64); 
        const csrfToken = generateRandomString(32); 
        
        const tokenHash = await hashToken(sessionToken);
        const csrfTokenHash = await hashToken(csrfToken);
        
        const isRememberMe = rememberMe === true;
        const maxAge = isRememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
        const expiresAtMs = Date.now() + (maxAge * 1000);
        
        await db.prepare(`
            INSERT INTO sessions (id, user_id, token_hash, csrf_token_hash, remember_me, expires_at_ms)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(sessionId, user.id, tokenHash, csrfTokenHash, isRememberMe ? 1 : 0, expiresAtMs).run();
        
        await updateDailyStreak(db, user.id);
        
        const isHttps = new URL(request.url).protocol === 'https:';
        const cookieHeaders = [
            createCookieHeader('goooog_session', sessionToken, maxAge, false, isHttps)
        ];
        if (isHttps) {
            cookieHeaders.push(createCookieHeader('__Host-goooog_session', sessionToken, maxAge, false, true));
        }
        
        return successResponse({ 
            message: "Login successful",
            role: user.role,
            user: {
                id: user.id,
                username: normalizedUsername,
                role: user.role
            },
            csrfToken: csrfToken 
        }, 200, {
            'Set-Cookie': cookieHeaders
        });
        
    } catch (error) {
        console.error("Login error", error);
        return errorResponse("Internal server error", 500);
    }
}

async function updateDailyStreak(db, userId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        const streakStmt = db.prepare("SELECT current_streak, longest_streak, last_login_date_utc, unlocked_milestones_json FROM daily_streaks WHERE user_id = ?").bind(userId);
        const streakRecord = await streakStmt.first();
        
        if (!streakRecord) {
            await db.prepare(`
                INSERT INTO daily_streaks (user_id, current_streak, longest_streak, last_login_date_utc, unlocked_milestones_json)
                VALUES (?, 1, 1, ?, '[]')
            `).bind(userId, today).run();
        } else {
            if (streakRecord.last_login_date_utc === today) {
                return;
            }
            
            let newStreak = 1;
            if (streakRecord.last_login_date_utc === yesterday) {
                newStreak = streakRecord.current_streak + 1;
            }
            
            const newLongest = Math.max(newStreak, streakRecord.longest_streak);
            
            await db.prepare(`
                UPDATE daily_streaks 
                SET current_streak = ?, longest_streak = ?, last_login_date_utc = ?
                WHERE user_id = ?
            `).bind(newStreak, newLongest, today, userId).run();
        }
    } catch (e) {
        console.error("Failed to update daily streak", e);
    }
}
