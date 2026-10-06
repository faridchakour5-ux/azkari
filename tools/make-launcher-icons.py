#!/usr/bin/env python3
"""يولّد كلَّ أيقونات التطبيق من قناعَي الشعار (tools/logo-mask-*.png): كتابةُ «صلاتي» بالزمرّد الداكن على خلفيّةٍ عاجيّة.
   الناتج: icons/{icon-180,icon-192,icon-512,maskable-512}.png (الموقع/PWA/متجر Play)
           native/android-res/mipmap-*/ic_launcher{,_round,_foreground}.png + values/ic_launcher_background.xml (أندرويد).
   لتغيير الألوان عدّل INK وPAPER أدناه ثم شغّله، وأعد بناء الحزمة. """
import os
from PIL import Image, ImageDraw
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INK=(10,84,65)         # زمرّد داكن #0A5441
PAPER=(251,247,232)    # عاجيّ #FBF7E8
def hexs(c): return '#%02X%02X%02X'%c
def logo(maskfile):
    a=Image.open(os.path.join(ROOT,'tools',maskfile)).convert('L')
    return a
def colored(a):
    im=Image.new('RGBA',a.size,INK+(0,)); im.putalpha(a); return im
# ---------- أيقونات الموقع ----------
for mf,outs in (('logo-mask-icon.png',[('icon-512.png',512),('icon-192.png',192),('icon-180.png',180)]),('logo-mask-maskable.png',[('maskable-512.png',512)])):
    a=logo(mf)
    for name,sz in outs:
        base=Image.new('RGBA',(sz,sz),PAPER+(255,)); base.alpha_composite(colored(a).resize((sz,sz),Image.LANCZOS)); base.convert('RGB').save(os.path.join(ROOT,'icons',name),optimize=True)
# ---------- أندرويد ----------
OUT=os.path.join(ROOT,'native','android-res')
g=colored(logo('logo-mask-icon.png')); g=g.crop(g.getbbox())
DENS={'mdpi':1,'hdpi':1.5,'xhdpi':2,'xxhdpi':3,'xxxhdpi':4}
for d,k in DENS.items():
    p=os.path.join(OUT,'mipmap-'+d); os.makedirs(p,exist_ok=True)
    fg=round(108*k); c=Image.new('RGBA',(fg,fg),(0,0,0,0)); w=round(56*k); h=round(g.height*w/g.width)
    c.alpha_composite(g.resize((w,h),Image.LANCZOS),((fg-w)//2,(fg-h)//2)); c.save(os.path.join(p,'ic_launcher_foreground.png'))
    s=round(48*k); base=Image.new('RGBA',(s,s),PAPER+(255,)); w=round(s*0.72); h=round(g.height*w/g.width)
    base.alpha_composite(g.resize((w,h),Image.LANCZOS),((s-w)//2,(s-h)//2)); base.save(os.path.join(p,'ic_launcher.png'))
    m=Image.new('L',(s*4,s*4),0); ImageDraw.Draw(m).ellipse((0,0,s*4-1,s*4-1),fill=255); m=m.resize((s,s),Image.LANCZOS)
    r=Image.new('RGBA',(s,s),(0,0,0,0)); r.paste(base,(0,0),m); r.save(os.path.join(p,'ic_launcher_round.png'))
v=os.path.join(OUT,'values'); os.makedirs(v,exist_ok=True)
open(os.path.join(v,'ic_launcher_background.xml'),'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">%s</color>\n</resources>\n'%hexs(PAPER))
print('✓ الأيقونات: حبر',hexs(INK),'على',hexs(PAPER))
