import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.openhrapp',
  appName: 'Open HR App',
  webDir: 'dist',
  android: {
    webContentsDebuggingEnabled: false,
  },
};

export default config;
