package app.salaty.twa;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ويدجت الشاشة الرئيسيّة: الصلاةُ القادمةُ ووقتُها، ثمّ التي بعدها.
 *
 * <p>يقرأ جدولَ الأذان الذي يحفظه التطبيقُ أصلًا (AdhanScheduler) فلا إذنَ جديدًا ولا شبكة.
 * الوقتُ المعروضُ هو النصُّ الذي صاغه التطبيقُ نفسُه («label») بتصحيح فارق المنطقة الزمنيّة،
 * فلا يختلف عمّا في شريط المواقيت حتى على جهازٍ بقاعدةِ توقيتٍ قديمة.
 * ولا نستعمل Chronometer لأنّه يكتب الأرقامَ بحسب لغةِ الجهاز (قد تكون هنديّة)، وقاعدتُنا لاتينيّةٌ دائمًا.</p>
 */
public class PrayerWidget extends AppWidgetProvider {

  public static final String ACTION_TICK = "app.salaty.twa.WIDGET_TICK";

  @Override
  public void onUpdate(Context c, AppWidgetManager mgr, int[] ids) {
    for (int id : ids) mgr.updateAppWidget(id, build(c));
    scheduleTick(c);
  }

  @Override
  public void onReceive(Context c, Intent i) {
    super.onReceive(c, i);
    if (i != null && ACTION_TICK.equals(i.getAction())) refresh(c);
  }

  @Override
  public void onEnabled(Context c) { scheduleTick(c); }

  /** يُحدِّث كلَّ نسخٍ من الويدجت على الشاشة. آمِنٌ للاستدعاء من أيّ مكان. */
  public static void refresh(Context c) {
    try {
      Context app = c.getApplicationContext();
      AppWidgetManager mgr = AppWidgetManager.getInstance(app);
      int[] ids = mgr.getAppWidgetIds(new ComponentName(app, PrayerWidget.class));
      if (ids == null || ids.length == 0) return;
      RemoteViews v = build(app);
      for (int id : ids) mgr.updateAppWidget(id, v);
      scheduleTick(app);
    } catch (Exception ignored) {}
  }

  private static RemoteViews build(Context c) {
    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.prayer_widget);
    long now = System.currentTimeMillis();
    JSONArray list = AdhanScheduler.times(c);
    JSONObject n1 = null, n2 = null;
    for (int i = 0; i < list.length(); i++) {
      JSONObject o = list.optJSONObject(i);
      if (o == null || o.optLong("at", 0L) <= now) continue;
      if (n1 == null || o.optLong("at") < n1.optLong("at")) { n2 = n1; n1 = o; }
      else if (n2 == null || o.optLong("at") < n2.optLong("at")) n2 = o;
    }
    if (n1 == null) {
      v.setTextViewText(R.id.w_name, "صلاتي");
      v.setTextViewText(R.id.w_time, "افتح التطبيق وفعِّل موقعك");
      v.setTextViewText(R.id.w_then, "");
    } else {
      v.setTextViewText(R.id.w_name, n1.optString("name", ""));
      v.setTextViewText(R.id.w_time, label(n1));
      v.setTextViewText(R.id.w_then, n2 == null ? "" : "ثمّ " + n2.optString("name", "") + " " + label(n2));
    }
    Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    int f = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) f |= PendingIntent.FLAG_IMMUTABLE;
    v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 7310, open, f));
    return v;
  }

  /** النصُّ الجاهز من التطبيق، وإلّا صياغةٌ احتياطيّةٌ بأرقامٍ لاتينيّة. */
  private static String label(JSONObject o) {
    String l = o.optString("label", "");
    if (!l.isEmpty()) return l;
    java.util.Calendar cal = java.util.Calendar.getInstance();
    cal.setTimeInMillis(o.optLong("at", 0L));
    int h = cal.get(java.util.Calendar.HOUR_OF_DAY), m = cal.get(java.util.Calendar.MINUTE);
    return String.format(java.util.Locale.US, "%02d:%02d %s", h % 12 == 0 ? 12 : h % 12, m, h < 12 ? "ص" : "م");
  }

  /** تحديثٌ عند دخول الصلاة التالية، حتى لا يبقى اسمُ صلاةٍ مضت (منبّهٌ غيرُ دقيق لا يحتاج إذنًا). */
  private static void scheduleTick(Context c) {
    try {
      AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
      if (am == null) return;
      Intent i = new Intent(c, PrayerWidget.class).setAction(ACTION_TICK);
      int f = PendingIntent.FLAG_UPDATE_CURRENT;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) f |= PendingIntent.FLAG_IMMUTABLE;
      PendingIntent p = PendingIntent.getBroadcast(c, 7311, i, f);
      long now = System.currentTimeMillis(), best = Long.MAX_VALUE;
      JSONArray list = AdhanScheduler.times(c);
      for (int k = 0; k < list.length(); k++) {
        JSONObject o = list.optJSONObject(k);
        if (o == null) continue;
        long at = o.optLong("at", 0L);
        if (at > now + 1000L && at < best) best = at;
      }
      if (best == Long.MAX_VALUE) { am.cancel(p); return; }
      am.setAndAllowWhileIdle(AlarmManager.RTC, best + 30_000L, p);
    } catch (Exception ignored) {}
  }
}
