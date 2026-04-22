import React, { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAppStore } from '../src/store/useAppStore';
import { CATEGORY_LABELS, CATEGORY_SLUGS } from '../src/constants';
import type { Event } from '../src/types';
import Constants from 'expo-constants';

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; centerLat?: string; centerLng?: string }>();
  const mode = params.mode === 'pick' ? 'pick' : 'browse';

  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const events = useAppStore((s) => s.events);
  const fetchEvents = useAppStore((s) => s.fetchEvents);
  const eventsLoading = useAppStore((s) => s.eventsLoading);
  const pickedLocation = useAppStore((s) => s.pickedLocation);
  const setPickedLocation = useAppStore((s) => s.setPickedLocation);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<string | null>(null);
  const [pickCenter, setPickCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  const mapModule = useMemo(() => {
    try {
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

    const key =
      (Constants.expoConfig?.extra as any)?.yandexMapKitApiKey ||
      (Constants.manifest2 as any)?.extra?.expoClient?.extra?.yandexMapKitApiKey ||
      '';

    if (typeof key === 'string' && key.trim().length > 0) {
      try {
        init(key.trim());
      } catch {
        // ignore
      }
    }
  }, [mapModule]);

  useEffect(() => {
    if (mode !== 'browse') return;
    fetchEvents({
      ...(category ? { category } : {}),
      ...(intensity ? { intensity } : {}),
    }).catch(() => {});
  }, [fetchEvents, category, intensity]);

  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const eventsWithCoords = useMemo(() => {
    return (events || []).filter((e) => {
      const lat = e.location?.coordinates?.latitude;
      const lng = e.location?.coordinates?.longitude;
      return typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng);
    });
  }, [events]);

  const openInYandexMaps = async (e: Event) => {
    const lat = e.location.coordinates!.latitude;
    const lng = e.location.coordinates!.longitude;
    const url = `https://yandex.com/maps/?pt=${lng},${lat}&z=16&l=map`;
    await Linking.openURL(url);
  };

  const buildRouteInYandexMaps = async (e: Event) => {
    const lat = e.location.coordinates!.latitude;
    const lng = e.location.coordinates!.longitude;
    const url = `https://yandex.com/maps/?rtext=~${lng},${lat}&rtt=auto`;
    await Linking.openURL(url);
  };

  const renderChip = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  if (!mapModule?.default || !(mapModule as any).Marker) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Карта событий</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.center}>
          <Text style={styles.errorTitle}>Карта доступна только в APK/Dev build</Text>
          <Text style={styles.errorText}>
            В Expo Go Yandex MapKit не работает, потому что это нативный модуль.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const YaMap = mapModule.default;
  const Marker = (mapModule as any).Marker;
  const initial = eventsWithCoords[0]?.location.coordinates || { latitude: 55.751244, longitude: 37.618423 };

  const paramCenterLat = typeof params.centerLat === 'string' ? Number(params.centerLat) : NaN;
  const paramCenterLng = typeof params.centerLng === 'string' ? Number(params.centerLng) : NaN;
  const paramCenter =
    Number.isFinite(paramCenterLat) && Number.isFinite(paramCenterLng)
      ? { latitude: paramCenterLat, longitude: paramCenterLng }
      : null;

  const initialPick = pickCenter || pickedLocation || paramCenter || initial;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{mode === 'pick' ? 'Выбор точки' : 'Карта событий'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {mode === 'browse' ? (
        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {renderChip('Все', category === null, () => setCategory(null))}
            {CATEGORY_SLUGS.map((slug) => renderChip(CATEGORY_LABELS[slug], category === slug, () => setCategory(slug)))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {renderChip('Любая', intensity === null, () => setIntensity(null))}
            {renderChip('Мягко', intensity === 'relaxed', () => setIntensity('relaxed'))}
            {renderChip('Средне', intensity === 'medium', () => setIntensity('medium'))}
            {renderChip('Динамично', intensity === 'dynamic', () => setIntensity('dynamic'))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.mapWrap}>
        <YaMap
          style={styles.map}
          showZoomControls={false}
          rotateEnabled={false}
          zoomEnabled
          scrollEnabled
          nightMode={false}
          initialRegion={{
            lat: initialPick.latitude,
            lon: initialPick.longitude,
            zoom: mode === 'pick' ? 14 : 11,
            azimuth: 0,
            tilt: 0,
          }}
          // Not typed in our d.ts, but supported by YaMap libs.
          // Keep via `any` to capture center while user pans (for pick mode).
          {...(mode === 'pick'
            ? ({
                onCameraPositionChange: (region: any) => {
                  const lat = Number(region?.lat);
                  const lon = Number(region?.lon);
                  if (Number.isFinite(lat) && Number.isFinite(lon)) {
                    setPickCenter({ latitude: lat, longitude: lon });
                  }
                },
              } as any)
            : {})}
        >
          {mode === 'browse'
            ? eventsWithCoords.map((e) => {
                const p = e.location.coordinates!;
                return (
                  <Marker
                    key={e.id}
                    point={{ lat: p.latitude, lon: p.longitude }}
                    onPress={() => setSelectedEvent(e)}
                  />
                );
              })
            : null}

          {mode === 'pick' && (pickCenter || pickedLocation) ? (
            <Marker
              point={{
                lat: (pickCenter || pickedLocation)!.latitude,
                lon: (pickCenter || pickedLocation)!.longitude,
              }}
            />
          ) : null}
        </YaMap>
      </View>

      {mode === 'pick' ? (
        <View style={styles.bottomSheet} pointerEvents="box-none">
          <View style={styles.card}>
            <Text style={styles.hintTitle}>Выбор точки</Text>
            <Text style={styles.hintText}>
              Передвигайте карту — точка берётся из центра. Нажмите “Выбрать”, чтобы сохранить координаты.
            </Text>

            <View style={[styles.cardActions, { marginTop: 12 }]}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionPrimary]}
                onPress={() => {
                  const c = pickCenter || pickedLocation || initialPick;
                  setPickedLocation({ latitude: c.latitude, longitude: c.longitude });
                  router.back();
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.actionPrimaryText}>Выбрать эту точку</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionSecondary]}
                onPress={() => {
                  setPickedLocation(null);
                  setPickCenter(null);
                  router.back();
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.actionSecondaryText}>Отмена</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.meta}>
              {(pickCenter || pickedLocation)
                ? `${(pickCenter || pickedLocation)!.latitude.toFixed(6)}, ${(pickCenter || pickedLocation)!.longitude.toFixed(6)}`
                : 'Двигайте карту…'}
            </Text>
          </View>
        </View>
      ) : null}

      {mode === 'browse' ? (
        <View style={styles.bottomSheet} pointerEvents="box-none">
          {selectedEvent ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {selectedEvent.title}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={2}>
                    {selectedEvent.date} • {selectedEvent.time} • {selectedEvent.location.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedEvent(null)} style={styles.cardClose} activeOpacity={0.85}>
                  <Text style={styles.cardCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionPrimary]}
                  onPress={() => router.push(`/event/${selectedEvent.id}`)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.actionPrimaryText}>Открыть</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionSecondary]}
                  onPress={() => openInYandexMaps(selectedEvent)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.actionSecondaryText}>Яндекс.Карты</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionSecondary]}
                  onPress={() => buildRouteInYandexMaps(selectedEvent)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.actionSecondaryText}>Маршрут</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.meta}>
                {eventsLoading ? 'Загрузка событий…' : `Событий на карте: ${eventsWithCoords.length}`}
              </Text>
            </View>
          ) : (
            <View style={styles.hintCard}>
              <Text style={styles.hintTitle}>Тап по маркеру</Text>
              <Text style={styles.hintText}>Откроется карточка события и кнопки “Открыть / Маршрут”.</Text>
              <Text style={styles.meta}>
                {eventsLoading ? 'Загрузка событий…' : `Событий на карте: ${eventsWithCoords.length}`}
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (
  colors: any,
  spacing: any,
  fontSize: any,
  fontWeight: any,
  borderRadius: any,
  shadows: any
) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.full,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    backText: { fontSize: fontSize.xl, color: colors.text, includeFontPadding: false },
    title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    errorTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center' },
    errorText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },

    filters: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
    chipsRow: {
      gap: spacing.sm,
      paddingVertical: 6,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: borderRadius.full,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      ...shadows.xs,
    },
    chipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    chipTextActive: {
      color: colors.white,
    },

    mapWrap: {
      flex: 1,
      marginHorizontal: spacing.lg,
      borderRadius: borderRadius.xxl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      backgroundColor: colors.white,
      ...shadows.sm,
    },
    map: {
      width: '100%',
      height: '100%',
    },

    bottomSheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: spacing.lg,
      paddingBottom: spacing.lg,
    },
    hintCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      ...shadows.lg,
    },
    hintTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.black,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    hintText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      lineHeight: 20,
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      ...shadows.lg,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    cardTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    cardSub: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 18,
    },
    cardClose: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardCloseText: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      fontWeight: fontWeight.black,
    },
    cardActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    actionPrimary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    actionPrimaryText: {
      color: colors.white,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.black,
    },
    actionSecondary: {
      backgroundColor: colors.white,
      borderColor: colors.neutralMuted,
    },
    actionSecondaryText: {
      color: colors.text,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
    },
    meta: {
      marginTop: spacing.sm,
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
  });
