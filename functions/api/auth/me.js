import { successResponse, errorResponse } from '../../lib/response.js';
import { authenticateUser, generateCsrfTokenForSession } from '../../lib/auth.js';

export async function onRequestGet(context) {
    const { request, env, data } = context;
    
    let user = data?.user;
    let sessionId = data?.sessionId;
    let sessionToken = data?.sessionToken;
    let tokenHash = data?.tokenHash;
    
    if (!user || !sessionId) {
        const authResult = await authenticateUser(request, env.DB);
        if (authResult.error) {
            return errorResponse(authResult.error, authResult.status);
        }
        user = authResult.user;
        sessionId = authResult.sessionId;
        sessionToken = authResult.sessionToken;
        tokenHash = authResult.tokenHash;
    }
    
    // Deterministic CSRF token based on session tokenHash
    const csrfToken = await generateCsrfTokenForSession(tokenHash || sessionToken);
    
    return successResponse({
        user,
        csrfToken
    });
}
