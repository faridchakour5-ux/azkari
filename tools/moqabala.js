/* أداة مقابلة نصّ المصحف في التطبيق بنصّ مرجعه.
 *
 *   node tools/moqabala.js "اسم السورة" ملفّ-المرجع.txt  [warsh|hafs]
 *
 * انسخ نصّ السورة من مصحف المرجع (المصحف المحمدي لورش،
 * ومصحف الملك فهد لحفص)، واحفظه في ملفّ نصّيّ، ثمّ شغّل الأمر.
 * تُهمَل علامات الوقف وأرقام الآيات والفواصل، ويُقابَل ما عداها
 * حرفًا بحرف وعلامةً بعلامة.
 */
const fs=require('fs');
const riwaya=(process.argv[4]||'warsh').toLowerCase();
global.window={};
require(riwaya==='hafs' ? '../wird_hafs.js' : '../wird_warsh.js');
const M = riwaya==='hafs' ? window.WIRD_HAFS : window.WIRD_WARSH;

const CP=c=>c.codePointAt(0);
const CPS=w=>[...w].map(c=>'U+'+CP(c).toString(16).toUpperCase().padStart(4,'0')).join(' ');
/* ما يُهمَل: علامات الوقف، ورمز الحزب، وموضع السجدة، وأرقام الآيات، والفواصل */
const DROP=new Set([0x6D6,0x6D7,0x6D8,0x6D9,0x6DA,0x6DB,0x6DC,0x6DD,0x6DE,0x6E9,
                    0xA0,0x200F,0x200E,0x640,0x61B,0x60C,0x66D,0x2E]);
const clean=t=>[...String(t)]
  .filter(c=>{const n=CP(c);
    if(DROP.has(n)) return false;
    if(n>=0x660&&n<=0x669) return false;            // أرقام عربية-هندية
    if(/[0-9()\[\]«»۩۞]/.test(c)) return false;
    return true;})
  .join('').replace(/\s+/g,' ').trim();

const norm=t=>t.replace(/[^ء-ي]/g,'').replace(/^ال/,'')
               .replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');
function suraIdx(nom){
  const n=norm(nom), N=M.sur.map(s=>norm(s.n));
  let i=N.indexOf(n); if(i>=0) return i;
  const c=N.map((x,k)=>({x,k})).filter(o=>o.x.indexOf(n)>=0||n.indexOf(o.x)>=0);
  if(c.length===1) return c[0].k;
  if(c.length>1){ console.log('الاسم ملتبس بين:', c.map(o=>M.sur[o.k].n).join(' | ')); return -2; }
  return -1;
}
function diffMots(a,b){
  const A=a.split(' ').filter(Boolean), B=b.split(' ').filter(Boolean);
  const n=A.length,m=B.length;
  const d=Array.from({length:n+1},()=>new Int32Array(m+1));
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)
    d[i][j]= A[i-1]===B[j-1] ? d[i-1][j-1]+1 : Math.max(d[i-1][j],d[i][j-1]);
  const out=[]; let i=n,j=m;
  while(i>0||j>0){
    if(i>0&&j>0&&A[i-1]===B[j-1]){ out.push({t:'=',a:A[i-1]}); i--;j--; }
    else if(j>0&&(i===0||d[i][j-1]>=d[i-1][j])){ out.push({t:'+',b:B[j-1]}); j--; }
    else { out.push({t:'-',a:A[i-1]}); i--; }
  }
  return out.reverse();
}


/* ── تسويةُ فروقِ الترميز ──────────────────────────────────────
 * مصادرُ ورشٍ الرقميّة تختلف في ترميزِ ثلاثةِ أشياءَ لا في رسمِها:
 *   ١) ترتيبُ الشدّةِ والحركة: بعضُها «شدّةٌ ثمّ حركة» وبعضُها العكس.
 *      والترتيبُ القياسيُّ في يونيكود (NFC) هو الحركةُ ثمّ الشدّة.
 *   ٢) التنوينُ المتراكب: بعضُها U+08F0/08F1/08F2 وبعضُها U+0657/065E/0656
 *   ٣) الألفُ المقصورةُ في آخرِ الكلمة: بعضُها ى وبعضُها ي —
 *      وهما في الخطِّ المغربيِّ رسمٌ واحدٌ مجرَّدٌ من النَّقْط.
 * فتُسوَّى الثلاثةُ قبل المقابلة، ويُحصى عددُها على حِدَة،
 * حتى لا تُحسَبَ خطأً وهي ليست خطأً.
 */
const EQ_TNW={'\u08F0':'\u0657','\u08F1':'\u065E','\u08F2':'\u0656'};
let eqTnw=0, eqYa=0;
function equalize(t){
  return String(t).normalize('NFC')
    .replace(/[\u08F0\u08F1\u08F2]/g, m=>{eqTnw++; return EQ_TNW[m];})
    .replace(/\u064A(?=[\u064B-\u0655\u0657-\u0670\u06D6-\u06ED]*(?:\s|$))/g,
             ()=>{eqYa++; return '\u0649';})
    .normalize('NFC');
}

const nomSura=process.argv[2], fichier=process.argv[3];
if(!nomSura||!fichier){ console.log('الاستعمال: node tools/moqabala.js "اسم السورة" ملفّ-المرجع.txt [warsh|hafs]'); process.exit(1); }
const si=suraIdx(nomSura);
if(si===-2) process.exit(1);
if(si<0){ console.log('لم أجد السورة:', nomSura); process.exit(1); }
const deb=M.sur[si].i, fin=(si+1<M.sur.length? M.sur[si+1].i : M.a.length);
const app=equalize(clean(M.a.slice(deb,fin).map(a=>a.t).join(' ')));
const ref=equalize(clean(fs.readFileSync(fichier,'utf8')));
console.log('السورة: '+M.sur[si].n+'   ('+riwaya+')   عدد الآيات: '+(fin-deb));
console.log('حروف التطبيق: '+app.length+'   |   حروف المرجع: '+ref.length);
console.log('سُوِّي من فروق الترميز: تنوينٌ متراكب '+eqTnw+'   |   ألفٌ مقصورة/ياء '+eqYa);
if(app===ref){ console.log(''); console.log('>>> مطابقٌ تمامًا — صفر فرق <<<'); process.exit(0); }
const d=diffMots(app,ref);
console.log('كلمات مختلفة: '+d.filter(x=>x.t!=='=').length);
console.log('');
for(let k=0;k<d.length;k++){
  if(d[k].t==='=') continue;
  const ctx=[]; for(let z=Math.max(0,k-2);z<Math.min(d.length,k+3);z++) ctx.push(d[z].a||d[z].b);
  console.log(d[k].t==='-' ? ('  [في التطبيق فقط] «'+d[k].a+'»   '+CPS(d[k].a))
                           : ('  [في المرجع فقط]  «'+d[k].b+'»   '+CPS(d[k].b)));
  console.log('       السياق: … '+ctx.join(' ')+' …');
}
