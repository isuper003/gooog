import { successResponse, errorResponse } from '../../lib/response.js';
import { generateUUID, hashPassword, generateRandomString } from '../../lib/crypto.js';

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
    
    if (!password || typeof password !== 'string' || password.length < 8) {
        return errorResponse("Password must be at least 8 characters long.", 400);
    }
    
    const normalizedUsername = username.trim().toLowerCase();
    
    const db = env.DB;
    
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
