import { successResponse, errorResponse } from '../../lib/response.js';
import { generateUUID } from '../../lib/crypto.js';

export async function onRequestPut(context) {
    const { env, request, params, data } = context;
    const db = env.DB;
    const characterId = params.id;
    
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
    
    for (const url of images) {
        if (typeof url !== 'string' || (!url.startsWith('https://') && !url.startsWith('http://'))) {
            return errorResponse("Invalid image URL. Must be a valid http/https URL.", 400);
        }
    }
    
    try {
        const char = await db.prepare("SELECT id, submitted_by_user_id FROM characters WHERE id = ? AND deleted_at_ms IS NULL").bind(characterId).first();
        if (!char) return errorResponse("Character not found", 404);
        
        // Authorization: Owner or Admin/Moderator
        const isOwner = char.submitted_by_user_id === data.user.id;
        const isAdmin = data.user.role === 'admin' || data.user.role === 'moderator';
        if (!isOwner && !isAdmin) {
            return errorResponse("Unauthorized to edit this character", 403);
        }
        
        const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ');
        
        const stmts = [];
        stmts.push(
            db.prepare(`
                UPDATE characters 
                SET name = ?, normalized_name = ?, category = ?, label = ?
                WHERE id = ?
            `).bind(name.trim(), normalizedName, category, label || null, characterId)
        );
        
        // Replace images
        stmts.push(db.prepare("DELETE FROM character_images WHERE character_id = ?").bind(characterId));
        
        images.forEach((url, idx) => {
            const hqUrl = url.trim().replace(/\/(?:460|300|560)\//g, '/1280/');
            const imgId = generateUUID();
            stmts.push(
                db.prepare(`
                    INSERT INTO character_images (id, character_id, image_url, display_order, created_at_ms)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(imgId, characterId, hqUrl, idx + 1, Date.now())
            );
        });
        
        await db.batch(stmts);
        
        return successResponse({ message: "Character updated successfully", id: characterId });
        
    } catch (e) {
        console.error("Character update error", e);
        return errorResponse("Failed to update character", 500);
    }
}

export async function onRequestDelete(context) {
    const { env, params, data } = context;
    const db = env.DB;
    const characterId = params.id;
    
    try {
        const char = await db.prepare("SELECT id, submitted_by_user_id FROM characters WHERE id = ? AND deleted_at_ms IS NULL").bind(characterId).first();
        if (!char) return errorResponse("Character not found", 404);
        
        const isOwner = char.submitted_by_user_id === data.user.id;
        const isAdmin = data.user.role === 'admin' || data.user.role === 'moderator';
        if (!isOwner && !isAdmin) {
            return errorResponse("Unauthorized to delete this character", 403);
        }
        
        // Soft delete
        await db.prepare("UPDATE characters SET deleted_at_ms = ?, status = 'deleted' WHERE id = ?").bind(Date.now(), characterId).run();
        
        return successResponse({ message: "Character deleted successfully", id: characterId });
        
    } catch (e) {
        console.error("Character delete error", e);
        return errorResponse("Failed to delete character", 500);
    }
}
