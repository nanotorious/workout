// sw.js — offline shell.
//
// The app must open with no server reachable: the gym has no Mac running a dev server.
// Cache-first for the shell, network-first for the seed JSON so a corrected catalogue
// is picked up when the network happens to be there.

const CACHE = 'workout-v14';

const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/db.js',
  'js/catalog.js',
  'js/timeline.js',
  'js/pattern.js',
  'js/player.js',
  'js/ui/picker.js',
  'js/ui/stepEditor.js',
  'js/ui/dialog.js',
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
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

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
