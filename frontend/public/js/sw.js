const CACHE_NAME = 'redpay-v1';
const ASSETS_TO_CACHE = [
    '/frontend/public/index.html',
    '/frontend/public/dashboard.html',
    '/frontend/css/styles.css',
    '/frontend/js/auth.js',
    '/frontend/js/wallet.js',
    '/frontend/assets/logo.png'
];

// Install Event - Caching Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Fetch Event - Fallback on Network Loss
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});

// Push Notification Event Listener
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.text() : 'New RedPay Trade Alert Received!';
    const options = {
        body: data,
        icon: '/frontend/assets/logo.png',
        badge: '/frontend/assets/logo.png',
        vibrate: [100, 50, 100]
    };
    event.waitUntil(
        self.registration.showNotification('RedPay Trade', options)
    );
});
