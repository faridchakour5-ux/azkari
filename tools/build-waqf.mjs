#!/usr/bin/env node
/* صلاتي — يولّد صفحة «الوقف والابتداء» المستقلّة (waqf.html) من هذا الملفّ.
 *
 *   node tools/build-waqf.mjs
 *
 * الصفحةُ مستقلّةٌ تمامًا عن «الورد» (لا تُحمِّل ملفّاتِ المصحف ولا تعدّل شيئًا في التطبيق ولا في إعداداته):
 * تقرأ من az_settings الخلفيّةَ ولغةَ الواجهة ولونَ القرآن قراءةً فقط.
 * أمثلةُ القرآن تُقتطَع حرفيًّا من نصّ التطبيق (wird_hafs.js / wird_warsh.js) وقت التوليد، ويُتحقَّق أنّ العلامةَ موجودةٌ فيها،
 * فلا تُكتب آيةٌ باليد ولا يُغيَّر حرفٌ منها. ويُحسَب عددُ العلامات من النصّ نفسه.
 * المصادر: ابن الجزري (النشر / المقدّمة) عن إسلام ويب؛ كتارا؛ إسلام ويب (الهبطي)؛ إدريس ريمي. وما لم يُتحقَّق منه لم يُكتب. */
import fs from 'node:fs';
import vm from 'node:vm';

const load = f => { const w = {}; vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: w }); return w.WIRD_HAFS || w.WIRD_WARSH || w.WIRD; };
const HAFS = load('wird_hafs.js'), WARSH = load('wird_warsh.js');
const verse = (W, s, v) => String(W.a[W.sur[s - 1].i + v - 1].t).replace(/ {2,}/g, ' ').trim();
const suraName = (W, s) => W.sur[s - 1].n;

/* مقطعٌ حرفيّ حول العلامة: tokens قبلها وبعدها */
function seg(W, s, v, sign, { nth = 0, before = 3, after = 3, whole = false } = {}) {
  const toks = verse(W, s, v).split(' ');
  let seen = -1, at = -1;
  toks.forEach((t, i) => { if (t.includes(sign)) { seen++; if (seen === nth && at < 0) at = i; } });
  if (at < 0) throw new Error(`لا علامة ${sign} في ${s}:${v}`);
  const a = whole ? 0 : Math.max(0, at - before + 1), b = whole ? toks.length : Math.min(toks.length, at + after + 1);
  return { t: toks.slice(a, b).join(' '), pre: a > 0, post: b < toks.length, ref: `${s}:${v}`, sura: suraName(W, s) };
}

const S = { m: 'ۘ', la: 'ۙ', j: 'ۚ', sl: 'ۖ', ql: 'ۗ', mu: 'ۛ', sk: 'ۜ' };
const H = (s, v, sign, o) => seg(HAFS, s, v, sign, o), Wr = (s, v, sign, o) => seg(WARSH, s, v, sign, o);

const EX = {
  m:  [H(6, 36, S.m), H(10, 65, S.m)],
  j:  [H(2, 26, S.j), H(2, 253, S.j), H(10, 65, S.j)],
  sl: [H(2, 26, S.sl), H(29, 26, S.sl)],
  ql: [H(2, 118, S.ql), H(2, 212, S.ql), H(5, 51, S.ql)],
  mu: [H(2, 2, S.mu, { whole: true }), H(5, 26, S.mu, { before: 3, after: 4 })],
  sk: [H(18, 1, S.sk, { before: 3, after: 0 }), H(36, 52, S.sk, { before: 2, after: 3 }), H(75, 27, S.sk, { before: 2, after: 2 }), H(83, 14, S.sk, { before: 2, after: 2 })],
  /* مقارنة حفص ↔ ورش: الآيةُ نفسُها، وترقيمُ كلٍّ من نصّه في التطبيق */
  cmp: [
    { h: H(10, 65, S.m, { whole: true }), w: Wr(10, 65, 'ۖ', { whole: true }) },
    { h: H(6, 36, S.m, { whole: true }), w: Wr(6, 37, 'ۖ', { whole: true }) },
    { h: H(2, 2, S.mu, { whole: true }), w: Wr(2, 1, 'ۖ', { whole: true, nth: 0 }) },
  ],
  /* أنواع الوقف */
  tam: H(2, 5, S.sl, { whole: true }),
};
const countWarsh = [...WARSH.a.map(a => a.t).join('')].filter(c => c === 'ۖ').length;
const nHafs = HAFS.a.length, nWarsh = WARSH.a.length;
console.log('أمثلة:', Object.values(EX).flat().length, '· علامات ورش:', countWarsh, '· آيات:', nHafs, nWarsh);

const SIGN_NOTE_NOLA = !HAFS.a.some(a => a.t.includes(S.la));   // «لا» غائبةٌ عن نصّ التطبيق؟
if (!SIGN_NOTE_NOLA) throw new Error('علامة «لا» صارت موجودةً في نصّ حفص: حدّث الصفحة بمثالٍ منها');

