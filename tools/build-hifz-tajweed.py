#!/usr/bin/env python3
"""صلاتي — يبني hifz_tajweed.js: أحكامُ التجويد لرواية حفص حرفًا حرفًا، لتلوين الآية في بطاقة التحفيظ وحدَها
(صفحةُ القرآن لا تُلوَّن أبدًا).

المصدر: Quran Tajweed (quran.ws) — @quran.ws/tajwid-annotations و@quran.ws/tajwid-rules (CC BY 4.0، حقوقُ التجميع Quranpedia؛
القواعدُ من tajweed.quranpedia.net ومراجَعةٌ من مختصّين بحسب المشروع). الإزاحاتُ (start,end) مقيسةٌ بنقاط الترميز على نصّ
editions/uthmani-hafs.json من المستودع، وهو يطابق نصَّ التطبيق (wird_hafs.js) إلّا في فراغٍ بعد علامة ۞.
نُسقِط عنقودَ كلّ حرفٍ (الحرفُ الأصليّ وعلاماتُه) على العنقود المقابل في نصّ التطبيق.
الصيغة: لكلّ آيةٍ (بترتيب WIRD_HAFS) سلسلةٌ «رقمُ_العنقود:رمزُ_الحكم[+عددُ العناقيد المتتالية]» مفصولةٌ بفواصل؛ والأحكامُ في HZ_TJ.c.

  python3 tools/build-hifz-tajweed.py      (TJ_DIR لمجلّد التخزين المؤقّت، الافتراضيّ /tmp/hifz-tajweed2)"""
import glob, json, os, subprocess, sys, tarfile, urllib.request, ssl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TJ = os.environ.get('TJ_DIR', '/tmp/hifz-tajweed2'); os.makedirs(TJ, exist_ok=True)
ca = '/root/.ccr/ca-bundle.crt'
ctx = ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()

def need(path, fn):
    if not os.path.exists(path): fn()
