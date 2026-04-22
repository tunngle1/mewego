import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { Avatar } from '../../src/components/ui/Avatar';
import { api } from '../../src/services/api';
import { AdminStatsOverview } from '../../src/types';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function AdminDashboard() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const { 
    user, 
    logout, 
    getAdminPendingEvents, 
    getAdminOpenComplaints,
    getAdminPendingBanAppeals,
    fetchAdminPendingEvents,
    fetchAdminComplaints,
    fetchAdminBanAppeals,
    adminLoading,
  } = useAppStore();

  const [globalStats, setGlobalStats] = useState<AdminStatsOverview | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';

  const pendingEvents = useMemo(() => getAdminPendingEvents(), [getAdminPendingEvents]);
  const openComplaints = useMemo(() => getAdminOpenComplaints(), [getAdminOpenComplaints]);
  const pendingBanAppeals = useMemo(() => getAdminPendingBanAppeals(), [getAdminPendingBanAppeals]);

  const fetchGlobalStats = useCallback(async () => {
    if (!isSuperAdmin) return;
    setStatsLoading(true);
    try {
      const data = await api.getAdminStatsOverview();
      setGlobalStats(data);
    } catch (error) {
      console.error('[AdminDashboard] Failed to fetch global stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [isSuperAdmin]);

  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchAdminPendingEvents(),
      fetchAdminComplaints(),
      fetchAdminBanAppeals(),
      fetchGlobalStats(),
    ]);
  }, [fetchAdminPendingEvents, fetchAdminComplaints, fetchGlobalStats]);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  const handleLogout = () => {
    logout();
    router.replace('/auth');
  };

  const stats = [
    { 
      label: 'На модерации', 
      value: pendingEvents.length.toString(), 
      color: colors.accent,
      onPress: () => router.push('/(admin)/events'),
    },
    { 
      label: 'Открытых жалоб', 
      value: openComplaints.length.toString(), 
      color: colors.primary,
      onPress: () => router.push('/(admin)/complaints'),
    },
    { 
      label: 'Обжалований банов', 
      value: pendingBanAppeals.length.toString(), 
      color: colors.warning,
      onPress: () => router.push('/(admin)/ban-appeals'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={adminLoading}
            onRefresh={refreshData}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Привет, {user?.name?.split(' ')[0]} 🛡️</Text>
            <Text style={styles.subtitle}>Панель администратора</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Avatar source={user?.avatar} size={48} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.statCard}
              onPress={stat.onPress}
              activeOpacity={0.8}
            >
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Быстрые действия</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.actionEmoji}>⭐</Text>
              <Text style={styles.actionLabel} numberOfLines={2}>Открыть приложение</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard} 
              onPress={() => router.push('/(admin)/events')}
            >
              <Text style={styles.actionEmoji}>📋</Text>
              <Text style={styles.actionLabel} numberOfLines={2}>Модерация событий</Text>
              {pendingEvents.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingEvents.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(admin)/event-edit-requests')}
            >
              <Text style={styles.actionEmoji}>📝</Text>
              <Text style={styles.actionLabel} numberOfLines={2}>Правки событий</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(admin)/complaints')}
            >
              <Text style={styles.actionEmoji}>⚠️</Text>
              <Text style={styles.actionLabel} numberOfLines={2}>Жалобы</Text>
              {openComplaints.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{openComplaints.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(admin)/ban-appeals')}
            >
              <Text style={styles.actionEmoji}>🚫</Text>
              <Text style={styles.actionLabel} numberOfLines={2}>Обжалования</Text>
              {pendingBanAppeals.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingBanAppeals.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            {isSuperAdmin && (
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/(admin)/analytics')}
              >
                <Text style={styles.actionEmoji}>📊</Text>
                <Text style={styles.actionLabel} numberOfLines={2}>Аналитика</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(admin)/users')}
            >
              <Text style={styles.actionEmoji}>👥</Text>
              <Text style={styles.actionLabel} numberOfLines={2}>Пользователи</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(admin)/logs')}
            >
              <Text style={styles.actionEmoji}>📜</Text>
              <Text style={styles.actionLabel} numberOfLines={2}>Логи действий</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Superadmin Global Stats */}
        {isSuperAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Статистика приложения</Text>
            {statsLoading && !globalStats ? (
              <View style={styles.statsLoadingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : globalStats ? (
              <>
                {/* Users */}
                <View style={styles.globalStatsCard}>
                  <Text style={styles.globalStatsTitle}>👥 Пользователи</Text>
                  <View style={styles.globalStatsRow}>
                    <View style={styles.globalStatItem}>
                      <Text style={styles.globalStatValue}>{globalStats.users.total}</Text>
                      <Text style={styles.globalStatLabel}>Всего</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={[styles.globalStatValue, { color: colors.success }]}>
                        {globalStats.users.byStatus?.active || 0}
                      </Text>
                      <Text style={styles.globalStatLabel}>Активных</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={[styles.globalStatValue, { color: colors.accent }]}>
                        {globalStats.users.byStatus?.banned || 0}
                      </Text>
                      <Text style={styles.globalStatLabel}>Забанено</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={[styles.globalStatValue, { color: colors.warning }]}>
                        {globalStats.users.byStatus?.frozen || 0}
                      </Text>
                      <Text style={styles.globalStatLabel}>Заморожено</Text>
                    </View>
                  </View>
                  <View style={styles.globalStatsRow}>
                    <View style={styles.globalStatItem}>
                      <Text style={styles.globalStatValue}>{globalStats.users.byRole?.user || 0}</Text>
                      <Text style={styles.globalStatLabel}>Users</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={styles.globalStatValue}>{globalStats.users.byRole?.organizer || 0}</Text>
                      <Text style={styles.globalStatLabel}>Organizers</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={styles.globalStatValue}>{globalStats.users.byRole?.admin || 0}</Text>
                      <Text style={styles.globalStatLabel}>Admins</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={styles.globalStatValue}>{globalStats.users.byRole?.superadmin || 0}</Text>
                      <Text style={styles.globalStatLabel}>SuperAdmins</Text>
                    </View>
                  </View>
                </View>

                {/* Events */}
                <View style={styles.globalStatsCard}>
                  <Text style={styles.globalStatsTitle}>📅 События</Text>
                  <View style={styles.globalStatsRow}>
                    <View style={styles.globalStatItem}>
                      <Text style={styles.globalStatValue}>{globalStats.events.total}</Text>
                      <Text style={styles.globalStatLabel}>Всего</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={[styles.globalStatValue, { color: colors.success }]}>
                        {globalStats.events.byStatus?.published || 0}
                      </Text>
                      <Text style={styles.globalStatLabel}>Опубликовано</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={[styles.globalStatValue, { color: colors.warning }]}>
                        {globalStats.events.byStatus?.pending || 0}
                      </Text>
                      <Text style={styles.globalStatLabel}>На модерации</Text>
                    </View>
                  </View>
                </View>

                {/* Participations & Reviews */}
                <View style={styles.globalStatsCard}>
                  <Text style={styles.globalStatsTitle}>🎯 Активность</Text>
                  <View style={styles.globalStatsRow}>
                    <View style={styles.globalStatItem}>
                      <Text style={styles.globalStatValue}>{globalStats.participations.total}</Text>
                      <Text style={styles.globalStatLabel}>Участий</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={styles.globalStatValue}>{globalStats.reviews.total}</Text>
                      <Text style={styles.globalStatLabel}>Отзывов</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={styles.globalStatValue}>
                        {globalStats.reviews.avgRating ? globalStats.reviews.avgRating.toFixed(1) : '—'}
                      </Text>
                      <Text style={styles.globalStatLabel}>Ср. рейтинг</Text>
                    </View>
                  </View>
                </View>

                {/* Complaints */}
                <View style={styles.globalStatsCard}>
                  <Text style={styles.globalStatsTitle}>⚠️ Жалобы</Text>
                  <View style={styles.globalStatsRow}>
                    <View style={styles.globalStatItem}>
                      <Text style={styles.globalStatValue}>{globalStats.complaints.total}</Text>
                      <Text style={styles.globalStatLabel}>Всего</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={[styles.globalStatValue, { color: colors.accent }]}>
                        {globalStats.complaints.byStatus?.open || 0}
                      </Text>
                      <Text style={styles.globalStatLabel}>Открытых</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={[styles.globalStatValue, { color: colors.success }]}>
                        {globalStats.complaints.byStatus?.resolved || 0}
                      </Text>
                      <Text style={styles.globalStatLabel}>Решённых</Text>
                    </View>
                    <View style={styles.globalStatItem}>
                      <Text style={styles.globalStatValue}>
                        {globalStats.complaints.byStatus?.dismissed || 0}
                      </Text>
                      <Text style={styles.globalStatLabel}>Отклонённых</Text>
                    </View>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>🛡️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{user?.role === 'superadmin' ? 'SuperAdmin' : 'Admin'}</Text>
            <Text style={styles.infoText}>
              {user?.role === 'superadmin' 
                ? 'Полный доступ: модерация, управление ролями, удаление пользователей.'
                : 'Модерация событий, жалоб, управление пользователями (кроме ролей и удаления).'}
            </Text>
          </View>
        </View>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold || fontWeight.bold,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    flexGrow: 0,
    flexBasis: '48%',
    maxWidth: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
    ...shadows.sm,
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  infoEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    lineHeight: 16,
  },
  statsLoadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  globalStatsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  globalStatsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  globalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  globalStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  globalStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  globalStatLabel: {
    fontSize: fontSize.xxs || 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 12,
  },
});
