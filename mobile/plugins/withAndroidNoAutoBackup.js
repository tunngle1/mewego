const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/**
 * Disables Android auto-backup so uninstall truly clears app data (AsyncStorage / zustand).
 */
module.exports = function withAndroidNoAutoBackup(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:allowBackup'] = 'false';
    return config;
  });
};
