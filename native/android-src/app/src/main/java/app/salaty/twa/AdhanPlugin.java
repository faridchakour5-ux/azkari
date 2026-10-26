package app.salaty.twa;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

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

  /** المثيلُ الحاليّ: لتُبلِغ خدمةُ الاستماع الواجهةَ حين يضغط المستخدمُ «إيقاف» في الإشعار */
  private static AdhanPlugin instance;
  @Override public void load() { instance = this; }
  /** الأذانُ بدأ/انتهى: تُوقف الواجهةُ التلاوةَ مؤقّتًا ثم تستأنفها بعد الأذان */
  static void emitAdhanState(boolean on) {
    try { if (instance != null) { JSObject o = new JSObject(); o.put("on", on); instance.notifyListeners("adhanState", o); } } catch (Exception ignored) {}
  }
  /** مكالمةٌ بدأت/انتهت (kind: cell = اتّصالٌ هاتفيّ، voip = تطبيقُ مكالماتٍ): تُوقف الواجهةُ التلاوةَ ثم تستأنفها */
  static void emitCallState(boolean on, String kind) {
    try { if (instance != null) { JSObject o = new JSObject(); o.put("on", on); o.put("kind", kind); instance.notifyListeners("callState", o); } } catch (Exception ignored) {}
  }
  static void emitListenStop() {
    try { if (instance != null) instance.notifyListeners("listenStop", new JSObject()); } catch (Exception ignored) {}
  }

  /** يُبقي التطبيقَ حيًّا أثناء الاستماع (on=true) أو يُطلقه (on=false). */
  @PluginMethod
  public void listenKeepAlive(PluginCall call) {
    Boolean on = call.getBoolean("on", Boolean.FALSE);
    Intent svc = new Intent(getContext(), ListenService.class);
    try {
      if (on != null && on) {
        svc.setAction(ListenService.ACTION_START)
           .putExtra(ListenService.EXTRA_TITLE, call.getString("title", ""))
           .putExtra(ListenService.EXTRA_TEXT, call.getString("text", ""));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) getContext().startForegroundService(svc);
        else getContext().startService(svc);
      } else {
        getContext().stopService(svc);
      }
    } catch (Exception ignored) {}   // بدءُ خدمةٍ من الخلفيّة قد يُمنع — لا نُسقط الواجهة
    call.resolve();
  }

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
        e.put("label", o.optString("label", ""));      // الوقتُ كما يعرضه التطبيق (للويدجت)
        clean.put(e);
      }

      /* تذكيراتُ «قبل الصلاة بعشر دقائق» (اختياريّة): تُسلَّم جاهزةً من الواجهة وتُطلَق بالمنبّه الدقيق نفسِه */
      JSArray preIn = call.getArray("pre", new JSArray());
      JSONArray preClean = new JSONArray();
      for (int i = 0; i < preIn.length(); i++) {
        JSONObject o = preIn.optJSONObject(i);
        if (o == null) continue;
        long pat = o.optLong("at", 0L);
        if (pat <= now) continue;
        JSONObject e = new JSONObject();
        e.put("at", pat);
        e.put("title", o.optString("title", ""));
        e.put("body", o.optString("body", ""));
        preClean.put(e);
      }
      AdhanScheduler.savePre(getContext(), preClean);

      Boolean vs = call.getBoolean("volStop", Boolean.TRUE);
      String voice = call.getString("voice", "wadee");
      AdhanScheduler.prefs(getContext()).edit()
          .putBoolean("vol_stop", vs != null && vs)
          .putString("voice", AdhanService.cleanVoice(voice)).apply();
      AdhanScheduler.save(getContext(), clean, enabled);
      AdhanScheduler.arm(getContext());
      PrayerWidget.refresh(getContext());
      call.resolve(status());
    } catch (Exception e) {
      call.reject(e.getMessage() == null ? "setSchedule failed" : e.getMessage(), e);
    }
  }

  /** مؤذّنٌ إضافيّ يُنزَّل إلى مساحة التطبيق (لا يكون في الحزمة): يعمل بلا إنترنت وقت الأذان. */
  @PluginMethod
  public void downloadVoice(PluginCall call) {
    final String id = call.getString("id", "");
    final String url = call.getString("url", "");
    if (!id.matches("[a-z0-9]{3,24}") || !url.startsWith("https://salatee.org/adhan/")) { call.reject("bad voice"); return; }
    new Thread(() -> {
      File dir = AdhanService.voiceDir(getContext());
      File part = new File(dir, id + ".part"), out = new File(dir, id + ".m4a");
      String err = "";
      /* محاولتان: انقطاعُ الشبكة وسط الملفّ كان يُبقي ملفًّا ناقصًا يبدو مُنزَّلًا */
      for (int attempt = 0; attempt < 2; attempt++) {
        HttpURLConnection c = null;
        try {
          dir.mkdirs();
          c = (HttpURLConnection) new URL(url).openConnection();
          c.setConnectTimeout(15000); c.setReadTimeout(30000);
          c.setRequestProperty("Accept-Encoding", "identity");
          if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
          long want = c.getContentLengthLong(), total = 0;
          try (InputStream in = c.getInputStream(); FileOutputStream fo = new FileOutputStream(part)) {
            byte[] buf = new byte[16384]; int n;
            while ((n = in.read(buf)) > 0) { fo.write(buf, 0, n); total += n; if (total > 12L * 1024 * 1024) throw new Exception("too big"); }
            fo.getFD().sync();
          }
          if (total < 100 * 1024) throw new Exception("too small " + total);
          if (want > 0 && total != want) throw new Exception("incomplete " + total + "/" + want);
          if (out.exists()) out.delete();
          if (!part.renameTo(out)) throw new Exception("rename");
          call.resolve(status());
          return;
        } catch (Exception e) {
          err = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
          try { part.delete(); } catch (Exception ignored) {}
        } finally { if (c != null) c.disconnect(); }
      }
      call.reject(err);
    }).start();
  }

  @PluginMethod
  public void deleteVoice(PluginCall call) {
    String id = call.getString("id", "");
    if (id.matches("[a-z0-9]{3,24}")) { try { new File(AdhanService.voiceDir(getContext()), id + ".m4a").delete(); } catch (Exception ignored) {} }
    call.resolve(status());
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
      /* اختبارٌ يراه المستخدم: إن وُجدت مكالمةٌ أو تسجيلٌ لا يُرفع الأذانُ ونُعيد السببَ */
      String why = AdhanReceiver.busyReason(getContext());
      if (!why.isEmpty()) {
        AdhanReceiver.notifyQuiet(getContext(), "");
        JSObject r = new JSObject(); r.put("blocked", true); r.put("why", why); call.resolve(r); return;
      }
      Intent svc = new Intent(getContext(), AdhanService.class)
          .setAction(AdhanService.ACTION_PLAY)
          .putExtra(AdhanService.EXTRA_NAME, call.getString("name", ""))
          .putExtra(AdhanService.EXTRA_VOICE, call.getString("voice", ""))
          .putExtra(AdhanService.EXTRA_FAJR, false);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        getContext().startForegroundService(svc);
      } else {
        getContext().startService(svc);
      }
      JSObject ok = new JSObject(); ok.put("blocked", false); call.resolve(ok);
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

  /** هل التطبيقُ مستثنًى من تحسين البطارية؟ (يزيد موثوقيّةَ الأذان على بعض الهواتف) */
  private boolean ignoringBattery() {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
      PowerManager pm = (PowerManager) getContext().getSystemService(android.content.Context.POWER_SERVICE);
      return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    } catch (Exception e) { return true; }
  }

  /** يَفتح قائمةَ «تحسين البطارية» ليختار المستخدمُ «عدم التحسين» للتطبيق. لا يحتاج إذنًا خاصًّا. */
  @PluginMethod
  public void openBatterySettings(PluginCall call) {
    try {
      Intent i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(i);
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
    r.put("battery", ignoringBattery());
    /* هل في هذا البناء صوتٌ ثانٍ؟ — لا نعرضُ خيارًا لا ملفَّ له */
    r.put("altAvailable", getContext().getResources().getIdentifier("adhan_alt", "raw", getContext().getPackageName()) != 0);
    JSArray vs = new JSArray();
    try { File[] fs = AdhanService.voiceDir(getContext()).listFiles(); if (fs != null) for (File f : fs) { String nm = f.getName(); if (nm.endsWith(".m4a") && f.length() > 100 * 1024) vs.put(nm.substring(0, nm.length() - 4)); } } catch (Exception ignored) {}
    r.put("voices", vs);
    return r;
  }
}
