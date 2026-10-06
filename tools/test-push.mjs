#!/usr/bin/env node
/* اختبارُ منطق الإشعارات على الخادم — بلا شبكة ولا تخزين.

       node tools/test-push.mjs

   يُثبت: (١) كلُّ حدثٍ يُرسَل في نافذته ومرّةً واحدة، (٢) لا شيءَ خارجها،
   (٣) المنطقةُ الزمنيّةُ للمستخدم هي المعتمَدة لا منطقةُ الخادم،
   (٤) رفضُ كلِّ عنوانٍ ليس خدمةَ دفعٍ معروفة (SSRF)، (٥) الموقعُ يُقرَّب. */
import { createRequire } from "node:module";
import crypto from "node:crypto";
import { dueEvents, markSent, prayerTimes, localParts, effectiveTz, parseSubscribe, validEndpoint, coarse }
  from "../netlify/functions/_lib/push-core.mts";
import { runCron, GIVE_UP_AFTER_FAILS } from "../netlify/functions/_lib/cron-run.mts";
const fnRequire = createRequire(new URL("../netlify/functions/package.json", import.meta.url));

let fails = 0, passes = 0;
const eq = (got, want, msg) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { passes++; console.log("  ✓", msg); } else { fails++; console.log("  ✘", msg, "\n      المتوقَّع", w, "\n      الفعليّ ", g); }
};
const ids = (rec, at) => dueEvents(rec, new Date(at)).map(e => e.id).sort();
const ALL = { prayer: true, pre: true, azkar: true, salat: true, kahf: true };
const rec = (o = {}) => ({
  sub: { endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "a", auth: "b" } },
  lat: 33.6, lng: -7.6, tz: "Africa/Casablanca", prefs: { ...ALL }, sent: {}, created: 0, updated: 0, fails: 0, ...o,
});

console.log("— الصلاة عند دخول الوقت (الدار البيضاء، الأحد 2026-10-04)");
const pt = prayerTimes(33.6, -7.6, 2026, 10, 4);
const fajr = +pt.fajr, dhuhr = +pt.dhuhr;
const r1 = rec({ prefs: { ...ALL, azkar: false, salat: false, kahf: false } });
eq(ids(r1, fajr - 11 * 60e3), [], "قبل الفجر بـ11 دقيقة: لا شيء");
eq(ids(r1, fajr - 9.5 * 60e3), ["r-fajr"], "قبل الفجر بتسع دقائق ونصف: تذكير «اقترب وقت الفجر»");
eq(ids(r1, fajr + 30e3), ["p-fajr"], "بعد الفجر بـ30 ثانية: «حان وقت الفجر»");
eq(ids(r1, fajr + 2.9 * 60e3), ["p-fajr"], "بعده بدقيقتين وتسعين ثانية: ما زال في النافذة (دقيقةٌ فاتت لا تُضيّعه)");
eq(ids(r1, fajr + 3.1 * 60e3), [], "بعده بأكثر من ثلاث دقائق: لا يصل متأخّرًا");
eq(dueEvents(r1, new Date(fajr + 1000))[0].payload.body, "الصلاةُ خيرٌ من النوم", "نصُّ الفجر: الصلاةُ خيرٌ من النوم");
eq(dueEvents(r1, new Date(dhuhr + 1000))[0].payload.body, "حيَّ على الصلاة · حيَّ على الفلاح", "نصُّ الظهر");

console.log("— عدم التكرار");
const r2 = rec();
const first = dueEvents(r2, new Date(fajr + 1000));
markSent(r2, first.map(e => e.id), new Date(fajr + 1000));
eq(ids(r2, fajr + 61e3), [], "بعد الإرسال وتسجيله: الدقيقةُ التالية لا تُكرّره");
const fajrNext = +prayerTimes(33.6, -7.6, 2026, 10, 5).fajr;
eq(ids(r2, fajrNext + 1000).includes("p-fajr"), true, "وفي اليوم التالي (بفجره هو) يعمل من جديد");
markSent(r2, [], new Date(fajr + 2 * 86400e3));
eq(r2.sent, {}, "سجلُّ «ما أُرسل» يُقتصّ: لا يبقى منه إلا يومُه");

