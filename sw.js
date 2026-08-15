/* صلاتي — service worker v112 */
const CACHE = 'azkari-v112';
const ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './data.js',
  './adhan.min.js',
  './wird_hafs.js',
  './wird_warsh.js',
  './audio/adhan-wadee.mp3',
  './manifest.json',
  './fonts/ui-400.woff2',
  './fonts/ui-600.woff2',
  './fonts/ui-700.woff2',
  './fonts/amiri-quran.woff2',
  './fonts/maghribi.woff2',
  './fonts/naskh.woff2',
  './fonts/naskh-tashkeel.woff2',
  './fonts/kufi.woff2',
  './fonts/cairo.woff2',
  './fonts/tajawal.woff2',
  './fonts/ruqaa.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    // لا نستعمل skipWaiting: تبقى النسخة الجديدة في الانتظار حتى يُغلق المستخدم التطبيق،
    // حتى لا تُعاد الصفحة تلقائيًّا أثناء الاستماع أو القراءة.
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* network-first pour le HTML et les données JS (toujours la dernière version en ligne),
   cache-first pour les polices/icônes. Tout reste disponible hors-ligne via le cache. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  const isNav  = e.request.mode === 'navigate' || /\.html(\?|$)/.test(url);
  const isData = /\/(data|wird_hafs|wird_warsh|adhan\.min)\.js/.test(url);

  if (isNav || isData) {
    // network-first : récupère la dernière version, repli sur le cache si hors-ligne
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() =>
        caches.match(e.request).then(r => r || (isNav ? caches.match('./index.html').then(x => x || caches.match('./')) : r))
      )
    );
  } else {
    // cache-first pour polices, icônes, manifest
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        });
      })
    );
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || null;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) {
          if (data) c.postMessage({ type: 'navigate', data });
          return c.focus();
        }
      }
      if (clients.openWindow) {
        const qs = data ? ('?open=' + encodeURIComponent(JSON.stringify(data))) : '';
        return clients.openWindow('./index.html' + qs);
      }
    })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'notify') {
    self.registration.showNotification(e.data.title || 'وقت الذكر 🤍', {
      body: (e.data.lines || []).join('\n'),
      dir: 'rtl', lang: 'ar',
      icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
      tag: 'azkar-reminder', renotify: true, vibrate: [40, 60, 40]
    });
  }
});
