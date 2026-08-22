import { successResponse, errorResponse } from '../../lib/response.js';
import { generateUUID, hashPassword, generateRandomString } from '../../lib/crypto.js';
import { checkRateLimit, getClientIp, tooManyRequests } from '../../lib/ratelimit.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }

    const { username, password } = body;

    if (!username || typeof username !== 'string' || username.length < 3 || username.length > 20) {
        return errorResponse("Username must be between 3 and 20 characters.", 400);
    }

    // Upper bound matters as much as the lower one: PBKDF2 cost scales with
    // input length, so an unbounded password is a CPU-amplification DoS.
    if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
        return errorResponse("Password must be between 8 and 128 characters long.", 400);
    }

    const normalizedUsername = username.trim().toLowerCase();

    const db = env.DB;

    try {
        const rl = await checkRateLimit(db, `register:ip:${getClientIp(request)}`, 5, 60 * 60 * 1000);
        if (!rl.allowed) return tooManyRequests();
    } catch (e) {
        console.error('Register rate limit error', e);
    }

    const checkStmt = db.prepare("SELECT id FROM users WHERE username_normalized = ?").bind(normalizedUsername);
    const existingUser = await checkStmt.first();
    
    if (existingUser) {
        return errorResponse("Username already taken", 409);
    }
    
    const salt = generateRandomString(32);
    const passwordHash = await hashPassword(password, salt);
    const userId = generateUUID();
    
    try {
        await db.prepare(`
            INSERT INTO users (id, username, username_normalized, password_hash, password_salt, role)
            VALUES (?, ?, ?, ?, ?, 'user')
        `).bind(userId, username.trim(), normalizedUsername, passwordHash, salt).run();
        
        return successResponse({ message: "Registration successful" }, 201);
    } catch (error) {
        console.error(error);
        return errorResponse("Database error during registration", 500);
    }
}