console.log("— المغرب: الظهر +5 والمغرب +3 (التوقيتُ الرسميّ)");
{
  const A = fnRequire("adhan");
  const hm = d => d.toISOString().slice(11, 16);
  const ja = prayerTimes(33.2316, -8.5007, 2026, 10, 6);   // الجديدة — جدولُ Yabiladi: 05:05 12:27 15:41 18:15 19:29
  eq([ja.fajr, ja.dhuhr, ja.asr, ja.maghrib, ja.isha].map(hm), ["05:05", "12:27", "15:41", "18:15", "19:29"], "الجديدة 6 أكتوبر 2026 = الجدولُ الرسميّ");
  const prm = new A.CalculationParameters("Other", 19, 17); prm.madhab = A.Madhab.Shafi;
  const raw = new A.PrayerTimes(new A.Coordinates(48.85, 2.35), new Date(2026, 9, 6), prm);
  const paris = prayerTimes(48.85, 2.35, 2026, 10, 6);
  eq([hm(paris.dhuhr), hm(paris.maghrib)], [hm(raw.dhuhr), hm(raw.maghrib)], "خارج المغرب (باريس): لا تعديل");
}

console.log("— الأذكار والصلاة على النبي ﷺ (بتوقيت المستخدم لا الخادم)");
// الدار البيضاء توقيتُها UTC+1 في هذه الأيّام: 07:05 عندهم = 06:05 UTC
const morning = Date.UTC(2026, 9, 4, 7, 3);
eq(ids(rec({ prefs: { ...ALL, prayer: false, pre: false } }), morning), ["a-7", "s-7"], "07:03 محلّيًّا: أذكار الصباح + الصلاة على النبي");
eq(ids(rec({ prefs: { ...ALL, prayer: false, pre: false } }), Date.UTC(2026, 9, 4, 7, 8)), ["a-7"], "07:08: أذكار الصباح (نافذةُ 10 دقائق) دون الصلاة على النبي (نافذةُ 5)");
eq(ids(rec({ prefs: { ...ALL, prayer: false, pre: false } }), Date.UTC(2026, 9, 4, 7, 12)), [], "07:12: انتهت النافذتان");
eq(ids(rec({ prefs: { ...ALL, prayer: false, pre: false } }), Date.UTC(2026, 9, 4, 8, 3)), [], "08:03 محلّيًّا: لا شيء يوم الأحد (8 ليست من ساعات الأيّام العاديّة)");
eq(ids(rec({ tz: "Asia/Riyadh", lat: 24.7, lng: 46.7, prefs: { ...ALL, prayer: false, pre: false } }), Date.UTC(2026, 9, 4, 4, 3)), ["a-7", "s-7"], "الرياض (UTC+3): 07:03 عندهم = 04:03 UTC");
eq(ids(rec({ prefs: { prayer: false, pre: false, azkar: false, salat: true, kahf: false } }), morning), ["s-7"], "إن أُطفئت الأذكارُ بقيت الصلاةُ على النبي وحدَها");
eq(ids(rec({ prefs: { prayer: false, pre: false, azkar: false, salat: false, kahf: false } }), morning), [], "كلُّ التفضيلات مُطفأة: لا شيء إطلاقًا");

console.log("— الجمعة");
const fri = Date.UTC(2026, 9, 2, 8, 3);      // الجمعة 2026-10-02، 08:03 محلّيًّا
eq(ids(rec({ prefs: { ...ALL, prayer: false, pre: false } }), fri), ["s-8"], "الجمعة 08:03: صلاةٌ على النبي (ساعاتُ الجمعة أكثر)");
eq(dueEvents(rec({ prefs: { ...ALL, prayer: false, pre: false } }), new Date(fri))[0].payload.title, "يوم الجمعة — أكثِر من الصلاة على الحبيب ﷺ", "عنوانُ الجمعة الخاصّ");
eq(ids(rec({ prefs: { ...ALL, prayer: false, pre: false } }), Date.UTC(2026, 9, 2, 9, 3)), ["k-9"], "الجمعة 09:03: سورة الكهف (9 ليست من ساعات الصلاة على النبي)");
eq(ids(rec({ prefs: { ...ALL, prayer: false, pre: false } }), Date.UTC(2026, 9, 4, 9, 3)), [], "الأحد 09:03: لا كهف");

console.log("— دون موقع");
const nogeo = parseSubscribe({ subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "AAAA", auth: "BBBB" } }, tz: "Africa/Casablanca", prefs: { prayer: true, pre: true, azkar: true, salat: true, kahf: true } });
eq([nogeo.ok, nogeo.rec.prefs.prayer, nogeo.rec.prefs.pre, nogeo.rec.prefs.azkar], [true, false, false, true], "بلا موقع: لا مواقيتَ صلاة، وتبقى الأذكار");

