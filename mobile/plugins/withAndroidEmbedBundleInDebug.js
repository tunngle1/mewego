const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'mewego-embed-bundle-in-debug';

/**
 * RN treats `debug` as a "debuggable" variant and skips embedding the JS bundle
 * (expects Metro on :8081). Standalone `app-debug.apk` then shows "Unable to load script".
 * Empty list = bundle is embedded for debug too (testers, Charles without a dev machine).
 */
module.exports = function withAndroidEmbedBundleInDebug(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER)) return cfg;

    const injected = `react {
    /* ${MARKER} */
    debuggableVariants = []

`;
    if (!contents.includes('react {')) return cfg;
    contents = contents.replace(/^react\s*\{\s*\n/m, injected);
    cfg.modResults.contents = contents;
    return cfg;
  });
};