def npm(pkg):
    subprocess.check_call(['npm', 'pack', pkg, '--pack-destination', TJ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=TJ)
    for t in glob.glob(os.path.join(TJ, '*' + pkg.split('/')[1] + '-*.tgz')):
        tarfile.open(t).extractall(os.path.join(TJ, pkg.split('/')[1]))
need(os.path.join(TJ, 'tajwid-annotations/package/uthmani-hafs.json'), lambda: npm('@quran.ws/tajwid-annotations'))
need(os.path.join(TJ, 'tajwid-rules/package/rules.json'), lambda: npm('@quran.ws/tajwid-rules'))
edp = os.path.join(TJ, 'edition.json')
need(edp, lambda: open(edp, 'wb').write(urllib.request.urlopen('https://raw.githubusercontent.com/quran-ws/quran-tajweed/main/editions/uthmani-hafs.json', timeout=60, context=ctx).read()))
A = json.load(open(os.path.join(TJ, 'tajwid-annotations/package/uthmani-hafs.json')))
R = json.load(open(os.path.join(TJ, 'tajwid-rules/package/rules.json')))
ED = json.load(open(edp))['ayahs']
rule_hukum = {x['id']: x['hukum'] for x in R['rules']}

# حُكمٌ في المصدر ← فئةُ اللون (الترتيبُ = الأولويّة عند تداخل حكمين على الحرف نفسِه)
GROUPS = [
  ('qalqalah',   ['qalqalah-sughra', 'qalqalah-kubra', 'qalqalah-mutatarrifa']),
  ('iqlab',      ['iqlab-noon', 'iqlab-tanween']),
  ('idgham_gh',  ['idgham-bi-ghunnah-noon', 'idgham-bi-ghunnah-tanween']),
  ('idgham_no',  ['idgham-bila-ghunnah-noon', 'idgham-bila-ghunnah-tanween']),
  ('idgham_sh',  ['idgham-shafawi-meem']),
  ('idgham_mt',  ['mutamathilain-idgham-kamil', 'mutajanisain-idgham-naqis']),
  ('ikhfa_sh',   ['ikhfa-shafawi-meem', 'mutajanisain-ikhfa-shafawi']),
  ('ikhfa',      ['ikhfa-haqiqi-noon', 'ikhfa-haqiqi-tanween', 'ikhfa-ghunnah-tarqeeq', 'ikhfa-ghunnah-tafkheem']),
  ('ghunnah',    ['noon-mushaddadah', 'meem-mushaddadah']),
  ('madd_lazim', ['madd-lazim-kalimi-muthaqqal', 'madd-lazim-kalimi-mukhaffaf', 'madd-lazim-harfi']),
  ('madd_wajib', ['madd-muttasil']),
  ('madd_jaiz',  ['madd-munfasil']),
  ('madd_tabii', ['madd-tabee-kalimi', 'madd-iwad', 'madd-silah-sughra', 'madd-badal']),
]
H2G = {h: g for g, hs in GROUPS for h in hs}
ORDER = [g for g, _ in GROUPS]

hafs = json.loads(subprocess.check_output(['node', '-e',
  'global.window={};require(process.argv[1]);const W=window.WIRD_HAFS;'
  'console.log(JSON.stringify({sur:W.sur.map(x=>x.i),a:W.a.map(x=>x.t)}));', os.path.join(ROOT, 'wird_hafs.js')]))

def is_base(ch):
    o = ord(ch); return (0x0621 <= o <= 0x063A) or (0x0641 <= o <= 0x064A) or o == 0x0671
norm = lambda t: t.replace(' ', ' ')
out = []; bad = 0; total = 0; used = {}
for s in range(1, 115):
    st = hafs['sur'][s - 1]; en = hafs['sur'][s] if s < 114 else len(hafs['a'])
    for k in range(1, en - st + 1):
        total += 1
        app = norm(hafs['a'][st + k - 1]); ed = norm(ED[f'{s}:{k}'])
        if app != ed: bad += 1; out.append(''); continue
        cl = []                                    # فهرسُ العنقود لكلّ نقطة ترميز
        ci = -1
        for ch in ed:
            if is_base(ch): ci += 1
            cl.append(max(ci, 0) if ci >= 0 else None)
        best = {}                                  # عنقود ← فهرسُ أولويّة
        for a, b, ri in A['spans'].get(f'{s}:{k}', []):
            g = H2G.get(rule_hukum[A['ruleIds'][ri]])
            if g is None: continue
            pr = ORDER.index(g)
            cs = []                                  # عناقيدُ النمط بالترتيب (من غير تكرار)
            for pos in range(a, min(b, len(cl))):
                if cl[pos] is not None and (not cs or cs[-1] != cl[pos]): cs.append(cl[pos])
            if not cs: continue
            # النمطُ يضمّ سياقَه (حرفًا قبل المدّ أو بعده)؛ فنلوّن الحرفَ المقصودَ فقط، كما في المصاحف الملوَّنة
            if g in ('qalqalah', 'madd_lazim'): cs = cs[:1]
            elif g in ('madd_wajib', 'madd_jaiz'): cs = cs[1:2] or cs[:1]
            elif g == 'madd_tabii': cs = cs[-1:]
            for c in cs:
                if c not in best or pr < best[c]: best[c] = pr
        runs = []
        for c in sorted(best):
            g = best[c]; used[ORDER[g]] = used.get(ORDER[g], 0) + 1
            if runs and runs[-1][1] == g and runs[-1][0] + runs[-1][2] == c: runs[-1][2] += 1
            else: runs.append([c, g, 1])
        out.append(','.join(f'{a}:{g}' + (f'+{n}' if n > 1 else '') for a, g, n in runs))
js = ('/* صلاتي — أحكامُ التجويد (حفص) لتلوين بطاقة التحفيظ وحدَها. المصدر: Quran Tajweed (quran.ws) © Quranpedia، رخصة CC BY 4.0؛ '
      'يُولَّد بـ tools/build-hifz-tajweed.py ولا يُحرَّر يدويًّا */\n'
      'window.HZ_TJ=' + json.dumps({'c': ORDER, 'v': out}, separators=(',', ':')) + ';\n')
open(os.path.join(ROOT, 'hifz_tajweed.js'), 'w', encoding='utf-8').write(js)
print(f'✓ hifz_tajweed.js {round(len(js.encode())/1024)} KB · آيات مطابقة {total-bad}/{total}')
print('  عناقيدُ ملوَّنة:', {g: used.get(g, 0) for g in ORDER})
