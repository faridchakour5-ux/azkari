#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
يولّد صفحة «أبواب الخير» المستقلّة (khayr.html).

    HADITH_DB=/path/to/dir  python3 tools/build-khayr.py

القواعد (كما في build-sunna.py):
  • نصُّ كلّ حديثٍ يُؤخذ من الصحيحين نصًّا (قاعدة hadith-json) وبقاعدة التخريج نفسها: كتابُ الحديث واسمُ بابه
    فقط، بلا أرقام (ترقيمُ القاعدة يخالف الترقيمَ المتداول فلا يُنقل رقمٌ منها).
  • نصُّ الآيات من wird_hafs.js (مصحف المدينة، حفص) بالسورة والآية.
  • الشرحُ المختصَر والاقتراحاتُ العمليّةُ مكتوبةٌ باليد وهي اجتهادٌ لا حديث؛ وتُوسَم في الصفحة بذلك.
  • الصفحةُ مستقلّةٌ: لا تمسّ «الورد» ولا إعداداتِ التطبيق (تقرأ az_settings قراءةً فقط)، وتحفظ تقدُّمَ المستخدم في
    مفتاحٍ خاصٍّ بها (az_khayr) على الجهاز وحده.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'tools', 'build-sunna.py'), encoding='utf-8').read().split('G = dict(globals())')[0]
G = {'__file__': os.path.join(ROOT, 'tools', 'build-sunna.py'), '__name__': 'sunna_lib'}
exec(compile(src, 'build-sunna.py', 'exec'), G)
HD, AYA = G['HD'], G['AYA']
_norm, _clean = G['norm'], G['clean']

def _words_slice(h, start, end):
    """كما في build-sunna لكن لا تُعدّ علاماتُ الترقيم الملتصقةُ بالكلمة فرقًا في المطابقة."""
    toks = _clean(h['arabic']).split(' ')
    nt = [re.sub(r'[\.،:؛"\u201c\u201d]', '', _norm(x)) for x in toks]
    sw = [re.sub(r'[\.،:؛"]', '', w) for w in _norm(start).split(' ')]
    ew = [re.sub(r'[\.،:؛"]', '', w) for w in _norm(end).split(' ')]
    def find(seq, frm=0):
        for i in range(frm, len(nt) - len(seq) + 1):
            if nt[i:i + len(seq)] == seq: return i
        return -1
    i = find(sw)
    if i < 0: sys.exit('لم أجد بداية المقتطف: ' + start)
    j = find(ew, i)
    if j < 0: sys.exit('لم أجد نهاية المقتطف: ' + end)
    return ' '.join(toks[i:j + len(ew)]).replace('"', '').strip()

G['words_slice'] = _words_slice

def A(title, refs):
    b = AYA(title, refs)
    return {'t': b['v'], 's': re.sub(r'(\d+)–(\d+)', '\u2066\\1–\\2\u2069', b['s'])}   # أرقامُ النطاق تُعزَل كي لا ينعكس ترتيبُها

# بابُ الصحيح فقط لتخريجٍ مختصر بالفرنسيّة/الإنجليزيّة (بلا أسماء الأبواب)
def src_tag(s):
    if s.startswith('متّفقٌ عليه'): return 'both'
    return 'bukhari' if 'البخاري' in s.split('.')[0] else 'muslim'

def H(h, who_fr, who_en, ar, fr, en):
    h = dict(h); h['t'] = h['t'].replace('أَهْلَ، قُبَاءٍ', 'أَهْلَ قُبَاءٍ')   # علامةُ ترقيمٍ شاذّةٌ في القاعدة (فاصلةٌ بين المضاف والمضاف إليه)، لا حرفٌ من اللفظ
    return {'t': h['v'], 's': h['s'], 'k': src_tag(h['s']), 'who': {'fr': who_fr, 'en': who_en}, 'm': {'ar': ar, 'fr': fr, 'en': en}}

DOORS = []

