import Constants from 'expo-constants';
import type { ComponentType } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';

export type YamapModule = {
  default: ComponentType<Record<string, unknown>>;
  Marker: ComponentType<Record<string, unknown>>;
  YamapInstance?: {
    init: (key: string) => void | Promise<void>;
  };
  /** @deprecated legacy package export */
  init?: (key: string) => void;
};

export function getYandexMapKitApiKey(): string {
  const key =
    (Constants.expoConfig?.extra as { yandexMapKitApiKey?: string } | undefined)?.yandexMapKitApiKey ||
    (Constants.manifest2 as { extra?: { expoClient?: { extra?: { yandexMapKitApiKey?: string } } } })
      ?.extra?.expoClient?.extra?.yandexMapKitApiKey ||
    '';
  return typeof key === 'string' ? key.trim() : '';
}

/**
 * TestFlight isolation (build 17+): bare Yamap without Marker when unset.
 * Set EXPO_PUBLIC_ENABLE_YANDEX_MAP_MARKERS=1 in EAS to re-enable markers on the event screen.
 */
export function isYandexEventMapMarkersEnabled(): boolean {
  const v = process.env.EXPO_PUBLIC_ENABLE_YANDEX_MAP_MARKERS;
  return v === '1' || v === 'true';
}

export function hasResolvableMarkerSource(
  source: ImageSourcePropType | null | undefined,
): boolean {
  if (!source) return false;
  try {
    const resolved = Image.resolveAssetSource(source);
    return Boolean(resolved?.uri);
  } catch {
    return false;
  }
}

export function loadYamapModule(): YamapModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-yamap-plus') as YamapModule;
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('react-native-yamap') as YamapModule;
    } catch {
      return null;
    }
  }
}

export function initYamapInstance(apiKey: string): void {
  const trimmed = apiKey.trim();
  if (!trimmed) return;

  const mapModule = loadYamapModule();
  if (!mapModule) return;

  try {
    if (mapModule.YamapInstance && typeof mapModule.YamapInstance.init === 'function') {
      mapModule.YamapInstance.init(trimmed);
      return;
    }
    if (typeof mapModule.init === 'function') {
      mapModule.init(trimmed);
    }
  } catch {
    // MapKit may already be initialized from AppDelegate or a prior call.
  }
}
