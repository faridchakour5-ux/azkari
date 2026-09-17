package app.salaty.twa;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * جدولُ الأذان: يحفظ مواقيتَ الأيّام القادمة، ويُسلّح منبّهَ أقربِ وقتٍ لم يَمضِ.
 *
 * <p>لا نُسلّح المواقيتَ كلَّها دفعةً واحدة: أندرويد يَخنق كثرةَ المنبّهات الدقيقة،
 * فنُسلّح واحدًا فقط ثمّ نُعيد التسليحَ عقِبَ كلّ أذان. والجدولُ محفوظٌ في
 * SharedPreferences ليُستعاد بعد إعادة تشغيل الهاتف أو تحديث التطبيق.</p>
 */
public final class AdhanScheduler {

  private static final String PREFS   = "salaty_adhan";
  private static final String K_TIMES = "times";     // JSONArray [{at:long, name:String, fajr:bool}]
  private static final String K_ON    = "enabled";
  private static final int    REQ     = 7301;

  private AdhanScheduler() {}

  public static SharedPreferences prefs(Context c) {
    return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }

  public static boolean enabled(Context c) {
    return prefs(c).getBoolean(K_ON, true);
  }

  public static void save(Context c, JSONArray times, boolean enabled) {
    prefs(c).edit().putString(K_TIMES, times.toString()).putBoolean(K_ON, enabled).apply();
  }

  public static JSONArray times(Context c) {
    try {
      return new JSONArray(prefs(c).getString(K_TIMES, "[]"));
    } catch (Exception e) {
      return new JSONArray();
    }
  }

  /** هل يَسمح النظامُ بالمنبّهات الدقيقة؟ (أندرويد ١٢ فما فوق يَشترط إذنًا خاصًّا) */
  public static boolean canExact(Context c) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
    AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
    return am != null && am.canScheduleExactAlarms();
  }

  private static PendingIntent pending(Context c, String name, boolean fajr) {
    Intent i = new Intent(c, AdhanReceiver.class)
        .setAction(AdhanReceiver.ACTION_FIRE)
        .putExtra(AdhanReceiver.EXTRA_NAME, name)
        .putExtra(AdhanReceiver.EXTRA_FAJR, fajr);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
    return PendingIntent.getBroadcast(c, REQ, i, flags);
  }

  /** يُلغي المسلَّحَ ثمّ يُسلّح أقربَ وقتٍ قادم. آمِنٌ للاستدعاء مرارًا. */
  public static void arm(Context c) {
    AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
    if (am == null) return;

    // إلغاءُ ما سبق: الوسائطُ قد تغيّرت، وFLAG_UPDATE_CURRENT وحدَه لا يكفي بعد الإطفاء
    am.cancel(pending(c, "", false));
    if (!enabled(c)) return;

    JSONArray list = times(c);
    long now = System.currentTimeMillis();
    long bestAt = Long.MAX_VALUE;
    String bestName = "";
    boolean bestFajr = false;

    for (int i = 0; i < list.length(); i++) {
      JSONObject o = list.optJSONObject(i);
      if (o == null) continue;
      long at = o.optLong("at", 0L);
      // هامشُ دقيقةٍ: منبّهٌ في اللحظة عينِها قد يَسبقه الاستدعاء بأجزاءِ ثانية
      if (at <= now + 1000L || at >= bestAt) continue;
      bestAt   = at;
      bestName = o.optString("name", "");
      bestFajr = o.optBoolean("fajr", false);
    }
    if (bestAt == Long.MAX_VALUE) return;

    PendingIntent p = pending(c, bestName, bestFajr);
    try {
      if (canExact(c)) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, bestAt, p);
        } else {
          am.setExact(AlarmManager.RTC_WAKEUP, bestAt, p);
        }
      } else {
        /* لا إذنَ للمنبّهات الدقيقة: يبقى المنبّهُ عاملًا في وضع الخمول لكنّه
           قد يتأخّر دقائق. نُبلّغ الواجهةَ بذلك عبر canExact() لتَعرِض للمستخدم
           طلبَ الإذن، ولا نَعِدُه بدقّةٍ لا نَملكها. */
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, bestAt, p);
      }
    } catch (SecurityException ignored) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, bestAt, p);
    }
  }

  /** وقتُ الأذان القادم المسلَّح، أو صفرٌ إن لم يكن ثَمّ واحد. */
  public static long nextAt(Context c) {
    if (!enabled(c)) return 0L;
    JSONArray list = times(c);
    long now = System.currentTimeMillis(), best = Long.MAX_VALUE;
    for (int i = 0; i < list.length(); i++) {
      JSONObject o = list.optJSONObject(i);
      if (o == null) continue;
      long at = o.optLong("at", 0L);
      if (at > now + 1000L && at < best) best = at;
    }
    return best == Long.MAX_VALUE ? 0L : best;
  }
}
