import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api } from '../../src/services/api';
import { Badge } from '../../src/components/ui/Badge';
import { AdminAuditLog, AdminAuditAction } from '../../src/types';

const ACTION_LABELS: Record<AdminAuditAction, string> = {
  ban: 'Бан',
  unban: 'Разбан',
  freeze: 'Заморозка',
  unfreeze: 'Разморозка',
  reset_progress: 'Сброс прогресса',
  reset_subscriptions: 'Сброс подписок',
  grant_subscription: 'Выдача подписки',
  block_organizer: 'Блок организатора',
  unblock_organizer: 'Разблок организатора',
  delete_user: 'Удаление',
  change_role: 'Смена роли',
  approve_event: 'Одобрение события',
  reject_event: 'Отклонение события',
  close_complaint: 'Закрытие жалобы',
};

const ACTION_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'accent'> = {
  ban: 'accent',
  unban: 'success',
  freeze: 'warning',
  unfreeze: 'success',
  delete_user: 'accent',
  change_role: 'warning',
  approve_event: 'success',
  reject_event: 'accent',
  close_complaint: 'default',
  reset_progress: 'warning',
  reset_subscriptions: 'warning',
  grant_subscription: 'success',
  block_organizer: 'accent',
  unblock_organizer: 'success',
};

const FILTER_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Все', value: '' },
  { label: 'Пользователи', value: 'user' },
  { label: 'События', value: 'event' },
  { label: 'Жалобы', value: 'complaint' },
  { label: 'Организаторы', value: 'organizer' },
];

export default function AdminLogsScreen() {
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params: any = { limit: 50 };
      if (filter) params.targetType = filter;

      const result = await api.getAdminAuditLogs(params);
      setLogs(result.logs);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    filterChipActive: {
      backgroundColor: colors.text,
      borderColor: colors.text,
    },
    filterChipText: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      fontWeight: fontWeight.medium,
    },
    filterChipTextActive: {
      color: colors.white,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.sm,
    },
    logCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      ...shadows.sm,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
    },
    logAction: {
      flex: 1,
    },
    logDate: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    logAdmin: {
      fontSize: fontSize.sm,
      color: colors.text,
      fontWeight: fontWeight.medium,
      marginBottom: 2,
    },
    logTarget: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    logDetails: {
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.neutralMuted,
    },
    logDetailsText: {
      fontSize: fontSize.xs,
      color: colors.textLight,
      fontFamily: 'monospace',
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
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
    },
    errorText: {
      color: colors.accent,
      fontSize: fontSize.sm,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
  });

  const renderLogCard = (log: AdminAuditLog) => (
    <View key={log.id} style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.logAction}>
          <Badge
            label={ACTION_LABELS[log.action] || log.action}
            variant={ACTION_VARIANTS[log.action] || 'default'}
            size="sm"
          />
        </View>
        <Text style={styles.logDate}>{formatDate(log.createdAt)}</Text>
      </View>

      <Text style={styles.logAdmin}>
        {log.adminName || log.adminId}
      </Text>

      <Text style={styles.logTarget}>
        {log.targetType}: {log.targetName || log.targetId}
      </Text>

      {log.details && Object.keys(log.details).length > 0 && (
        <View style={styles.logDetails}>
          <Text style={styles.logDetailsText}>
            {JSON.stringify(log.details, null, 2)}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Логи</Text>
        <Badge label={`${total}`} variant="default" size="sm" />
      </View>

      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterChip, filter === opt.value && styles.filterChipActive]}
            onPress={() => setFilter(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === opt.value && styles.filterChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchLogs(true)}
            tintColor={colors.accent}
          />
        }
      >
        {error && <Text style={styles.errorText}>{error}</Text>}

        {loading ? (
          <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : logs.length > 0 ? (
          logs.map(renderLogCard)
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Логов нет</Text>
            <Text style={styles.emptyText}>Действия админов будут отображаться здесь.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
