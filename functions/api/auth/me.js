import { successResponse, errorResponse } from '../../lib/response.js';
import { authenticateUser } from '../../lib/auth.js';
import { generateRandomString, hashToken } from '../../lib/crypto.js';

export async function onRequestGet(context) {
    const { request, env, data } = context;
    
    let user = data?.user;
    let sessionId = data?.sessionId;
    
    if (!user || !sessionId) {
        const authResult = await authenticateUser(request, env.DB);
        if (authResult.error) {
            return errorResponse(authResult.error, authResult.status);
        }
        user = authResult.user;
        sessionId = authResult.sessionId;
    }
    
    // Generate fresh CSRF token and bind to session in DB
    const csrfToken = generateRandomString(32);
    const csrfTokenHash = await hashToken(csrfToken);
    
    try {
        await env.DB.prepare("UPDATE sessions SET csrf_token_hash = ?, last_seen_at_ms = ? WHERE id = ?")
            .bind(csrfTokenHash, Date.now(), sessionId)
            .run();
    } catch (e) {
        console.error("Failed to update session csrf token", e);
    }
    
    return successResponse({
        user,
        csrfToken
    });
}
