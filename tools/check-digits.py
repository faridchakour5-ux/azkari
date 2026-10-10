#!/usr/bin/env python3
"""قاعدةٌ ثابتة: كلُّ الأرقام في التطبيق لاتينيّة 0123456789 — لا هنديّة ٠١٢٣٤٥٦٧٨٩ ولا فارسيّة ۰۱۲۳۴۵۶۷۸۹.
   يفحص ملفّاتِ التطبيق ويفشل إن وجد رقمًا غيرَ لاتينيّ (يُستدعى من tools/release-aab.sh)."""
import re, sys, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES=['index.html','tools.js','i18n_core.js','i18n_fr.js','i18n_en.js','credits.html','mutash.js','privacy.html','quiz.js','fiqh.js','sunna.js','fadl.js','sharh.js','thabat.js','wasaya.js','data.js','tafsir.js','manifest.json','wird_hafs.js','wird_warsh.js']
bad=0
for f in FILES:
    p=os.path.join(ROOT,f)
    if not os.path.exists(p): continue
    s=open(p,encoding='utf8').read()
    for m in re.finditer(r'[٠-٩۰-۹]',s):
        line=s.count('\n',0,m.start())+1; print(f'✗ رقمٌ غير لاتينيّ في {f}:{line}: {s[max(0,m.start()-25):m.end()+15]!r}'); bad+=1
        if bad>15: sys.exit(1)
sys.exit(1 if bad else 0)
