import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hishabkhata.app',
  appName: 'ডিজিটাল হিসাব খাতা',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
