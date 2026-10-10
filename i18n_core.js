/* محرّك ترجمة الواجهة المشترك (فرنسيّة/إنجليزيّة): يُترجم عُقَدَ النصّ في الصفحة بمطابقةٍ تامّة على النصّ بعد حذف التشكيل،
   ويراقب ما يُضاف لاحقًا. كلُّ لغةٍ ملفُّ قاموسٍ يستدعي I18N_CORE.make({...}).
   لا يمسّ صفحةَ المصحف («الورد») ولا نصَّ القرآن ولا الأذكارَ ولا شاشةَ الافتتاح (NO_SEL). */
(function(){
'use strict';
if(window.I18N_CORE) return;
const MARKS=/[ؐ-ًؚ-ٰٟۖ-ۭـ‎‏]/g;
const AR_RE=/[؀-ۿ]/;
const key=s=>String(s).replace(MARKS,'').replace(/[ \s]+/g,' ').trim();
const NO_SEL=['#splash','#s-wird','#wird-body','#az-list','#tafsir-body .t-txt','#tafsir-body .t-aya','#tafsir-body .t-intro','#tafsir-body .sv .tx','[data-noi18n]'].join(',');
const ATTRS=['title','aria-label','placeholder','alt'];
const SKIP_TAG=new Set(['SCRIPT','STYLE','TEXTAREA','NOSCRIPT']);
/* القرآن بالعربيّة وحدَها (أمرٌ صريحٌ من فريد): أسماءُ المصحف والسور والآيات والأحزاب والروايات ومصطلحاتُها لا تُترجَم في أيّ لغة */
const QURAN_KEEP=/^(المصحف الكريم|المصحف كامل( — \d+ سورة)?|القرآن الكريم|القرآن|قرآن|الورد|ورش|حفص|الجزء|الحزب|ربع الحزب|نصف الحزب|حزب كامل|ثمن|سورة|السورة|السور|سور|آية|الآية|آيات|الآيات|رواية القرآن|الرواية|رواية حفص|رواية ورش|نص القرآن|لون خط القرآن|حجم خط القرآن|تكبير خط القرآن|تصغير خط القرآن|مرجع حفص|مرجع ورش|مصحف الملك فهد|المصحف المحمدي|ورش — الخط المغربي|حفص — مصحف الملك فهد|تبديل الرواية|ترجمة معاني الآية)$|^(﴾ ?)?سورة |^\d+\. |^آية \d+$|^(مكية|مدنية) •|^\d+ آي(ات|ة)$|^من \d+ آية|^الباب /;
function make(o){
  const find=c=>QURAN_KEEP.test(key(c)) ? null : o.lookup(c);
  function trText(raw){
    const lead=raw.match(/^\s*/)[0], trail=raw.match(/\s*$/)[0], core=raw.trim();
    if(!core || !AR_RE.test(core)) return null;
    let r=find(core); if(r!=null) return lead+r+trail;
    const m=core.match(/^([•:،؛\-—–··\s]*)([\s\S]*?)([:،؛\-—–·\s]*)$/);
    if(m && (m[1]||m[3]) && m[2]){ r=find(m[2]); if(r!=null) return lead+m[1].replace(/،/g,',').replace(/؛/g,';')+r+m[3].replace(/،/g,',').replace(/؛/g,';')+trail; }
    return null;
  }
  let busy=false, mo=null;
  const skipped=el=>{ try{ return !!(el.closest && el.closest(NO_SEL)); }catch(e){ return false; } };
  function fixNode(n){
    const v=n.nodeValue; if(!v || !AR_RE.test(v)) return;
    const p=n.parentNode; if(!p || (p.nodeType===1 && (SKIP_TAG.has(p.nodeName) || skipped(p)))) return;
    let r=trText(v);
    if(o.abbr && p.nodeType===1 && p.classList && p.classList.contains('cal-h')){ const a=o.abbr(v.trim()); if(a) r=a; }   // ترويسة التقويم: اختصارٌ يتّسع للعمود
    if(r!=null && r!==v){
      if(n.__ar==null) n.__ar=v;
      n.nodeValue=(/^\s*[0-9]/.test(r)?'‎':'')+r;   // اتّجاهٌ من اليسار حتى لا يتأخّر الرقمُ الأوّل
      if(p.nodeType===1 && p.setAttribute && !p.hasAttribute('dir') && /[A-Za-zÀ-ÿ]{3}/.test(r) && r.length>26) p.setAttribute('dir','auto');
    }
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
  function start(){
    document.documentElement.lang=o.lang;
    try{ if(o.title) document.title=o.title; }catch(e){}
    busy=true; try{ walk(document.body); }finally{ busy=false; }
    if(mo) return;
    mo=new MutationObserver(list=>{
      if(busy) return; busy=true;
      try{ for(const m of list){
        if(m.type==='characterData') fixNode(m.target);
        else if(m.type==='attributes') fixAttrs(m.target);
        else m.addedNodes.forEach(n=>walk(n));
      } } finally { busy=false; }
    });
    mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  }
  return { lang:o.lang, start, t:s=>{ const r=trText(String(s)); return r==null?s:r; } };
}
window.I18N_CORE={ key, AR_RE, MARKS, make };
})();
