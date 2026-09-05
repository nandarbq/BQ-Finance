// Service worker minimal — cukup agar AresKu terdeteksi sebagai installable PWA.
// Untuk cache offline yang lebih lengkap, pertimbangkan plugin vite-plugin-pwa.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // pass-through, tidak melakukan caching agresif supaya data selalu terbaru
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