# ───────────────────────── ١ برّ الوالدين
DOORS.append({
 'id': 'birr',
 'ic': '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/>',
 'ti': {'ar': 'برّ الوالدين', 'fr': 'Bonté envers les parents', 'en': 'Kindness to parents'},
 'sub': {'ar': 'من أحبّ الأعمال إلى الله بعد الصلاة في وقتها', 'fr': 'Parmi les œuvres les plus aimées d’Allah, après la prière à son heure', 'en': 'Among the deeds Allah loves most, after prayer at its time'},
 'aya': A('', [(17, 23), (17, 24)]),
 'had': [
  H(HD('أحقُّ الناس بحُسن الصحبة', 'من احق الناس بحسن صحابتي', ('أبي هريرة', 'هريره'), '', 'جاء رجل إلى رسول الله صلى الله عليه وسلم', 'ثم أبوك'),
    'Abu Hurayra', 'Abu Hurayrah',
    'قدّم النبيُّ ﷺ الأمَّ ثلاثَ مرّات ثم ذكر الأب. وقد علّل العلماءُ ذلك بما تحمّلته الأمُّ من الحمل والولادة والرضاع والتربية.',
    'Le Prophète ﷺ a cité la mère trois fois avant le père. Les savants l’expliquent par ce que la mère endure : grossesse, accouchement, allaitement, éducation.',
    'The Prophet ﷺ named the mother three times before the father. Scholars explain this by what a mother bears: pregnancy, childbirth, nursing and upbringing.'),
  H(HD('أحبُّ العمل إلى الله', 'ثم بر الوالدين', ('عبد الله بن مسعود', 'مسعود'), '', 'سألت رسول الله', 'الجهاد في سبيل الله', 'البخاري'),
    'Ibn Mas‘ud', 'Ibn Mas‘ud',
    'بعد الصلاة في وقتها يأتي برُّ الوالدين في ترتيب الأعمال التي يحبّها الله.',
    'Après la prière à son heure vient la bonté envers les parents, parmi les œuvres qu’Allah aime.',
    'After prayer at its time comes kindness to parents, among the deeds Allah loves.'),
  H(HD('رغم أنفُ من أدرك أبويه', 'رغم انف ثم رغم انف ثم رغم انف', ('أبي هريرة', 'هريره'), '', 'رغم أنف ثم رغم أنف', 'فلم يدخل الجنة'),
    'Abu Hurayra', 'Abu Hurayrah',
    'الخاسرُ من أدرك والديه أو أحدَهما في الكِبَر، فلم يكن بِرُّه لهما سببًا لدخوله الجنة.',
    'Est perdant celui qui trouve ses parents, l’un ou les deux, dans leur vieillesse sans que sa bonté envers eux ne devienne un chemin vers le Paradis.',
    'Ruined is the one who reaches his parents in their old age, one or both, and does not enter Paradise through kindness to them.'),
 ],
 'steps': {
  'ar': ['اتصل بوالديك أو زُرهما اليوم، ولو دقائق قليلة.', 'قل لهما كلمةً طيّبة، واحبس غضبَك وأنت بحضرتهما.', 'اعرض عليهما مساعدةً في عملٍ ثقيل عليهما.', 'ادعُ لهما بالرحمة والمغفرة، حيّين كانا أو ميّتين.'],
  'fr': ['Appelez ou rendez visite à vos parents aujourd’hui, même quelques minutes.', 'Dites-leur une bonne parole et retenez votre colère en leur présence.', 'Proposez-leur de l’aide pour une tâche qui leur pèse.', 'Invoquez pour eux la miséricorde et le pardon, qu’ils soient vivants ou décédés.'],
  'en': ['Call or visit your parents today, even for a few minutes.', 'Say a kind word and hold back your anger in their presence.', 'Offer help with a task that is heavy for them.', 'Make du‘a for their mercy and forgiveness, whether they are alive or have passed away.'],
 },
})

