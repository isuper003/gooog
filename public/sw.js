const CACHE_NAME = 'goooog-cache-v18';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/auth.js',
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
                    if (cacheName !== CACHE_NAME && cacheName !== 'goooog-images-v1') {
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

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Never cache API calls
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Dynamic cache for external/character images
    if (url.hostname.includes('cdni.pornpics.com') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.webp')) {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(fetchRes => {
                    if (fetchRes && fetchRes.status === 200) {
                        return caches.open('goooog-images-v1').then(cache => {
                            cache.put(event.request, fetchRes.clone());
                            return fetchRes;
                        });
                    }
                    return fetchRes;
                }).catch(() => response);
            })
        );
        return;
    }

    // Network-first with cache fallback for app shell assets
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200) {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, resClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
