#!/usr/bin/env bash
# صلاتي — يبني حزمة أندرويد (AAB) موقَّعةً ويفحصها بأمرٍ واحد.
#
#   ANDROID_HOME=/path/to/sdk \
#   KEYSTORE=/path/signing.keystore  KEYSTORE_PASS_FILE=/path/signingkeyinfo.txt \
#   tools/release-aab.sh [مجلّد_الإخراج]
#
# المُدخلات (كلُّها خارج المستودع — لا سرَّ في هذا الملفّ):
#   ANDROID_HOME        مجلّد أندرويد SDK
#   KEYSTORE            ملفّ المفتاح signing.keystore
#   KEYSTORE_ALIAS      الاسم المستعار للمفتاح (الافتراضيّ my-key-alias)
#   KEYSTORE_PASS       كلمةُ السرّ مباشرةً، أو:
#   KEYSTORE_PASS_FILE  ملفّ نصّيّ فيه سطر «Key store password: ...»
#   BUNDLETOOL          (اختياريّ) bundletool.jar للتحقّق الرسميّ من الحزمة
#
# الرقمُ والاسمُ يؤخذان من native/android-version.json (ارفعهما قبل التشغيل).
# يعمل على آخر commit في الفرع الحاليّ (git archive HEAD)، فاحرص أن يكون كلُّ شيءٍ مُلتزَمًا.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/dist}"
ALIAS="${KEYSTORE_ALIAS:-my-key-alias}"
# بصمةُ مفتاح الرفع المسجَّل في Play Console (معلومةٌ عامّة وليست سرًّا)
EXPECTED_SHA256="94:3E:29:53:04:1E:55:C7:91:4C:5B:CC:36:6C:D0:83:D9:59:BF:94:EB:26:A4:79:11:6B:22:65:83:7C:9F:2D"

die(){ echo "✗ $*" >&2; exit 1; }
ok(){ echo "✓ $*"; }

[ -n "${ANDROID_HOME:-}" ] && [ -d "$ANDROID_HOME" ] || die "ANDROID_HOME غير مضبوط"
[ -n "${KEYSTORE:-}" ] && [ -f "$KEYSTORE" ] || die "KEYSTORE غير موجود"
PASS="${KEYSTORE_PASS:-}"
if [ -z "$PASS" ] && [ -n "${KEYSTORE_PASS_FILE:-}" ]; then
  PASS="$(grep -i 'Key store password' "$KEYSTORE_PASS_FILE" | head -1 | cut -d: -f2- | tr -d ' \r')"
fi
[ -n "$PASS" ] || die "كلمةُ سرّ المفتاح غير متوفّرة (KEYSTORE_PASS أو KEYSTORE_PASS_FILE)"

VERSION_JSON="$ROOT/native/android-version.json"
VCODE="$(node -p "require('$VERSION_JSON').versionCode")"
VNAME="$(node -p "require('$VERSION_JSON').versionName")"
echo "→ الإصدار: $VNAME (code $VCODE)"
git -C "$ROOT" diff --quiet && git -C "$ROOT" diff --cached --quiet || die "تغييراتٌ غير مُلتزَمة: التزِم بها أوّلًا (البناء من آخر commit)"

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
git -C "$ROOT" archive HEAD | tar -x -C "$WORK"
cd "$WORK/native"

echo "→ تجهيز المشروع"
npm install --no-fund --loglevel=error >/dev/null 2>&1 || npm install --no-fund --loglevel=error
npm run copy:web >/dev/null
npx cap telemetry off >/dev/null 2>&1 || true
npx cap add android >/dev/null
node apply-android.js | grep -E "✓|✗" || true
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
grep -q "versionCode $VCODE" android/app/build.gradle || die "versionCode لم يُطبَّق في build.gradle"
ok "تهيئة أندرويد بالإصدار $VNAME ($VCODE)"

# lint لا يدخل في الحزمة ويستدعي تنزيلات كثيرة
cat > "$WORK/nolint.gradle" <<'EOF'
gradle.taskGraph.whenReady { graph ->
  graph.allTasks.findAll { it.name.toLowerCase().contains('lint') }.each { it.enabled = false }
}
EOF

echo "→ البناء (حتّى 4 محاولات عند أعطال الشبكة)"
cd android; chmod +x gradlew
built=0
for i in 1 2 3 4; do
  if ANDROID_HOME="$ANDROID_HOME" ./gradlew -I "$WORK/nolint.gradle" --no-daemon --console=plain :app:bundleRelease >"$WORK/gradle.log" 2>&1; then built=1; break; fi
  echo "  محاولة $i فشلت — إعادة بعد 40 ثانية"; sleep 40
