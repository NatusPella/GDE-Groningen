package nl.natuspella.gde.groningen;

import android.os.Bundle;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.view.View;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

// Volledig scherm, liggend (manifest), scherm blijft aan tijdens het spelen.
// De terugknop loopt via @capacitor/app naar android-bridge.js (pauzemenu).
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
        // Het renderproces sneuvelt op een toestel met weinig geheugen (OOM) of door een driverfout; zonder
        // dit sluit Android de hele app. Nu start de activiteit opnieuw (de speler komt op het startscherm,
        // 'Doorgaan' laadt de laatste spelstand) en staat de reden in logcat (tag GDE).
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                Log.w("GDE", "renderproces weg, didCrash=" + detail.didCrash() + (detail.didCrash() ? " (crash)" : " (door Android beeindigd, geheugen)"));
                runOnUiThread(() -> recreate());
                return true;
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        View decor = getWindow().getDecorView();
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), decor);
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }
}
