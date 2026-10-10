# -*- coding: utf-8 -*-
"""يبني trans_fr.js و trans_en.js من ترجمات quranenc.com (مشروع EQE: ترجماتٌ مجّانيّةٌ للتطبيقات) بعدِّ حفص (6236 آية).
   يُحمِّل الأصولَ: tools/build-translations.py <مجلّد فيه french_montada.json و english_saheeh.json>
   يحذف رقمَ الآية في أوّل النصّ وعلاماتِ الحواشي [n] ولا يُغيّر شيئًا غيرَهما."""
import json, re, sys, os
src=sys.argv[1]; root=os.path.join(os.path.dirname(__file__),'..')
for key,var,fn in [('french_montada','QTR_FR','trans_fr.js'),('english_saheeh','QTR_EN','trans_en.js')]:
    d=json.load(open(os.path.join(src,key+'.json'),encoding='utf-8'))
    assert len(d)==6236
    out=[]
    for r in d:
        t=r['translation'].strip()
        t=re.sub(r'^\s*\d+\s*[\.\-–]\s*','',t)       # «1. » في أوّل النصّ
        t=re.sub(r'\s*\[\d+\]','',t)                 # علاماتُ الحواشي
        out.append(re.sub(r'\s+',' ',t).strip())
    open(os.path.join(root,fn),'w',encoding='utf-8').write('window.%s=%s;'%(var,json.dumps(out,ensure_ascii=False,separators=(',',':'))))
    print(fn,len(out),os.path.getsize(os.path.join(root,fn))//1024,'KB'); print('  ',out[0][:90]); print('  ',out[2][:90]); print('  ',out[5][:90])