/* ───────────────────────── النصوص (عربيّ / فرنسيّ / إنجليزيّ) ───────────────────────── */
const T = {
  ar: {
    dir: 'rtl', lang: 'ar', qrT: 'حمِّل التطبيق من Google Play', back: 'العودة', title: 'الوقف والابتداء',
    sub: 'كيف تقرأ القرآنَ: أين تقف، وأين تصل، وأين تبدأ — برواية حفص وورش',
    tabs: ['حفص', 'ورش', 'قواعد عامّة'],
    introT: 'ما الوقف والابتداء؟',
    intro1: 'الوقف: قطعُ الصوت عند آخر الكلمة زمنًا يتنفّس فيه القارئ عادةً، بنيّة استئناف القراءة. والابتداء: أن تستأنف القراءةَ بعده. وبهما يسلم المعنى، فلا يُقطع الكلامُ حيث يُوهِم غيرَ المراد.',
    intro2: 'والعلاماتُ الصغيرة فوق الكلمات ليست من القرآن؛ وضعها أهلُ العلم تيسيرًا على القارئ، وهي اجتهاداتٌ تختلف مواضعُها من مصحفٍ إلى آخر. فهذه الصفحة للتعلّم، ولا تُغني عن التلقّي من معلّمٍ متقن.',
    ruling: 'الحكم', meaning: 'المعنى', examples: 'من المصحف', why: 'لماذا؟', sura: 'سورة',
    hafsLead: 'هذه علاماتُ مصحف المدينة (مجمع الملك فهد) التي يعتمدها نصُّ حفص في التطبيق. لكلّ علامةٍ اسمُها ومعناها وحكمُ الوقف عندها، ومعها أمثلةٌ مقتطعةٌ حرفيًّا من المصحف.',
    signs: {
      m: { name: 'الوقف اللازم', badge: 'يتأكّد الوقف', cls: 'must', mean: 'موضعٌ لو وُصل فيه الكلامُ بما بعده لأوهم معنًى غيرَ مراد؛ فيتأكّد الوقفُ عنده، ثم الابتداءُ بما بعده.',
        why: ['لو وصلتَ «يسمعون» بـ«والموتى» لأوهم أنّ الموتى يستجيبون مع السامعين، والمراد أنّ الله يبعثهم.', 'لو وصلتَ «قولهم» بـ«إنّ العزّة لله جميعًا» لأوهم أنّ هذا من قولهم، وهو كلامٌ جديدٌ من الله تعالى.'],
        note: 'و«اللازم» هنا تأكيدٌ لسلامة المعنى لا فرضٌ شرعيّ؛ قال ابن الجزري: «وليس في القرآنِ مِن وقفٍ وجبْ * ولا حرامٍ غيرَ ما له سببْ».' },
      la: { name: 'الوقف الممنوع', badge: 'لا يُوقَف عندها', cls: 'no', mean: 'لا يتمّ المعنى عندها، فتُوصَل الكلمةُ بما بعدها. فإن اضطُرّ القارئ (كانقطاع النَّفَس) وقف، ثم رجع فابتدأ من كلمةٍ قبلها يصحّ بها المعنى.',
        note: 'هذا الرمز مستعملٌ في مصحف المدينة المطبوع، لكنّه لا يظهر في نصّ حفص الموجود في التطبيق، فلا نعرض له مثالًا من المصحف.' },
      j: { name: 'الوقف الجائز', badge: 'يجوز الوقف والوصل', cls: 'ok', mean: 'الوقف والوصل عندها سواء.' },
      sl: { name: 'الوصل أولى', badge: 'يجوز الوقف والوصل أولى', cls: 'ok', mean: 'يجوز الوقف عندها، لكنّ الوصل أولى منه.' },
      ql: { name: 'الوقف أولى', badge: 'يجوز الوصل والوقف أولى', cls: 'pref', mean: 'يجوز الوصل عندها، لكنّ الوقف أولى منه.' },
      mu: { name: 'المعانقة', badge: 'يُوقَف عند إحداهما لا كلتيهما', cls: 'ok', mean: 'علامتان متقابلتان في الجملة نفسها (وتسمّى أيضًا المراقبة): إن وقفتَ عند إحداهما فصِلْ عند الأخرى؛ ولك أن تصل فيهما جميعًا، ولا تقف عليهما معًا.' },
      sk: { name: 'السكتة', badge: 'سكتٌ لا وقف', cls: 'sakt', mean: 'قطعُ الصوت زمنًا يسيرًا دون تنفّس، ثم استئنافُ القراءة مباشرة. تُرى في المواضع الأربعة المشهورة لحفص.',
        note: 'وتُرى (س) كذلك في «مَالِيَهْ ۜ هَلَكَ» (الحاقة 28–29)، وهو موضعٌ اختلف المقرئون في وجه القراءة فيه. ووُضعت (س) صغيرةً فوق الصاد داخل كلماتٍ (البقرة 245، الأعراف 69، الطور 37)، وهذه ليست سكتة. وفي ذلك كلّه اسأل معلّمَ القراءة.' },
    },
    warshLead: 'لمصحف ورش المغربي نظامٌ آخر في الوقف. يعتمد المغاربةُ «وقفَ الهبطي»، نسبةً إلى الإمام محمد بن أبي جمعة الهبطي (ت 930هـ)، وقد طُبعت به مصاحفُ ورش وقالون.',
    oneSignT: 'علامةٌ واحدة', oneSign: ['في نصّ ورش داخل التطبيق علامةُ وقفٍ واحدةٌ هي', `(${countWarsh} موضعًا)، تُوضَع عند مواضع الوقف التي يعتمدها المغاربة (وقف الهبطي). فهي لا تفرّق بين لازمٍ وجائز، ولا بين تامٍّ وكافٍ وحسن، وليس معها علامةُ منعٍ. وهذا ما ذكره أهلُ الاختصاص عن المصاحف المغربية، وقد تختلف الطبعاتُ في بعض المواضع.`],
    howT: 'كيف تقرأ بها؟',
    how: [
      'الوقف عند العلامة سائغ، والوقف على رأس الآية سنّة (انظر «قواعد عامّة»).',
      'راعى الهبطيُّ رؤوسَ الآي، وفي الآيات الطويلة الكلماتِ التي يتمّ عندها المعنى أو الإعراب أو أحدُهما؛ فتتنوّع وقوفُه بين التامّ والكافي والحسن. فإذا وقفتَ عند علامةٍ فانظر: هل يصحّ أن تبتدئ بما بعدها؟ (انظر قاعدة الابتداء).',
      'ليس في هذا المصحف علامةٌ تمنع الوقف، فاحذر أن تقف حيث لا علامةَ إن كان ذلك يُفسد المعنى.',
      'وقد انتقد بعضُ أهل العلم عددًا قليلًا من وقوفه؛ فإن أشكل عليك موضعٌ فاسأل معلّمك.',
    ],
    cmpT: 'الآيةُ نفسُها في الروايتين', cmpH: 'حفص', cmpW: 'ورش',
    cmpNote: ['عند «قولهم»: في حفص (م) وقفٌ لازم، وفي ورش علامةُ الوقف الواحدة؛ وعند «جميعًا»: (ج) في حفص، وعلامتُها الواحدةُ في ورش.', 'عند «يسمعون»: في حفص (م) لازم لئلّا يُوهَم أنّ الموتى يستجيبون، وفي ورش علامةُ الوقف نفسُها في الموضع نفسه.', 'في حفص علامتا المعانقة عند «ريب» و«فيه»؛ وفي ورش علامةٌ واحدةٌ بعد «ريب» فقط.'],
    numNote: 'ترقيمُ الآيات يختلف بين الروايتين (مثلًا آيةُ الأنعام 36 في حفص هي 37 في ورش، وفاتحةُ البقرة آيةٌ واحدة في ورش)، وهنا ما في نصّ كلٍّ منهما في التطبيق.',
    diffT: 'الفرق بين المصحفين',
    diff: [
      ['الاصطلاح', 'علاماتُ مصحف المدينة', 'وقفُ الهبطي (المغرب)'],
      ['عدد العلامات', 'سبع: م، لا، ج، صلى، قلى، المعانقة، السكتة', 'علامةٌ واحدة (ۖ)'],
      ['اللازم والممنوع', 'لهما علامتان (م، لا)', 'لا علامة لهما'],
      ['السكتة', 'أربعة مواضع مشهورة بعلامة (س)', 'لا علامةَ لها في نصّ ورش'],
      ['عدد الآيات في التطبيق', String(nHafs), String(nWarsh)],
    ],
    diffH: 'حفص', diffW: 'ورش',
    rulesT: 'أنواع الوقف',
    rulesLead: 'قسّم ابنُ الجزري الوقفَ أربعةَ أنواع بحسب تعلّق ما بعده بما قبله. والأمثلةُ هنا توضيحيّةٌ تطابق التعريفات؛ أمّا الحكمُ الدقيق على موضعٍ بعينه فيُرجَع فيه إلى المعلّم والمصحف المضبوط:',
    types: [
      { n: 'التامّ', c: 'good', d: 'لا تعلّق له بما بعده، لا في اللفظ ولا في المعنى. يُوقَف عليه ويُبتدأ بما بعده.', e: 'مثالٌ توضيحيّ: «وأولئك هم المفلحون» (البقرة 5): تمّ الكلام وبدأ كلامٌ جديد.' },
      { n: 'الكافي', c: 'good', d: 'يتعلّق بما بعده في المعنى فقط لا في اللفظ. يجوز الوقف عليه والابتداءُ بما بعده.', e: 'مثالٌ توضيحيّ: نهاية «لَا يُؤْمِنُونَ» (البقرة 6) ثمّ «خَتَمَ اللَّهُ…» (البقرة 7): اتّصالٌ في المعنى لا في اللفظ.' },
      { n: 'الحسن', c: 'mid', d: 'يتعلّق بما بعده في اللفظ والمعنى. يجوز الوقف عليه، ولا يُبتدأ بما بعده إلا إن كان رأسَ آية.', e: 'مثالٌ توضيحيّ: «الْحَمْدُ لِلَّهِ» (الفاتحة 2) تتعلّق بـ«ربّ العالمين» لفظًا، فلا تبدأ بـ«ربّ العالمين».' },
      { n: 'القبيح', c: 'bad', d: 'لا يتمّ معه الكلام. لا يجوز تعمّدُه إلا لضرورةٍ كانقطاع النَّفَس.', e: 'مثالٌ توضيحيّ: الوقف على «بِسْمِ» من «بِسْمِ اللَّهِ».' },
    ],
    startT: 'كيف تبتدئ بعد الوقف؟',
    start: ['بعد الوقف التامّ والكافي: ابتدئ بما بعد الموضع مباشرة.', 'بعد الوقف الحسن: لا تبتدئ بما بعده (إلا إن كان رأسَ آية)؛ ارجع إلى أوّل الكلام المتّصل.', 'بعد وقف الاضطرار (انقطاع النَّفَس): ارجع إلى كلمةٍ قبل موضع الوقف يصحّ بها الابتداء، ثم أكمل.', 'لا تبتدئ بكلمةٍ يتغيّر بها المعنى أو يُوهَم خلافُ المراد.'],
    joinT: 'متى تَصِل؟',
    join: ['عند علامة (لا) الممنوعة.', 'حيث لا يتمّ المعنى (الوقف القبيح)، إلا لضرورة.', 'عند علامة (صلى): الوصل أولى.'],
    saktT: 'سكتاتُ حفص الأربع', saktLead: 'السكتة: قطعُ الصوت زمنًا يسيرًا دون تنفّس. وهي في رواية حفص عن عاصم في أربعة مواضع، وعلامتُها (س) في مصحف المدينة. ولا علامةَ لها في نصّ ورش.',
    saktEx: [['الكهف 1–2', 'بعد «عِوَجًا» قبل «قَيِّمًا»'], ['يس 52', 'بعد «مَرْقَدِنَا» قبل «هَٰذَا»'], ['القيامة 27', 'بعد «مَنْ» قبل «رَاقٍ»'], ['المطفّفين 14', 'بعد «بَلْ» قبل «رَانَ»']],
    endT: 'الوقف على رأس الآية سنّة',
    end: ['قال ابن الجزري في «النشر»: «الوقف على رؤوس الآيات سنّة مطلقًا».', 'وروت أمّ سلمة رضي الله عنها أنّه ﷺ كان يقطّع قراءته آيةً آية (رواه أبو داود 4001 والترمذي 2927 وأحمد، وصحّحه الألباني).', 'ويُرجَّح عند جمعٍ من أهل العلم اتّباعُ هديه ﷺ ولو تعلّقت الآيةُ بما بعدها.'],
    noRuleT: 'قاعدةٌ تحفظ الميزان', noRule: 'العلامات والأقسام وسائلُ لسلامة المعنى؛ و«ليس في القرآن من وقفٍ وجبْ * ولا حرامٍ غيرَ ما له سببْ» — فالسببُ هو فسادُ المعنى لا مجرّدُ وجود العلامة.',
    srcT: 'المراجع', srcNote: 'أُعدّت الصفحة من هذه المراجع، وأمثلةُ القرآن مقتطعةٌ حرفيًّا من نصّ التطبيق. وإن وجدتَ خطأً فراسلنا:',
    src: [['ابن الجزري، «النشر» و«المقدّمة» — عن فتوى إسلام ويب 95786', 'https://www.islamweb.net/ar/fatwa/95786'], ['وقف الهبطي — فتوى إسلام ويب 58999', 'https://www.islamweb.net/ar/fatwa/58999'], ['علامات الوقف — جائزة كتارا لتلاوة القرآن', 'https://kataraquran.com/%D8%B9%D9%84%D8%A7%D9%85%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D9%82%D9%81/'], ['إدريس ريمي، «الوقف الهبطي في المصحف المغربي»، مجلة البحوث والدراسات (جامعة الوادي) 2017', 'https://archives.univ-eloued.dz/items/2584c0d3-0b6e-4c3f-bea0-a165949f76a2']],
  },
  fr: {
    dir: 'ltr', lang: 'fr', qrT: 'Téléchargez l’application sur Google Play', back: 'Retour', title: 'Arrêts et reprises',
    sub: 'Comment lire le Coran : où s’arrêter, où enchaîner, où reprendre — Hafs et Warsh',
    tabs: ['Hafs', 'Warsh', 'Règles générales'],
    introT: 'Qu’est-ce que le waqf et l’ibtidâ’ ?',
    intro1: 'Le waqf est l’interruption de la voix à la fin d’un mot, le temps de reprendre son souffle, avec l’intention de continuer la récitation. L’ibtidâ’ est la reprise après cet arrêt. Ils servent à préserver le sens : on ne coupe pas la phrase là où cela ferait entendre autre chose que le sens voulu.',
    intro2: 'Les petits signes au-dessus des mots ne font pas partie du Coran : des savants les ont ajoutés pour aider le lecteur, ce sont des choix d’interprétation dont les emplacements varient d’un mushaf à l’autre. Cette page sert à apprendre ; elle ne remplace pas un maître de récitation.',
    ruling: 'Règle', meaning: 'Sens', examples: 'Dans le mushaf', why: 'Pourquoi ?', sura: 'Sourate',
    hafsLead: 'Voici les signes du mushaf de Médine (Complexe du Roi Fahd), utilisés par le texte Hafs de l’application. Pour chacun : son nom, son sens, la règle de l’arrêt, et des exemples extraits tels quels du mushaf.',
    signs: {
      m: { name: 'Arrêt obligatoire (waqf lâzim)', badge: 'Arrêt fortement indiqué', cls: 'must', mean: 'Endroit où, si l’on enchaîne, on ferait entendre un sens qui n’est pas voulu ; l’arrêt est donc fortement indiqué, puis on reprend à ce qui suit.',
        why: ['Enchaîner « yasma‘ûn » avec « wal-mawtâ » ferait croire que les morts répondent avec ceux qui entendent ; le sens est que Dieu les ressuscitera.', 'Enchaîner « qawluhum » avec « inna l-‘izzata lillâhi jamî‘an » ferait croire que c’est leur parole ; c’est une parole nouvelle de Dieu.'],
        note: '« Lâzim » désigne ici un arrêt qui protège le sens, pas une obligation légale ; Ibn al-Jazarî dit : « Il n’y a dans le Coran aucun arrêt obligatoire ni interdit, hormis ceux qui ont une cause. »' },
      la: { name: 'Arrêt interdit', badge: 'Ne pas s’arrêter', cls: 'no', mean: 'Le sens n’est pas complet ici : on enchaîne avec le mot suivant. Si le lecteur y est contraint (souffle coupé), il s’arrête, puis reprend à un mot précédent qui permet de reprendre correctement.',
        note: 'Ce signe est utilisé dans le mushaf imprimé de Médine, mais il n’apparaît pas dans le texte Hafs de l’application ; nous n’en donnons donc pas d’exemple.' },
      j: { name: 'Arrêt permis', badge: 'Arrêt et liaison permis', cls: 'ok', mean: 'S’arrêter ou enchaîner ici revient au même.' },
      sl: { name: 'Liaison préférable', badge: 'Arrêt permis, liaison préférable', cls: 'ok', mean: 'On peut s’arrêter ici, mais enchaîner est préférable.' },
      ql: { name: 'Arrêt préférable', badge: 'Liaison permise, arrêt préférable', cls: 'pref', mean: 'On peut enchaîner ici, mais s’arrêter est préférable.' },
      mu: { name: 'Mu‘ânaqa (signes jumelés)', badge: 'S’arrêter à l’un des deux, pas aux deux', cls: 'ok', mean: 'Deux signes qui se répondent dans la même phrase (aussi appelés murâqaba) : si l’on s’arrête à l’un, on enchaîne à l’autre ; on peut aussi enchaîner aux deux, mais pas s’arrêter aux deux.' },
      sk: { name: 'Saktah (silence bref)', badge: 'Silence, pas un arrêt', cls: 'sakt', mean: 'Interruption très brève de la voix, sans reprendre son souffle, puis reprise immédiate. On la voit aux quatre endroits connus de Hafs.',
        note: 'Le signe (س) apparaît aussi sur « mâliyah ۜ halak » (Al-Hâqqa 28–29) dans le mushaf de Médine, endroit où les maîtres de récitation diffèrent sur la façon de lire. Un petit (س) est aussi posé sur le ṣâd à l’intérieur de mots (Al-Baqara 245, Al-A‘râf 69, Aṭ-Ṭûr 37) : ce n’est pas une saktah. Pour tout cela, demandez à votre maître.' },
    },
    warshLead: 'Le mushaf marocain de Warsh a un autre système d’arrêts. Les Marocains suivent le « waqf d’al-Habṭî », du nom de l’imam Muḥammad ibn Abî Jum‘a al-Habṭî (m. 930 H) ; des mushafs de Warsh et de Qâlûn ont été imprimés avec ce système.',
    oneSignT: 'Un seul signe', oneSign: ['Dans le texte Warsh de l’application, il n’y a qu’un seul signe d’arrêt :', `(${countWarsh} endroits), placé aux arrêts que suivent les Marocains (waqf d’al-Habṭî). Il ne distingue ni obligatoire/permis, ni complet/suffisant/bon, et aucun signe n’interdit l’arrêt. C’est ce que rapportent les spécialistes à propos des mushafs marocains ; les éditions peuvent différer en certains endroits.`],
    howT: 'Comment lire avec ?',
    how: [
      'S’arrêter à un signe est permis ; s’arrêter en fin de verset est une sunna (voir « Règles générales »).',
      'Al-Habṭî a tenu compte des fins de verset et, dans les versets longs, des mots où le sens ou la syntaxe (ou l’un des deux) est complet : ses arrêts sont donc de types variés (complet, suffisant, bon). Si vous vous arrêtez à un signe, demandez-vous s’il est correct de reprendre à ce qui suit (voir la règle de la reprise).',
      'Ce mushaf n’a aucun signe interdisant l’arrêt : évitez de vous arrêter là où il n’y a pas de signe si cela altère le sens.',
      'Certains savants ont critiqué un petit nombre de ses arrêts ; en cas de doute sur un endroit, demandez à votre maître.',
    ],
    cmpT: 'Le même verset dans les deux récitations', cmpH: 'Hafs', cmpW: 'Warsh',
    cmpNote: ['À « qawluhum » : (م) arrêt obligatoire en Hafs, le signe unique en Warsh ; à « jamî‘an » : (ج) en Hafs, le signe unique en Warsh.', 'À « yasma‘ûn » : (م) en Hafs pour ne pas laisser croire que les morts répondent ; en Warsh, le signe d’arrêt au même endroit.', 'En Hafs, les deux signes mu‘ânaqa sont à « rayb » et « fîhi » ; en Warsh, un seul signe, après « rayb ».'],
    numNote: 'La numérotation des versets diffère entre les deux récitations (par ex. Al-An‘âm 36 en Hafs est 37 en Warsh, et l’ouverture d’Al-Baqara est un seul verset en Warsh) ; on indique ici celle du texte de chacune dans l’application.',
    diffT: 'Différences entre les deux mushafs',
    diff: [
      ['Système', 'Signes du mushaf de Médine', 'Waqf d’al-Habṭî (Maroc)'],
      ['Nombre de signes', 'Sept : م، لا، ج، صلى، قلى، mu‘ânaqa, saktah', 'Un seul (ۖ)'],
      ['Obligatoire / interdit', 'Deux signes (م، لا)', 'Aucun signe'],
      ['Saktah', 'Quatre endroits connus, signe (س)', 'Pas de signe dans le texte Warsh'],
      ['Versets dans l’application', String(nHafs), String(nWarsh)],
    ],
    diffH: 'Hafs', diffW: 'Warsh',
    rulesT: 'Les types d’arrêt',
    rulesLead: 'Ibn al-Jazarî distingue quatre types d’arrêt selon le lien entre ce qui suit et ce qui précède. Les exemples ci-dessous sont illustratifs et suivent les définitions ; pour le jugement précis d’un endroit donné, référez-vous à un maître et à un mushaf annoté :',
    types: [
      { n: 'Complet (tâmm)', c: 'good', d: 'Aucun lien avec ce qui suit, ni dans les mots ni dans le sens. On s’arrête et on reprend à ce qui suit.', e: 'Exemple illustratif : « wa ulâ’ika humu l-mufliḥûn » (Al-Baqara 5) : la phrase est achevée et un propos nouveau commence.' },
      { n: 'Suffisant (kâfî)', c: 'good', d: 'Lié à ce qui suit par le sens seulement, pas par les mots. On peut s’arrêter et reprendre à ce qui suit.', e: 'Exemple illustratif : fin de « lâ yu’minûn » (Al-Baqara 6), puis « khatama llâhu… » (Al-Baqara 7) : lien par le sens, non par les mots.' },
      { n: 'Bon (ḥasan)', c: 'mid', d: 'Lié à ce qui suit par les mots et le sens. On peut s’arrêter, mais on ne reprend pas à ce qui suit, sauf si c’est une fin de verset.', e: 'Exemple illustratif : « al-ḥamdu lillâh » (Al-Fâtiḥa 2) est lié à « rabbi l-‘âlamîn » par les mots : on ne reprend pas à « rabbi l-‘âlamîn ».' },
      { n: 'Mauvais (qabîḥ)', c: 'bad', d: 'La phrase est inachevée. Il est interdit de s’y arrêter volontairement, sauf nécessité, comme un souffle coupé.', e: 'Exemple illustratif : s’arrêter sur « bismi » dans « bismi llâh ».' },
    ],
    startT: 'Comment reprendre après l’arrêt ?',
    start: ['Après un arrêt complet ou suffisant : reprenez directement à ce qui suit.', 'Après un arrêt « bon » : ne reprenez pas à ce qui suit (sauf fin de verset) ; revenez au début de la phrase liée.', 'Après un arrêt de nécessité (souffle coupé) : revenez à un mot précédent à partir duquel on peut reprendre, puis continuez.', 'Ne reprenez pas à un mot qui change le sens ou fait entendre autre chose que le sens voulu.'],
    joinT: 'Quand enchaîner ?',
    join: ['Au signe (لا), arrêt interdit.', 'Là où le sens n’est pas complet (arrêt « mauvais »), sauf nécessité.', 'Au signe (صلى) : l’enchaînement est préférable.'],
    saktT: 'Les quatre saktah de Hafs', saktLead: 'La saktah est une interruption très brève de la voix, sans reprendre son souffle. Dans la récitation de Hafs d’après ‘Âṣim, elle a lieu à quatre endroits, marqués (س) dans le mushaf de Médine. Il n’y a pas de signe pour elle dans le texte Warsh.',
    saktEx: [['Al-Kahf 1–2', 'après « ‘iwajâ », avant « qayyimâ »'], ['Yâ-Sîn 52', 'après « marqadinâ », avant « hâdhâ »'], ['Al-Qiyâma 27', 'après « man », avant « râq »'], ['Al-Muṭaffifîn 14', 'après « bal », avant « rân »']],
    endT: 'S’arrêter en fin de verset est une sunna',
    end: ['Ibn al-Jazarî dit dans « an-Nashr » : « S’arrêter aux fins de versets est une sunna, sans restriction. »', 'Umm Salama (qu’Allah l’agrée) rapporte que le Prophète ﷺ récitait en coupant verset par verset (rapporté par Abû Dâwûd 4001, at-Tirmidhî 2927 et Ahmad ; jugé authentique par al-Albânî).', 'Pour nombre de savants, suivre sa pratique ﷺ est préférable, même si le verset est lié à ce qui suit.'],
    noRuleT: 'Une règle pour garder l’équilibre', noRule: 'Les signes et les types sont des moyens de préserver le sens ; et « il n’y a dans le Coran aucun arrêt obligatoire ni interdit, hormis ceux qui ont une cause » : la cause est l’altération du sens, pas la seule présence d’un signe.',
    srcT: 'Références', srcNote: 'Cette page s’appuie sur ces références ; les exemples du Coran sont extraits tels quels du texte de l’application. Si vous trouvez une erreur, écrivez-nous :',
    src: [['Ibn al-Jazarî, « an-Nashr » et « al-Muqaddima » — d’après la fatwa Islamweb 95786', 'https://www.islamweb.net/ar/fatwa/95786'], ['Le waqf d’al-Habṭî — fatwa Islamweb 58999', 'https://www.islamweb.net/ar/fatwa/58999'], ['Signes d’arrêt — Prix Katara de récitation du Coran', 'https://kataraquran.com/%D8%B9%D9%84%D8%A7%D9%85%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D9%82%D9%81/'], ['Idris Rimi, « Le waqf d’al-Habṭî dans le mushaf marocain », Revue de recherches et d’études (Université d’El Oued) 2017', 'https://archives.univ-eloued.dz/items/2584c0d3-0b6e-4c3f-bea0-a165949f76a2']],
  },
  en: {
    dir: 'ltr', lang: 'en', qrT: 'Get the app on Google Play', back: 'Back', title: 'Stopping and starting',
    sub: 'How to recite the Quran: where to pause, where to continue, where to resume — Hafs and Warsh',
    tabs: ['Hafs', 'Warsh', 'General rules'],
    introT: 'What are waqf and ibtida’?',
    intro1: 'Waqf is cutting off the voice at the end of a word for the time it takes to breathe, intending to continue reciting. Ibtida’ is resuming after it. Together they protect the meaning: you do not break the sentence where it would suggest something other than what is meant.',
    intro2: 'The small marks above the words are not part of the Quran; scholars added them to help the reader, and they are judgement calls whose positions vary from one mushaf to another. This page is for learning and does not replace a qualified teacher.',
    ruling: 'Ruling', meaning: 'Meaning', examples: 'From the mushaf', why: 'Why?', sura: 'Surah',
    hafsLead: 'These are the marks of the Madinah mushaf (King Fahd Complex) used by the Hafs text in the app. For each: its name, its meaning, the ruling on stopping there, and examples taken verbatim from the mushaf.',
    signs: {
      m: { name: 'Obligatory stop (waqf lāzim)', badge: 'Stop is strongly advised', cls: 'must', mean: 'A place where joining the words would suggest a meaning that is not intended; so stopping is strongly advised, then you resume with what follows.',
        why: ['Joining “yasma‘ūn” to “wal-mawtā” would suggest that the dead respond along with those who hear; the meaning is that God will raise them.', 'Joining “qawluhum” to “inna l-‘izzata lillāhi jamī‘an” would suggest it is their saying; it is a new statement from God.'],
        note: '“Lāzim” here means a stop that protects the meaning, not a legal obligation; Ibn al-Jazarī says: “In the Quran there is no obligatory stop and no forbidden one, except where there is a cause.”' },
      la: { name: 'Forbidden stop', badge: 'Do not stop here', cls: 'no', mean: 'The meaning is not complete here, so you join the word to the next. If the reader is forced to (out of breath), they stop, then resume from an earlier word that makes the meaning correct.',
        note: 'This mark is used in the printed Madinah mushaf, but it does not appear in the Hafs text in the app, so we give no example of it.' },
      j: { name: 'Permissible stop', badge: 'Stopping and joining both allowed', cls: 'ok', mean: 'Stopping or joining here is equal.' },
      sl: { name: 'Joining is preferable', badge: 'Stop allowed, joining preferable', cls: 'ok', mean: 'You may stop here, but joining is preferable.' },
      ql: { name: 'Stopping is preferable', badge: 'Joining allowed, stopping preferable', cls: 'pref', mean: 'You may join here, but stopping is preferable.' },
      mu: { name: 'Mu‘ānaqa (paired marks)', badge: 'Stop at one of the two, not both', cls: 'ok', mean: 'Two marks that answer each other within the same sentence (also called murāqaba): if you stop at one, join at the other; you may also join at both, but not stop at both.' },
      sk: { name: 'Saktah (brief silence)', badge: 'A pause, not a stop', cls: 'sakt', mean: 'A very short cut in the voice without taking a breath, then you resume at once. It appears at the four well-known places of Hafs.',
        note: 'The mark (س) also appears on “māliyah ۜ halak” (Al-Hāqqa 28–29) in the Madinah mushaf, a place where reciters differ on how it is read. A small (س) is also placed on the ṣād inside some words (Al-Baqara 245, Al-A‘rāf 69, Aṭ-Ṭūr 37): that is not a saktah. For all this, ask your teacher.' },
    },
    warshLead: 'The Moroccan Warsh mushaf has a different system of stops. Moroccans follow the “waqf of al-Habṭī”, named after Imam Muḥammad ibn Abī Jum‘a al-Habṭī (d. 930 AH); some Warsh and Qālūn mushafs were printed with it.',
    oneSignT: 'A single mark', oneSign: ['In the Warsh text in the app there is only one stop mark:', `(${countWarsh} places), placed at the stops that Moroccans follow (the waqf of al-Habṭī). It does not distinguish obligatory from permissible, or complete from sufficient from good, and no mark forbids a stop. This is what specialists report about Moroccan mushafs; editions may differ in some places.`],
    howT: 'How to read with it',
    how: [
      'Stopping at the mark is allowed; stopping at the end of a verse is a sunnah (see “General rules”).',
      'Al-Habṭī took verse endings into account and, in long verses, the words where the meaning or the grammar (or one of them) is complete; so his stops vary in type (complete, sufficient, good). If you stop at a mark, ask yourself whether you can properly resume with what follows (see the resuming rule).',
      'This mushaf has no mark that forbids stopping, so avoid stopping where there is no mark if it would spoil the meaning.',
      'Some scholars have criticised a small number of his stops; if a place puzzles you, ask your teacher.',
    ],
    cmpT: 'The same verse in both recitations', cmpH: 'Hafs', cmpW: 'Warsh',
    cmpNote: ['At “qawluhum”: (م) obligatory stop in Hafs, the single mark in Warsh; at “jamī‘an”: (ج) in Hafs, the single mark in Warsh.', 'At “yasma‘ūn”: (م) in Hafs so it is not understood that the dead respond; in Warsh, the stop mark in the same place.', 'In Hafs the two mu‘ānaqa marks are at “rayb” and “fīhi”; in Warsh a single mark, after “rayb”.'],
    numNote: 'Verse numbering differs between the two recitations (for example Al-An‘ām 36 in Hafs is 37 in Warsh, and the opening of Al-Baqara is one verse in Warsh); here we give the numbering of each text as it is in the app.',
    diffT: 'Differences between the two mushafs',
    diff: [
      ['System', 'Madinah mushaf marks', 'Waqf of al-Habṭī (Morocco)'],
      ['Number of marks', 'Seven: م، لا، ج، صلى، قلى, mu‘ānaqa, saktah', 'One (ۖ)'],
      ['Obligatory / forbidden', 'Two marks (م، لا)', 'No mark'],
      ['Saktah', 'Four well-known places, mark (س)', 'No mark in the Warsh text'],
      ['Verses in the app', String(nHafs), String(nWarsh)],
    ],
    diffH: 'Hafs', diffW: 'Warsh',
    rulesT: 'Types of stop',
    rulesLead: 'Ibn al-Jazarī divides stops into four types, by how what follows is linked to what precedes. The examples below are illustrative and follow the definitions; for the precise ruling on a given place, refer to a teacher and an annotated mushaf:',
    types: [
      { n: 'Complete (tāmm)', c: 'good', d: 'No link to what follows, neither in wording nor in meaning. You stop and resume with what follows.', e: 'Illustrative example: “wa ulā’ika humu l-mufliḥūn” (Al-Baqara 5): the sentence is complete and a new statement begins.' },
      { n: 'Sufficient (kāfī)', c: 'good', d: 'Linked to what follows in meaning only, not in wording. You may stop and resume with what follows.', e: 'Illustrative example: the end of “lā yu’minūn” (Al-Baqara 6), then “khatama llāhu…” (Al-Baqara 7): linked in meaning, not in wording.' },
      { n: 'Good (ḥasan)', c: 'mid', d: 'Linked to what follows in wording and meaning. You may stop, but you do not resume with what follows unless it is a verse end.', e: 'Illustrative example: “al-ḥamdu lillāh” (Al-Fātiḥa 2) is linked to “rabbi l-‘ālamīn” in wording, so you do not resume at “rabbi l-‘ālamīn”.' },
      { n: 'Bad (qabīḥ)', c: 'bad', d: 'The sentence is unfinished. It is not allowed to stop there deliberately, except out of necessity such as running out of breath.', e: 'Illustrative example: stopping at “bismi” in “bismi llāh”.' },
    ],
    startT: 'How to resume after stopping',
    start: ['After a complete or sufficient stop: resume directly with what follows.', 'After a “good” stop: do not resume with what follows (unless it is a verse end); go back to the start of the connected phrase.', 'After a stop of necessity (out of breath): go back to an earlier word from which you can properly resume, then continue.', 'Do not resume at a word that changes the meaning or suggests something other than what is meant.'],
    joinT: 'When to join',
    join: ['At the (لا) mark, a forbidden stop.', 'Where the meaning is not complete (a “bad” stop), unless out of necessity.', 'At the (صلى) mark: joining is preferable.'],
    saktT: 'The four saktahs of Hafs', saktLead: 'The saktah is a very short cut in the voice without taking a breath. In the recitation of Hafs from ‘Āṣim it occurs in four places, marked (س) in the Madinah mushaf. There is no mark for it in the Warsh text.',
    saktEx: [['Al-Kahf 1–2', 'after “‘iwajā”, before “qayyimā”'], ['Yā-Sīn 52', 'after “marqadinā”, before “hādhā”'], ['Al-Qiyāma 27', 'after “man”, before “rāq”'], ['Al-Muṭaffifīn 14', 'after “bal”, before “rān”']],
    endT: 'Stopping at the end of a verse is a sunnah',
    end: ['Ibn al-Jazarī says in “an-Nashr”: “Stopping at verse endings is a sunnah, without restriction.”', 'Umm Salama (may Allah be pleased with her) reported that the Prophet ﷺ used to recite cutting his recitation verse by verse (narrated by Abū Dāwūd 4001, at-Tirmidhī 2927 and Aḥmad; graded authentic by al-Albānī).', 'Many scholars hold that following his practice ﷺ is preferable even when the verse is linked to what follows.'],
    noRuleT: 'A rule that keeps balance', noRule: 'Marks and types are means to protect the meaning; and “in the Quran there is no obligatory stop and no forbidden one, except where there is a cause”: the cause is damage to the meaning, not the mere presence of a mark.',
    srcT: 'References', srcNote: 'This page is based on these references; the Quran examples are taken verbatim from the app’s text. If you find an error, write to us:',
    src: [['Ibn al-Jazarī, “an-Nashr” and “al-Muqaddima” — via Islamweb fatwa 95786', 'https://www.islamweb.net/ar/fatwa/95786'], ['The waqf of al-Habṭī — Islamweb fatwa 58999', 'https://www.islamweb.net/ar/fatwa/58999'], ['Stop marks — Katara Prize for Quran Recitation', 'https://kataraquran.com/%D8%B9%D9%84%D8%A7%D9%85%D8%A7%D8%AA-%D8%A7%D9%84%D9%88%D9%82%D9%81/'], ['Idris Rimi, “The Habṭī waqf in the Moroccan mushaf”, Journal of Research and Studies (University of El Oued) 2017', 'https://archives.univ-eloued.dz/items/2584c0d3-0b6e-4c3f-bea0-a165949f76a2']],
  },
};

