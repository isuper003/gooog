import { successResponse, errorResponse } from '../../lib/response.js';
import { generateUUID, hashPassword, generateRandomString } from '../../lib/crypto.js';
import { checkRateLimit, getClientIp, tooManyRequests } from '../../lib/ratelimit.js';
import {
    validateUsername,
    sanitizeXHandle,
    validateXHandle,
    validateApplicationNote
} from '../../lib/validation.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }

    const { username, password, xHandle, applicationNote } = body;

    // Blueprint §1.A.1 — 3-20 of a-z/0-9/-/_
    if (!validateUsername(username)) {
        return errorResponse("Username must be 3-20 characters (letters, numbers, - and _ only).", 400);
    }

    // Upper bound matters as much as the lower one: PBKDF2 cost scales with
    // input length, so an unbounded password is a CPU-amplification DoS.
    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
        return errorResponse("Password must be between 6 and 128 characters long.", 400);
    }

    // Blueprint §1.A.3 — required, sanitized 𝕏 handle
    const sanitizedHandle = sanitizeXHandle(xHandle);
    if (!sanitizedHandle || !validateXHandle(sanitizedHandle)) {
        return errorResponse("A valid 𝕏 handle is required (1-15 letters, numbers or underscores).", 400);
    }

    // Blueprint §1.A.4 — required application statement (≥15 chars)
    if (!validateApplicationNote(applicationNote)) {
        return errorResponse("The Temple Application Statement is required (15-2000 characters).", 400);
    }

    const normalizedUsername = username.trim().toLowerCase();
    const trimmedHandle = sanitizedHandle;
    const trimmedNote = applicationNote.trim();

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
    const nowMs = Date.now();

    try {
        await db.prepare(`
            INSERT INTO users (id, username, username_normalized, password_hash, password_salt, role, status,
                               x_handle, application_note, created_at_ms)
            VALUES (?, ?, ?, ?, ?, 'user', 'pending', ?, ?, ?)
        `).bind(userId, username.trim(), normalizedUsername, passwordHash, salt, trimmedHandle, trimmedNote, nowMs).run();

        return successResponse({
            message: "Your request to join the Temple has been successfully received! 🏛️📜",
            detail: "Your application is currently under review by the Temple Keepers. You will be able to log in as soon as your membership has been approved and consecrated.",
            status: "pending"
        }, 201);
    } catch (error) {
        console.error(error);
        return errorResponse("Database error during registration", 500);
    }
}
