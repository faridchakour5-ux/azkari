/* نسخ ملفات تطبيق الويب من جذر المستودع إلى www/ ليغلّفها Capacitor.
   يُشغَّل قبل كل مزامنة: npm run sync */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');   // جذر المستودع (index.html ...)
const WWW  = path.resolve(__dirname, 'www');

// ملفات ومجلدات تطبيق الويب المطلوبة داخل التطبيق الأصلي
const ITEMS = [
  'index.html', 'data.js', 'adhan.min.js', 'wird_hafs.js', 'wird_warsh.js',
  'manifest.json', 'privacy.html', 'fonts', 'icons', 'audio'
];

function rmrf(p){ if(fs.existsSync(p)) fs.rmSync(p, { recursive:true, force:true }); }
function copyRec(src, dst){
  const st = fs.statSync(src);
  if(st.isDirectory()){
    fs.mkdirSync(dst, { recursive:true });
    for(const name of fs.readdirSync(src)) copyRec(path.join(src,name), path.join(dst,name));
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive:true });
    fs.copyFileSync(src, dst);
  }
}

rmrf(WWW);
fs.mkdirSync(WWW, { recursive:true });
for(const item of ITEMS){
  const src = path.join(ROOT, item);
  if(!fs.existsSync(src)){ console.warn('تحذير: غير موجود', item); continue; }
  copyRec(src, path.join(WWW, item));
}
console.log('تمّ نسخ ملفات الويب إلى www/ ✓');
