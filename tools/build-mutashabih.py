# -*- coding: utf-8 -*-
"""يحسب «الآيات المتشابهة في اللفظ» من نصّ المصحف نفسه (حفص وورش كلٌّ بعدّه) ويكتب mutash.js.
   ليست قائمةَ علماء المتشابه اللفظيّ، بل تشابهٌ آليٌّ بعدد مقاطع الكلمات المشتركة؛ ويُصرَّح بذلك في الواجهة.
   الطريقة: هيكلُ الكلمة (بلا تشكيل وبتوحيد الألف والياء والتاء المربوطة)، ثمّ مجموعةُ ثلاثيّات الكلمات المتتالية لكلّ آية.
   تُهمَل الثلاثيّاتُ الشائعة جدًّا (≥ 60 آية). التشابه = المشترَك ÷ الأصغر؛ يُشترط مشتركان فأكثر ونسبةٌ ≥ 0.5."""
import json, re, os, sys, collections
ROOT=os.path.join(os.path.dirname(__file__),'..')
def load(fn,var):
    s=open(os.path.join(ROOT,fn),encoding='utf-8').read()
    s=s[s.index('=')+1:].rstrip().rstrip(';')
    return json.loads(s)
DIA=re.compile('[ؐ-ًؚ-ٰٟۖ-ۭـ]')
def skel(w):
    w=DIA.sub('',w)
    for a,b in (('آ','ا'),('أ','ا'),('إ','ا'),('ٱ','ا'),('ى','ي'),('ة','ه'),('ؤ','و'),('ئ','ي')): w=w.replace(a,b)
    return re.sub('[^ء-ي]','',w)
def build(W):
    verses=[[x for x in (skel(w) for w in v['t'].split()) if x] for v in W['a']]
    grams=[]; idx=collections.defaultdict(list)
    for i,ws in enumerate(verses):
        g={' '.join(ws[k:k+3]) for k in range(len(ws)-2)}
        grams.append(g)
        for x in g: idx[x].append(i)
    common={x for x,l in idx.items() if len(l)>=60}
    out={}
    for i,g in enumerate(grams):
        g2=g-common
        if len(verses[i])<4 or len(g2)<1: continue
        cnt=collections.Counter()
        for x in g2:
            for j in idx[x]:
                if j!=i: cnt[j]+=1
        cand=[]
        for j,c in cnt.items():
            gj=grams[j]-common
            if c>=2 and c/min(len(g2),len(gj))>=0.5:
                sc=c/min(len(g2),len(gj)); cand.append((sc,-abs(j-i),j))
        if cand:
            cand.sort(reverse=True); out[i]=[j for _,_,j in cand[:5]]
    return out
res={}
for key,fn in (('h','wird_hafs.js'),('w','wird_warsh.js')):
    W=load(fn,None); res[key]=build(W); print(key,len(W['a']),'verses →',len(res[key]),'with similar')
open(os.path.join(ROOT,'mutash.js'),'w',encoding='utf-8').write('window.MUTASH='+json.dumps(res,separators=(',',':'))+';')
print(os.path.getsize(os.path.join(ROOT,'mutash.js'))//1024,'KB')
