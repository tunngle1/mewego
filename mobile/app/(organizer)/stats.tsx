import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { OrganizerStats } from '../../src/types';

const MOCK_STATS: OrganizerStats = {
  totalEventsCreated: 45,
  eventsHosted: 38,
  upcomingEvents: 7,
  totalParticipants: 1240,
  attendanceRate: 87,
  noShowRate: 8,
  repeatAttendeesCount: 156,
  ratingAvg: 4.8,
  ratingCount: 47,
};

export default function OrganizerStatsScreen() {
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    // TODO: Replace with real API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setStats(MOCK_STATS);
  };

  useEffect(() => {
    fetchStats().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMuted,
    },
    headerTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl * 2,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    statCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      ...shadows.sm,
    },
    statCardWide: {
      width: '100%',
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    statValue: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    statLabel: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    statSubtext: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    progressBarContainer: {
      marginTop: spacing.md,
    },
    progressBarLabel: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    progressBarLabelText: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    progressBarLabelValue: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.surfaceMuted,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: borderRadius.full,
    },
    tipCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    tipContent: {
      flex: 1,
    },
    tipTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    tipText: {
      fontSize: fontSize.xs,
      color: colors.textLight,
      lineHeight: 18,
    },
  });

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Статистика</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textMuted }}>Не удалось загрузить статистику</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Статистика</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Events Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>События</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats.totalEventsCreated}</Text>
              <Text style={styles.statLabel}>Всего создано</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.successLight || colors.primaryLight }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <Text style={styles.statValue}>{stats.eventsHosted}</Text>
              <Text style={styles.statLabel}>Проведено</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.accentLight || colors.primaryLight }]}>
                <Ionicons name="time" size={20} color={colors.accent} />
              </View>
              <Text style={styles.statValue}>{stats.upcomingEvents}</Text>
              <Text style={styles.statLabel}>Предстоящих</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.warningLight || colors.primaryLight }]}>
                <Ionicons name="star" size={20} color={colors.warning} />
              </View>
              <View style={styles.ratingRow}>
                <Text style={styles.statValue}>{stats.ratingAvg}</Text>
                <Ionicons name="star" size={16} color={colors.warning} />
              </View>
              <Text style={styles.statLabel}>{stats.ratingCount} отзывов</Text>
            </View>
          </View>
        </View>

        {/* Participants Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Участники</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardWide]}>
              <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats.totalParticipants}</Text>
              <Text style={styles.statLabel}>Всего участников</Text>
              <Text style={styles.statSubtext}>
                Из них {stats.repeatAttendeesCount} вернулись повторно
              </Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.statCardWide, { marginTop: spacing.sm }]}>
            <Text style={[styles.statLabel, { marginBottom: spacing.md }]}>Посещаемость</Text>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarLabel}>
                <Text style={styles.progressBarLabelText}>Пришли</Text>
                <Text style={styles.progressBarLabelValue}>{stats.attendanceRate}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${stats.attendanceRate}%`, backgroundColor: colors.success },
                  ]}
                />
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarLabel}>
                <Text style={styles.progressBarLabelText}>Не пришли</Text>
                <Text style={styles.progressBarLabelValue}>{stats.noShowRate}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${stats.noShowRate}%`, backgroundColor: colors.error },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={24} color={colors.primary} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Совет</Text>
              <Text style={styles.tipText}>
                Ваш показатель возвращаемости ({Math.round((stats.repeatAttendeesCount / stats.totalParticipants) * 100)}%) 
                выше среднего! Продолжайте создавать качественные события.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
