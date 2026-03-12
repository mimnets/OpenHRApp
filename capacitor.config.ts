import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.openhrapp',
  appName: 'Open HR App',
  webDir: 'dist',
  android: {
    webContentsDebuggingEnabled: false,
  },
  server: {
    // Use HTTPS scheme so Android autofill services (Google Password Manager,
    // Samsung Pass, etc.) trust the WebView origin for credential save/fill.
    // Default 'http://localhost' is ignored by most password managers.
    androidScheme: 'https',
  },
};

export default config;
