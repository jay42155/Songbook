const CACHE = 'jays-songbook-v2';

// Assets lourds mis en cache une fois pour toujours (cache-first)
const ASSETS = [
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Code+Pro:wght@400;600&family=Lato:wght@300;400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.8.8/build/opensheetmusicdisplay.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
];

// Fichiers app mis à jour à chaque release (network-first)
const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(ASSETS.map(url => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isAppFile = APP_FILES.some(f => {
    if (f === './' || f === './index.html') return url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
    return url.pathname.endsWith(f.replace('./', '/'));
  });

  if (isAppFile) {
    // ── Network-first pour les fichiers app ──
    // Tente le réseau, met à jour le cache, fallback sur cache si hors ligne
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // ── Cache-first pour les assets lourds (CDN, fonts) ──
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            const clone = res.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return res;
        });
      })
    );
  }
});
