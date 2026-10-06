#!/usr/bin/env node
/* صلاتي — يبني جدولَ فروقِ المواقيت الرسميّة لمدن المغرب (وزارة الأوقاف) بالنسبة لحسابنا الفلكيّ.
 *
 *   node tools/build-ma-habous.mjs
 *
 * المصدر: prayertimes.ma (ينقل جداولَ habous.gov.ma كما هي دون إعادة حساب) — 189 مدينة وبلدة.
 * لكلّ مدينةٍ يحسب الفرقَ بالدقائق بين الوقت الرسميّ اليوم والأيام القادمة وبين adhan (19°/17°، شافعيّ)
 * عند إحداثيّاتها، ثمّ يُخرج:
 *   ma-habous.js                                  (للتطبيق: window.MA_HABOUS)
 *   netlify/functions/_lib/ma-habous.mts          (للخادم: نفس الجدول)
 * الفروقُ شبه ثابتةٍ على مدار السنة (الظهرُ +5 للجميع تقريبًا، والمغربُ والشروقُ يتبعان ارتفاعَ المدينة)،
 * ومع ذلك يُستحسن إعادةُ تشغيل هذا الملفّ كلَّ بضعة أشهرٍ للتأكّد.
 * المدنُ التي إحداثيّاتُها في المصدر خاطئةٌ (فروقها غيرُ معقولة أو تتكرّر إحداثيّاتُها) تُستبعَد تلقائيًّا. */
import fs from "node:fs";
import vm from "node:vm";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://prayertimes.ma/ar";

async function get(u) {
  for (let i = 0; i < 4; i++) {
    try { const { stdout } = await run("curl", ["-sS", "-m", "40", "-L", u], { maxBuffer: 20e6 }); if (stdout.length > 40000) return stdout; } catch {}
  }
  throw new Error("تعذّر الجلب: " + u);
}
const pool = async (items, n, fn) => { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; };

const ctx = {}; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, "adhan.min.js"), "utf8"), ctx);
const A = ctx.adhan;
const hm = t => t.getUTCHours() * 60 + t.getUTCMinutes();   // المغرب على توقيت غرينيتش

const home = await get(BASE);
const regions = [...new Set([...home.matchAll(/href="\/ar\/region\/([a-z-]+)"/g)].map(m => m[1]))];
const slugs = new Set();
for (const r of regions) for (const m of (await get(`${BASE}/region/${r}`)).matchAll(/href="\/ar\/(mawaqit-salah-[a-z0-9-]+)"/g)) slugs.add(m[1]);
console.log("المدن:", slugs.size);

const today = new Date();
const rows = await pool([...slugs], 10, async s => {
  const html = await get(`${BASE}/${s}`);
  const m = html.match(/lat\\":(-?[\d.]+),\\"lng\\":(-?[\d.]+)/);
  const plain = html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, "|").replace(/\|+/g, "|");
  const name = (plain.match(/مواقيت الصلاة في \|([^|]+)\|/) || [])[1];
  const seg = plain.slice(plain.indexOf("الأيام السبعة القادمة"), plain.indexOf("الأيام السبعة القادمة") + 1200);
  const days = [...seg.matchAll(/\|(\d\d:\d\d)\|(\d\d:\d\d)\|(\d\d:\d\d)\|(\d\d:\d\d)\|(\d\d:\d\d)\|(\d\d:\d\d)/g)].map(x => x.slice(1, 7));
  if (!m || !days.length) return null;
  const lat = +m[1], lng = +m[2];
  const per = [[], [], [], [], [], []];
  days.forEach((row, k) => {
    const p = new A.CalculationParameters("Other", 19, 17); p.madhab = A.Madhab.Shafi;
    const pt = new A.PrayerTimes(new A.Coordinates(lat, lng), new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + k, 12)), p);
    const calc = [pt.fajr, pt.sunrise, pt.dhuhr, pt.asr, pt.maghrib, pt.isha].map(hm);
    row.forEach((x, i) => { const [a, b] = x.split(":").map(Number); per[i].push(a * 60 + b - calc[i]); });
  });
  return { s, name, lat, lng, d: per.map(a => Math.round(a.reduce((x, y) => x + y, 0) / a.length)) };   // [فجر، شروق، ظهر، عصر، مغرب، عشاء]
});

/* استبعاد الإحداثيّات الخاطئة: فروقٌ غيرُ معقولة، أو إحداثيّاتٌ مكرَّرةٌ لمدنٍ مختلفة */
const coordCount = {}; rows.filter(Boolean).forEach(r => { const k = r.lat + "," + r.lng; coordCount[k] = (coordCount[k] || 0) + 1; });
const sane = r => r && coordCount[r.lat + "," + r.lng] === 1 && Math.abs(r.d[2] - 5) <= 2 && Math.abs(r.d[0]) <= 3 && Math.abs(r.d[5]) <= 3 && Math.abs(r.d[3] - 1) <= 3;
const good = rows.filter(sane).sort((a, b) => a.lat - b.lat);
const bad = rows.filter(r => r && !sane(r)).map(r => r.name);
const med = i => { const a = good.map(r => r.d[i]).sort((x, y) => x - y); return a[a.length >> 1]; };
const fallback = [0, 1, 2, 3, 4, 5].map(med);
console.log("مقبولة:", good.length, "— مستبعدة:", bad.length, bad.join("، "));
console.log("الافتراضيّ (الوسيط):", fallback.join(","));

const data = { generated: today.toISOString().slice(0, 10), fallback, cities: good.map(r => [+r.lat.toFixed(3), +r.lng.toFixed(3), ...r.d]) };
const json = JSON.stringify(data);
fs.writeFileSync(path.join(ROOT, "ma-habous.js"),
  "/* فروقُ المواقيت الرسميّة (وزارة الأوقاف) لمدن المغرب بالدقائق عن حسابنا — مُولَّد بـ tools/build-ma-habous.mjs، لا يُعدَّل يدويًّا.\n" +
  "   كلُّ سطرٍ: [خطّ العرض، خطّ الطول، فجر، شروق، ظهر، عصر، مغرب، عشاء] */\nwindow.MA_HABOUS=" + json + ";\n");
fs.writeFileSync(path.join(ROOT, "netlify/functions/_lib/ma-habous.mts"),
  "/* مُولَّد بـ tools/build-ma-habous.mjs — لا يُعدَّل يدويًّا (نفس جدول ma-habous.js في التطبيق) */\nexport const MA_HABOUS: { generated: string; fallback: number[]; cities: number[][] } = " + json + ";\n");
console.log("✓ كُتب ma-habous.js و ma-habous.mts —", good.length, "مدينة");
