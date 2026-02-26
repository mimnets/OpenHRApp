import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.openhrapp',
  appName: 'Open HR App',
  webDir: 'dist',
  server: {
    url: 'https://openhrapp.com',
    cleartext: false,
  },
  android: {
    // Fix blank white screen when app is reopened after being backgrounded
    webContentsDebuggingEnabled: false,
  },
};

export default config;
