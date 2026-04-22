import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/useAppStore';
import { api } from '../../src/services/api';
import { useTheme } from '../../src/contexts/ThemeContext';
import {
  AdminAnalyticsCategoriesResponse,
  AdminAnalyticsOverview,
  AdminAnalyticsTopEventsResponse,
  AdminAnalyticsTimeseriesResponse,
  AdminAnalyticsRange,
  AdminAnalyticsTimeseriesMetric,
} from '../../src/types';

const RANGE_OPTIONS: Array<{ label: string; value: AdminAnalyticsRange }> = [
  { label: '7д', value: '7d' },
  { label: '30д', value: '30d' },
  { label: '90д', value: '90d' },
  { label: 'Все', value: 'all' },
];

const METRIC_OPTIONS: Array<{ label: string; value: AdminAnalyticsTimeseriesMetric }> = [
  { label: 'Записи', value: 'joined' },
  { label: 'Посещения', value: 'attended' },
  { label: 'Отзывы', value: 'reviews' },
  { label: 'Позитив', value: 'positive_reviews' },
];

const formatNumber = (n: number) => {
  try {
    return new Intl.NumberFormat('ru-RU').format(n);
  } catch {
    return String(n);
  }
};

const formatMoney = (n: number) => `${formatNumber(Math.round(n))} ₽`;

const METRIC_HINT: Record<AdminAnalyticsTimeseriesMetric, string> = {
  joined: 'Количество новых записей на события по дням.',
  attended: 'Количество подтверждённых посещений по дням.',
  reviews: 'Количество оставленных отзывов по дням.',
  positive_reviews: 'Количество отзывов с оценкой 4–5 по дням.',
};

