import { withAppDelegate, type ConfigPlugin } from 'expo/config-plugins';

const withYandexMaps: ConfigPlugin = (config) => {
  return withAppDelegate(config, async (config) => {
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
};

export default withYandexMaps;