# ───────────────────────── ٢ الصدقة
DOORS.append({
 'id': 'sadaqa',
 'ic': '<path d="M12 3v4M8 7h8M7 11h10l-1 9H8z"/>',
 'ti': {'ar': 'الصدقة', 'fr': 'L’aumône', 'en': 'Charity'},
 'sub': {'ar': 'ولو بالقليل؛ فهي لا تُنقص المال', 'fr': 'Même peu : elle ne diminue pas la richesse', 'en': 'Even a little: it does not diminish wealth'},
 'aya': A('', [(2, 261)]),
 'had': [
  H(HD('ما نقصت صدقةٌ من مال', 'ما نقصت صدقه من مال', ('أبي هريرة', 'هريره'), ''),
    'Abu Hurayra', 'Abu Hurayrah',
    'الصدقةُ لا تنقص المال حقيقةً، بل يُبارك الله فيه ويُخلف على صاحبه. والعفوُ والتواضعُ يرفعان صاحبَهما.',
    'L’aumône ne diminue pas réellement la richesse : Allah y met la bénédiction et la remplace. Le pardon et l’humilité élèvent celui qui les pratique.',
    'Charity does not truly reduce wealth: Allah blesses it and replaces it. Forgiveness and humility raise the one who practises them.'),
  H(HD('اتقوا النارَ ولو بشقّ تمرة', 'اتقوا النار ولو بشق تمره', ('عدي بن حاتم', 'عدي'), ''),
    'ʿAdi ibn Hatim', 'ʿAdi ibn Hatim',
    'حثٌّ على الصدقة ولو بالقليل؛ فلا يحتقر أحدٌ ما يتصدّق به.',
    'Encouragement à donner, même peu : que personne ne méprise ce qu’il donne.',
    'An encouragement to give even a little: let no one belittle what they give.'),
  H(HD('الساعي على الأرملة والمسكين', 'الساعي علي الارمله والمسكين', ('أبي هريرة', 'هريره'), ''),
    'Abu Hurayra', 'Abu Hurayrah',
    'من يسعى لكفاية الأرملة والمسكين وقضاء حاجتهما له أجرٌ عظيم.',
    'Celui qui s’emploie à subvenir aux besoins de la veuve et du pauvre obtient une grande récompense.',
    'One who strives to provide for the widow and the poor earns a great reward.'),
 ],
 'steps': {
  'ar': ['خصّص مبلغًا صغيرًا ثابتًا كلَّ يوم ولو كان يسيرًا، فالدائمُ القليل خيرٌ من الكثير المنقطع.', 'تصدّق خفيةً ما استطعت.', 'أطعِم جائعًا أو اشترِ لمحتاجٍ حاجةً يحتاجها.', 'اسأل عن جارٍ أو قريبٍ محتاجٍ فابدأ به.'],
  'fr': ['Fixez un petit montant chaque jour, même modeste : le peu régulier vaut mieux que le beaucoup interrompu.', 'Donnez discrètement autant que possible.', 'Nourrissez une personne affamée ou offrez à un nécessiteux ce dont il a besoin.', 'Informez-vous d’un voisin ou d’un proche dans le besoin et commencez par lui.'],
  'en': ['Set aside a small fixed amount each day, however modest: steady and small beats large and interrupted.', 'Give discreetly whenever you can.', 'Feed someone hungry or buy something a needy person requires.', 'Ask about a neighbour or relative in need and start with them.'],
 },
})

# ───────────────────────── ٣ صلة الرحم
DOORS.append({
 'id': 'rahim',
 'ic': '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.6-3.4 3-5 5.5-5s4.9 1.6 5.5 5M15 15.4c3 0 5 1.4 6 4.6"/>',
 'ti': {'ar': 'صلة الرحم', 'fr': 'Les liens de parenté', 'en': 'Keeping family ties'},
 'sub': {'ar': 'سببٌ للبركة في الرزق والعمر', 'fr': 'Cause de bénédiction dans la subsistance et la vie', 'en': 'A cause of blessing in provision and life'},
 'aya': A('', [(13, 21)]),
 'had': [
  H(HD('صلةُ الرحم تبسط الرزق', 'من احب ان يبسط له في رزقه', ('أنس بن مالك', 'انس'), ''),
    'Anas ibn Malik', 'Anas ibn Malik',
    'صلةُ الرحم سببٌ للبركة في الرزق وفي العمر بإذن الله.',
    'Maintenir les liens de parenté est une cause de bénédiction dans la subsistance et dans la vie, par la permission d’Allah.',
    'Keeping family ties is a cause of blessing in provision and in life, by Allah’s permission.'),
  H(HD('لا يدخل الجنةَ قاطع', 'لا يدخل الجنه قاطع', ('جبير بن مطعم', 'جبير'), '', None, None, None),
    'Jubayr ibn Mut‘im', 'Jubayr ibn Mut‘im',
    'تحذيرٌ شديد من قطع الرحم. وللعلماء توجيهاتٌ في معنى هذا الوعيد، لكنّ المقصودَ أنّ القطيعة ذنبٌ عظيم.',
    'Mise en garde sévère contre la rupture des liens. Les savants ont des explications sur le sens de cette menace, mais l’essentiel est que la rupture est un grand péché.',
    'A severe warning against cutting family ties. Scholars have explanations of this threat, but the point is that cutting ties is a grave sin.'),
 ],
 'steps': {
  'ar': ['اتصل بقريبٍ لم تسأل عنه منذ مدّة.', 'أرسل رسالةَ سلامٍ أو دعاءٍ إلى قريبٍ بعيد.', 'زُر مريضًا أو كبيرًا من أهلك.', 'سامِح قريبًا أخطأ في حقّك وابدأ بالسلام.'],
  'fr': ['Appelez un proche dont vous n’avez pas pris de nouvelles depuis longtemps.', 'Envoyez un message de salutations ou une invocation à un proche éloigné.', 'Rendez visite à un malade ou à une personne âgée de votre famille.', 'Pardonnez à un proche qui vous a lésé et commencez par le salut.'],
  'en': ['Call a relative you have not asked after for a while.', 'Send a greeting or a du‘a to a distant relative.', 'Visit a sick or elderly family member.', 'Forgive a relative who wronged you and begin with the greeting of peace.'],
 },
})

