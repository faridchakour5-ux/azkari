/* صلاتي — service worker v218 */
const CACHE = 'azkari-v218';
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
  './wasaya.js',
  './thabat.js',
  './sharh.js',
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

/* الترقيةُ تمحو مخزونَ النسخة السابقة — ولا تمسُّ تلاواتِ المستخدم أبدًا.
   وكان الشرطُ «كلُّ مخزنٍ سوى مخزون النسخة» فيمحو ما نزّله صاحبُ الجهاز
   من التلاوات في كلّ ترقية، وهي مئاتُ الميغابايت لا تُستردّ إلّا بتنزيلٍ
   جديد. فاستُثني مخزنُ التلاوات نصًّا. */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k !== CACHE && k !== QDL)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* الشبكةُ أوّلًا لصفحة التطبيق وملفّات البيانات (فتصل النسخةُ الأحدث دائمًا)،
   والمخزونُ أوّلًا للخطوط والأيقونات. وكلُّ شيءٍ يبقى عاملًا دون إنترنت. */
/* مخزنُ التلاواتِ المُنزَّلة — منفصلٌ عن مخزون التطبيق فلا تمحوه الترقية */
const QDL = 'azkari-qdl';
/* السورةُ المُنزَّلةُ تُقدَّم من الجهاز، فتُسمَع دون إنترنت ولا تُستهلَك بياناتٌ
   في كلّ مرّة. والطلبُ قد يأتي بمدًى (Range) لأنّ المستمعَ ينقل الشريط،
   فنقتطعُ له من المخزون ما طلب ونردُّه 206 كما يفعل الخادم. */
async function serveRange(req, res) {
  const range = req.headers.get('range');
  if (!range) return res;
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const total = buf.byteLength;
  let start = m[1] ? parseInt(m[1], 10) : 0;
  let end   = m[2] ? parseInt(m[2], 10) : total - 1;
  if (isNaN(start) || start < 0) start = 0;
  if (isNaN(end) || end >= total) end = total - 1;
  if (start > end) return new Response(null, { status: 416 });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'audio/mpeg',
      'Content-Length': String(end - start + 1),
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Accept-Ranges': 'bytes'
    }
  });
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  // الطلبات الخارجيّة تمرّ كما هي — إلّا تلاوةً نزّلها صاحبُ الجهاز
  try {
    if (new URL(url).origin !== self.location.origin) {
      if (/\.mp3(\?|$)/i.test(url)) {
        e.respondWith((async () => {
          const c = await caches.open(QDL);
          const hit = await c.match(url, { ignoreVary: true, ignoreSearch: true });
          if (hit) return serveRange(e.request, hit);
          return fetch(e.request);
        })());
      }
      return;
    }
  } catch (err) { return; }
  const isNav  = e.request.mode === 'navigate' || /\.html(\?|$)/.test(url);
  const isData = /\/(data|wird_hafs|wird_warsh|adhan\.min)\.js/.test(url);

  if (isNav) {
    // صفحةُ التطبيق: الشبكةُ أوّلًا، ولا يُنتظر فوقَ ثانيتين ونصف — وإلّا
    // قُدِّم المخزون. (على شبكةٍ بطيئةٍ أو متقطّعةٍ كان يُفتح في ثوانٍ.)
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
        return fetch(e.request);   // لا مخزونَ بعدُ: يُنتظر الشبكة
      }
    })());
    return;
  }

  if (isData) {
    // بياناتُ المصحف (نحوُ ثلاثة ميغابايت): يُقدَّم المخزونُ فورًا ويُجدَّد في
    // الخلفيّة، والنسخةُ الجديدة تعمل في الفتحة التالية — كسائر التطبيق.
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

  // الخطوطُ والأيقوناتُ والبيانُ وما يُحمَّل عند الحاجة: المخزونُ أوّلًا
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
