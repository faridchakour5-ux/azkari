package app.salaty.twa;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

/**
 * خدمةٌ أماميّةٌ ترفع الأذانَ كاملًا — ثلاثَ دقائقَ لا ثلاثين ثانية.
 *
 * <p>نغمةُ الإشعار في أندرويد تُقصَّر إلى نحوِ ثلاثين ثانية ولا حيلةَ في ذلك،
 * فالأذانُ الكامل يحتاج مُشغِّلًا حقيقيًّا. والخدمةُ الأماميّة هي السبيلُ
 * الوحيدُ المسموحُ به لتشغيل صوتٍ طويلٍ والتطبيقُ مغلق.</p>
 *
 * <p>تُستدعى من {@link AdhanReceiver} عند دخول الوقت. وتَستعمل
 * {@code USAGE_ALARM} فيُسمَع الأذانُ على مستوى صوتِ المنبّه، ولا يُسكِته وضعُ
 * كتمِ الرنين — وهو المقصود: من كتَم هاتفَه لم يَقصِد تفويتَ الصلاة.</p>
 */
public class AdhanService extends Service {

  public static final String ACTION_PLAY = "app.salaty.twa.ADHAN_PLAY";
  public static final String ACTION_STOP = "app.salaty.twa.ADHAN_STOP";
  public static final String EXTRA_NAME  = "name";
  public static final String EXTRA_FAJR  = "fajr";

  private static final String CHANNEL = "adhan_play";
  private static final int    NOTIF_ID = 7311;
  /** حدٌّ أقصى للتشغيل: لو تعذّر بلوغُ النهاية لسببٍ ما لم تَبقَ الخدمةُ عالقة. */
  private static final long   MAX_MS  = 8 * 60 * 1000L;

  private MediaPlayer player;
  private PowerManager.WakeLock wake;
  private AudioManager audio;
  private AudioFocusRequest focusReq;
  private AudioManager.OnAudioFocusChangeListener focusLegacy;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private Runnable guard;

  @Override public IBinder onBind(Intent i) { return null; }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    String action = intent == null ? ACTION_PLAY : intent.getAction();

    if (ACTION_STOP.equals(action)) {
      stopEverything();
      return START_NOT_STICKY;
    }

    String name = intent == null ? "" : intent.getStringExtra(EXTRA_NAME);
    boolean fajr = intent != null && intent.getBooleanExtra(EXTRA_FAJR, false);
    if (name == null) name = "";

