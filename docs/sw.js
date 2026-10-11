// Service worker : tout est mis en cache à l'installation (hors ligne d'abord).
// VERSION et FILES sont régénérés par make_web.py.
const VERSION = 'f7997c6a37';
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

// Réseau d'abord (3 s max) pour toujours voir la dernière version, cache en secours (hors ligne).
// Photos et icônes : cache d'abord.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const heavy = /\/(img|icons)\//.test(e.request.url);
  e.respondWith(heavy ? cacheFirst(e.request) : networkFirst(e.request));
});

function cacheFirst(req) {
  return caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req));
}
function networkFirst(req) {
  return new Promise(resolve => {
    const fallback = () => caches.match(req, { ignoreSearch: true }).then(hit => hit && resolve(hit));
    const timer = setTimeout(fallback, 3000);
    fetch(req).then(res => {
      clearTimeout(timer);
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      resolve(res);
    }).catch(() => {
      clearTimeout(timer);
      caches.match(req, { ignoreSearch: true }).then(hit => hit ? resolve(hit) : resolve(Response.error()));
    });
  });
}
