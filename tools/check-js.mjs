#!/usr/bin/env node
/* فحصٌ سريع بلا اعتماديّات: (1) كلُّ سكربتٍ في index.html وملفّاتِ js يُترجَم بلا خطأ نحوي،
   (2) لا دالّةَ مصرَّحةً مرّتين في المستوى الأعلى من index.html (الثانيةُ تحجب الأولى بصمت). */
import fs from 'node:fs';
import vm from 'node:vm';
let bad = 0;
const fail = m => { console.error('✗ ' + m); bad++; };

const html = fs.readFileSync('index.html', 'utf8');
const inline = h => [...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
const blocks = inline(html).concat(inline(fs.readFileSync('waqf.html', 'utf8')));
blocks.forEach((src, i) => { try { new vm.Script(src, { filename: 'index.html#script' + (i + 1) }); } catch (e) { fail('index.html script ' + (i + 1) + ': ' + e.message); } });

const js = ['tools.js', 'i18n_core.js', 'i18n_en.js', 'i18n_fr.js', 'quiz.js', 'quiz2.js', 'sw.js', 'fiqh.js', 'fadl.js', 'wasaya.js', 'thabat.js', 'sunna.js', 'sharh.js', 'mutash.js', 'ma-habous.js', 'pt-regions.js'];
for (const f of js) { try { new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f }); } catch (e) { fail(f + ': ' + e.message); } }

const seen = new Map();
for (const src of blocks) for (const m of src.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
for (const [n, c] of seen) if (c > 1) fail('دالّةٌ مكرَّرةٌ في index.html: ' + n + ' ×' + c);

if (bad) { console.error(bad + ' خطأ'); process.exit(1); }
console.log('✓ النحوُ سليمٌ في ' + (blocks.length + js.length) + ' سكربتًا، ولا دوالَّ مكرَّرة');
