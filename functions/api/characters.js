import { successResponse, errorResponse } from '../lib/response.js';
import { generateUUID } from '../lib/crypto.js';
import { authenticateUser } from '../lib/auth.js';

export async function onRequestGet(context) {
    const { env, request } = context;
    const db = env.DB;
    const url = new URL(request.url);
    
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const category = url.searchParams.get('category');
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
        
        if (results && results.length > 0) {
            const charIds = results.map(r => r.id);
            const placeholders = charIds.map(() => '?').join(',');
            const { results: images } = await db.prepare(`
                SELECT character_id, image_url, display_order 
                FROM character_images 
                WHERE character_id IN (${placeholders})
                ORDER BY character_id, display_order
            `).bind(...charIds).all();
            
            const imageMap = {};
            (images || []).forEach(img => {
                if (!imageMap[img.character_id]) imageMap[img.character_id] = [];
                imageMap[img.character_id].push(img.image_url);
            });
            
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
    
    if (!name || !category || !images || !Array.isArray(images) || images.length === 0 || images.length > 4) {
        return errorResponse("Invalid character data. Provide name, category, and 1-4 images.", 400);
    }
    
    // Validate image URLs
    for (const url of images) {
        const trimmed = typeof url === 'string' ? url.trim() : '';
        if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
            return errorResponse("Invalid image URL. Must be a valid http/https URL.", 400);
        }
    }
    
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
                    const hqUrl = url.trim().replace(/\/(?:460|300|560)\//g, '/1280/');
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
                // Ensure max 1280px resolution for pornpics CDN images
                const hqUrl = url.trim().replace(/\/(?:460|300|560)\//g, '/1280/');
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
        if (e.message && e.message.includes('UNIQUE constraint failed')) {
            return errorResponse("Character with this name already exists", 409);
        }
        console.error("Error adding character", e);
        return errorResponse("Database error", 500);
    }
}
