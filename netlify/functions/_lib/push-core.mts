/* منطقُ الإشعارات الخالص — لا شبكةَ فيه ولا تخزين، فيُختبَر بمعزلٍ عنهما.

   يُطابق جدولَ التذكير الذي في index.html حرفًا بحرف (الساعات والنوافذ
   والنصوص)، وحسابُ المواقيت بالمعادلة نفسِها (الفجر 19°، العشاء 17°، العصر
   شافعيّ) — وقد قورنت حزمةُ adhan هنا بـ adhan.min.js في التطبيق على
   3816 موقتًا فلم يختلف واحدٌ منها ولا بجزءٍ من الثانية. */
import { Coordinates, CalculationParameters, PrayerTimes, Madhab } from "adhan";

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

/* --- جدولُ التذكير: منقولٌ من index.html (AZKAR_SLOTS وما حولها) --- */
export const AZKAR_SLOTS = [
  { h: 7,  title: "حان وقت أذكار الصباح 🌅", body: "ابدأ يومك بأذكار الصباح، تحصينًا وبركة", tab: "morning" },
  { h: 17, title: "حان وقت أذكار المساء 🌇", body: "من بعد العصر إلى المغرب — لا تنسَ أذكار المساء", tab: "evening" },
  { h: 22, title: "حان وقت أذكار النوم 🌙",  body: "قبل أن تنام، اختم يومك بأذكار النوم", tab: "sleep" },
];
export const SALAT_HOURS = [7, 10, 13, 16, 19, 22];
export const SALAT_HOURS_FRIDAY = [6, 8, 10, 11, 12, 14, 16, 18, 20, 22];
export const KAHF_HOUR = 9;
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

export function prayerTimes(lat: number, lng: number, y: number, m: number, d: number) {
  const params = new CalculationParameters("Other", 19, 17);
  params.madhab = Madhab.Shafi;
  /* داخل المغرب: الظهرُ +5 دقائق والمغربُ +3 دقائق (التوقيتُ الرسميّ) — يطابق computePrayers في index.html */
  if (lat >= 20.7 && lat <= 35.95 && lng >= -17.3 && lng <= -1.8) params.adjustments = { ...params.adjustments, dhuhr: 5, maghrib: 3 };
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
      if (pr.pre && nowMs >= pre && nowMs < pre + WIN_PRE) {
        add({
          id: `r-${k}`, ttl: 300,
          payload: { title: `🕌 اقترب وقت صلاة ${nm}`, body: `تبقّى 10 دقائق على أذان ${nm}`, tag: `pre-${k}` },
        });
      }
    }
  }
  if (pr.azkar && t.min < 10) {
    const s = AZKAR_SLOTS.find(x => x.h === t.h);
    if (s) add({ id: `a-${s.h}`, ttl: 1800, payload: { title: s.title, body: s.body, tag: `azkar-${s.h}`, data: { action: "azkar", tab: s.tab } } });
  }
  if (pr.salat && t.min < 5 && (t.friday ? SALAT_HOURS_FRIDAY : SALAT_HOURS).includes(t.h)) {
    add({
      id: `s-${t.h}`, ttl: 900,
      payload: {
        title: t.friday ? "يوم الجمعة — أكثِر من الصلاة على الحبيب ﷺ" : "صَلِّ على الحبيب ﷺ",
        body: "اللهم صلِّ وسلّم على سيّدنا محمد ﷺ", tag: `salat-${t.h}`,
      },
    });
  }
  if (pr.kahf && t.friday && t.h === KAHF_HOUR && t.min < 10) {
    add({
      id: "k-9", ttl: 1800,
      payload: {
        title: "اليوم الجمعة — سورة الكهف 📖",
        body: "من قرأ سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين",
        tag: "kahf", data: { action: "kahf" },
      },
    });
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
