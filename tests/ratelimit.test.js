import { describe, it, expect, vi } from 'vitest';
import { checkRateLimit } from '../functions/lib/ratelimit.js';

// Minimal D1 stub: emulates the rate_limit_buckets table semantics used by
// checkRateLimit (INSERT..ON CONFLICT..RETURNING hit_count).
function makeMockDb() {
    const buckets = new Map();
    const prepare = (sql) => ({
        // We parse the bind values rather than the SQL: the lib always binds
        // [bucketKey, windowStart] for the upsert.
        async first(...args) {
            void sql;
            const [key, windowStart] = args;
            if (sql.includes('DELETE FROM rate_limit_buckets')) return null;
            if (!sql.includes('RETURNING')) return null;
            const current = buckets.get(key);
            let hits;
            if (current && current.window_start_ms === windowStart) {
                hits = current.hit_count + 1;
            } else {
                hits = 1;
            }
            buckets.set(key, { window_start_ms: windowStart, hit_count: hits });
            return { hit_count: hits };
        },
        run: async () => ({ success: true }),
        bind(...args) {
            this._args = args;
            return {
                first: () => prepare(sql).first(...this._args),
                run: async () => ({ success: true })
            };
        }
    });
    // attach sql text per call
    const db = {
        _calls: [],
        prepare(sql) {
            const stmt = {
                _sql: sql,
                first: async (...args) => emulate(sql, args),
                run: async () => ({ success: true }),
                all: async () => ({ results: [] }),
                bind(...args) {
                    return { first: (...a) => emulate(sql, args), run: async () => ({ success: true }), all: async () => ({ results: [] }) };
                }
            };
            db._calls.push(sql);
            return stmt;
        }
    };

    function emulate(sql, args) {
        if (!sql.includes('rate_limit_buckets')) return null;
        const [key, windowStart] = args;
        const current = buckets.get(key);
        let hits;
        if (current && current.window_start_ms === windowStart) {
            hits = current.hit_count + 1;
        } else {
            hits = 1;
        }
        buckets.set(key, { window_start_ms: windowStart, hit_count: hits });
        return { hit_count: hits };
    }

    return db;
}

describe('checkRateLimit', () => {
    it('allows requests under the limit and blocks beyond it', async () => {
        const db = makeMockDb();
        const results = [];
        for (let i = 0; i < 6; i++) {
            results.push(await checkRateLimit(db, 'login:ip:1.2.3.4', 5, 60000));
        }
        expect(results.slice(0, 5).every(r => r.allowed)).toBe(true);
        expect(results[5].allowed).toBe(false);
        expect(results[5].hits).toBe(6);
    });

    it('starts a fresh window after the previous one rolls over', async () => {
        const db = makeMockDb();
        vi.useFakeTimers();
        const t0 = 1_700_000_000_000;
        vi.setSystemTime(t0);

        for (let i = 0; i < 3; i++) await checkRateLimit(db, 'k', 2, 60_000);
        const blocked = await checkRateLimit(db, 'k', 2, 60_000);
        expect(blocked.allowed).toBe(false);

        // Advance past the fixed window boundary -> counter resets.
        vi.setSystemTime(t0 + 61_000);
        const fresh = await checkRateLimit(db, 'k', 2, 60_000);
        expect(fresh.allowed).toBe(true);
        expect(fresh.hits).toBe(1);

        vi.useRealTimers();
    });

    it('tracks separate buckets independently', async () => {
        const db = makeMockDb();
        await checkRateLimit(db, 'userA', 1, 60000);
        const aBlocked = await checkRateLimit(db, 'userA', 1, 60000);
        const bOk = await checkRateLimit(db, 'userB', 1, 60000);
        expect(aBlocked.allowed).toBe(false);
        expect(bOk.allowed).toBe(true);
    });

    it('fails open when the store errors', async () => {
        const brokenDb = {
            prepare() { throw new Error('D1 down'); }
        };
        const result = await checkRateLimit(brokenDb, 'x', 1, 60000);
        expect(result.allowed).toBe(true);
    });
});
