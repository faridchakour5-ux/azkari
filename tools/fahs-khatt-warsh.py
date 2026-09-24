#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
فحصُ الخطّ المغربيّ على نصّ ورش كلِّه — صفرُ خطأٍ أو يَفشل.

    python3 tools/fahs-khatt-warsh.py        (يحتاج: fontTools brotli uharfbuzz، وnode)

ما يفحصه:
  ١. الخطُّ الذي يُحمِّله index.html فعلًا (لا اسمًا مفترضًا).
  ٢. اسمُ الملفّ يحمل أوّلَ ٨ محارف من بصمته SHA-1. فالخطوطُ تُخزَّن في
     المتصفّح «immutable» سنةً (_headers)، وملفٌّ يُعدَّل باسمه القديم لا
     يصل إلى من فتح التطبيقَ قبلُ. هذا ما أبقى تنوينَ الضمّ ألفًا «آ» في
     سورة الملك على هاتفٍ لم يُفرَّغ مخزنُه.
  ٣. كلُّ محرفٍ في نصّ ورش (المصحف + الأذكار القرآنيّة بورش) له مِحرفٌ في الخطّ.
  ٤. التنوينُ المتراكب الثلاثة مربوطٌ بمحارفه: U+0657→bifathatan،
     U+065E→bidammatan، U+0656→bikasratan.
  ٥. تشكيلُ النصّ كلّه بـ HarfBuzz: لا .notdef (سوى فاصل السطر U+000A)،
     وعددُ bidammatan بعد التشكيل = عددُ U+065E في النصّ تمامًا، ولا يَخرج
     alefmhdofwamed إلّا من «ألف خنجريّة + مدّ» (U+0670 U+0653).
"""
import collections, hashlib, io, json, os, re, subprocess, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
from fontTools.ttLib import TTFont
import uharfbuzz as hb

errs = []
def fail(m): errs.append(m); print('  ✘', m)
def ok(m): print('  ✓', m)

# ١) الخطّ الذي يُحمِّله التطبيق
html = io.open('index.html', encoding='utf-8').read()
m = re.search(r"font-family:'Maghribi';\s*src:url\('([^']+)'\)", html)
if not m: print('✘ لم أجد @font-face للخطّ المغربيّ في index.html'); sys.exit(1)
path = m.group(1)
print('الخطّ:', path)
for where, pat in [('quranFontFile', "u:'" + path + "'"), ('sw.js', "'./" + path + "'")]:
    src = html if where == 'quranFontFile' else io.open('sw.js', encoding='utf-8').read()
    (ok if pat in src else fail)(f'{where} يُشير إلى الملفّ نفسِه')

# ٢) الاسمُ يحمل بصمةَ المحتوى
raw = open(path, 'rb').read()
h = hashlib.sha1(raw).hexdigest()[:8]
(ok if os.path.basename(path) == f'maghribi-{h}.woff2' else fail)(
    f'اسمُ الملفّ يطابق بصمته (المتوقَّع maghribi-{h}.woff2)')

# النصّ
dump = subprocess.check_output(['node', '-e', r"""
const w={}; global.window=w; require('./wird_warsh.js'); require('./data.js');
const t=w.WIRD_WARSH.a.map(x=>x.t);
for(const v of Object.values(w.AZKAR)) for(const z of v) if(z.warsh) t.push(z.warsh);
process.stdout.write(JSON.stringify(t));"""])
texts = json.loads(dump)
cps = collections.Counter()
for t in texts: cps.update(t)
print(f'النصّ: {len(texts)} مقطعًا (آياتٌ وأذكار)، {sum(cps.values())} محرفًا، {len(cps)} محرفًا مختلفًا')

tt = TTFont(io.BytesIO(raw)); tt.flavor = None
buf = io.BytesIO(); tt.save(buf); ttf = buf.getvalue()
tt = TTFont(io.BytesIO(ttf))
cmap = tt.getBestCmap(); order = tt.getGlyphOrder()

# ٣) التغطية
miss = [f'U+{ord(c):04X}' for c in cps if c not in ' \n' and ord(c) not in cmap]
(ok if not miss else fail)(f'كلُّ محرفٍ له مِحرف' + (f' — مفقود: {miss}' if miss else ''))

# ٤) التنوين المتراكب
for cp, g in [(0x0657, 'bifathatan'), (0x065E, 'bidammatan'), (0x0656, 'bikasratan')]:
    (ok if cmap.get(cp) == g else fail)(
        f'U+{cp:04X} → {cmap.get(cp)} (المطلوب {g}) — {cps.get(chr(cp), 0)} موضعًا')

# ٥) التشكيل
font = hb.Font(hb.Face(hb.Blob(ttf)))
notdef = collections.Counter(); got = collections.Counter(); alefsrc = collections.Counter()
for t in texts:
    b = hb.Buffer(); b.add_str(t); b.guess_segment_properties(); hb.shape(font, b, {})
    infos = b.glyph_infos; cl = sorted({i.cluster for i in infos})
    for inf in infos:
        nxt = [c for c in cl if c > inf.cluster]; seg = t[inf.cluster:(nxt[0] if nxt else len(t))]
        gn = order[inf.codepoint]; got[gn] += 1
        if inf.codepoint == 0: notdef[' '.join(f'U+{ord(c):04X}' for c in seg)] += 1
        if gn == 'alefmhdofwamed':
            alefsrc['U+0670 U+0653' if 'ٰٓ' in seg else ' '.join(f'U+{ord(c):04X}' for c in seg)] += 1
bad_nd = {k: v for k, v in notdef.items() if k != 'U+000A'}
(ok if not bad_nd else fail)(f'لا .notdef في التشكيل (فواصلُ الأسطر {notdef.get("U+000A", 0)} لا تُرسَم أصلًا)'
                             + (f' — {bad_nd}' if bad_nd else ''))
n65e = cps.get('ٞ', 0)
(ok if got['bidammatan'] == n65e else fail)(f'bidammatan بعد التشكيل {got["bidammatan"]} = U+065E في النصّ {n65e}')
stray = {k: v for k, v in alefsrc.items() if k != 'U+0670 U+0653'}
(ok if not stray else fail)(f'alefmhdofwamed لا يَخرج إلّا من ألفٍ خنجريّةٍ ومدّ ({alefsrc.get("U+0670 U+0653", 0)} موضعًا)'
                            + (f' — وخرج من غيرها: {stray}' if stray else ''))

print()
print('>>> صفرُ خطأ ✓' if not errs else f'>>> {len(errs)} خطأ ✘')
sys.exit(1 if errs else 0)
