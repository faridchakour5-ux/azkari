package app.salaty.twa;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * يُعيد تسليحَ الأذان بعد إعادة تشغيل الهاتف، وبعد تحديث التطبيق، وبعد تغيّر
 * الساعة أو المنطقة الزمنيّة.
 *
 * <p>منبّهاتُ أندرويد تُمحى كلُّها عند إعادة التشغيل. فلولا هذا المُستقبِل لصمَت
 * الأذانُ حتّى يَفتح المستخدمُ التطبيقَ مرّةً أخرى — وقد لا يَفتحه أيّامًا.</p>
 */
public class BootReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    try { AdhanScheduler.arm(context.getApplicationContext()); } catch (Exception ignored) {}
  }
}
