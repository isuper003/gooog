import { successResponse, errorResponse } from '../../lib/response.js';
import { authenticateUser } from '../../lib/auth.js';

// Curated high-fidelity backup database (25+ unique models per category per page)
const BACKUP_CANDIDATES = {
    sluts: [
        { name: "Riley Reid", slug: "riley-reid" },
        { name: "Mia Malkova", slug: "mia-malkova" },
        { name: "Abella Danger", slug: "abella-danger" },
        { name: "Kendra Lust", slug: "kendra-lust" },
        { name: "Lana Rhoades", slug: "lana-rhoades" },
        { name: "Angela White", slug: "angela-white" },
        { name: "Eva Lovia", slug: "eva-lovia" },
        { name: "Gabbie Carter", slug: "gabbie-carter" },
        { name: "Adriana Chechik", slug: "adriana-chechik" },
        { name: "Emily Willis", slug: "emily-willis" },
        { name: "Janice Griffith", slug: "janice-griffith" },
        { name: "Alina Lopez", slug: "alina-lopez" },
        { name: "Autumn Falls", slug: "autumn-falls" },
        { name: "Kenzie Reeves", slug: "kenzie-reeves" },
        { name: "Skylar Vox", slug: "skylar-vox" },
        { name: "Vina Sky", slug: "vina-sky" },
        { name: "Gia Paige", slug: "gia-paige" },
        { name: "Lena Paul", slug: "lena-paul" },
        { name: "Kira Noir", slug: "kira-noir" },
        { name: "Brandi Love", slug: "brandi-love" },
        { name: "Cory Chase", slug: "cory-chase" },
        { name: "Nicole Aniston", slug: "nicole-aniston" },
        { name: "Blake Blossom", slug: "blake-blossom" },
        { name: "Violet Myers", slug: "violet-myers" },
        { name: "Scarlit Scandal", slug: "scarlit-scandal" },
        { name: "Moriah Mills", slug: "moriah-mills" },
        { name: "Alexis Texas", slug: "alexis-texas" },
        { name: "Tori Black", slug: "tori-black" },
        { name: "Sasha Grey", slug: "sasha-grey" },
        { name: "Leah Gotti", slug: "leah-gotti" }
    ],
    trans: [
        { name: "Aubrey Kate", slug: "aubrey-kate" },
        { name: "Chanel Santini", slug: "chanel-santini" },
        { name: "Daisy Taylor", slug: "daisy-taylor" },
        { name: "Natalie Mars", slug: "natalie-mars" },
        { name: "Khloe Kay", slug: "khloe-kay" },
        { name: "Emma Rose", slug: "emma-rose" },
        { name: "Bailey Jay", slug: "bailey-jay" },
        { name: "Domino Presley", slug: "domino-presley" },
        { name: "Foxxy", slug: "foxxy" },
        { name: "Korrina Rico", slug: "korrina-rico" },
        { name: "Venus Lux", slug: "venus-lux" },
        { name: "Chelsea Poe", slug: "chelsea-poe" },
        { name: "Casey Kisses", slug: "casey-kisses" },
        { name: "Jessy Dubai", slug: "jessy-dubai" },
        { name: "Shiri Allwood", slug: "shiri-allwood" },
        { name: "Ella Hollywood", slug: "ella-hollywood" },
        { name: "Kayleigh Coxx", slug: "kayleigh-coxx" },
        { name: "Sarina Valentina", slug: "sarina-valentina" },
        { name: "Mia Isabella", slug: "mia-isabella" },
        { name: "Stacy Valentine", slug: "stacy-valentine" },
        { name: "Vaniity", slug: "vaniity" },
        { name: "Carla Novaes", slug: "carla-novaes" },
        { name: "Gia Darling", slug: "gia-darling" },
        { name: "Kylie Maria", slug: "kylie-maria" },
        { name: "Melanie Brooks", slug: "melanie-brooks" },
        { name: "Paige Daniels", slug: "paige-daniels" },
        { name: "Rachael Cavalli", slug: "rachael-cavalli" },
        { name: "Tori Fox", slug: "tori-fox" }
    ],
    twinks: [
        { name: "Joey Mills", slug: "joey-mills" },
        { name: "Liam Riley", slug: "liam-riley" },
        { name: "Sean Ford", slug: "sean-ford" },
        { name: "Austin Wolf", slug: "austin-wolf" },
        { name: "Trenton Ducati", slug: "trenton-ducati" },
        { name: "Johnny Rapid", slug: "johnny-rapid" },
        { name: "Brent Corrigan", slug: "brent-corrigan" },
        { name: "Blake Mitchell", slug: "blake-mitchell" },
        { name: "Pheonix Fyre", slug: "pheonix-fyre" },
        { name: "Adam Killian", slug: "adam-killian" },
        { name: "Diego Sans", slug: "diego-sans" },
        { name: "Gabriel Cross", slug: "gabriel-cross" },
        { name: "Jesse Santana", slug: "jesse-santana" },
        { name: "Colby Keller", slug: "colby-keller" },
        { name: "Darius Ferdynand", slug: "darius-ferdynand" },
        { name: "Topher DiMaggio", slug: "topher-dimaggio" },
        { name: "Rafael Alencar", slug: "rafael-alencar" },
        { name: "Armond Rizzo", slug: "armond-rizzo" },
        { name: "Matthew Camp", slug: "matthew-camp" },
        { name: "Alex Mecum", slug: "alex-mecum" },
        { name: "Ricky Roman", slug: "ricky-roman" },
        { name: "Levi Karter", slug: "levi-karter" },
        { name: "Zac Bishop", slug: "zac-bishop" },
        { name: "Dylan Lucas", slug: "dylan-lucas" },
        { name: "Cole Connor", slug: "cole-connor" },
        { name: "Logan Stevens", slug: "logan-stevens" },
        { name: "Hunter Page", slug: "hunter-page" }
    ]
};

