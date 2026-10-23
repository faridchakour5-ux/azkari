/* منطقُ الإشعارات الخالص — لا شبكةَ فيه ولا تخزين، فيُختبَر بمعزلٍ عنهما.

   يُطابق جدولَ التذكير الذي في index.html حرفًا بحرف (الساعات والنوافذ
   والنصوص)، وحسابُ المواقيت بالمعادلة نفسِها (الفجر 19°، العشاء 17°، العصر
   شافعيّ) — وقد قورنت حزمةُ adhan هنا بـ adhan.min.js في التطبيق على
   3816 موقتًا فلم يختلف واحدٌ منها ولا بجزءٍ من الثانية. */
import * as ADHAN from "adhan";
import { Coordinates, CalculationParameters, PrayerTimes, Madhab } from "adhan";
import { ptKey, ptParams } from "./pt-regions.mts";
import { MA_HABOUS } from "./ma-habous.mts";

export interface Prefs {
  prayer: boolean;   // إشعارٌ عند دخول وقت الصلاة
  pre: boolean;      // تذكيرٌ قبل الأذان بعشر دقائق
  azkar: boolean;    // أذكار الصباح والمساء والنوم
  salat: boolean;    // الصلاة على النبي ﷺ
  kahf: boolean;     // سورة الكهف يوم الجمعة
}

export interface Rec {
  sub: { endpoint: string; keys: { p256dh: string; auth: string } };
  lat: number;
  lng: number;
  tz: string;
  prefs: Prefs;
  sent: Record<string, string>;   // معرّفُ الحدث ← يومُه المحلّيّ
  created: number;
  updated: number;
  fails: number;
}

export interface Push {
  id: string;        // يُستعمل كـ Topic أيضًا: يستبدل رسالةً لم تصل بعدُ
  ttl: number;       // ثوانٍ تَحفظها خدمةُ الدفع إن كان الجهازُ مغلقًا
  payload: { title: string; body: string; tag: string; data?: Record<string, string> };
}

/* --- جدولُ التذكير: منقولٌ من index.html (dayReminders وما حولها) ---
   كلُّ التذكيرات من بعد الفجر بخمسين دقيقة إلى العاشرة ليلًا فقط (وبلا موقعٍ تبدأ عند الثامنة)؛
   والأذانُ في وقته دائمًا. */
