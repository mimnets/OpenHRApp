package com.openhrapp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onResume() {
        super.onResume();
        // Fix blank white screen when Android kills the WebView while backgrounded.
        // If the bridge or WebView was destroyed, reload the local bundled app.
        if (this.bridge != null && this.bridge.getWebView() != null) {
            String currentUrl = this.bridge.getWebView().getUrl();
            if (currentUrl == null || currentUrl.equals("about:blank") || currentUrl.isEmpty()) {
                this.bridge.getWebView().loadUrl("file:///android_asset/public/index.html");
            }
        }
    }
}
