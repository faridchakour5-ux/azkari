/* أدوات المسلم — تُحمَّل عند الطلب من index.html (القبلة، التقويم الهجري، متابعة الصلوات، الصيام، الزكاة، مراجعة الحفظ، مؤقّت النوم).
   كلّها محلّيّة: لا خادمَ ولا حسابَ ولا تتبّع؛ ما تحفظه يبقى في الجهاز وينتقل مع النسخة الاحتياطيّة.
   الأرقامُ لاتينيّة دائمًا (AR=String). */
(function(){
'use strict';
if(window.SalTools) return;
const T = window.SalTools = {};
const $ = s => document.querySelector(s);
const AR = n => String(n);
const lk = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');   // مفتاحُ يومٍ محلّيّ (لا UTC)
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const vib = ms => { try{ vibrate(ms); }catch(e){} };
const toast = (m,ms) => { try{ showToast(m,ms||2600); }catch(e){} };
const sget = (k,d) => { try{ return store.get(k,d); }catch(e){ return d; } };
const sset = (k,v) => { try{ store.set(k,v); }catch(e){} };
const addDays = (d,n) => { const x=new Date(d.getFullYear(), d.getMonth(), d.getDate()+n, 12, 0, 0); return x; };
const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const GMON = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر'];   // أسماءُ الأشهر المتداولة في المغرب
const HMON = ['محرّم','صفر','ربيع الأوّل','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوّال','ذو القعدة','ذو الحجّة'];
const gLabel = (d,withDay) => (withDay?DAYS[d.getDay()]+' ':'')+AR(d.getDate())+' '+GMON[d.getMonth()]+' '+AR(d.getFullYear());

/* ============ التقويم الهجريّ ============
   المصدر: حسابُ أمّ القرى في المتصفّح (Intl). وفي المغرب تُعلَن الشهورُ بالرؤية من وزارة الأوقاف، فقد يختلف
   الحسابُ يومًا — ولذلك زرُّ التعديل ‎±1‎ ‎(وهو محفوظٌ على الجهاز)‎. */
let HF=null;
try{ HF=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'numeric',year:'numeric'}); }catch(e){ HF=null; }
T.hijriOk = () => { try{ if(!HF) return false; const p=HF.formatToParts(new Date(2026,9,10,12)); return p.some(x=>x.type==='year' && +x.value>1400); }catch(e){ return false; } };
const hAdj = () => { const v=sget('az_hj_adj',0); return (v===-1||v===1)?v:0; };
function hijri(d){
  const x = addDays(d, hAdj());
  const o = {}; HF.formatToParts(x).forEach(p=>{ if(p.type==='day'||p.type==='month'||p.type==='year') o[p.type]=parseInt(p.value,10); });
  return { y:o.year, m:o.month, d:o.day };
}
T.hijri = hijri;
const hLabel = h => AR(h.d)+' '+HMON[h.m-1]+' '+AR(h.y)+' هـ';
/* الأحداثُ بحسب (الشهر/اليوم) — كلُّ حكمٍ فيها مرويٌّ بنصٍّ ثابت، وما اختُلف فيه نُصَّ عليه */
function hEvents(h, g){
  const ev=[]; const wd=g.getDay();
  if(h.m===1 && h.d===1) ev.push({k:'new', t:'رأس السنة الهجريّة', n:'بدايةُ السنة الهجريّة ذكرى الهجرة؛ ولا عبادةَ مخصوصةً بهذا اليوم.'});
  if(h.m===1 && h.d===9) ev.push({k:'fast', t:'تاسوعاء', n:'يُستحبّ صيامُه مع عاشوراء (مسلم 1134: «لئن بقيتُ إلى قابلٍ لأصومنّ التاسع»).'});
  if(h.m===1 && h.d===10) ev.push({k:'fast', t:'يوم عاشوراء', n:'صيامُه يكفّر السنةَ الماضية (مسلم 1162). ويُستحبّ أن يُصام معه التاسعُ أو الحادي عشر.'});
  if(h.m===9 && h.d===1) ev.push({k:'ram', t:'أوّل رمضان (بالحساب)', n:'المعتمَدُ في المغرب إعلانُ وزارة الأوقاف بعد الرؤية؛ استعمل زرَّ ‎±1‎ لمطابقته.'});
  if(h.m===9 && h.d>=21) ev.push({k:'ram', t:'العشر الأواخر من رمضان', n:'«تحرَّوا ليلةَ القدر في الوتر من العشر الأواخر» (البخاري 2017).'});
  if(h.m===10 && h.d===1) ev.push({k:'eid', t:'عيد الفطر', n:'يومُ عيدٍ يحرم صيامُه (البخاري 1990).'});
  if(h.m===10 && h.d===2) ev.push({k:'fast', t:'يبدأ صيامُ ستٍّ من شوّال', n:'«من صام رمضانَ ثم أتبعه ستًّا من شوّال كان كصيام الدهر» (مسلم 1164) — في أيّ أيّام الشهر.'});
  if(h.m===12 && h.d>=1 && h.d<=9) ev.push({k:'hij', t:'العشر الأوائل من ذي الحجّة', n:'«ما من أيامٍ العملُ الصالحُ فيها أحبُّ إلى الله من هذه الأيام» (البخاري 969).'});
  if(h.m===12 && h.d===9) ev.push({k:'fast', t:'يوم عرفة', n:'صيامُه لغير الحاجّ يكفّر سنتين: الماضيةَ والباقية (مسلم 1162).'});
  if(h.m===12 && h.d===10) ev.push({k:'eid', t:'عيد الأضحى', n:'يومُ عيدٍ يحرم صيامُه (البخاري 1990).'});
  if(h.m===12 && h.d>=11 && h.d<=13) ev.push({k:'eid', t:'أيّام التشريق', n:'«أيّامُ أكلٍ وشربٍ وذكرٍ لله» (مسلم 1141) — لا تُصام.'});
  if(h.d>=13 && h.d<=15 && h.m!==9 && !(h.m===12 && h.d===13)) ev.push({k:'white', t:'من الأيّام البيض', n:'يُستحبّ صيامُ ثلاثةٍ من كلّ شهر: الثالثَ عشرَ والرابعَ عشرَ والخامسَ عشر (الترمذي، وصحّحه الألبانيّ).'});
  if(wd===1 || wd===4) ev.push({k:'mt', t:wd===1?'الاثنين':'الخميس', n:'يُستحبّ صيامُ الاثنين والخميس (الترمذي والنسائي).', minor:true});
  if(wd===5) ev.push({k:'fri', t:'يوم الجمعة', n:'يومٌ فاضل: سورةُ الكهف، والإكثارُ من الصلاة على النبيّ ﷺ، وساعةُ الإجابة.', minor:true});
  return ev;
}
T.hEvents = hEvents;
function hMonthOf(g){   // أيّامُ الشهر الهجريّ الذي يقع فيه التاريخُ g
  const h0=hijri(g); let first=g, c=0;
  while(c<31){ const p=addDays(first,-1); if(hijri(p).m!==h0.m) break; first=p; c++; }
  const days=[]; let cur=first;
  for(let i=0;i<31;i++){ const h=hijri(cur); if(h.m!==h0.m) break; days.push({g:cur,h}); cur=addDays(cur,1); }
  return { y:h0.y, m:h0.m, days };
}

