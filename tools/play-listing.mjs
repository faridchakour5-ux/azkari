#!/usr/bin/env node
/* صلاتي — يعرض أو يغيّر «عنوان صفحة المتجر والوصف القصير» (listings) عبر Google Play Developer API.
 *
 *   PLAY_SA_JSON=/path/service-account.json node tools/play-listing.mjs --show
 *   PLAY_SA_JSON=… node tools/play-listing.mjs --lang ar --title "صلاتي salatee" --short "…" --full-file وصف.txt  (و--dump مجلّد مع --show لحفظ الأوصاف الكاملة الحاليّة)
 *
 * لا يمسّ الوصفَ الكامل ولا اللقطات. ولا سرَّ في هذا الملفّ. */
import fs from "node:fs";
import crypto from "node:crypto";

const PKG = "app.salaty.twa";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" + PKG;
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : undefined; };
const flag = n => args.includes("--" + n);
const die = m => { console.error("✗ " + m); process.exit(1); };

const sa = JSON.parse(fs.readFileSync(process.env.PLAY_SA_JSON || die("PLAY_SA_JSON غير مضبوط"), "utf8"));
const b64u = b => Buffer.from(b).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
const body = b64u(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: sa.token_uri || "https://oauth2.googleapis.com/token", iat: now, exp: now + 3000 }));
const sig = crypto.createSign("RSA-SHA256").update(head + "." + body).sign(sa.private_key, "base64url");
const tr = await (await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: head + "." + body + "." + sig }) })).json();
if (!tr.access_token) die("فشل الحصول على الرمز: " + JSON.stringify(tr));
const call = async (method, url, o) => {
  const r = await fetch(url, { method, headers: { Authorization: "Bearer " + tr.access_token, ...(o ? { "Content-Type": "application/json" } : {}) }, body: o ? JSON.stringify(o) : undefined });
  const t = await r.text(); let j; try { j = t ? JSON.parse(t) : {}; } catch { j = { raw: t }; }
  if (!r.ok) die(method + " " + url.replace(/^https:\/\/[^/]+/, "") + " → " + r.status + " " + (j.error?.message || t.slice(0, 300)));
  return j;
};

const edit = await call("POST", API + "/edits", {});
const E = API + "/edits/" + edit.id;
const L = (await call("GET", E + "/listings")).listings || [];
console.log("الحالُ الآن:"); if (flag("dump")) { for (const l of L) fs.writeFileSync(opt("dump") + "/" + l.language + ".txt", l.fullDescription || ""); }
for (const l of L) console.log("  [" + l.language + "] العنوان: «" + l.title + "» | القصير: «" + (l.shortDescription || "") + "»");
if (flag("show") || !opt("lang")) { await call("DELETE", E); process.exit(0); }
const lang = opt("lang");
const cur = L.find(l => l.language === lang) || die("لا لغة بهذا الرمز: " + lang);
const next = { ...cur };
if (opt("title")) next.title = opt("title");
if (opt("short")) next.shortDescription = opt("short");
if (opt("full-file")) next.fullDescription = fs.readFileSync(opt("full-file"), "utf8").replace(/\s+$/, "");
if (next.title.length > 30) die("العنوان أطول من 30 حرفًا");
if ((next.fullDescription || "").length > 4000) die("الوصف الكامل أطول من 4000 حرف");
if (next.shortDescription.length > 80) die("الوصف القصير أطول من 80 حرفًا");
const upd = await call("PUT", E + "/listings/" + lang, next);
console.log("بعد التعديل: [" + lang + "] «" + upd.title + "» | «" + upd.shortDescription + "»");
await call("POST", E + ":commit", undefined);
console.log("✓ حُفظ في Play Console");
