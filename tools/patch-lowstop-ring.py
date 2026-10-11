"""يعيد رسمَ محرف «lowstop» (U+06EA، دائرة الإمالة في ورش) في الخطّ المغربيّ: حلقةٌ أكبر وأنزل،
فلا تضيع في حبر الحرف. العلامةُ نفسُها وترميزُها وتموضعُها (GPOS) لا تتغيّر؛ نصُّ القرآن لا يُمَسّ.

  python3 tools/patch-lowstop-ring.py SRC.woff2 DST.woff2 [OUT_R=215 IN_R=105 CY=-960]
  ثم سمِّ الملفّ maghribi-<أوّل 8 من sha1>.woff2 وحدِّث index.html وsw.js وstore/feature.html
  (انظر tools/patch-maghribi-font.py البند 6) وشغِّل tools/fahs-khatt-warsh.py.
"""
import math,sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
src,dst=sys.argv[1],sys.argv[2]
OUT_R,IN_R,CY=(int(x) for x in sys.argv[3:6]) if len(sys.argv)>5 else (215,105,-960)
f=TTFont(src)
def circle(pen,cx,cy,r,clockwise):
    n=8; k=r/math.cos(math.pi/n); s=-1 if clockwise else 1
    pts=[((cx+r*math.cos(s*2*math.pi*i/n),cy+r*math.sin(s*2*math.pi*i/n)),(cx+k*math.cos(s*2*math.pi*(i+.5)/n),cy+k*math.sin(s*2*math.pi*(i+.5)/n))) for i in range(n)]
    rd=lambda p:(round(p[0]),round(p[1]))
    pen.moveTo(rd(pts[0][0]))
    for i in range(n): pen.qCurveTo(rd(pts[i][1]),rd(pts[(i+1)%n][0]))
    pen.closePath()
pen=TTGlyphPen(f.getGlyphSet()); circle(pen,198,CY,OUT_R,True); circle(pen,198,CY,IN_R,False)
g=pen.glyph(); f['glyf']['lowstop']=g; g.recalcBounds(f['glyf']); f['hmtx']['lowstop']=(0,g.xMin)
f.flavor='woff2'; f.save(dst); print('saved',dst,g.xMin,g.yMin,g.xMax,g.yMax)
