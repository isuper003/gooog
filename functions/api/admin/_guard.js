import { successResponse, errorResponse } from '../../lib/response.js';

// Staff gate shared by the admin user-management endpoints.
// View/approve/reject/ban: admin or moderator. Destructive & privilege ops
// (role change, password reset, hard purge): admin only — enforced per-route.
export function isStaff(user) {
    return !!user && (user.role === 'admin' || user.role === 'moderator');
}

export function isAdmin(user) {
    return !!user && user.role === 'admin';
}

export function forbidden(message = 'Access denied: Admin privileges required') {
    return errorResponse(message, 403);
}
