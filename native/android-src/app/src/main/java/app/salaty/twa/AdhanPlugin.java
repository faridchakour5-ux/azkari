package app.salaty.twa;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * الجسرُ بين واجهةِ التطبيق (index.html) وجدولِ الأذان الأصليّ.
 *
 * <p>تُحسَب المواقيتُ في جافاسكربت بـ adhan.min.js — وهي المصدرُ الواحد، فلا
 * تَختلف مواقيتُ الأذان عمّا يَراه المستخدمُ في الشريط — ثمّ تُسلَّم هنا أرقامًا
 * مطلقةً (epoch ms) ليَتولّى النظامُ إطلاقَها.</p>
 */
@CapacitorPlugin(name = "Adhan")
public class AdhanPlugin extends Plugin {

  /** يَستقبل جدولَ الأيّام القادمة ويُسلّح أقربَها. */
  @PluginMethod
  public void setSchedule(PluginCall call) {
    try {
      JSArray times = call.getArray("times", new JSArray());
      Boolean on = call.getBoolean("enabled", Boolean.TRUE);
      boolean enabled = on == null || on;

      JSONArray clean = new JSONArray();
      long now = System.currentTimeMillis();
      for (int i = 0; i < times.length(); i++) {
        JSONObject o = times.optJSONObject(i);
        if (o == null) continue;
        long at = o.optLong("at", 0L);
        if (at <= now) continue;              // ما مضى لا يُسلَّح
        JSONObject e = new JSONObject();
        e.put("at", at);
        e.put("name", o.optString("name", ""));
        e.put("fajr", o.optBoolean("fajr", false));
        clean.put(e);
      }

      AdhanScheduler.save(getContext(), clean, enabled);
      AdhanScheduler.arm(getContext());
      call.resolve(status());
    } catch (Exception e) {
      call.reject(e.getMessage() == null ? "setSchedule failed" : e.getMessage(), e);
    }
  }

  /** يُسكِت أذانًا يُرفع الآن. */
  @PluginMethod
  public void stop(PluginCall call) {
    try {
      getContext().startService(new Intent(getContext(), AdhanService.class)
          .setAction(AdhanService.ACTION_STOP));
    } catch (Exception ignored) {}
    call.resolve();
  }

  /** يَرفع الأذانَ الآن — لتجرِبةِ الصوتِ ومستواه قبل أوّلِ صلاة. */
  @PluginMethod
  public void preview(PluginCall call) {
    try {
      Intent svc = new Intent(getContext(), AdhanService.class)
          .setAction(AdhanService.ACTION_PLAY)
          .putExtra(AdhanService.EXTRA_NAME, call.getString("name", ""))
          .putExtra(AdhanService.EXTRA_FAJR, false);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        getContext().startForegroundService(svc);
      } else {
        getContext().startService(svc);
      }
      call.resolve();
    } catch (Exception e) {
      call.reject(e.getMessage() == null ? "preview failed" : e.getMessage(), e);
    }
  }

  /** حالةُ الجدول: كم وقتًا مسلَّحًا، ومتى القادم، وهل يُسمح بالمنبّهات الدقيقة. */
  @PluginMethod
  public void getStatus(PluginCall call) {
    call.resolve(status());
  }

  /** يَفتح شاشةَ «المنبّهات والتذكيرات» ليَمنح المستخدمُ إذنَ الدقّة. */
  @PluginMethod
  public void openExactAlarmSettings(PluginCall call) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        Intent i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
            Uri.parse("package:" + getContext().getPackageName()))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
      }
      call.resolve();
    } catch (Exception e) {
      call.reject(e.getMessage() == null ? "cannot open settings" : e.getMessage(), e);
    }
  }

  private JSObject status() {
    JSObject r = new JSObject();
    r.put("enabled", AdhanScheduler.enabled(getContext()));
    r.put("count", AdhanScheduler.times(getContext()).length());
    r.put("nextAt", AdhanScheduler.nextAt(getContext()));
    r.put("exact", AdhanScheduler.canExact(getContext()));
    return r;
  }
}
