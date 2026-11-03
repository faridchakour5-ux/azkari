#!/usr/bin/env python3
"""يولّد qalun.js: روابط تلاوات قالون عن نافع (تونس) من صفحات assabile.com.
كلُّ قارئ: رقم السورة <- رابط mp3 (الرقم من اسم الملف). الاستماع فقط."""
import re, json, subprocess, sys
R=[('qalun-barrak','علي البرّاق','ali-barrak'),
   ('qalun-munir','منير التونسي','abu-abdullah-munir-el-tounsi'),
   ('qalun-gardelli','جوهر القردلي','jawhar-el-gardelli'),
   ('qalun-snina','محمد أبو سنينة','muhamad-abu-snina'),
   ('qalun-kthiri','العربي الكثيري','arbi-kthiri'),
   ('qalun-saadaoui','عبد المانع السعداوي','abdel-manii-al-saadaoui')]
out={}
for id_,name,slug in R:
    h=subprocess.run(['curl','-sL','-m','40','-A','Mozilla/5.0','https://ar.assabile.com/'+slug],capture_output=True,text=True).stdout
    urls=sorted(set(re.findall(r'https://media\.assabile\.com/assabile/recitations_[0-9]+/mp3/([^/"\' ]+)/([^"\' ]+\.mp3)',h)))
    folders={a for a,b in urls}; assert len(folders)==1,(slug,folders)
    f={}
    for a,b in urls:
        m=re.search(r'-(\d{3})-[a-z]',b)
        if m: f[int(m.group(1))]='https://media.assabile.com/assabile/recitations_7892537823/mp3/'+a+'/'+b
    assert len(f)>=35, (slug,len(f))
    out[id_]={'name':name,'files':f}
    print(id_,len(f),'سورة',file=sys.stderr)
js='/* مولَّد بـ tools/build-qalun.py — لا يُعدَّل باليد. قالون عن نافع (مرتّل)، المصدر: assabile.com */\nwindow.QALUN='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
open('qalun.js','w',encoding='utf8').write(js)