function getProfileImageUrl(slug) {
    const underscore = slug.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
    const firstLetter = underscore[0] || 'a';
    return `https://cdni.pornpics.com/models/${firstLetter}/${underscore}.jpg`;
}

function parsePornpicsHtml(html) {
    const results = [];
    const seenSlugs = new Set();
    const reservedSlugs = new Set(['list', 'shemale', 'gay', 'categories', 'channels', 'tags', 'pornstars', 'top', 'popular', 'new', 'search', 'models', 'all']);

    const regex = /<a[^>]+href=['"]\/pornstars\/([a-z0-9_-]+)\/['"][^>]*title=['"]([^'"]+)['"]/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const rawSlug = match[1].toLowerCase().trim();
        const rawName = match[2].trim();
        if (!seenSlugs.has(rawSlug) && rawSlug.length > 2 && !reservedSlugs.has(rawSlug)) {
            seenSlugs.add(rawSlug);
            const cleanName = rawName && !reservedSlugs.has(rawName.toLowerCase()) ? rawName : rawSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const hyphenSlug = rawSlug.replace(/_/g, '-');
            results.push({
                name: cleanName,
                slug: hyphenSlug,
                profileImage: getProfileImageUrl(rawSlug),
                images: [getProfileImageUrl(rawSlug)]
            });
        }
    }
    return results;
}

export async function onRequestGet(context) {
    const { env, request } = context;
    const db = env.DB;

    // Verify session and role
    const auth = await authenticateUser(request, db);
    if (auth.error) {
        return errorResponse(auth.error, auth.status);
    }
    if (auth.role !== 'admin' && auth.role !== 'moderator') {
        return errorResponse("Unauthorized: Admin or Moderator role required", 403);
    }

    const url = new URL(request.url);
    const category = url.searchParams.get('category') || 'sluts';
    const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);

    const validCategories = ['sluts', 'trans', 'twinks'];
    if (!validCategories.includes(category)) {
        return errorResponse("Invalid category", 400);
    }

    let targetUrl = '';
    if (category === 'trans') {
        targetUrl = page === 1 ? 'https://www.pornpics.com/pornstars/shemale/' : `https://www.pornpics.com/pornstars/shemale/?page=${page}`;
    } else if (category === 'twinks') {
        targetUrl = page === 1 ? 'https://www.pornpics.com/pornstars/gay/' : `https://www.pornpics.com/pornstars/gay/?page=${page}`;
    } else {
        targetUrl = page === 1 ? 'https://www.pornpics.com/pornstars/' : `https://www.pornpics.com/pornstars/?page=${page}`;
    }

    let scrapedCharacters = [];

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
            const html = await res.text();
            scrapedCharacters = parsePornpicsHtml(html);
        }
    } catch (err) {
        console.warn("Live scraping fallback activated:", err.message);
    }

    // Fallback if needed
    if (scrapedCharacters.length < 20) {
        const fallbackList = BACKUP_CANDIDATES[category] || [];
        const startIndex = ((page - 1) * 10) % Math.max(1, fallbackList.length - 25);
        const sliced = fallbackList.slice(startIndex, startIndex + 28);
        const existingSlugs = new Set(scrapedCharacters.map(c => c.slug));

        for (const item of (sliced.length >= 25 ? sliced : fallbackList)) {
            if (!existingSlugs.has(item.slug)) {
                scrapedCharacters.push({
                    name: item.name,
                    slug: item.slug,
                    profileImage: getProfileImageUrl(item.slug),
                    images: [getProfileImageUrl(item.slug)]
                });
            }
        }
    }

    return successResponse({
        characters: scrapedCharacters,
        category,
        page,
        total: scrapedCharacters.length
    });
}
