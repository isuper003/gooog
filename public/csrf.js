// In-memory CSRF Token manager (secure fallback to sessionStorage)
let memoryCsrfToken = '';

export function setCsrfToken(token) {
    if (token && typeof token === 'string') {
        memoryCsrfToken = token;
        try {
            sessionStorage.setItem('csrf_token', token);
            localStorage.setItem('csrf_token', token);
        } catch (e) {}
    }
}

export function getCsrfToken() {
    if (memoryCsrfToken) return memoryCsrfToken;
    try {
        const stored = sessionStorage.getItem('csrf_token') || localStorage.getItem('csrf_token');
        if (stored) {
            memoryCsrfToken = stored;
            return stored;
        }
    } catch (e) {}
    return '';
}

export function clearCsrfToken() {
    memoryCsrfToken = '';
    try {
        sessionStorage.removeItem('csrf_token');
        localStorage.removeItem('csrf_token');
    } catch (e) {}
}
