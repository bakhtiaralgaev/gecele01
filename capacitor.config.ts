import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'az.gecele.app',
  appName: 'gecele-app',
  webDir: 'public',
  server: {
    url: 'http://192.168.0.5:3050',
    cleartext: true
  }
};

export default config;