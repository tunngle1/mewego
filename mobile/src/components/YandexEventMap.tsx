import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import type { EventLocation } from '../types';
import {
  EVENT_MAP_MARKER_SCALE,
  loadMapMarkerSource,
} from '../utils/mapMarker';
import {
  getYandexMapKitApiKey,
  hasResolvableMarkerSource,
  initYamapInstance,
  isYandexEventMapMarkersEnabled,
  loadYamapModule,
} from '../utils/yamap';

type Props = {
  location: EventLocation;
  title?: string;
};

const hasFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const YandexEventMap: React.FC<Props> = ({ location, title }) => {
  const coords = location.coordinates;
  const latitude = coords?.latitude;
  const longitude = coords?.longitude;
  const canRenderMap = hasFiniteNumber(latitude) && hasFiniteNumber(longitude);
  const [markerSource, setMarkerSource] = useState<ImageSourcePropType | null>(null);

  const mapModule = useMemo(() => loadYamapModule(), []);
  const yandexKey = useMemo(() => getYandexMapKitApiKey(), []);

  useEffect(() => {
    if (yandexKey) {
      initYamapInstance(yandexKey);
    }
  }, [yandexKey]);

  useEffect(() => {
    if (!isYandexEventMapMarkersEnabled()) return;

    let cancelled = false;
    (async () => {
      const source = await loadMapMarkerSource();
      if (!cancelled) setMarkerSource(source);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showMarker =
    isYandexEventMapMarkersEnabled() && hasResolvableMarkerSource(markerSource);

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
          Карта доступна только в development/prod build с подключенным Yandex MapKit.
        </Text>
      </View>
    );
  }

  const Yamap = mapModule.default;
  const Marker = mapModule.Marker;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title || 'Локация на карте'}</Text>
      <View style={styles.mapWrap}>
        <Yamap
          style={styles.map}
          showZoomControls={false}
          interactiveDisabled={false}
          rotateGesturesDisabled={false}
          zoomGesturesDisabled={false}
          scrollGesturesDisabled={false}
          tiltGesturesDisabled={false}
          fastTapDisabled={Platform.OS === 'ios'}
          nightMode={false}
          initialRegion={{
            lat: latitude,
            lon: longitude,
            zoom: 14,
            azimuth: 0,
            tilt: 0,
          }}
        >
          {showMarker ? (
            <Marker
              key="event-marker"
              point={{ lat: latitude, lon: longitude }}
              anchor={{ x: 0.5, y: 1 }}
              handled={true}
              source={markerSource!}
              scale={EVENT_MAP_MARKER_SCALE}
            />
          ) : null}
        </Yamap>
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
