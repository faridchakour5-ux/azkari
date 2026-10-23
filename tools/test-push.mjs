#!/usr/bin/env node
/* اختبارُ منطق الإشعارات على الخادم — بلا شبكة ولا تخزين.

       node tools/test-push.mjs

   يُثبت: (١) كلُّ حدثٍ يُرسَل في نافذته ومرّةً واحدة، (٢) لا شيءَ خارجها،
   (٣) المنطقةُ الزمنيّةُ للمستخدم هي المعتمَدة لا منطقةُ الخادم،
   (٤) رفضُ كلِّ عنوانٍ ليس خدمةَ دفعٍ معروفة (SSRF)، (٥) الموقعُ يُقرَّب. */
import { createRequire } from "node:module";
import { ptKey, ptParams } from "../netlify/functions/_lib/pt-regions.mts";
import crypto from "node:crypto";
import { dueEvents, markSent, prayerTimes, localParts, effectiveTz, parseSubscribe, validEndpoint, coarse, dayOfYear, SALAT_HOURS, SALAT_MSGS, FRIDAY_SALAT_TITLE, PRE_NOTES }
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
eq(ids(r1, fajr - 9.5 * 60e3), [], "قبل الفجر بتسع دقائق ونصف: لا تذكير — الفجرُ خارج نافذة 08:00–22:00");
eq(ids(r1, dhuhr - 11 * 60e3), [], "قبل الظهر بـ11 دقيقة: لا شيء");
eq(ids(r1, dhuhr - 9.5 * 60e3), ["r-dhuhr"], "قبل الظهر بتسع دقائق ونصف: تذكير «اقترب وقت الظهر» (داخل النافذة)");
eq(dueEvents(r1, new Date(dhuhr - 9.5 * 60e3))[0].payload.body.startsWith("تبقّى 10 دقائق على صلاة الظهر. "), true, "نصُّ التذكير يبدأ بالوقت ثم عبارةٌ لطيفة");
eq(PRE_NOTES.some(n => dueEvents(r1, new Date(dhuhr - 9.5 * 60e3))[0].payload.body.endsWith(n)), true, "ثم إحدى عبارات التفرّغ للصلاة");
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

