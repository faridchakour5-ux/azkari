#!/usr/bin/env node
/* صلاتي — يولّد صفحة «تعلّم التجويد» المستقلّة (tajweed.html): الدرسُ الأوّل — النون الساكنة والتنوين.
 *
 *   node tools/build-tajweed.mjs
 *
 * مستقلّةٌ عن «الورد»: لا تُحمِّل ملفّاتِ المصحف ولا تعدّل شيئًا في التطبيق، وتقرأ az_settings قراءةً فقط.
 * أمثلةُ القرآن تُقتطَع حرفيًّا من نصّ التطبيق (wird_hafs.js وwird_warsh.js) وقتَ التوليد، دون تلوينٍ ودون أيّ تعديل في الحروف؛
 * ويُبحث عن كلّ مثالٍ بنصّه لا برقم آيته، لأنّ ترقيمَ ورش يخالف حفصًا. الأحكامُ وأسماؤها وحروفُها هي المتداولة في متن
 * «تحفة الأطفال» و«المقدّمة الجزريّة». وما يخصّ ورشًا ولم يُتحقَّق منه لم يُكتب. */
import fs from 'node:fs';
import vm from 'node:vm';

const load = f => { const w = {}; vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: w }); return w.WIRD_HAFS || w.WIRD_WARSH || w.WIRD; };
const HAFS = load('wird_hafs.js'), WARSH = load('wird_warsh.js');
const strip = s => s.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ࣓-ࣿ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ء/g, '');
const verse = (W, s, v) => String(W.a[W.sur[s - 1].i + v - 1].t).replace(/ {2,}/g, ' ').trim();
const nver = (W, s) => (s < W.sur.length ? W.sur[s].i : W.a.length) - W.sur[s - 1].i;
const sname = (W, s) => W.sur[s - 1].n.replace(/[َِ]/g, '');

/* يجد المقطعَ بنصّه قرب الآية المتوقّعة (ترقيمُ ورش قد يختلف بآيةٍ أو آيتين) */
function find(W, s, a, kw, win) {
  const toks = kw.split(' ').map(strip);
  for (let d = 0; d <= 6; d++) for (const v of d === 0 ? [a] : [a - d, a + d]) {
    if (v < 1 || v > nver(W, s)) continue;
    const t = verse(W, s, v).split(' '), n = t.map(strip);
    for (let i = 0; i + toks.length <= n.length; i++) {
      if (toks.every((k, j) => n[i + j] === k)) {
        const from = Math.max(0, i - win), to = Math.min(t.length, i + toks.length + win);
        return { t: t.slice(from, to).join(' '), pre: from > 0, post: to < t.length, s, a: v, ref: `سورة ${sname(W, s)}، الآية ${v}` };
      }
    }
  }
  return null;
}

const K = { n: { ar: 'نونٌ ساكنة', fr: 'Noun sakinah', en: 'Noon sakinah' }, t: { ar: 'تنوين', fr: 'Tanwin', en: 'Tanween' } };
const why = (kind, l) => ({ ar: K[kind].ar + ' + ' + l, fr: K[kind].fr + ' + ' + l, en: K[kind].en + ' + ' + l });