console.log("— التحقّق من المدخلات (الواجهةُ عامّة)");
for (const bad of [
  "http://fcm.googleapis.com/fcm/send/x",                 // ليس https
  "https://evil.example.com/fcm/send/x",                  // ليس خدمةَ دفع
  "https://fcm.googleapis.com.evil.com/x",                // تمويهٌ باللاحقة
  "https://evil.com/?https://fcm.googleapis.com/x",       // تمويهٌ في الاستعلام
  "https://fcm.googleapis.com:8443/x",                    // منفذٌ غريب
  "https://user:pw@fcm.googleapis.com/x",                 // بيانات دخول
  "https://169.254.169.254/latest/meta-data",             // عنوان الخدمات الداخليّة في السحابة
  "https://localhost/x", "file:///etc/passwd", "", 5, null,
]) eq(validEndpoint(bad), false, "مرفوض: " + String(bad).slice(0, 60));
for (const good of [
  "https://fcm.googleapis.com/fcm/send/abc",
  "https://updates.push.services.mozilla.com/wpush/v2/abc",
  "https://web.push.apple.com/abc",
  "https://wns2-par02p.notify.windows.com/w/?token=abc",
]) eq(validEndpoint(good), true, "مقبول: " + good.slice(0, 60));
const mk = (over) => parseSubscribe({ subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "AAAA", auth: "BBBB" } }, lat: 33.5731, lng: -7.5898, tz: "Africa/Casablanca", prefs: {}, ...over });
eq(mk({}).rec.lat, 33.6, "خطُّ العرض يُقرَّب إلى منزلةٍ واحدة (33.5731 → 33.6)");
eq(mk({}).rec.lng, -7.6, "وخطُّ الطول كذلك (-7.5898 → -7.6)");
eq(mk({ lat: 91 }).ok, false, "خطُّ عرضٍ خارج المدى: مرفوض");
eq(mk({ tz: "Not/AZone" }).ok, false, "منطقةٌ زمنيّةٌ وهميّة: مرفوضة");
eq(mk({ tz: "x".repeat(200) }).ok, false, "منطقةٌ زمنيّةٌ طويلةٌ جدًّا: مرفوضة");
eq(parseSubscribe({ subscription: { endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "<script>", auth: "B" } }, tz: "UTC" }).ok, false, "مفاتيحٌ بحروفٍ غير base64url: مرفوضة");
eq(parseSubscribe(null).ok, false, "جسمٌ فارغ: مرفوض");
eq(coarse(-0.04) === 0, true, "تقريبٌ قرب الصفر لا يكسر شيئًا");

console.log("— توقيتاتٌ محلّيّة");
eq(localParts(new Date(Date.UTC(2026, 9, 4, 23, 30)), "Africa/Casablanca").key, "2026-10-04", "المغرب GMT منذ 20 سبتمبر 2026: 23:30 UTC ما زالت في اليوم نفسه");
eq(localParts(new Date(Date.UTC(2026, 9, 5, 0, 30)), "Africa/Casablanca").key, "2026-10-05", "00:30 UTC = بعد منتصف الليل في الدار البيضاء ⇒ اليومُ التالي");
eq(localParts(new Date(Date.UTC(2026, 9, 4, 7, 3)), "Africa/Casablanca").h, 7, "المغرب بعد 20 سبتمبر 2026: الساعةُ المحلّيّة = UTC (حتى لو كانت قاعدةُ الخادم قديمة)");
eq(effectiveTz("Africa/Casablanca", new Date(Date.UTC(2026, 8, 1, 12))), "Africa/Casablanca", "قبل 20 سبتمبر 2026 تبقى قاعدةُ المنطقة كما هي (GMT+1)");
eq(effectiveTz("Africa/Casablanca", new Date(Date.UTC(2026, 9, 5, 12))), "UTC", "بعد التاريخ: المغربُ UTC");
eq(effectiveTz("Africa/El_Aaiun", new Date(Date.UTC(2026, 9, 5, 12))), "UTC", "العيون أيضًا");
eq(effectiveTz("Europe/Paris", new Date(Date.UTC(2026, 9, 5, 12))), "Europe/Paris", "غيرُ المغرب لا يُمَسّ");
eq(localParts(new Date(Date.UTC(2026, 9, 4, 23, 30)), "America/New_York").key, "2026-10-04", "ونيويورك ما زالت في اليوم نفسه");

