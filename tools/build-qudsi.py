#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
يولّد صفحة «الأحاديث القدسية الصحيحة» المستقلّة (qudsi.html).

    HADITH_DB=/path/to/dir  python3 tools/build-qudsi.py

القواعد (كما في build-khayr.py / build-sunna.py):
  • الأحاديثُ القدسيّة (ما يرويه النبيُّ ﷺ عن ربّه) من «صحيح البخاريّ» و«صحيح مسلم» فقط، ونصُّ كلٍّ منها يُؤخذ
    من قاعدة hadith-json حرفيًّا؛ فإن لم يوجد اللفظُ أو الراوي في السند يفشل البناء.
  • التخريجُ (كتابُ الصحيح واسمُ بابه) يُحسب من الروايات التي وُجدت فعلًا؛ ولا يُكتب «متّفقٌ عليه» إلّا إن وُجد اللفظُ في الكتابين.
    بلا أرقام أحاديث (ترقيمُ القاعدة يخالف المتداول).
  • لا شرحَ ولا ترجمةَ للحديث: العنوانُ القصير لكلّ حديثٍ للتعريف فقط.
  • الصفحةُ مستقلّةٌ لا تمسّ «الورد» ولا الإعدادات (تقرأ az_settings قراءةً فقط).
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'tools', 'build-sunna.py'), encoding='utf-8').read().split('G = dict(globals())')[0]
G = {'__file__': os.path.join(ROOT, 'tools', 'build-sunna.py'), '__name__': 'sunna_lib'}
exec(compile(src, 'build-sunna.py', 'exec'), G)
_norm, _clean, takhrij, tidy = G['norm'], G['clean'], G['takhrij'], G['tidy']

def words_slice(h, start, end):
    toks = _clean(h['arabic']).split(' ')
    strip = lambda x: re.sub(r'[\.،:؛"“”]', '', _norm(x))
    nt = [strip(x) for x in toks]
    sw, ew = [strip(w) for w in start.split(' ')], [strip(w) for w in end.split(' ')]
    def find(seq, frm=0):
        for i in range(frm, len(nt) - len(seq) + 1):
            if nt[i:i + len(seq)] == seq: return i
        return -1
    i = find(sw)
    if i < 0: return None
    j = find(ew, i)
    if j < 0: return None
    return ' '.join(toks[i:j + len(ew)]).replace('"', '').strip()

def src_tag(s):
    if s.startswith('متّفقٌ عليه'): return 'both'
    return 'bukhari' if 'البخاري' in s.split('.')[0] else 'muslim'

ITEMS = []
def Q(cat, t_ar, t_fr, t_en, key, who, who_fr, who_en, start, end, note=None):
    hs, tk = takhrij(key, who[1])
    text = None
    for b, h in hs:          # أوّلُ روايةٍ فيها المقطعُ كاملًا (قد تتعدّد الروايات بألفاظ مختلفة)
        text = words_slice(h, start, end)
        if text: break
    if not text: sys.exit('لم أجد المقطع في أيّ رواية: ' + key)
    text = text.replace('صلى الله عليه وسلم', 'ﷺ')
    suf = who[2] if len(who) > 2 else 'عنه'
    it = {'c': cat, 't': {'ar': t_ar, 'fr': t_fr, 'en': t_en}, 'v': '«' + tidy(text).rstrip(' .،') + '»',
          's': tk + '. عن ' + who[0] + ' رضي الله ' + suf + '، عن النبي ﷺ فيما يرويه عن ربّه.',
          'k': src_tag(tk), 'who': {'fr': who_fr, 'en': who_en}}
    if note: it['n'] = note
    ITEMS.append(it)

AH = ('أبي هريرة', 'هريره'); AHF, AHE = 'Abu Hurayra', 'Abu Hurayrah'

# ───── رحمة الله ومغفرته
Q('mercy', 'حرّمتُ الظلم على نفسي', 'Allah a interdit l’injustice', 'Allah has forbidden injustice',
  'يا عبادي اني حرمت الظلم علي نفسي', ('أبي ذرٍّ', 'ذر'), 'Abu Dharr', 'Abu Dharr',
  'يا عبادي إني حرمت الظلم', 'فلا يلومن إلا نفسه')
