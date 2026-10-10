package app.salaty.twa;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // التسجيلُ قبل super.onCreate شرطٌ في Capacitor: بعده لا يَرى الجسرُ الملحقَ
    registerPlugin(AdhanPlugin.class);
    super.onCreate(savedInstanceState);
    // من الحافّة إلى الحافّة في كلّ الإصدارات (هو الافتراضيّ إلزامًا من أندرويد 15):
    // الأشرطةُ شفّافة، وملحقُ SystemBars في Capacitor يمرّر المساحاتِ الآمنة إلى
    // الصفحة فتقرؤها بـ env(safe-area-inset-*) — أو يحشو حولها في WebView القديم.
    EdgeToEdge.enable(this);
  }
}
