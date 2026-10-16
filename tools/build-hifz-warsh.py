#!/usr/bin/env python3
"""صلاتي — يبني hifz_warsh.js: توقيتُ كلّ آيةٍ في تلاواتٍ كاملةٍ بورش (mp3quran)، ليعمل التحفيظُ بورش آيةً آية.

  python3 tools/build-hifz-warsh.py            # يجلب التوقيتات من mp3quran ثم يكتب hifz_warsh.js
  WT_DIR=/مجلّد/مؤقّت python3 tools/build-hifz-warsh.py   # يحفظ الملفّات الخام هناك (أو يعيد استعمالها)

لا يُكتب قارئٌ إلا إذا طابقت آياتُه ترقيمَ مصحف ورش في التطبيق (wird_warsh.js) في السور الـ114 كلّها،
وكان التوقيتُ متزايدًا بلا تداخل. الصيغة: لكلّ سورةٍ أزواجُ «فجوة:مدّة» بوحدة 10 ملّي‑ثانية، تفصلها فواصل،
والسورُ تفصلها «|». البدايةُ = نهايةُ الآية السابقة + الفجوة (والآيةُ الأولى من 0)."""
import json, os, re, ssl, subprocess, sys, time, urllib.request, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WT = os.environ.get('WT_DIR', '/tmp/hifz-warsh-timing')
os.makedirs(WT, exist_ok=True)
# المعرّف في mp3quran ← (المعرّف في التطبيق، الاسم، مجلّد الصوت)
READS = {
  80:  ('qazabri', 'عمر القزابري',            'https://cdn.mp3quran.net/audio/omar-kazabri/r1/'),
  16:  ('koshi',   'العيون الكوشي',           'https://cdn.mp3quran.net/audio/laayoun-kouchi/r1/'),
  14:  ('yassin',  'ياسين الجزائري',          'https://cdn.mp3quran.net/audio/yassen-jazairi/r1/'),
  120: ('husaryw', 'محمود خليل الحصري (ورش)', 'https://cdn.mp3quran.net/audio/mahmoud-husary/r3/'),
}
ca = '/root/.ccr/ca-bundle.crt'
ctx = ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()

def fetch(rs):
    r, s = rs
    p = os.path.join(WT, f'{r}_{s}.json')
    if os.path.exists(p): return True
    for t in range(5):
        try:
            with urllib.request.urlopen(f'https://www.mp3quran.net/api/v3/ayat_timing?surah={s}&read={r}', timeout=40, context=ctx) as f:
                d = json.load(f)
            json.dump([[x['ayah'], x['start_time'], x['end_time']] for x in d], open(p, 'w'))
            return True
        except Exception:
            time.sleep(2 + t)
    return False

jobs = [(r, s) for r in READS for s in range(1, 115)]
with cf.ThreadPoolExecutor(8) as ex:
    if not all(ex.map(fetch, jobs)): sys.exit('✗ تعذّر جلبُ بعض التوقيتات')

counts = json.loads(subprocess.check_output(['node', '-e',
  'global.window={};require(process.argv[1]);const W=window.WIRD_WARSH;const o=[];'
  'for(let k=0;k<114;k++){const e=k<113?W.sur[k+1].i:W.a.length;o.push(e-W.sur[k].i);}console.log(JSON.stringify(o));',
  os.path.join(ROOT, 'wird_warsh.js')]))

out = {}
for r, (rid, name, folder) in READS.items():
    sur = []
    for s in range(1, 115):
        d = json.load(open(os.path.join(WT, f'{r}_{s}.json')))
        n = counts[s - 1]
        if [x[0] for x in d] != list(range(1, n + 1)): sys.exit(f'✗ {name}: ترقيمُ سورة {s} لا يطابق ورش ({len(d)} ≠ {n})')
        prev, parts = 0, []
        for _, a, b in d:
            a, b = round(a / 10), round(b / 10)
            if b <= a or a < prev - 5: sys.exit(f'✗ {name}: توقيتٌ غير متزايد في سورة {s}')
            parts.append(f'{max(0, a - prev)}:{b - a}'); prev = b
        sur.append(','.join(parts))
    out[rid] = {'name': name, 'folder': folder, 't': '|'.join(sur)}

js = ('/* صلاتي — توقيتُ آيات التلاوة بورش (من mp3quran.net/api/v3/ayat_timing)؛ يُولَّد بـ tools/build-hifz-warsh.py ولا يُحرَّر يدويًّا */\n'
      'window.HZ_WT=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(os.path.join(ROOT, 'hifz_warsh.js'), 'w', encoding='utf-8').write(js)
print('✓ hifz_warsh.js', round(len(js.encode()) / 1024), 'KB ·', ', '.join(v['name'] for v in out.values()))
