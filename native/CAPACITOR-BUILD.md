# تحويل «صلاتي» إلى تطبيق أصلي (Capacitor) — أذان يعمل والتطبيق مغلق

هذا الدليل يحوّل الغلاف من TWA إلى تطبيق أندرويد أصلي عبر **Capacitor**، مع
**إشعارات مجدوَلة على مستوى النظام** ترفع الأذان عند كل صلاة — حتى والتطبيق
مغلق تمامًا وبلا إنترنت.

> كلّ كود التطبيق (الأذكار، المصحف، المسبحة، الاستماع…) يبقى كما هو. نغيّر
> الغلاف فقط ونضيف طبقة جدولة الأذان. الحزمة تبقى `app.salaty.twa` فيُعتبر
> **تحديثًا** للتطبيق الموجود في Play Store لا تطبيقًا جديدًا.

---

## المتطلّبات (على حاسوبك)

- **Node.js 18+** و **npm**
- **Android Studio** (أحدث نسخة) + Android SDK
- **JDK 17**
- ملف التوقيع (keystore) نفسه المستعمَل سابقًا — ضروري ليُقبَل التحديث في
  Play Store. احتفظ به وبكلمة مروره **خارج المستودع** (مدير كلمات مرور أو
  تخزين آمن)، ولا تكتبهما في أي ملف يُرفع إلى GitHub.

---

## 1) تجهيز المشروع

```bash
cd native
npm install
npm run copy:web          # ينسخ ملفات الويب إلى www/
npx cap add android       # يولّد مجلد android/
```

## 2) صوت الأذان (نغمة القناة)

انسخ ملف الأذان إلى مجلد أصوات أندرويد الخام (بدون مسافات، أحرف صغيرة):

```bash
mkdir -p android/app/src/main/res/raw
cp resources/adhan_wadee.mp3 android/app/src/main/res/raw/adhan_wadee.mp3
```

> **مهمّ عن طول الصوت:** نغمة الإشعار في أندرويد تُقصَّر عادةً إلى ~30 ثانية.
> إن أردت أذانًا كاملًا (٣ دقائق) يُشغَّل بالكامل والتطبيق مغلق، يلزم كود
> أصلي إضافي (Foreground Service + MediaPlayer) — اطلبه مني كخطوة تالية.
> لأغلب الاستعمالات، أذان الإشعار (~30 ثانية) كافٍ ومريح.

## 3) أيقونة الإشعار (اختياري لكن مستحسن)

أنشئ أيقونة بيضاء شفّافة صغيرة باسم `ic_stat_icon` عبر Android Studio:
`res/ (نقر يمين) → New → Image Asset → Notification Icons`، وسمِّها
`ic_stat_icon`. (إن تركتها، سيُستعمل أيقونة افتراضية.)

## 4) أذونات أندرويد

أضِف إلى `android/app/src/main/AndroidManifest.xml` داخل وسم `<manifest>`
(قبل `<application>`):

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
```

## 5) المزامنة والفتح في Android Studio

```bash
npm run sync              # ينسخ الويب + npx cap sync android
npx cap open android
```

## 6) رقم الإصدار (versionCode)

في `android/app/build.gradle` ارفع `versionCode` إلى رقم **أكبر** من آخر
نسخة رفعتها إلى Play Store (مثلًا `3`)، وحدّث `versionName` (مثلًا `"2.0"`).

## 7) البناء والتوقيع (AAB للمتجر)

في Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**،
واختر ملف التوقيع `salaty-release.jks` بنفس كلمة المرور والاسم المستعار.
سينتج `app-release.aab` — ارفعه في Play Console كإصدار جديد لنفس التطبيق.

---

## كيف يعمل الأذان (تقنيًّا)

- عند فتح التطبيق (وعند كل عودة إليه) يستدعي `scheduleNativeAdhan()` في
  `index.html`، فيحسب مواقيت الصلاة لـ**٧ أيام** قادمة (عبر `adhan.min.js`
  محليًّا) ويجدول إشعارًا لكل صلاة على قناة «الأذان» بصوت المؤذّن.
- الجدولة على مستوى نظام أندرويد (`allowWhileIdle`)، فتعمل **والتطبيق مغلق
  والهاتف نائم وبلا إنترنت**.
- يُعيد التطبيق حساب الجدول كلّما فُتح، فتبقى الأيام السبعة القادمة محدّثة.
- يتطلّب تفعيل **«مواقيت الصلاة حسب موقعك»** مرّة واحدة (لتحديد الموقع).

## إضافة مؤذّنين آخرين

ضع ملفاتهم في `res/raw/` (مثل `adhan_makki.mp3`)، وأنشئ قناة لكلٍّ منها في
`scheduleNativeAdhan()` باسم صوته، وأضِفهم إلى قائمة `MUEZZINS` وزرّ الاختيار.
