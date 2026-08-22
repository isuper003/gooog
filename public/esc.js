// HTML-escaping helper for the one place vanilla JS gives us no protection:
// template-literal interpolation into innerHTML. Any string that originates
// from the database or API (names, usernames, notes, errors) must pass
// through this before being embedded in markup.

export function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// For attribute contexts where quotes were already used around the value.
export function escAttr(value) {
    return esc(value);
}
