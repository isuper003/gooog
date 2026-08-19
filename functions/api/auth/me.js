import { successResponse, errorResponse } from '../../lib/response.js';
import { authenticateUser } from '../../lib/auth.js';

export async function onRequestGet(context) {
    const { request, env } = context;
    const authResult = await authenticateUser(request, env.DB);
    
    if (authResult.error) {
        return errorResponse(authResult.error, authResult.status);
    }
    
    return successResponse({
        user: authResult.user
    });
}
