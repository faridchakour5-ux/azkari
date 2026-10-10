# -*- coding: utf-8 -*-
"""يبني tajweed.js: تلوينُ التجويد لرواية حفص من بياناتٍ مفتوحة (cpfair/quran-tajweed، رخصة CC BY 4.0) على نصّنا (مجمّع الملك فهد).
   المُدخلات (تُحمَّل خارج المستودع):
     python3 tools/build-tajweed.py <tajweed.hafs.uthmani-pause-sajdah.json> <نصّ تنزيل uthmani txt-2>
   الطريقة:
    ١) فهارسُ التعليقات في بيانات المشروع تشير إلى نقاط ترميزِ نصّ تنزيل (وفيه البسملةُ أمام أوّل آيةٍ من كلّ سورة عدا الفاتحة والتوبة).
    ٢) نحوّلها إلى «رقم الحرف» (حرفٌ بعلاماته؛ الألفُ الخنجريّة حرفٌ؛ الفراغُ و۞ ليسا حرفًا) فنُسقِطها على نصّنا حرفًا بحرف.
    ٣) لا نُلوِّن آيةً إلا إن تحقّق أمران: (أ) سلامةُ التعليقات على نصّ تنزيل (قلقلةٌ على قطبجد، وصلٌ على ٱ، لامٌ شمسيّة على ل، غنّةٌ على ن/م)،
       و(ب) تطابقُ متتاليةِ الحروف بين نصّنا ونصّ تنزيل بعد توحيدِ الألف والياء. وما سوى ذلك يُترَك بلا تلوين."""
import json, sys, os, re, unicodedata, collections
ROOT=os.path.join(os.path.dirname(__file__),'..')
tj=json.load(open(sys.argv[1],encoding='utf-8'))
tv={}
for l in open(sys.argv[2],encoding='utf-8'):
    p=l.rstrip('\n').split('|')
    if len(p)>=3 and p[0].isdigit(): tv[(int(p[0]),int(p[1]))]=p[2]
s=open(os.path.join(ROOT,'wird_hafs.js'),encoding='utf-8').read(); W=json.loads(s[s.index('=')+1:].rstrip().rstrip(';'))
GAP=set('  ۞۩')
def isunit(c): return c not in GAP and (c=='ٰ' or not unicodedata.category(c).startswith('M'))
def norm(c): return {'ى':'ي','أ':'ا','إ':'ا','آ':'ا','ٱ':'ا'}.get(c,c)
def unit_starts(t): return [i for i,c in enumerate(t) if isunit(c)]
def unit_of(st,off):
    lo,hi=0,len(st)-1
    while lo<hi:
        m=(lo+hi+1)//2
        if st[m]<=off: lo=m
        else: hi=m-1
    return lo
def sane(rule,seg):
    base=[c for c in seg if isunit(c)]
    if rule=='qalqalah': return bool(base) and base[0] in 'قطبجد'
    if rule=='hamzat_wasl': return 'ٱ' in seg
    if rule=='lam_shamsiyyah': return bool(base) and base[0]=='ل'
    if rule=='ghunnah': return bool(base) and base[0] in 'نم'
    return True
CLS={'ghunnah':'g','idghaam_ghunnah':'g','idghaam_shafawi':'g','ikhfa':'k','ikhfa_shafawi':'k','idghaam_no_ghunnah':'n','idghaam_mutajanisayn':'n','idghaam_mutaqaribayn':'n',
     'iqlab':'i','qalqalah':'q','madd_2':'m','madd_246':'m','madd_munfasil':'p','madd_muttasil':'p','madd_6':'l','silent':'s','hamzat_wasl':'s','lam_shamsiyyah':'s'}
PRIO='lpmgknis' ; PRIO+='q'                      # الأعلى أوّلًا: مدٌّ لازم/متّصل/طبيعيّ ثم الغنّة والإخفاء والإدغام والإقلاب والقلقلة ثم الصامت
PR={c:i for i,c in enumerate('lpmgkniqs')}
BASM=tv[(1,1)]+' '
keys=[]
for si,su in enumerate(W['sur']):
    end=W['sur'][si+1]['i'] if si+1<len(W['sur']) else len(W['a'])
    for k in range(su['i'],end): keys.append((si+1,k-su['i']+1))
ann={(e['surah'],e['ayah']):e['annotations'] for e in tj}
out={}; stat=collections.Counter()
for ai,(sn,an) in enumerate(keys):
    t=tv[(sn,an)]; A=ann[(sn,an)]
    best=None
    for d in (0,1,-1,2,-2,3,-3):
        if all(0<=a['start']+d and a['end']+d<=len(t) and sane(a['rule'],t[a['start']+d:a['end']+d]) for a in A): best=d; break
    if best is None: stat['bad-annotations']+=1; continue
    pre=0
    if an==1 and sn not in (1,9) and t.startswith(BASM): pre=len(BASM)
    t2=t[pre:]
    ours=W['a'][ai]['t']
    ou=[norm(c) for c in ours if isunit(c)]; tu=[norm(c) for c in t2 if isunit(c)]
    if ou!=tu: stat['text-mismatch']+=1; continue
    st=unit_starts(t2); n=len(st); cls=[None]*n
    for a in A:
        s0=a['start']+best-pre; e0=a['end']+best-pre
        if e0<=0 or s0>=len(t2)+0: continue
        s0=max(0,s0); u0=unit_of(st,s0); u1=unit_of(st,max(s0,e0-1))
        c=CLS[a['rule']]
        for u in range(u0,u1+1):
            if cls[u] is None or PR[c]<PR[cls[u]]: cls[u]=c
    # ترميزُ التتابعات: «حرفٌ + بدايةٌ + طول»
    runs=[]; u=0
    while u<n:
        if cls[u] is None: u+=1; continue
        v=u
        while v+1<n and cls[v+1]==cls[u]: v+=1
        runs.append('%s%d,%d'%(cls[u],u,v-u+1)); u=v+1
    out[ai]=';'.join(runs); stat['ok']+=1
print(dict(stat),'→ coverage %.1f%%'%(100*stat['ok']/len(keys)))
open(os.path.join(ROOT,'tajweed.js'),'w',encoding='utf-8').write('window.TJ='+json.dumps(out,separators=(',',':'))+';')
print(os.path.getsize(os.path.join(ROOT,'tajweed.js'))//1024,'KB')