console.log("— المغرب: مواقيتُ وزارة الأوقاف لكلّ مدينةٍ (6 أكتوبر 2026، من prayertimes.ma الناقل لجداول habous.gov.ma)");
{
  const A = fnRequire("adhan");
  const min = d => d.getUTCHours() * 60 + d.getUTCMinutes();   // المغرب على توقيت غرينيتش
  const cities = [   // [اسم، عرض، طول، فجر، شروق، ظهر، عصر، مغرب، عشاء]
    ["أكادير", 30.4278, -9.5981, "05:10", "06:31", "12:31", "15:47", "18:22", "19:33"],
    ["بني ملال", 32.3373, -6.3498, "04:56", "06:16", "12:19", "15:33", "18:11", "19:21"],
    ["الدار البيضاء", 33.5731, -7.5898, "05:01", "06:25", "12:24", "15:38", "18:13", "19:26"],
    ["الداخلة", 23.7185, -15.9582, "05:38", "06:55", "12:57", "16:15", "18:50", "19:57"],
    ["الجديدة", 33.2316, -8.5007, "05:04", "06:29", "12:27", "15:42", "18:16", "19:29"],
    ["فاس", 34.0181, -5.0078, "04:50", "06:14", "12:13", "15:27", "18:03", "19:16"],
    ["قصر إيش", 32.5142, -1.0038, "04:35", "05:55", "11:57", "15:12", "17:49", "18:59"],
    ["العيون", 27.1536, -13.2033, "05:26", "06:45", "12:46", "16:03", "18:37", "19:46"],
    ["مراكش", 31.6295, -7.9811, "05:03", "06:24", "12:25", "15:40", "18:17", "19:27"],
    ["وجدة", 34.6814, -1.9086, "04:37", "06:01", "12:01", "15:14", "17:51", "19:04"],
    ["الرباط", 34.0132, -6.8326, "04:57", "06:23", "12:21", "15:34", "18:09", "19:23"],
    ["طنجة", 35.7595, -5.834, "04:52", "06:18", "12:16", "15:29", "18:05", "19:20"],
  ];
  const names = ["الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء"];
  for (const [n, la, lo, ...off] of cities) {
    const pt = prayerTimes(la, lo, 2026, 10, 6);
    const got = [pt.fajr, pt.sunrise, pt.dhuhr, pt.asr, pt.maghrib, pt.isha].map(min);
    off.forEach((x, i) => { const [h, m] = x.split(":").map(Number); eq(Math.abs(got[i] - (h * 60 + m)) <= 1, true, `${n}: ${names[i]} ضمن دقيقةٍ من الجدول الرسميّ (${x})`); });
  }
  // المغربُ يختلف بين المدن (ارتفاعٌ ومناخ): بني ملال أبعدُ عن الحساب القياسيّ من الجديدة
  const adjMg = (la, lo) => { const prm = new A.CalculationParameters("Other", 19, 17); prm.madhab = A.Madhab.Shafi; const raw = new A.PrayerTimes(new A.Coordinates(la, lo), new Date(2026, 9, 6), prm); return min(prayerTimes(la, lo, 2026, 10, 6).maghrib) - min(raw.maghrib); };
  eq(adjMg(32.3373, -6.3498) > adjMg(33.2316, -8.5007), true, "فرقُ المغرب غيرُ موحَّد: يختلف من مدينةٍ لأخرى");
  eq(adjMg(33.2316, -8.5007), 4, "الجديدة: المغربُ +4 عن الحساب القياسيّ (لا +3 موحَّدة)");
  /* خارج المغرب: طريقةُ البلد (pt-regions) بلا أيّ فروقٍ مغربيّة — تُقارَن بحسابٍ مباشرٍ بالطريقة نفسها */
  const viaRegion = (la, lo) => new A.PrayerTimes(new A.Coordinates(la, lo), new Date(2026, 9, 6), ptParams(A, ptKey(la, lo, null), new A.Coordinates(la, lo), "auto"));
  const raw = viaRegion(48.85, 2.35);
  const paris = prayerTimes(48.85, 2.35, 2026, 10, 6);
  eq([min(paris.dhuhr), min(paris.maghrib)], [min(raw.dhuhr), min(raw.maghrib)], "خارج المغرب (باريس): طريقةُ البلد بلا فروقٍ مغربيّة");
  const dak = prayerTimes(20.0, -16.5, 2026, 10, 6), rawD = viaRegion(20.0, -16.5);
  eq(min(dak.dhuhr), min(rawD.dhuhr), "نواكشوط/موريتانيا (جنوب خطّ 20.7): طريقةُ البلد بلا فروقٍ مغربيّة");
}

console.log("— الأذكار والصلاة على النبي ﷺ (بتوقيت المستخدم لا الخادم، من الفجر + 50 دقيقة إلى 22:00 فقط)");
// الدار البيضاء توقيتُها UTC الآن (بعد 20 سبتمبر 2026): الساعةُ المحلّيّة = UTC
const NA = { ...ALL, prayer: false, pre: false, kahf: false };
const at = (h, m, d = 4) => Date.UTC(2026, 9, d, h, m);
const fajr4 = +prayerTimes(33.6, -7.6, 2026, 10, 4).fajr, W = fajr4 + 50 * 60e3;   // بدءُ النافذة ذلك اليوم
eq(ids(rec({ prefs: NA }), fajr4 + 49 * 60e3), [], "الفجر + 49 دقيقة: قبل بدء النافذة، لا تنبيه");
eq(ids(rec({ prefs: NA }), W + 30e3), ["a-morning"], "الفجر + 50 دقيقة: أذكار الصباح (أوّلُ تنبيهٍ في اليوم)");
eq(ids(rec({ prefs: NA }), W + 11 * 60e3), [], "بعدها بـ11 دقيقة: انتهت نافذةُ العشر دقائق");
eq(ids(rec({ prefs: NA }), W + 15 * 60e3 + 30e3), ["a-tahlil"], "بعدها بربع ساعة: ذكرُ «لا إله إلا الله وحده لا شريك له…»");
eq(dueEvents(rec({ prefs: NA }), new Date(W + 15 * 60e3 + 30e3))[0].payload.body.startsWith("لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير"), true, "نصُّ الذكر كاملًا");
eq(ids(rec({ prefs: NA }), at(5, 3)), [], "05:03: الصلاةُ على النبي الأولى (05:00) قبل بدء النافذة فلا تُرسَل");
eq(ids(rec({ prefs: NA }), at(7, 3)), ["s-7"], "07:03: الصلاة على النبي ﷺ (كلَّ ساعتين: 7، 9، 11…)");
eq(ids(rec({ prefs: NA }), at(7, 8)), [], "07:08: نافذةُ الصلاة على النبي 5 دقائق فقط");
eq(ids(rec({ prefs: NA }), at(8, 3)), [], "08:03: الساعاتُ الزوجيّة لا تَحمل صلاةً على النبي");
eq(SALAT_HOURS, [5, 7, 9, 11, 13, 15, 17, 19, 21], "كلَّ ساعتين من الخامسة إلى التاسعة مساءً (ما قبل بدء النافذة يسقط)");
{ const pt2 = prayerTimes(33.6, -7.6, 2026, 10, 4), asrAfter = +pt2.asr + 20 * 60e3;
  eq(ids(rec({ prefs: NA }), asrAfter + 60e3), ["a-evening"], "المساء: بعد العصر بـ20 دقيقة"); }
