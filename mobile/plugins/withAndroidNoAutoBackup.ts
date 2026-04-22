import { AndroidConfig, withAndroidManifest, type ConfigPlugin } from 'expo/config-plugins';

/**
 * Отключает автобэкап Android: иначе после "удаления" и установки снова
 * подмешивается старое хранилище (AsyncStorage / zustand), и сессия как будто сохраняется.
 */
const withAndroidNoAutoBackup: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:allowBackup'] = 'false';
    return config;
  });
};

export default withAndroidNoAutoBackup;
