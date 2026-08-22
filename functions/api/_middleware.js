import { errorResponse } from '../lib/response.js';
import { authenticateUser } from '../lib/auth.js';
import { checkRateLimit, tooManyRequests } from '../lib/ratelimit.js';

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

    // Per-user mutation budget: tighter windows on the expensive/abusable
    // routes (game session creation, worship point economy), generous
    // baseline elsewhere. GETs are untouched.
    const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
    if (MUTATION_METHODS.has(request.method.toUpperCase())) {
        try {
            const limit = routeMutationLimit(url.pathname);
            const rl = await checkRateLimit(env.DB, `mut:${authResult.user.id}:${limit.key}`, limit.max, limit.windowMs);
            if (!rl.allowed) return tooManyRequests();
        } catch (e) {
            console.error('Middleware rate limit failed', e);
        }
    }

    return context.next();
}

function routeMutationLimit(pathname) {
    if (pathname === '/api/game/start') return { key: 'gstart', max: 10, windowMs: 60 * 1000 };
    if (pathname === '/api/game/answers') return { key: 'gans', max: 150, windowMs: 60 * 1000 };
    if (pathname === '/api/worship') return { key: 'wship', max: 90, windowMs: 60 * 1000 };
    if (pathname.startsWith('/api/moderation/reports')) return { key: 'report', max: 10, windowMs: 5 * 60 * 1000 };
    if (pathname.startsWith('/api/crawler/')) return { key: 'crawl', max: 12, windowMs: 60 * 1000 };
    return { key: 'gen', max: 120, windowMs: 60 * 1000 };
}