/* ============ هيكل الشاشة الكاملة ============ */
const css=document.createElement('style');
css.textContent=`
.tl-ov{position:fixed; inset:0; z-index:125; background:var(--bg); display:none; flex-direction:column;}
.tl-ov.show{display:flex;}
.tl-top{display:flex; align-items:center; gap:10px; padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 10px; border-bottom:1px solid var(--sep); background:var(--bg);}
.tl-back{border:1px solid var(--line); background:var(--card); color:var(--text); width:40px; height:40px; border-radius:50%; font:inherit; font-size:20px; display:flex; align-items:center; justify-content:center; flex:0 0 auto;}
.tl-title{font-size:18px; font-weight:800; color:var(--text); flex:1;}
.tl-body{flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:12px max(10px, env(safe-area-inset-left), env(safe-area-inset-right)) calc(28px + env(safe-area-inset-bottom,0px));}
.tl-card{background:var(--card); border-radius:18px; padding:15px 14px; margin:0 0 12px; border:1px solid var(--line); box-shadow:var(--shadow-1);}
.tl-card h3{margin:0 0 8px; font-size:15.5px; font-weight:800; color:var(--accent);}
.tl-note{font-size:12.5px; line-height:1.9; color:var(--text-2); margin:8px 2px 0;}
.tl-grid{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;}
.tl-tile{background:var(--card); border:1px solid var(--line); border-radius:18px; padding:14px 10px 12px; font:inherit; color:var(--text); display:flex; flex-direction:column; align-items:center; gap:7px; text-align:center; box-shadow:var(--shadow-1); position:relative;}
.tl-tile:active{transform:scale(.97);}
.tl-tile .ic{width:46px; height:46px; border-radius:50%; background:var(--accent-soft,rgba(47,158,68,.14)); color:var(--accent); display:flex; align-items:center; justify-content:center;}
.tl-tile .ic svg{width:24px; height:24px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;}
.tl-tile b{font-size:14.5px; font-weight:800;}
.tl-tile small{font-size:11.5px; color:var(--text-2); line-height:1.5; font-weight:600;}
.tl-badge{position:absolute; top:8px; inset-inline-end:10px; background:var(--c-repeat); color:#fff; font-size:11.5px; font-weight:800; min-width:20px; height:20px; border-radius:10px; display:flex; align-items:center; justify-content:center; padding:0 5px;}
.tl-date{background:var(--card); border:1px solid var(--line); border-radius:18px; padding:14px; margin-bottom:12px; text-align:center;}
.tl-date .hj{font-size:20px; font-weight:800; color:var(--c-repeat);}
.tl-date .gr{font-size:13.5px; color:var(--text-2); margin-top:3px;}
.tl-date .ev{font-size:13px; margin-top:8px; color:var(--accent); font-weight:700; line-height:1.8;}
.tl-fri{background:var(--fill-2); border:1px solid var(--line); border-radius:18px; padding:13px 14px; margin-bottom:12px; font-size:13.5px; line-height:2;}
.tl-fri b{color:var(--accent);}
.tl-btn{display:block; width:100%; border:0; border-radius:15px; background:var(--accent); color:#fff; font:inherit; font-weight:800; font-size:15px; padding:13px; margin-top:10px;}
.tl-btn.alt{background:var(--fill-2); color:var(--accent); border:1px solid var(--line);}
.tl-chips{display:flex; flex-wrap:wrap; gap:7px; margin:6px 0;}
.tl-chips button{border:1px solid var(--line); background:var(--card); color:var(--text); font:inherit; font-size:13.5px; padding:7px 13px; border-radius:20px;}
.tl-chips button.on{background:var(--accent); color:#fff; border-color:var(--accent);}
.tl-row{display:flex; align-items:center; justify-content:space-between; gap:10px; padding:11px 2px; border-top:1px solid var(--sep); font-size:14.5px;}
.tl-row:first-child{border-top:0;}
.tl-row .v{color:var(--text-2); font-size:13.5px; text-align:end;}
.tl-sw{position:relative; width:50px; height:30px; border-radius:15px; background:var(--fill); border:0; flex:0 0 auto; padding:0;}
.tl-sw::after{content:''; position:absolute; top:3px; inset-inline-start:3px; width:24px; height:24px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.3); transition:inset-inline-start .2s;}
.tl-sw.on{background:var(--accent);} .tl-sw.on::after{inset-inline-start:23px;}
.tl-in{width:100%; border:1px solid var(--line); background:var(--bg); color:var(--text); font:inherit; font-size:16px; padding:10px 12px; border-radius:12px; direction:ltr; text-align:start;}
.tl-lbl{font-size:13px; font-weight:700; color:var(--text-2); margin:11px 2px 5px;}
/* القبلة */
.ql-wrap{display:flex; flex-direction:column; align-items:center; gap:10px; padding:6px 0;}
.ql-dial{width:min(78vw,300px); height:min(78vw,300px);}
.ql-state{font-size:15px; font-weight:800; text-align:center; min-height:26px; color:var(--text);}
.ql-state.ok{color:var(--accent);}
.ql-deg{font-size:13px; color:var(--text-2); text-align:center; line-height:1.9;}
/* التقويم */
.cal-nav{display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;}
.cal-nav button{border:1px solid var(--line); background:var(--card); color:var(--text); width:40px; height:40px; border-radius:50%; font:inherit; font-size:18px;}
.cal-nav .t{text-align:center; font-weight:800; font-size:16px;}
.cal-nav .t small{display:block; font-size:12px; color:var(--text-2); font-weight:600;}
.cal-grid{display:grid; grid-template-columns:repeat(7,1fr); gap:4px;}
.cal-h{font-size:11.5px; text-align:center; color:var(--text-2); padding:4px 0; font-weight:700;}
.cal-h.fri{color:var(--accent);}
.cal-c{border:1px solid var(--line); border-radius:11px; background:var(--card); min-height:50px; padding:3px 0 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0; font:inherit; color:var(--text); position:relative;}
.cal-c b{font-size:15px; font-weight:800; line-height:1.3;}
.cal-c small{font-size:10px; color:var(--text-3); line-height:1.2;}
.cal-c.e{border:0; background:transparent;}
.cal-c.fri{background:var(--fill-2);}
.cal-c.today{outline:2px solid var(--accent); outline-offset:-1px;}
.cal-c.sel{background:var(--accent); color:#fff;} .cal-c.sel small{color:#fff;}
.cal-c .dot{position:absolute; top:4px; inset-inline-end:5px; width:6px; height:6px; border-radius:50%; background:var(--c-repeat);}
.cal-c.eid .dot{background:var(--accent);} .cal-c.white{box-shadow:inset 0 -3px 0 var(--c-repeat);}
.ev-i{padding:9px 2px; border-top:1px solid var(--sep); font-size:13.5px; line-height:1.9;}
.ev-i:first-child{border-top:0;} .ev-i b{display:block; color:var(--accent); font-size:14.5px;}
/* متابعة الصلوات */
.pt-day{display:grid; grid-template-columns:repeat(5,1fr); gap:6px;}
.pt-p{border:1.5px solid var(--line); border-radius:15px; background:var(--card); color:var(--text-2); font:inherit; padding:11px 2px 9px; display:flex; flex-direction:column; align-items:center; gap:5px; font-size:13px; font-weight:700;}
.pt-p i{width:26px; height:26px; border-radius:50%; border:2px solid var(--line); display:flex; align-items:center; justify-content:center; font-style:normal; color:#fff;}
.pt-p small{font-size:11px; color:var(--text-3); font-weight:600;}
.pt-p.on{border-color:var(--accent); color:var(--accent); background:var(--fill-2);} .pt-p.on i{background:var(--accent); border-color:var(--accent);}
.pt-week{display:flex; justify-content:space-between; gap:5px; margin-top:6px;}
.pt-wd{flex:1; text-align:center; font-size:11.5px; color:var(--text-2);}
.pt-wd i{display:flex; width:34px; height:34px; border-radius:50%; margin:4px auto 0; align-items:center; justify-content:center; font-style:normal; font-weight:800; font-size:13px; background:var(--fill-2); color:var(--text-2);}
.pt-wd.full i{background:var(--accent); color:#fff;}
.pt-wd.today i{outline:2px solid var(--c-repeat); outline-offset:1px;}
.pt-stat{display:flex; gap:8px; margin-bottom:12px;}
.pt-stat div{flex:1; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:10px 6px; text-align:center; font-size:12px; color:var(--text-2);}
.pt-stat b{display:block; font-size:22px; color:var(--c-repeat); line-height:1.4;}
/* الصيام والإمساكيّة */
.fs-i{display:flex; align-items:center; gap:10px; padding:10px 2px; border-top:1px solid var(--sep);}
.fs-i:first-child{border-top:0;}
.fs-i .d{min-width:54px; text-align:center; background:var(--fill-2); border-radius:12px; padding:6px 4px; font-size:11.5px; color:var(--text-2); line-height:1.5;}
.fs-i .d b{display:block; font-size:19px; color:var(--c-repeat);}
.fs-i .x{flex:1; font-size:14px; line-height:1.7;} .fs-i .x small{display:block; font-size:12px; color:var(--text-2);}
.im-t{width:100%; border-collapse:collapse; font-size:13px;}
.im-t th,.im-t td{padding:6px 3px; text-align:center; border-top:1px solid var(--sep);} .im-t th{color:var(--text-2); font-weight:700; border-top:0;}
.im-t tr.td td{background:var(--fill-2); font-weight:800; color:var(--accent);}
/* مؤقّت النوم */
.sl-big{font-size:34px; font-weight:800; color:var(--c-repeat); text-align:center; direction:ltr; padding:6px 0;}
/* مراجعة الحفظ */
.rv-i{border:1px solid var(--line); border-radius:15px; padding:11px 12px; margin:8px 0; background:var(--card);}
.rv-i .h{display:flex; justify-content:space-between; align-items:center; gap:8px; font-weight:800; font-size:15px;}
.rv-i .h small{color:var(--text-2); font-weight:600; font-size:12px;}
.rv-acts{display:flex; gap:6px; margin-top:9px; flex-wrap:wrap;}
.rv-acts button{flex:1; min-width:70px; border:1px solid var(--line); background:var(--fill-2); color:var(--text); font:inherit; font-size:13px; font-weight:700; padding:8px 4px; border-radius:12px;}
.rv-acts .ez{background:var(--accent); color:#fff; border-color:var(--accent);} .rv-acts .hd{color:var(--c-repeat);}
.rv-pick{width:100%; border:1px solid var(--line); background:var(--bg); color:var(--text); font:inherit; font-size:15px; padding:10px 12px; border-radius:12px; display:flex; justify-content:space-between;}
.rv-rng{display:flex; gap:8px; margin-top:8px;} .rv-rng label{flex:1; font-size:12.5px; color:var(--text-2);}
.rv-rng input{width:100%; border:1px solid var(--line); background:var(--bg); color:var(--text); font:inherit; font-size:16px; padding:9px 10px; border-radius:12px; direction:ltr; text-align:center;}
`;
document.head.appendChild(css);

