const CACHE_NAME = "philosophy-pwa-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // NEVER intercept non-GET, API requests (/v7/), or Vite dev server modules
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/v7") ||
    url.pathname.startsWith("/@") ||
    url.pathname.includes("/src/") ||
    url.pathname.includes("/node_modules/") ||
    url.search.includes("v=") ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1"
  ) {
    return; // Let network handle it directly
  }

  // Network-first strategy for HTML and assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match("/");
        });
      })
  );
});
