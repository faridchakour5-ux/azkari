#!/usr/bin/env node
/* صلاتي — يرفع حزمة AAB إلى Google Play Console عبر Google Play Developer API.
 *
 *   PLAY_SA_JSON=/path/service-account.json \
 *   node tools/play-upload.mjs --aab dist/salatee-v2.0.5-code105-signed.aab \
 *        --notes "Release notes in English" [--track <اسم_المسار>] [--dry-run] [--list-tracks]
 *
 * لا تبعيّات: Node 18+ فقط (fetch وcrypto المدمجان). ولا سرَّ في هذا الملفّ:
 * ملفّ حساب الخدمة (JSON) يبقى خارج المستودع.
 *
 *   --list-tracks  يطبع مسارات التطبيق (الإنتاج/الاختبار...) لمعرفة اسم مسار الاختبار المغلق، ثم يخرج
 *   --dry-run      يرفع الحزمة ويتحقّق منها ثم يُلغي التعديل بلا نشر (للتجربة الأولى)
 *
 * المسارُ الافتراضيّ: المسارُ المغلق الوحيد الذي اسمُه يحوي «salatee». ولا يُنشَر على «production» أبدًا
 * ما لم يُمرَّر --track production صراحةً.
 */
import fs from "node:fs";
import crypto from "node:crypto";

const PKG = "app.salaty.twa";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" + PKG;
const UPLOAD = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/" + PKG;

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : d; };
const flag = n => args.includes("--" + n);
const die = m => { console.error("✗ " + m); process.exit(1); };

const saPath = process.env.PLAY_SA_JSON || die("PLAY_SA_JSON غير مضبوط (ملفّ حساب الخدمة)");
const sa = JSON.parse(fs.readFileSync(saPath, "utf8"));

const b64u = b => Buffer.from(b).toString("base64url");
async function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token", iat: now, exp: now + 3000,
  }));
  const sig = crypto.createSign("RSA-SHA256").update(head + "." + body).sign(sa.private_key, "base64url");
  const r = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: head + "." + body + "." + sig }),
  });
  const j = await r.json();
  if (!j.access_token) die("فشل الحصول على الرمز: " + JSON.stringify(j));
  return j.access_token;
}

const T = await token();
async function call(method, url, body, headers = {}) {
  const r = await fetch(url, { method, headers: { Authorization: "Bearer " + T, ...headers }, body });
  const txt = await r.text();
  let j; try { j = txt ? JSON.parse(txt) : {}; } catch { j = { raw: txt }; }
  if (!r.ok) die(method + " " + url.replace(/^https:\/\/[^/]+/, "") + " → " + r.status + " " + (j.error?.message || txt.slice(0, 300)));
  return j;
}
const json = (m, u, o) => call(m, u, o ? JSON.stringify(o) : undefined, o ? { "Content-Type": "application/json" } : {});

const edit = await json("POST", API + "/edits", {});
console.log("✓ تعديلٌ جديد:", edit.id);
const E = API + "/edits/" + edit.id;

const tracks = (await json("GET", E + "/tracks")).tracks || [];
if (flag("list-tracks")) {
  for (const t of tracks) console.log("•", t.track, "—", (t.releases || []).map(r => `${r.name || "?"}[${r.status}] ${(r.versionCodes || []).join(",")}`).join(" | ") || "(لا إصدارات)");
  await call("DELETE", E); process.exit(0);
}

const aab = opt("aab") || die("--aab مطلوب");
const notes = opt("notes") || die("--notes مطلوب (نصّ ملاحظات الإصدار بالإنجليزيّة)");
let track = opt("track");
if (!track) {
  const m = tracks.filter(t => /salatee/i.test(t.track));
  if (m.length !== 1) die("تعذّر تحديد المسار تلقائيًّا؛ المسارات: " + tracks.map(t => t.track).join(", ") + " — مرّر --track");
  track = m[0].track;
}
console.log("→ المسار:", track);

const buf = fs.readFileSync(aab);
console.log("→ رفع الحزمة", (buf.length / 1048576).toFixed(1), "ميغابايت");
const up = await call("POST", UPLOAD + "/edits/" + edit.id + "/bundles?uploadType=media", buf, { "Content-Type": "application/octet-stream" });
const vc = up.versionCode || die("لم يُرجع الرفعُ versionCode: " + JSON.stringify(up));
console.log("✓ رُفعت الحزمة، versionCode", vc);

const listings = (await json("GET", E + "/listings")).listings || [];
const langs = listings.map(l => l.language);
const lang = langs.find(l => /^ar/i.test(l)) || langs[0] || "en-US";
const vname = (aab.match(/v(\d+\.\d+\.\d+)/) || [])[1] || String(vc);

await json("PUT", E + "/tracks/" + encodeURIComponent(track), {
  track, releases: [{ name: vname, versionCodes: [String(vc)], status: "completed", releaseNotes: [{ language: lang, text: notes }] }],
});
console.log("✓ الإصدار", vname, "على المسار", track, "(لغة الملاحظات:", lang + ")");

if (flag("dry-run")) { await call("DELETE", E); console.log("• تجربةٌ فقط: أُلغي التعديل ولم يُنشر شيء"); process.exit(0); }
const done = await json("POST", E + ":commit");
console.log("✓ أُرسل التعديل إلى Play:", done.id || "تمّ");
console.log("ملاحظة: إن كان «النشر المُدار» مفعَّلًا في Play Console فسيبقى الإصدار بانتظار الضغط على «نشر» بعد مراجعة Google.");
