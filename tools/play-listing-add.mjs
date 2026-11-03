#!/usr/bin/env node
/* صلاتي — يُنشئ (أو يحدّث) صفحةَ متجرٍ للغةٍ جديدة عبر Google Play Developer API.
 *   PLAY_SA_JSON=… node tools/play-listing-add.mjs --lang tr-TR --title "…" --short "…" --full-file store/listing/tr-TR.txt [--dry-run]
 * لا يمسّ اللغاتِ الأخرى ولا اللقطات (تُستعمل لقطاتُ اللغة الافتراضيّة). ولا سرَّ في هذا الملفّ. */
import fs from "node:fs"; import crypto from "node:crypto";
const PKG="app.salaty.twa", API="https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"+PKG;
const args=process.argv.slice(2), opt=n=>{const i=args.indexOf("--"+n); return i>=0?args[i+1]:undefined;}, die=m=>{console.error("✗ "+m); process.exit(1);};
const lang=opt("lang")||die("--lang مطلوب"), title=opt("title")||die("--title"), short=opt("short")||die("--short"), full=fs.readFileSync(opt("full-file")||die("--full-file"),"utf8").trim();
if(title.length>30) die("العنوان أطول من 30 حرفًا"); if(short.length>80) die("الوصف القصير أطول من 80 حرفًا ("+short.length+")"); if(full.length>4000) die("الوصف الكامل أطول من 4000 ("+full.length+")");
const sa=JSON.parse(fs.readFileSync(process.env.PLAY_SA_JSON||die("PLAY_SA_JSON غير مضبوط"),"utf8"));
const b=x=>Buffer.from(x).toString("base64url"), now=Math.floor(Date.now()/1000);
const h=b(JSON.stringify({alg:"RS256",typ:"JWT"})), c=b(JSON.stringify({iss:sa.client_email,scope:"https://www.googleapis.com/auth/androidpublisher",aud:sa.token_uri,iat:now,exp:now+3600}));
const sig=crypto.createSign("RSA-SHA256").update(h+"."+c).sign(sa.private_key,"base64url");
const T=(await (await fetch(sa.token_uri,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion="+h+"."+c+"."+sig})).json()).access_token;
const call=async(m,u,o)=>{const r=await fetch(u,{method:m,headers:{Authorization:"Bearer "+T,...(o?{"Content-Type":"application/json"}:{})},body:o?JSON.stringify(o):undefined}); const t=await r.text(); let j; try{j=t?JSON.parse(t):{}}catch{j={raw:t}} if(!r.ok) die(m+" "+u.replace(/^https:\/\/[^/]+/,"")+" → "+r.status+" "+(j.error?.message||t.slice(0,300))); return j;};
const e=await call("POST",API+"/edits",{}); const E=API+"/edits/"+e.id;
await call("PUT",E+"/listings/"+lang,{language:lang,title,shortDescription:short,fullDescription:full});
console.log("✓ صفحةُ المتجر ["+lang+"] «"+title+"» | قصير "+short.length+" | كامل "+full.length);
if(args.includes("--dry-run")){ await call("DELETE",E); console.log("• تجربةٌ فقط: أُلغي التعديل"); process.exit(0); }
const done=await call("POST",E+":commit"); console.log("✓ نُشرت:",done.id||"تمّ");
