package app.salaty.twa;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
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

  @Override
  public void onReceive(Context context, Intent intent) {
    Context app = context.getApplicationContext();
    try {
      if (AdhanScheduler.enabled(app)) {
        String name = intent == null ? "" : intent.getStringExtra(EXTRA_NAME);
        boolean fajr = intent != null && intent.getBooleanExtra(EXTRA_FAJR, false);

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
  }
}
