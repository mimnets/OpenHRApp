package com.openhrapp;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Prevent WebView from being destroyed on low memory
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setDatabaseEnabled(true);
            webView.getSettings().setAllowFileAccess(true);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Fix blank white screen when Android kills the WebView while backgrounded.
        // Check multiple conditions that indicate the WebView lost its content.
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            String currentUrl = webView.getUrl();
            if (currentUrl == null || currentUrl.equals("about:blank") || currentUrl.isEmpty()) {
                // Reload the local bundled app
                webView.loadUrl("file:///android_asset/public/index.html");
            }
        } else {
            // Bridge or WebView was fully destroyed — restart the activity
            recreate();
        }
    }
}
