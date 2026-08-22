const CACHE_NAME = 'goooog-cache-v50';
const IMAGE_CACHE_NAME = 'goooog-images-v2';
const IMAGE_CACHE_MAX_ENTRIES = 150;
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/auth.js',
    '/i18n-auth.js',
    '/esc.js',
    '/admin-users.js',
    '/gallery.js',
    '/game.js',
    '/results.js',
    '/char-stats.js',
    '/leaderboard.js',
    '/worship.js',
    '/crawler.js',
    '/settings.js',
    '/random-picker.js',
    '/sound.js',
    '/lightbox.js',
    '/toast.js',
    '/manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

function isTrustedImageOrigin(url) {
    // Exact host matches only: substring checks would let attacker-controlled
    // hosts like cdni.pornpics.com.evil.io slip into the persistent cache.
    const trustedHosts = new Set(['cdni.pornpics.com', 'www.pornpics.com']);
    if (url.origin === self.location.origin) return true;
    if (url.protocol !== 'https:') return false;
    if (trustedHosts.has(url.hostname)) return true;
    return url.hostname.endsWith('.pornpics.com');
}

async function putTrimmedImageCache(request, response) {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    if (keys.length > IMAGE_CACHE_MAX_ENTRIES) {
        // Simple FIFO trim: retire the oldest entries beyond the cap so the
        // image cache cannot grow without bound.
        for (let i = 0; i < keys.length - IMAGE_CACHE_MAX_ENTRIES; i++) {
            await cache.delete(keys[i]);
        }
    }
}

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Never intercept or cache API calls
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(request));
        return;
    }

    // Dynamic cache for external/character images
    if ((url.pathname.endsWith('.jpg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.webp')) && isTrustedImageOrigin(url)) {
        event.respondWith(
            caches.match(request).then(response => {
                return response || fetch(request).then(fetchRes => {
                    if (fetchRes && fetchRes.status === 200) {
                        event.waitUntil(putTrimmedImageCache(request, fetchRes));
                    }
                    return fetchRes;
                }).catch(() => response);
            })
        );
        return;
    }

    // Network-first with cache fallback for same-origin app shell assets only.
    // Cross-origin non-image responses (fonts CSS, etc.) pass straight through:
    // caching them here mixed opaque CORS payloads into the shell cache and
    // cache.put throws on non-GET, which previously surfaced as rejections.
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                if (response && response.type === 'basic' && response.status === 200) {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, resClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(request);
            })
    );
});
