package com.openhrapp;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();

            // Core WebView settings
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);

            // Enable camera and media access in WebView
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);

            // Enable geolocation
            settings.setGeolocationEnabled(true);

            // Enable password saving / autofill
            settings.setSaveFormData(true);
            settings.setSavePassword(true);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Fix blank white screen when Android kills the WebView while backgrounded.
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            String currentUrl = webView.getUrl();
            if (currentUrl == null || currentUrl.equals("about:blank") || currentUrl.isEmpty()) {
                webView.loadUrl("file:///android_asset/public/index.html");
            }
        } else {
            recreate();
        }
    }
}
