#!/usr/bin/env node
/* اختبارُ دخانٍ للواجهة: يفتح التطبيقَ بالعربيّة والفرنسيّة والإنجليزيّة، ويمرّ على كلّ التبويبات
   وكلِّ عناصر القائمة الجانبيّة، ويفشل عند أيّ خطأٍ في الصفحة (pageerror) أو طلبٍ محلّيٍّ مكسور.
   التشغيل:  python3 -m http.server 8123 &  ثم  node tools/smoke.mjs
   (يلزم playwright؛ وفي بيئتنا يُحمَّل من المسار العامّ، وأمّا CHROME فمسارُ المتصفّح إن لم يكن الافتراضيّ) */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const BASE = process.env.BASE || 'http://localhost:8123/';
const fails = [];
const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : (require('node:fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' } : {}));
for (const lang of ['ar', 'fr', 'en']) {
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, permissions: ['geolocation'], geolocation: { latitude: 33.57, longitude: -7.59 } });
  await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
  p.on('response', r => { const u = r.url(); if (u.startsWith(BASE.replace(/\/$/, '')) && r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + u); });
  await p.addInitScript(l => { localStorage.setItem('az_onb', 'true'); localStorage.setItem('az_geo', JSON.stringify({ lat: 33.57, lng: -7.59, t: Date.now() })); localStorage.setItem('az_settings', JSON.stringify({ lang: l })); }, lang);
  await p.goto(BASE); await p.addStyleTag({ content: '#splash{display:none!important}' }); await p.waitForTimeout(2500);
  for (const s of ['s-wird', 's-listen', 's-azkar', 's-tasbih', 's-settings']) {
    await p.evaluate(s => document.querySelector('.tab[data-s="' + s + '"]').click(), s); await p.waitForTimeout(500);
  }
  const ids = await p.evaluate(() => { document.getElementById('tab-menu').click(); return [...document.querySelectorAll('.drawer [data-a]')].map(x => x.dataset.a); });
  for (const id of ids) {
    await p.evaluate(() => { if (!document.getElementById('drawer').classList.contains('show')) document.getElementById('tab-menu').click(); }); await p.waitForTimeout(200);
    await p.evaluate(i => document.querySelector('.drawer [data-a="' + i + '"]').click(), id); await p.waitForTimeout(700);
    await p.evaluate(() => { try { window.SalTools && SalTools.close && SalTools.close(); } catch (e) {} });
  }
  /* صفحةُ «الوقف والابتداء» المستقلّة: تُفتح بكلّ تبويباتها بلا خطأ */
  for (const h of ['hafs', 'warsh', 'rules']) { await p.goto(BASE + 'waqf.html#' + h); await p.waitForTimeout(400); }
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (ov > 2) errs.push('تمرير أفقيّ: ' + ov + 'px');
  console.log((errs.length ? '✗ ' : '✓ ') + lang + ' — ' + ids.length + ' قسمًا من القائمة' + (errs.length ? '\n   ' + [...new Set(errs)].join('\n   ') : ''));
  if (errs.length) fails.push(lang);
  await ctx.close();
}
await b.close();
process.exit(fails.length ? 1 : 0);
