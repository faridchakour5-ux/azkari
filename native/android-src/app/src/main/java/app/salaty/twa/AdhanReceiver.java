package app.salaty.twa;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

/**
 * يتلقّى منبّهَ دخولِ الوقت فيَرفع الأذان، ثمّ يُسلّح الوقتَ الذي يليه.
 *
 * <p>بدءُ خدمةٍ أماميّةٍ من الخلفيّة ممنوعٌ في أندرويد ١٢ فما فوق إلّا في حالاتٍ
 * مستثناة، ومنها أن يكون البادئُ مُستقبِلَ منبّهٍ دقيق — وهي حالتُنا هذه.</p>
 */
public class AdhanReceiver extends BroadcastReceiver {

  public static final String ACTION_FIRE = "app.salaty.twa.ADHAN_FIRE";
  public static final String EXTRA_NAME  = "name";
  public static final String EXTRA_FAJR  = "fajr";
  public static final String EXTRA_KIND  = "kind";     // "pre" = تذكيرُ ما قبل الصلاة (لا أذان)
  public static final String EXTRA_TITLE = "title";
  public static final String EXTRA_BODY  = "body";

  @Override
  public void onReceive(Context context, Intent intent) {
    Context app = context.getApplicationContext();
    if (intent != null && "pre".equals(intent.getStringExtra(EXTRA_KIND))) {
      try { showPre(app, intent.getStringExtra(EXTRA_TITLE), intent.getStringExtra(EXTRA_BODY)); } catch (Exception ignored) {}
      try { AdhanScheduler.arm(app); } catch (Exception ignored) {}
      return;
    }
    try {
      if (AdhanScheduler.enabled(app)) {
        String name = intent == null ? "" : intent.getStringExtra(EXTRA_NAME);
        boolean fajr = intent != null && intent.getBooleanExtra(EXTRA_FAJR, false);

        /* مكالمةٌ جاريةٌ أو تسجيلُ صوتٍ (واتساب…): لا نرفع الأذانَ فوق صاحبِه، بل إشعارًا هادئًا باسم الصلاة */
        if (busyAudio(app)) {
          String t = name == null || name.isEmpty() ? "حان وقتُ الصلاة" : "حان وقتُ صلاة " + name;
          try { showPre(app, t, "الأذانُ لم يُرفع لوجود مكالمةٍ أو تسجيلٍ صوتيّ"); } catch (Exception ignored) {}
          try { AdhanScheduler.arm(app); } catch (Exception ignored) {}
          return;
        }

        Intent svc = new Intent(app, AdhanService.class)
            .setAction(AdhanService.ACTION_PLAY)
            .putExtra(AdhanService.EXTRA_NAME, name == null ? "" : name)
            .putExtra(AdhanService.EXTRA_FAJR, fajr);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          ContextCompat.startForegroundService(app, svc);
        } else {
          app.startService(svc);
        }
      }
    } catch (Exception ignored) {
      // لا نُسقِط إعادةَ التسليح مهما حدث للتشغيل: تفويتُ أذانٍ أهونُ من توقّفِ الجدول
    }
    // الوقتُ التالي: المنبّهاتُ الدقيقة تُطلَق مرّةً واحدة، فالتسليحُ يتجدّد هنا
    try { AdhanScheduler.arm(app); } catch (Exception ignored) {}
    try { PrayerWidget.refresh(app); } catch (Exception ignored) {}
  }

  /** إشعارُ «بقي عشر دقائق على الصلاة»: صوتُه صوتُ الإشعارات العاديّ (لا أذان) وقناتُه «التذكيرات» */
  private static void showPre(Context app, String title, String body) {
    NotificationManager nm = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null) return;
    String channel = "reminders";
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(channel) == null) {
      NotificationChannel ch = new NotificationChannel(channel, "التذكيرات", NotificationManager.IMPORTANCE_HIGH);
      nm.createNotificationChannel(ch);
    }
    Intent open = new Intent(app, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    int f = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) f |= PendingIntent.FLAG_IMMUTABLE;
    PendingIntent pi = PendingIntent.getActivity(app, 7311, open, f);
    int icon = app.getResources().getIdentifier("ic_stat_icon", "drawable", app.getPackageName());
    Notification.Builder b = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ? new Notification.Builder(app, channel) : new Notification.Builder(app);
    b.setContentTitle(title == null ? "" : title).setContentText(body == null ? "" : body)
        .setStyle(new Notification.BigTextStyle().bigText(body == null ? "" : body))
        .setSmallIcon(icon != 0 ? icon : android.R.drawable.ic_lock_idle_alarm)
        .setLargeIcon(largeLogo(app))
        .setContentIntent(pi).setAutoCancel(true);
    nm.notify((int) (System.currentTimeMillis() / 60000L % 100000L) + 800000, b.build());
  }

  /** شعارُ «صلاتي» الملوَّن كأيقونةٍ كبيرةٍ في الإشعار */
  static android.graphics.Bitmap largeLogo(android.content.Context c) {
    try {
      int id = c.getResources().getIdentifier("ic_notif_large", "drawable", c.getPackageName());
      return id != 0 ? android.graphics.BitmapFactory.decodeResource(c.getResources(), id) : null;
    } catch (Exception e) { return null; }
  }

  /** هل في الهاتف مكالمةٌ (خلويّةٌ أو تطبيق) أو تسجيلُ صوتٍ جارٍ؟ بلا أيّ إذن إضافيّ */
  static boolean busyAudio(Context c) {
    try {
      AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
      if (am == null) return false;
      int m = am.getMode();
      if (m == AudioManager.MODE_RINGTONE || m == AudioManager.MODE_IN_CALL || m == AudioManager.MODE_IN_COMMUNICATION) return true;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && m == AudioManager.MODE_CALL_SCREENING) return true;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        java.util.List<?> r = am.getActiveRecordingConfigurations();
        if (r != null && !r.isEmpty()) return true;
      }
    } catch (Exception ignored) {}
    return false;
  }
}
