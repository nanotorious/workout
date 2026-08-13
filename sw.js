// sw.js — offline shell.
//
// The app must open with no server reachable: the gym has no Mac running a dev server.
// Cache-first for the shell, network-first for the seed JSON so a corrected catalogue
// is picked up when the network happens to be there.

// Two caches, deliberately.
//
// CACHE is version-bumped every deploy and everything else is wiped on activate.
// ASSET_CACHE holds the movement animations and is NOT version-bumped: they are large,
// unchanging, and fetched lazily, so tying them to the shell version would silently discard
// every warmed animation on each deploy — and that would be discovered at the gym, offline.
// Bump this on EVERY deploy that changes index.html, css or js. The fetch handler is
// cache-first for the shell, so an unchanged sw.js means the browser never reinstalls and
// the old shell is served forever — the update simply never arrives on the phone.
const CACHE = 'workout-v21';
const ASSET_CACHE = 'workout-assets';
const KEEP = [CACHE, ASSET_CACHE];

const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/db.js',
  'js/catalog.js',
  'js/exerciseGuides.js',
  'js/exerciseFilters.js',
  'js/timeline.js',
  'js/pattern.js',
  'js/player.js',
  'js/ui/picker.js',
  'js/ui/stepEditor.js',
  'js/ui/dialog.js',
  'js/movementAssets.js',
  // The player runtime is precached: it is one always-needed file, and lazily caching it
  // would leave an offline-first user with no runtime at all rather than a degraded one.
  // The animation JSON itself is never listed here — addAll is atomic, so one 404 among
  // the assets would fail the entire service-worker install.
  'assets/lottie-light.min.js',
  'manifest.webmanifest',
  'data/exercise_catalog.json',
  'data/workout_templates.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Movement animations: cache-first into the persistent asset cache, and never fall back
  // to the shell. A miss must resolve to undefined so the caller can show its SVG/CSS cue
  // instead of receiving index.html where JSON was expected.
  if (url.pathname.includes('/assets/lottie/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => undefined))
    );
    return;
  }

  const isSeedData = url.pathname.includes('/data/');

  if (isSeedData) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ignoreSearch: a navigation carrying a query string (?nocache=1, a share link, an
  // installed-app launch URL) must still resolve to the cached shell rather than
  // falling through to a network that is not there.
  event.respondWith(
    caches.match(request, { ignoreSearch: true })
      .then((cached) => cached || fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => (request.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
