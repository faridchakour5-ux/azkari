# -*- coding: utf-8 -*-
"""يولّد credits.html (نسبُ صور القرّاء) من reciters/*.webp الموجودة فعلًا، ويطبع قائمةَ ids للتطبيق.
   الترخيصُ CC BY-SA يوجب ذكرَ المصوِّر والترخيص ورابطَ الصفحة الأصل."""
import os, html
ROOT=os.path.join(os.path.dirname(__file__),'..')
C=[ # id، الاسم، المصوِّر، الترخيص، رابط الترخيص، ملفّ كومنز
 ('ghamdi','سعد الغامدي','الشيخ هيثم الدخين','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','Saad al Ghamdi.jpg'),
 ('shur','سعود الشريم','Sobi2203','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','Saud Shuraim doing the Khutbah.png'),
 ('minshawi','محمد صديق المنشاوي (وتلاوته المجوَّدة)','مؤلِّفٌ مجهول','ملك عامّ (Public domain)','https://commons.wikimedia.org/wiki/File:Elminshwey.jpg','Elminshwey.jpg'),
 ('koshi','العيون الكوشي','Hamdaouiabde','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','صورة للقارئ الشيخ العيون الكوشي.jpeg'),
 ('maher','ماهر المعيقلي','وليد أيوب','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/','Maher Al Mueaqly.png'),
 ('qtami','ناصر القطامي','Ayman dhū alghiná','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','صورة شخصية الشيخ ناصر القطامي.jpg'),
 ('turki','بدر التركي','Abo.ibrahim0','CC0 (تنازلٌ عن الحقوق)','https://creativecommons.org/publicdomain/zero/1.0/','Photo of badr al-turki in 2023.jpg'),
 ('hzza','هزاع البلوشي','Ammar molla','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','هزاع البلوشي.jpg'),
]
have=[c for c in C if os.path.exists(os.path.join(ROOT,'reciters',c[0]+'.webp'))]
rows=''.join('<li><strong>%s</strong> — تصوير: %s — الترخيص: <a href="%s" target="_blank" rel="noopener">%s</a> — <a href="https://commons.wikimedia.org/wiki/File:%s" target="_blank" rel="noopener">الصفحة الأصل</a></li>\n'%(
  html.escape(n),html.escape(a),l,html.escape(t),html.escape(f.replace(' ','_'),quote=True).replace('"','%22')) for _,n,a,t,l,f in have)
src=open(os.path.join(ROOT,'privacy.html'),encoding='utf-8').read()
head=src[:src.index('<body>')].replace('سياسة الخصوصية — صلاتي','صور القرّاء — صلاتي')
page=head+'''<body>
<div class="wrap">
  <header><h1>صور القرّاء — النَّسب والتراخيص</h1></header>
  <div class="card">
    <p>الصورُ الدائريّة فوق أسماء القرّاء في صفحة «الاستماع» مأخوذةٌ من <strong>ويكيميديا كومنز</strong>، وهي حرّةُ الترخيص. قُصَّ كلُّ صورةٍ مربّعًا حول الوجه وصُغِّرت لتخفّ على الجهاز، ولم يُغيَّر فيها غيرُ ذلك. من لا صورةَ حرّةً له يظهر بحرفِ اسمه.</p>
    <ul>
'''+rows+'''    </ul>
    <p>رخصةُ CC BY-SA تسري على الصورة المذكورة وحدها، لا على بقيّة التطبيق.</p>
  </div>
  <header><h1>مصادر أخرى</h1></header>
  <div class="card">
    <ul>
      <li><strong>ترجمة معاني الآيات (الفرنسيّة والإنجليزيّة):</strong> من بوّابة <a href="https://quranenc.com" target="_blank" rel="noopener">quranenc.com</a> (مشروع «موسوعة القرآن»): الفرنسيّة «French translation — Noor International Center» (ترجمة د. نبيل رضوان)، والإنجليزيّة «English Translation — Noor International Center». ينصّ المشروعُ على أنّ ترجماتِه مجّانيّةٌ للجميع ومُتاحةٌ للتطبيقات والأجهزة الذكيّة. نُسخت كما هي بلا تغيير، وحُذفت منها أرقامُ الآيات وعلاماتُ الحواشي فحسب. وهي ترجمةُ معانٍ لا تُغني عن الأصل العربيّ.</li>
      <li><strong>تلوين أحكام التجويد (حفص):</strong> بياناتٌ مفتوحةٌ من مشروع <a href="https://github.com/cpfair/quran-tajweed" target="_blank" rel="noopener">quran-tajweed</a> (المستخدم cpfair على GitHub — رخصة <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>)، نُسقِطت آليًّا على نصّنا بعد التحقّق من مطابقة الحروف. تشمل نحو 94٪ من الآيات، وقد تخطئ في مواضع؛ فالمرجعُ المصحفُ المجوَّد والمقرئ. استُعين بنصّ <a href="https://tanzil.net" target="_blank" rel="noopener">tanzil.net</a> لمطابقة المواضع فقط.</li>
      <li><strong>الآيات المتشابهة اللفظ:</strong> حُسبت آليًّا من نصّ المصحف نفسه (كلماتٌ متتاليةٌ مشتركةٌ بين آيتين)، وليست قائمةَ علماء المتشابه اللفظيّ.</li>
      <li><strong>نصّ القرآن:</strong> مجمّع الملك فهد لطباعة المصحف الشريف (حفص)، والمصحف المحمّديّ (ورش). والتفسير: التفسير الميسّر — مجمع الملك فهد.</li>
    </ul>
  </div>
  <footer><a class="back" href="./index.html">→ العودة إلى التطبيق</a></footer>
</div>
</body>
</html>
'''
open(os.path.join(ROOT,'credits.html'),'w',encoding='utf-8').write(page)
print('ids:',[c[0] for c in have])