eq(ids(rec({ prefs: NA }), at(22, 3)), ["a-sleep"], "22:03: أذكار النوم (آخرُ ما في النافذة)");
eq(ids(rec({ prefs: NA }), at(23, 3)), [], "23:03: بعد العاشرة ليلًا لا تنبيه");
{ const R = prayerTimes(24.7, 46.7, 2026, 10, 4);   // الرياض (UTC+3): الفجر + 50 دقيقة بتوقيتها هي
  eq(ids(rec({ tz: "Asia/Riyadh", lat: 24.7, lng: 46.7, prefs: NA }), +R.fajr + 50 * 60e3 + 30e3), ["a-morning"], "الرياض: النافذةُ تبدأ بفجرها هي لا بفجر المغرب"); }
eq(ids(rec({ lat: 0, lng: 0, prefs: NA }), at(7, 55)), [], "بلا موقعٍ: لا شيء قبل الثامنة");
eq(ids(rec({ lat: 0, lng: 0, prefs: NA }), at(8, 3)), ["a-morning"], "بلا موقعٍ: تبدأ النافذةُ عند الثامنة");
eq(ids(rec({ tz: "Etc/GMT+1", lng: -6.8, prefs: NA }), Date.UTC(2026, 9, 4, 6, 0, 30)), ["a-tahlil", "s-5"], "حين يتقاطع ذكران يصلان معًا (05:00 هناك: ذكرُ الصباح والصلاةُ على النبي)");
eq(ids(rec({ prefs: { prayer: false, pre: false, azkar: false, salat: true, kahf: false } }), at(9, 3)), ["s-9"], "إن أُطفئت الأذكارُ بقيت الصلاةُ على النبي وحدَها");
eq(ids(rec({ prefs: { prayer: false, pre: false, azkar: false, salat: false, kahf: false } }), at(9, 3)), [], "كلُّ التفضيلات مُطفأة: لا شيء إطلاقًا");
{ // أربعُ صيغٍ تتناوب: الإبراهيميّة، المصطفى، الحبيب، آيةُ الأحزاب
  const titles = new Set();
  for (let h of [7, 9, 11, 13]) titles.add(dueEvents(rec({ prefs: NA }), new Date(at(h, 1)))[0].payload.title);
  eq([...titles].sort(), SALAT_MSGS.map(m => m.t).sort(), "الصيغُ الأربعُ كلُّها تظهر في أربع ساعاتٍ متتالية");
  eq(SALAT_MSGS[3].b.includes("إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ") && SALAT_MSGS[3].b.includes("الأحزاب: 56"), true, "آيةُ الأحزاب 56 بنصّها ومرجعها");
}

console.log("— الجمعة");
const NF = { ...ALL, prayer: false, pre: false };
const frT = (h, m) => Date.UTC(2026, 9, 2, h, m);      // الجمعة 2026-10-02
{ const m = SALAT_MSGS[(dayOfYear(2026, 10, 2) + SALAT_HOURS.indexOf(9)) % SALAT_MSGS.length];
  const ev = dueEvents(rec({ prefs: NF }), new Date(frT(9, 3))).find(e => e.id === "s-9");
  eq(ev.payload.title, m.fri ? FRIDAY_SALAT_TITLE : m.t, "عنوانُ الجمعة الخاصّ على صيغ «صَلِّ على الحبيب» دون الآية والإبراهيميّة"); }
