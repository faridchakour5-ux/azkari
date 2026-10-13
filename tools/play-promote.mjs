#!/usr/bin/env node
/* صلاتي — ينقل إصدارًا مرفوعًا أصلًا (versionCode) إلى مسارٍ آخر، دون رفع حزمةٍ جديدة.
 *
 *   PLAY_SA_JSON=… node tools/play-promote.mjs --code 146 --track production --notes notes.json [--dry-run]
 *        notes.json = { "ar": "نصّ", "en-US": "text", "fr-FR": "texte" }   (≤ 500 حرف لكلّ لغة)
 *
 * الإنتاجُ لا يُلمَس إلا بأمرٍ صريحٍ من فريد («production go»). النشرُ كاملٌ (completed) لا تدريجيّ. */
import fs from "node:fs";
import crypto from "node:crypto";
const PKG = "app.salaty.twa";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" + PKG;
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : d; };
const die = m => { console.error("✗ " + m); process.exit(1); };
const code = opt("code") || die("--code مطلوب"), track = opt("track") || die("--track مطلوب");
const notes = JSON.parse(fs.readFileSync(opt("notes") || die("--notes مطلوب"), "utf8"));
const sa = JSON.parse(fs.readFileSync(process.env.PLAY_SA_JSON || die("PLAY_SA_JSON غير مضبوط"), "utf8"));
const b = x => Buffer.from(x).toString("base64url"), now = Math.floor(Date.now() / 1000);
const h = b(JSON.stringify({ alg: "RS256", typ: "JWT" })), c = b(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: sa.token_uri, iat: now, exp: now + 3000 }));
const sig = crypto.createSign("RSA-SHA256").update(h + "." + c).sign(sa.private_key, "base64url");
const T = (await (await fetch(sa.token_uri, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + h + "." + c + "." + sig })).json()).access_token || die("فشل الرمز");
const call = async (m, u, o) => { const r = await fetch(u, { method: m, headers: { Authorization: "Bearer " + T, ...(o ? { "Content-Type": "application/json" } : {}) }, body: o ? JSON.stringify(o) : undefined }); const t = await r.text(); const j = t ? JSON.parse(t) : {}; if (!r.ok) die(m + " " + u.replace(/^https:\/\/[^/]+/, "") + " → " + r.status + " " + (j.error?.message || t.slice(0, 300))); return j; };
const edit = await call("POST", API + "/edits", {}); const E = API + "/edits/" + edit.id;
const name = opt("name") || code;
const releaseNotes = Object.entries(notes).map(([language, text]) => { if (text.length > 500) die(language + ": الملاحظات أطول من 500 حرف"); return { language, text }; });
await call("PUT", E + "/tracks/" + track, { track, releases: [{ name, versionCodes: [String(code)], status: "completed", releaseNotes }] });
console.log("✓ الإصدار", name, "(" + code + ") على المسار", track);
if (args.includes("--dry-run")) { await call("DELETE", E); console.log("• تجربةٌ فقط: أُلغي التعديل"); process.exit(0); }
const done = await call("POST", E + ":commit"); console.log("✓ أُرسل إلى Play:", done.id || "تمّ");