const IC = {
  qibla:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z"/></svg>',
  cal:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  pray:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/></svg>',
  fast:'<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  zakat:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.8-2.5.8-2.5 1.9 1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/></svg>',
  rev:'<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8"/><path d="M18.5 2v4h-4M5.5 22v-4h4"/></svg>',
  bell:'<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/></svg>'
};

let ov=null, page='hub', cleanup=null;
function ensureOv(){
  if(ov) return ov;
  ov=document.createElement('div'); ov.className='tl-ov'; ov.id='tl-ov';
  ov.innerHTML='<div class="tl-top"><button class="tl-back" id="tl-back" aria-label="رجوع">→</button><div class="tl-title" id="tl-title">أدوات المسلم</div></div><div class="tl-body" id="tl-body"></div>';
  document.body.appendChild(ov);
  ov.querySelector('#tl-back').addEventListener('click', ()=>{ vib(6); if(page==='hub') T.close(); else T.go('hub'); });
  return ov;
}
T.open = function(p){ ensureOv(); ov.classList.add('show'); T.go(p||'hub'); };
T.close = function(){ if(cleanup){ try{ cleanup(); }catch(e){} cleanup=null; } if(ov) ov.classList.remove('show'); };
const PAGES = {};
T.go = function(p){
  if(cleanup){ try{ cleanup(); }catch(e){} cleanup=null; }
  page=p; const body=$('#tl-body'); body.scrollTop=0;
  const P=PAGES[p]||PAGES.hub; $('#tl-title').textContent=P.title;
  body.innerHTML=''; cleanup=P.render(body)||null;
};
T.isOpen = () => !!(ov && ov.classList.contains('show'));
/* زرُّ الرجوع في أندرويد/المتصفّح */
T.back = function(){ if(!T.isOpen()) return false; if(page==='hub') T.close(); else T.go('hub'); return true; };

/* ============ الصفحة الرئيسيّة للأدوات ============ */
function fridayHtml(){
  return '<div class="tl-fri"><b>اليوم الجمعة</b><br>'+
   '• <b>سورة الكهف</b>: ورد في قراءتها يومَ الجمعة حديثٌ صحّحه جمعٌ من أهل العلم («أضاء له من النور ما بين الجمعتين»)، وفي رفعه ووقفِه خلافٌ بين المحدّثين.<br>'+
   '• <b>الصلاة على النبيّ ﷺ</b>: «أكثِروا الصلاةَ عليَّ يومَ الجمعة» (أبو داود 1047) — <u>بلا عدد</u>.<br>'+
   '• <b>ساعة الإجابة</b>: ثبت أنّ في الجمعة ساعةً لا يوافقها عبدٌ مسلمٌ قائمٌ يصلّي يسأل الله شيئًا إلّا أعطاه (البخاري 935، مسلم 852). وفي تحديدها خلافٌ: أرجحُ ما قيل ما بين جلوس الإمام إلى انقضاء الصلاة، وآخرُ ساعةٍ بعد العصر.<br>'+
   '• الاغتسالُ والتبكيرُ إلى الصلاة (البخاري 881).'+
   '<button class="tl-btn alt" id="fri-kahf">اقرأ سورة الكهف</button></div>';
}
PAGES.hub = { title:'أدوات المسلم', render(body){
  const now=new Date(); let hd=''; 
  if(T.hijriOk()){
    const h=hijri(now); const evs=hEvents(h,now).filter(e=>!e.minor);
    hd='<div class="tl-date"><div class="hj">'+hLabel(h)+'</div><div class="gr">'+gLabel(now,true)+'</div>'+
       (evs.length?'<div class="ev">'+evs.map(e=>esc(e.t)).join(' · ')+'</div>':'')+'</div>';
  } else hd='<div class="tl-date"><div class="gr">'+gLabel(now,true)+'</div></div>';
  const due=T.reviewDue().length;
  const tiles=[
    ['qibla','القبلة','qibla','بوصلةٌ نحو الكعبة'],
    ['cal','التقويم الهجريّ','cal','الأيّام والمناسبات'],
    ['pt','صلواتي','pray','تابِع صلواتك اليوم'],
    ['fast','الصيام','fast','التطوّع وإمساكيّة رمضان'],
    ['zakat','حاسبة الزكاة','zakat','تقديريّةٌ وبسيطة'],
    ['rev','مراجعة الحفظ','rev',due?('عندك '+AR(due)+' للمراجعة'):'تذكيرٌ متباعد'],
    ['rem','تذكيراتي','bell','الجمعة والمراجعة']
  ];
  body.innerHTML=(now.getDay()===5?fridayHtml():'')+hd+'<div class="tl-grid">'+tiles.map(t=>
    '<button class="tl-tile" data-p="'+t[0]+'"><span class="ic">'+IC[t[2]]+'</span><b>'+t[1]+'</b><small>'+t[3]+'</small>'+(t[0]==='rev'&&due?'<span class="tl-badge">'+AR(due)+'</span>':'')+'</button>').join('')+'</div>';
  body.querySelectorAll('.tl-tile').forEach(b=>b.addEventListener('click',()=>{ vib(6); T.go(b.dataset.p); }));
  const fk=body.querySelector('#fri-kahf'); if(fk) fk.addEventListener('click',()=>{ T.close(); try{ T.readKahf(); }catch(e){} });
}};
/* قراءة سورة الكهف في المصحف: السورةُ رقمُ 18 → الفهرسُ 17 */
T.readKahf = function(){
  try{
    document.querySelector('.tab[data-s="s-wird"]').click();
    setTimeout(()=>{ const sel=document.querySelector('#sura-select'); if(sel){ sel.value='17'; sel.dispatchEvent(new Event('change')); } },250);
  }catch(e){}
};

