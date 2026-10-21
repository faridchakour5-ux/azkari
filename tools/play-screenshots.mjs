#!/usr/bin/env node
/* صلاتي — يستبدل لقطاتِ الهاتف في صفحة المتجر (Google Play) عبر الـAPI. لا يمسّ الوصفَ ولا العنوان ولا اللقطات الأخرى.
 *
 *   PLAY_SA_JSON=… node tools/play-screenshots.mjs --dir store/screenshots-ar --lang ar,fr-FR,en-US [--show] [--dry-run]
 *
 * يحذف كلَّ phoneScreenshots في كلّ لغةٍ مذكورة ثم يرفع ملفّات المجلّد بترتيب أسمائها (حتّى 8). ولا سرَّ في هذا الملفّ. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const PKG = "app.salaty.twa";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" + PKG;
const UP = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/" + PKG;
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : undefined; };
const flag = n => args.includes("--" + n);
const die = m => { console.error("✗ " + m); process.exit(1); };
const sa = JSON.parse(fs.readFileSync(process.env.PLAY_SA_JSON || die("PLAY_SA_JSON غير مضبوط"), "utf8"));
const b64u = b => Buffer.from(b).toString("base64url"), now = Math.floor(Date.now() / 1000);
const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
const body = b64u(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: sa.token_uri, iat: now, exp: now + 3000 }));
const sig = crypto.createSign("RSA-SHA256").update(head + "." + body).sign(sa.private_key, "base64url");
const T = (await (await fetch(sa.token_uri, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + head + "." + body + "." + sig })).json()).access_token || die("فشل الرمز");
const call = async (m, u, o, raw) => {
  const r = await fetch(u, { method: m, headers: { Authorization: "Bearer " + T, ...(raw ? { "Content-Type": "image/png" } : o ? { "Content-Type": "application/json" } : {}) }, body: raw || (o ? JSON.stringify(o) : undefined) });
  const t = await r.text(); let j; try { j = t ? JSON.parse(t) : {}; } catch { j = { raw: t }; }
  if (!r.ok) die(m + " " + u.replace(/^https:\/\/[^/]+/, "") + " → " + r.status + " " + (j.error?.message || t.slice(0, 300)));
  return j;
};
const langs = (opt("lang") || "ar").split(",");
const edit = await call("POST", API + "/edits", {}), E = API + "/edits/" + edit.id;
for (const l of langs) {
  const cur = (await call("GET", E + "/listings/" + l + "/phoneScreenshots")).images || [];
  console.log("[" + l + "] الحاليّة:", cur.length);
}
if (flag("show")) { await call("DELETE", E); process.exit(0); }
const dir = opt("dir") || die("--dir مطلوب");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".png")).sort().slice(0, 8);
if (!files.length) die("لا صورَ في " + dir);
for (const l of langs) {
  await call("DELETE", E + "/listings/" + l + "/phoneScreenshots");
  for (const f of files) { const r = await call("POST", UP + "/edits/" + edit.id + "/listings/" + l + "/phoneScreenshots?uploadType=media", null, fs.readFileSync(path.join(dir, f))); console.log("[" + l + "] ↑", f, r.image?.id ? "✓" : ""); }
}
if (flag("dry-run")) { await call("DELETE", E); console.log("• تجربةٌ فقط: أُلغي التعديل"); process.exit(0); }
const done = await call("POST", E + ":commit"); console.log("✓ أُرسل إلى Play:", done.id || "تمّ");