console.log("— الجدولةُ: مسارات الإرسال (مخزنٌ ومُرسِلٌ مُحاكَيان)");
const mkStore = (recs) => {
  const m = new Map(Object.entries(recs));
  return { m,
    async list() { return { blobs: [...m.keys()].map(key => ({ key })) }; },
    async get(k) { const v = m.get(k); return v ? structuredClone(v) : null; },
    async setJSON(k, v) { m.set(k, structuredClone(v)); },
    async delete(k) { m.delete(k); } };
};
const NOW = new Date(Date.UTC(2026, 9, 4, 7, 3));            // 07:03 الدار البيضاء الأحد: أذكارٌ + صلاةٌ على النبي
const base = (o = {}) => rec({ updated: NOW.getTime(), prefs: { prayer: false, pre: false, azkar: true, salat: true, kahf: false }, ...o });
const err = (code) => Object.assign(new Error("push " + code), { statusCode: code });

{ // نجاح + عدم تكرار
  const st = mkStore({ a: base() }); const calls = [];
  const send = async (sub, ev) => { calls.push(ev.id); };
  const r1 = await runCron(st, send, NOW);
  eq([r1.sent, calls.sort()], [2, ["a-7", "s-7"]], "إرسالُ الحدثين المستحقّين");
  eq(st.m.get("a").sent, { "a-7": "2026-10-04", "s-7": "2026-10-04" }, "وتسجيلُهما في السجلّ");
  const r2 = await runCron(st, send, new Date(+NOW + 60e3));
  eq([r2.sent, calls.length], [0, 2], "الدقيقةُ التالية: لا تكرار");
}
for (const code of [410, 404]) {
  const st = mkStore({ a: base(), b: base() }); let n = 0;
  const r = await runCron(st, async (sub) => { if (n++ < 1) throw err(code); }, NOW);
  eq([st.m.size, r.dropped], [1, 1], `${code} من خدمة الدفع: يُحذف سجلُّ ذلك المشترك وحدَه ويبقى الآخر`);
}
{ // فشلٌ مؤقّت: لا حذفَ ولا تسجيل، ثم ينجح
  const st = mkStore({ a: base() }); let up = false; const calls = [];
  const send = async (s, ev) => { if (!up) throw err(500); calls.push(ev.id); };
  const r1 = await runCron(st, send, NOW);
  eq([st.m.has("a"), r1.failed, st.m.get("a").fails, st.m.get("a").sent], [true, 2, 1, {}], "500: السجلُّ باقٍ، لم يُسجَّل شيءٌ، وعدّادُ الفشل 1");
  up = true;
  await runCron(st, send, new Date(+NOW + 60e3));
  eq([calls.sort(), st.m.get("a").fails], [["a-7", "s-7"], 0], "بعد عودة الخدمة: يصل ما فات ويُصفَّر العدّاد");
}
{ // نجاحٌ جزئيّ: الأوّل ينجح والثاني يفشل ⇒ يُعاد الثاني وحدَه
  const st = mkStore({ a: base() }); const calls = []; let failS = true;
  const send = async (s, ev) => { if (ev.id === "s-7" && failS) throw err(503); calls.push(ev.id); };
  await runCron(st, send, NOW);
  eq([Object.keys(st.m.get("a").sent), st.m.get("a").fails], [["a-7"], 0], "نجاحٌ جزئيّ: يُسجَّل الناجحُ فقط ولا يُعدّ السجلُّ فاشلًا");
  failS = false; await runCron(st, send, new Date(+NOW + 60e3));
  eq(calls, ["a-7", "s-7"], "والفاشلُ يُعاد وحده (الأذكارُ لا تتكرّر)");
}
{ // ميّتٌ بعد عشرة فشلات متتالية
  const st = mkStore({ a: base() }); const send = async () => { throw err(500); };
  for (let i = 0; i < GIVE_UP_AFTER_FAILS; i++) await runCron(st, send, new Date(+NOW + i * 1000));
  eq(st.m.has("a"), false, `بعد ${GIVE_UP_AFTER_FAILS} إرسالاتٍ فاشلةٍ متتالية يُحذف السجلّ`);
}
{ // عزلُ الأخطاء
  const st = mkStore({ a: base(), b: base(), c: base() }); let first = true; const okKeys = new Set();
  const send = async (sub) => { if (first) { first = false; throw new Error("boom"); } };
  const r = await runCron(st, send, NOW);
  eq([st.m.size, r.sent >= 4], [3, true], "خطأٌ غير متوقَّعٍ في مشتركٍ لا يوقف الباقين ولا يحذف أحدًا");
}
{ // سجلٌّ قديم
  const st = mkStore({ old: base({ updated: NOW.getTime() - 201 * 86400e3 }), fresh: base() }); let n = 0;
  const r = await runCron(st, async () => { n++; }, NOW);
  eq([st.m.has("old"), st.m.has("fresh"), n], [false, true, 2], "مشتركٌ لم يفتح التطبيق منذ 201 يومًا يُحذف دون إرسال");
}
{ // أكثر من دفعة، وميزانيةُ الوقت
  const big = {}; for (let i = 0; i < 130; i++) big["k" + i] = base();
  let n = 0; const r = await runCron(mkStore(big), async () => { n++; }, NOW);
  eq([r.subs, r.sent, n], [130, 260, 260], "130 مشتركًا (أكثر من دفعة): يُعالَجون كلُّهم");
  const r2 = await runCron(mkStore(big), async () => { n++; }, NOW, { budgetMs: -1 });
  eq([r2.sent, r2.skipped], [0, 130], "نفادُ الميزانيّة: يُؤجَّل الباقي للدقيقة التالية ولا يضيع");
}

