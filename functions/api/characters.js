import { successResponse, errorResponse } from '../lib/response.js';
import { generateUUID } from '../lib/crypto.js';
import { authenticateUser } from '../lib/auth.js';
import { validateCharacterName, validateLabel, validateImageUrls, hqImageUrl } from '../lib/validation.js';

export async function onRequestGet(context) {
    const { env, request } = context;
    const db = env.DB;
    const url = new URL(request.url);

    const isRandom = url.searchParams.get('random') === 'true' || url.searchParams.get('random') === '1';
    const category = url.searchParams.get('category');

    // Lightweight category counters: one GROUP BY query instead of shipping
    // the whole library to the client just to count it client-side.
    if (url.searchParams.get('counts') === '1') {
        try {
            const { results } = await db.prepare(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN c.category = 'trans' THEN 1 ELSE 0 END) as trans,
                    SUM(CASE WHEN c.category = 'sluts' THEN 1 ELSE 0 END) as sluts,
                    SUM(CASE WHEN c.category = 'twinks' THEN 1 ELSE 0 END) as twinks
                FROM characters c
                WHERE c.status = 'approved' AND c.deleted_at_ms IS NULL
            `).all();
            const row = results?.[0] || {};
            return successResponse({
                counts: {
                    total: row.total || 0,
                    trans: row.trans || 0,
                    sluts: row.sluts || 0,
                    twinks: row.twinks || 0
                }
            });
        } catch (e) {
            console.error("Character counts error", e);
            return errorResponse("Failed to fetch character counts", 500);
        }
    }

    // Small random sample for UI backdrops/decoration (no pagination needed).
    if (url.searchParams.get('random_sample') === '1') {
        try {
            const { results } = await db.prepare(`
                SELECT c.id, c.name, c.category, c.label, c.status, c.submitted_by_user_id, u.username as added_by
                FROM characters c
                LEFT JOIN users u ON c.submitted_by_user_id = u.id
                WHERE c.status = 'approved' AND c.deleted_at_ms IS NULL
                ORDER BY RANDOM() LIMIT 40
            `).all();
            const sample = results || [];
            if (sample.length > 0) {
                const ids = sample.map(r => r.id);
                const placeholders = ids.map(() => '?').join(',');
                const { results: imgs } = await db.prepare(`
                    SELECT character_id, image_url
                    FROM (
                        SELECT ci.character_id, ci.image_url,
                               ROW_NUMBER() OVER (PARTITION BY ci.character_id ORDER BY ci.display_order ASC) as rn
                        FROM character_images ci
                        WHERE ci.character_id IN (${placeholders})
                    )
                    WHERE rn = 1
                `).bind(...ids).all();
                const firstImg = {};
                (imgs || []).forEach(img => { if (!firstImg[img.character_id]) firstImg[img.character_id] = img.image_url; });
                sample.forEach(c => { c.images = [firstImg[c.id]].filter(Boolean); });
            }
            return successResponse({ characters: sample });
        } catch (e) {
            console.error("Random sample error", e);
            return errorResponse("Failed to fetch character sample", 500);
        }
    }

    // Fast single random approved character query
    if (isRandom) {
        let randQuery = `
            SELECT c.id, c.name, c.category, c.label, c.status, c.submitted_by_user_id, u.username as added_by
            FROM characters c
            LEFT JOIN users u ON c.submitted_by_user_id = u.id
            WHERE c.status = 'approved' AND c.deleted_at_ms IS NULL
        `;
        const randParams = [];
        if (category && ['sluts', 'trans', 'twinks'].includes(category)) {
            randQuery += " AND c.category = ?";
            randParams.push(category);
        }
        randQuery += " ORDER BY RANDOM() LIMIT 1";
        
        try {
            const { results } = await db.prepare(randQuery).bind(...randParams).all();
            if (!results || results.length === 0) {
                return errorResponse("No approved characters found", 404);
            }
            const character = results[0];
            const { results: images } = await db.prepare(`
                SELECT image_url, display_order 
                FROM character_images 
                WHERE character_id = ?
                ORDER BY display_order ASC
            `).bind(character.id).all();
            character.images = (images || []).map(img => img.image_url);
            return successResponse({ character });
        } catch (err) {
            console.error("Random character error", err);
            return errorResponse("Failed to fetch random character", 500);
        }
    }

    // Clamp pagination: SQLite treats a negative LIMIT as unlimited, which
    // turned `?limit=-1` into a full-table dump; keep sane bounds instead.
    const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
    const limit = Math.min(2000, Math.max(1, parseInt(url.searchParams.get('limit')) || 20));
    const status = url.searchParams.get('status') || 'approved';
    
    // Non-approved status (pending, rejected, hidden) requires admin/mod role
    if (status !== 'approved') {
        const auth = await authenticateUser(request, db);
        if (auth.error || (auth.user?.role !== 'admin' && auth.user?.role !== 'moderator')) {
            return errorResponse("Unauthorized to view non-approved characters", 403);
        }
    }
    
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT c.id, c.name, c.category, c.label, c.status, c.submitted_by_user_id, u.username as added_by
        FROM characters c
        LEFT JOIN users u ON c.submitted_by_user_id = u.id
        WHERE c.deleted_at_ms IS NULL
    `;
    const params = [];
    
    if (category) {
        query += " AND c.category = ?";
        params.push(category);
    }
    
    if (status) {
        query += " AND c.status = ?";
        params.push(status);
    }
    
    query += ` ORDER BY c.created_at_ms DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    try {
        const stmt = db.prepare(query);
        const { results } = await stmt.bind(...params).all();

        // Single round-trip for primary images: ROW_NUMBER() keeps the first
        // 4 ordered images per character, replacing the serial 30-id chunks
        // (ceil(N/30) queries) with one query.
        if (results && results.length > 0) {
            const charIds = results.map(r => r.id);
            const imageMap = {};
            const chunkSize = 90;

            for (let i = 0; i < charIds.length; i += chunkSize) {
                const chunk = charIds.slice(i, i + chunkSize);
                const placeholders = chunk.map(() => '?').join(',');
                const { results: imagesChunk } = await db.prepare(`
                    SELECT character_id, image_url
                    FROM (
                        SELECT ci.character_id, ci.image_url, ci.display_order,
                               ROW_NUMBER() OVER (PARTITION BY ci.character_id ORDER BY ci.display_order ASC) as rn
                        FROM character_images ci
                        WHERE ci.character_id IN (${placeholders})
                    )
                    WHERE rn <= 4
                    ORDER BY character_id, display_order ASC
                `).bind(...chunk).all();

                (imagesChunk || []).forEach(img => {
                    if (!imageMap[img.character_id]) imageMap[img.character_id] = [];
                    imageMap[img.character_id].push(img.image_url);
                });
            }

            results.forEach(char => {
                char.images = imageMap[char.id] || [];
            });
        }
        
        return successResponse({ characters: results || [], page, limit });
    } catch (e) {
        console.error("Error fetching characters", e);
        return errorResponse("Database error", 500);
    }
}

export async function onRequestPost(context) {
    const { env, request, data } = context;
    const db = env.DB;
    
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return errorResponse("Invalid JSON", 400);
    }
    
    const { name, category, label, images } = body;

    if (!validateCharacterName(name)) {
        return errorResponse("Invalid character name. Use 2-80 letters, numbers, spaces or .-'& characters.", 400);
    }
    if (!validateLabel(label)) {
        return errorResponse("Invalid label.", 400);
    }
    if (!images || !Array.isArray(images) || images.length === 0 || images.length > 4) {
        return errorResponse("Invalid character data. Provide name, category, and 1-4 images.", 400);
    }

    const urlError = validateImageUrls(images);
    if (urlError) return errorResponse(urlError, 400);
    
    const validCategories = ['trans', 'sluts', 'twinks'];
    if (!validCategories.includes(category)) {
        return errorResponse("Invalid category", 400);
    }
    
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ');
    const nowMs = Date.now();
    
    try {
        const check = await db.prepare("SELECT id, deleted_at_ms FROM characters WHERE normalized_name = ?").bind(normalizedName).first();
        if (check) {
            if (check.deleted_at_ms === null) {
                return errorResponse("Character with this name already exists", 409);
            }
            // If previously deleted, un-delete and update
            const status = (data.user.role === 'admin' || data.user.role === 'moderator') ? 'approved' : 'pending';
            await db.prepare(`
                UPDATE characters 
                SET name = ?, category = ?, label = ?, status = ?, submitted_by_user_id = ?, deleted_at_ms = NULL, created_at_ms = ?
                WHERE id = ?
            `).bind(name.trim(), category, label || null, status, data.user.id, nowMs, check.id).run();

            // Clear old images and insert new ones
            await db.prepare("DELETE FROM character_images WHERE character_id = ?").bind(check.id).run();
            const imgStmts = [];
            images.forEach((url, index) => {
                if (url && url.trim().length > 0) {
                    const hqUrl = hqImageUrl(url);
                    const imageId = generateUUID();
                    imgStmts.push(db.prepare(`
                        INSERT INTO character_images (id, character_id, image_url, display_order, created_at_ms)
                        VALUES (?, ?, ?, ?, ?)
                    `).bind(imageId, check.id, hqUrl, index + 1, nowMs));
                }
            });
            if (imgStmts.length > 0) await db.batch(imgStmts);
            return successResponse({ message: "Character restored and updated successfully", status, id: check.id }, 201);
        }
        
        const characterId = generateUUID();
        const status = (data.user.role === 'admin' || data.user.role === 'moderator') ? 'approved' : 'pending';
        
        const stmts = [];
        stmts.push(db.prepare(`
            INSERT INTO characters (id, name, normalized_name, category, label, status, submitted_by_user_id, created_at_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(characterId, name.trim(), normalizedName, category, label || null, status, data.user.id, nowMs));
        
        images.forEach((url, index) => {
            if (url && url.trim().length > 0) {
                const hqUrl = hqImageUrl(url);
                const imageId = generateUUID();
                stmts.push(db.prepare(`
                    INSERT INTO character_images (id, character_id, image_url, display_order, created_at_ms)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(imageId, characterId, hqUrl, index + 1, nowMs));
            }
        });
        
        await db.batch(stmts);
        
        return successResponse({ message: "Character added successfully", status, id: characterId }, 201);
    } catch (e) {
        if (/UNIQUE/i.test(e.message || '')) {
            return errorResponse("Character with this name already exists", 409);
        }
        console.error("Error adding character", e);
        return errorResponse("Database error", 500);
    }
}
