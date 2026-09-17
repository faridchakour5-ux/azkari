package app.salaty.twa;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // التسجيلُ قبل super.onCreate شرطٌ في Capacitor: بعده لا يَرى الجسرُ الملحقَ
    registerPlugin(AdhanPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
