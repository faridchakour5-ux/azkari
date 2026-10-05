#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
يبني sunna.js — الأحاديثُ الصحيحة والسيرةُ النبويّة لصفحة الفقه.

    HADITH_DB=/path/to/dir  python3 tools/build-sunna.py

القاعدةُ التي لا تُكسر: نصُّ كلِّ حديثٍ يُؤخذ من الصحيحين نفسِهما، لا من الذاكرة.
  • قاعدةُ النصوص: github.com/AhmedBaset/hadith-json ، الملفّان
      db/by_book/the_9_books/bukhari.json  و  muslim.json  ضعْهما في $HADITH_DB.
    لا يُرفعان إلى المستودع (٢٤ ميغابايت).
  • يُبحث عن الحديث بمفتاحٍ من لفظه؛ فإن لم يوجد يفشل البناءُ ولا يُكتب بديلٌ.
  • الراوي (الصحابيّ) يُتحقَّق من وروده في سند الرواية؛ وإلّا فشل البناء.
  • التخريج (البخاريّ/مسلم + اسمُ الكتاب) يُحسب من الروايات التي وُجدت فعلًا، ولا يُكتب
    «متّفقٌ عليه» إلّا إذا وُجد اللفظُ في الكتابين.
  • نصُّ الآيات من wird_hafs.js (مصحف المدينة، حفص) بالسورة والآية.
  • الشرحُ المختصَر ونصوصُ السيرة مكتوبةٌ باليد (tools/sunna-data.py) ومرجعُها كتبُ السيرة
    المعتمدة، وقد نُبِّه على الخلاف حيث وقع.
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.environ.get('HADITH_DB')
if not DB or not os.path.exists(os.path.join(DB, 'bukhari.json')):
    sys.exit('ضع bukhari.json وmuslim.json في مجلّدٍ وأشِر إليه بالمتغيّر HADITH_DB')

def norm(s):
    s = re.sub(r'[ؐ-ًؚ-ٰٟۖ-ۭـ‏]', '', s)
    for a, b in (('أ', 'ا'), ('إ', 'ا'), ('آ', 'ا'), ('ى', 'ي'), ('ة', 'ه'), ('ٱ', 'ا')):
        s = s.replace(a, b)
    return re.sub(r'\s+', ' ', s).strip()

BOOKS = {}
for fn, name in (('bukhari', 'البخاري'), ('muslim', 'مسلم')):
    d = json.load(open(os.path.join(DB, fn + '.json'), encoding='utf-8'))
    ch = {c['id']: c['arabic'] for c in d['chapters']}
    for h in d['hadiths']:
        h['_n'] = norm(h['arabic']); h['_ch'] = ch.get(h['chapterId'], '')
    BOOKS[name] = d['hadiths']

def clean(t):
    return re.sub(r'\s+', ' ', t.replace('‏', '')).strip()

def tidy(t):
    """ترتيبُ علامات الترقيم فقط — لا يمسّ حرفًا من اللفظ."""
    t = re.sub(r'\{\s*', '﴿', t); t = re.sub(r'\s*\}', '﴾', t)
    t = re.sub(r'\s+([\.،:؟])', r'\1', t)
    return re.sub(r'\s+', ' ', t).strip().rstrip('،')

def plain(t):
    """اسمُ الكتاب بلا تشكيل"""
    return re.sub(r'[\u064B-\u065F\u0670]', '', t)

def hits(key):
    k = norm(key)
    return [(b, h) for b in ('البخاري', 'مسلم') for h in BOOKS[b] if k in h['_n']]

def matn(h):
    """كلامُ النبيّ ﷺ من أوّل علامة تنصيصٍ إلى آخرها؛ وما قاله الراوي بينهما يُوضع بين قوسين."""
    parts = h['arabic'].replace('‏', '').split('"')
    if len(parts) < 3: return None
    inner = parts[1:-1] if len(parts) % 2 == 1 else parts[1:-2] + [parts[-2]]
    out = []
    for i, p in enumerate(inner):
        p = clean(p)
        if not p: continue
        out.append(p if i % 2 == 0 else '(' + p.strip(' .،') + ')')
    s = re.sub(r'\s+([\.،:])', r'\1', ' '.join(out))
    return s.strip()

def words_slice(h, start, end):
    """مقتطفٌ متّصلٌ من نصّ الرواية بين عبارتين، يشمل ما بينهما كاملًا."""
    toks = clean(h['arabic']).split(' ')
    nt = [norm(x) for x in toks]
    sw, ew = norm(start).split(' '), norm(end).split(' ')
    def find(seq, frm=0):
        for i in range(frm, len(nt) - len(seq) + 1):
            if nt[i:i + len(seq)] == seq: return i
        return -1
    i = find(sw)
    if i < 0: sys.exit('لم أجد بداية المقتطف: ' + start)
    j = find(ew, i)
    if j < 0: sys.exit('لم أجد نهاية المقتطف: ' + end)
    return ' '.join(toks[i:j + len(ew)]).replace('"', '').strip()