eq(ids(rec({ prefs: NF }), frT(10, 3)), ["k-kahf"], "الجمعة 10:03: تذكيرُ سورة الكهف");
eq(ids(rec({ prefs: NA }), frT(10, 3)), [], "…ويتوقّف إن أُطفئ تفضيلُ الكهف");
{ /* ساعةُ الإجابة: قبل المغرب بـ45 و30 دقيقة يومَ الجمعة (23 أكتوبر 2026) */
  const mg = +prayerTimes(33.6, -7.6, 2026, 10, 2).maghrib;
  const at = (min) => mg - min * 60000 + 60000;   // بعد الموعد بدقيقة (النافذةُ 10 دقائق)
  eq(ids(rec({ prefs: NF }), at(45)), ["d-45"], "الجمعة قبل المغرب بـ45 دقيقة: تذكيرُ ساعة الإجابة");
  eq(ids(rec({ prefs: NF }), at(30)), ["d-30"], "…وقبله بـ30 دقيقة: التذكيرُ الثاني");
  eq(ids(rec({ prefs: NF }), at(32)), [], "…ولا شيءَ بينهما");
  eq(ids(rec({ prefs: NA }), at(45)), [], "…ويتوقّف إن أُطفئ التفضيل");
  eq(ids(rec({ prefs: NF }), Date.UTC(2026, 9, 5, 0, 0) + (mg - Date.UTC(2026, 9, 2, 0, 0)) - 45 * 60000 + 60000), [], "…وليس يومَ الاثنين");
  eq(ids(rec({ prefs: NF, lat: undefined, lng: undefined }), at(45)).filter(x => x.startsWith("d-")), [], "…وبلا موقعٍ لا يُحسَب المغرب فلا إرسال");
}
eq(ids(rec({ prefs: NF }), at(10, 3)), [], "وليس يومَ الأحد");

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
const NOW = new Date(Date.UTC(2026, 9, 4, 6, 0, 30));            // 05:00 في Etc/GMT+1 (خطّ طول -6.8): ذكرُ الصباح والصلاةُ على النبي معًا
const base = (o = {}) => rec({ tz: "Etc/GMT+1", lng: -6.8, updated: NOW.getTime(), prefs: { prayer: false, pre: false, azkar: true, salat: true, kahf: false }, ...o });
const err = (code) => Object.assign(new Error("push " + code), { statusCode: code });

{ // نجاح + عدم تكرار
  const st = mkStore({ a: base() }); const calls = [];
  const send = async (sub, ev) => { calls.push(ev.id); };
  const r1 = await runCron(st, send, NOW);
  eq([r1.sent, calls.sort()], [2, ["a-tahlil", "s-5"]], "إرسالُ الحدثين المستحقّين");
  eq(st.m.get("a").sent, { "a-tahlil": "2026-10-04", "s-5": "2026-10-04" }, "وتسجيلُهما في السجلّ");
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
  eq([calls.sort(), st.m.get("a").fails], [["a-tahlil", "s-5"], 0], "بعد عودة الخدمة: يصل ما فات ويُصفَّر العدّاد");
}
{ // نجاحٌ جزئيّ: الأوّل ينجح والثاني يفشل ⇒ يُعاد الثاني وحدَه
  const st = mkStore({ a: base() }); const calls = []; let failS = true;
  const send = async (s, ev) => { if (ev.id === "s-5" && failS) throw err(503); calls.push(ev.id); };
  await runCron(st, send, NOW);
  eq([Object.keys(st.m.get("a").sent), st.m.get("a").fails], [["a-tahlil"], 0], "نجاحٌ جزئيّ: يُسجَّل الناجحُ فقط ولا يُعدّ السجلُّ فاشلًا");
  failS = false; await runCron(st, send, new Date(+NOW + 60e3));
  eq(calls, ["a-tahlil", "s-5"], "والفاشلُ يُعاد وحده (الأذكارُ لا تتكرّر)");
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
