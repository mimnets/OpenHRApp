import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.openhrapp',
  appName: 'Open HR App',
  webDir: 'dist',
  server: {
    url: 'https://openhrapp.com',
    cleartext: false,
  },
};

export default config;
