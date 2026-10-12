#!/usr/bin/env node
/* صلاتي — يبني pt-regions.js (للتطبيق) و netlify/functions/_lib/pt-regions.mts (للخادم):
 * حدودُ الدول التي لها طريقةُ حسابٍ خاصّةٌ، من Natural Earth (ملكيّةٌ عامّة) عبر الحزمة world-atlas.
 *
 *   npm i world-atlas@2 topojson-client@3        (خارج المستودع، في أيّ مجلّد)
 *   node tools/build-pt-regions.mjs /path/to/node_modules
 *
 * القاعدة: كلُّ مكانٍ لا تحويه مناطقُ هذا الجدول يُحسب برابطة العالم الإسلامي (mwl) — الافتراضيّ.
 * والمغربُ لا يدخل هنا: computePrayers يستثنيه قبل أيّ شيء، فيبقى بإعدادات الأوقاف.
 * مصادرُ الطرق: praytimes.org/wiki/Calculation_Methods وتوثيقُ مكتبة adhan، والجهاتُ الرسميّة حيث عُرفت
 * (ماليزيا/إندونيسيا/سنغافورة 20/18، تركيا الشؤون الدينية، كراتشي لجنوب آسيا، مصر هيئة المساحة، أمّ القرى لجزيرة العرب...).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NM = path.resolve(process.argv[2] || "node_modules");
const req = createRequire(path.join(NM, "x.js"));
const topo = JSON.parse(fs.readFileSync(path.join(NM, "world-atlas/countries-50m.json"), "utf8"));
const { feature } = req("topojson-client");
const fc = feature(topo, topo.objects.countries);

/* مجموعة الطريقة ← الدول (بأسمائها في Natural Earth). الترتيب = أولويّةُ الحدود المتداخلة. */
const GROUPS = {
  qatar:  ["Qatar"],
  kuwait: ["Kuwait"],
  dubai:  ["United Arab Emirates"],
  umm:    ["Saudi Arabia", "Yemen", "Oman", "Bahrain"],
  egy:    ["Egypt", "Sudan", "S. Sudan", "Libya", "Syria", "Lebanon"],
  tn:     ["Tunisia"],
  kar:    ["Pakistan", "Afghanistan", "Bangladesh", "India"],
  sg:     ["Malaysia", "Indonesia", "Brunei", "Singapore"],
  turkey: ["Turkey"],
  tehran: ["Iran"],
  na:     ["United States of America", "Canada", "Mexico"],
};

const METHODS = {
  mwl:    { p: "MuslimWorldLeague", s: "رابطة العالم الإسلامي", n: "رابطة العالم الإسلامي — الفجر 18 والعشاء 17 درجة" },
  na:     { p: "NorthAmerica", s: "أمريكا الشمالية (ISNA)", n: "أمريكا الشمالية (ISNA) — الفجر والعشاء 15 درجة" },
  umm:    { p: "UmmAlQura", s: "أمّ القرى", n: "أمّ القرى — الفجر 18.5 درجة، والعشاء بعد المغرب بتسعين دقيقة (وقد تُزاد في رمضان)" },
  dubai:  { p: "Dubai", s: "دبي", n: "دبي — الفجر والعشاء 18.2 درجة" },
  qatar:  { p: "Qatar", s: "قطر", n: "قطر — الفجر 18 درجة، والعشاء بعد المغرب بتسعين دقيقة" },
  kuwait: { p: "Kuwait", s: "الكويت", n: "الكويت — الفجر 18 والعشاء 17.5 درجة" },
  egy:    { p: "Egyptian", s: "الهيئة المصرية", n: "الهيئة المصرية العامة للمساحة — الفجر 19.5 والعشاء 17.5 درجة" },
  kar:    { p: "Karachi", asr: "hanafi", s: "كراتشي", n: "جامعة العلوم الإسلامية بكراتشي — الفجر والعشاء 18 درجة، والعصر على المذهب الحنفي" },
  tn:     { p: "Karachi", s: "زاوية 18 للفجر والعشاء", n: "الفجر والعشاء 18 درجة" },
  sg:     { p: "Singapore", s: "جنوب شرق آسيا", n: "جنوب شرق آسيا — الفجر 20 والعشاء 18 درجة" },
  turkey: { p: "Turkey", s: "تركيا (الشؤون الدينية)", n: "رئاسة الشؤون الدينية التركية — الفجر 18 والعشاء 17 درجة" },
  tehran: { p: "Tehran", s: "طهران", n: "معهد الجيوفيزياء بجامعة طهران — الفجر 17.7 والعشاء 14 درجة" },
};
const TOL = 0.012, MIN_AREA = 0.004;