done
[ "$built" = 1 ] || { tail -20 "$WORK/gradle.log"; die "فشل البناء"; }
ok "البناء نجح"

mkdir -p "$OUT"
AAB="$OUT/salatee-v$VNAME-code$VCODE-signed.aab"
cp app/build/outputs/bundle/release/app-release.aab "$AAB"
jarsigner -keystore "$KEYSTORE" -storepass "$PASS" -keypass "$PASS" -sigalg SHA256withRSA -digestalg SHA-256 "$AAB" "$ALIAS" >/dev/null 2>&1 || die "فشل التوقيع"
ok "التوقيع تمّ"

echo "→ الفحص"
unzip -tq "$AAB" >/dev/null || die "الملفّ تالف"; ok "سلامة الملفّ"
jarsigner -verify "$AAB" 2>&1 | grep -q "jar verified" || die "التوقيع غير صالح"; ok "التوقيع صالح"
FP="$(keytool -printcert -jarfile "$AAB" 2>/dev/null | grep 'SHA256:' | head -1 | sed 's/.*SHA256: *//')"
[ "$FP" = "$EXPECTED_SHA256" ] || die "بصمةُ المفتاح لا تطابق مفتاحَ الرفع في Play ($FP)"; ok "البصمةُ تطابق مفتاحَ الرفع في Play"
UNSIGNED="$(jarsigner -verify -verbose "$AAB" 2>&1 | grep -E '^ +[ms ]+ +[0-9]+ ' | grep -vE '^ +s ' | grep -vc 'META-INF' || true)"
[ "${UNSIGNED:-0}" = 0 ] || die "ملفّاتٌ غير موقَّعة: $UNSIGNED"; ok "كلّ الملفّات موقَّعة"

if [ -n "${BUNDLETOOL:-}" ] && [ -f "$BUNDLETOOL" ]; then
  java -jar "$BUNDLETOOL" validate --bundle="$AAB" >/dev/null 2>&1 || die "bundletool: الحزمة غير صالحة"; ok "bundletool: الحزمة صالحة"
  MAN="$(java -jar "$BUNDLETOOL" dump manifest --bundle="$AAB" 2>/dev/null)"
  echo "$MAN" | grep -q "versionCode=\"$VCODE\"" || die "versionCode في الحزمة ≠ $VCODE"
  echo "$MAN" | grep -q "versionName=\"$VNAME\"" || die "versionName في الحزمة ≠ $VNAME"
  echo "$MAN" | grep -q 'android:debuggable="true"' && die "الحزمة قابلةٌ للتنقيح (debuggable)"
  ok "المانيفست: $VNAME ($VCODE) وليست debuggable"
else
  echo "• (تخطّي bundletool: لم يُضبط BUNDLETOOL)"
fi

X="$WORK/x"; mkdir -p "$X"; unzip -q "$AAB" -d "$X"
if grep -rlaE 'BEGIN (RSA |EC |)PRIVATE KEY|VAPID_PRIVATE|storepass|signing\.keystore' "$X" >/dev/null 2>&1; then die "عُثر على سرٍّ داخل الحزمة"; fi
ok "لا أسرار داخل الحزمة"
bad=0
for f in $(grep -o "'\./[^']*'" "$ROOT/sw.js" | tr -d "'" | grep -v '^\./$'); do
  g="${f#./}"; cmp -s "$X/base/assets/public/$g" "$ROOT/$g" || { echo "  ✗ مختلف/غائب: $g"; bad=1; }
done
[ "$bad" = 0 ] || die "ملفّات الويب داخل الحزمة لا تطابق المستودع"
ok "ملفّات الويب داخل الحزمة = المستودع"
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  cmp -s "$X/base/res/mipmap-$d-v4/ic_launcher_foreground.png" "$ROOT/native/android-res/mipmap-$d/ic_launcher_foreground.png" || die "أيقونةُ الإطلاق ($d) ليست شعارَ صلاتي (أيقونة Capacitor الافتراضيّة؟)"
done
ok "أيقونةُ الإطلاق = شعارُ صلاتي"

echo
echo "الحزمة جاهزة: $AAB"
ls -la "$AAB" | awk '{print "الحجم:", $5, "بايت"}'
