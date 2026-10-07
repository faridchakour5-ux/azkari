#!/usr/bin/env python3
"""يولّد كلَّ أيقونات التطبيق من الشعار المتّجهيّ tools/logo-glyph.svg (كتابةُ «صلاتي» — منحنيّاتٌ بلا دقّةٍ محدودة،
   فتخرج حادّةً بأيّ حجم) بالزمرّد الداكن على خلفيّةٍ بيضاء فاتحة.
   الناتج: icons/{icon-180,icon-192,icon-512,icon-1024,maskable-512}.png و icons/logo.svg (الموقع/PWA/متجر Play)
           native/android-res/mipmap-*/ic_launcher{,_round,_foreground}.png + values/ic_launcher_background.xml (أندرويد).
   لتغيير الألوان عدّل INK وPAPER أدناه ثمّ شغّله، وأعد بناء الحزمة. يحتاج: pip install cairosvg pillow """
import io, os, re
import cairosvg
from PIL import Image, ImageDraw
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INK=(10,84,65)         # زمرّد داكن #0A5441
PAPER=(255,255,255)    # أبيض فاتح #FFFFFF
def hexs(c): return '#%02X%02X%02X'%c
SVG=open(os.path.join(ROOT,'tools','logo-glyph.svg'),encoding='utf8').read().replace('fill="#000"','fill="%s"'%hexs(INK))
def glyph(width):
    """الشعارُ بعرض width بكسل على خلفيّةٍ شفّافة (يُرسَم من المتّجه مباشرةً لا من صورةٍ مُكبَّرة)"""
    png=cairosvg.svg2png(bytestring=SVG.encode(),output_width=max(1,round(width)))
    return Image.open(io.BytesIO(png)).convert('RGBA')
def on_paper(size, frac):
    base=Image.new('RGBA',(size,size),PAPER+(255,)); g=glyph(size*frac)
    base.alpha_composite(g,((size-g.width)//2,(size-g.height)//2)); return base
# ---------- أيقونات الموقع ----------
for name,size,frac in (('icon-1024.png',1024,.584),('icon-512.png',512,.584),('icon-192.png',192,.584),('icon-180.png',180,.584),('maskable-512.png',512,.482)):
    on_paper(size,frac).convert('RGB').save(os.path.join(ROOT,'icons',name),optimize=True)
open(os.path.join(ROOT,'icons','logo.svg'),'w',encoding='utf8').write(SVG)
# ---------- أندرويد ----------
OUT=os.path.join(ROOT,'native','android-res')
DENS={'mdpi':1,'hdpi':1.5,'xhdpi':2,'xxhdpi':3,'xxxhdpi':4}
for d,k in DENS.items():
    p=os.path.join(OUT,'mipmap-'+d); os.makedirs(p,exist_ok=True)
    fg=round(108*k); c=Image.new('RGBA',(fg,fg),(0,0,0,0)); g=glyph(56*k)          # الطبقة الأمامية للأيقونة المتكيّفة
    c.alpha_composite(g,((fg-g.width)//2,(fg-g.height)//2)); c.save(os.path.join(p,'ic_launcher_foreground.png'))
    s=round(48*k); base=on_paper(s,.72); base.save(os.path.join(p,'ic_launcher.png'))   # الأيقونة القديمة (أندرويد < 8)
    m=Image.new('L',(s*4,s*4),0); ImageDraw.Draw(m).ellipse((0,0,s*4-1,s*4-1),fill=255); m=m.resize((s,s),Image.LANCZOS)
    r=Image.new('RGBA',(s,s),(0,0,0,0)); r.paste(base,(0,0),m); r.save(os.path.join(p,'ic_launcher_round.png'))
v=os.path.join(OUT,'values'); os.makedirs(v,exist_ok=True)
open(os.path.join(v,'ic_launcher_background.xml'),'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">%s</color>\n</resources>\n'%hexs(PAPER))
print('✓ الأيقونات: حبر',hexs(INK),'على',hexs(PAPER))