function MiniBarChart({
  items,
  styles,
}: {
  items: Array<{ date: string; value: number }>;
  styles: any;
}) {
  const max = useMemo(() => items.reduce((m, x) => (x.value > m ? x.value : m), 0), [items]);
  const shown = items.slice(-30);

  return (
    <View style={styles.chartWrap}>
      {shown.map((p) => {
        const h = max > 0 ? Math.max(2, Math.round((p.value / max) * 56)) : 2;
        return <View key={p.date} style={[styles.chartBar, { height: h }]} />;
      })}
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const isSuperAdmin = user?.role === 'superadmin';

  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const [range, setRange] = useState<AdminAnalyticsRange>('30d');
  const [metric, setMetric] = useState<AdminAnalyticsTimeseriesMetric>('joined');

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null);
  const [timeseries, setTimeseries] = useState<AdminAnalyticsTimeseriesResponse | null>(null);
  const [categories, setCategories] = useState<AdminAnalyticsCategoriesResponse | null>(null);
  const [topEvents, setTopEvents] = useState<AdminAnalyticsTopEventsResponse | null>(null);

  const fetchAll = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const [ov, ts, cats, tops] = await Promise.all([
        api.getAdminAnalyticsOverview({ range }),
        api.getAdminAnalyticsTimeseries({ range, metric }),
        api.getAdminAnalyticsCategories({ range }),
        api.getAdminAnalyticsTopEvents({ range }),
      ]);
      setOverview(ov);
      setTimeseries(ts);
      setCategories(cats);
      setTopEvents(tops);
    } catch (error) {
      console.error('[Analytics] fetchAll error:', error);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, range, metric]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (!isSuperAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Недоступно</Text>
          <Text style={styles.emptyText}>Раздел «Аналитика» доступен только суперадмину.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Аналитика</Text>
        <TouchableOpacity style={styles.searchButton} onPress={() => router.push('/admin-search')} activeOpacity={0.85}>
          <Text style={styles.searchButtonText}>Поиск</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.segment}>
          {RANGE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segmentItem, range === opt.value && styles.segmentItemActive]}
              onPress={() => setRange(opt.value)}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, range === opt.value && styles.segmentTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {loading && !overview ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : null}

        {/* Overview */}
        {overview ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Общая статистика</Text>
            <Text style={styles.sectionDesc}>Сводка по приложению за выбранный период.</Text>
            <View style={styles.grid}>
              <View style={styles.cardHalf}>
                <Text style={styles.cardLabel}>Событий (всего)</Text>
                <Text style={styles.cardValue}>{formatNumber(overview.events.total)}</Text>
                <Text style={styles.cardHint}>Создано за период: {formatNumber(overview.events.createdInRange)}</Text>
              </View>
              <View style={styles.cardHalf}>
                <Text style={styles.cardLabel}>Записей</Text>
                <Text style={styles.cardValue}>{formatNumber(overview.participations.joined)}</Text>
                <Text style={styles.cardHint}>Посещений: {formatNumber(overview.participations.attended)}</Text>
              </View>
              <View style={styles.cardHalf}>
                <Text style={styles.cardLabel}>Отзывы</Text>
                <Text style={styles.cardValue}>{formatNumber(overview.reviews.total)}</Text>
                <Text style={styles.cardHint}>Средняя оценка: {overview.reviews.avgRating.toFixed(2)}</Text>
              </View>
              <View style={styles.cardHalf}>
                <Text style={styles.cardLabel}>Доход (оценочно)</Text>
                <Text style={styles.cardValue}>{formatMoney(overview.revenue.eventsEstimated)}</Text>
                <Text style={styles.cardHint}>Подписки: {formatMoney(overview.revenue.subscriptions)}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Тренды (по дням)</Text>
          <Text style={styles.sectionDesc}>График показывает динамику выбранной метрики по дням.</Text>
          <View style={[styles.cardFull, { paddingBottom: spacing.md }]}
          >
            <View style={styles.metricRow}>
              {METRIC_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.metricChip, metric === opt.value && styles.metricChipActive]}
                  onPress={() => setMetric(opt.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.metricChipText, metric === opt.value && styles.metricChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {timeseries ? (
              <MiniBarChart items={timeseries.items} styles={styles} />
            ) : (
              <ActivityIndicator color={colors.accent} />
            )}
            <View style={styles.chartHelp}>
              <Text style={styles.chartHelpTitle}>Как читать график</Text>
              <Text style={styles.chartHelpText}>
                {METRIC_HINT[metric]} Столбик = значение за день. Показываем последние 30 точек выбранного периода.
              </Text>
            </View>
          </View>
        </View>

        {/* Categories */}
        {categories ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Популярные категории</Text>
            <Text style={styles.sectionDesc}>Топ категорий по количеству записей за период.</Text>
            <View style={styles.cardFull}>
              {categories.items.slice(0, 10).map((c) => (
                <View key={c.movementType} style={styles.row}>
                  <Text style={styles.rowLeft}>{c.movementType}</Text>
                  <Text style={styles.rowRight}>{formatNumber(c.joined)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Top events */}
        {topEvents ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Топ событий</Text>
            <Text style={styles.sectionDesc}>Список можно нажимать — откроется карточка события.</Text>
            <View style={styles.cardFull}>
              {topEvents.items.slice(0, 15).map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={styles.topEvent}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/event/${e.id}`)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topEventTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.topEventMeta} numberOfLines={1}>
                      {e.movementType} • посещений {formatNumber(e.attended)} • записей {formatNumber(e.joined)}
                    </Text>
                    <Text style={styles.topEventMeta} numberOfLines={1}>
                      отзывы {formatNumber(e.reviews)} • ср. {e.avgRating.toFixed(2)} • позитив {Math.round(e.positiveShare * 100)}%
                    </Text>
                  </View>
                  <Text style={styles.topEventMoney}>{formatMoney(e.revenueEstimated)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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
) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.sm,
  },
  searchButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  filtersRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    overflow: 'hidden',
    ...shadows.xs,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  segmentTextActive: {
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionDesc: {
    marginTop: -2,
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardBase: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.sm,
  },
  cardHalf: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.sm,
    flexGrow: 1,
    flexBasis: '48%',
  },
  cardFull: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.sm,
  },
  cardLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  cardHint: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  metricChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    backgroundColor: colors.white,
  },
  metricChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  metricChipText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
  },
  metricChipTextActive: {
    color: colors.white,
  },
  chartHelp: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutralMuted,
  },
  chartHelpTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  chartHelpText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 18,
  },
  chartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 64,
  },
  chartBar: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 3,
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutralMuted,
  },
  rowLeft: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  rowRight: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  topEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutralMuted,
  },
  topEventTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  topEventMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  topEventMoney: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