# ───────────────────────── ٤ الجار
DOORS.append({
 'id': 'jar',
 'ic': '<path d="M3 11l9-7 9 7v9H3zM9 20v-6h6v6"/>',
 'ti': {'ar': 'الإحسان إلى الجار', 'fr': 'Bien traiter le voisin', 'en': 'Being good to the neighbour'},
 'sub': {'ar': 'أوصى به جبريل حتى ظنّ النبيُّ ﷺ أنه سيُورِّثه', 'fr': 'Jibrîl l’a tant recommandé que le Prophète ﷺ a cru qu’il hériterait', 'en': 'Jibril kept urging it until the Prophet ﷺ thought the neighbour would inherit'},
 'aya': A('', [(4, 36)]),
 'had': [
  H(HD('ما زال جبريل يوصيني بالجار', 'ما زال جبريل يوصيني بالجار', ('عبد الله بن عمر', 'عمر', 'عنهما'), ''),
    'Ibn ‘Umar', 'Ibn ‘Umar',
    'مبالغةٌ في بيان عِظَم حقّ الجار.',
    'Une insistance sur l’importance du droit du voisin.',
    'An emphasis on how great the neighbour’s right is.'),
  H(HD('لا تحقرنّ جارةٌ لجارتها', 'لا تحقرن جاره لجارتها', ('أبي هريرة', 'هريره'), ''),
    'Abu Hurayra', 'Abu Hurayrah',
    'لا تستقلّ ما تُهديه لجارك ولو كان يسيرًا (فِرْسِن الشاة: ظِلْفُها).',
    'Ne minimisez pas ce que vous offrez à votre voisin, même si c’est peu (le sabot d’un mouton).',
    'Do not belittle what you give your neighbour, however little (a sheep’s trotter).'),
  H(HD('تعاهد جيرانك', 'اذا طبخت مرقه', ('أبي ذر', 'ذر'), ''),
    'Abu Dharr', 'Abu Dharr',
    'توجيهٌ إلى مشاركة الجيران بشيءٍ من الطعام كلّما تيسّر.',
    'Une orientation à partager avec les voisins un peu de nourriture chaque fois que c’est possible.',
    'Guidance to share some food with the neighbours whenever possible.'),
 ],
 'steps': {
  'ar': ['سلِّم على جارك وابتسم له.', 'أهدِ جارَك شيئًا بسيطًا من طعامك.', 'اسأل عن جارٍ مريضٍ أو كبيرٍ في السنّ.', 'تجنّب كلَّ ما يؤذي جارك: الضجيج، وسدَّ الطريق، والكلامَ السيّئ.'],
  'fr': ['Saluez votre voisin avec un sourire.', 'Offrez-lui un peu de votre repas.', 'Prenez des nouvelles d’un voisin malade ou âgé.', 'Évitez tout ce qui le dérange : le bruit, l’obstruction du passage, les mauvaises paroles.'],
  'en': ['Greet your neighbour with a smile.', 'Share a little of your food with them.', 'Check on a sick or elderly neighbour.', 'Avoid whatever bothers them: noise, blocking the way, unkind words.'],
 },
})

