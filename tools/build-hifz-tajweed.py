#!/usr/bin/env python3
"""صلاتي — يبني hifz_tajweed.js: أحكامُ التجويد لرواية حفص حرفًا حرفًا، لتلوين الآية في بطاقة التحفيظ وحدَها
(صفحةُ القرآن لا تُلوَّن أبدًا).

المصدر: نصُّ مصحف المدينة المُعلَّمُ بالتجويد من quran.com (api/v4/quran/verses/uthmani_tajweed).
ولأنّ ترميزَ حركاته يخالف نصَّ التطبيق، نُطابِق على الحروف الأصليّة: كلُّ حرفٍ مع ما يتبعه من علامات «عنقود»،
ويأخذ عنقودُ التطبيق حكمَ العنقود المقابل له في المصدر. فإن اختلف تسلسلُ الحروف في آيةٍ تُركت بلا تلوين.
الصيغة: لكلّ آيةٍ (بترتيب WIRD_HAFS) سلسلةٌ «رقمُ_العنقود:رمزُ_الحكم[+عددُ العناقيد المتتالية]» مفصولةٌ بفواصل؛ والأحكامُ في HZ_TJ.c.

  python3 tools/build-hifz-tajweed.py      (TJ_DIR لمجلّد التخزين المؤقّت، الافتراضيّ /tmp/hifz-tajweed)"""
import difflib, json, os, re, ssl, subprocess, sys, time, urllib.request, concurrent.futures as cf, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TJ = os.environ.get('TJ_DIR', '/tmp/hifz-tajweed'); os.makedirs(TJ, exist_ok=True)
ca = '/root/.ccr/ca-bundle.crt'
ctx = ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()

def fetch(s):
    p = os.path.join(TJ, f'{s}.json')
    if os.path.exists(p): return True
    for t in range(5):
        try:
            rq = urllib.request.Request(f'https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number={s}', headers={'User-Agent': 'Mozilla/5.0 (salatee build)', 'Accept': 'application/json'})
            with urllib.request.urlopen(rq, timeout=40, context=ctx) as f:
                open(p, 'wb').write(f.read()); return True
        except Exception: time.sleep(2 + t)
    return False
with cf.ThreadPoolExecutor(4) as ex:
    if not all(ex.map(fetch, range(1, 115))): sys.exit('✗ تعذّر الجلب')

hafs = json.loads(subprocess.check_output(['node', '-e',
  'global.window={};require(process.argv[1]);const W=window.WIRD_HAFS;'
  'console.log(JSON.stringify({sur:W.sur.map(x=>x.i),a:W.a.map(x=>x.t)}));', os.path.join(ROOT, 'wird_hafs.js')]))

def is_base(ch):
    o = ord(ch)
    return (0x0621 <= o <= 0x063A) or (0x0641 <= o <= 0x064A) or o == 0x0671
def clusters(chars):
    """chars: [(ch, cls)] → [(start_index, cls_or_None)] لكلّ حرفٍ أصليّ مع علاماته"""
    out = []
    for i, (ch, c) in enumerate(chars):
        if is_base(ch): out.append([i, c, ch])
        elif out and c and not out[-1][1]: out[-1][1] = c   # حكمٌ على علامةٍ تابعة (كالمدّ) يُنسب إلى حرفها
    return out
def parse(tj):
    tj = re.sub(r'<span class=end>.*?</span>', '', tj)
    chars, cls = [], None
    for tok in re.split(r'(<[^>]+>)', tj):
        if tok.startswith('<'):
            m = re.match(r'<tajweed class=([a-z_]+)>', tok)
            cls = m.group(1) if m else (None if tok.startswith('</') else cls)
        else:
            for ch in html.unescape(tok): chars.append((ch, cls))
    return chars

CL = []; codes = {}
out = []; bad = 0; total = 0
for s in range(1, 115):
    vv = json.load(open(os.path.join(TJ, f'{s}.json')))['verses']
    st = hafs['sur'][s - 1]; en = hafs['sur'][s] if s < 114 else len(hafs['a'])
    if en - st != len(vv): sys.exit(f'✗ عددُ آيات سورة {s} مختلف')
    for k, v in enumerate(vv):
        total += 1
        app = hafs['a'][st + k]
        src = clusters(parse(v['text_uthmani_tajweed']))
        dst = clusters([(ch, None) for ch in app])
        N = lambda c: 'ي' if c == 'ى' else c          # الياءُ والألفُ المقصورة تتبادلان بين المصدرين
        sa = ''.join(N(x[2]) for x in src); da = ''.join(N(x[2]) for x in dst)
        sm = difflib.SequenceMatcher(None, da, sa, autojunk=False)
        if sm.ratio() < 0.97:
            bad += 1; out.append(''); continue
        runs = []
        for op, i1, i2, j1, j2 in sm.get_opcodes():
            if op != 'equal': continue                       # ما لا يتطابق يبقى بلا تلوين
            for d in range(i2 - i1):
                c = src[j1 + d][1]
                if not c: continue
                if c not in codes: codes[c] = len(CL); CL.append(c)
                j = i1 + d; k = codes[c]
                if runs and runs[-1][1] == k and runs[-1][0] + runs[-1][2] == j: runs[-1][2] += 1
                else: runs.append([j, k, 1])
        runs = [f'{a}:{k}' + (f'+{n}' if n > 1 else '') for a, k, n in runs]
        out.append(','.join(runs))
js = ('/* صلاتي — أحكامُ التجويد (حفص) لتلوين بطاقة التحفيظ وحدَها؛ المصدر quran.com uthmani_tajweed؛ '
      'يُولَّد بـ tools/build-hifz-tajweed.py ولا يُحرَّر يدويًّا */\n'
      'window.HZ_TJ=' + json.dumps({'c': CL, 'v': out}, separators=(',', ':')) + ';\n')
open(os.path.join(ROOT, 'hifz_tajweed.js'), 'w', encoding='utf-8').write(js)
print(f'✓ hifz_tajweed.js {round(len(js.encode())/1024)} KB · آيات مطابقة {total-bad}/{total} · الأحكام: {", ".join(CL)}')
