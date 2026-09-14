/* التحقُّقُ الكاملُ من نصِّ ورشٍ في التطبيق بمقابلتِه بنصِّ مرجعٍ خارجيّ.
 *
 *   node tools/tahaqquq-warsh.js  [ملفّ-المرجع.json]
 *
 * إن لم يُعطَ ملفٌّ، نُزِّل المرجعُ من:
 *   https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/ara-quranwarsh.min.json
 * وهو نصُّ ورشٍ عن نافعٍ برسمِه العثمانيِّ المغربيّ.
 *
 * تُهمَل علاماتُ الوقفِ وأرقامُ الآي والفواصل، وتُسوَّى ثلاثةُ فروقِ
 * ترميزٍ لا رسمٍ (مشروحةٌ في tools/marja3/README.md)، ثمّ يُقابَل
 * ما بقي حرفًا بحرفٍ وعلامةً بعلامة.
 */
const fs=require('fs'), path=require('path'), os=require('os');
const URL_MARJA='https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/ara-quranwarsh.min.json';

global.window={}; require(path.join(__dirname,'..','wird_warsh.js'));
const M=window.WIRD_WARSH;

const CP=c=>c.codePointAt(0);
const CPS=w=>[...w].map(c=>'U+'+CP(c).toString(16).toUpperCase().padStart(4,'0')).join(' ');
/* المهمَل: علاماتُ الوقف، ورمزُ الحزب، والسجدة، وأرقامُ الآي، والفواصل */
const DROP=new Set([0x6D6,0x6D7,0x6D8,0x6D9,0x6DA,0x6DB,0x6DC,0x6DD,0x6DE,0x6E9,
                    0xA0,0x200B,0x200C,0x200D,0x200E,0x200F,0x640,0x61B,0x60C,0x66D,0x2E]);
const clean=t=>[...String(t)].filter(c=>{const n=CP(c);
    if(DROP.has(n)) return false;
    if(n>=0x660&&n<=0x669) return false;
    if(/[0-9()\[\]«»۩۞]/.test(c)) return false;
    return true;}).join('').replace(/\s+/g,' ').trim();

/* ── تسويةُ فروقِ الترميزِ الثلاثة ─────────────────────────────
 * ١) ترتيبُ الشدَّةِ والحركة → الترتيبُ القياسيّ NFC
 * ٢) التنوينُ المتراكب: 08F0/08F1/08F2 ↔ 0657/065E/0656
 * ٣) الألفُ المقصورةُ آخرَ الكلمة: ي ↔ ى (رسمٌ واحدٌ في الخطِّ المغربيّ)
 * ٤) وعلامتان تحتيّتان في «امرِئٍ» تتساوى رتبتُهما فلا يُرتِّبُهما NFC
 */
const EQ_TNW={'ࣰ':'ٗ','ࣱ':'ٞ','ࣲ':'ٖ'};
let eqTnw=0, eqYa=0;
const equalize=t=>String(t).normalize('NFC')
  .replace(/[ࣰࣱࣲ]/g, m=>{eqTnw++; return EQ_TNW[m];})
  .replace(/ي(?=[ً-ٕٗ-ٰۖ-ۭ]*(?:\s|$))/g,
           ()=>{eqYa++; return 'ى';})
  .normalize('NFC')
  .replace(/ٕٖ/g,'ٖٕ');

function lcs(A,B){
  const n=A.length,m=B.length;
  const d=Array.from({length:n+1},()=>new Int32Array(m+1));
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)
    d[i][j]=A[i-1]===B[j-1]?d[i-1][j-1]+1:Math.max(d[i-1][j],d[i][j-1]);
  const o=[]; let i=n,j=m;
  while(i>0||j>0){
    if(i>0&&j>0&&A[i-1]===B[j-1]){o.push({t:'=',a:A[i-1]});i--;j--;}
    else if(j>0&&(i===0||d[i][j-1]>=d[i-1][j])){o.push({t:'+',b:B[j-1]});j--;}
    else{o.push({t:'-',a:A[i-1]});i--;}
  }
  return o.reverse();
}

function lire(f){
  const q=JSON.parse(fs.readFileSync(f,'utf8')).quran;
  const par={}; for(const v of q)(par[v.chapter]=par[v.chapter]||[]).push(v.text);
  /* المرجعُ على العدِّ الكوفيّ: البسملةُ آيةٌ أولى من الفاتحة.
     والتطبيقُ على العدِّ المدنيِّ الأخير وهو عدُّ ورشٍ الذي عليه
     المصحفُ المحمَّدي، فلا تُعَدُّ البسملةُ منها. */
  par[1].shift();
  return par;
}

let fichier=process.argv[2];
if(!fichier){
  fichier=path.join(os.tmpdir(),'ara-quranwarsh.min.json');
  if(!fs.existsSync(fichier)){
    console.log('تنزيلُ المرجع…');
    require('child_process').execFileSync('curl',['-sSL','-o',fichier,URL_MARJA],{stdio:'inherit'});
  }
}
const ref=lire(fichier);

let sain=0, appTot='', refTot='';
const fautes=[];
for(let s=1;s<=114;s++){
  const i=M.sur.findIndex(x=>x.s===s);
  const a0=M.sur[i].i, a1=(i+1<M.sur.length?M.sur[i+1].i:M.a.length);
  const app=equalize(clean(M.a.slice(a0,a1).map(x=>x.t).join(' ')));
  const rf =equalize(clean(ref[s].join(' ')));
  appTot+=app+' '; refTot+=rf+' ';
  if(app.replace(/ /g,'')===rf.replace(/ /g,'')){ sain++; continue; }
  fautes.push({s,nom:M.sur[i].n,d:lcs(app.split(' '),rf.split(' '))});
}

console.log('سورٌ مطابقة: '+sain+' من ١١٤');
console.log('حروفُ التطبيق: '+appTot.replace(/ /g,'').length+
            '   |   حروفُ المرجع: '+refTot.replace(/ /g,'').length);
console.log('سُوِّي من فروقِ الترميز: تنوينٌ متراكب '+eqTnw+'   |   ألفٌ مقصورة/ياء '+eqYa);
console.log('');
if(!fautes.length){ console.log('>>> المصحفُ كلُّه مطابقٌ تمامًا — صفر فرق <<<'); process.exit(0); }
for(const f of fautes){
  console.log('── ['+f.s+'] '+f.nom);
  f.d.forEach((x,k)=>{ if(x.t==='=') return;
    const ctx=[]; for(let z=Math.max(0,k-3);z<Math.min(f.d.length,k+4);z++) ctx.push(f.d[z].a||f.d[z].b);
    console.log(x.t==='-' ? '   [التطبيق] «'+x.a+'»  '+CPS(x.a)
                          : '   [المرجع ] «'+x.b+'»  '+CPS(x.b));
    console.log('        … '+ctx.join(' ')+' …');});
  console.log('');
}
process.exit(1);
