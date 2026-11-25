// Offline app shell. Bump VERSION on every deploy so phones pick up the update.
const VERSION = 'hq-v1';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/app.js', 'js/rules.js', 'js/state.js', 'js/fx.js', 'js/sprite.js', 'js/blocks.js',
  'js/views/hero.js', 'js/views/quests.js', 'js/views/hunt.js', 'js/views/habits.js', 'js/views/stats.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so updates land fast), but give up after 2.5s on weak signal and use the cache.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const net = fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  });
  const cached = () => caches.match(req, { ignoreSearch: true });
  const slow = new Promise(resolve => setTimeout(() => cached().then(r => r && resolve(r)), 2500));
  e.respondWith(
    Promise.race([net, slow]).catch(() => cached().then(r => r || caches.match('index.html')))
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(ws => ws.length ? ws[0].focus() : self.clients.openWindow('./#quests')));
});