# ───────────────────────── ٥ كفالة اليتيم
DOORS.append({
 'id': 'yatim',
 'ic': '<circle cx="12" cy="7" r="3"/><path d="M5 21c0-4.4 3-7 7-7s7 2.6 7 7"/>',
 'ti': {'ar': 'كفالة اليتيم', 'fr': 'Prendre en charge un orphelin', 'en': 'Caring for an orphan'},
 'sub': {'ar': 'قربٌ من النبيّ ﷺ في الجنة', 'fr': 'Une proximité avec le Prophète ﷺ au Paradis', 'en': 'Nearness to the Prophet ﷺ in Paradise'},
 'aya': A('', [(93, 9), (93, 10)]),
 'had': [
  H(HD('أنا وكافل اليتيم في الجنة', 'انا وكافل اليتيم', ('سهل بن سعد', 'سهل'), '', None, None, 'البخاري'),
    'Sahl ibn Sa‘d', 'Sahl ibn Sa‘d',
    'كافلُ اليتيم هو القائم بأمره من نفقةٍ وتربيةٍ ورعاية، وله منزلةٌ قريبة من النبيّ ﷺ في الجنة. وأشار ﷺ بالسبابة والوسطى مبيّنًا قربَهما.',
    'Le tuteur de l’orphelin est celui qui s’occupe de lui : dépenses, éducation, soin. Il a un rang proche du Prophète ﷺ au Paradis. Le Prophète ﷺ a montré l’index et le majeur pour illustrer cette proximité.',
    'The orphan’s guardian is the one who looks after him: expenses, upbringing, care. He has a rank close to the Prophet ﷺ in Paradise. The Prophet ﷺ pointed with his index and middle fingers to show how close.'),
  H(HD('كافل اليتيم له أو لغيره', 'كافل اليتيم له او لغيره', ('أبي هريرة', 'هريره'), '', None, None, 'مسلم'),
    'Abu Hurayra', 'Abu Hurayrah',
    'معنى «له أو لغيره»: أن يكون اليتيمُ قريبًا له أو أجنبيًّا عنه، فالأجر ثابتٌ في الحالين.',
    'Le sens de « pour lui ou pour un autre » : l’orphelin peut être un proche ou un étranger, la récompense est établie dans les deux cas.',
    'The meaning of “for himself or for another”: the orphan may be a relative or a stranger; the reward holds in both cases.'),
 ],
 'steps': {
  'ar': ['ساهم في كفالة يتيمٍ عبر جهةٍ موثوقةٍ ومرخَّصة.', 'ساعد في مصاريف دراسة يتيمٍ تعرفه أو علاجه.', 'عامل اليتيم بلطفٍ وأكرمه في الأعياد والمناسبات.', 'إن لم تستطع الكفالة فدُلَّ عليها من يستطيع وادعُ لهم.'],
  'fr': ['Contribuez à la prise en charge d’un orphelin par un organisme fiable et agréé.', 'Aidez à payer les études ou les soins d’un orphelin que vous connaissez.', 'Traitez l’orphelin avec douceur et honorez-le lors des fêtes.', 'Si vous ne pouvez pas le prendre en charge, orientez quelqu’un qui le peut et invoquez pour eux.'],
  'en': ['Contribute to sponsoring an orphan through a trustworthy, licensed organisation.', 'Help pay for the schooling or treatment of an orphan you know.', 'Treat the orphan gently and honour them on festivals and occasions.', 'If you cannot sponsor, point someone who can to it and make du‘a for them.'],
 },
})

