import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { useAppStore } from '../../src/store/useAppStore';
import { api } from '../../src/services/api';

export default function OrganizerStatsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { organizerEvents } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalEventsCreated: 0,
    eventsHosted: 0,
    upcomingEvents: 0,
    totalParticipants: 0,
    attendanceRate: 0,
    ratingAvg: 0,
    ratingCount: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getOrganizerStats();
      setStats({
        totalEventsCreated: data.totalEventsCreated || 0,
        eventsHosted: data.eventsHosted || 0,
        upcomingEvents: data.upcomingEvents || 0,
        totalParticipants: data.totalParticipants || 0,
        attendanceRate: data.attendanceRate || 0,
        ratingAvg: data.ratingAvg || 0,
        ratingCount: data.ratingCount || 0,
      });
    } catch (e) {
      console.error('Failed to load stats:', e);
      // Fallback to local calculation
      const now = new Date();
      setStats({
        totalEventsCreated: organizerEvents.length,
        eventsHosted: organizerEvents.filter(e => e.status === 'finished' || new Date(e.startAt) < now).length,
        upcomingEvents: organizerEvents.filter(e => (e.status === 'approved' || e.status === 'pending') && new Date(e.startAt) >= now).length,
        totalParticipants: organizerEvents.reduce((sum, e) => sum + e.participantsJoinedCount, 0),
        attendanceRate: 0,
        ratingAvg: 0,
        ratingCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    title: {
      flex: 1,
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
      gap: spacing.md,
    },
    statCard: {
      width: '47%',
      backgroundColor: colors.white,
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
      borderRadius: borderRadius.lg,
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
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    statChange: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      marginTop: spacing.xs,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    ratingStars: {
      flexDirection: 'row',
      gap: 2,
    },
    ratingCount: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xxl * 2,
    },
    emptyEmoji: {
      fontSize: 64,
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: fontSize.xl,
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner fullScreen text="Загрузка статистики..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Статистика</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
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
                <Ionicons name="people" size={20} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>{stats.totalParticipants}</Text>
              <Text style={styles.statLabel}>Участников</Text>
            </View>
          </View>
        </View>

        {/* Attendance Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Посещаемость</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardWide]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.statValue}>{stats.attendanceRate}%</Text>
                  <Text style={styles.statLabel}>Доходимость</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: colors.successLight || colors.primaryLight }]}>
                  <Ionicons name="trending-up" size={20} color={colors.success} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Рейтинг</Text>
          <View style={[styles.statCard, styles.statCardWide]}>
            <View style={styles.ratingRow}>
              <Text style={styles.statValue}>{stats.ratingAvg}</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= Math.floor(stats.ratingAvg) ? 'star' : 'star-outline'}
                    size={20}
                    color={colors.warning}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.ratingCount}>На основе {stats.ratingCount} отзывов</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
