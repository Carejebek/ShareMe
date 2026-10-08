const CACHE = 'jayxz-static-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('jayxz-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin || u.pathname.startsWith('/api/')) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  if (u.pathname.startsWith('/_next/static/') || u.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(r).then((hit) => hit || fetch(r).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); }
        return res;
      }))
    );
  }
});
