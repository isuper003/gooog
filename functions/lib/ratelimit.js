// D1-backed fixed-window rate limiter.
//
// One atomic statement per check: the INSERT..ON CONFLICT..RETURNING upsert
// resets the counter when the previous window has rolled over and otherwise
// increments it, returning the current hit count. No read-modify-write race.
//
// Fail-open policy: if the rate-limit store itself errors, requests proceed
// (availability over strictness) — but the error is logged loudly.

const CLEANUP_PROBABILITY = 0.02; // ~2% of checks also sweep expired rows

export async function checkRateLimit(db, bucketKey, limit, windowMs) {
    try {
        const now = Date.now();
        const windowStart = now - (now % windowMs);

        const row = await db.prepare(`
            INSERT INTO rate_limit_buckets (bucket_key, window_start_ms, hit_count)
            VALUES (?, ?, 1)
            ON CONFLICT(bucket_key) DO UPDATE SET
                hit_count = CASE
                    WHEN rate_limit_buckets.window_start_ms = excluded.window_start_ms
                    THEN rate_limit_buckets.hit_count + 1
                    ELSE 1
                END,
                window_start_ms = excluded.window_start_ms
            RETURNING hit_count
        `).bind(bucketKey, windowStart).first();

        const hits = row?.hit_count ?? 1;

        if (Math.random() < CLEANUP_PROBABILITY) {
            // Fire-and-forget sweep of buckets whose window ended long ago.
            db.prepare("DELETE FROM rate_limit_buckets WHERE window_start_ms < ?")
                .bind(now - (7 * 24 * 60 * 60 * 1000))
                .run().catch(() => {});
        }

        return { allowed: hits <= limit, hits };
    } catch (e) {
        console.error(`Rate limit check failed for [${bucketKey}]`, e);
        return { allowed: true, hits: 0 };
    }
}

export function getClientIp(request) {
    return request.headers.get('CF-Connecting-IP')
        || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
        || 'unknown';
}

export function tooManyRequests() {
    return new Response(JSON.stringify({ success: false, error: 'Too many requests. Slow down and try again shortly.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
    });
}
