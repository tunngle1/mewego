import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import type { EventLocation } from '../types';

type Props = {
  location: EventLocation;
  title?: string;
};

const hasFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const EventMarkerVisual = () => (
  <View style={styles.markerWrap} collapsable={false}>
    <View style={styles.markerDot} />
  </View>
);

export const YandexEventMap: React.FC<Props> = ({ location, title }) => {
  const coords = location.coordinates;
  const latitude = coords?.latitude;
  const longitude = coords?.longitude;
  const canRenderMap = hasFiniteNumber(latitude) && hasFiniteNumber(longitude);

  const mapModule = useMemo(() => {
    try {
      // Native module is available only in dev/prod builds.
      // Keep runtime require to avoid crashing Expo Go or environments without the package.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('react-native-yamap-plus');
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('react-native-yamap');
      } catch {
        return null;
      }
    }
  }, []);

  useEffect(() => {
    if (!mapModule) return;
    const init = (mapModule as any).init;
    if (typeof init !== 'function') return;

    // Prefer non-public env injected via app config (works in native builds).
    const key =
      (Constants.expoConfig?.extra as any)?.yandexMapKitApiKey ||
      (Constants.manifest2 as any)?.extra?.expoClient?.extra?.yandexMapKitApiKey ||
      '';

    if (typeof key === 'string' && key.trim().length > 0) {
      try {
        init(key.trim());
      } catch {
        // ignore: init may throw if called twice depending on implementation
      }
    }
  }, [mapModule]);

  if (!canRenderMap) {
    return (
      <View style={[styles.card, styles.fallback]}>
        <Text style={styles.title}>{title || 'Локация на карте'}</Text>
        <Text style={styles.text}>Координаты для этой локации пока не заданы.</Text>
      </View>
    );
  }

  if (!mapModule?.default || !mapModule?.Marker) {
    return (
      <View style={[styles.card, styles.fallback]}>
        <Text style={styles.title}>{title || 'Локация на карте'}</Text>
        <Text style={styles.text}>
          Карта доступна только в development/prod build с подключенным Yandex MapKit (YaMap).
        </Text>
      </View>
    );
  }

  const YaMap = mapModule.default;
  const Marker = mapModule.Marker;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title || 'Локация на карте'}</Text>
      <View style={styles.mapWrap}>
        <YaMap
          style={styles.map}
          showZoomControls={false}
          interactiveDisabled={false}
          rotateGesturesDisabled={false}
          zoomGesturesDisabled={false}
          scrollGesturesDisabled={false}
          tiltGesturesDisabled={false}
          fastTapDisabled={false}
          nightMode={false}
          initialRegion={{
            lat: latitude,
            lon: longitude,
            zoom: 14,
            azimuth: 0,
            tilt: 0,
          }}
          userLocationIcon={Platform.OS === 'ios' ? undefined : undefined}
        >
          <Marker point={{ lat: latitude, lon: longitude }} anchor={{ x: 0.5, y: 0.5 }} handled={true}>
            <EventMarkerVisual />
          </Marker>
        </YaMap>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
  },
  mapWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: {
    width: '100%',
    height: 220,
  },
  markerWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E85D75',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  markerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  fallback: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
  },
});
