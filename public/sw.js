// Offline-start voor de geïnstalleerde app. Bewust netwerk-eerst voor ALLES:
// online spelers zien altijd de nieuwste deploy (geen versiebeheer nodig,
// dit bestand hoeft nooit te veranderen), en elke gelukte fetch ververst de
// cache. Pas zonder netwerk valt de game terug op de laatst geziene versie.
const CACHE = 'ag-offline-v1';
// de app-shell, geresolved tegen de scope van deze worker (GitHub Pages-subpad)
const SHELL = new URL('./', self.location).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SHELL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // alleen GETs van onze eigen origin; de leaderboard-API blijft live-only
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 206 (audio-range-requests) kan de Cache API niet slikken
        if (response.ok && response.status === 200) {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached !== undefined) return cached;
        if (request.mode === 'navigate') {
          const shell = await caches.match(SHELL);
          if (shell !== undefined) return shell;
        }
        return Response.error();
      }),
  );
});