Q('mercy', 'من جاء بالحسنة فله عشر أمثالها', 'La bonne action est multipliée', 'A good deed is multiplied',
  'من جاء بالحسنه فله عشر امثالها وازيد', ('أبي ذرٍّ', 'ذر'), 'Abu Dharr', 'Abu Dharr',
  'من جاء بالحسنة', 'لقيته بمثلها مغفرة')
Q('mercy', 'إذا همَّ عبدي بحسنة أو سيّئة', 'Intention d’une bonne ou d’une mauvaise action', 'Intending a good or a bad deed',
  'اذا اراد عبدي ان يعمل سيئه فلا تكتبوها عليه حتي يعملها', AH, AHF, AHE,
  'إذا أراد عبدي أن يعمل سيئة', 'إلى سبعمائة')
Q('mercy', 'أُحِلُّ عليكم رضواني', 'Je vous accorde Mon agrément', 'I grant you My pleasure',
  'احل عليكم رضواني فلا اسخط عليكم بعده ابدا', ('أبي سعيدٍ الخدريّ', 'سعيد'), 'Abu Sa‘id al-Khudri', 'Abu Sa‘id al-Khudri',
  'إن الله يقول لأهل الجنة', 'بعده أبدا')
Q('mercy', 'أعددتُ لعبادي الصالحين', 'J’ai préparé pour Mes serviteurs vertueux', 'I have prepared for My righteous servants',
  'اعددت لعبادي الصالحين ما لا عين رات ولا اذن سمعت', AH, AHF, AHE,
  'أعددت لعبادي الصالحين', 'على قلب بشر')

# ───── القرب من الله والذكر
Q('near', 'أنا عند ظنّ عبدي بي', 'Je suis selon l’opinion que Mon serviteur a de Moi', 'I am as My servant thinks of Me',
  'انا عند ظن عبدي بي وانا معه حين يذكرني', AH, AHF, AHE,
  'أنا عند ظن عبدي بي', 'أتيته هرولة')
Q('near', 'من عادى لي وليًّا', 'Quiconque s’oppose à Mon allié', 'Whoever shows enmity to a friend of Mine',
  'من عادي لي وليا فقد اذنته بالحرب', AH, AHF, AHE,
  'من عادى لي وليا', 'أكره مساءته')
Q('near', 'إذا أحبَّ عبدي لقائي', 'Si Mon serviteur aime Me rencontrer', 'When My servant loves to meet Me',
  'اذا احب عبدي لقائي احببت لقاءه', AH, AHF, AHE,
  'إذا أحب عبدي لقائي', 'كرهت لقاءه')

# ───── العبادات
Q('worship', 'الصيام لي وأنا أجزي به', 'Le jeûne est pour Moi', 'Fasting is for Me',
  'كل عمل ابن ادم له الا الصيام', AH, AHF, AHE,
  'كل عمل ابن آدم له إلا الصيام', 'وأنا أجزي به')
Q('worship', 'قسمتُ الصلاة بيني وبين عبدي', 'J’ai partagé la prière entre Moi et Mon serviteur', 'I have divided the prayer between Me and My servant',
  'قسمت الصلاه بيني وبين عبدي نصفين', AH, AHF, AHE,
  'قسمت الصلاة بيني وبين عبدي نصفين', 'هذا لعبدي ولعبدي ما سأل')
Q('worship', 'أنفِقْ أُنفِقْ عليك', 'Dépense, Je dépenserai pour toi', 'Spend, and I shall spend on you',
  'انفق انفق عليك', AH, AHF, AHE,
  'أنفق أنفق عليك', 'أنفق عليك')

# ───── التوحيد
Q('tawhid', 'أنا أغنى الشركاء عن الشرك', 'Je suis le plus indépendant des associés', 'I am the most self-sufficient of partners',
  'انا اغني الشركاء عن الشرك', AH, AHF, AHE,
  'أنا أغنى الشركاء عن الشرك', 'تركته وشركه')
Q('tawhid', 'كذّبني ابن آدم وشتمني', 'Le fils d’Adam M’a démenti et insulté', 'The son of Adam denied Me and reviled Me',
  'كذبني ابن ادم ولم يكن له ذلك', AH, AHF, AHE,
  'كذبني ابن آدم', 'كفؤا أحد')
Q('tawhid', 'يؤذيني ابن آدم يسبّ الدهر', 'Le fils d’Adam Me nuit en maudissant le temps', 'The son of Adam harms Me by cursing time',
  'يسب الدهر وانا الدهر', AH, AHF, AHE,
  'يؤذيني ابن آدم', 'الليل والنهار')