console.log("— التشفير وترويسةُ VAPID (web-push الحقيقيّة، بمفتاحِ «جهازٍ» مولَّد)");
{
  const webpush = fnRequire("web-push"), ece = fnRequire("http_ece");
  const vapid = webpush.generateVAPIDKeys();
  const dev = crypto.createECDH("prime256v1"); dev.generateKeys();
  const auth = crypto.randomBytes(16);
  const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: dev.getPublicKey().toString("base64url"), auth: auth.toString("base64url") } };
  const payload = JSON.stringify({ title: "حان وقتُ صلاة الفجر", body: "الصلاةُ خيرٌ من النوم", tag: "prayer-fajr" });
  webpush.setVapidDetails("https://salatee.org", vapid.publicKey, vapid.privateKey);
  const d = webpush.generateRequestDetails(sub, payload, { TTL: 600, urgency: "high", topic: "p-fajr" });
  eq([d.method, d.headers.TTL, d.headers.Urgency, d.headers.Topic, d.headers["Content-Encoding"]], ["POST", 600, "high", "p-fajr", "aes128gcm"], "الترويساتُ: TTL وUrgency وTopic والتشفير aes128gcm");
  const plain = ece.decrypt(d.body, { version: "aes128gcm", privateKey: dev, authSecret: auth.toString("base64url") }).toString("utf8");
  eq(JSON.parse(plain), JSON.parse(payload), "الرسالةُ تُفكّ بمفتاح الجهاز فتعود عربيّةً سليمة");
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(d.headers.Authorization);
  eq(!!m && m[2] === vapid.publicKey, true, "الترويسةُ تحمل مفتاحَ VAPID العامّ");
  const [h, pl, sig] = m[1].split(".");
  const claims = JSON.parse(Buffer.from(pl, "base64url").toString());
  const pub = Buffer.from(vapid.publicKey, "base64url");
  const key = crypto.createPublicKey({ key: { kty: "EC", crv: "P-256", x: pub.subarray(1, 33).toString("base64url"), y: pub.subarray(33).toString("base64url") }, format: "jwk" });
  eq(crypto.verify("sha256", Buffer.from(h + "." + pl), { key, dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url")), true, "توقيعُ JWT صحيحٌ بمفتاح VAPID (ES256)");
  eq([claims.aud, claims.sub, claims.exp - Math.floor(Date.now() / 1000) <= 86400], ["https://fcm.googleapis.com", "https://salatee.org", true], "المطالبات: aud هو خدمةُ الدفع، وsub موقعُنا لا بريدُ أحد، وexp ≤ 24 ساعة");
}

console.log(`\n${fails ? ">>> " + fails + " فشل ✘" : ">>> كلُّ الاختبارات نجحت ✓"}  (${passes} نجح)`);
process.exit(fails ? 1 : 0);
