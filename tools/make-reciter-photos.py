# -*- coding: utf-8 -*-
"""يصنع صورَ القرّاء الدائريّة (reciters/<id>.webp) من صورٍ حرّة الترخيص في ويكيميديا كومنز.
   المصادر والتراخيص في reciters/CREDITS.json (تُعرض في الإعدادات)؛ الأصولُ تُحمَّل خارج المستودع.
   الاستعمال: python3 tools/make-reciter-photos.py <مجلّد_الأصول>  (فيه <id>.src)"""
import sys, os
from PIL import Image
# مربّعُ القصّ (يسار، أعلى، يمين، أسفل) على الصورة الأصل — متمركزٌ على الوجه
BOX = {
 'ghamdi':(33,0,297,264), 'koshi':(0,40,330,370), 'maher':(0,26,250,276),
 'minshawi':(26,10,246,230), 'qtami':(68,10,258,200), 'shur':(114,43,244,173),
 'turki':(67,23,267,223), 'hzza':(55,85,265,295),
}
src, out = sys.argv[1], os.path.join(os.path.dirname(__file__), '..', 'reciters')
os.makedirs(out, exist_ok=True)
for k, box in BOX.items():
    p = os.path.join(src, k + '.src')
    if not os.path.exists(p): print('— لا أصلَ لـ', k); continue
    im = Image.open(p).convert('RGB').crop(box).resize((128,128), Image.LANCZOS)
    im.save(os.path.join(out, k + '.webp'), 'WEBP', quality=82, method=6)
    print('✓', k, os.path.getsize(os.path.join(out, k + '.webp')), 'bytes')
