// Service worker : tout est mis en cache à l'installation (hors ligne d'abord).
// VERSION et FILES sont régénérés par make_web.py.
const VERSION = 'ba08597fed';
const FILES = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "trip.json", "rappels.ics", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "img/cover.jpg", "img/fushimi-inari.jpg", "img/gion.jpg", "img/hakone.jpg", "img/hiroshima.jpg", "img/hombu-dojo.jpg", "img/kurama.jpg", "img/kyoto.jpg", "img/meiji-jingu.jpg", "img/nagoya-ghibli.jpg", "img/osaka.jpg", "img/sawara.jpg", "img/senso-ji.jpg", "img/shibuya-golden-gai.jpg", "img/tokyo.jpg"];
const CACHE = 'japantrip-' + VERSION;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request))
  );
});