/* ───────────────────────── الصفحة ───────────────────────── */
const CSS = String.raw`
@font-face{font-family:'PlexAr'; src:url('fonts/ui-400.woff2') format('woff2'); font-weight:400; font-display:swap;}
@font-face{font-family:'PlexAr'; src:url('fonts/ui-600.woff2') format('woff2'); font-weight:600; font-display:swap;}
@font-face{font-family:'PlexAr'; src:url('fonts/ui-700.woff2') format('woff2'); font-weight:700; font-display:swap;}
@font-face{font-family:'AmiriQuran'; src:url('fonts/amiri-quran.woff2') format('woff2'); font-display:swap;}
@font-face{font-family:'Maghribi'; src:url('fonts/maghribi-955dce40.woff2') format('woff2'); font-display:swap;}
:root{
  --bg:#EFE6D4; --card:#F6EDDB; --text:#3A352E; --text-2:rgba(58,53,46,.62); --text-3:rgba(58,53,46,.34);
  --sep:rgba(58,53,46,.16); --line:rgba(58,53,46,.09); --fill:rgba(120,105,80,.12);
  --accent:#0B5742; --accent-2:#08463A; --accent-bg:rgba(11,87,66,.10); --gold:#A8741A; --gold-bg:rgba(168,116,26,.12);
  --red:#9B3B2F; --red-bg:rgba(155,59,47,.10); --ink:#063D30; --qtext:#0A5441;
  --shadow:0 1px 2px rgba(58,53,46,.05), 0 4px 14px rgba(58,53,46,.06);
}
:root[data-bg="white"]{ --bg:#F2F2F7; --card:#FAFAF8; --text:#2B2B2B; --text-2:rgba(43,43,43,.6); --text-3:rgba(43,43,43,.32); --sep:rgba(43,43,43,.16); --line:rgba(43,43,43,.08); --fill:rgba(120,120,128,.1); }
:root[data-bg="dark"]{ --bg:#121212; --card:#1E1E1E; --text:#E6E1D6; --text-2:rgba(230,225,214,.62); --text-3:rgba(230,225,214,.32); --sep:rgba(230,225,214,.14); --line:rgba(255,255,255,.07); --fill:rgba(200,200,200,.08);
  --accent:#34C77B; --accent-2:#2BAA68; --accent-bg:rgba(52,199,123,.16); --gold:#E3B25A; --gold-bg:rgba(227,178,90,.14); --red:#E58A7E; --red-bg:rgba(229,138,126,.13); --ink:#CDEFE0; --qtext:#4CC79B;
  --shadow:0 1px 3px rgba(0,0,0,.45), 0 5px 16px rgba(0,0,0,.35); }
*{box-sizing:border-box; -webkit-tap-highlight-color:transparent;}
html{scroll-behavior:smooth;}
body{margin:0; background:var(--bg); color:var(--text); font-family:'PlexAr',system-ui,sans-serif; line-height:1.85; -webkit-font-smoothing:antialiased; padding-bottom:calc(36px + env(safe-area-inset-bottom,0px));}
a{color:var(--accent);}
.hero{position:relative; overflow:hidden; color:#fff; padding:calc(env(safe-area-inset-top,0px) + 16px) 18px 26px;
  background:linear-gradient(160deg,#0E6B52 0%,#0A5441 48%,#063D30 100%);}
.hero::before{content:''; position:absolute; inset-inline-end:0; top:-30px; width:300px; height:300px; background:url(icons/drawer-zellige.png) no-repeat center/contain; pointer-events:none;}
[dir=rtl] .hero::before{transform:scaleX(-1);}
.hero::after{content:''; position:absolute; inset-inline:0; bottom:0; height:2px; background:linear-gradient(90deg,transparent,#D9B15C 30%,#D9B15C 70%,transparent);}
.hero-top{position:relative; display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:18px;}
.playlogo{vertical-align:-2px; margin-inline-start:5px; flex:0 0 auto;}
.back{display:inline-flex; align-items:center; gap:6px; flex:0 0 auto; white-space:nowrap; color:#fff; text-decoration:none; font-weight:600; font-size:13.5px; padding:8px 12px; border-radius:999px; background:rgba(255,255,255,.12);}
.back svg{width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;}
[dir=ltr] .back svg{transform:scaleX(-1);}
.langs{display:flex; gap:4px; background:rgba(255,255,255,.12); padding:3px; border-radius:999px; direction:ltr;}
.langs button{border:0; background:transparent; color:#fff; font:inherit; font-size:12.5px; font-weight:600; padding:5px 9px; border-radius:999px; cursor:pointer;}
.langs button.on{background:#fff; color:#063D30;}
.hero h1{position:relative; margin:0 0 6px; font-size:clamp(26px,7.4vw,34px); line-height:1.35; font-weight:800; color:#fff;}
.hero p{position:relative; margin:0; font-size:14.5px; color:rgba(255,255,255,.86); font-weight:500; max-width:34em;}
.tabs{position:sticky; top:0; z-index:5; display:flex; gap:8px; padding:10px 12px; background:var(--bg); border-bottom:1px solid var(--line); overflow-x:auto; scrollbar-width:none;}
.tabs::-webkit-scrollbar{display:none;}
.tabs button{flex:1 0 auto; border:1px solid var(--line); background:var(--card); color:var(--text-2); font:inherit; font-size:14.5px; font-weight:700; padding:9px 18px; border-radius:20px; cursor:pointer; min-height:44px;}
.tabs button[aria-selected=true]{background:var(--accent); border-color:var(--accent); color:#fff;}
:focus-visible{outline:2px solid var(--gold); outline-offset:2px;}
main{max-width:720px; margin:0 auto; padding:14px max(10px,env(safe-area-inset-left)) 0;}
.pane[hidden]{display:none;}
.card{background:var(--card); border-radius:20px; padding:18px 16px 16px; margin:12px 0; box-shadow:var(--shadow); border:1px solid var(--line);}
.card h2{margin:0 0 8px; font-size:18.5px; font-weight:800; color:var(--accent); line-height:1.5;}
.card h3{margin:14px 0 6px; font-size:15px; font-weight:700; color:var(--gold);}
.card p{margin:0 0 8px; font-size:15.5px; color:var(--ink);}
.lead{font-size:15.5px; color:var(--text-2); margin:6px 4px 4px; line-height:1.9;}
.q{font-family:'AmiriQuran','Amiri',serif; font-size:clamp(27px,7.2vw,31px); line-height:2.45; color:var(--qtext); text-align:center; direction:rtl; margin:0; word-spacing:2px; -webkit-text-stroke:.014em currentColor;}
.q.w{font-family:'Maghribi','AmiriQuran',serif; font-size:clamp(25px,6.6vw,29px); line-height:2.5; -webkit-text-stroke:0;}
.q .sg{color:var(--gold); font-weight:700;}
.dots{color:var(--text-3); font-family:'PlexAr'; font-size:17px; padding:0 4px;}
.ex{margin:10px 0; padding:8px 12px 10px; border-radius:16px; background:var(--fill); border:1px solid var(--line);}
.ex .ref{display:block; text-align:center; font-size:12.5px; color:var(--text-3); font-weight:600; margin-top:-2px;}
.ex .wh{margin:6px 0 0; font-size:14px; color:var(--text-2); border-top:1px dashed var(--sep); padding-top:7px;}
.sign{display:grid; grid-template-columns:72px 1fr; gap:14px; align-items:start;}
.glyph{width:72px; min-height:88px; border-radius:20px; background:var(--accent-bg); color:var(--accent); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; line-height:1; direction:rtl; border:1px solid var(--line); padding:6px 0;}
.glyph b{font-family:'PlexAr',sans-serif; font-size:24px; font-weight:800; color:var(--accent);}
.glyph .bs{color:var(--text-3);}
.glyph i{font-style:normal; font-family:'AmiriQuran','Amiri',serif; font-size:40px; line-height:1.15; color:var(--gold);}
.nm{margin:0; font-size:17.5px; font-weight:800; color:var(--ink); line-height:1.4;}
.badge{display:inline-block; margin:6px 0 6px; padding:3px 12px; border-radius:999px; font-size:13px; font-weight:700; border:1px solid transparent;}
.b-must{background:var(--accent); color:#fff;}
.b-ok{background:var(--gold-bg); color:var(--gold); border-color:color-mix(in srgb,var(--gold) 35%,transparent);}
.b-pref{background:var(--accent-bg); color:var(--accent); border-color:color-mix(in srgb,var(--accent) 35%,transparent);}
.b-no{background:var(--red-bg); color:var(--red); border-color:color-mix(in srgb,var(--red) 35%,transparent);}
.b-sakt{background:var(--fill); color:var(--text-2); border-color:var(--sep);}
.mean{margin:0 0 4px; font-size:15px; color:var(--text);}
.note{margin:10px 0 0; padding:10px 12px; font-size:14px; line-height:1.85; color:var(--text-2); background:var(--gold-bg); border-radius:14px; border-inline-start:3px solid var(--gold);}
.sign .body{min-width:0;}
.sign .full{grid-column:1/-1;}
.cmp{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:6px 0 4px;}
.cmp .col{background:var(--fill); border-radius:14px; padding:8px 8px 6px; border:1px solid var(--line); min-width:0;}
.cmp .col b{display:block; text-align:center; font-size:12.5px; color:var(--gold); letter-spacing:.2px;}
.cmp .q{font-size:22px; line-height:2.4;} .cmp .q.w{font-size:24px;}
@media (min-width:640px){ .cmp .q{font-size:26px;} .cmp .q.w{font-size:25px;} }
.row{display:grid; grid-template-columns:1fr; gap:6px; padding:11px 0; border-top:1px solid var(--line);}
.row:first-of-type{border-top:0;}
.row .k{font-weight:700; font-size:13.5px; color:var(--gold);}
.row .v2{display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:14.5px; color:var(--ink);}
.row .v2 span{background:var(--fill); border-radius:12px; padding:7px 10px; min-width:0; overflow-wrap:anywhere;}
.row .v2 em{display:block; font-style:normal; font-size:11.5px; color:var(--text-3); font-weight:700;}
.types{display:grid; gap:10px;}
.type{border-radius:16px; padding:12px 13px; background:var(--fill); border:1px solid var(--line); border-inline-start:4px solid var(--accent);}
.type.mid{border-inline-start-color:var(--gold);} .type.bad{border-inline-start-color:var(--red);}
.type b{display:block; font-size:16.5px; color:var(--ink);} .type p{margin:3px 0; font-size:14.5px; color:var(--text);} .type small{display:block; font-size:13.5px; color:var(--text-2);}
.lst{margin:4px 0 2px; padding-inline-start:22px;} .lst li{margin:6px 0; font-size:15px; color:var(--ink);}
.sakt li{display:flex; flex-wrap:wrap; gap:4px 10px; align-items:baseline; list-style:none; padding:0; margin:8px 0;}
.srcs a{display:block; margin:7px 0; font-size:14px; overflow-wrap:anywhere;}
.foot{margin:24px 12px 0; text-align:center; color:var(--text-3); font-size:13px;}
.foot .qrb{display:block; margin:10px auto 0; width:92px;} .foot .qrb svg{display:block; width:92px; height:92px; border-radius:10px; border:1px solid var(--sep);}
.ltr-term{unicode-bidi:isolate;}
`;

