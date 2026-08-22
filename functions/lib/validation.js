// Shared server-side validation helpers (single source of truth for both
// POST /api/characters and PUT /api/characters/:id).

// Letters (any script), numbers, spaces, and a small safe punctuation set.
// Blocks HTML/JS metacharacters (<, >, ", ', `, =, ;) at the door so a stored
// name can never become an XSS payload downstream.
const NAME_RE = /^[\p{L}\p{N} .\-']{2,80}$/u;

// Temple gateway username rule (blueprint §1.A.1): 3-20 chars of a-z, 0-9,
// hyphen and underscore only.
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

// Official 𝕏 handle rules (blueprint §1.A.3): 1-15 of letters, numbers,
// underscores. The leading '@' and surrounding whitespace are stripped
// before validation by sanitizeXHandle().
const X_HANDLE_RE = /^[_a-zA-Z0-9]{1,15}$/;

const APPLICATION_NOTE_MIN = 15;
const APPLICATION_NOTE_MAX = 2000;
const LABEL_MAX = 60;
const URL_MAX = 512;
const IMAGE_HOST_SUFFIXES = ['.pornpics.com', '.phncdn.com'];

export function validateUsername(username) {
    return typeof username === 'string' && USERNAME_RE.test(username);
}

export function sanitizeXHandle(raw) {
    if (typeof raw !== 'string') return '';
    let handle = raw.trim();
    if (handle.startsWith('@')) handle = handle.slice(1);
    return handle.trim();
}

export function validateXHandle(sanitizedHandle) {
    return typeof sanitizedHandle === 'string' && X_HANDLE_RE.test(sanitizedHandle);
}

export function validateApplicationNote(note) {
    if (typeof note !== 'string') return false;
    const trimmed = note.trim();
    return trimmed.length >= APPLICATION_NOTE_MIN && trimmed.length <= APPLICATION_NOTE_MAX;
}

export { APPLICATION_NOTE_MIN };

export function validateCharacterName(name) {
    return typeof name === 'string' && NAME_RE.test(name.trim());
}

export function validateLabel(label) {
    if (label === undefined || label === null || label === '') return true;
    return typeof label === 'string' && label.trim().length <= LABEL_MAX && !/[<>"]/.test(label);
}

export function validateImageUrls(images) {
    for (const raw of images) {
        const url = typeof raw === 'string' ? raw.trim() : '';
        if (!url) continue;
        if (url.length > URL_MAX) return "Image URL is too long.";
        let parsed;
        try {
            parsed = new URL(url);
        } catch (e) {
            return "Invalid image URL format.";
        }
        // HTTPS-only, no credentials in URL, no exotic schemes.
        if (parsed.protocol !== 'https:') {
            return "Image URLs must use https://";
        }
        if (parsed.username || parsed.password) {
            return "Image URLs must not contain credentials.";
        }
    }
    return null;
}

// Centralizes the pornpics CDN resolution upgrade so it only ever runs on
// hosts we actually intend to rewrite — never on unrelated URLs.
export function hqImageUrl(rawUrl) {
    const url = String(rawUrl || '').trim();
    try {
        const parsed = new URL(url);
        const isKnownCdn = IMAGE_HOST_SUFFIXES.some(suffix => parsed.hostname.endsWith(suffix));
        return isKnownCdn ? url.replace(/\/(?:460|300|560)\//g, '/1280/') : url;
    } catch (e) {
        return url;
    }
}
