import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { AdminComplaint, AdminComplaintStatus } from '../../src/types';
import { useTheme } from '../../src/contexts/ThemeContext';

type TabFilter = 'open' | 'closed';

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate();
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Мая', 'Июн', 
                  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  return `${day} ${months[date.getMonth()]}`;
};

const getReasonLabel = (reason: string): string => {
  switch (reason) {
    case 'unsafe': return 'Небезопасно';
    case 'fraud': return 'Мошенничество';
    case 'other': return 'Другое';
    default: return reason;
  }
};

const getTargetTypeLabel = (type: string): string => {
  switch (type) {
    case 'event': return 'Событие';
    case 'organizer': return 'Организатор';
    case 'user': return 'Пользователь';
    default: return type;
  }
};

export default function AdminComplaintsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const { getAdminComplaints, adminLoading, fetchAdminComplaints } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabFilter>('open');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAdminComplaints();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAdminComplaints();
    setRefreshing(false);
  }, [fetchAdminComplaints]);

  const allComplaints = useMemo(() => getAdminComplaints(), [getAdminComplaints]);
  
  const filteredComplaints = useMemo(() => {
    return allComplaints.filter((c) => c.status === activeTab);
  }, [allComplaints, activeTab]);

  const openCount = allComplaints.filter((c) => c.status === 'open').length;
  const closedCount = allComplaints.filter((c) => c.status === 'closed').length;

  if (adminLoading) {
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
        <Text style={styles.title}>Жалобы</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'open' && styles.tabActive]}
          onPress={() => setActiveTab('open')}
        >
          <Text style={[styles.tabText, activeTab === 'open' && styles.tabTextActive]}>
            Открытые ({openCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'closed' && styles.tabActive]}
          onPress={() => setActiveTab('closed')}
        >
          <Text style={[styles.tabText, activeTab === 'closed' && styles.tabTextActive]}>
            Закрытые ({closedCount})
          </Text>
        </TouchableOpacity>
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
        {filteredComplaints.length > 0 ? (
          <View style={styles.complaintsList}>
            {filteredComplaints.map((complaint) => (
              <TouchableOpacity
                key={complaint.id}
                style={styles.complaintCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/admin-complaint/${complaint.id}`)}
              >
                <View style={styles.complaintHeader}>
                  <View style={styles.complaintType}>
                    <Text style={styles.typeEmoji}>
                      {complaint.targetType === 'event' ? '📅' : 
                       complaint.targetType === 'organizer' ? '👤' : '🙋'}
                    </Text>
                    <Text style={styles.typeText}>
                      {getTargetTypeLabel(complaint.targetType)}
                    </Text>
                  </View>
                  <Badge 
                    label={complaint.status === 'open' ? 'Открыта' : 'Закрыта'} 
                    variant={complaint.status === 'open' ? 'warning' : 'default'} 
                    size="sm" 
                  />
                </View>

                <View style={styles.reasonBadge}>
                  <Text style={styles.reasonText}>{getReasonLabel(complaint.reason)}</Text>
                </View>

                {complaint.description && (
                  <Text style={styles.complaintDescription} numberOfLines={2}>
                    {complaint.description}
                  </Text>
                )}

                <View style={styles.complaintFooter}>
                  <Text style={styles.reporterText}>
                    От: {complaint.reporterName || complaint.reporterId}
                  </Text>
                  <Text style={styles.dateText}>{formatDate(complaint.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>
              {activeTab === 'open' ? '✅' : '📭'}
            </Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'open' ? 'Нет открытых жалоб' : 'Нет закрытых жалоб'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'open' 
                ? 'Все жалобы обработаны' 
                : 'Закрытые жалобы появятся здесь'}
            </Text>
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
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.text,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.white,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  complaintsList: {
    gap: spacing.md,
  },
  complaintCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  complaintType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  typeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reasonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  reasonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  complaintDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  complaintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutralMuted,
  },
  reporterText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});