export const FAJR_LAG_MIN = 50, NOTIF_FROM = 8, NOTIF_TO = 22;
export const AFTER_PRAYER_MIN = 20;                         // أذكارُ المساء بعد العصر
export const SALAT_HOURS = [5, 7, 9, 11, 13, 15, 17, 19, 21];   // الصلاةُ على النبيّ ﷺ كلَّ ساعتين (ما داخل النافذة منها فقط)
export const KAHF_HOUR = 10;
export const SALAT_MSGS: { t: string; b: string; fri?: boolean }[] = [
  { t: "الصلاةُ الإبراهيميّة ﷺ",
    b: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ" },
  { t: "صَلِّ على الحبيب المصطفى ﷺ", b: "اللهم صلِّ وسلِّم على حبيبنا المصطفى محمدٍ ﷺ", fri: true },
  { t: "صَلِّ على الحبيب ﷺ",        b: "اللهم صلِّ وسلّم على سيّدنا محمد ﷺ", fri: true },
  { t: "قال الله تعالى",
    b: "﴿إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا﴾ [الأحزاب: 56]" },
];
export const FRIDAY_SALAT_TITLE = "يوم الجمعة — أكثِر من الصلاة على الحبيب ﷺ";
export const TAHLIL_TEXT = "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير";
export const PRE_NOTES = [
  "اترك كلَّ ما بيدك الآن وتفرّغ للصلاة؛ فهي راحةُ قلبك وزادُ يومك.",
  "أمسِك عمّا أنت فيه، وتوضّأ وتهيّأ للصلاة — لحظاتٌ بينك وبين ربّك.",
  "اترك الدنيا قليلًا وأقبِل على الصلاة؛ ما شغلك سينتظرك، والصلاةُ لا تنتظر.",
];
export function dayOfYear(y: number, m: number, d: number): number {
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
}
const PRAYERS: [string, string][] = [["fajr", "الفجر"], ["dhuhr", "الظهر"], ["asr", "العصر"], ["maghrib", "المغرب"], ["isha", "العشاء"]];

const MIN = 60_000;
/* نوافذُ الإطلاق. الجدولُ يَدور كلَّ دقيقة، فالنافذةُ الأوسعُ من دقيقةٍ تَحمي
   من دقيقةٍ فاتت، والتكرارُ يمنعه سجلُّ «sent». وهي لا تتّسع أكثرَ من اللازم
   حتى لا يصل تنبيهٌ متأخّرٌ كثيرًا عن وقته. */
const WIN_PRAYER = 3 * MIN;
const WIN_PRE = 3 * MIN;
const PRE_LEAD = 10 * MIN;

export function validTz(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length < 1 || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

/* عاد المغربُ إلى توقيت غرينيتش (GMT) ثابتًا يومَ 20 سبتمبر 2026 (المرسوم 2.26.530). وقاعدةُ المناطق
   الزمنيّة في بيئة التشغيل قد تكون أقدمَ من ذلك فتحسب GMT+1، فتصل تذكيراتُ الساعة (أذكار الصباح
   وغيرها) قبل وقتها بساعة. فنُعامل المغربَ بعد هذا التاريخ كـUTC صراحةً، سواءٌ حُدّثت القاعدةُ أم لا. */
const MA_GMT_FROM = Date.UTC(2026, 8, 20, 1, 0);
export function effectiveTz(tz: string, now: Date): string {
  return (tz === "Africa/Casablanca" || tz === "Africa/El_Aaiun") && now.getTime() >= MA_GMT_FROM ? "UTC" : tz;
}

/* تاريخُ المستخدم وساعتُه ودقيقتُه ويومُ أسبوعه في منطقته، لا في منطقة الخادم */
export function localParts(now: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: effectiveTz(tz, now), year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(now)) p[x.type] = x.value;
  return {
    y: +p.year, m: +p.month, d: +p.day,
    h: +p.hour % 24, min: +p.minute,
    friday: p.weekday === "Fri",
    key: `${p.year}-${p.month}-${p.day}`,
  };
}

export function minutesOf(date: Date, tz: string): number { const p = localParts(date, tz); return p.h * 60 + p.min; }
/* فروق المواقيت الرسميّة لأقرب مدينةٍ مغربيّة (≤ 40 كم)، وإلّا الوسيطُ العامّ لكلّ المدن */
export function maHabousAdj(lat: number, lng: number) {
  let best = MA_HABOUS.fallback, bd = 40 * 40; const k = Math.cos(lat * Math.PI / 180);
  for (const c of MA_HABOUS.cities) {
    const dy = (c[0] - lat) * 111.2, dx = (c[1] - lng) * 111.2 * k, d = dy * dy + dx * dx;
    if (d < bd) { bd = d; best = c.slice(2); }
  }
  return { fajr: best[0], sunrise: best[1], dhuhr: best[2], asr: best[3], maghrib: best[4], isha: best[5] };
}

export function prayerTimes(lat: number, lng: number, y: number, m: number, d: number) {
  const inMorocco = lat >= 20.7 && lat <= 35.95 && lng >= -17.3 && lng <= -0.9;
  let params: any;
  if (inMorocco) {
    /* المغرب: الأوقاف (الفجر 19° والعشاء 17°) وفروقُ جدولها لأقرب مدينةٍ (≤ 40 كم) — يطابق computePrayers/maHabousAdj في index.html */
    params = new CalculationParameters("Other", 19, 17);
    params.madhab = Madhab.Shafi;
    params.adjustments = { ...params.adjustments, ...maHabousAdj(lat, lng) };
  } else {
    /* خارج المغرب: طريقةُ البلد تلقائيًّا (pt-regions) — يطابق computePrayers؛ والاختيارُ اليدويّ لا يصل إلى الخادم */
    params = ptParams(ADHAN, ptKey(lat, lng, null), new Coordinates(lat, lng), "auto");
  }
  /* adhan يقرأ اليومَ من مُكوِّنات التاريخ المحلّيّة في الخادم؛ وقد بنيناه من
     مكوّنات يوم المستخدم، فيصحّ الحسابُ أيًّا كانت منطقةُ الخادم. */
  return new PrayerTimes(new Coordinates(lat, lng), new Date(y, m - 1, d), params);
}

/* ما استحقّ الإرسالَ الآن لهذا المشترك، مع تجاهل ما أُرسل اليوم */
export function dueEvents(rec: Rec, now: Date): Push[] {
  const out: Push[] = [];
  const t = localParts(now, rec.tz);
  const nowMs = now.getTime();
  const pr = rec.prefs;
  const done = (id: string) => rec.sent[id] === t.key;
  const add = (p: Push) => { if (!done(p.id)) out.push(p); };
  /* نافذةُ التنبيهات: من الفجر + 50 دقيقة (08:00 بلا موقع) إلى 22:00 */
  const hasGeo = rec.lat !== 0 || rec.lng !== 0;
  const ptDay = hasGeo ? (prayerTimes(rec.lat, rec.lng, t.y, t.m, t.d) as unknown as Record<string, Date>) : null;
  const fromMin = ptDay && isFinite(+ptDay.fajr) ? minutesOf(new Date(+ptDay.fajr + FAJR_LAG_MIN * 60_000), rec.tz) : NOTIF_FROM * 60;
  const inWin = (min: number) => min >= fromMin && min <= NOTIF_TO * 60;

  if (pr.prayer || pr.pre) {
    const pt = prayerTimes(rec.lat, rec.lng, t.y, t.m, t.d);
    for (const [k, nm] of PRAYERS) {
      const at = +(pt as unknown as Record<string, Date>)[k];
      if (!isFinite(at)) continue;
      if (pr.prayer && nowMs >= at && nowMs < at + WIN_PRAYER) {
        add({
          id: `p-${k}`, ttl: 600,
          payload: {
            title: `حان وقتُ صلاة ${nm}`,
            body: k === "fajr" ? "الصلاةُ خيرٌ من النوم" : "حيَّ على الصلاة · حيَّ على الفلاح",
            tag: `prayer-${k}`,
          },
        });
      }
      const pre = at - PRE_LEAD;
      if (pr.pre && nowMs >= pre && nowMs < pre + WIN_PRE && inWin(minutesOf(new Date(pre), rec.tz))) {   // لا تنبيه خارج النافذة
        add({
          id: `r-${k}`, ttl: 300,
          payload: { title: `🕌 اقترب وقت صلاة ${nm}`, body: `تبقّى 10 دقائق على صلاة ${nm}. ${PRE_NOTES[(dayOfYear(t.y, t.m, t.d) + PRAYERS.findIndex(x => x[0] === k)) % PRE_NOTES.length]}`, tag: `pre-${k}` },
        });
      }
    }
  }
  /* خطّةُ اليوم: أذكارُ الصباح بعد الفجر (ولا قبل الثامنة) والمساء بعد العصر والنوم، وذكرُ الصباح، والصلاةُ على النبيّ ﷺ، والكهفُ يومَ الجمعة */
  let asrMin = 17 * 60;
  if (ptDay && isFinite(+ptDay.asr)) asrMin = minutesOf(new Date(+ptDay.asr + AFTER_PRAYER_MIN * 60_000), rec.tz);
  const nowMin = t.h * 60 + t.min;
  const doy = dayOfYear(t.y, t.m, t.d);
  const slot = (id: string, min: number, win: number, p: Push["payload"], ttl: number) => {
    if (inWin(min) && nowMin >= min && nowMin < min + win) add({ id, ttl, payload: p });
  };
  if (pr.azkar) {
    slot("a-morning", fromMin, 10,
      { title: "حان وقت أذكار الصباح 🌅", body: "بعد صلاة الفجر — ابدأ يومك بأذكار الصباح، تحصينًا وبركة", tag: "azkar-morning", data: { action: "azkar", tab: "morning" } }, 1800);
    slot("a-tahlil", fromMin + 15, 10,
      { title: "ذِكرٌ عظيمٌ كلَّ صباح 🤍", body: `${TAHLIL_TEXT}\nوقد ورد فضلٌ عظيمٌ لمن قالها مئةَ مرّةٍ في اليوم (متّفقٌ عليه)`, tag: "azkar-tahlil", data: { action: "azkar", tab: "morning" } }, 1800);
    slot("a-evening", asrMin, 10,
      { title: "حان وقت أذكار المساء 🌇", body: "بعد صلاة العصر — لا تنسَ أذكار المساء", tag: "azkar-evening", data: { action: "azkar", tab: "evening" } }, 1800);
    slot("a-sleep", 22 * 60, 10,
      { title: "حان وقت أذكار النوم 🌙", body: "قبل أن تنام، اختم يومك بأذكار النوم", tag: "azkar-sleep", data: { action: "azkar", tab: "sleep" } }, 1800);
  }
  if (pr.salat) {
    SALAT_HOURS.forEach((h, i) => {
      const m = SALAT_MSGS[(doy + i) % SALAT_MSGS.length];
      slot(`s-${h}`, h * 60, 5, { title: t.friday && m.fri ? FRIDAY_SALAT_TITLE : m.t, body: m.b, tag: `salat-${h}` }, 900);
    });
  }
  if (pr.kahf && t.friday) {
    slot("k-kahf", KAHF_HOUR * 60, 10,
      { title: "اليوم الجمعة — سورة الكهف 📖", body: "من قرأ سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين", tag: "kahf", data: { action: "kahf" } }, 1800);
  }
  /* ساعةُ الإجابة يومَ الجمعة: تذكيران قبل أذان المغرب بـ45 و30 دقيقة (مرآةُ dayReminders في index.html؛ يحتاجان الموقعَ) */
  if (pr.kahf && t.friday && ptDay && isFinite(+ptDay.maghrib)) {
    const mgMin = minutesOf(new Date(+ptDay.maghrib), rec.tz);
    slot("d-45", mgMin - 45, 10,
      { title: "ساعةُ الإجابة يوم الجمعة 🤲", body: "بقي نحو 45 دقيقة على أذان المغرب — اقتربت من أرجى ساعات الإجابة يومَ الجمعة. جاء في الحديث: «فالتمسوها آخرَ ساعةٍ بعد العصر» (أبو داود والنسائي). أكثِر من الدعاء والصلاة على النبيّ ﷺ", tag: "dua-45" }, 1800);
    slot("d-30", mgMin - 30, 10,
      { title: "ساعةُ الإجابة يوم الجمعة 🤲", body: "بقي نحو 30 دقيقة على أذان المغرب — فرِّغ قلبَك للدعاء الآن، فهي من أرجى ساعات الإجابة يومَ الجمعة 🤲", tag: "dua-30" }, 1800);
  }
  return out;
}

/* يُبقي في سجلّ «sent» ما أُرسل اليومَ وحده، فلا ينتفخ السجلُّ أبدًا */
export function markSent(rec: Rec, ids: string[], now: Date): void {
  const key = localParts(now, rec.tz).key;
  const keep: Record<string, string> = {};
  for (const [id, day] of Object.entries(rec.sent)) if (day === key) keep[id] = day;
  for (const id of ids) keep[id] = key;
  rec.sent = keep;
}

/* ---------- التحقّق من مدخلات الاشتراك (الواجهةُ عامّةٌ فلا يُوثَق بشيء) ---------- */

/* الخادمُ سيُرسل إلى هذا العنوان. فلو قُبل أيُّ عنوانٍ لصار الخادمُ أداةً
   لإرسال طلباتٍ إلى أيّ موقعٍ (SSRF). فلا يُقبل إلا خدماتُ الدفع المعروفة. */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^updates-autopush\.(stage\.)?mozaws\.net$/,
  /\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];
