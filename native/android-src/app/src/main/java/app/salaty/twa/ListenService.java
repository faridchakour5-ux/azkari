package app.salaty.twa;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

/**
 * خدمةٌ أماميّةٌ تُبقي التطبيقَ حيًّا أثناء الاستماع (تلاوةٌ، تحفيظ، دروس).
 *
 * <p>الصوتُ نفسُه يُشغَّل في الـWebView. لكنّ أندرويد يُجمّد أو يُنهي التطبيقَ الذي في الخلفيّة
 * ما لم تكن له خدمةٌ أماميّة — فتنقطع التلاوةُ «وحدَها» بعد إطفاء الشاشة بقليل. وكذلك يُطفئ
 * الـWi-Fi والمعالجَ لتوفير البطارية فيتعثّر البثّ. هذه الخدمة تمسك قفلَ استيقاظٍ جزئيًّا وقفلَ
 * Wi-Fi ما دامت التلاوةُ تعمل، وتُظهر إشعارًا فيه زرُّ «إيقاف».</p>
 */
public class ListenService extends Service {

  public static final String ACTION_START = "app.salaty.twa.LISTEN_START";
  public static final String ACTION_USER_STOP = "app.salaty.twa.LISTEN_USER_STOP";
  public static final String EXTRA_TITLE = "title";
  public static final String EXTRA_TEXT  = "text";

  private static final String CHANNEL  = "listen_play";
  private static final int    NOTIF_ID = 7312;
  /** حدٌّ أقصى للأقفال: لا تبقى ممسوكةً إن نُسي الإيقافُ لسببٍ ما */
  private static final long   MAX_MS   = 6 * 60 * 60 * 1000L;

  private PowerManager.WakeLock wake;
  private WifiManager.WifiLock wifi;

  @Override public IBinder onBind(Intent i) { return null; }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    String action = intent == null ? ACTION_START : intent.getAction();
    if (ACTION_USER_STOP.equals(action)) {
      AdhanPlugin.emitListenStop();          // تُوقف الواجهةُ الصوتَ نفسَه
      stopEverything();
      return START_NOT_STICKY;
    }
    String title = intent == null ? null : intent.getStringExtra(EXTRA_TITLE);
    String text  = intent == null ? null : intent.getStringExtra(EXTRA_TEXT);
    Notification n = buildNotification(title == null || title.isEmpty() ? "الاستماع" : title, text == null ? "" : text);
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
      } else {
        startForeground(NOTIF_ID, n);
      }
    } catch (Exception e) { stopSelf(); return START_NOT_STICKY; }
    acquireLocks();
    return START_NOT_STICKY;
  }

  private Notification buildNotification(String title, String text) {
    ensureChannel();
    int f = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) f |= PendingIntent.FLAG_IMMUTABLE;
    Intent open = new Intent(this, MainActivity.class)
        .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent piOpen = PendingIntent.getActivity(this, 11, open, f);
    PendingIntent piStop = PendingIntent.getService(this, 12,
        new Intent(this, ListenService.class).setAction(ACTION_USER_STOP), f);
    Notification.Builder b = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
    int icon = getResources().getIdentifier("ic_stat_icon", "drawable", getPackageName());
    b.setContentTitle(title)
     .setContentText(text)
     .setSmallIcon(icon != 0 ? icon : android.R.drawable.ic_media_play)
     .setContentIntent(piOpen)
     .setOngoing(true)
     .setOnlyAlertOnce(true)
     .addAction(0, "إيقاف", piStop);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      b.setCategory(Notification.CATEGORY_TRANSPORT);
      b.setVisibility(Notification.VISIBILITY_PUBLIC);
    }
    return b.build();
  }

  private void ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
    NotificationChannel ch = new NotificationChannel(CHANNEL, "الاستماع", NotificationManager.IMPORTANCE_LOW);
    ch.setDescription("يظهر أثناء الاستماع ليبقى الصوتُ يعمل والشاشةُ مطفأة، وفيه زرُّ الإيقاف");
    ch.setSound(null, null);
    ch.enableVibration(false);
    ch.setShowBadge(false);
    nm.createNotificationChannel(ch);
  }

  private void acquireLocks() {
    try {
      if (wake == null) {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
          wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "salaty:listen");
          wake.setReferenceCounted(false);
        }
      }
      if (wake != null) wake.acquire(MAX_MS);
    } catch (Exception ignored) {}
    try {
      if (wifi == null) {
        WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wm != null) {
          int mode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
              ? WifiManager.WIFI_MODE_FULL_LOW_LATENCY : WifiManager.WIFI_MODE_FULL_HIGH_PERF;
          wifi = wm.createWifiLock(mode, "salaty:listen");
          wifi.setReferenceCounted(false);
        }
      }
      if (wifi != null && !wifi.isHeld()) wifi.acquire();
    } catch (Exception ignored) {}
  }

  private void stopEverything() {
    try { if (wake != null && wake.isHeld()) wake.release(); } catch (Exception ignored) {}
    try { if (wifi != null && wifi.isHeld()) wifi.release(); } catch (Exception ignored) {}
    wake = null; wifi = null;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(Service.STOP_FOREGROUND_REMOVE);
    else stopForeground(true);
    stopSelf();
  }

  @Override
  public void onDestroy() {
    try { if (wake != null && wake.isHeld()) wake.release(); } catch (Exception ignored) {}
    try { if (wifi != null && wifi.isHeld()) wifi.release(); } catch (Exception ignored) {}
    super.onDestroy();
  }
}