Q('tawhid', 'أصبح من عبادي مؤمنٌ بي وكافر', 'Parmi Mes serviteurs, certains croient en Moi, d’autres non', 'Some of My servants have become believers in Me and some disbelievers',
  'اصبح من عبادي مؤمن بي وكافر', ('زيد بن خالد الجهنيّ', 'خالد'), 'Zayd ibn Khalid al-Juhani', 'Zayd ibn Khalid al-Juhani',
  'أصبح من عبادي مؤمن بي وكافر', 'مؤمن بالكوكب')
Q('tawhid', 'لأهون أهل النار عذابًا', 'Au moins tourmenté des gens du Feu', 'To the least punished of the people of the Fire',
  'لاهون اهل النار عذابا يوم القيامه لو ان لك ما في الارض', ('أنس بن مالك', 'انس'), 'Anas ibn Malik', 'Anas ibn Malik',
  'لأهون أهل النار عذابا', 'أن تشرك بي')

# ───── الصبر والابتلاء
Q('sabr', 'ما لعبدي المؤمن عندي جزاء', 'Mon serviteur croyant n’a de récompense auprès de Moi que le Paradis', 'My believing servant has no reward with Me but Paradise',
  'ما لعبدي المؤمن عندي جزاء', AH, AHF, AHE,
  'ما لعبدي المؤمن عندي جزاء', 'إلا الجنة')
Q('sabr', 'إذا ابتليتُ عبدي بحبيبتيه فصبر', 'Si J’éprouve Mon serviteur dans ses deux bien-aimés et qu’il patiente', 'If I try My servant through his two beloveds and he is patient',
  'اذا ابتليت عبدي بحبيبتيه فصبر', ('أنس بن مالك', 'انس'), 'Anas ibn Malik', 'Anas ibn Malik',
  'إذا ابتليت عبدي بحبيبتيه', 'منهما الجنة',
  note='«حبيبتيه»: عينيه، كما ورد تفسيرُه في الرواية نفسها.')
Q('sabr', 'بادرني عبدي بنفسه', 'Mon serviteur M’a devancé par lui-même', 'My servant hastened his own end',
  'بادرني عبدي بنفسه', ('جندب بن عبد الله', 'جندب'), 'Jundab ibn ‘Abdillah', 'Jundab ibn ‘Abdillah',
  'بادرني عبدي بنفسه', 'حرمت عليه الجنة',
  note='ورد في سياق قصّة رجلٍ ممّن كان قبلنا أصابه جرحٌ فجزع فقطع يده فمات.')

# ───── حقوق العباد
Q('rights', 'يا ابن آدم مرضتُ فلم تعدني', 'Fils d’Adam, J’étais malade et tu ne M’as pas rendu visite', 'Son of Adam, I fell ill and you did not visit Me',
  'يا ابن ادم مرضت فلم تعدني', AH, AHF, AHE,
  'يا ابن آدم مرضت فلم تعدني', 'وجدت ذلك عندي')
Q('rights', 'ثلاثةٌ أنا خصمهم يوم القيامة', 'Trois personnes dont Je serai l’adversaire', 'Three whose adversary I shall be',
  'ثلاثه انا خصمهم يوم القيامه', AH, AHF, AHE,
  'ثلاثة أنا خصمهم يوم القيامة', 'ولم يعط أجره')

