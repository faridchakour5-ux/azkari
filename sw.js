/* صلاتي — service worker v167 */
const CACHE = 'azkari-v167';
const ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './data.js',
  './adhan.min.js',
  './wird_hafs.js',
  './wird_warsh.js',
  './quiz.js',
  './fiqh.js',
  './fadl.js',
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

/* لا نُفعّل skipWaiting تلقائيًّا؛ ننتظر طلب المستخدم من شريط التحديث */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'skipWaiting') self.skipWaiting();
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
  // الطلبات الخارجيّة (أرشيف الإنترنت وغيره) تمرّ كما هي بلا اعتراض
  try { if (new URL(url).origin !== self.location.origin) return; } catch (err) { return; }
  const isNav  = e.request.mode === 'navigate' || /\.html(\?|$)/.test(url);
  const isData = /\/(data|wird_hafs|wird_warsh|adhan\.min)\.js/.test(url);

  if (isNav) {
    // HTML : réseau d'abord, mais on n'attend jamais plus de 2,5 s — sinon on sert le cache
    // (sur un réseau lent ou instable l'appli s'ouvrait en plusieurs secondes).
    e.respondWith((async () => {
      const cached = caches.match(e.request).then(r => r || caches.match('./index.html')).then(r => r || caches.match('./'));
      try {
        const res = await Promise.race([
          fetch(e.request).then(r => {
            if (r && r.status === 200) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
            return r;
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 2500))
        ]);
        return res;
      } catch (err) {
        const c = await cached;
        if (c) return c;
        return fetch(e.request);   // pas de cache : on attend le réseau
      }
    })());
    return;
  }

  if (isData) {
    // Données du Coran (~3 Mo) : on sert le cache immédiatement et on rafraîchit en arrière-plan.
    // La nouvelle version s'applique à l'ouverture suivante — comme pour le reste de l'appli.
    e.respondWith(
      caches.match(e.request).then(cached => {
        const net = fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  // polices, icônes, manifest, scripts chargés à la demande : cache d'abord
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
