export function successResponse(data, status = 200, customHeaders = {}) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (customHeaders) {
        if (customHeaders instanceof Headers) {
            customHeaders.forEach((val, key) => headers.append(key, val));
        } else {
            for (const [key, val] of Object.entries(customHeaders)) {
                if (Array.isArray(val)) {
                    for (const v of val) headers.append(key, v);
                } else if (val !== undefined && val !== null) {
                    headers.append(key, val);
                }
            }
        }
    }
    return new Response(JSON.stringify({ success: true, data }), {
        status,
        headers
    });
}

export function errorResponse(message, status = 400, customHeaders = {}) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (customHeaders) {
        if (customHeaders instanceof Headers) {
            customHeaders.forEach((val, key) => headers.append(key, val));
        } else {
            for (const [key, val] of Object.entries(customHeaders)) {
                if (Array.isArray(val)) {
                    for (const v of val) headers.append(key, v);
                } else if (val !== undefined && val !== null) {
                    headers.append(key, val);
                }
            }
        }
    }
    return new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers
    });
}
