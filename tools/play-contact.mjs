#!/usr/bin/env node
/* صلاتي — يعرض أو يغيّر «بيانات التواصل في صفحة المتجر» (البريد والهاتف والموقع) عبر Google Play Developer API.
 *
 *   PLAY_SA_JSON=/path/service-account.json node tools/play-contact.mjs --show
 *   PLAY_SA_JSON=… node tools/play-contact.mjs --email appsalatee@gmail.com --clear-phone [--website https://www.salatee.org]
 *
 * لا يطبع رقمَ الهاتف أبدًا (يذكر فقط هل هو مضبوط). ولا سرَّ في هذا الملفّ. */
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
const show = d => console.log("  البريد:", d.contactEmail || "(فارغ)", "| الموقع:", d.contactWebsite || "(فارغ)", "| الهاتف:", d.contactPhone ? "مضبوط" : "(فارغ)", "| اللغة الافتراضيّة:", d.defaultLanguage || "?");

const edit = await call("POST", API + "/edits", {});
const E = API + "/edits/" + edit.id;
const cur = await call("GET", E + "/details");
console.log("الحالُ الآن:"); show(cur);
if (flag("show") || (!opt("email") && !flag("clear-phone") && !opt("website"))) { await call("DELETE", E); process.exit(0); }

const patch = {};
if (opt("email")) patch.contactEmail = opt("email");
if (opt("website")) patch.contactWebsite = opt("website");
if (flag("clear-phone")) patch.contactPhone = "";
const upd = await call("PATCH", E + "/details", { ...patch });
console.log("بعد التعديل:"); show(upd);
await call("POST", E + ":commit", undefined);
console.log("✓ حُفظ في Play Console");
