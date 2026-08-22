import { successResponse, errorResponse } from '../../lib/response.js';
import { generateUUID } from '../../lib/crypto.js';
import { validateCharacterName, validateImageUrls, hqImageUrl } from '../../lib/validation.js';

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

    if (!validateCharacterName(name)) {
        return errorResponse("Invalid character name. Use 2-80 letters, numbers, spaces or .-'& characters.", 400);
    }
    if (!category || !['trans', 'sluts', 'twinks'].includes(category)) {
        return errorResponse("Invalid category", 400);
    }
    if (!images || !Array.isArray(images) || images.length === 0 || images.length > 4) {
        return errorResponse("Invalid character data. Provide name, category, and 1-4 images.", 400);
    }

    const urlError = validateImageUrls(images);
    if (urlError) return errorResponse(urlError, 400);

    try {
        const char = await db.prepare("SELECT id, status, submitted_by_user_id FROM characters WHERE id = ? AND deleted_at_ms IS NULL").bind(characterId).first();
        if (!char) return errorResponse("Character not found", 404);

        // Authorization: Owner or Admin/Moderator
        const isOwner = char.submitted_by_user_id === data.user.id;
        const isAdmin = data.user.role === 'admin' || data.user.role === 'moderator';
        if (!isOwner && !isAdmin) {
            return errorResponse("Unauthorized to edit this character", 403);
        }

        // Moderation integrity: an owner rewriting an already-reviewed character
        // (approved/rejected) must send it back to the review queue — otherwise
        // the live content could be swapped after approval without any check.
        // Admin/moderator edits keep the current status.
        let newStatus = null;
        if (!isAdmin && (char.status === 'approved' || char.status === 'rejected')) {
            newStatus = 'pending';
        }

        const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ');

        const stmts = [];
        stmts.push(
            db.prepare(`
                UPDATE characters
                SET name = ?, normalized_name = ?, category = ?, label = ?${newStatus ? ', status = ?' : ''}
                WHERE id = ?
            `).bind(...(newStatus
                ? [name.trim(), normalizedName, category, label || null, newStatus, characterId]
                : [name.trim(), normalizedName, category, label || null, characterId]))
        );
        
        // Replace images
        stmts.push(db.prepare("DELETE FROM character_images WHERE character_id = ?").bind(characterId));
        
        images.forEach((url, idx) => {
            const imgId = generateUUID();
            stmts.push(
                db.prepare(`
                    INSERT INTO character_images (id, character_id, image_url, display_order, created_at_ms)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(imgId, characterId, hqImageUrl(url), idx + 1, Date.now())
            );
        });

        await db.batch(stmts);

        return successResponse({
            message: newStatus
                ? "Character updated and submitted for moderator re-review"
                : "Character updated successfully",
            status: newStatus || char.status,
            id: characterId
        });
        
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