export function validEndpoint(ep: unknown): ep is string {
  if (typeof ep !== "string" || ep.length > 1000) return false;
  let u: URL;
  try { u = new URL(ep); } catch { return false; }
  if (u.protocol !== "https:" || u.port || u.username || u.password) return false;
  return PUSH_HOSTS.some(re => re.test(u.hostname));
}

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/* الموقعُ يُقرَّب إلى منزلةٍ عشريّةٍ واحدة (نحو 11 كم): يكفي للمواقيت بفارقٍ
   لا يتجاوز نصفَ دقيقة، ولا يدلّ على بيتٍ ولا شارع. */
export function coarse(x: number): number { return Math.round(x * 10) / 10; }

export function parseSubscribe(body: any): { ok: true; rec: Omit<Rec, "sent" | "created" | "updated" | "fails"> } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "body" };
  const s = body.subscription;
  if (!s || !validEndpoint(s.endpoint)) return { ok: false, error: "endpoint" };
  const k = s.keys || {};
  if (typeof k.p256dh !== "string" || typeof k.auth !== "string"
    || !B64URL.test(k.p256dh) || !B64URL.test(k.auth)
    || k.p256dh.length > 200 || k.auth.length > 100) return { ok: false, error: "keys" };
  const lat = Number(body.lat), lng = Number(body.lng);
  const hasGeo = body.lat != null && body.lng != null && isFinite(lat) && isFinite(lng);
  if (hasGeo && (lat < -90 || lat > 90 || lng < -180 || lng > 180)) return { ok: false, error: "geo" };
  if (!validTz(body.tz)) return { ok: false, error: "tz" };
  const p = body.prefs || {};
  const prefs: Prefs = {
    prayer: hasGeo && p.prayer !== false,
    pre: hasGeo && !!p.pre,
    azkar: !!p.azkar,
    salat: !!p.salat,
    kahf: !!p.kahf,
  };
  return {
    ok: true,
    rec: {
      sub: { endpoint: s.endpoint, keys: { p256dh: k.p256dh, auth: k.auth } },
      // دون موقعٍ لا مواقيتَ صلاة، وتبقى الأذكارُ والصلاةُ على النبي
      lat: hasGeo ? coarse(lat) : 0,
      lng: hasGeo ? coarse(lng) : 0,
      tz: body.tz,
      prefs,
    },
  };
}