/* [القاعدة، الحرف، النوع، المقطع (يُطابَق بلا تشكيل)، السورة، الآية في حفص، نافذةُ الكلمات حوله، يُستثنى من ورش] */
const EX = [
  [0, 'ع', 'n', 'أنعمت', 1, 7, 2],
  [0, 'ه', 'n', 'من هاد', 13, 33, 1],
  [0, 'ح', 'n', 'من حكيم', 41, 42, 1],
  [0, 'غ', 'n', 'من غل', 7, 43, 1],
  [0, 'خ', 'n', 'من خير', 2, 105, 1],
  [0, 'ء', 'n', 'من آمن', 2, 62, 1, 'noWarsh'],      // ورش: نقلُ حركة الهمزة (مَنَ ءَامَنَ) فلا يُعرَض مثالًا للإظهار
  [1, 'ي', 'n', 'من يقول', 2, 8, 1],
  [1, 'ن', 'n', 'من نعمة', 16, 53, 1],
  [1, 'م', 'n', 'من ماء', 24, 45, 1],
  [1, 'و', 'n', 'من وال', 13, 11, 1],
  [1, 'ل', 't', 'هدى للمتقين', 2, 2, 0],
  [1, 'ر', 'n', 'من ربهم', 2, 5, 1],
  [2, 'ب', 'n', 'من بعد', 2, 27, 1],
  [2, 'ب', 'n', 'انبوني', 2, 31, 1],
  [2, 'ب', 't', 'سميعا بصيرا', 4, 58, 0],
  [3, 'ق', 'n', 'من قبلك', 2, 4, 1],
  [3, 'ك', 'n', 'من كان', 2, 97, 1],
  [3, 'ت', 'n', 'أنتم', 2, 85, 2],
];
const rulesEx = [[], [], [], []];
const missing = [];
for (const [r, l, kind, kw, s, a, win, flag] of EX) {
  const h = find(HAFS, s, a, kw, win), w = flag === 'noWarsh' ? null : find(WARSH, s, a, kw, win);
  if (!h) { missing.push('حفص ' + kw); continue; }
  if (!w && flag !== 'noWarsh') missing.push('ورش ' + kw);
  const pad = n => String(n).padStart(3, '0');
  rulesEx[r].push({
    hafs: { ...h, why: why(kind, l), audio: `https://everyayah.com/data/Alafasy_128kbps/${pad(s)}${pad(h.a)}.mp3` },
    warsh: w ? { ...w, why: why(kind, l) } : null,
  });
}
if (missing.length) console.warn('لم يُعثَر على:', missing.join(' · '));

/* مثالُ نقل الهمزة في ورش (من نصّ التطبيق): يُعرَض في تبويب ورش فقط */
const naql = find(WARSH, 2, 62, 'من آمن', 1);

const L = (ar, fr, en) => ({ ar, fr, en });

