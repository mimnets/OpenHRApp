package com.openhrapp;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.autofill.AutofillManager;
import android.webkit.JavascriptInterface;
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

            // Enable autofill for password saving
            // Android 8.0+ (API 26+): use Autofill Framework
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
            }
            // Fallback for older devices
            settings.setSaveFormData(true);

            // Add JavaScript bridge for autofill commit
            webView.addJavascriptInterface(new AutofillBridge(), "AndroidAutofill");
        }
    }

    /**
     * JavaScript bridge to trigger Android Autofill "Save Password" prompt.
     *
     * Android's Autofill Framework only auto-prompts on real form navigation.
     * Since we use AJAX login (e.preventDefault), we must manually call
     * AutofillManager.commit() after successful login to trigger the prompt.
     *
     * Frontend calls: window.AndroidAutofill.commitAutofill()
     */
    private class AutofillBridge {
        @JavascriptInterface
        public void commitAutofill() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                runOnUiThread(() -> {
                    try {
                        AutofillManager afm = getSystemService(AutofillManager.class);
                        if (afm != null && afm.isEnabled()) {
                            afm.commit();
                        }
                    } catch (Exception e) {
                        // Silently ignore — autofill is best-effort
                    }
                });
            }
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
