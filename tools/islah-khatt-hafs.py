# -*- coding: utf-8 -*-
"""إصلاحُ محرفَي ميم الإقلاب المنخفضة U+06ED والدائرة الفارغة السفليّة U+06EA
   في خطّ «KFGQPC Uthmanic HAFS»: كانا عنصرَين نائبَين (uni0600) عرضُهما كامل
   وصنفُهما «حرفُ أصل»، فيرسمهما المتصفّح دائرةً كبيرة. نُعطيهما شكلَ نظيرَيهما
   المرتفعَين، ونضمّهما إلى جدول التموضع بصنف العلامات السفليّة."""
import sys, copy
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables as ot

SRC, DST, DY = sys.argv[1], sys.argv[2], int(sys.argv[3])
PAIRS = [('uni06E2','uni06ED'), ('uni06E0','uni06EA')]
BELOW_CLASS = 4          # صنفُ العلامات السفليّة في هذا الخطّ (كسرةٌ وتنوينُ كسر)

f = TTFont(SRC)
go = f.getGlyphOrder(); gid = {g:i for i,g in enumerate(go)}

# ١) الشكل والعرض
for src, dst in PAIRS:
    f['glyf'][dst] = copy.deepcopy(f['glyf'][src])
    f['hmtx'][dst] = f['hmtx'][src]

# ٢) صنفُه في GDEF: علامة (٣) لا حرفَ أصل (١)
gcd = f['GDEF'].table.GlyphClassDef.classDefs
for src, dst in PAIRS: gcd[dst] = 3

# ٣) ضمُّه إلى جداول التموضع حيث نظيرُه
def add_to(cov, arr, src, dst, klass, dy):
    if src not in cov.glyphs or dst in cov.glyphs: return False
    j = cov.glyphs.index(src)
    rec = copy.deepcopy(arr.MarkRecord[j])
    if klass is not None: rec.Class = klass
    if rec.MarkAnchor is not None and dy:
        rec.MarkAnchor.YCoordinate = rec.MarkAnchor.YCoordinate + dy
    # نُدرجه في موضعه من ترتيب المحارف حتى لا يختلّ التوازي بين التغطية والمصفوفة
    k = 0
    while k < len(cov.glyphs) and gid[cov.glyphs[k]] < gid[dst]: k += 1
    cov.glyphs.insert(k, dst)
    arr.MarkRecord.insert(k, rec)
    arr.MarkCount = len(arr.MarkRecord)
    return True

n = 0
for lk in f['GPOS'].table.LookupList.Lookup:
    for st in lk.SubTable:
        for covn, arrn in (('MarkCoverage','MarkArray'), ('Mark1Coverage','Mark1Array')):
            cov = getattr(st, covn, None); arr = getattr(st, arrn, None)
            if cov is None or arr is None: continue
            maxc = getattr(st, 'ClassCount', 1)
            klass = BELOW_CLASS if BELOW_CLASS < maxc else None
            for src, dst in PAIRS:
                if add_to(cov, arr, src, dst, klass, DY): n += 1

f.save(DST)
f.close()
print('أُضيف إلى %d موضعًا في GPOS، وحُفظ في %s' % (n, DST))
