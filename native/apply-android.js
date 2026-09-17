/* يَزرع طبقةَ الأذان الأصليّة داخل مشروع أندرويد المولَّد من Capacitor.
   يُشغَّل بعد `npx cap sync android` — وهو جزءٌ من `npm run sync`.
   آمِنٌ للتشغيل مرارًا: يَستبدل ما زرَعه سابقًا ولا يُكرّره. */
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SRC  = path.join(HERE, 'android-src', 'app', 'src', 'main', 'java', 'app', 'salaty', 'twa');
const APP  = path.join(HERE, 'android', 'app', 'src', 'main');
const DST  = path.join(APP, 'java', 'app', 'salaty', 'twa');
const MAN  = path.join(APP, 'AndroidManifest.xml');
const RAW  = path.join(APP, 'res', 'raw');
const MP3  = path.join(HERE, 'resources', 'adhan_wadee.mp3');

const OPEN = '<!-- صلاتي: طبقةُ الأذان — بداية (مولَّدة، لا تُحرَّر يدويًّا) -->';
const SHUT = '<!-- صلاتي: طبقةُ الأذان — نهاية -->';

function die(msg){ console.error('\n✗ ' + msg + '\n'); process.exit(1); }

if (!fs.existsSync(path.join(HERE, 'android'))) {
  die('مجلّد android/ غير موجود. شغّل أوّلًا:  npx cap add android');
}
if (!fs.existsSync(MAN)) die('AndroidManifest.xml غير موجود في ' + MAN);

/* 1) ملفّات جافا */
fs.mkdirSync(DST, { recursive: true });
let n = 0;
for (const f of fs.readdirSync(SRC)) {
  if (!f.endsWith('.java')) continue;
  fs.copyFileSync(path.join(SRC, f), path.join(DST, f));
  n++;
}
console.log('✓ نُسخ ' + n + ' ملفَّ جافا إلى app/src/main/java/app/salaty/twa/');

/* 2) ملفُّ الأذان في res/raw — بدونه لا صوتَ يُرفع */
if (fs.existsSync(MP3)) {
  fs.mkdirSync(RAW, { recursive: true });
  fs.copyFileSync(MP3, path.join(RAW, 'adhan_wadee.mp3'));
  console.log('✓ نُسخ صوتُ الأذان إلى res/raw/adhan_wadee.mp3');
} else {
  console.warn('⚠ لم يُعثَر على resources/adhan_wadee.mp3 — لن يُرفع صوتٌ حتّى تضعه');
}

/* 3) البيان (AndroidManifest) */
let m = fs.readFileSync(MAN, 'utf8');

// نزعُ ما زُرع سابقًا ليَحلَّ محلَّه الجديد
const between = new RegExp(
  OPEN.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&') + '[\\s\\S]*?' + SHUT.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&'),
  'g');
m = m.replace(between, '').replace(/\n{3,}/g, '\n\n');

const COMPONENTS = `
    ${OPEN}
    <!-- الخدمةُ الأماميّة: ترفع الأذانَ كاملًا، والنغمةُ العاديّة تُقصَّر إلى ~٣٠ ثانية -->
    <service
        android:name=".AdhanService"
        android:enabled="true"
        android:exported="false"
        android:foregroundServiceType="mediaPlayback" />

    <!-- مُستقبِلُ المنبّه: يُطلق الخدمةَ عند دخول الوقت ثمّ يُسلّح الوقتَ التالي -->
    <receiver
        android:name=".AdhanReceiver"
        android:enabled="true"
        android:exported="false" />

    <!-- بعد إعادة التشغيل أو تحديث التطبيق: منبّهاتُ أندرويد تُمحى، فتُستعاد هنا -->
    <receiver
        android:name=".BootReceiver"
        android:enabled="true"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.BOOT_COMPLETED" />
            <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            <action android:name="android.intent.action.TIME_SET" />
            <action android:name="android.intent.action.TIMEZONE_CHANGED" />
        </intent-filter>
    </receiver>
    ${SHUT}
`;

const PERMS = `
    ${OPEN}
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <!-- المنبّهاتُ الدقيقة. SCHEDULE_EXACT_ALARM يَطلبه المستخدمُ من الإعدادات
         (والتطبيقُ يَفتح له الشاشةَ بنفسه عبر openExactAlarmSettings).
         USE_EXACT_ALARM يُمنَح تلقائيًّا بلا سؤال، لكنّ سياسةَ Play تَقصُره على
         التطبيقات التي جوهرُها منبّهات — راجع CAPACITOR-BUILD.md قبل النشر. -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    ${SHUT}
`;

if (m.indexOf('</application>') < 0) die('لم أجد </application> في البيان');
m = m.replace('</application>', COMPONENTS + '</application>');

if (m.indexOf('</manifest>') < 0) die('لم أجد </manifest> في البيان');
m = m.replace('</manifest>', PERMS + '</manifest>');

fs.writeFileSync(MAN, m, 'utf8');
console.log('✓ حُدّث AndroidManifest.xml (خدمةٌ + مُستقبِلان + ٧ أذونات)');
console.log('\nتمّت زراعةُ طبقةِ الأذان ✓  — افتح الآن:  npx cap open android\n');