# ───────────────────────── ٦ الإصلاح بين الناس
DOORS.append({
 'id': 'islah',
 'ic': '<path d="M4 14l4-4 3 3 5-6 4 4M4 20h16"/>',
 'ti': {'ar': 'الإصلاح بين الناس', 'fr': 'Réconcilier les gens', 'en': 'Making peace between people'},
 'sub': {'ar': 'أن تُقرِّب قلبَين تباعدا', 'fr': 'Rapprocher deux cœurs qui se sont éloignés', 'en': 'Bringing two hearts back together'},
 'aya': A('', [(49, 10)]),
 'had': [
  H(HD('ليس الكذّاب الذي يصلح بين الناس', 'ليس الكذاب الذي يصلح بين الناس', ('أمّ كلثوم بنت عقبة', 'كلثوم', 'عنها'), '', 'ليس الكذاب الذي يصلح بين الناس', 'أو يقول خيرا'),
    'Umm Kulthum bint ‘Uqba', 'Umm Kulthum bint ‘Uqbah',
    'من سعى للصلح بين الناس فنقل كلامًا طيّبًا أو قال خيرًا لتقريب القلوب فليس كذّابًا.',
    'Celui qui œuvre à la réconciliation en rapportant de bonnes paroles ou en disant du bien n’est pas un menteur.',
    'One who works for reconciliation by passing on good words or saying something good is not a liar.'),
  H(HD('اذهبوا بنا نُصلح بينهم', 'اذهبوا بنا نصلح بينهم', ('سهل بن سعد', 'سهل'), '', 'أن أهل قباء اقتتلوا', 'نصلح بينهم', 'البخاري'),
    'Sahl ibn Sa‘d', 'Sahl ibn Sa‘d',
    'سعى النبيُّ ﷺ بنفسه للإصلاح بين المتخاصمين.',
    'Le Prophète ﷺ a lui-même œuvré pour réconcilier des gens en conflit.',
    'The Prophet ﷺ himself went to make peace between people in dispute.'),
  H(HD('يعدل بين الاثنين صدقة', 'يعدل بين الاثنين صدقه', ('أبي هريرة', 'هريره'), '', 'كل سلامى من الناس', 'يعدل بين الاثنين صدقة'),
    'Abu Hurayra', 'Abu Hurayrah',
    'مقتطفٌ من حديثٍ أطول عن أبواب الصدقة؛ والعدلُ بين اثنين، والإصلاحُ بينهما بالعدل، صدقة.',
    'Extrait d’un hadith plus long sur les portes de l’aumône ; être équitable entre deux personnes, ou les réconcilier avec justice, est une aumône.',
    'An excerpt from a longer hadith about the doors of charity; being fair between two people, or reconciling them with justice, is charity.'),
 ],
 'steps': {
  'ar': ['اجمع بين متخاصمَين بكلمةٍ طيّبةٍ لا تزيد الخلافَ اشتعالًا.', 'لا تنقل كلامًا يُوغر الصدور، وانقل ما يقرّب.', 'ابدأ أنت بالسلام والصلح إن كان بينك وبين أحدٍ خصومة.', 'اطلب العدل بين الطرفين ولا تتحيّز.'],
  'fr': ['Rapprochez deux personnes en conflit par une bonne parole qui n’attise pas la dispute.', 'Ne rapportez pas ce qui envenime les cœurs ; rapportez ce qui rapproche.', 'Si vous avez un différend avec quelqu’un, commencez vous-même par le salut et la réconciliation.', 'Cherchez l’équité entre les deux parties sans prendre parti.'],
  'en': ['Bring two people in conflict together with a kind word that does not inflame the dispute.', 'Do not relay what poisons hearts; relay what brings them closer.', 'If you are in a dispute with someone, begin with the greeting and reconciliation yourself.', 'Seek fairness between both sides without taking sides.'],
 },
})

