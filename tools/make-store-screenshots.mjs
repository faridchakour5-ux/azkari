#!/usr/bin/env node
/* صلاتي — يلتقط لقطاتِ صفحة المتجر (Google Play) بالعربيّة من التطبيق نفسِه في Chromium، بقياس هاتفٍ 824×1648 (نسبةُ 2:1 كحدٍّ أقصى عند Play).
 *   (يلزم خادمٌ محلّيٌّ على 8123: python3 -m http.server 8123)   node tools/make-store-screenshots.mjs
 * القرآنُ بالزمرّديّ الأغمق (g5 = #042A21)، والموقعُ الجغرافيّ مزيَّفٌ (الدار البيضاء) ليظهر مواقيتُ الصلاة. تُحفَظ في store/screenshots-ar/ ولا تدخل التطبيقَ. */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const OUT = 'store/screenshots-ar/', BASE = 'http://localhost:8123/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 412, height: 824 }, deviceScaleFactor: 2, locale: 'ar-MA', timezoneId: 'Africa/Casablanca',
  geolocation: { latitude: 33.5731, longitude: -7.5898 }, permissions: ['geolocation'] });
await ctx.addInitScript(() => { try { localStorage.setItem('az_onb', 'true'); Object.defineProperty(navigator, 'standalone', { get: () => true }); } catch (e) {} });   // standalone: لا تظهر بطاقةُ «ثبِّت التطبيق»
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const wait = ms => p.waitForTimeout(ms);
const shot = async n => { await p.screenshot({ path: OUT + n + '.png' }); console.log('✓', n); };
const tab = s => p.evaluate(s => document.querySelector('.tab[data-s="' + s + '"]').click(), s);
const Q = '#042A21';
const qcss = `:root{--qtext:${Q} !important}`;

await p.goto(BASE + 'index.html'); await wait(2500);
await p.evaluate(() => { store.set('az_geo', { lat: 33.5731, lng: -7.5898, t: Date.now() }); settings.riwaya = 'warsh'; settings.wirdMode = 'mushaf'; saveSettings(); });
await p.reload(); await wait(3000);
// 1) القرآن بورش
await tab('s-wird'); await wait(2500);
await p.evaluate(() => { window.scrollTo(0, 0); const a = document.getElementById('autoread-pill'); if (a) a.style.display = 'none'; }); await wait(1200); await shot('01-quran-warsh');
// 2) القائمة الرئيسيّة
await p.evaluate(() => window.openDrawer()); await wait(900); await shot('02-menu');
await p.evaluate(() => { try { window.closeDrawer && window.closeDrawer(); } catch (e) {} document.querySelector('#drawer').classList.remove('open'); }); await wait(300);
await p.reload(); await wait(2500);
// 3) التجويد
await p.goto(BASE + 'tajweed.html#warsh'); await wait(1500);
await p.addStyleTag({ content: qcss + '.q{color:' + Q + ' !important}' });
await p.evaluate(() => { const c = document.querySelectorAll('.card')[2]; if (c) window.scrollTo(0, c.getBoundingClientRect().top + scrollY - 12); }); await wait(500); await shot('03-tajweed');
// 4) الاستماع
await p.goto(BASE + 'index.html'); await wait(2500);
await tab('s-listen'); await wait(1500); await shot('04-listen');
// 5) الأذكار ومواقيت الصلاة
await tab('s-azkar'); await wait(2000); await shot('05-azkar');
// 6) التحفيظ
await tab('s-listen'); await wait(800);
await p.evaluate(() => { try { applyListenMode('hifz'); } catch (e) {} }); await wait(1800);
await p.evaluate(() => { document.querySelectorAll('.hz-hint').forEach(h => { if (/تلوين|mp3quran/.test(h.textContent) && h.textContent.length < 200) h.style.display = 'none'; }); });   // سطرا تنبيهٍ تقنيّان لا يلزمان صورةَ المتجر
await p.evaluate(() => { const l = [...document.querySelectorAll('.hz-lbl')].find(x => x.textContent.trim() === 'الرواية'); if (l) window.scrollTo(0, l.getBoundingClientRect().top + scrollY - 190); }); await wait(600); await shot('06-hifz');
// 7) أبواب الخير
await p.goto(BASE + 'khayr.html'); await wait(1500);
await p.addStyleTag({ content: qcss + '.q{color:' + Q + ' !important}' }); await wait(300); await shot('07-khayr');
// 8) الوقف والابتداء
await p.goto(BASE + 'waqf.html#warsh'); await wait(1500);
await p.addStyleTag({ content: qcss }); await wait(300); await shot('08-waqf');
console.log(errs); await b.close();