def takhrij(key, frag=None, pick=None):
    """التخريج يُحسب من الروايات التي فيها اللفظُ وفي سندها الصحابيُّ المذكور نفسُه."""
    hs = hits(key)
    if pick: hs = [x for x in hs if x[0] == pick]
    if frag: hs = [x for x in hs if norm(frag) in x[1]['_n'][:900]]
    if not hs: sys.exit('لم أجد الحديث بشرطه (الراوي/الكتاب) في الصحيحين: ' + key)
    per = {}
    for b, h in hs:
        per.setdefault(b, [])
        if h['_ch'] not in per[b]: per[b].append(h['_ch'])
    names = [b + ' (' + ' · '.join(plain(c) for c in per[b][:2]) + ')' for b in ('البخاري', 'مسلم') if b in per]
    both = len(per) == 2
    return hs, (('متّفقٌ عليه — ' + ' ، '.join(names)) if both else ('رواه ' + names[0]))

def _node(js, arg):
    return json.loads(subprocess.check_output(['node', '-e', js, arg], cwd=ROOT).decode())

SURA_NAMES = _node(r"""const w={}; global.window=w; require('./wird_hafs.js');
process.stdout.write(JSON.stringify(w.WIRD_HAFS.sur.map(x=>x.n)));""", '')

def ayat(refs):
    return _node(r"""const w={}; global.window=w; require('./wird_hafs.js'); const H=w.WIRD_HAFS;
process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]).map(([s,k])=>H.a[H.sur[s-1].i+k-1].t)));""",
                 json.dumps([list(r) for r in refs]))

def AYA(title, refs, note=None):
    """كتلةُ آيات: نصُّ المصحف + «سورة كذا، الآية n»"""
    groups = []
    for s, k in refs:
        if groups and groups[-1][0] == s and groups[-1][2] == k - 1: groups[-1][2] = k
        else: groups.append([s, k, k])
    ref = ' · '.join(('سورة %s، الآية %d' % (SURA_NAMES[s - 1].replace('َ', '').replace('ِ', ''), a)) if a == b
                     else ('سورة %s، الآيات %d–%d' % (SURA_NAMES[s - 1].replace('َ', '').replace('ِ', ''), a, b)) for s, a, b in groups)
    ref = ref.translate(str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩'))
    blk = {'k': 'aya', 't': title, 'v': ' '.join(ayat(refs)), 's': ref}
    if note: blk['d'] = note
    return blk

def HD(title, key, who, shar7, start=None, end=None, pick=None):
    """كتلةُ حديث: نصُّه من الصحيحين + شرحٌ مختصَر + المصدر.
    who = (الاسم بحالة الجرّ، جزءٌ من الاسم يجب أن يرد في السند، «عنه/عنها/عنهما» اختياري)"""
    hs, tk = takhrij(key, who[1], pick)
    b, h = hs[0]
    text = words_slice(h, start, end) if start else (matn(h) or sys.exit('لا نصَّ بين علامات التنصيص: ' + key))
    suf = who[2] if len(who) > 2 else 'عنه'
    text = text.replace('صلى الله عليه وسلم', 'ﷺ')
    return {'k': 'wasiyya', 't': title, 'v': '«' + tidy(text) + '»', 'd': shar7,
            's': tk + '. عن ' + who[0] + ' رضي الله ' + suf + '.'}

G = dict(globals())
exec(compile(open(os.path.join(ROOT, 'tools', 'sunna-data.py'), encoding='utf-8').read(), 'sunna-data.py', 'exec'), G)

out = {'cats': G['CATS'], 'entries': G['ENTRIES'], 'src': G['SRC']}
js = ('/* صلاتي — الأحاديثُ الصحيحة والسيرةُ النبويّة (يُولَّد بـ tools/build-sunna.py — لا يُحرَّر يدويًّا)\n'
      '   نصوصُ الأحاديث مأخوذةٌ من الصحيحين نصًّا، ونصوصُ الآيات من مصحف المدينة (حفص). */\n'
      'window.FIQH_CATS_EXTRA = ' + json.dumps(out['cats'], ensure_ascii=False) + ';\n'
      'window.FIQH_EXTRA = ' + json.dumps(out['entries'], ensure_ascii=False, indent=0) + ';\n'
      'window.FIQH_SRC = Object.assign(window.FIQH_SRC||{}, ' + json.dumps(out['src'], ensure_ascii=False) + ');\n')
open(os.path.join(ROOT, 'sunna.js'), 'w', encoding='utf-8').write(js)
n_h = sum(1 for e in out['entries'] for b in e['blocks'] if b['k'] == 'wasiyya')
print('sunna.js: %d بابًا، %d حديثًا، %d كيلوبايت' % (len(out['entries']), n_h, len(js.encode()) // 1024))