# ───────────────────────── النصوص الواجهة
UI = {
 'ar': {'dir': 'rtl', 'back': 'العودة', 'title': 'أبواب الخير', 'sub': 'أعمالٌ بسيطة تفتح لك أبواب الأجر — ابدأ اليوم بباب واحد.',
        'today': 'اليوم', 'of': 'من', 'doorsDone': 'أبوابٌ أُنجزت', 'open': 'افتح', 'verses': 'من القرآن', 'hadith': 'من السنّة', 'meaning': 'المعنى',
        'steps': 'اقتراحات عمليّة', 'stepsNote': 'اقتراحاتٌ عمليّةٌ من اجتهاد التطبيق، وليست نصًّا شرعيًّا.',
        'did': 'فعلتُها اليوم ✓', 'undo': 'تراجع', 'month': 'أيّام هذا الشهر', 'streak': 'أيّامٌ متتالية',
        'foot': 'نصوص الأحاديث منقولةٌ من «صحيح البخاريّ» و«صحيح مسلم» نصًّا، ونصُّ الآيات من مصحف المدينة (برواية حفص). والشرح والاقتراحات اجتهادٌ مختصَر لا يغني عن أهل العلم. ما تسجّله هنا محفوظٌ على هاتفك فقط، ولا يُرسَل إلى أحد.',
        'by': {'both': 'متّفقٌ عليه', 'bukhari': 'رواه البخاري', 'muslim': 'رواه مسلم'}, 'narrator': 'الراوي', 'ref': 'سورة'},
 'fr': {'dir': 'ltr', 'back': 'Retour', 'title': 'Portes du bien', 'sub': 'De petits gestes qui ouvrent des portes de récompense — commencez aujourd’hui par une seule porte.',
        'today': 'Aujourd’hui', 'of': 'sur', 'doorsDone': 'portes accomplies', 'open': 'Ouvrir', 'verses': 'Du Coran', 'hadith': 'De la Sunna', 'meaning': 'Sens',
        'steps': 'Idées concrètes', 'stepsNote': 'Suggestions de l’application pour passer à l’action ; ce n’est pas un texte religieux.',
        'did': 'Je l’ai fait aujourd’hui ✓', 'undo': 'Annuler', 'month': 'jours ce mois-ci', 'streak': 'jours consécutifs',
        'foot': 'Les textes des hadiths sont repris tels quels du Sahih al-Bukhari et du Sahih Muslim ; les versets viennent du Mushaf de Médine (Hafs). Les explications et suggestions sont un effort personnel résumé qui ne remplace pas les savants. Ce que vous cochez reste uniquement sur votre téléphone et n’est jamais envoyé.',
        'by': {'both': 'Muttafaqun ‘alayh (Bukhari et Muslim)', 'bukhari': 'Rapporté par al-Bukhari', 'muslim': 'Rapporté par Muslim'}, 'narrator': 'Rapporteur', 'ref': 'Sourate'},
 'en': {'dir': 'ltr', 'back': 'Back', 'title': 'Doors of Goodness', 'sub': 'Simple deeds that open doors of reward — start today with just one door.',
        'today': 'Today', 'of': 'of', 'doorsDone': 'doors done', 'open': 'Open', 'verses': 'From the Quran', 'hadith': 'From the Sunnah', 'meaning': 'Meaning',
        'steps': 'Practical ideas', 'stepsNote': 'Suggestions from the app to put it into practice; not a religious text.',
        'did': 'Done today ✓', 'undo': 'Undo', 'month': 'days this month', 'streak': 'days in a row',
        'foot': 'Hadith texts are copied verbatim from Sahih al-Bukhari and Sahih Muslim; verses are from the Madinah Mushaf (Hafs). Explanations and suggestions are a brief personal effort and do not replace scholars. What you tick here stays on your phone only and is never sent.',
        'by': {'both': 'Agreed upon (Bukhari and Muslim)', 'bukhari': 'Narrated by al-Bukhari', 'muslim': 'Narrated by Muslim'}, 'narrator': 'Narrator', 'ref': 'Surah'},
}

def nbsp(x):   # الفرنسيّة: مسافةٌ لا تنكسر داخل « » وقبل : ; ? !
    return re.sub(r' ([:;?!»])', '\u00a0\\1', x.replace('« ', '«\u00a0'))
for d in DOORS:
    for h in d['had']: h['m']['fr'] = nbsp(h['m']['fr'])
    d['steps']['fr'] = [nbsp(x) for x in d['steps']['fr']]
    d['ti']['fr'] = nbsp(d['ti']['fr']); d['sub']['fr'] = nbsp(d['sub']['fr'])
for k in ('sub', 'foot', 'stepsNote'): UI['fr'][k] = nbsp(UI['fr'][k])

DATA = {'ui': UI, 'doors': DOORS}
tpl = open(os.path.join(ROOT, 'tools', 'khayr-template.html'), encoding='utf-8').read()
out = tpl.replace('/*__DATA__*/null', json.dumps(DATA, ensure_ascii=False))
open(os.path.join(ROOT, 'khayr.html'), 'w', encoding='utf-8').write(out)
print('khayr.html:', len(DOORS), 'أبواب،', sum(len(d['had']) for d in DOORS), 'حديثًا،', len(out.encode()) // 1024, 'كيلوبايت')
