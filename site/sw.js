'use strict';
// Offline copy of the site. Files come from the network first (up to 4s) so new data shows
// up straight away; the saved copy is only the fallback when offline.
const CACHE = 'site-v2';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'icon.svg', 'vendor/d3.min.js', 'data/peers.json', 'data/top_issuers.json', 'data/ratings.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function fresh(req) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('slow')), 4000);
    fetch(req, { cache: 'no-cache' }).then((res) => {
      clearTimeout(t);
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      resolve(res);
    }, (err) => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fresh(req).catch(() => caches.match(req, { ignoreSearch: true })
    .then((hit) => hit || caches.match('./'))));
});