/* ============ القبلة ============ */
const KAABA={lat:21.4225, lng:39.8262};
function qiblaBearing(lat,lng){
  const d=Math.PI/180, f1=lat*d, f2=KAABA.lat*d, dl=(KAABA.lng-lng)*d;
  const y=Math.sin(dl)*Math.cos(f2), x=Math.cos(f1)*Math.sin(f2)-Math.sin(f1)*Math.cos(f2)*Math.cos(dl);
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
T.qiblaBearing = qiblaBearing;
function dirName(a){ return ['الشمال','الشمال الشرقيّ','الشرق','الجنوب الشرقيّ','الجنوب','الجنوب الغربيّ','الغرب','الشمال الغربيّ'][Math.round(a/45)%8]; }
function compassHeading(alpha,beta,gamma){
  /* اتجاهُ الجهاز بالنسبة إلى الشمال: الهاتفُ مسطَّحٌ ← نتبع أعلاه، وقائمٌ بيدك ← نتبع ظهرَه (معادلةُ W3C).
     نختار المتّجهَ الأطولَ مسقطًا على الأفق، فلا ينهار الحسابُ في أيٍّ من الوضعين. */
  const d=Math.PI/180, a=alpha*d, b=beta*d, g=gamma*d;
  const cA=Math.cos(a), sA=Math.sin(a), sB=Math.sin(b), cB=Math.cos(b), sG=Math.sin(g), cG=Math.cos(g);
  const tE=-sA*cB, tN=cA*cB;                    // أعلى الجهاز
  const rE=-cA*sG - sA*sB*cG, rN=-sA*sG + cA*sB*cG;   // ظهرُ الجهاز
  const useTop = Math.hypot(tE,tN) >= Math.hypot(rE,rN);
  let h=useTop ? Math.atan2(tE,tN) : Math.atan2(rE,rN);
  if(h<0) h+=2*Math.PI; return h*180/Math.PI;
}
T.compassHeading = compassHeading;
function dialSvg(){
  let ticks=''; for(let i=0;i<72;i++){ const big=i%9===0; ticks+='<line x1="150" y1="'+(big?42:48)+'" x2="150" y2="58" transform="rotate('+(i*5)+' 150 150)" stroke="var(--text-3)" stroke-width="'+(big?2.4:1)+'"/>'; }
  const lab=(x,y,t,c)=>'<g class="ql-l" data-x="'+x+'" data-y="'+y+'"><text x="'+x+'" y="'+y+'" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="800" fill="'+c+'">'+t+'</text></g>';
  return '<svg class="ql-dial" viewBox="0 0 300 300">'+
   '<circle cx="150" cy="150" r="108" fill="var(--card)" stroke="var(--line)" stroke-width="2"/>'+
   '<g id="ql-rot">'+ticks+
     lab(150,26,'شمال','var(--c-repeat)')+lab(274,150,'شرق','var(--text-2)')+lab(150,274,'جنوب','var(--text-2)')+lab(26,150,'غرب','var(--text-2)')+
     '<g id="ql-k"><path d="M150 82 L157 150 L143 150 Z" fill="var(--accent)"/><rect x="140" y="62" width="20" height="20" rx="3" fill="#1a1a1a"/><rect x="140" y="68" width="20" height="3.2" fill="#C9A24A"/></g>'+
   '</g>'+
   '<path d="M143 2 L157 2 L150 14 Z" fill="var(--c-repeat)"/>'+
   '<circle cx="150" cy="150" r="5" fill="var(--text-2)"/></svg>';
}
PAGES.qibla = { title:'اتجاه القبلة', render(body){
  const g=sget('az_geo',null);
  if(!g){
    body.innerHTML='<div class="tl-card"><h3>نحتاج موقعك</h3><div class="tl-note">يُحسب اتجاهُ القبلة على جهازك من إحداثيّات موقعك إلى الكعبة؛ لا يُرسَل الموقعُ إلى أيّ خادم.</div><button class="tl-btn" id="q-loc">حدِّد موقعي</button></div>';
    body.querySelector('#q-loc').addEventListener('click',()=>{
      if(!navigator.geolocation){ toast('الموقع غير مدعوم على هذا الجهاز',3500); return; }
      navigator.geolocation.getCurrentPosition(p=>{ sset('az_geo',{lat:p.coords.latitude,lng:p.coords.longitude,t:Date.now()}); try{ renderPrayers(); }catch(e){} T.go('qibla'); },
        ()=>toast('تعذّر تحديد الموقع — تأكّد من السماح به',3800), {enableHighAccuracy:false, timeout:12000});
    });
    return;
  }
  const qb=qiblaBearing(g.lat,g.lng), km=Math.round(geoKm(g,KAABA));
  body.innerHTML='<div class="tl-card"><div class="ql-wrap">'+dialSvg()+'<div class="ql-state" id="ql-st">…</div>'+
    '<div class="ql-deg">القبلة <b>'+AR(Math.round(qb))+'°</b> من الشمال نحو '+dirName(qb)+'<br>تبعد الكعبةُ عنك نحو '+AR(km.toLocaleString('en-US'))+' كم</div></div>'+
    '<button class="tl-btn alt" id="q-ena" style="display:none">تفعيل البوصلة</button>'+
    '<div class="tl-note">البوصلةُ تعتمد على مستشعر هاتفك: ضَعه أفقيًّا، وابتعد عن المعادن والمغانط، وحرّكه على شكل ‎8‎ لمعايرته. إن لم يكن في جهازك مستشعرٌ فاعتمد زاويةَ القبلة المكتوبة أعلاه مع بوصلةٍ أو اتجاه الشمس.</div></div>';
  const labs=[...body.querySelectorAll('.ql-l')];
  const rot=body.querySelector('#ql-rot'), kk=body.querySelector('#ql-k'), st=body.querySelector('#ql-st'), ena=body.querySelector('#q-ena');
  kk.setAttribute('transform','rotate('+qb.toFixed(1)+' 150 150)');
  let cur=null, got=false, wasOk=false;
  const paint=h=>{
    rot.setAttribute('transform','rotate('+(-h).toFixed(1)+' 150 150)');
    labs.forEach(l=>l.setAttribute('transform','rotate('+h.toFixed(1)+' '+l.dataset.x+' '+l.dataset.y+')'));   // الأسماءُ تبقى أفقيّةً مقروءة
    const diff=Math.abs(((qb-h+540)%360)-180);   // الفرقُ بين اتجاهك والقبلة (0..180)
    const ok=Math.min(diff,360-diff)<4;
    st.classList.toggle('ok',ok);
    st.textContent = ok ? 'أنت متّجهٌ نحو القبلة ✓' : 'أدِر الهاتفَ حتى تقع الكعبةُ في أعلى البوصلة';
    if(ok && !wasOk) vib(25); wasOk=ok;
  };
  const onOri=ev=>{
    let h=null;
    if(typeof ev.webkitCompassHeading==='number') h=ev.webkitCompassHeading;           // iOS
    else if(ev.alpha!=null && (ev.absolute===true || ev.type==='deviceorientationabsolute')){ h=compassHeading(ev.alpha, ev.beta||0, ev.gamma||0); }
    if(h==null) return;
    got=true;
    if(cur==null) cur=h; else { let d=((h-cur+540)%360)-180; cur=(cur+d*0.25+360)%360; }   // تنعيمٌ دائريّ
    paint(cur);
  };
  const start=()=>{
    window.addEventListener('deviceorientationabsolute', onOri, true);
    window.addEventListener('deviceorientation', onOri, true);
    setTimeout(()=>{ if(!got){ st.textContent='لا يصل مستشعرُ البوصلة من هذا الجهاز — استعمل الزاوية المكتوبة'; st.classList.remove('ok'); } }, 2500);
  };
  st.textContent='…';
  if(typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){   // iOS 13+
    ena.style.display=''; st.textContent='اضغط «تفعيل البوصلة» للسماح بالمستشعر';
    ena.addEventListener('click',async()=>{ try{ const r=await DeviceOrientationEvent.requestPermission(); if(r==='granted'){ ena.style.display='none'; start(); } else toast('لم يُسمح بالمستشعر',3000); }catch(e){ toast('تعذّر تفعيل المستشعر',3000); } });
  } else start();
  return ()=>{ window.removeEventListener('deviceorientationabsolute', onOri, true); window.removeEventListener('deviceorientation', onOri, true); };
}};

/* ============ مؤقّت النوم للاستماع ============ */
let slT=null, slEnd=0, slMode=null, slVolBase=1;
const slAudio=()=>$('#reciter-audio');
function slLabel(){ const b=$('#reciter-sleep-label'); if(!b) return;
  if(!slMode){ b.textContent='مؤقّت النوم'; return; }
  if(slMode==='sura'){ b.textContent='نهاية السورة'; return; }
  const s=Math.max(0,Math.round((slEnd-Date.now())/1000)); b.textContent=AR(Math.floor(s/60))+':'+String(s%60).padStart(2,'0');
  const bb=$('#reciter-sleep'); if(bb) bb.classList.add('on');
}
function slStop(restore){
  clearInterval(slT); slT=null; slMode=null; window.__sleepAtEnd=false;
  const bb=$('#reciter-sleep'); if(bb) bb.classList.remove('on');
  if(restore){ try{ slAudio().volume=slVolBase; }catch(e){} }
  slLabel();
}
function slFire(){
  clearInterval(slT); slT=null; slMode=null; window.__sleepAtEnd=false;
  try{ setWantPlay(false); }catch(e){}
  try{ const a=slAudio(); if(a){ a.pause(); a.volume=slVolBase; } }catch(e){}
  try{ if(typeof __hz!=='undefined' && __hz) hzStop(); }catch(e){}
  const bb=$('#reciter-sleep'); if(bb) bb.classList.remove('on');
  slLabel(); toast('أُوقف الاستماع — تقبّل الله منك 🌙',4200);
}
function slStart(min){
  slStop(true); slVolBase = (()=>{ try{ return slAudio().volume||1; }catch(e){ return 1; } })();
  if(min==='sura'){ slMode='sura'; window.__sleepAtEnd=true; slLabel(); const bb=$('#reciter-sleep'); if(bb) bb.classList.add('on'); toast('سيتوقّف الاستماعُ عند نهاية هذه السورة',3200); return; }
  slMode='time'; slEnd=Date.now()+min*60000;
  slT=setInterval(()=>{
    const left=slEnd-Date.now();
    if(left<=0){ slFire(); return; }
    if(left<20000){ try{ slAudio().volume=Math.max(0.02, slVolBase*left/20000); }catch(e){} }   // تخفيضٌ تدريجيّ في آخر 20 ثانية (لا يعمل على آيفون: يُوقَف دفعةً)
    slLabel();
  },1000);
  slLabel(); toast('سيتوقّف الاستماعُ بعد '+AR(min)+' دقيقة',3000);
}
T.sleepEnded = function(){ if(window.__sleepAtEnd){ slFire(); return true; } return false; };
T.sleep = function(){
  let sh=$('#sl-ov');
  if(!sh){
    sh=document.createElement('div'); sh.className='sura-overlay'; sh.id='sl-ov';
    sh.innerHTML='<div class="sura-sheet"><div class="sura-sheet-head"><span>مؤقّت النوم</span><button class="sura-x" id="sl-x" aria-label="إغلاق" style="border:0;background:transparent;color:inherit;font-size:20px">✕</button></div><div style="padding:14px 16px 18px" id="sl-body"></div></div>';
    document.body.appendChild(sh);
    sh.addEventListener('click',e=>{ if(e.target===sh || e.target.id==='sl-x') sh.classList.remove('show'); });
  }
  const paint=()=>{
    const b=sh.querySelector('#sl-body');
    b.innerHTML=(slMode==='time'?'<div class="sl-big" id="sl-big"></div>':'')+
      '<div class="tl-note" style="margin:0 0 8px">يُخفِّض الصوتَ تدريجيًّا ثم يُوقف الاستماعَ ويُنهي خدمتَه، فلا يبقى الهاتف مشغولًا طوال الليل.</div>'+
      '<div class="tl-chips">'+[[15,'15 دقيقة'],[30,'30 دقيقة'],[45,'45 دقيقة'],[60,'ساعة'],[90,'ساعة ونصف'],['sura','عند نهاية السورة']].map(x=>'<button data-m="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'+
      (slMode?'<button class="tl-btn alt" id="sl-off">إلغاء المؤقّت</button>':'');
    b.querySelectorAll('[data-m]').forEach(x=>x.addEventListener('click',()=>{ vib(6); const v=x.dataset.m; slStart(v==='sura'?'sura':parseInt(v,10)); sh.classList.remove('show'); }));
    const off=b.querySelector('#sl-off'); if(off) off.addEventListener('click',()=>{ slStop(true); sh.classList.remove('show'); toast('أُلغي المؤقّت',2000); });
    const bg=b.querySelector('#sl-big'); if(bg){ const s=Math.max(0,Math.round((slEnd-Date.now())/1000)); bg.textContent=AR(Math.floor(s/60))+':'+String(s%60).padStart(2,'0'); }
  };
  paint(); sh.classList.add('show');
};

/* ============ صفحة التقويم ============ */
PAGES.cal = { title:'التقويم الهجريّ', render(body){
  if(!T.hijriOk()){ body.innerHTML='<div class="tl-card"><div class="tl-note">هذا الجهاز لا يوفّر حسابَ التقويم الهجريّ في متصفّحه.</div></div>'; return; }
  let anchor=new Date(); let sel=lk(new Date());
  const draw=()=>{
    const M=hMonthOf(anchor); const today=lk(new Date());
    const first=M.days[0].g, startCol=(first.getDay()+6)%7;   // الأسبوعُ يبدأ بالاثنين كما في تقويم المغرب
    const names=['الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد'];
    let cells=''; for(let i=0;i<startCol;i++) cells+='<div class="cal-c e"></div>';
    M.days.forEach(x=>{
      const evs=hEvents(x.h,x.g).filter(e=>!e.minor); const key=lk(x.g);
      const cls=['cal-c']; if(x.g.getDay()===5) cls.push('fri'); if(key===today) cls.push('today'); if(key===sel) cls.push('sel');
      if(evs.some(e=>e.k==='eid')) cls.push('eid'); if(evs.some(e=>e.k==='white')) cls.push('white');
      cells+='<button class="'+cls.join(' ')+'" data-k="'+key+'"><b>'+AR(x.h.d)+'</b><small>'+AR(x.g.getDate())+'/'+AR(x.g.getMonth()+1)+'</small>'+(evs.some(e=>e.k!=='white')?'<span class="dot"></span>':'')+'</button>';
    });
    const last=M.days[M.days.length-1].g;
    body.innerHTML='<div class="tl-card"><div class="cal-nav"><button id="cal-n" aria-label="الشهر التالي">›</button><div class="t">'+HMON[M.m-1]+' '+AR(M.y)+' هـ<small>'+GMON[first.getMonth()]+(first.getMonth()!==last.getMonth()?' – '+GMON[last.getMonth()]:'')+' '+AR(last.getFullYear())+'</small></div><button id="cal-p" aria-label="الشهر السابق">‹</button></div>'+
      '<div class="cal-grid">'+names.map((n,i)=>'<div class="cal-h'+(i===4?' fri':'')+'">'+n+'</div>').join('')+cells+'</div></div>'+
      '<div class="tl-card" id="cal-det"></div>'+
      '<div class="tl-card"><h3>مطابقة إعلان الوزارة</h3><div class="tl-note" style="margin-top:0">الحسابُ هنا بتقويم أمّ القرى. وفي المغرب تُعلَن بدايةُ الشهر بالرؤية، فإن اختلف يومُك عن الحساب فعدِّله:</div>'+
      '<div class="tl-chips" id="cal-adj">'+[[-1,'يوم أقلّ'],[0,'كما بالحساب'],[1,'يوم أكثر']].map(x=>'<button data-a="'+x[0]+'"'+(hAdj()===x[0]?' class="on"':'')+'>'+x[1]+'</button>').join('')+'</div></div>';
    body.querySelector('#cal-n').onclick=()=>{ vib(5); anchor=addDays(last,1); draw(); };
    body.querySelector('#cal-p').onclick=()=>{ vib(5); anchor=addDays(first,-1); draw(); };
    body.querySelectorAll('.cal-c[data-k]').forEach(c=>c.onclick=()=>{ vib(4); sel=c.dataset.k; draw(); });
    body.querySelectorAll('#cal-adj button').forEach(b=>b.onclick=()=>{ sset('az_hj_adj',parseInt(b.dataset.a,10)); vib(6); draw(); });
    const sd=M.days.find(x=>lk(x.g)===sel);
    const det=body.querySelector('#cal-det');
    if(sd){ const evs=hEvents(sd.h,sd.g);
      det.innerHTML='<h3>'+hLabel(sd.h)+'</h3><div class="tl-note" style="margin:0 0 6px">'+gLabel(sd.g,true)+'</div>'+
        (evs.length?evs.map(e=>'<div class="ev-i"><b>'+esc(e.t)+'</b>'+esc(e.n)+'</div>').join(''):'<div class="tl-note">لا مناسبةَ خاصّةً في هذا اليوم.</div>'); }
    else det.style.display='none';
  };
  draw();
}};

/* ============ متابعة الصلوات ============ */
const PK=[['fajr','الفجر'],['dhuhr','الظهر'],['asr','العصر'],['maghrib','المغرب'],['isha','العشاء']];
const ptData = () => sget('az_ptrack',{});
function ptCount(rec){ return rec? PK.filter(p=>rec[p[0]]).length : 0; }
function ptStreak(D){
  let n=0, d=new Date();
  if(ptCount(D[lk(d)])<5) d=addDays(d,-1);   // اليومُ الجاري لم يُكمَل بعد: لا يقطع السلسلة
  while(ptCount(D[lk(d)])===5){ n++; d=addDays(d,-1); }
  return n;
}
PAGES.pt = { title:'صلواتي', render(body){
  const draw=()=>{
    const D=ptData(), now=new Date(), key=lk(now), rec=D[key]||{};
    const g=sget('az_geo',null); let pt=null; try{ if(g) pt=computePrayers(g.lat,g.lng); }catch(e){}
    let wk=''; for(let i=6;i>=0;i--){ const d=addDays(now,-i), c=ptCount(D[lk(d)]); wk+='<div class="pt-wd'+(c===5?' full':'')+(i===0?' today':'')+'">'+['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'][d.getDay()]+'<i>'+AR(c)+'</i></div>'; }
    const mon=now.getMonth(); let mTot=0; Object.keys(D).forEach(k=>{ const dd=new Date(k+'T12:00:00'); if(dd.getMonth()===mon && dd.getFullYear()===now.getFullYear()) mTot+=ptCount(D[k]); });
    const st=ptStreak(D);
    body.innerHTML='<div class="pt-stat"><div><b>'+AR(ptCount(rec))+'/5</b>اليوم</div><div><b>'+AR(st)+'</b>أيّامٌ متتالية بخمسٍ كاملة</div><div><b>'+AR(mTot)+'</b>هذا الشهر</div></div>'+
      '<div class="tl-card"><h3>صلوات اليوم — '+gLabel(now,true)+'</h3><div class="pt-day">'+PK.map(p=>'<button class="pt-p'+(rec[p[0]]?' on':'')+'" data-k="'+p[0]+'"><i>'+(rec[p[0]]?'✓':'')+'</i>'+p[1]+(pt&&pt[p[0]]?'<small>'+fmtTime(pt[p[0]])+'</small>':'')+'</button>').join('')+'</div>'+
      '<div class="tl-note">اضغط على الصلاة التي أدّيتَها. هذا سجلٌّ بينك وبين نفسك: محفوظٌ على هاتفك فقط، ولا يُرسَل ولا يُقارَن بأحد.</div></div>'+
      '<div class="tl-card"><h3>آخر 7 أيّام</h3><div class="pt-week">'+wk+'</div><div class="tl-note">الدائرةُ الخضراء: خمسُ صلواتٍ كاملة. وإن فاتك يومٌ فلا تيأس، بل عُد فالسلسلةُ تبدأ من جديد بإذن الله.</div></div>';
    body.querySelectorAll('.pt-p').forEach(b=>b.onclick=()=>{
      const D2=ptData(), k=lk(new Date()), r=Object.assign({},D2[k]||{}); r[b.dataset.k]=r[b.dataset.k]?0:1;
      if(!PK.some(p=>r[p[0]])) delete D2[k]; else D2[k]=r;
      // لا نُبقي في المخزن أكثرَ من 400 يوم
      const ks=Object.keys(D2).sort(); while(ks.length>400) delete D2[ks.shift()];
      sset('az_ptrack',D2); vib(r[b.dataset.k]?12:5); draw();
    });
  };
  draw();
}};

/* ============ الصيام وإمساكيّة رمضان ============ */
function nextFastDays(limit, horizon){
  const out=[]; const now=new Date();
  for(let i=0;i<horizon && out.length<limit;i++){
    const g=addDays(now,i), h=hijri(g), evs=hEvents(h,g);
    const e=evs.find(x=>x.k==='fast' || x.k==='white'); 
    if(!e) { const mt=evs.find(x=>x.k==='mt'); if(!mt || i>14) continue; out.push({g,h,e:mt,i}); continue; }
    out.push({g,h,e,i});
  }
  return out;
}
function ramadanStart(){   // أوّلُ يومٍ من رمضانَ الجاري أو القادم
  const now=new Date(); const h=hijri(now);
  let g=now; if(h.m===9){ g=addDays(now,-(h.d-1)); return g; }
  for(let i=0;i<400;i++){ const x=addDays(now,i), hx=hijri(x); if(hx.m===9 && hx.d===1) return x; }
  return null;
}
PAGES.fast = { title:'الصيام', render(body){
  if(!T.hijriOk()){ body.innerHTML='<div class="tl-card"><div class="tl-note">التقويمُ الهجريّ غير متاحٍ على هذا الجهاز.</div></div>'; return; }
  const now=new Date(); const list=nextFastDays(9,420);
  const rows=list.map(x=>{
    const d=x.i===0?'اليوم':(x.i===1?'غدًا':'بعد '+AR(x.i)+' يومًا');
    return '<div class="fs-i"><div class="d"><b>'+AR(x.g.getDate())+'</b>'+GMON[x.g.getMonth()]+'</div><div class="x"><b>'+esc(x.e.t)+'</b><small>'+d+' · '+hLabel(x.h)+'</small></div></div>';
  }).join('');
  body.innerHTML='<div class="tl-card"><h3>الصيامُ القادم</h3>'+rows+'<div class="tl-note">الاثنين والخميس (الترمذي والنسائي)، والأيّامُ البيض، وعاشوراء مع تاسوعاء، وعرفةُ لغير الحاجّ، وستٌّ من شوّال. التواريخُ بحساب أمّ القرى؛ عدِّل يومَ الشهر من «التقويم» إن خالف إعلانَ الوزارة.</div></div>'+
   '<div class="tl-card"><h3>أيّامٌ لا يُصام فيها</h3><div class="tl-note" style="margin:0">يومُ عيد الفطر، ويومُ عيد الأضحى (البخاري 1990)، وأيّامُ التشريق الثلاثة بعده (مسلم 1141). ويُكره إفرادُ يوم الجمعة بالصيام (البخاري 1985).</div></div>'+
   '<div class="tl-card" id="im-card"></div>';
  const im=body.querySelector('#im-card'); const rs=ramadanStart(); const g=sget('az_geo',null);
  if(!rs){ im.style.display='none'; return; }
  const h=hijri(now); const inRam=h.m===9;
  const left=Math.round((rs-now)/86400000);
  if(!g){ im.innerHTML='<h3>إمساكيّة رمضان</h3><div class="tl-note" style="margin:0">فعِّل موقعك من صفحة الأذكار ليُحسَب لك وقتُ الفجر والمغرب كلَّ يوم.</div>'; return; }
  let tr=''; const n=30; let todayRow='';
  for(let i=0;i<n;i++){
    const d=addDays(rs,i); if(hijri(d).m!==9) break;
    let p=null; try{ p=computePrayers(g.lat,g.lng,d); }catch(e){}
    if(!p) continue;
    const isT=lk(d)===lk(now);
    tr+='<tr'+(isT?' class="td"':'')+'><td>'+AR(i+1)+'</td><td>'+AR(d.getDate())+' '+GMON[d.getMonth()]+'</td><td>'+fmtTime(p.fajr)+'</td><td>'+fmtTime(p.maghrib)+'</td></tr>';
    if(isT) todayRow=fmtTime(p.maghrib);
  }
  im.innerHTML='<h3>إمساكيّة رمضان '+AR(h.m===9?h.y:hijri(rs).y)+' هـ</h3>'+
    '<div class="tl-note" style="margin:0 0 8px">'+(inRam?'نحن في رمضان — بارك الله لك فيه.'+(todayRow?' الإفطارُ اليومَ عند '+todayRow+'.':''):('يبدأ رمضانُ بالحساب بعد '+AR(left)+' يومًا (تقريبًا).'))+'</div>'+
    '<table class="im-t"><tr><th>اليوم</th><th>التاريخ</th><th>الفجر (الإمساك)</th><th>المغرب (الإفطار)</th></tr>'+tr+'</table>'+
    '<div class="tl-note">الأوقاتُ بجدول مواقيت وزارة الأوقاف لأقرب مدينةٍ إليك، والإمساكُ عند أذان الفجر. أوّلُ رمضان يُحدَّد بالرؤية فقد يختلف يومًا عن الحساب.</div>';
}};

/* ============ حاسبة الزكاة ============ */
PAGES.zakat = { title:'حاسبة الزكاة', render(body){
  const S=Object.assign({gold:'',base:'gold',cash:'',gw:'',sw:'',trade:'',recv:'',debt:'',hawl:true}, sget('az_zakat',{}));
  body.innerHTML='<div class="tl-card"><h3>سعر الذهب اليوم</h3><div class="tl-lbl" style="margin-top:0">سعر غرام الذهب عيار 24 بعملتك (أدخله بنفسك من مصدرٍ تثق به)</div><input class="tl-in" id="z-gold" inputmode="decimal" placeholder="مثال: 750" value="'+esc(S.gold)+'">'+
    '<div class="tl-lbl">أساس النصاب</div><div class="tl-chips" id="z-base"><button data-b="gold"'+(S.base==='gold'?' class="on"':'')+'>الذهب (85 غرامًا)</button><button data-b="silver"'+(S.base==='silver'?' class="on"':'')+'>الفضّة (595 غرامًا)</button></div>'+
    '<div class="tl-lbl">سعر غرام الفضّة (إن اخترتَ الفضّة)</div><input class="tl-in" id="z-silver" inputmode="decimal" placeholder="مثال: 9" value="'+esc(S.silver||'')+'"></div>'+
    '<div class="tl-card"><h3>أموالك</h3>'+
    [['cash','نقدٌ وأرصدةٌ في الحساب'],['gw','ذهبٌ مدّخَر (بالغرام)'],['sw','فضّةٌ مدّخَرة (بالغرام)'],['trade','عروضُ تجارةٍ (قيمتُها السوقيّة)'],['recv','ديونٌ لك مرجوّةُ السداد'],['debt','ديونٌ حالّةٌ عليك']].map(x=>'<div class="tl-lbl">'+x[1]+'</div><input class="tl-in" data-f="'+x[0]+'" inputmode="decimal" placeholder="0" value="'+esc(S[x[0]]||'')+'">').join('')+
    '<div class="tl-row" style="margin-top:8px"><span>مرّ على المال سنةٌ هجريّةٌ كاملة (الحَوْل)</span><button class="tl-sw'+(S.hawl?' on':'')+'" id="z-hawl" aria-label="الحول"></button></div></div>'+
    '<div class="tl-card" id="z-res"></div>'+
    '<div class="tl-note">حاسبةٌ تقديريّةٌ للمال النقديّ والذهب والفضّة وعروض التجارة بنسبة 2.5٪ بعد بلوغ النصاب وتمام الحول. لا تشمل الأنعامَ والزروعَ والمعادنَ والحالاتِ الخاصّة؛ ولأهل العلم في النصاب خلافٌ (ذهبٌ أم فضّة) وفي زكاة حُليّ المرأة المستعمَل خلاف — فللتحقّق اسأل مفتيًا أو الجهةَ الرسميّة. لا يُحفَظ في هاتفك غيرُ هذه الأرقام ولا تغادره.</div>';
  const num=v=>{ const x=parseFloat(String(v||'').replace(/,/g,'.').replace(/[^0-9.]/g,'')); return isFinite(x)?x:0; };
  const calc=()=>{
    const gp=num(S.gold), sp=num(S.silver);
    const money=num(S.cash)+num(S.trade)+num(S.recv)-num(S.debt);
    const gold=num(S.gw)*gp, silver=num(S.sw)*sp;
    const total=Math.max(0,money)+gold+silver;
    const nisabG=85, nisabS=595; const nisab = S.base==='gold' ? nisabG*gp : nisabS*sp;
    const res=body.querySelector('#z-res');
    const f=x=>(Math.round(x*100)/100).toLocaleString('en-US');
    if(!nisab){ res.innerHTML='<h3>النتيجة</h3><div class="tl-note" style="margin:0">أدخل سعر '+(S.base==='gold'?'الذهب':'الفضّة')+' ليُحسَب النصاب.</div>'; return; }
    const reach=total>=nisab;
    res.innerHTML='<h3>النتيجة</h3>'+
      '<div class="tl-row"><span>مجموع الأموال الزكويّة</span><span class="v">'+f(total)+'</span></div>'+
      '<div class="tl-row"><span>النصاب ('+(S.base==='gold'?'85 غ ذهب':'595 غ فضّة')+')</span><span class="v">'+f(nisab)+'</span></div>'+
      '<div class="tl-row"><span>بلوغ النصاب</span><span class="v">'+(reach?'نعم':'لا')+'</span></div>'+
      (reach && S.hawl ? '<div class="tl-row"><span><b>الزكاة الواجبة (2.5٪)</b></span><span class="v" style="font-size:19px;color:var(--c-repeat);font-weight:800">'+f(total*0.025)+'</span></div>'
       : '<div class="tl-note">'+(reach?'بلغ مالُك النصابَ؛ تجب الزكاةُ إذا تمّ الحول (سنةٌ هجريّةٌ كاملة) وهو لم ينقص عن النصاب.':'لم يبلغ مالُك النصابَ فلا زكاةَ عليك الآن.')+'</div>');
  };
  body.querySelectorAll('.tl-in').forEach(i=>i.addEventListener('input',()=>{
    if(i.id==='z-gold') S.gold=i.value; else if(i.id==='z-silver') S.silver=i.value; else S[i.dataset.f]=i.value;
    sset('az_zakat',S); calc();
  }));
  body.querySelectorAll('#z-base button').forEach(b=>b.onclick=()=>{ S.base=b.dataset.b; sset('az_zakat',S); body.querySelectorAll('#z-base button').forEach(x=>x.classList.toggle('on',x===b)); calc(); });
  body.querySelector('#z-hawl').onclick=e=>{ S.hawl=!S.hawl; e.currentTarget.classList.toggle('on',S.hawl); sset('az_zakat',S); calc(); };
  calc();
}};

/* ============ مراجعة الحفظ بالتكرار المتباعد ============
   نظامُ «لايتنر» مبسَّط: كلُّ مقطعٍ له مستوى؛ السهلُ يرتفع مستواه فتتباعد مراجعتُه، والصعبُ يرجع إلى أوّله فيعود غدًا. */
const INTV=[1,3,7,14,30,60,120];
const rvAll = () => sget('az_hifzrev',[]);
const rvSave = a => sset('az_hifzrev',a);
T.reviewDue = function(){ const t=lk(new Date()); return rvAll().filter(x=>x.due<=t); };
T.addReview = async function(si,a,b){
  if(!window.WIRD_HAFS){ try{ await hzLoad(); }catch(e){} }
  const all=rvAll(); const id=si+':'+a+'-'+b;
  if(all.some(x=>x.id===id)){ toast('هذا المقطع في مراجعتك أصلًا',2600); return false; }
  all.push({ id, s:si, a, b, lvl:0, due:lk(addDays(new Date(),1)) }); rvSave(all);
  toast('أُضيف إلى مراجعتك — أوّلُ موعدٍ غدًا',3200); return true;
};
const rvName = x => { try{ return 'سورة '+window.WIRD_HAFS.sur[x.s].n+' ('+AR(x.a)+(x.b!==x.a?'–'+AR(x.b):'')+')'; }catch(e){ return 'مقطع'; } };
PAGES.rev = { title:'مراجعة الحفظ', render(body){
  let draftSi=null, a=1, b=1, ready=false;
  const draw=async()=>{
    if(!window.WIRD_HAFS){ try{ await hzLoad(); }catch(e){} }
    ready=!!window.WIRD_HAFS; const today=lk(new Date()); const all=rvAll();
    const due=all.filter(x=>x.due<=today), later=all.filter(x=>x.due>today).sort((p,q)=>p.due<q.due?-1:1);
    const item=(x,isDue)=>'<div class="rv-i" data-id="'+esc(x.id)+'"><div class="h"><span>'+esc(rvName(x))+'</span><small>مستوى '+AR(x.lvl+1)+'</small></div>'+
      (isDue?'<div class="rv-acts"><button class="ls">▶ استمع</button><button class="ez">سهل</button><button class="md">متوسّط</button><button class="hd">صعب</button></div>'
            :'<div class="tl-note" style="margin:5px 0 0">موعدُ المراجعة: '+gLabel(new Date(x.due+'T12:00:00'),true)+' <button class="rm" style="border:0;background:transparent;color:var(--c-repeat);font:inherit;font-size:12px">حذف</button></div>')+'</div>';
    const si = draftSi!=null ? draftSi : 0;
    const n = ready ? hzCount(si) : 1; if(b>n) b=n; if(a>b) a=b;
    body.innerHTML='<div class="tl-card"><h3>اليوم'+(due.length?' — '+AR(due.length)+' للمراجعة':'')+'</h3>'+
      (due.length?due.map(x=>item(x,true)).join(''):'<div class="tl-note" style="margin:0">لا شيءَ مستحقًّا اليوم. أضِف ما حفظتَه ليذكّرك التطبيقُ بمراجعته في الوقت المناسب.</div>')+'</div>'+
      '<div class="tl-card"><h3>أضِف مقطعًا حفظتَه</h3><button class="rv-pick" id="rv-sura"><span>'+(ready?'سورة '+esc(window.WIRD_HAFS.sur[si].n):'…')+'</span><span>▾</span></button>'+
      '<div class="rv-rng"><label>من آية<input id="rv-a" inputmode="numeric" value="'+AR(a)+'"></label><label>إلى آية<input id="rv-b" inputmode="numeric" value="'+AR(b)+'"></label></div>'+
      '<button class="tl-btn" id="rv-add">أضِف إلى المراجعة</button>'+
      '<div class="tl-note">يعمل بالتكرار المتباعد: ما سهُل عليك تتباعد مراجعتُه (غدًا ← 3 أيّام ← أسبوع ← أسبوعان ← شهر…)، وما صعُب يعود قريبًا. وهو محفوظٌ على هاتفك فقط. ويمكنك أيضًا إضافة المقطع من شاشة «التحفيظ».</div></div>'+
      (later.length?'<div class="tl-card"><h3>القادم</h3>'+later.map(x=>item(x,false)).join('')+'</div>':'');
    body.querySelector('#rv-sura').onclick=()=>{ vib(6); T.close(); openSuraOverlay(si, k=>{ closeSuraOverlay(); draftSi=k; a=1; b=1; T.open('rev'); }, 'اختر السورة'); };
    body.querySelector('#rv-a').oninput=e=>{ a=Math.max(1,Math.min(n,parseInt(e.target.value,10)||1)); if(b<a) b=a; };
    body.querySelector('#rv-b').oninput=e=>{ b=Math.max(1,Math.min(n,parseInt(e.target.value,10)||1)); };
    body.querySelector('#rv-add').onclick=async()=>{ vib(8); if(b<a) b=a; if(await T.addReview(si,a,b)) draw(); };
    body.querySelectorAll('.rv-i').forEach(el=>{
      const id=el.dataset.id; const upd=f=>{ const L=rvAll(); const x=L.find(z=>z.id===id); if(!x) return; f(x,L); rvSave(L); vib(8); draw(); };
      const set=(x,lvl)=>{ x.lvl=Math.max(0,Math.min(INTV.length-1,lvl)); x.due=lk(addDays(new Date(),INTV[x.lvl])); };
      const q=s=>el.querySelector(s);
      if(q('.ez')) q('.ez').onclick=()=>upd(x=>set(x,x.lvl+1));
      if(q('.md')) q('.md').onclick=()=>upd(x=>set(x,x.lvl));
      if(q('.hd')) q('.hd').onclick=()=>upd(x=>{ x.lvl=0; x.due=lk(addDays(new Date(),1)); });
      if(q('.rm')) q('.rm').onclick=()=>{ if(confirm('حذف هذا المقطع من المراجعة؟')) upd((x,L)=>{ L.splice(L.indexOf(x),1); }); };
      if(q('.ls')) q('.ls').onclick=async()=>{ const x=rvAll().find(z=>z.id===id); if(!x) return; T.close(); try{ __hzSel={si:x.s,from:x.a,to:x.b}; await hzLoad(); hzStart(x.s,x.a,x.b,hzCfg()); }catch(e){ toast('تعذّر التشغيل — يحتاج اتصالًا',3000); } };
    });
  };
  draw();
}};

/* ============ تذكيراتي (التطبيق الأصليّ) ============ */
const remGet = () => Object.assign({fast:false, rev:false}, sget('az_tl_rem',{}));
PAGES.rem = { title:'تذكيراتي', render(body){
  const R=remGet(); const native=(typeof isNative==='function') && isNative();
  const sw=(k,t,s)=>'<div class="tl-row"><span>'+t+'<div class="tl-note" style="margin:2px 0 0">'+s+'</div></span><button class="tl-sw'+(R[k]?' on':'')+'" data-k="'+k+'" aria-label="'+t+'"></button></div>';
  body.innerHTML='<div class="tl-card"><h3>تذكيراتٌ اختياريّة</h3>'+
    sw('fast','تذكير الصيام','مساءَ اليوم السابق: الاثنين والخميس، والأيّام البيض، وتاسوعاء وعاشوراء، وعرفة (الساعة 20:30)')+
    sw('rev','تذكير مراجعة الحفظ','كلَّ مساءٍ الساعة 20:00 إن كان لديك مقاطعُ في المراجعة')+'</div>'+
    '<div class="tl-card"><h3>الجمعة</h3><div class="tl-note" style="margin:0">تذكيراتُ الجمعة (سورة الكهف، والصلاة على النبيّ ﷺ بلا عدد) موجودةٌ في الإعدادات ضمن «التذكيرات».</div></div>'+
    (native?'':'<div class="tl-note">هذه التذكيراتُ تعمل في تطبيق أندرويد؛ ففي الموقع لا يمكن للمتصفّح جدولةُ إشعاراتٍ محلّيّةٍ مضمونة.</div>');
  body.querySelectorAll('.tl-sw').forEach(b=>b.onclick=async()=>{
    const k=b.dataset.k; const R2=remGet(); R2[k]=!R2[k]; sset('az_tl_rem',R2); b.classList.toggle('on',R2[k]); vib(8);
    if(R2[k] && native){ try{ await askNotifPerm(); }catch(e){} }
    try{ scheduleNativeNotifs(); }catch(e){}
  });
}};
/* تُستدعى من scheduleNativeNotifs: إشعاراتُ الأيّام القادمة */
T.notifs = function(nowMs, days, nextId){
  const R=remGet(); const out=[]; let id=nextId;
  const base=new Date();
  for(let i=0;i<days;i++){
    const d=addDays(base,i);
    const at=(h,m)=>{ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,m,0,0); return new Date(lclAt(x).getTime()); };
    if(R.fast && T.hijriOk()){
      const t=addDays(d,1), ev=hEvents(hijri(t),t).find(e=>e.k==='fast'||e.k==='white'||e.k==='mt');
      const a=at(20,30);
      if(ev && a.getTime()>nowMs+60000) out.push({ id:id++, channelId:'reminders', title:'غدًا: '+ev.t, body:'يُستحبّ صيامُه — '+(ev.k==='mt'?'تقبّل الله منك':'نوِ الصيامَ إن شئت'), schedule:{ at:a, allowWhileIdle:true }, smallIcon:'ic_stat_icon' });
    }
    if(R.rev && T.reviewDue){ const a=at(20,0); const any=rvAll().length>0;
      if(any && a.getTime()>nowMs+60000) out.push({ id:id++, channelId:'reminders', title:'مراجعة الحفظ', body:'حان وقتُ مراجعة محفوظك — افتح «مراجعة الحفظ» لترى ما حان موعدُه', schedule:{ at:a, allowWhileIdle:true }, smallIcon:'ic_stat_icon' });
    }
  }
  return out;
};
T.anyReminder = () => { const R=remGet(); return !!(R.fast||R.rev); };


/* ============ الجولة التعريفيّة (أوّل فتح) ============ */
const onbCss=document.createElement('style');
onbCss.textContent=`
.onb{position:fixed; inset:0; z-index:300; background:var(--bg); display:flex; flex-direction:column; padding:calc(env(safe-area-inset-top,0px) + 14px) 22px calc(22px + env(safe-area-inset-bottom,0px));}
.onb .skip{align-self:flex-start; border:0; background:transparent; color:var(--text-2); font:inherit; font-size:14.5px; font-weight:700; padding:8px 4px;}
.onb .sl{flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:16px; animation:onbIn .35s ease;}
@keyframes onbIn{ from{opacity:0; transform:translateY(10px);} to{opacity:1; transform:none;} }
.onb .ico{width:112px; height:112px; border-radius:50%; background:var(--accent-soft,rgba(47,158,68,.14)); color:var(--accent); display:flex; align-items:center; justify-content:center;}
.onb .ico svg{width:56px; height:56px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round;}
.onb h2{margin:0; font-size:25px; font-weight:800; color:var(--c-repeat);}
.onb p{margin:0; font-size:16px; line-height:2; color:var(--text); max-width:420px;}
.onb .dots{display:flex; justify-content:center; gap:8px; margin:6px 0 16px;}
.onb .dots i{width:8px; height:8px; border-radius:50%; background:var(--line);} .onb .dots i.on{background:var(--accent); width:22px; border-radius:6px;}
`;
document.head.appendChild(onbCss);
T.onboard = function(force){
  if(!force && sget('az_onb',false)) return;
  if(document.getElementById('onb')) return;
  const SL=[
    {ic:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>', t:'مواقيت الصلاة والأذان',
     p:'فعِّل موقعك من صفحة «الأذكار» ليُحسب لك وقتُ كلّ صلاة حسب مدينتك، وفي المغرب بجدول وزارة الأوقاف. وفي تطبيق أندرويد يرفع التطبيقُ الأذانَ بصوت المؤذّن عند دخول الوقت حتى وهو مغلق.'},
    {ic:'<svg viewBox="0 0 24 24"><path d="M2 4h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2z"/><path d="M22 4h-6a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22z"/></svg>', t:'القرآن والاستماع والتحفيظ',
     p:'مصحفٌ برواية ورش وحفص مع التفسير الميسّر، وتلاواتٌ بأصوات قرّاء، وتحفيظٌ بالتكرار مع مراجعةٍ متباعدة.'},
    {ic:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z"/></svg>', t:'الأذكار وأدوات المسلم',
     p:'أذكار الصباح والمساء وغيرها، والفقه والسيرة والاختبار، والقبلة والتقويم الهجريّ ومتابعة الصلوات والصيام والزكاة. المصحفُ والأذكارُ والأدواتُ تعمل دون إنترنت، والاستماعُ يحتاجه إلا ما نزّلتَه. لا حسابَ ولا إعلانات، وتقدّمُك محفوظٌ على هاتفك.'}
  ];
  let i=0; const el=document.createElement('div'); el.className='onb'; el.id='onb'; document.body.appendChild(el);
  const done=()=>{ sset('az_onb',true); el.remove(); };
  const draw=()=>{
    const x=SL[i];
    el.innerHTML='<button class="skip" id="onb-skip">'+(i<SL.length-1?'تخطَّ':'')+'</button><div class="sl"><div class="ico">'+x.ic+'</div><h2>'+x.t+'</h2><p>'+x.p+'</p></div>'+
      '<div class="dots">'+SL.map((_,k)=>'<i'+(k===i?' class="on"':'')+'></i>').join('')+'</div>'+
      '<button class="tl-btn" id="onb-next" style="margin-top:0">'+(i<SL.length-1?'التالي':'ابدأ')+'</button>';
    el.querySelector('#onb-skip').onclick=done;
    el.querySelector('#onb-next').onclick=()=>{ vib(6); if(i<SL.length-1){ i++; draw(); } else done(); };
  };
  draw();
};

})();
