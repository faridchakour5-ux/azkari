/* واجهة فرنسيّة — تُحمَّل عند اختيار «Français» من الإعدادات (settings.lang==='fr').
   النطاق: قوائمُ التطبيق وإعداداتُه وأدواتُه ورسائلُه الشائعة. أمّا النصوصُ الدينيّة (القرآن والأذكار والفقه والسيرة والأحاديث وأسئلةُ الاختبار)
   فتبقى عربيّةً، فلا نُترجم دينًا دون مراجعةٍ شرعيّة. ما لا مقابلَ له في القاموس يبقى بالعربيّة.
   الطريقة: نُترجم عُقَدَ النصّ في الصفحة بمطابقةٍ تامّة على النصّ بعد حذف التشكيل، وبأنماطٍ للتواريخ والأعداد؛ ومراقِبٌ يلتقط ما يُضاف لاحقًا.
   الأرقامُ لاتينيّةٌ دائمًا. */
(function(){
'use strict';
if(window.I18N) return;
const MARKS=/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const AR_RE=/[؀-ۿ]/;
const key=s=>String(s).replace(MARKS,'').replace(/[ \s]+/g,' ').trim();
const D=new Map(); const add=a=>{ for(const [k,v] of a) D.set(key(k), v); };
const SURA=new Map(); const addS=a=>{ for(const [k,v] of a) SURA.set(key(k), v); };
const NO_SEL=['#wird-body','#az-list','#tafsir-body .t-txt','#tafsir-body .t-aya','#tafsir-body .t-intro','#tafsir-body .sv .tx','[data-noi18n]'];
const GM={'يناير':'janvier','فبراير':'février','مارس':'mars','أبريل':'avril','ماي':'mai','يونيو':'juin','يوليوز':'juillet','غشت':'août','شتنبر':'septembre','أكتوبر':'octobre','نونبر':'novembre','دجنبر':'décembre'};
const HM={'محرم':'Mouharram','صفر':'Safar','ربيع الأول':'Rabi’ al-awwal','ربيع الآخر':'Rabi’ ath-thani','جمادى الأولى':'Joumada al-oula','جمادى الآخرة':'Joumada ath-thania','رجب':'Rajab','شعبان':'Chaabane','رمضان':'Ramadan','شوال':'Chawwal','ذو القعدة':'Dhou al-qida','ذو الحجة':'Dhou al-hijja'};
const DAYS={'الأحد':'Dimanche','الاثنين':'Lundi','الثلاثاء':'Mardi','الأربعاء':'Mercredi','الخميس':'Jeudi','الجمعة':'Vendredi','السبت':'Samedi'};
const DIRS={'الشمال':'le nord','الشمال الشرقي':'le nord-est','الشرق':'l’est','الجنوب الشرقي':'le sud-est','الجنوب':'le sud','الجنوب الغربي':'le sud-ouest','الغرب':'l’ouest','الشمال الغربي':'le nord-ouest'};
const norm=s=>key(s).replace(/ّ/g,'');
const mapLook=(M,s)=>{ s=norm(s); for(const k in M) if(norm(k)===s) return M[k]; return null; };
const sura=n=>{ const k=key(n); return SURA.get(k) || n; };
const gDate=s=>{ const m=key(s).match(/^(?:(\S+) )?(\d+) (\S+) (\d+)$/); if(!m) return null; const mo=mapLook(GM,m[3]); if(!mo) return null; const dd=m[1]?mapLook(DAYS,m[1]):null; return (dd?dd+' ':'')+m[2]+' '+mo+' '+m[4]; };
const hDate=s=>{ const m=key(s).match(/^(\d+) (.+?) (\d+) هـ$/); if(!m) return null; const mo=mapLook(HM,m[2]); return mo? m[1]+' '+mo+' '+m[3]+' H' : null; };
const t24=(h,mi,ap)=>{ let H=+h%12; if(ap==='م') H+=12; return String(H).padStart(2,'0')+':'+mi; };
const nPl=(n,one,many)=> n+' '+(+n<=1?one:many);
/* أنماطٌ للنصوص ذات الأعداد والتواريخ (تُطبَّق على النصّ بعد حذف التشكيل) */
const PATS=[
  [/^(\d{1,2}):(\d{2}) ([صم])$/, m=>t24(m[1],m[2],m[3])],
  [/^(\d+) من (\d+)$/, m=>m[1]+' sur '+m[2]],
  [/^صفحة (\d+) من (\d+)$/, m=>'Page '+m[1]+' sur '+m[2]],
  [/^سورة (.+)$/, m=>'Sourate '+sura(m[1])],
  [/^﴾ ?سورة (.+)$/, m=>'Sourate '+sura(m[1])],
  [/^آية (\d+)$/, m=>'Verset '+m[1]],
  [/^([\d.,]+) م\.ب$/, m=>m[1]+' Mo'], [/^([\d.,]+) ك\.ب$/, m=>m[1]+' Ko'], [/^([\d.,]+) غ\.ب$/, m=>m[1]+' Go'],
  [/^تلاوة واحدة$/, ()=>'1 récitation'], [/^تلاوتان$/, ()=>'2 récitations'], [/^(\d+) تلاوات$/, m=>m[1]+' récitations'], [/^(\d+) تلاوة$/, m=>m[1]+' récitations'],
  [/^(\d+) آيات$/, m=>m[1]+' versets'], [/^(\d+) آية$/, m=>m[1]+' versets'],
  [/^(مكية|مدنية) • (\d+) آي(?:ات|ة)$/, m=>(m[1]==='مكية'?'Mecquoise':'Médinoise')+' • '+m[2]+' versets'],
  [/^مستوى (\d+)$/, m=>'Niveau '+m[1]],
  [/^اليوم — (\d+) للمراجعة$/, m=>'Aujourd’hui — '+m[1]+' à réviser'],
  [/^عندك (\d+) للمراجعة$/, m=>m[1]+' à réviser'],
  [/^صلوات اليوم — (.+)$/, m=>'Prières du jour — '+(gDate(m[1])||m[1])],
  [/^موعد المراجعة: (.+)$/, m=>'Prochaine révision : '+(gDate(m[1])||m[1])],
  [/^بعد (\d+) يوما · (.+)$/, m=>'Dans '+nPl(m[1],'jour','jours')+' · '+(hDate(m[2])||m[2])],
  [/^(اليوم|غدا) · (.+)$/, m=>(m[1]==='اليوم'?'Aujourd’hui':'Demain')+' · '+(hDate(m[2])||m[2])],
  [/^(\d+) ([^\d]+) (\d+) هـ$/, m=>hDate(m[0])||m[0]],
  [/^(\S+ \d+ \S+ \d+)$/, m=>gDate(m[1])||null],
  [/^(\d+) ([^\d]+) (\d+) هـ$/, m=>hDate(m[0])],
  [/^(\S+) – (\S+) (\d+)$/, m=>{ const a=mapLook(GM,m[1]), b=mapLook(GM,m[2]); return a&&b? a+' – '+b+' '+m[3] : null; }],
  [/^(\S+) (\d+)$/, m=>{ const a=mapLook(GM,m[1]); return a? a+' '+m[2] : null; }],
  [/^(.+) (\d+) هـ$/, m=>{ const a=mapLook(HM,m[1]); return a? a+' '+m[2]+' H' : null; }],
  [/^من (.+) نحو (.+)$/, m=>{ const a=mapLook(DIRS,m[1].replace(/^ال/,'ال')); const b=mapLook(DIRS,m[2]); return (m[1]===key('الشمال')&&b)? 'du nord vers '+b : null; }],
  [/^تبعد الكعبة عنك نحو ([\d,.]+) كم$/, m=>'La Kaaba est à environ '+m[1]+' km'],
  [/^الإفطار اليوم عند (.+)\.$/, m=>'L’iftar est aujourd’hui à '+m[1]+'.'],
  [/^يبدأ رمضان بالحساب بعد (\d+) يوما \(تقريبا\)\.$/, m=>'Le Ramadan commence, d’après le calcul, dans environ '+nPl(m[1],'jour','jours')+'.'],
  [/^إمساكية رمضان (\d+) هـ$/, m=>'Imsakiya du Ramadan '+m[1]+' H'],
  [/^سيتوقف الاستماع بعد (\d+) دقيقة$/, m=>'L’écoute s’arrêtera dans '+m[1]+' minutes'],
  [/^(\d+) دقيقة$/, m=>m[1]+' minutes'],
  [/^غدا: (.+)$/, m=>'Demain : '+(TR_EV(m[1])||m[1])],
  [/^غدا$/, ()=>null]
];
function TR_EV(s){ return find(s); }
function lookup(core){
  const k=key(core);
  let r=D.get(k); if(r!=null) return r;
  r=SURA.get(k); if(r!=null) return r;
  for(const [re,fn] of PATS){ const m=k.match(re); if(m){ const v=fn(m); if(v!=null) return v; } }
  return null;
}
function find(core){ return lookup(core); }
function trText(raw){
  const lead=raw.match(/^\s*/)[0], trail=raw.match(/\s*$/)[0], core=raw.trim();
  if(!core || !AR_RE.test(core)) return null;
  let r=find(core); if(r!=null) return lead+r+trail;
  const m=core.match(/^([•:،؛\-—–··\s]*)([\s\S]*?)([:،؛\-—–·\s]*)$/);
  if(m && (m[1]||m[3]) && m[2]){ r=find(m[2]); if(r!=null) return lead+m[1]+r+m[3]+trail; }
  return null;
}
const ATTRS=['title','aria-label','placeholder','alt'];
const SKIP_TAG=new Set(['SCRIPT','STYLE','TEXTAREA','NOSCRIPT']);
let busy=false;
function skipped(el){ try{ return !!(el.closest && el.closest(NO_SEL.join(','))); }catch(e){ return false; } }
function fixNode(n){
  const v=n.nodeValue; if(!v || !AR_RE.test(v)) return;
  const p=n.parentNode; if(!p || (p.nodeType===1 && (SKIP_TAG.has(p.nodeName) || skipped(p)))) return;
  const r=trText(v); if(r!=null && r!==v){ if(n.__ar==null) n.__ar=v; n.nodeValue=r; if(p.nodeType===1 && p.setAttribute && !p.hasAttribute('dir') && /[A-Za-zÀ-ÿ]{3}/.test(r) && r.length>26) p.setAttribute('dir','auto'); }
}
function fixAttrs(el){
  for(const a of ATTRS){ const v=el.getAttribute && el.getAttribute(a); if(v && AR_RE.test(v)){ const r=trText(v); if(r!=null && r!==v) el.setAttribute(a,r); } }
}
function walk(root){
  if(!root) return;
  if(root.nodeType===3){ fixNode(root); return; }
  if(root.nodeType!==1) return;
  if(SKIP_TAG.has(root.nodeName) || skipped(root)) return;
  fixAttrs(root);
  for(let c=root.firstChild; c; c=c.nextSibling) walk(c);
}
let mo=null;
function start(){
  document.documentElement.lang='fr';
  try{ document.title='Salati — invocations et Coran'; }catch(e){}
  busy=true; try{ walk(document.body); }finally{ busy=false; }
  if(mo) return;
  mo=new MutationObserver(list=>{
    if(busy) return; busy=true;
    try{
      for(const m of list){
        if(m.type==='characterData'){ fixNode(m.target); }
        else if(m.type==='attributes'){ fixAttrs(m.target); }
        else m.addedNodes.forEach(n=>walk(n));
      }
    } finally { busy=false; }
  });
  mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
}
window.I18N={ lang:'fr', start, t:s=>{ const r=trText(String(s)); return r==null?s:r; }, _D:D };

/* ===================== واجهة التطبيق (index.html) ===================== */
add([
[`الوِرد`,`Lecture`], [`الاستماع`,`Écoute`], [`الأذكار`,`Invocations`], [`الفقه`,`Fiqh`], [`الإعدادات`,`Réglages`], [`المسبحة`,`Chapelet`],
[`المصحف الكريم`,`Le Saint Coran`], [`المصحف كامل`,`Mushaf complet`], [`القرآن الكريم`,`Le Saint Coran`], [`القرآن`,`Coran`], [`صلاتي`,`Salati`],
[`أدوات المسلم`,`Outils du musulman`], [`القبلة · التقويم الهجري · صلواتي · الصيام · الزكاة`,`Qibla · Calendrier hégirien · Mes prières · Jeûne · Zakat`],
[`اليوم الجمعة — سورة الكهف والصلاة على النبيّ ﷺ وساعة الإجابة`,`Aujourd’hui vendredi — sourate al-Kahf, prière sur le Prophète ﷺ et l’heure de l’exaucement`],
[`افتح`,`Ouvrir`], [`إغلاق`,`Fermer`], [`رجوع`,`Retour`], [`التالي`,`Suivant`], [`السابقة`,`Précédent`], [`التالية`,`Suivante`], [`لاحقًا`,`Plus tard`], [`فهمت`,`Compris`],
[`أذكار الصباح`,`Invocations du matin`], [`أذكار المساء`,`Invocations du soir`], [`أذكار النوم`,`Invocations du coucher`], [`أذكار الاستيقاظ`,`Invocations du réveil`],
[`أذكار ما بعد الصلاة`,`Invocations après la prière`], [`أذكار عامّة`,`Invocations générales`], [`أذكار وأدعية عامّة`,`Invocations et prières générales`],
[`الصباح`,`Matin`], [`المساء`,`Soir`], [`النوم`,`Coucher`], [`الاستيقاظ`,`Réveil`], [`بعد الصلاة`,`Après la prière`], [`الركوب`,`Monture`], [`السفر`,`Voyage`], [`الامتحان`,`Examen`], [`الاستقامة`,`Droiture`],
[`أذكار الركوب`,`Invocations de la monture`], [`أذكار السفر`,`Invocations du voyage`], [`أدعية الاستقامة`,`Invocations pour la droiture`], [`أدعية الامتحان والشدّة`,`Invocations pour l’examen et l’épreuve`],
[`فضل الذكر`,`Mérite du dhikr`], [`وصايا النبي ﷺ`,`Recommandations du Prophète ﷺ`], [`من وصايا النبي ﷺ`,`Recommandations du Prophète ﷺ`], [`جميع الأذكار`,`Toutes les invocations`], [`جميع الأذكار — حصن المسلم`,`Toutes les invocations — Hisn al-Muslim`],
[`والبخاري ومسلم`,`et al-Bukhari et Muslim`], [`القرآن وصحيح البخاري ومسلم`,`Coran, Sahih al-Bukhari et Muslim`], [`حصن المسلم`,`Hisn al-Muslim (La Citadelle du musulman)`],
[`أذكار ومصحف — يعملان دون إنترنت`,`Invocations et Coran — fonctionnent sans Internet`], [`دون إنترنت`,`Hors ligne`],
[`0 من 0`,`0 sur 0`], [`صفحة 1 من 604`,`Page 1 sur 604`], [`تمرير للقراءة`,`Défiler pour lire`], [`↩︎ تابِع القراءة من حيث وصلت`,`↩︎ Reprendre la lecture là où vous en étiez`], [`↩︎ تابِع القراءة من علامتك`,`↩︎ Reprendre depuis votre marque-page`],
[`تمّ — الوِرد التالي`,`Terminé — lecture suivante`], [`الانتقال إلى سورة`,`Aller à une sourate`], [`ابحث عن سورة`,`Chercher une sourate`], [`ابحث عن سورة…`,`Chercher une sourate…`], [`اختر السورة`,`Choisir la sourate`], [`اختر القسم`,`Choisir la section`],
[`البحث في القرآن`,`Rechercher dans le Coran`], [`البحث في القرآن — سورة أو كلمة`,`Rechercher dans le Coran — sourate ou mot`], [`اكتب اسم سورة أو كلمة من القرآن…`,`Saisissez un nom de sourate ou un mot du Coran…`],
[`اكتب اسم سورة (مثل: الكهف) أو كلمة من آية (مثل: الرحمن)`,`Saisissez un nom de sourate (ex. : al-Kahf) ou un mot d’un verset (ex. : ar-Rahman)`], [`اكتب حرفين على الأقلّ للبحث في الآيات`,`Saisissez au moins deux lettres pour chercher dans les versets`],
[`لم يُعثر على نتائج`,`Aucun résultat`], [`لا سورةَ بهذا الاسم`,`Aucune sourate de ce nom`], [`آيات`,`Versets`], [`سُوَر`,`Sourates`], [`الآيات`,`Versets`], [`الآية`,`Verset`], [`آية`,`Verset`], [`سورة`,`Sourate`], [`الجزء`,`Juz’`], [`الحزب`,`Hizb`], [`ربع الحزب`,`Quart de hizb`], [`نصف الحزب`,`Demi-hizb`], [`حزب كامل`,`Hizb entier`], [`ثُمن`,`Huitième`],
[`ورش`,`Warsh`], [`حفص`,`Hafs`], [`رواية القرآن`,`Récitation du Coran`], [`الرواية`,`Récitation`], [`رواية حفص`,`Récitation de Hafs`], [`نص القرآن`,`Texte du Coran`], [`مرجع حفص`,`Référence de Hafs`], [`مرجع ورش`,`Référence de Warsh`],
[`مصحف الملك فهد`,`Mushaf du roi Fahd`], [`المصحف المحمدي`,`Mushaf mohammadien`], [`ورش — الخط المغربي`,`Warsh — écriture maghrébine`], [`حفص — مصحف الملك فهد`,`Hafs — Mushaf du roi Fahd`], [`تبديل الرواية`,`Changer de récitation`],
[`رواية حفص عن عاصم — عن مصحف الملك فهد، بخطّه ورموزِه.`,`Récitation de Hafs d’après ʿĀsim — selon le Mushaf du roi Fahd, avec son écriture et ses signes.`],
[`رواية ورش عن نافع — عن المصحف المحمدي، بالخطّ المغربي. الأدعية موحَّدة في الروايتين.`,`Récitation de Warsh d’après Nāfiʿ — selon le Mushaf mohammadien, en écriture maghrébine. Les invocations sont les mêmes dans les deux récitations.`],
[`لون خطّ القرآن`,`Couleur du texte coranique`], [`عادي`,`Normal`], [`أزرق`,`Bleu`], [`أزرق أقل غموقاً`,`Bleu moins foncé`], [`أزرق غامق`,`Bleu foncé`], [`زمرّديّ 1 — فاتح`,`Émeraude 1 — clair`], [`زمرّديّ 2 — متوسط`,`Émeraude 2 — moyen`], [`زمرّديّ 3 — عميق`,`Émeraude 3 — profond`], [`زمرّديّ 4 — غامق جدًّا`,`Émeraude 4 — très foncé`],
[`ترجمة معاني الآية`,`Traduction du sens du verset`], [`بلا`,`Aucune`], [`عرض ‹`,`Afficher ‹`], [`عرض ↗`,`Afficher ↗`],
[`لون الخلفية`,`Couleur de fond`], [`المظهر`,`Apparence`], [`نمط الكتابة`,`Style d’écriture`], [`الخط`,`Police`], [`حديث (افتراضي)`,`Moderne (par défaut)`], [`نسخ`,`Naskh`], [`كوفي`,`Coufique`], [`القاهرة`,`Le Caire`], [`تجوّل`,`Tajawal`], [`رقعة`,`Roqʿa`], [`مغربي`,`Maghrébin`],
[`حجم خطّ القرآن`,`Taille du texte coranique`], [`حجم كتابة الأذكار والفقه`,`Taille du texte des invocations et du fiqh`], [`تكبير خطّ القرآن`,`Agrandir le texte coranique`], [`تصغير خطّ القرآن`,`Réduire le texte coranique`], [`تكبير الكتابة`,`Agrandir le texte`], [`تصغير الكتابة`,`Réduire le texte`],
[`يُطبَّق النمط على نصّ الأذكار. آيات القرآن تبقى بخطّها المعتمد لكل رواية.`,`Le style s’applique au texte des invocations. Les versets du Coran gardent leur écriture de référence pour chaque récitation.`],
[`التطبيق`,`Application`], [`أضِف إلى الشاشة الرئيسية`,`Ajouter à l’écran d’accueil`], [`ثبِّت «صلاتي» على هاتفك`,`Installez « Salati » sur votre téléphone`], [`يُفتح بلا متصفّح، والأذكارُ والمصحفُ دون إنترنت`,`S’ouvre sans navigateur ; invocations et Coran hors ligne`], [`تثبيت`,`Installer`], [`ثبِّت الآن`,`Installer maintenant`],
[`ثبِّت التطبيق ليعمل كتطبيق مستقلّ بدون متصفّح — والأذكارُ والمصحفُ يعملان دون إنترنت.`,`Installez l’application pour l’utiliser seule, sans navigateur — invocations et Coran fonctionnent hors ligne.`],
[`التنبيهات`,`Notifications`], [`إشعارٌ عند دخول وقت كلّ صلاة`,`Notification à l’entrée de chaque prière`], [`الأذان عند دخول الوقت`,`Adhan à l’entrée de l’heure`], [`أذان الصلوات الخمس بصوت المؤذّن`,`Adhan des cinq prières par la voix du muezzin`],
[`تذكير بالأذكار`,`Rappel des invocations`], [`تذكير بالصلاة على النبي ﷺ`,`Rappel de la prière sur le Prophète ﷺ`], [`تصلني التذكيرات والتطبيق مغلق`,`Recevoir les rappels application fermée`],
[`تجربة الأذان الآن`,`Tester l’adhan maintenant`], [`تجربة الإشعار الآن`,`Tester la notification maintenant`], [`تجربة الإشعار من الخادم الآن`,`Tester la notification du serveur maintenant`], [`افتح إعداد البطارية`,`Ouvrir les réglages de batterie`], [`اسمح بها الآن`,`Autoriser maintenant`],
[`زرّ «خفض الصوت» يوقف الأذان`,`Le bouton « volume bas » arrête l’adhan`], [`زرُّ «خفض الصوت» يخفّض صوتَ الأذان فقط`,`Le bouton « volume bas » baisse seulement le volume de l’adhan`],
[`سيُوقَف الأذانُ بضغط «خفض الصوت» ✓`,`L’adhan sera arrêté en appuyant sur « volume bas » ✓`], [`سيُرفع الأذانُ عند دخول وقت كلّ صلاة ✓`,`L’adhan retentira à l’entrée de chaque prière ✓`],
[`تنبيه: لم يُؤذَن للتطبيق بالمنبّهات الدقيقة، فقد يتأخّر الأذانُ دقائق عن وقته.`,`Attention : l’application n’est pas autorisée à utiliser les alarmes exactes ; l’adhan peut avoir quelques minutes de retard.`],
[`لأعلى موثوقيّةٍ للأذان: اختر «عدم التحسين» للتطبيق في إعدادات البطارية، وتأكّد ألّا يكون في «التطبيقات النائمة» (سامسونغ) أو «حماية التطبيقات» (شاومي/هواوي).`,`Pour une fiabilité maximale de l’adhan : choisissez « Ne pas optimiser » pour l’application dans les réglages de batterie, et vérifiez qu’elle ne figure pas dans les « applications en veille » (Samsung) ni dans la « protection des applications » (Xiaomi/Huawei).`],
[`الأذانُ بصوته كاملًا لا يرفعه المتصفّحُ والتطبيقُ مغلقٌ — وهو قيدٌ في المتصفّح نفسِه لا في التطبيق. وبإمكانك أن يصلك إشعارٌ نصّيٌّ عند دخول كلّ وقتٍ بالخيار أدناه.`,`Le navigateur ne peut pas faire retentir l’adhan en entier application fermée — c’est une limite du navigateur, pas de l’application. Vous pouvez recevoir une notification écrite à chaque entrée d’heure avec l’option ci-dessous.`],
[`مفعَّل: تصلك التذكيراتُ وإشعارُ كلّ صلاةٍ حتى والتطبيقُ مغلق.`,`Activé : vous recevez les rappels et la notification de chaque prière même application fermée.`],
[`مفعَّل: تصلك أذكارُ الصباح والمساء والصلاةُ على النبيّ ﷺ والتطبيقُ مغلق. ولإشعار أوقات الصلاة فعِّل الموقع من صفحة الأذكار.`,`Activé : vous recevez les invocations du matin et du soir et la prière sur le Prophète ﷺ application fermée. Pour les notifications des heures de prière, activez la localisation depuis la page des invocations.`],
[`التلاوات المُنزَّلة والتخزين`,`Récitations téléchargées et stockage`], [`على جهازك`,`Sur votre appareil`], [`المساحة التي تشغلها`,`Espace occupé`], [`المتاح في الجهاز (تقريبًا)`,`Disponible sur l’appareil (approx.)`], [`احذف كلّ التلاوات المُنزَّلة`,`Supprimer toutes les récitations téléchargées`], [`لا شيء`,`Aucune`],
[`التلاوات التي نزّلتَها من صفحة «الاستماع» تُسمَع دون إنترنت. يمكنك حذفها من هنا لتوفير المساحة.`,`Les récitations téléchargées depuis la page « Écoute » s’écoutent hors ligne. Vous pouvez les supprimer ici pour libérer de l’espace.`],
[`النسخ الاحتياطي`,`Sauvegarde`], [`حفظ تقدّمي في ملف`,`Enregistrer ma progression dans un fichier`], [`حفظ تقدّمي في ملف`,`Enregistrer ma progression dans un fichier`], [`استعادة من ملف`,`Restaurer depuis un fichier`],
[`يحفظ الملفُ تقدّمك وإعداداتك وعلاماتك. استعمله لنقل بياناتك إلى هاتفٍ جديد أو إلى النسخة المثبَّتة من المتجر. التلاواتُ المنزَّلة لا تدخل فيه.`,`Le fichier contient votre progression, vos réglages et vos marque-pages. Utilisez-le pour transférer vos données vers un nouveau téléphone ou vers la version du store. Les récitations téléchargées n’en font pas partie.`],
[`عن التطبيق`,`À propos`], [`الإصدار`,`Version`], [`التطبيق`,`Application`], [`سياسة الخصوصية`,`Politique de confidentialité`], [`صور القرّاء (النَّسب والتراخيص)`,`Photos des récitants (crédits et licences)`], [`الجولة التعريفيّة`,`Visite guidée`],
[`الأذكار من كتاب «حصن المسلم». ونصّ القرآن: رواية حفص عن`,`Les invocations proviennent du livre « Hisn al-Muslim ». Texte du Coran : récitation de Hafs d’après`],
[`اختر القارئ ثمّ السورة للاستماع إليها`,`Choisissez le récitant puis la sourate à écouter`], [`اختر الداعية`,`Choisir le prédicateur`], [`اختر السلسلة`,`Choisir la série`], [`اختر الداعية ثمّ التسجيل`,`Choisissez le prédicateur puis l’enregistrement`],
[`اختر داعيةً من القائمة — تُشغَّل التسجيلات من أرشيف الإنترنت (يحتاج اتصالًا)`,`Choisissez un prédicateur dans la liste — les enregistrements sont lus depuis l’archive Internet (connexion requise)`],
[`اختر سلسلةً من القائمة · تُشغَّل من أرشيف الإنترنت (يحتاج اتصالًا)`,`Choisissez une série dans la liste · lecture depuis l’archive Internet (connexion requise)`],
[`اقرأ نفس السورة`,`Lire la même sourate`], [`بلا تكرار`,`Sans répétition`], [`تكرار السورة`,`Répéter la sourate`], [`موضع التلاوة`,`Position de la récitation`], [`تتبّع التلاوة`,`Suivre la récitation`], [`أبطأ`,`Plus lent`], [`أسرع`,`Plus rapide`], [`أبطئ التتبّع`,`Ralentir le suivi`], [`أسرِع التتبّع`,`Accélérer le suivi`], [`إيقاف مؤقّت`,`Pause`], [`تشغيل`,`Lecture`],
[`مؤقّت النوم`,`Minuteur de sommeil`], [`التحفيظ`,`Mémorisation`], [`إنهاء التحفيظ`,`Terminer la mémorisation`], [`القسم`,`Section`], [`الدعاة`,`Prédicateurs`], [`قصص الأنبياء`,`Histoires des prophètes`], [`السيرة النبوية`,`Biographie du Prophète`], [`الأحاديث الصحيحة`,`Hadiths authentiques`], [`صحيح البخاري`,`Sahih al-Bukhari`], [`صحيح مسلم`,`Sahih Muslim`],
[`الأذان`,`Adhan`], [`فيديو`,`Vidéo`], [`خطبة الجمعة`,`Sermon du vendredi`], [`خُطب ودروس`,`Sermons et cours`], [`الثقافة`,`Culture`], [`الفقه العملي`,`Fiqh pratique`], [`كيف أتوضّأ · أصلّي · أغتسل · أصوم`,`Comment faire ses ablutions · prier · faire le ghusl · jeûner`],
[`تذكيرك`,`Votre rappel`], [`تذكيرك اليوم`,`Votre rappel du jour`], [`ذكر · صلاة على الحبيب ﷺ · ربع صفحة`,`Invocation · prière sur le Bien-aimé ﷺ · quart de page`], [`صَلِّ عَلَى الحَبِيبِ`,`Priez sur le Bien-aimé`],
[`اضغط على كلّ ذكر حتى يكتمل العدد — ويتغيّر التذكير في كل مرّة.`,`Touchez chaque invocation jusqu’à compléter le nombre — le rappel change à chaque fois.`], [`اضغط لتطبيقه الآن`,`Touchez pour l’appliquer maintenant`],
[`تفعيل مواقيت الصلاة حسب موقعك`,`Activer les horaires de prière selon votre position`], [`تحديث موقعي`,`Actualiser ma position`], [`الصلاة القادمة`,`Prochaine prière`], [`الفجر`,`Fajr`], [`الشروق`,`Lever du soleil`], [`الظهر`,`Dhouhr`], [`العصر`,`Asr`], [`المغرب`,`Maghrib`], [`العشاء`,`Isha`],
[`شرح الذكر`,`Explication de l’invocation`], [`شارِكها`,`Partager`], [`التفسير`,`Exégèse`], [`ماذا تريد؟`,`Que souhaitez-vous ?`], [`ماذا تريد أن تسمع؟`,`Que souhaitez-vous écouter ?`], [`ادخل التطبيق`,`Entrer dans l’application`], [`حدِّث`,`Mettre à jour`], [`تحديثٌ جديد جاهز`,`Une mise à jour est prête`],
[`العودة إلى أعلى الصفحة`,`Retour en haut de la page`], [`العودة إلى الأعلى`,`Retour en haut`], [`قرآن`,`Coran`], [`فقه`,`Fiqh`], [`سنّة`,`Sunna`], [`سيرة`,`Biographie`], [`نتيجة الاختبار`,`Résultat du quiz`], [`اختبار الثقافة الإسلامية`,`Quiz de culture islamique`],
[`ابدأ`,`Commencer`], [`تخطَّ`,`Passer`]
]);
/* ===================== أدوات المسلم (tools.js) ===================== */
add([
[`بوصلةٌ نحو الكعبة`,`Boussole vers la Kaaba`],[`التقويم الهجريّ`,`Calendrier hégirien`],[`الأيّام والمناسبات`,`Jours et occasions`],[`صلواتي`,`Mes prières`],[`تابِع صلواتك اليوم`,`Suivez vos prières du jour`],
[`الصيام`,`Jeûne`],[`التطوّع وإمساكيّة رمضان`,`Jeûne surérogatoire et imsakiya du Ramadan`],[`حاسبة الزكاة`,`Calculateur de zakat`],[`تقديريّةٌ وبسيطة`,`Estimative et simple`],[`مراجعة الحفظ`,`Révision de la mémorisation`],[`تذكيرٌ متباعد`,`Rappels espacés`],[`تذكيراتي`,`Mes rappels`],[`الجمعة والمراجعة`,`Vendredi et révision`],
[`اليوم الجمعة`,`Aujourd’hui, vendredi`],[`سورة الكهف`,`Sourate al-Kahf`],
[`ورد في قراءتها يومَ الجمعة حديثٌ صحّحه جمعٌ من أهل العلم («أضاء له من النور ما بين الجمعتين»)، وفي رفعه ووقفِه خلافٌ بين المحدّثين.`,`Un hadith recommande de la lire le vendredi et plusieurs savants l’ont authentifié (« une lumière l’éclairera d’un vendredi à l’autre ») ; les spécialistes divergent toutefois sur son attribution au Prophète ﷺ (marfūʿ) ou à un compagnon (mawqūf).`],
[`الصلاة على النبيّ ﷺ`,`Prière sur le Prophète ﷺ`],[`«أكثِروا الصلاةَ عليَّ يومَ الجمعة» (أبو داود 1047) —`,`« Multipliez les prières sur moi le vendredi » (Abou Dawoud 1047) —`],[`بلا عدد`,`sans nombre limité`],
[`ساعة الإجابة`,`L’heure de l’exaucement`],[`ثبت أنّ في الجمعة ساعةً لا يوافقها عبدٌ مسلمٌ قائمٌ يصلّي يسأل الله شيئًا إلّا أعطاه (البخاري 935، مسلم 852). وفي تحديدها خلافٌ: أرجحُ ما قيل ما بين جلوس الإمام إلى انقضاء الصلاة، وآخرُ ساعةٍ بعد العصر.`,`Il est établi que le vendredi comporte une heure où tout musulman qui prie en demandant quelque chose à Allah l’obtient (al-Bukhari 935, Muslim 852). Sa détermination fait débat : les avis les plus retenus sont entre l’arrivée de l’imam et la fin de la prière, ou la dernière heure après l’Asr.`],
[`الاغتسالُ والتبكيرُ إلى الصلاة (البخاري 881).`,`Le ghusl et se rendre tôt à la prière (al-Bukhari 881).`],[`اقرأ سورة الكهف`,`Lire la sourate al-Kahf`],
[`اتجاه القبلة`,`Direction de la qibla`],[`نحتاج موقعك`,`Nous avons besoin de votre position`],[`يُحسب اتجاهُ القبلة على جهازك من إحداثيّات موقعك إلى الكعبة؛ لا يُرسَل الموقعُ إلى أيّ خادم.`,`La direction de la qibla est calculée sur votre appareil, des coordonnées de votre position jusqu’à la Kaaba ; la position n’est envoyée à aucun serveur.`],[`حدِّد موقعي`,`Déterminer ma position`],
[`شمال`,`N`],[`شرق`,`E`],[`جنوب`,`S`],[`غرب`,`O`],
[`أدِر الهاتفَ حتى تقع الكعبةُ في أعلى البوصلة`,`Tournez le téléphone jusqu’à ce que la Kaaba soit en haut de la boussole`],[`أنت متّجهٌ نحو القبلة ✓`,`Vous faites face à la qibla ✓`],[`اضغط «تفعيل البوصلة» للسماح بالمستشعر`,`Touchez « Activer la boussole » pour autoriser le capteur`],[`تفعيل البوصلة`,`Activer la boussole`],
[`لا يصل مستشعرُ البوصلة من هذا الجهاز — استعمل الزاوية المكتوبة`,`Aucun signal du capteur de boussole sur cet appareil — utilisez l’angle indiqué`],
[`البوصلةُ تعتمد على مستشعر هاتفك: ضَعه أفقيًّا، وابتعد عن المعادن والمغانط، وحرّكه على شكل 8 لمعايرته. إن لم يكن في جهازك مستشعرٌ فاعتمد زاويةَ القبلة المكتوبة أعلاه مع بوصلةٍ أو اتجاه الشمس.`,`La boussole utilise le capteur de votre téléphone : posez-le à plat, éloignez-le des métaux et des aimants, et dessinez un 8 dans l’air pour le calibrer. Sans capteur, fiez-vous à l’angle de la qibla indiqué ci-dessus, avec une boussole ou la direction du soleil.`],
[`الشهر التالي`,`Mois suivant`],[`الشهر السابق`,`Mois précédent`],[`مطابقة إعلان الوزارة`,`Aligner sur l’annonce du ministère`],
[`الحسابُ هنا بتقويم أمّ القرى. وفي المغرب تُعلَن بدايةُ الشهر بالرؤية، فإن اختلف يومُك عن الحساب فعدِّله:`,`Le calcul suit ici le calendrier d’Umm al-Qura. Au Maroc, le début du mois est annoncé après observation du croissant ; si votre jour diffère du calcul, ajustez-le :`],
[`يوم أقلّ`,`Un jour de moins`],[`كما بالحساب`,`Selon le calcul`],[`يوم أكثر`,`Un jour de plus`],[`لا مناسبةَ خاصّةً في هذا اليوم.`,`Aucune occasion particulière ce jour-là.`],
[`هذا الجهاز لا يوفّر حسابَ التقويم الهجريّ في متصفّحه.`,`Cet appareil ne fournit pas le calcul du calendrier hégirien dans son navigateur.`],[`التقويمُ الهجريّ غير متاحٍ على هذا الجهاز.`,`Le calendrier hégirien n’est pas disponible sur cet appareil.`],
[`رأس السنة الهجريّة`,`Nouvel an hégirien`],[`بدايةُ السنة الهجريّة ذكرى الهجرة؛ ولا عبادةَ مخصوصةً بهذا اليوم.`,`Le début de l’année hégirienne rappelle l’Hégire ; aucun acte d’adoration particulier n’est prescrit ce jour-là.`],
[`تاسوعاء`,`Tasouaʿ (9 Mouharram)`],[`يُستحبّ صيامُه مع عاشوراء (مسلم 1134: «لئن بقيتُ إلى قابلٍ لأصومنّ التاسع»).`,`Il est recommandé de le jeûner avec Achoura (Muslim 1134 : « Si je vis jusqu’à l’année prochaine, je jeûnerai le neuvième »).`],
[`يوم عاشوراء`,`Jour d’Achoura`],[`صيامُه يكفّر السنةَ الماضية (مسلم 1162). ويُستحبّ أن يُصام معه التاسعُ أو الحادي عشر.`,`Son jeûne expie les péchés de l’année écoulée (Muslim 1162). Il est recommandé de jeûner aussi le neuvième ou le onzième jour.`],
[`أوّل رمضان (بالحساب)`,`1er Ramadan (selon le calcul)`],[`المعتمَدُ في المغرب إعلانُ وزارة الأوقاف بعد الرؤية؛ استعمل زرَّ ±1 لمطابقته.`,`Au Maroc, c’est l’annonce du ministère des Habous après observation du croissant qui fait foi ; utilisez le bouton ±1 pour l’aligner.`],
[`العشر الأواخر من رمضان`,`Les dix dernières nuits du Ramadan`],[`«تحرَّوا ليلةَ القدر في الوتر من العشر الأواخر» (البخاري 2017).`,`« Recherchez la Nuit du Destin dans les nuits impaires des dix dernières » (al-Bukhari 2017).`],
[`عيد الفطر`,`Aïd al-Fitr`],[`يومُ عيدٍ يحرم صيامُه (البخاري 1990).`,`Jour de fête dont le jeûne est interdit (al-Bukhari 1990).`],
[`يبدأ صيامُ ستٍّ من شوّال`,`Début du jeûne des six jours de Chawwal`],[`«من صام رمضانَ ثم أتبعه ستًّا من شوّال كان كصيام الدهر» (مسلم 1164) — في أيّ أيّام الشهر.`,`« Celui qui jeûne le Ramadan puis le fait suivre de six jours de Chawwal, c’est comme s’il avait jeûné toute l’année » (Muslim 1164) — à n’importe quels jours du mois.`],
[`العشر الأوائل من ذي الحجّة`,`Les dix premiers jours de Dhou al-hijja`],[`«ما من أيامٍ العملُ الصالحُ فيها أحبُّ إلى الله من هذه الأيام» (البخاري 969).`,`« Il n’est point de jours où les bonnes œuvres soient plus aimées d’Allah que ces jours-ci » (al-Bukhari 969). `],
[`يوم عرفة`,`Jour de ʿArafa`],[`صيامُه لغير الحاجّ يكفّر سنتين: الماضيةَ والباقية (مسلم 1162).`,`Pour qui n’est pas en pèlerinage, son jeûne expie deux années : l’année écoulée et la suivante (Muslim 1162).`],
[`عيد الأضحى`,`Aïd al-Adha`],[`أيّام التشريق`,`Jours de tachriq`],[`«أيّامُ أكلٍ وشربٍ وذكرٍ لله» (مسلم 1141) — لا تُصام.`,`« Jours de nourriture, de boisson et d’évocation d’Allah » (Muslim 1141) — on ne les jeûne pas.`],
[`من الأيّام البيض`,`Un des jours blancs`],[`يُستحبّ صيامُ ثلاثةٍ من كلّ شهر: الثالثَ عشرَ والرابعَ عشرَ والخامسَ عشر (الترمذي، وصحّحه الألبانيّ).`,`Il est recommandé de jeûner trois jours par mois : les 13e, 14e et 15e (at-Tirmidhi, authentifié par al-Albani).`],
[`يُستحبّ صيامُ الاثنين والخميس (الترمذي والنسائي).`,`Il est recommandé de jeûner le lundi et le jeudi (at-Tirmidhi, an-Nasa’i).`],[`يوم الجمعة`,`Vendredi`],[`يومٌ فاضل: سورةُ الكهف، والإكثارُ من الصلاة على النبيّ ﷺ، وساعةُ الإجابة.`,`Jour béni : sourate al-Kahf, multiplier la prière sur le Prophète ﷺ et l’heure de l’exaucement.`],
[`الاثنين`,`Lundi`],[`الثلاثاء`,`Mardi`],[`الأربعاء`,`Mercredi`],[`الخميس`,`Jeudi`],[`الجمعة`,`Vendredi`],[`السبت`,`Samedi`],[`الأحد`,`Dimanche`],
[`أحد`,`Dim`],[`إثنين`,`Lun`],[`ثلاثاء`,`Mar`],[`أربعاء`,`Mer`],[`خميس`,`Jeu`],[`جمعة`,`Ven`],[`سبت`,`Sam`],
[`اليوم`,`Aujourd’hui`],[`غدًا`,`Demain`],[`التاريخ`,`Date`],[`أيّامٌ متتالية بخمسٍ كاملة`,`jours consécutifs avec les cinq prières`],[`هذا الشهر`,`ce mois-ci`],
[`اضغط على الصلاة التي أدّيتَها. هذا سجلٌّ بينك وبين نفسك: محفوظٌ على هاتفك فقط، ولا يُرسَل ولا يُقارَن بأحد.`,`Touchez la prière que vous avez accomplie. C’est un registre entre vous et vous-même : conservé sur votre téléphone uniquement, ni envoyé ni comparé à personne.`],
[`آخر 7 أيّام`,`7 derniers jours`],[`الدائرةُ الخضراء: خمسُ صلواتٍ كاملة. وإن فاتك يومٌ فلا تيأس، بل عُد فالسلسلةُ تبدأ من جديد بإذن الله.`,`Cercle vert : les cinq prières accomplies. Si vous manquez un jour, ne désespérez pas : reprenez, la série recommence, par la grâce d’Allah.`],
[`الصيامُ القادم`,`Prochains jeûnes`],[`الاثنين والخميس (الترمذي والنسائي)، والأيّامُ البيض، وعاشوراء مع تاسوعاء، وعرفةُ لغير الحاجّ، وستٌّ من شوّال. التواريخُ بحساب أمّ القرى؛ عدِّل يومَ الشهر من «التقويم» إن خالف إعلانَ الوزارة.`,`Lundi et jeudi (at-Tirmidhi, an-Nasa’i), les jours blancs, Achoura avec Tasouaʿ, ʿArafa pour qui n’est pas en pèlerinage, et six jours de Chawwal. Dates selon le calendrier d’Umm al-Qura ; ajustez le jour du mois depuis « Calendrier » s’il diffère de l’annonce du ministère.`],
[`أيّامٌ لا يُصام فيها`,`Jours où l’on ne jeûne pas`],[`يومُ عيد الفطر، ويومُ عيد الأضحى (البخاري 1990)، وأيّامُ التشريق الثلاثة بعده (مسلم 1141). ويُكره إفرادُ يوم الجمعة بالصيام (البخاري 1985).`,`Le jour de l’Aïd al-Fitr, le jour de l’Aïd al-Adha (al-Bukhari 1990) et les trois jours de tachriq qui suivent (Muslim 1141). Il est déconseillé de jeûner uniquement le vendredi (al-Bukhari 1985).`],
[`إمساكيّة رمضان`,`Imsakiya du Ramadan`],[`فعِّل موقعك من صفحة الأذكار ليُحسَب لك وقتُ الفجر والمغرب كلَّ يوم.`,`Activez votre position depuis la page des invocations pour calculer chaque jour l’heure du Fajr et du Maghrib.`],[`نحن في رمضان — بارك الله لك فيه.`,`Nous sommes en Ramadan — qu’Allah vous y bénisse.`],
[`الفجر (الإمساك)`,`Fajr (début du jeûne)`],[`المغرب (الإفطار)`,`Maghrib (iftar)`],[`الأوقاتُ بجدول مواقيت وزارة الأوقاف لأقرب مدينةٍ إليك، والإمساكُ عند أذان الفجر. أوّلُ رمضان يُحدَّد بالرؤية فقد يختلف يومًا عن الحساب.`,`Horaires d’après le tableau du ministère des Habous pour la ville la plus proche, le jeûne commençant à l’adhan du Fajr. Le début du Ramadan se détermine par observation ; il peut différer d’un jour du calcul.`],
[`سعر الذهب اليوم`,`Prix de l’or aujourd’hui`],[`سعر غرام الذهب عيار 24 بعملتك (أدخله بنفسك من مصدرٍ تثق به)`,`Prix du gramme d’or 24 carats dans votre monnaie (saisissez-le vous-même depuis une source de confiance)`],[`أساس النصاب`,`Base du nisab`],[`الذهب (85 غرامًا)`,`Or (85 grammes)`],[`الفضّة (595 غرامًا)`,`Argent (595 grammes)`],
[`سعر غرام الفضّة (إن اخترتَ الفضّة)`,`Prix du gramme d’argent (si vous choisissez l’argent)`],[`أموالك`,`Vos biens`],[`نقدٌ وأرصدةٌ في الحساب`,`Espèces et soldes bancaires`],[`ذهبٌ مدّخَر (بالغرام)`,`Or épargné (en grammes)`],[`فضّةٌ مدّخَرة (بالغرام)`,`Argent épargné (en grammes)`],
[`عروضُ تجارةٍ (قيمتُها السوقيّة)`,`Marchandises de commerce (valeur marchande)`],[`ديونٌ لك مرجوّةُ السداد`,`Créances recouvrables en votre faveur`],[`ديونٌ حالّةٌ عليك`,`Dettes exigibles à votre charge`],[`مرّ على المال سنةٌ هجريّةٌ كاملة (الحَوْل)`,`Une année hégirienne complète s’est écoulée sur ces biens (ḥawl)`],
[`النتيجة`,`Résultat`],[`مجموع الأموال الزكويّة`,`Total des biens soumis à la zakat`],[`بلوغ النصاب`,`Nisab atteint`],[`نعم`,`Oui`],[`لا`,`Non`],[`الزكاة الواجبة (2.5٪)`,`Zakat due (2,5 %)`],
[`أدخل سعر الذهب ليُحسَب النصاب.`,`Saisissez le prix de l’or pour calculer le nisab.`],[`أدخل سعر الفضّة ليُحسَب النصاب.`,`Saisissez le prix de l’argent pour calculer le nisab.`],
[`بلغ مالُك النصابَ؛ تجب الزكاةُ إذا تمّ الحول (سنةٌ هجريّةٌ كاملة) وهو لم ينقص عن النصاب.`,`Vos biens ont atteint le nisab ; la zakat est due une fois le ḥawl (année hégirienne complète) écoulé, sans que les biens soient tombés sous le nisab.`],
[`لم يبلغ مالُك النصابَ فلا زكاةَ عليك الآن.`,`Vos biens n’ont pas atteint le nisab : aucune zakat n’est due pour l’instant.`],
[`حاسبةٌ تقديريّةٌ للمال النقديّ والذهب والفضّة وعروض التجارة بنسبة 2.5٪ بعد بلوغ النصاب وتمام الحول. لا تشمل الأنعامَ والزروعَ والمعادنَ والحالاتِ الخاصّة؛ ولأهل العلم في النصاب خلافٌ (ذهبٌ أم فضّة) وفي زكاة حُليّ المرأة المستعمَل خلاف — فللتحقّق اسأل مفتيًا أو الجهةَ الرسميّة. لا يُحفَظ في هاتفك غيرُ هذه الأرقام ولا تغادره.`,`Calculateur estimatif pour l’argent liquide, l’or, l’argent-métal et les marchandises de commerce, au taux de 2,5 % une fois le nisab atteint et le ḥawl accompli. Il ne couvre pas le bétail, les récoltes, les minerais ni les cas particuliers ; les savants divergent sur le nisab (or ou argent) et sur la zakat des bijoux portés par les femmes — pour vérifier, demandez à un mufti ou à l’autorité officielle. Seuls ces chiffres sont conservés sur votre téléphone, et ils n’en sortent pas.`],
[`لا شيءَ مستحقًّا اليوم. أضِف ما حفظتَه ليذكّرك التطبيقُ بمراجعته في الوقت المناسب.`,`Rien à réviser aujourd’hui. Ajoutez ce que vous avez mémorisé : l’application vous rappellera de le réviser au bon moment.`],
[`أضِف مقطعًا حفظتَه`,`Ajouter un passage mémorisé`],[`من آية`,`Du verset`],[`إلى آية`,`Au verset`],[`أضِف إلى المراجعة`,`Ajouter à la révision`],
[`يعمل بالتكرار المتباعد: ما سهُل عليك تتباعد مراجعتُه (غدًا ← 3 أيّام ← أسبوع ← أسبوعان ← شهر…)، وما صعُب يعود قريبًا. وهو محفوظٌ على هاتفك فقط. ويمكنك أيضًا إضافة المقطع من شاشة «التحفيظ».`,`Fonctionne par répétition espacée : ce qui vous est facile est révisé à intervalles croissants (demain → 3 jours → une semaine → deux semaines → un mois…), ce qui est difficile revient vite. Tout reste sur votre téléphone. Vous pouvez aussi ajouter un passage depuis l’écran « Mémorisation ».`],
[`القادم`,`À venir`],[`حذف`,`Supprimer`],[`▶ استمع`,`▶ Écouter`],[`سهل`,`Facile`],[`متوسّط`,`Moyen`],[`صعب`,`Difficile`],
[`هذا المقطع في مراجعتك أصلًا`,`Ce passage est déjà dans votre révision`],[`أُضيف إلى مراجعتك — أوّلُ موعدٍ غدًا`,`Ajouté à votre révision — première échéance demain`],[`حذف هذا المقطع من المراجعة؟`,`Supprimer ce passage de la révision ?`],[`تعذّر التشغيل — يحتاج اتصالًا`,`Lecture impossible — connexion requise`],
[`تذكيراتٌ اختياريّة`,`Rappels facultatifs`],[`تذكير الصيام`,`Rappel de jeûne`],[`مساءَ اليوم السابق: الاثنين والخميس، والأيّام البيض، وتاسوعاء وعاشوراء، وعرفة (الساعة 20:30)`,`La veille au soir : lundi et jeudi, jours blancs, Tasouaʿ et Achoura, ʿArafa (à 20:30)`],
[`تذكير مراجعة الحفظ`,`Rappel de révision`],[`كلَّ مساءٍ الساعة 20:00 إن كان لديك مقاطعُ في المراجعة`,`Chaque soir à 20:00 si vous avez des passages à réviser`],
[`تذكيراتُ الجمعة (سورة الكهف، والصلاة على النبيّ ﷺ بلا عدد) موجودةٌ في الإعدادات ضمن «التذكيرات».`,`Les rappels du vendredi (sourate al-Kahf, prière sur le Prophète ﷺ sans nombre limité) se trouvent dans les Réglages, section « Notifications ».`],
[`هذه التذكيراتُ تعمل في تطبيق أندرويد؛ ففي الموقع لا يمكن للمتصفّح جدولةُ إشعاراتٍ محلّيّةٍ مضمونة.`,`Ces rappels fonctionnent dans l’application Android ; sur le site, le navigateur ne peut pas programmer de notifications locales de façon fiable.`],
[`يُخفِّض الصوتَ تدريجيًّا ثم يُوقف الاستماعَ ويُنهي خدمتَه، فلا يبقى الهاتف مشغولًا طوال الليل.`,`Baisse progressivement le volume, puis arrête l’écoute et son service, pour que le téléphone ne reste pas occupé toute la nuit.`],
[`ساعة`,`1 heure`],[`ساعة ونصف`,`1 h 30`],[`عند نهاية السورة`,`À la fin de la sourate`],[`إلغاء المؤقّت`,`Annuler le minuteur`],[`نهاية السورة`,`Fin de sourate`],
[`سيتوقّف الاستماعُ عند نهاية هذه السورة`,`L’écoute s’arrêtera à la fin de cette sourate`],[`أُلغي المؤقّت`,`Minuteur annulé`],[`أُوقف الاستماع — تقبّل الله منك 🌙`,`Écoute arrêtée — qu’Allah accepte de vous 🌙`],
[`تعذّر تحميل الأدوات — جرّب ثانيةً`,`Impossible de charger les outils — réessayez`],[`الموقع غير مدعوم على هذا الجهاز`,`La localisation n’est pas prise en charge sur cet appareil`],[`تعذّر تحديد الموقع — تأكّد من السماح به`,`Position introuvable — vérifiez que la localisation est autorisée`],[`لم يُسمح بالمستشعر`,`Capteur non autorisé`],[`تعذّر تفعيل المستشعر`,`Impossible d’activer le capteur`],
[`مواقيت الصلاة والأذان`,`Horaires de prière et adhan`],
[`فعِّل موقعك من صفحة «الأذكار» ليُحسب لك وقتُ كلّ صلاة حسب مدينتك، وفي المغرب بجدول وزارة الأوقاف. وفي تطبيق أندرويد يرفع التطبيقُ الأذانَ بصوت المؤذّن عند دخول الوقت حتى وهو مغلق.`,`Activez votre position depuis la page « Invocations » pour calculer l’heure de chaque prière selon votre ville — au Maroc, d’après le tableau du ministère des Habous. Dans l’application Android, l’adhan retentit par la voix du muezzin à l’entrée de l’heure, même application fermée.`],
[`القرآن والاستماع والتحفيظ`,`Coran, écoute et mémorisation`],[`مصحفٌ برواية ورش وحفص مع التفسير الميسّر وترجمة المعاني، وتلاواتٌ بأصوات قرّاء، وتحفيظٌ بالتكرار مع مراجعةٍ متباعدة.`,`Un Mushaf en récitation de Warsh et de Hafs avec l’exégèse simplifiée (at-Tafsir al-Muyassar), la traduction du sens ; des récitations par des récitants ; et une mémorisation par répétition avec révision espacée.`],
[`الأذكار وأدوات المسلم`,`Invocations et outils du musulman`],[`أذكار الصباح والمساء وغيرها، والفقه والسيرة والاختبار، والقبلة والتقويم الهجريّ ومتابعة الصلوات والصيام والزكاة. المصحفُ والأذكارُ والأدواتُ تعمل دون إنترنت، والاستماعُ يحتاجه إلا ما نزّلتَه. لا حسابَ ولا إعلانات، وتقدّمُك محفوظٌ على هاتفك.`,`Invocations du matin et du soir et bien d’autres, fiqh, biographie et quiz, qibla, calendrier hégirien, suivi des prières, jeûne et zakat. Le Coran, les invocations et les outils fonctionnent hors ligne ; l’écoute nécessite Internet, sauf ce que vous avez téléchargé. Ni compte ni publicité, et votre progression reste sur votre téléphone.`]
]);