function dp(pts, tol) {               // Douglas–Peucker على [lng,lat]
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = pts[i]; let d;
      if (L === 0) d = Math.hypot(x - x1, y - y1);
      else { const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L)); d = Math.hypot(x - x1 - t * dx, y - y1 - t * dy); }
      if (d > md) { md = d; mi = i; }
    }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const bboxArea = r => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of r) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return (x1 - x0) * (y1 - y0); };

const byName = new Map(fc.features.map(f => [f.properties.name, f]));
const data = {}; let verts = 0;
for (const [g, names] of Object.entries(GROUPS)) {
  data[g] = [];
  for (const n of names) {
    const f = byName.get(n); if (!f) throw new Error("دولةٌ غير موجودة: " + n);
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    const rings = polys.map(p => p[0]).sort((a, b) => bboxArea(b) - bboxArea(a));
    rings.forEach((r, i) => {
      if (i > 0 && bboxArea(r) < MIN_AREA) return;           // جزرٌ صغيرةٌ تُهمَل (الأكبر يُبقى دائمًا)
      const s = dp(r, TOL); if (s.length < 4) return;
      const flat = []; for (const [x, y] of s) flat.push(Math.round(y * 100), Math.round(x * 100));
      data[g].push(flat); verts += s.length;
    });
  }
}
console.log("رؤوس:", verts);

const core = `
  /* data[g] = قائمةُ حلقاتٍ؛ كلُّ حلقة: [عرض×100، طول×100، ...] */
  function bbox(f){ let a=1e9,b=-1e9,c=1e9,d=-1e9; for(let i=0;i<f.length;i+=2){ const y=f[i], x=f[i+1]; if(y<a)a=y; if(y>b)b=y; if(x<c)c=x; if(x>d)d=x; } return [a,b,c,d]; }
  const IDX = {}; for(const g in DATA) IDX[g] = DATA[g].map(f=>({f, b:bbox(f)}));
  function inRing(y,x,f){
    let c=false;
    for(let i=0,j=f.length-2;i<f.length;j=i,i+=2){
      const yi=f[i], xi=f[i+1], yj=f[j], xj=f[j+1];
      if(((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) c=!c;
    }
    return c;
  }
  function edgeKm(y,x,f,kx){   /* أقربُ مسافةٍ (كم) من النقطة إلى حدود الحلقة */
    let md=1e9;
    for(let i=0,j=f.length-2;i<f.length;j=i,i+=2){
      const ay=f[j]/100, ax=f[j+1]/100, by=f[i]/100, bx=f[i+1]/100, py=y/100, px=x/100;
      const dx=(bx-ax)*kx, dy=by-ay, L=dx*dx+dy*dy; let t=L?(((px-ax)*kx*dx+(py-ay)*dy)/L):0; t=t<0?0:t>1?1:t;
      const ex=(px-ax)*kx-t*dx, ey=(py-ay)-t*dy, d=Math.sqrt(ex*ex+ey*ey)*111.2; if(d<md) md=d;
    }
    return md;
  }
  let _k=null,_v=null;
  /* مجموعةُ الطريقة لهذا الموقع، أو null = الافتراضيّ (mwl). */
  function ptRegion(lat,lng){
    if(!(isFinite(lat)&&isFinite(lng))) return null;
    const k=lat.toFixed(2)+','+lng.toFixed(2); if(k===_k) return _v;
    const y=Math.round(lat*100), x=Math.round(lng*100); let r=null;
    outer: for(const g of ORDER) for(const o of IDX[g]){ const b=o.b; if(y<b[0]||y>b[1]||x<b[2]||x>b[3]) continue; if(inRing(y,x,o.f)){ r=g; break outer; } }
    /* مدنٌ ساحليّة قد يُسقطها التبسيطُ خارجَ الحدّ بكيلومتراتٍ: نأخذ أقربَ حدٍّ إن كان على بعد ≤ 15 كم */
    if(!r){ let best=15; const kx=Math.cos(lat*Math.PI/180);
      for(const g of ORDER) for(const o of IDX[g]){ const b=o.b, m=20; if(y<b[0]-m||y>b[1]+m||x<b[2]-m/kx||x>b[3]+m/kx) continue; const d=edgeKm(y,x,o.f,kx); if(d<best){ best=d; r=g; } } }
    _k=k; _v=r; return r;
  }`;

