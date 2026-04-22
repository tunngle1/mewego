import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAppStore } from '../src/store/useAppStore';
import { EventCard } from '../src/components/EventCard';
import { EmptyState } from '../src/components/ui/EmptyState';
import { CancelBookingModal } from '../src/components/CancelBookingModal';
import { Booking, EventIntensity } from '../src/types';
import { CATEGORY_LABELS } from '../src/constants';

type PriceFilter = 'all' | 'free' | 'paid';
type DateRangeFilter = 'all' | 'today' | 'week' | 'month';

const INTENSITY_OPTIONS: Array<{ value: EventIntensity; label: string }> = [
  { value: 'мягко', label: 'Низкая' },
  { value: 'средне', label: 'Средняя' },
  { value: 'активно', label: 'Высокая' },
];

export default function AllEventsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { 
    events, 
    selectEvent, 
    getActiveBookingForEvent, 
    cancelBooking,
    fetchEvents,
    eventsLoading,
    eventsError,
  } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);

  const [query, setQuery] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);

  const [intensity, setIntensity] = useState<EventIntensity | null>(null);
  const [price, setPrice] = useState<PriceFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const parseEventDateTime = (dateStr: string, timeStr: string): number => {
    const now = new Date();
    const [h, m] = timeStr.split(':').map((v) => Number(v));

    if (dateStr.toLowerCase() === 'завтра') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(h || 0, m || 0, 0, 0);
      return d.getTime();
    }

    if (dateStr.toLowerCase() === 'сегодня') {
      const d = new Date(now);
      d.setHours(h || 0, m || 0, 0, 0);
      return d.getTime();
    }

    const match = dateStr.match(/^(\d{1,2})\s+([А-Яа-я]+)/);
    if (match) {
      const day = Number(match[1]);
      const monthName = match[2].toLowerCase();
      const months: Record<string, number> = {
        января: 0,
        февраля: 1,
        марта: 2,
        апреля: 3,
        мая: 4,
        июня: 5,
        июля: 6,
        августа: 7,
        сентября: 8,
        октября: 9,
        ноября: 10,
        декабря: 11,
      };
      const month = months[monthName];
      if (month !== undefined) {
        const d = new Date(now.getFullYear(), month, day, h || 0, m || 0, 0, 0);
        return d.getTime();
      }
    }

    return Number.MAX_SAFE_INTEGER;
  };

  const handleBack = () => router.back();

  const handleEventPress = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event) {
      selectEvent(event);
      router.push(`/event/${eventId}`);
    }
  };

  const handleOpenCancelModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = (reason: string, comment?: string) => {
    if (!selectedBooking) return;
    cancelBooking(selectedBooking.id, reason, comment);
    setCancelModalVisible(false);
    setSelectedBooking(null);
  };

  const resetFilters = () => {
    setIntensity(null);
    setPrice('all');
    setDateRange('all');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const nowTs = now.getTime();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const weekEnd = new Date(startOfToday);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const monthEnd = new Date(startOfToday);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    return [...events]
      .filter((e) => {
        const ts = parseEventDateTime(e.date, e.time);
        const inFuture = ts >= nowTs || ts === Number.MAX_SAFE_INTEGER;
        return inFuture;
      })
      .filter((e) => {
        if (!q) return true;
        const categoryLabel =
          CATEGORY_LABELS[e.category as keyof typeof CATEGORY_LABELS] || e.category;
        const haystack = [
          e.title,
          e.description,
          e.location?.name,
          e.location?.address,
          e.instructor?.name,
          categoryLabel,
          ...(e.vibe || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .filter((e) => {
        if (!intensity) return true;
        return e.intensity === intensity;
      })
      .filter((e) => {
        if (price === 'all') return true;
        if (price === 'free') return e.isFree;
        return !e.isFree;
      })
      .filter((e) => {
        if (dateRange === 'all') return true;
        const ts = parseEventDateTime(e.date, e.time);
        if (ts === Number.MAX_SAFE_INTEGER) return true;
        if (dateRange === 'today') {
          return ts >= startOfToday.getTime() && ts < startOfToday.getTime() + 24 * 60 * 60 * 1000;
        }
        if (dateRange === 'week') {
          return ts >= startOfToday.getTime() && ts < weekEnd.getTime();
        }
        return ts >= startOfToday.getTime() && ts < monthEnd.getTime();
      })
      .sort(
        (a, b) =>
          parseEventDateTime(a.date, a.time) - parseEventDateTime(b.date, b.time)
      );
  }, [events, query, intensity, price, dateRange]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMuted,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    backIcon: {
      fontSize: fontSize.xl,
      color: colors.text,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    headerRight: {
      width: 40,
      height: 40,
    },
    controls: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    searchInput: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      fontSize: fontSize.md,
      color: colors.text,
    },
    filterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    filterButton: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    filterButtonText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    resetButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    resetButtonText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.background,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.neutralMuted,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    groupTitle: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      letterSpacing: 1.5,
    },
    optionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    optionChip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      backgroundColor: colors.white,
    },
    optionChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    optionText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      backgroundColor: colors.white,
    },
    modalButtonPrimary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    modalButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    modalButtonTextPrimary: {
      color: colors.white,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Все события</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.controls}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFiltersVisible(true)}
          >
            <Text style={styles.filterButtonText}>Фильтры</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>Сбросить</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔎"
          title="Ничего не найдено"
          description="Попробуйте изменить запрос или фильтры"
          actionLabel="Сбросить фильтры"
          onAction={resetFilters}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {filtered.map((event) => {
            const activeBooking = getActiveBookingForEvent(event.id);
            return (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => handleEventPress(event.id)}
                variant="full"
                isBooked={!!activeBooking}
                onCancelBooking={
                  activeBooking
                    ? () => handleOpenCancelModal(activeBooking)
                    : undefined
                }
              />
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={filtersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setFiltersVisible(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Фильтры</Text>

            <Text style={styles.groupTitle}>ИНТЕНСИВНОСТЬ</Text>
            <View style={styles.optionRow}>
              {INTENSITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionChip,
                    intensity === opt.value && styles.optionChipActive,
                  ]}
                  onPress={() =>
                    setIntensity((prev) => (prev === opt.value ? null : opt.value))
                  }
                >
                  <Text style={styles.optionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.groupTitle}>ЦЕНА</Text>
            <View style={styles.optionRow}>
              {(
                [
                  { value: 'all' as const, label: 'Любая' },
                  { value: 'free' as const, label: 'Бесплатно' },
                  { value: 'paid' as const, label: 'Платно' },
                ]
              ).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionChip,
                    price === opt.value && styles.optionChipActive,
                  ]}
                  onPress={() => setPrice(opt.value)}
                >
                  <Text style={styles.optionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.groupTitle}>ДАТА</Text>
            <View style={styles.optionRow}>
              {(
                [
                  { value: 'all' as const, label: 'Любая' },
                  { value: 'today' as const, label: 'Сегодня' },
                  { value: 'week' as const, label: 'Неделя' },
                  { value: 'month' as const, label: 'Месяц' },
                ]
              ).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionChip,
                    dateRange === opt.value && styles.optionChipActive,
                  ]}
                  onPress={() => setDateRange(opt.value)}
                >
                  <Text style={styles.optionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={resetFilters}
              >
                <Text style={styles.modalButtonText}>Сбросить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => setFiltersVisible(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Применить
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CancelBookingModal
        visible={cancelModalVisible}
        onClose={() => {
          setCancelModalVisible(false);
          setSelectedBooking(null);
        }}
        onConfirm={handleConfirmCancel}
        eventTitle={selectedBooking?.event.title}
      />
    </SafeAreaView>
  );
}
