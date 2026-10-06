#!/usr/bin/env python3
"""يولّد أيقونات إطلاق أندرويد (mipmap) من شعار التطبيق icons/icon-512.png — نفس الشعار المرفوع في Play Console.
   الناتج: native/android-res/mipmap-*/ic_launcher{,_round,_foreground}.png + values/ic_launcher_background.xml (أبيض).
   يستعملها native/apply-android.js فيستبدل بها أيقونةَ Capacitor الافتراضيّة. شغّله بعد تغيير الشعار. """
import os
from PIL import Image, ImageDraw
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'native','android-res')
src=Image.open(os.path.join(ROOT,'icons','icon-512.png')).convert('RGB')
GREEN=(47,158,68)
# شعارٌ بخلفيّةٍ شفّافة: الشفافيّة من بُعد اللون عن الأبيض
a=src.split()[0].point(lambda v:max(0,min(255,int((255-v)*255/(255-GREEN[0])))))
logo=Image.new('RGBA',src.size,GREEN+(0,)); logo.putalpha(a)
logo=logo.crop(logo.getbbox())
DENS={'mdpi':1,'hdpi':1.5,'xhdpi':2,'xxhdpi':3,'xxxhdpi':4}
for d,k in DENS.items():
    p=os.path.join(OUT,'mipmap-'+d); os.makedirs(p,exist_ok=True)
    # الطبقة الأمامية للأيقونة المتكيّفة: 108dp، والشعارُ داخل المنطقة الآمنة (عرضه 56dp من 66)
    fg=round(108*k); c=Image.new('RGBA',(fg,fg),(0,0,0,0)); w=round(56*k); h=round(logo.height*w/logo.width)
    c.alpha_composite(logo.resize((w,h),Image.LANCZOS),((fg-w)//2,(fg-h)//2)); c.save(os.path.join(p,'ic_launcher_foreground.png'))
    # الأيقونة القديمة (أندرويد < 8): 48dp، مربّعةٌ ودائريّة
    s=round(48*k); base=Image.new('RGBA',(s,s),(255,255,255,255)); w=round(s*0.72); h=round(logo.height*w/logo.width)
    base.alpha_composite(logo.resize((w,h),Image.LANCZOS),((s-w)//2,(s-h)//2)); base.save(os.path.join(p,'ic_launcher.png'))
    m=Image.new('L',(s*4,s*4),0); ImageDraw.Draw(m).ellipse((0,0,s*4-1,s*4-1),fill=255); m=m.resize((s,s),Image.LANCZOS)
    r=Image.new('RGBA',(s,s),(0,0,0,0)); r.paste(base,(0,0),m); r.save(os.path.join(p,'ic_launcher_round.png'))
v=os.path.join(OUT,'values'); os.makedirs(v,exist_ok=True)
open(os.path.join(v,'ic_launcher_background.xml'),'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n')
print('✓ أيقونات الإطلاق في',OUT)