const dataJson = JSON.stringify(data);
const methodsJson = JSON.stringify(METHODS);
const coreFull = core + `
  const METHODS = ${methodsJson};
  /* مفتاحُ الطريقة: اختيارُ المستخدم (خارج المغرب فقط، يمرّره المستدعي) أو التلقائيّ حسب المنطقة */
  function ptKey(lat,lng,manual){
    if(manual && manual!=='auto' && METHODS[manual]) return manual;
    const g = ptRegion(lat,lng); return g && METHODS[g] ? g : 'mwl';
  }
  /* A = مكتبة adhan. asrPref: 'shafi' | 'hanafi' | 'auto' */
  function ptParams(A, key, coords, asrPref){
    const M = METHODS[key] || METHODS.mwl;
    const p = A.CalculationMethod[M.p]();
    p.madhab = asrPref==='hanafi' ? A.Madhab.Hanafi : asrPref==='shafi' ? A.Madhab.Shafi : (M.asr==='hanafi' ? A.Madhab.Hanafi : A.Madhab.Shafi);
    p.highLatitudeRule = A.HighLatitudeRule.recommended(coords);
    return p;
  }
  function ptNote(key, asrPref){
    const M = METHODS[key] || METHODS.mwl;
    let t = 'طريقة الحساب: ' + M.n;
    if(asrPref==='hanafi' && M.asr!=='hanafi') t += '، والعصر على المذهب الحنفي';
    if(asrPref==='shafi' && M.asr==='hanafi') t = t.replace('، والعصر على المذهب الحنفي', '، والعصر على المذهب الشافعي');
    return t + '. قد تختلف بدقائق عن مسجدك.';
  }`;
const order = JSON.stringify(Object.keys(GROUPS));

const appJs = `/* طريقةُ حساب المواقيت حسب البلد — صلاتي. مولَّدٌ بـ tools/build-pt-regions.mjs (لا يُعدَّل يدويًّا).
   المغرب لا يدخل هنا أبدًا (computePrayers يستثنيه: إعدادات الأوقاف وجدولها الدقيق).
   حدودٌ مبسَّطةٌ من Natural Earth (ملكيّةٌ عامّة)، دقّتُها بضعةُ كيلومترات — يكفي لاختيار طريقة الحساب.
   وما لا تحويه المجموعاتُ يُحسب برابطة العالم الإسلامي (mwl). نفس الجدول في netlify/functions/_lib/pt-regions.mts */
(function(root){
  const ORDER = ${order};
  const DATA = ${dataJson};${coreFull}
  root.PT_REGION = ptRegion; root.PT_KEY = ptKey; root.PT_PARAMS = ptParams; root.PT_NOTE = ptNote; root.PT_METHODS = METHODS;
  if(typeof module!=='undefined' && module.exports) module.exports = { ptRegion, ptKey, ptParams, ptNote, METHODS };
})(typeof window!=='undefined' ? window : globalThis);
`;
fs.writeFileSync(path.join(ROOT, "pt-regions.js"), appJs);

const mts = `/* مولَّدٌ بـ tools/build-pt-regions.mjs — لا يُعدَّل يدويًّا (نفسُ pt-regions.js) */
const ORDER: string[] = ${order};
const DATA: Record<string, number[][]> = ${dataJson};
${coreFull.replace("function bbox(f)", "function bbox(f: number[]): number[]").replace("const IDX = {};", "const IDX: Record<string, { f: number[]; b: number[] }[]> = {};").replace("function inRing(y,x,f)", "function inRing(y: number, x: number, f: number[]): boolean").replace("let _k=null,_v=null;", "let _k: string | null = null, _v: string | null = null;").replace("function ptRegion(lat,lng){", "export function ptRegion(lat: number, lng: number): string | null {").replace("let r=null;", "let r: string | null = null;").replace("function edgeKm(y,x,f,kx){", "function edgeKm(y: number, x: number, f: number[], kx: number): number {").replace("const METHODS = {", "const METHODS: Record<string, { p: string; s: string; n: string; asr?: string }> = {").replace("function ptKey(lat,lng,manual){", "export function ptKey(lat: number, lng: number, manual?: string | null): string {").replace("function ptParams(A, key, coords, asrPref){", "export function ptParams(A: any, key: string, coords: unknown, asrPref?: string | null): any {").replace("function ptNote(key, asrPref){", "export function ptNote(key: string, asrPref?: string | null): string {")}
`;
fs.writeFileSync(path.join(ROOT, "netlify/functions/_lib/pt-regions.mts"), mts);
console.log("✓ pt-regions.js", (appJs.length / 1024).toFixed(0) + "KB ·", "pt-regions.mts", (mts.length / 1024).toFixed(0) + "KB");
