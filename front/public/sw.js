// Service Worker for caching static assets
const CACHE_NAME = "qalim-portfolio-v1";
const ASSETS_TO_CACHE = [
	"/",
	"/home",
	"/maintenance",
	"/favicon.svg",
	"/site.webmanifest",
];

// Install event - cache essential assets
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			console.log("[SW] Caching essential assets");
			return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
				console.error("[SW] Cache failed:", err);
			});
		}),
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((cacheName) => cacheName !== CACHE_NAME)
					.map((cacheName) => {
						console.log("[SW] Deleting old cache:", cacheName);
						return caches.delete(cacheName);
					}),
			);
		}),
	);
	self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
	// Skip non-GET requests
	if (event.request.method !== "GET") return;

	// Skip Strapi API requests (always fresh)
	if (event.request.url.includes("/api/")) return;

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			if (cachedResponse) {
				// Return cached version and update cache in background
				event.waitUntil(
					fetch(event.request).then((networkResponse) => {
						if (networkResponse && networkResponse.status === 200) {
							caches.open(CACHE_NAME).then((cache) => {
								cache.put(event.request, networkResponse.clone());
							});
						}
					}),
				);
				return cachedResponse;
			}

			// Not in cache, fetch from network
			return fetch(event.request).then((response) => {
				// Cache successful responses
				if (response && response.status === 200) {
					const responseToCache = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});
				}
				return response;
			});
		}),
	);
});