const lesson = {
  title: L('الدرس الأوّل: النون الساكنة والتنوين', 'Leçon 1 : le noun sakinah et le tanwin', 'Lesson 1: noon sakinah and tanween'),
  intro: [
    L('النون الساكنة: نونٌ ساكنةٌ تثبت لفظًا وخطًّا، وتكون في وسط الكلمة أو آخرها.', 'Le noun sakinah est un noun vocalisé par un sukun, prononcé et écrit, au milieu ou à la fin d’un mot.', 'Noon sakinah is a noon with sukoon, pronounced and written, in the middle or at the end of a word.'),
    L('التنوين: نونٌ ساكنةٌ زائدةٌ تلحق آخرَ الاسم لفظًا لا خطًّا، وتسقط عند الوقف.', 'Le tanwin est un noun sakinah ajouté à la fin d’un nom : on le prononce mais on ne l’écrit pas comme lettre, et il tombe à l’arrêt.', 'Tanween is an extra noon sakinah added to the end of a noun: pronounced but not written as a letter, and dropped when stopping.'),
    L('ولهما أربعةُ أحكامٍ بحسب الحرف الذي يأتي بعدهما: الإظهار، والإدغام، والإقلاب، والإخفاء.', 'Ils ont quatre règles selon la lettre qui suit : l’idhhar, l’idgham, l’iqlab et l’ikhfa.', 'They have four rules depending on the letter that follows: idhhar, idgham, iqlab and ikhfa.'),
    L('الغُنّة: صوتٌ لطيفٌ يخرج من الأنف (الخيشوم)، ومقدارُه حركتان.', 'La ghunna est un son nasal doux qui sort du nez ; sa durée est de deux temps (harakat).', 'Ghunna is a soft nasal sound from the nose, lasting two counts (harakat).'),
  ],
  warshNotes: [
    L('الأحكام الأربعة أدناه هي الأصلُ في رواية ورش كما هي في حفص.', 'Les quatre règles ci-dessous sont, dans leur principe, les mêmes en Warsh qu’en Hafs.', 'The four rules below are, in principle, the same in Warsh as in Hafs.'),
    L('ويختلف نصُّ ورشٍ في مواضعَ بسبب نقل حركة الهمزة إلى الساكن قبلها؛ فلا يظهر الإظهارُ مع الهمزة بالصورة نفسها كما في حفص (انظر المثال أدناه من نصّ ورش في التطبيق).', 'Le texte de Warsh diffère en certains endroits à cause du transfert de la voyelle de la hamza à la lettre sakinah qui la précède ; l’idhhar avant la hamza n’apparaît donc pas comme en Hafs (voir l’exemple ci-dessous, tiré du texte de Warsh de l’application).', 'Warsh’s text differs in some places because the vowel of the hamza is moved onto the silent letter before it; so idhhar before hamza does not appear as in Hafs (see the example below from the Warsh text in the app).'),
    L('ويذكر بعضُ أهل العلم مواضعَ قليلةً أخرى في هذا الباب (منها ما يتعلّق بسورتَي يس والقلم)؛ لم نُدرجها حتى تُراجَع عند أهل الاختصاص.', 'Certains savants mentionnent quelques autres cas dans ce chapitre (notamment dans les sourates Yâ-Sîn et Al-Qalam) ; nous ne les avons pas inclus tant qu’ils n’ont pas été revus par des spécialistes.', 'Some scholars mention a few other cases in this chapter (including in Surahs Ya-Sin and Al-Qalam); we have not included them until they are reviewed by specialists.'),
  ],
  warshEx: naql ? { ...naql, why: L('نقلُ حركة الهمزة: الإظهارُ لا يظهر كما في حفص', 'Transfert de la voyelle de la hamza : l’idhhar n’apparaît pas comme en Hafs', 'Moving the hamza’s vowel: idhhar does not appear as in Hafs') } : null,
  rules: [
    {
      t: L('1) الإظهار الحلقيّ', '1) L’idhhar (laryngal)', '1) Idhhar (clear pronunciation)'),
      tag: L('النطق بالنون واضحةً بلا غنّة', 'Noun prononcé clairement, sans ghunna', 'The noon is pronounced clearly, without ghunna'),
      def: L('إذا جاء بعد النون الساكنة أو التنوين أحدُ الحروف الحلقيّة الستّة نُطقت النونُ واضحةً دون غنّةٍ ودون إدغام.', 'Quand le noun sakinah ou le tanwin est suivi de l’une des six lettres de la gorge, le noun est prononcé nettement, sans ghunna ni fusion.', 'When noon sakinah or tanween is followed by one of the six throat letters, the noon is pronounced clearly, with no ghunna and no merging.'),
      groups: [{ t: L('الحروف الستّة', 'Les six lettres', 'The six letters'), l: ['ء', 'ه', 'ع', 'ح', 'غ', 'خ'] }],
      ex: rulesEx[0],
    },
    {
      t: L('2) الإدغام', '2) L’idgham', '2) Idgham (merging)'),
      tag: L('إدخال النون في الحرف بعدها', 'Fusion du noun dans la lettre suivante', 'The noon merges into the next letter'),
      def: L('إدخالُ النون الساكنة أو التنوين في الحرف الذي بعدهما، فيُنطق حرفًا واحدًا مشدَّدًا. وحروفُه ستّةٌ تجمعها كلمة «يرملون».', 'Le noun sakinah ou le tanwin fusionne dans la lettre qui suit : on prononce une seule lettre redoublée. Ses six lettres sont réunies dans le mot « yarmalûn ».', 'Noon sakinah or tanween merges into the following letter, which is pronounced as one doubled letter. Its six letters are gathered in the word “yarmaloon”.'),
      groups: [
        { t: L('بغنّة — «ينمو»', 'Avec ghunna — « yanmû »', 'With ghunna — “yanmoo”'), l: ['ي', 'ن', 'م', 'و'], gold: true },
        { t: L('بغير غنّة', 'Sans ghunna', 'Without ghunna'), l: ['ل', 'ر'] },
      ],
      extra: L('شرطُ الإدغام أن تكون النونُ في آخر كلمةٍ والحرفُ في أوّل التي بعدها؛ فإن اجتمعا في كلمةٍ واحدةٍ أُظهرت النونُ، وذلك في أربع كلماتٍ: دنيا، صنوان، قنوان، بنيان.', 'L’idgham exige que le noun soit à la fin d’un mot et la lettre au début du suivant ; s’ils sont dans le même mot, le noun est prononcé clairement : quatre mots seulement : dounya, sinwân, qinwân, bounyân.', 'Idgham requires the noon to end a word and the letter to begin the next; if both are in one word the noon is pronounced clearly, in four words only: dunya, sinwan, qinwan, bunyan.'),
      ex: rulesEx[1],
    },
    {
      t: L('3) الإقلاب', '3) L’iqlab', '3) Iqlab (conversion)'),
      tag: L('قلبُ النون ميمًا مخفاةً بغنّة', 'Le noun devient un mîm dissimulé avec ghunna', 'The noon turns into a hidden meem with ghunna'),
      def: L('إذا جاء بعد النون الساكنة أو التنوين حرفُ الباء قُلبت النونُ ميمًا خفيفةً مع غنّةٍ وإطباقٍ خفيفٍ للشفتين. وفي مصحف المدينة تُكتب علامةُ ميمٍ صغيرةٌ فوق الحرف للدلالة عليه.', 'Quand le noun sakinah ou le tanwin est suivi de la lettre bâ’, le noun se change en un mîm léger avec ghunna et une légère fermeture des lèvres. Dans le mushaf de Médine, un petit mîm est écrit au-dessus pour l’indiquer.', 'When noon sakinah or tanween is followed by the letter baa, the noon turns into a light meem with ghunna and slightly closed lips. In the Madinah mushaf a small meem sign is written above it.'),
      groups: [{ t: L('حرفه', 'Sa lettre', 'Its letter'), l: ['ب'] }],
      ex: rulesEx[2],
    },
    {
      t: L('4) الإخفاء الحقيقيّ', '4) L’ikhfa’', '4) Ikhfa’ (concealing)'),
      tag: L('حالةٌ بين الإظهار والإدغام مع غنّة', 'État intermédiaire entre idhhar et idgham, avec ghunna', 'A state between idhhar and idgham, with ghunna'),
      def: L('النطقُ بالنون حالةً بين الإظهار والإدغام، عاريةً من التشديد، مع الغنّة، إذا جاء بعدها أحدُ خمسة عشر حرفًا.', 'On prononce le noun dans un état intermédiaire entre idhhar et idgham, sans redoublement, avec ghunna, quand il est suivi de l’une de quinze lettres.', 'The noon is pronounced in a state between idhhar and idgham, without doubling, with ghunna, when followed by one of fifteen letters.'),
      groups: [{ t: L('الحروف الخمسة عشر', 'Les quinze lettres', 'The fifteen letters'), l: ['ت', 'ث', 'ج', 'د', 'ذ', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ف', 'ق', 'ك'] }],
      ex: rulesEx[3],
    },
  ],
};

const DATA = {
  ui: {
    ar: { dir: 'rtl', back: 'العودة', title: 'تعلّم التجويد', sub: 'دروسٌ قصيرةٌ مستقلّة: اقرأ القاعدة، ثم استمع، ثم ردِّد', tabs: ['حفص', 'ورش'],
          teacher: 'هذه الصفحة تمهيديّةٌ تساعدك على التدريب بين دروسك، ولا تغني عن معلّمٍ متقنٍ يسمع قراءتك ويصحّحها. ونصُّ القرآن في الأمثلة منقولٌ حرفيًّا من مصحف التطبيق دون أيّ تلوينٍ أو تعديل.',
          examples: 'أمثلة', listen: 'استمع', repeat: 'ردِّد وقارِن', noAudio: 'الاستماع والترديد بصوت قارئ ورش سيُضاف بعد التحقّق من التسجيلات.', warshT: 'في رواية ورش', refs: 'المراجع',
          foot: 'الأمثلة من مصحف المدينة (حفص) والمصحف المحمّدي (ورش) كما في التطبيق. والتعريفات والحروف المتداولة في كتب التجويد؛ وما يخصّ ورشًا يراجعه معلّمٌ متقن.', qrT: 'حمِّل التطبيق من Google Play' },
    fr: { dir: 'ltr', back: 'Retour', title: 'Apprendre le tajwid', sub: 'De courtes leçons indépendantes : lisez la règle, écoutez, puis répétez', tabs: ['Hafs', 'Warsh'],
          teacher: 'Cette page est une introduction qui vous aide à vous entraîner entre vos cours ; elle ne remplace pas un enseignant qualifié qui vous écoute et vous corrige. Le texte coranique des exemples est repris tel quel du mushaf de l’application, sans aucune coloration ni modification.',
          examples: 'Exemples', listen: 'Écouter', repeat: 'Répéter et comparer', noAudio: 'L’écoute et la répétition avec un récitant de Warsh seront ajoutées après vérification des enregistrements.', warshT: 'Dans la lecture de Warsh', refs: 'Références',
          foot: 'Les exemples viennent du mushaf de Médine (Hafs) et du mushaf Muhammadi (Warsh) tels qu’ils sont dans l’application. Les définitions et les lettres sont celles des livres de tajwid ; ce qui concerne Warsh est à faire relire par un enseignant qualifié.', qrT: 'Téléchargez l’application sur Google Play' },
    en: { dir: 'ltr', back: 'Back', title: 'Learn Tajweed', sub: 'Short independent lessons: read the rule, listen, then repeat', tabs: ['Hafs', 'Warsh'],
          teacher: 'This page is an introduction to help you practise between your lessons; it does not replace a qualified teacher who listens to you and corrects you. The Quran text in the examples is copied verbatim from the app’s mushaf, with no colouring or change.',
          examples: 'Examples', listen: 'Listen', repeat: 'Repeat & compare', noAudio: 'Listening and repeating with a Warsh reciter will be added once the recordings are verified.', warshT: 'In Warsh’s recitation', refs: 'References',
          foot: 'Examples are from the Madinah mushaf (Hafs) and the Muhammadi mushaf (Warsh) as in the app. The definitions and letters are those found in tajweed textbooks; what concerns Warsh should be reviewed by a qualified teacher.', qrT: 'Get the app on Google Play' },
  },
  lesson,
  refs: [
    L('متن «تحفة الأطفال والغلمان» — سليمان الجمزوري (أسماءُ الأحكام وحروفُها).', 'Matn « Tuhfat al-Atfâl wal-Ghilmân » — Sulaymân al-Jamzûrî (noms et lettres des règles).', 'Matn “Tuhfat al-Atfal wal-Ghilman” — Sulayman al-Jamzuri (names and letters of the rules).'),
    L('«المقدّمة فيما على قارئ القرآن أن يعلمه» (الجزريّة) — ابن الجزري.', '« La Muqaddima » (al-Jazariyya) — Ibn al-Jazarî.', '“al-Muqaddima” (al-Jazariyya) — Ibn al-Jazari.'),
    L('نصُّ الأمثلة: مصحف المدينة (حفص)، والمصحف المحمّدي (ورش) كما في التطبيق.', 'Texte des exemples : mushaf de Médine (Hafs) et mushaf Muhammadi (Warsh), comme dans l’application.', 'Example text: Madinah mushaf (Hafs) and Muhammadi mushaf (Warsh), as in the app.'),
  ],
};
DATA.hafs = {}; DATA.warsh = {};

/* مثالُ نقل الهمزة يُضاف إلى بطاقة ملاحظات ورش */
const tpl = fs.readFileSync('tools/tajweed-template.html', 'utf8');
let out = tpl.replace('/*__DATA__*/null', JSON.stringify(DATA));
/* بطاقةُ مثال النقل: تُحقَن في تبويب ورش بعد ملاحظاته */
out = out.replace("if (!hafs){ h += '<div class=\"card\"><h2>' + esc(L.warshT) + '</h2>'; ls.warshNotes.forEach(function(p){ h += '<p>' + esc(p[lang]) + '</p>'; }); h += '</div>'; }",
  "if (!hafs){ h += '<div class=\"card\"><h2>' + esc(L.warshT) + '</h2>'; ls.warshNotes.forEach(function(p){ h += '<p>' + esc(p[lang]) + '</p>'; }); if (ls.warshEx) h += '<div class=\"exs\">' + exHtml(ls.warshEx, L, false) + '</div>'; h += '</div>'; }");
fs.writeFileSync('tajweed.html', out);
console.log('✓ tajweed.html', Math.round(out.length / 1024) + ' KB', '· أمثلة حفص/ورش:', rulesEx.flat().length, rulesEx.flat().filter(e => e.warsh).length);
