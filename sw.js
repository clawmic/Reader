const CACHE_VERSION = "clawmic-v1.009";
const APP_SHELL = ["index.html", "styles.css", "app.js", "comic_db.json", "about_the_editor.txt", "editor_photo.png"];

function toCacheUrl(path) {
  const scopePath = new URL(self.registration.scope).pathname;
  return new URL(path, `${self.location.origin}${scopePath}`).toString();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL.map((path) => toCacheUrl(path))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key !== CACHE_VERSION)
      .map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isHtmlRequest = event.request.mode === "navigate" || requestUrl.pathname.endsWith("/index.html");
  if (isHtmlRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match(toCacheUrl("index.html"))))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && requestUrl.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
