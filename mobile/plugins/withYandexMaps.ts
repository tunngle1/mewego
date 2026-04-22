import { withAppDelegate, withMainApplication, type ConfigPlugin } from 'expo/config-plugins';

const withYandexMaps: ConfigPlugin = (config) => {
  config = withAppDelegate(config, async (config) => {
    const appDelegate = config.modResults;
    const apiKey = String(config.extra?.yandexMapKitApiKey || '').trim();

    if (!apiKey) {
      return config;
    }

    if (!appDelegate.contents.includes('#import <YandexMapsMobile/YMKMapKitFactory.h>')) {
      appDelegate.contents = appDelegate.contents.replace(
        /#import "AppDelegate\.h"/g,
        `#import "AppDelegate.h"\n#import <YandexMapsMobile/YMKMapKitFactory.h>`
      );
    }

    const mapKitMethodInvocations = [
      `[YMKMapKit setApiKey:@"${apiKey}"];`,
      `[YMKMapKit setLocale:@"ru_RU"];`,
      `[YMKMapKit mapKit];`,
    ]
      .map((line) => `\t${line}`)
      .join('\n');

    if (!appDelegate.contents.includes(mapKitMethodInvocations)) {
      appDelegate.contents = appDelegate.contents.replace(
        /\s+return YES;/g,
        `\n\n${mapKitMethodInvocations}\n\n\treturn YES;`
      );
    }

    return config;
  });

  config = withMainApplication(config, async (config) => {
    const apiKey = String(config.extra?.yandexMapKitApiKey || '').trim();
    if (!apiKey) return config;

    const mainApplication = config.modResults;
    let contents = mainApplication.contents;

    const reflectionLine = `Class.forName("com.yandex.mapkit.MapKitFactory")`;
    const apiKeyMarker = `method.invoke(null, "${apiKey}")`;
    if (!contents.includes(apiKeyMarker)) {
      contents = contents.replace(
        /override fun onCreate\(\) \{\s*\n\s*super\.onCreate\(\)\s*\n/g,
        (m) =>
          `${m}    // Must be called before any MapKit usage (MapView may be preallocated by Fabric).\n` +
          `    runCatching {\n` +
          `      val clazz = ${reflectionLine}\n` +
          `      val method = clazz.getMethod("setApiKey", String::class.java)\n` +
          `      ${apiKeyMarker}\n` +
          `    }\n`
      );
    }

    mainApplication.contents = contents;
    return config;
  });

  return config;
};

export default withYandexMaps;