CATS = [
 {'id': 'mercy', 't': {'ar': 'رحمة الله ومغفرته', 'fr': 'Miséricorde et pardon', 'en': 'Mercy and forgiveness'}},
 {'id': 'near', 't': {'ar': 'القرب من الله', 'fr': 'La proximité d’Allah', 'en': 'Closeness to Allah'}},
 {'id': 'worship', 't': {'ar': 'العبادات', 'fr': 'Les adorations', 'en': 'Acts of worship'}},
 {'id': 'tawhid', 't': {'ar': 'التوحيد', 'fr': 'Le tawhid', 'en': 'Tawhid'}},
 {'id': 'sabr', 't': {'ar': 'الصبر والابتلاء', 'fr': 'Patience et épreuve', 'en': 'Patience and trials'}},
 {'id': 'rights', 't': {'ar': 'حقوق العباد', 'fr': 'Les droits des gens', 'en': 'Rights of people'}},
]
UI = {
 'ar': {'dir': 'rtl', 'qrT': 'حمِّل التطبيق من Google Play', 'back': 'العودة', 'title': 'الأحاديث القدسية الصحيحة', 'sub': 'ما رواه النبيُّ ﷺ عن ربّه — من «صحيح البخاريّ» و«صحيح مسلم»، مع المصدر.',
        'search': 'ابحث في الأحاديث…', 'all': 'الكل', 'hadiths': 'حديثًا', 'tag': 'حديث قدسي', 'copy': 'نسخ', 'copied': 'تمّ النسخ ✓', 'share': 'مشاركة', 'none': 'لا نتائج.',
        'foot': 'الأحاديث القدسيّة هي ما يرويه النبيُّ ﷺ عن ربّه عزّ وجلّ بلفظه ﷺ. اقتُصرتُ فيها على ما في الصحيحين، ونُقل كلُّ نصٍّ حرفيًّا من الكتابين دون شرحٍ ولا ترجمة، والتخريجُ باسم الكتاب والباب بلا أرقام. العناوين القصيرة للتعريف فقط. وما أُورد مقتطفًا من حديثٍ أطول فهو من موضع الكلام الإلهيّ منه.',
        'by': {'both': 'متّفقٌ عليه', 'bukhari': 'رواه البخاري', 'muslim': 'رواه مسلم'}, 'narrator': 'الراوي'},
 'fr': {'dir': 'ltr', 'qrT': 'Téléchargez l’application sur Google Play', 'back': 'Retour', 'title': 'Hadiths qudsi authentiques', 'sub': 'Ce que le Prophète ﷺ rapporte de son Seigneur — d’après le Sahih al-Bukhari et le Sahih Muslim, avec la source.',
        'search': 'Rechercher dans les hadiths…', 'all': 'Tous', 'hadiths': 'hadiths', 'tag': 'Hadith qudsi', 'copy': 'Copier', 'copied': 'Copié ✓', 'share': 'Partager', 'none': 'Aucun résultat.',
        'foot': 'Un hadith qudsi est ce que le Prophète ﷺ rapporte de son Seigneur. Seuls figurent ici des hadiths du Sahih al-Bukhari et du Sahih Muslim, copiés tels quels en arabe, sans commentaire ni traduction ; la source indique le livre et le chapitre, sans numéro. Les titres courts servent seulement à s’y repérer.',
        'by': {'both': 'Muttafaqun ‘alayh (Bukhari et Muslim)', 'bukhari': 'Rapporté par al-Bukhari', 'muslim': 'Rapporté par Muslim'}, 'narrator': 'Rapporteur'},
 'en': {'dir': 'ltr', 'qrT': 'Get the app on Google Play', 'back': 'Back', 'title': 'Authentic Hadith Qudsi', 'sub': 'What the Prophet ﷺ narrated from his Lord — from Sahih al-Bukhari and Sahih Muslim, with the source.',
        'search': 'Search the hadiths…', 'all': 'All', 'hadiths': 'hadiths', 'tag': 'Hadith Qudsi', 'copy': 'Copy', 'copied': 'Copied ✓', 'share': 'Share', 'none': 'No results.',
        'foot': 'A hadith qudsi is what the Prophet ﷺ narrates from his Lord. Only hadiths found in Sahih al-Bukhari and Sahih Muslim are included, copied verbatim in Arabic with no commentary or translation; the source gives the book and chapter name, without numbers. The short titles are only for finding your way.',
        'by': {'both': 'Agreed upon (Bukhari and Muslim)', 'bukhari': 'Narrated by al-Bukhari', 'muslim': 'Narrated by Muslim'}, 'narrator': 'Narrator'},
}
def nbsp(x): return re.sub(r' ([:;?!»])', ' \\1', x.replace('« ', '« '))
for k in ('sub', 'foot', 'search'): UI['fr'][k] = nbsp(UI['fr'][k])
for it in ITEMS: it['t']['fr'] = nbsp(it['t']['fr'])
DATA = {'ui': UI, 'cats': CATS, 'items': ITEMS}
tpl = open(os.path.join(ROOT, 'tools', 'qudsi-template.html'), encoding='utf-8').read()
out = tpl.replace('/*__DATA__*/null', json.dumps(DATA, ensure_ascii=False))
open(os.path.join(ROOT, 'qudsi.html'), 'w', encoding='utf-8').write(out)
print('qudsi.html:', len(ITEMS), 'حديثًا،', len(out.encode()) // 1024, 'كيلوبايت')