const BODY_JS = String.raw`
(function(){
  var D = __DATA__;
  var settings = {}; try{ settings = JSON.parse(localStorage.getItem('az_settings')||'{}') || {}; }catch(e){}
  var bg = settings.bg==='white'||settings.bg==='dark' ? settings.bg : 'sepia';
  document.documentElement.setAttribute('data-bg', bg);
  /* لونُ القرآن كما اختاره المستخدم في الإعدادات (قراءةٌ فقط) */
  var QC = {light:{g1:'#1E8566',g2:'#0F6B52',g3:'#0A5441',g4:'#063D30',blue:'#2166D6',blue2:'#16509E',navy:'#0B2C66'}, dark:{g1:'#8AE8C6',g2:'#6FDDB4',g3:'#4CC79B',g4:'#35B087',blue:'#7FB0FF',blue2:'#6A9CF0',navy:'#8FB3F5'}};
  var qc = settings.quranColor, pal = bg==='dark' ? QC.dark : QC.light;
  if(qc && pal[qc]) document.documentElement.style.setProperty('--qtext', pal[qc]);
  var lang = 'ar'; try{ lang = sessionStorage.getItem('waqf_lang') || (settings.lang==='fr'||settings.lang==='en' ? settings.lang : 'ar'); }catch(e){ lang = (settings.lang==='fr'||settings.lang==='en') ? settings.lang : 'ar'; }
  var tab = (location.hash||'').replace('#','');  if(['hafs','warsh','rules'].indexOf(tab)<0) tab = 'hafs';
  var $ = function(s,r){ return (r||document).querySelector(s); };
  var esc = function(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var SIGNS = {m:'ۘ', la:'ۙ', j:'ۚ', sl:'ۖ', ql:'ۗ', mu:'ۛ', sk:'ۜ'};
  function qhtml(x, w){ /* مقطعٌ حرفيّ من المصحف مع تمييز العلامة بالذهبيّ (العلامةُ لا الحروف) */
    var t = esc(x.t).replace(/[ۖ-ۜ]/g, function(c){ return '<span class="sg">'+c+'</span>'; });
    return '<p class="q'+(w?' w':'')+'">'+(x.pre?'<span class="dots">…</span>':'')+t+(x.post?'<span class="dots">…</span>':'')+'</p>';
  }
  function refLine(x, L, w){ return '<span class="ref">'+(w?'':'')+L.sura+' '+esc(x.sura)+' · '+x.ref+'</span>'; }
  function exBlock(list, L, whys){ return list.map(function(x,i){ return '<div class="ex">'+qhtml(x)+refLine(x,L)+(whys&&whys[i]?'<p class="wh"><b>'+L.why+'</b> '+esc(whys[i])+'</p>':'')+'</div>'; }).join(''); }
  function signCard(k, L){
    var s = L.signs[k], ex = D.ex[k]||[];
    var CODE = {m:'م', la:'لا', j:'ج', sl:'صلى', ql:'قلى', mu:'\u2234', sk:'س'};
    var g = '<div class="glyph" aria-hidden="true"><b>'+CODE[k]+'</b><i><span class="bs">\u0640</span>'+SIGNS[k]+'</i></div>';
    var h = '<article class="card"><div class="sign">'+g+'<div class="body"><h3 class="nm" style="margin:0;color:var(--ink);font-size:17.5px">'+esc(s.name)+'</h3><span class="badge b-'+s.cls+'">'+esc(s.badge)+'</span><p class="mean">'+esc(s.mean)+'</p></div>';
    if(ex.length) h += '<div class="full"><h3 style="margin:2px 0 0">'+L.examples+'</h3>'+exBlock(ex, L, s.why)+'</div>';
    if(k==='sk' && ex.length) h = h; /* أمثلةُ السكتة أعلاه */
    if(s.note) h += '<div class="full note">'+esc(s.note)+'</div>';
    return h+'</div></article>';
  }
  function renderHafs(L){
    return '<p class="lead">'+esc(L.hafsLead)+'</p>' + ['m','la','j','sl','ql','mu','sk'].map(function(k){ return signCard(k,L); }).join('');
  }
  function renderWarsh(L){
    var h = '<p class="lead">'+esc(L.warshLead)+'</p>';
    h += '<article class="card"><h2>'+esc(L.oneSignT)+'</h2><div class="sign"><div class="glyph" aria-hidden="true"><b>ص</b><i><span class="bs">ـ</span>ۖ</i></div><div class="body"><p class="mean">'+esc(L.oneSign[0])+' <span class="ltr-term" style="font-family:AmiriQuran,serif;font-size:22px;color:var(--gold)">ۖ</span> '+esc(L.oneSign[1])+'</p></div></div></article>';
    h += '<article class="card"><h2>'+esc(L.howT)+'</h2><ul class="lst">'+L.how.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul></article>';
    h += '<article class="card"><h2>'+esc(L.cmpT)+'</h2>'+D.cmp.map(function(c,i){
      return '<div class="ex" style="padding:8px 8px 10px"><div class="cmp"><div class="col"><b>'+L.cmpH+' · '+c.h.ref+'</b>'+qhtml(c.h)+'</div><div class="col"><b>'+L.cmpW+' · '+c.w.ref+'</b>'+qhtml(c.w,true)+'</div></div><p class="wh" style="margin-top:2px">'+esc(L.cmpNote[i])+'</p></div>';
    }).join('')+'<div class="note">'+esc(L.numNote)+'</div></article>';
    h += '<article class="card"><h2>'+esc(L.diffT)+'</h2>'+L.diff.map(function(r){ return '<div class="row"><span class="k">'+esc(r[0])+'</span><div class="v2"><span><em>'+esc(L.diffH)+'</em>'+esc(r[1])+'</span><span><em>'+esc(L.diffW)+'</em>'+esc(r[2])+'</span></div></div>'; }).join('')+'</article>';
    return h;
  }
  function renderRules(L){
    var h = '<article class="card"><h2>'+esc(L.rulesT)+'</h2><p class="mean" style="color:var(--text-2)">'+esc(L.rulesLead)+'</p><div class="types">'+L.types.map(function(t,i){
      var e = '<small>'+esc(t.e)+'</small>';
      var q = i===0 ? '<div class="ex" style="margin:8px 0 2px">'+qhtml(D.tam)+refLine(D.tam,L)+'</div>' : '';
      return '<div class="type '+(t.c==='mid'?'mid':t.c==='bad'?'bad':'')+'"><b>'+esc(t.n)+'</b><p>'+esc(t.d)+'</p>'+e+q+'</div>';
    }).join('')+'</div></article>';
    h += '<article class="card"><h2>'+esc(L.startT)+'</h2><ul class="lst">'+L.start.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul></article>';
    h += '<article class="card"><h2>'+esc(L.joinT)+'</h2><ul class="lst">'+L.join.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul></article>';
    h += '<article class="card"><h2>'+esc(L.saktT)+'</h2><p class="mean" style="color:var(--text-2)">'+esc(L.saktLead)+'</p>'+D.ex.sk.map(function(x,i){ return '<div class="ex">'+qhtml(x)+'<span class="ref">'+L.sura+' '+esc(x.sura)+' · '+x.ref+' — '+esc(L.saktEx[i][1])+'</span></div>'; }).join('')+'</article>';
    h += '<article class="card"><h2>'+esc(L.endT)+'</h2><ul class="lst">'+L.end.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul></article>';
    h += '<article class="card"><h2>'+esc(L.noRuleT)+'</h2><p class="mean">'+esc(L.noRule)+'</p></article>';
    h += '<article class="card srcs"><h2>'+esc(L.srcT)+'</h2><p class="mean" style="color:var(--text-2)">'+esc(L.srcNote)+' <a href="mailto:appsalatee@gmail.com">appsalatee@gmail.com</a></p>'+L.src.map(function(s){ return '<a href="'+s[1]+'" target="_blank" rel="noopener">'+esc(s[0])+'</a>'; }).join('')+'</article>';
    return h;
  }
  function render(){
    var L = D.T[lang];
    document.documentElement.lang = L.lang; document.documentElement.dir = L.dir;
    document.title = L.title.split('(')[0].trim() + ' — صلاتي';
    $('#back-t').textContent = L.back; $('#qr-t').textContent = L.qrT;
    $('h1').textContent = L.title; $('#sub').textContent = L.sub;
    var tb = $('#tabs'); tb.innerHTML = ['hafs','warsh','rules'].map(function(id,i){ return '<button role="tab" id="t-'+id+'" aria-controls="p-'+id+'" aria-selected="'+(tab===id)+'" data-t="'+id+'">'+esc(L.tabs[i])+'</button>'; }).join('');
    $('#intro').innerHTML = '<h2>'+esc(L.introT)+'</h2><p>'+esc(L.intro1)+'</p><p>'+esc(L.intro2)+'</p>';
    $('#p-hafs').innerHTML = renderHafs(L); $('#p-warsh').innerHTML = renderWarsh(L); $('#p-rules').innerHTML = renderRules(L);
    ['hafs','warsh','rules'].forEach(function(id){ $('#p-'+id).hidden = tab!==id; });
    [].forEach.call(document.querySelectorAll('.langs button'), function(b){ b.classList.toggle('on', b.dataset.l===lang); });
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-t]'); if(b){ tab = b.dataset.t; try{ history.replaceState(null,'','#'+tab); }catch(x){} render(); window.scrollTo({top:Math.min(window.scrollY, 0)||0}); var h = $('#tabs'); if(h) h.scrollIntoView({block:'start'}); return; }
    var l = e.target.closest && e.target.closest('.langs button'); if(l){ lang = l.dataset.l; try{ sessionStorage.setItem('waqf_lang', lang); }catch(x){} render(); }
  });
  window.addEventListener('hashchange', function(){ var h=(location.hash||'').replace('#',''); if(['hafs','warsh','rules'].indexOf(h)>=0){ tab=h; render(); } });
  var bk = document.getElementById('back'); if(bk) bk.addEventListener('click', function(e){ if(document.referrer && history.length>1){ e.preventDefault(); history.back(); } });
  render();
})();
`;

