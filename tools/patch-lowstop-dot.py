"""(17 أكتوبر 2026، طلبُ فريد عن ملاحظة إخوةٍ يقرؤون بورش) يجعل علامةَ الإمالة U+06EA (محرف «lowstop» في الخطّ المغربيّ)
نقطةً مصمتةً غليظةً بدل الحلقة الجوفاء، كما في المصحف المحمّدي المطبوع (نقطةٌ تحت الحرف).
العلامةُ نفسُها وترميزُها وتموضعُها (GPOS) لا تتغيّر؛ نصُّ القرآن لا يُمَسّ — يُستبدَل **رسمُ المحرف وحدَه**.

  python3 tools/patch-lowstop-dot.py SRC.woff2 DST.woff2 [R=115 CY=-960]
  ثم سمِّ الملفّ maghribi-<أوّل 8 من sha1>.woff2 وحدِّث كلَّ مرجعٍ إليه (index.html وsw.js وstore/feature.html وقوالبَ الصفحات المستقلّة)
  وشغِّل tools/fahs-khatt-warsh.py. (البند 7 في tools/patch-maghribi-font.py)
  القطر 2R = 230 وحدة (نقطةُ الباء 167): غليظةٌ نوعًا ما، تبقى ظاهرةً ولا تضيع في حبر الحرف.
"""
import math,sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
src,dst=sys.argv[1],sys.argv[2]
R,CY=(int(x) for x in sys.argv[3:5]) if len(sys.argv)>4 else (115,-960)
f=TTFont(src)
pen=TTGlyphPen(f.getGlyphSet())
n=8; k=R/math.cos(math.pi/n); cx=198
pts=[((cx+R*math.cos(-2*math.pi*i/n),CY+R*math.sin(-2*math.pi*i/n)),(cx+k*math.cos(-2*math.pi*(i+.5)/n),CY+k*math.sin(-2*math.pi*(i+.5)/n))) for i in range(n)]
rd=lambda p:(round(p[0]),round(p[1]))
pen.moveTo(rd(pts[0][0]))
for i in range(n): pen.qCurveTo(rd(pts[i][1]),rd(pts[(i+1)%n][0]))
pen.closePath()
g=pen.glyph(); f['glyf']['lowstop']=g; g.recalcBounds(f['glyf']); f['hmtx']['lowstop']=(0,g.xMin)
f.flavor='woff2'; f.save(dst); print('saved',dst,g.xMin,g.yMin,g.xMax,g.yMax,'contours',g.numberOfContours)
