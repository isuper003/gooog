// Shared server-side validation helpers (single source of truth for both
// POST /api/characters and PUT /api/characters/:id).

// Letters (any script), numbers, spaces, and a small safe punctuation set.
// Blocks HTML/JS metacharacters (<, >, ", ', `, =, ;) at the door so a stored
// name can never become an XSS payload downstream.
const NAME_RE = /^[\p{L}\p{N} .\-']{2,80}$/u;

const LABEL_MAX = 60;
const URL_MAX = 512;
const IMAGE_HOST_SUFFIXES = ['.pornpics.com', '.phncdn.com'];

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
