import { successResponse, errorResponse } from '../../lib/response.js';
import { authenticateUser } from '../../lib/auth.js';
import { generateRandomString, hashToken } from '../../lib/crypto.js';

export async function onRequestGet(context) {
    const { request, env } = context;
    const authResult = await authenticateUser(request, env.DB);
    
    if (authResult.error) {
        return errorResponse(authResult.error, authResult.status);
    }

    try {
        const csrfToken = generateRandomString(32);
        const csrfTokenHash = await hashToken(csrfToken);
        
        await env.DB.prepare(`
            UPDATE sessions SET csrf_token_hash = ? WHERE id = ?
        `).bind(csrfTokenHash, authResult.sessionId).run();
        
        return successResponse({
            user: authResult.user,
            csrfToken: csrfToken
        });
    } catch (e) {
        return successResponse({
            user: authResult.user
        });
    }
}
