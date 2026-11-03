// Offline support: cache the whole game on first visit, serve from cache, refresh in the background.
// Bump VERSION whenever you deploy so players pick up the new files.
const VERSION = 'fil-v5';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './js/core.js', './js/lang.js', './js/backgrounds.js', './js/services.js', './js/music.js', './js/map-data.js', './js/map.js', './js/game.js',
  './js/worlds/mumbai.js', './js/worlds/delhi.js', './js/worlds/rajasthan.js', './js/worlds/kerala.js', './js/worlds/himalaya.js',
  './js/worlds/up.js', './js/worlds/uttarakhand.js', './js/worlds/chandigarh.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const fresh = fetch(e.request).then(res => {
      if (res.ok) caches.open(VERSION).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => hit);
    return hit || fresh;
  }));
});
