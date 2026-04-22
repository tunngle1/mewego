import type { ExpoConfig } from '@expo/config-types';

const base = require('./app.json');

const config: ExpoConfig = {
  ...(base.expo as ExpoConfig),
  ios: {
    ...(((base.expo && base.expo.ios) as Record<string, unknown>) || {}),
    infoPlist: {
      ...((((base.expo && base.expo.ios && (base.expo.ios as any).infoPlist) as Record<string, unknown>) || {})),
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    ...(((base.expo && base.expo.plugins) as any[]) || []),
  ],
  extra: {
    ...(((base.expo && base.expo.extra) as Record<string, unknown>) || {}),
    yandexMapKitApiKey: process.env.YANDEX_MAPKIT_API_KEY || '',
  },
};

export default config;
