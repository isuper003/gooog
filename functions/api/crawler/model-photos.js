import { successResponse, errorResponse } from '../../lib/response.js';
import { authenticateUser } from '../../lib/auth.js';

export async function onRequestGet(context) {
    const { env, request } = context;
    const db = env.DB;

    // Verify session AND staff role: outbound scraping is a staff-only tool.
    const auth = await authenticateUser(request, db);
    if (auth.error) {
        return errorResponse(auth.error, auth.status);
    }
    if (auth.user?.role !== 'admin' && auth.user?.role !== 'moderator') {
        return errorResponse("Crawler access requires moderator role", 403);
    }

    const url = new URL(request.url);
    let target = url.searchParams.get('slug') || url.searchParams.get('url') || '';

    if (!target) {
        return errorResponse("Missing slug or url parameter", 400);
    }

    // Extract slug from URL if full URL was provided
    let clean = target.trim();
    if (clean.includes('pornpics.com')) {
        const match = clean.match(/\/pornstars\/([a-z0-9_-]+)/i);
        if (match) {
            clean = match[1];
        }
    }

    // Convert spaces, underscores, and special characters to hyphens
    const hyphenSlug = clean
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const underscoreSlug = hyphenSlug.replace(/-/g, '_');
    const firstLetter = underscoreSlug[0] || 'a';
    const mainProfileImg = `https://cdni.pornpics.com/models/${firstLetter}/${underscoreSlug}.jpg`;
    const formattedName = clean
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

    let galleryPhotos = [];
    const pornpicsUrl = `https://www.pornpics.com/pornstars/${hyphenSlug}/`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(pornpicsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            redirect: 'error',
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
            const html = await res.text();
            
            // Extract model name if present in title/h1
            const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            const extractedName = h1Match ? h1Match[1].replace(/\s*(?:Nude\s*Pics|Porn\s*Pics|Galleries)\s*$/i, '').trim() : formattedName;

            // Extract all gallery photos from data-src or src and upgrade to 1280px HQ (excluding profile avatar)
            const regex = /(?:data-src|src)=['"](https:\/\/cdni\.pornpics\.com\/[^'"]+)['"]/gi;
            const seen = new Set();
            let match;
            while ((match = regex.exec(html)) !== null) {
                const rawUrl = match[1];
                if (!rawUrl.includes('1px.png') && !rawUrl.includes('/models/')) {
                    // Automatically upgrade low-res thumbnails (460/300/560) to 1280 HQ
                    const hqUrl = rawUrl.replace(/\/(?:460|300|560)\//g, '/1280/');
                    if (!seen.has(hqUrl)) {
                        seen.add(hqUrl);
                        galleryPhotos.push(hqUrl);
                    }
                }
            }

            if (galleryPhotos.length > 0) {
                return successResponse({
                    name: extractedName || formattedName,
                    slug: hyphenSlug,
                    profileImage: mainProfileImg,
                    photos: galleryPhotos,
                    totalPhotos: galleryPhotos.length
                });
            }
        }
    } catch (e) {
        console.warn("Live model scraping error:", e.message);
    }

    if (galleryPhotos.length === 0) {
        return errorResponse(`Could not find photo gallery for "${formattedName}". Please check the spelling or paste a direct Pornpics URL.`, 404);
    }

    return successResponse({
        name: formattedName,
        slug: hyphenSlug,
        profileImage: mainProfileImg,
        photos: galleryPhotos,
        totalPhotos: galleryPhotos.length
    });
}
