import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { AdminBanAppeal, BanAppealStatus } from '../../src/types';
import { useTheme } from '../../src/contexts/ThemeContext';

type TabFilter = BanAppealStatus;

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate();
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Мая', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  return `${day} ${months[date.getMonth()]}`;
};

const getStatusLabel = (status: BanAppealStatus): string => {
  switch (status) {
    case 'pending':
      return 'На рассмотрении';
    case 'approved':
      return 'Одобрено';
    case 'rejected':
      return 'Отклонено';
    default:
      return status;
  }
};

const getStatusVariant = (status: BanAppealStatus): 'warning' | 'success' | 'default' => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'default';
    default:
      return 'default';
  }
};

export default function AdminBanAppealsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const { getAdminBanAppeals, adminLoading, fetchAdminBanAppeals } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabFilter>('pending');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAdminBanAppeals();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAdminBanAppeals();
    }, [fetchAdminBanAppeals])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAdminBanAppeals();
    setRefreshing(false);
  }, [fetchAdminBanAppeals]);

  const allAppeals = useMemo(() => getAdminBanAppeals(), [getAdminBanAppeals]);

  const filteredAppeals = useMemo(() => {
    return allAppeals.filter((a) => a.status === activeTab);
  }, [allAppeals, activeTab]);

  const pendingCount = allAppeals.filter((a) => a.status === 'pending').length;
  const approvedCount = allAppeals.filter((a) => a.status === 'approved').length;
  const rejectedCount = allAppeals.filter((a) => a.status === 'rejected').length;

  if (adminLoading && allAppeals.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Обжалования банов</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.tabActive]} onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>На рассмотрении ({pendingCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'approved' && styles.tabActive]} onPress={() => setActiveTab('approved')}>
          <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>Одобрено ({approvedCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'rejected' && styles.tabActive]} onPress={() => setActiveTab('rejected')}>
          <Text style={[styles.tabText, activeTab === 'rejected' && styles.tabTextActive]}>Отклонено ({rejectedCount})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        {filteredAppeals.length > 0 ? (
          <View style={styles.list}>
            {filteredAppeals.map((appeal) => (
              <TouchableOpacity
                key={appeal.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => router.push(`/admin-ban-appeal/${appeal.id}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {appeal.user?.name || appeal.userId}
                    </Text>
                    <Text style={styles.userMeta} numberOfLines={1}>
                      {appeal.user?.phone || appeal.user?.telegramId || '—'}
                    </Text>
                  </View>
                  <Badge label={getStatusLabel(appeal.status)} variant={getStatusVariant(appeal.status)} size="sm" />
                </View>

                <Text style={styles.message} numberOfLines={2}>
                  {appeal.userMessage}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>{formatDate(appeal.createdAt)}</Text>
                  <Text style={styles.arrow}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{activeTab === 'pending' ? '✅' : '📭'}</Text>
            <Text style={styles.emptyTitle}>Нет заявок</Text>
            <Text style={styles.emptyText}>Здесь появятся обжалования банов</Text>
          </View>
        )}
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
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  tab: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.xs,
  },
  tabActive: {
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  arrow: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
});