    /* لا بدّ من startForeground خلال خمسِ ثوانٍ من بدء الخدمة وإلّا قتَلها النظام.
       فنُقدّمه على كلّ شيء، قبل المُشغِّل وقبل قفلِ الاستيقاظ. */
    Notification n = buildNotification(name, fajr);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
    } else {
      startForeground(NOTIF_ID, n);
    }

    // أذانٌ يعمل بالفعل: لا نَبدأ فوقه أذانًا آخر
    if (player != null && player.isPlaying()) return START_NOT_STICKY;

    acquireWake();
    requestFocus();
    play();

    guard = new Runnable() { @Override public void run() { stopEverything(); } };
    handler.postDelayed(guard, MAX_MS);
    return START_NOT_STICKY;
  }

  /* ===== الإشعار المصاحب ===== */

  private Notification buildNotification(String name, boolean fajr) {
    ensureChannel();

    Intent open = new Intent(this, MainActivity.class)
        .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    Intent stop = new Intent(this, AdhanService.class).setAction(ACTION_STOP);

    int f = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) f |= PendingIntent.FLAG_IMMUTABLE;
    PendingIntent piOpen = PendingIntent.getActivity(this, 1, open, f);
    PendingIntent piStop = PendingIntent.getService(this, 2, stop, f);

    String title = name.isEmpty() ? "الأذان" : ("حان وقتُ صلاة " + name);
    String body  = fajr ? "الصلاةُ خيرٌ من النوم" : "حيَّ على الصلاة · حيَّ على الفلاح";

    Notification.Builder b = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        ? new Notification.Builder(this, CHANNEL)
        : new Notification.Builder(this);

    b.setContentTitle(title)
     .setContentText(body)
     .setSmallIcon(getResources().getIdentifier("ic_stat_icon", "drawable", getPackageName()) != 0
         ? getResources().getIdentifier("ic_stat_icon", "drawable", getPackageName())
         : android.R.drawable.ic_lock_idle_alarm)
     .setContentIntent(piOpen)
     .setOngoing(true)
     .setAutoCancel(false)
     .addAction(0, "إيقاف", piStop);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      b.setCategory(Notification.CATEGORY_ALARM);
      b.setVisibility(Notification.VISIBILITY_PUBLIC);
    }
    return b.build();
  }

  private void ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
    /* أهمّيّةٌ منخفضة عن قصد: الصوتُ يأتي من المُشغِّل لا من الإشعار، فلو رفعناها
       صدَحت نغمةُ الإشعار فوق الأذان. */
    NotificationChannel ch = new NotificationChannel(CHANNEL, "رفعُ الأذان",
        NotificationManager.IMPORTANCE_LOW);
    ch.setDescription("الإشعارُ المصاحبُ للأذان أثناء رفعه، وفيه زرُّ الإيقاف");
    ch.setSound(null, null);
    ch.enableVibration(false);
    ch.setShowBadge(false);
    nm.createNotificationChannel(ch);
  }

  /* ===== التشغيل ===== */

  private void play() {
    int res = getResources().getIdentifier("adhan_wadee", "raw", getPackageName());
    if (res == 0) { stopEverything(); return; }   // لا ملفَّ صوت: لا نُبقي الخدمةَ عالقة
    /* نبني المُشغِّلَ يدويًّا ولا نستعمل MediaPlayer.create: تلك تُحضِّر الملفَّ
       فورًا، وضبطُ خصائصِ الصوت بعد التحضير يرمي IllegalStateException. وضبطُها
       قبلَه هو ما يجعل الأذانَ يخرج على مسار المنبّه لا على مسار الوسائط. */
    AssetFileDescriptor afd = null;
    try {
      player = new MediaPlayer();
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        player.setAudioAttributes(new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build());
      } else {
        player.setAudioStreamType(AudioManager.STREAM_ALARM);
      }
      afd = getResources().openRawResourceFd(res);
      if (afd == null) { stopEverything(); return; }
      player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
      player.setLooping(false);
      player.setOnCompletionListener(mp -> stopEverything());
      player.setOnErrorListener((mp, what, extra) -> { stopEverything(); return true; });
      player.setOnPreparedListener(MediaPlayer::start);
      player.prepareAsync();
    } catch (Exception e) {
      stopEverything();
    } finally {
      if (afd != null) { try { afd.close(); } catch (Exception ignored) {} }
    }
  }

  private void requestFocus() {
    audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
    if (audio == null) return;
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        focusReq = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build())
            .setOnAudioFocusChangeListener(change -> {})
            .build();
        audio.requestAudioFocus(focusReq);
      } else {
        focusLegacy = change -> {};
        audio.requestAudioFocus(focusLegacy, AudioManager.STREAM_ALARM,
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
      }
    } catch (Exception ignored) {}
  }

  private void acquireWake() {
    try {
      PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
      if (pm == null) return;
      wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "salaty:adhan");
      wake.setReferenceCounted(false);
      wake.acquire(MAX_MS);
    } catch (Exception ignored) {}
  }

  /* ===== الإنهاء ===== */

  private void stopEverything() {
    if (guard != null) { handler.removeCallbacks(guard); guard = null; }
    try { if (player != null) { if (player.isPlaying()) player.stop(); player.release(); } } catch (Exception ignored) {}
    player = null;
    try {
      if (audio != null) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          if (focusReq != null) audio.abandonAudioFocusRequest(focusReq);
        } else if (focusLegacy != null) {
          audio.abandonAudioFocus(focusLegacy);
        }
      }
    } catch (Exception ignored) {}
    focusReq = null; focusLegacy = null;
    try { if (wake != null && wake.isHeld()) wake.release(); } catch (Exception ignored) {}
    wake = null;

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(Service.STOP_FOREGROUND_REMOVE);
    } else {
      stopForeground(true);
    }
    stopSelf();
  }

  @Override
  public void onDestroy() {
    stopEverything();
    super.onDestroy();
  }
}
