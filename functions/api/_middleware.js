import { errorResponse } from '../lib/response.js';
import { authenticateUser } from '../lib/auth.js';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    
    // Public routes that don't need authentication
    const publicRoutes = [
        '/api/auth/login',
        '/api/auth/register'
    ];
    
    if (publicRoutes.includes(url.pathname)) {
        return context.next();
    }
    
    // Protect all other /api routes
    const authResult = await authenticateUser(request, env.DB);
    if (authResult.error) {
        return errorResponse(authResult.error, authResult.status);
    }
    
    // Attach user and session to context for downstream handlers
    context.data = context.data || {};
    context.data.user = authResult.user;
    context.data.sessionId = authResult.sessionId;
    context.data.sessionToken = authResult.sessionToken;
    context.data.tokenHash = authResult.tokenHash;
    
    return context.next();
}