const DATA = { T, ex: EX, cmp: EX.cmp, tam: EX.tam };
const data = JSON.stringify({ T, ex: { m: EX.m, la: [], j: EX.j, sl: EX.sl, ql: EX.ql, mu: EX.mu, sk: EX.sk }, cmp: EX.cmp, tam: EX.tam });

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl" data-bg="sepia">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
<meta name="theme-color" content="#0A5441">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="preload" href="fonts/amiri-quran.woff2" as="font" type="font/woff2" crossorigin>
<title>الوقف والابتداء — صلاتي</title>
<style>${CSS}</style>
</head>
<body>
<header class="hero">
  <div class="hero-top">
    <a class="back" id="back" href="index.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg><span id="back-t">العودة</span></a>
    <div class="langs" role="group" aria-label="Language"><button data-l="ar">العربية</button><button data-l="fr">Français</button><button data-l="en">English</button></div>
  </div>
  <h1></h1>
  <p id="sub"></p>
</header>
<nav class="tabs" id="tabs" role="tablist"></nav>
<main>
  <section class="card" id="intro" style="margin-top:14px"></section>
  <section class="pane" id="p-hafs" role="tabpanel" aria-labelledby="t-hafs"></section>
  <section class="pane warsh" id="p-warsh" role="tabpanel" aria-labelledby="t-warsh" hidden></section>
  <section class="pane" id="p-rules" role="tabpanel" aria-labelledby="t-rules" hidden></section>
  <div class="foot"><span class="qrt"><span id="qr-t"></span><svg class="playlogo" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="#00C3FF" d="M4 2v20l8.5-10z"/><path fill="#00F076" d="M4 2l13 7.65L12.5 12z"/><path fill="#FF3A44" d="M4 22l13-7.65L12.5 12z"/><path fill="#FFD400" d="M12.5 12L17 9.65 21 12l-4 2.35z"/></svg></span><span class="qrb"><svg class="qr" viewBox="-2 -2 37 37" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR" shape-rendering="crispEdges"><rect x="-2" y="-2" width="37" height="37" fill="#fff"/><path d="M0 0h7v1h-7zM8 0h1v1h-1zM11 0h1v1h-1zM13 0h1v1h-1zM17 0h5v1h-5zM23 0h1v1h-1zM26 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h1v1h-1zM11 1h1v1h-1zM13 1h1v1h-1zM16 1h3v1h-3zM22 1h2v1h-2zM26 1h1v1h-1zM32 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM9 2h1v1h-1zM12 2h1v1h-1zM22 2h3v1h-3zM26 2h1v1h-1zM28 2h3v1h-3zM32 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h2v1h-2zM14 3h2v1h-2zM17 3h1v1h-1zM23 3h2v1h-2zM26 3h1v1h-1zM28 3h3v1h-3zM32 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM9 4h1v1h-1zM13 4h2v1h-2zM19 4h1v1h-1zM22 4h1v1h-1zM24 4h1v1h-1zM26 4h1v1h-1zM28 4h3v1h-3zM32 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM9 5h4v1h-4zM14 5h1v1h-1zM17 5h5v1h-5zM24 5h1v1h-1zM26 5h1v1h-1zM32 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM26 6h7v1h-7zM8 7h1v1h-1zM12 7h1v1h-1zM17 7h2v1h-2zM20 7h1v1h-1zM22 7h2v1h-2zM0 8h1v1h-1zM2 8h2v1h-2zM5 8h3v1h-3zM10 8h2v1h-2zM14 8h1v1h-1zM16 8h4v1h-4zM21 8h1v1h-1zM23 8h1v1h-1zM26 8h1v1h-1zM29 8h1v1h-1zM31 8h2v1h-2zM1 9h1v1h-1zM3 9h3v1h-3zM7 9h4v1h-4zM12 9h1v1h-1zM16 9h1v1h-1zM18 9h3v1h-3zM23 9h2v1h-2zM26 9h2v1h-2zM29 9h4v1h-4zM0 10h1v1h-1zM2 10h1v1h-1zM4 10h1v1h-1zM6 10h2v1h-2zM10 10h1v1h-1zM12 10h1v1h-1zM14 10h1v1h-1zM17 10h1v1h-1zM20 10h1v1h-1zM22 10h3v1h-3zM26 10h4v1h-4zM31 10h2v1h-2zM2 11h1v1h-1zM4 11h2v1h-2zM10 11h1v1h-1zM12 11h5v1h-5zM18 11h1v1h-1zM20 11h1v1h-1zM27 11h1v1h-1zM29 11h1v1h-1zM31 11h1v1h-1zM0 12h1v1h-1zM2 12h1v1h-1zM4 12h3v1h-3zM8 12h4v1h-4zM15 12h1v1h-1zM17 12h1v1h-1zM19 12h1v1h-1zM22 12h4v1h-4zM27 12h3v1h-3zM1 13h1v1h-1zM4 13h2v1h-2zM7 13h2v1h-2zM12 13h2v1h-2zM15 13h2v1h-2zM18 13h2v1h-2zM21 13h1v1h-1zM24 13h1v1h-1zM27 13h1v1h-1zM29 13h1v1h-1zM31 13h1v1h-1zM4 14h1v1h-1zM6 14h1v1h-1zM11 14h1v1h-1zM14 14h1v1h-1zM18 14h4v1h-4zM24 14h1v1h-1zM26 14h1v1h-1zM28 14h3v1h-3zM1 15h3v1h-3zM9 15h1v1h-1zM11 15h1v1h-1zM14 15h1v1h-1zM16 15h1v1h-1zM19 15h1v1h-1zM21 15h3v1h-3zM25 15h2v1h-2zM30 15h1v1h-1zM2 16h1v1h-1zM5 16h5v1h-5zM11 16h1v1h-1zM13 16h1v1h-1zM16 16h1v1h-1zM20 16h3v1h-3zM24 16h3v1h-3zM28 16h3v1h-3zM0 17h1v1h-1zM2 17h1v1h-1zM4 17h2v1h-2zM7 17h2v1h-2zM10 17h1v1h-1zM12 17h1v1h-1zM14 17h2v1h-2zM22 17h3v1h-3zM26 17h1v1h-1zM28 17h2v1h-2zM32 17h1v1h-1zM1 18h4v1h-4zM6 18h1v1h-1zM8 18h2v1h-2zM12 18h2v1h-2zM15 18h2v1h-2zM20 18h2v1h-2zM26 18h3v1h-3zM30 18h2v1h-2zM1 19h2v1h-2zM4 19h1v1h-1zM8 19h3v1h-3zM13 19h5v1h-5zM22 19h2v1h-2zM25 19h2v1h-2zM28 19h1v1h-1zM32 19h1v1h-1zM0 20h1v1h-1zM2 20h6v1h-6zM9 20h1v1h-1zM13 20h1v1h-1zM15 20h1v1h-1zM17 20h5v1h-5zM24 20h1v1h-1zM27 20h1v1h-1zM29 20h3v1h-3zM0 21h1v1h-1zM2 21h2v1h-2zM7 21h3v1h-3zM16 21h2v1h-2zM19 21h2v1h-2zM22 21h3v1h-3zM26 21h1v1h-1zM29 21h1v1h-1zM32 21h1v1h-1zM5 22h2v1h-2zM9 22h2v1h-2zM12 22h1v1h-1zM14 22h1v1h-1zM18 22h1v1h-1zM20 22h5v1h-5zM26 22h2v1h-2zM30 22h3v1h-3zM1 23h4v1h-4zM9 23h3v1h-3zM13 23h1v1h-1zM18 23h1v1h-1zM20 23h1v1h-1zM23 23h1v1h-1zM25 23h1v1h-1zM27 23h3v1h-3zM31 23h1v1h-1zM0 24h1v1h-1zM3 24h1v1h-1zM6 24h2v1h-2zM9 24h3v1h-3zM15 24h1v1h-1zM17 24h1v1h-1zM19 24h1v1h-1zM22 24h1v1h-1zM24 24h5v1h-5zM31 24h2v1h-2zM8 25h1v1h-1zM11 25h3v1h-3zM15 25h2v1h-2zM18 25h2v1h-2zM23 25h2v1h-2zM28 25h2v1h-2zM31 25h1v1h-1zM0 26h7v1h-7zM8 26h1v1h-1zM10 26h2v1h-2zM14 26h1v1h-1zM16 26h1v1h-1zM19 26h1v1h-1zM22 26h3v1h-3zM26 26h1v1h-1zM28 26h1v1h-1zM0 27h1v1h-1zM6 27h1v1h-1zM8 27h3v1h-3zM13 27h1v1h-1zM15 27h2v1h-2zM20 27h2v1h-2zM23 27h2v1h-2zM28 27h4v1h-4zM0 28h1v1h-1zM2 28h3v1h-3zM6 28h1v1h-1zM9 28h4v1h-4zM16 28h1v1h-1zM19 28h10v1h-10zM30 28h1v1h-1zM32 28h1v1h-1zM0 29h1v1h-1zM2 29h3v1h-3zM6 29h1v1h-1zM8 29h1v1h-1zM10 29h3v1h-3zM15 29h1v1h-1zM27 29h1v1h-1zM29 29h1v1h-1zM32 29h1v1h-1zM0 30h1v1h-1zM2 30h3v1h-3zM6 30h1v1h-1zM8 30h2v1h-2zM11 30h5v1h-5zM17 30h2v1h-2zM22 30h2v1h-2zM26 30h2v1h-2zM30 30h1v1h-1zM0 31h1v1h-1zM6 31h1v1h-1zM15 31h4v1h-4zM20 31h1v1h-1zM22 31h1v1h-1zM24 31h2v1h-2zM27 31h2v1h-2zM32 31h1v1h-1zM0 32h7v1h-7zM8 32h1v1h-1zM11 32h2v1h-2zM15 32h1v1h-1zM17 32h3v1h-3zM21 32h1v1h-1zM23 32h1v1h-1zM25 32h1v1h-1zM28 32h1v1h-1zM30 32h1v1h-1z" fill="#000"/></svg></span></div>
</main>
<script>${BODY_JS.replace('__DATA__', data.replace(/<\//g, '<\\/'))}</script>
</body>
</html>
`;
fs.writeFileSync('waqf.html', html);
console.log('✓ waqf.html', (html.length / 1024).toFixed(0), 'KB');
