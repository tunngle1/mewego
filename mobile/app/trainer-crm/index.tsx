import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api } from '../../src/services/api';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Badge } from '../../src/components/ui/Badge';
import { TrainerCrmAnalyticsOverview, TrainerCrmDashboardResponse, TrainerCrmPackage, TrainerCrmTask } from '../../src/types';

const formatMoney = (amountMinor?: number | null, currency: string = '₽') => {
  const amount = typeof amountMinor === 'number' ? amountMinor / 100 : 0;
  return `${amount.toLocaleString('ru-RU')} ${currency}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTaskBadge = (status: string) => {
  if (status === 'done') return { label: 'Готово', variant: 'success' as const };
  if (status === 'cancelled') return { label: 'Отменена', variant: 'accent' as const };
  return { label: 'Открыта', variant: 'warning' as const };
};

export default function TrainerCrmDashboardScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<TrainerCrmDashboardResponse | null>(null);
  const [analytics, setAnalytics] = useState<TrainerCrmAnalyticsOverview | null>(null);
  const [tasks, setTasks] = useState<TrainerCrmTask[]>([]);
  const [packages, setPackages] = useState<TrainerCrmPackage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [dashboardData, analyticsData, tasksData, packagesData] = await Promise.all([
        api.getTrainerCrmDashboard(),
        api.getTrainerCrmAnalyticsOverview('30d'),
        api.getTrainerCrmTasks(),
        api.getTrainerCrmPackages(),
      ]);

      setDashboard(dashboardData);
      setAnalytics(analyticsData);
      setTasks(tasksData);
      setPackages(packagesData);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось загрузить CRM';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleCompleteTask = async (taskId: string) => {
    try {
      setCompletingTaskId(taskId);
      const updated = await api.completeTrainerCrmTask(taskId);
      setTasks((current) => current.map((item) => (item.id === taskId ? updated : item)));
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось завершить задачу');
    } finally {
      setCompletingTaskId(null);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl * 2,
      gap: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    subtitle: {
      marginTop: spacing.xs,
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    headerActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    headerButton: {
      width: 42,
      height: 42,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
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
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      ...shadows.sm,
    },
    statValue: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.black,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    statLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      lineHeight: 16,
    },
    section: {
      gap: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    rowButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    quickButton: {
      flex: 1,
    },
    alertRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    sessionCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      ...shadows.sm,
    },
    sessionTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    sessionMeta: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    taskCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      gap: spacing.sm,
    },
    taskTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    taskTitle: {
      flex: 1,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    taskMeta: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    packageCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      gap: spacing.xs,
    },
    packageTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    packageMeta: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorBox: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.accent,
      gap: spacing.sm,
    },
    errorText: {
      color: colors.text,
      fontSize: fontSize.sm,
      lineHeight: 20,
    },
  });

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>CRM тренера</Text>
            <Text style={styles.subtitle}>Клиенты, сессии, пакеты и задачи в одном месте</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/trainer-crm/client-create')}>
              <Ionicons name="person-add" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/trainer-crm/session-create')}>
              <Ionicons name="calendar-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Повторить" onPress={() => loadData()} variant="accent" />
          </View>
        ) : null}

        {dashboard ? (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{dashboard.stats.activeClientsCount}</Text>
              <Text style={styles.statLabel}>Активных клиентов</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{dashboard.stats.totalSessionsCount}</Text>
              <Text style={styles.statLabel}>Всего сессий</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{dashboard.stats.completedSessionsCount}</Text>
              <Text style={styles.statLabel}>Завершённых сессий</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatMoney(dashboard.stats.recordedRevenueMinor)}</Text>
              <Text style={styles.statLabel}>Учтённые расчёты</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Быстрые действия</Text>
          <View style={styles.rowButtons}>
            <Button title="Клиенты" onPress={() => router.push('/trainer-crm/clients')} style={styles.quickButton} />
            <Button title="Сессии" onPress={() => router.push('/trainer-crm/sessions')} variant="accent" style={styles.quickButton} />
          </View>
          <View style={styles.rowButtons}>
            <Button title="Задачи" onPress={() => router.push('/trainer-crm/tasks')} variant="outline" style={styles.quickButton} />
          </View>
        </View>

        {dashboard ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Сигналы</Text>
            <View style={styles.alertRow}>
              {dashboard.alerts.hasOverdueTasks ? <Badge label="Есть просроченные задачи" variant="warning" /> : null}
              {dashboard.alerts.hasUnpaidParticipants ? <Badge label="Есть расчёты без отметки" variant="accent" /> : null}
              {dashboard.alerts.hasExpiringPackages ? <Badge label="Пакеты скоро истекут" variant="default" /> : null}
              {!dashboard.alerts.hasOverdueTasks && !dashboard.alerts.hasUnpaidParticipants && !dashboard.alerts.hasExpiringPackages ? (
                <Badge label="Критичных сигналов нет" variant="success" />
              ) : null}
            </View>
          </View>
        ) : null}

        {analytics ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Аналитика за 30 дней</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{analytics.stats.attendanceRate}%</Text>
                <Text style={styles.statLabel}>Посещаемость</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{analytics.stats.occupancyRate}%</Text>
                <Text style={styles.statLabel}>Заполняемость</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{analytics.stats.newClients}</Text>
                <Text style={styles.statLabel}>Новых клиентов</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{analytics.stats.repeatClients}</Text>
                <Text style={styles.statLabel}>Повторных клиентов</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Сегодня и дальше</Text>
            <TouchableOpacity onPress={() => router.push('/trainer-crm/sessions')}>
              <Text style={{ color: colors.accent, fontWeight: fontWeight.bold }}>Все сессии</Text>
            </TouchableOpacity>
          </View>
          {dashboard && (dashboard.todaySessions.length > 0 || dashboard.nextSessions.length > 0) ? (
            [...dashboard.todaySessions, ...dashboard.nextSessions].slice(0, 6).map((session) => (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/trainer-crm/session/${session.id}`)}
              >
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionMeta}>{formatDateTime(session.startAt)} · {session.type === 'personal' ? 'Персональная' : 'Групповая'}</Text>
                <Text style={styles.sessionMeta}>Участников: {session.stats?.participantsCount || 0}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState icon="🗓️" title="Нет сессий" description="Создай первую тренировку или занятие и начни вести CRM прямо из приложения." actionLabel="Создать сессию" onAction={() => router.push('/trainer-crm/session-create')} />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Задачи</Text>
            <TouchableOpacity onPress={() => router.push('/trainer-crm/tasks')}>
              <Text style={{ color: colors.accent, fontWeight: fontWeight.bold }}>Все задачи</Text>
            </TouchableOpacity>
          </View>
          {tasks.length ? (
            tasks.slice(0, 5).map((task) => {
              const badge = getTaskBadge(task.status);
              return (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskTopRow}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Badge label={badge.label} variant={badge.variant} size="sm" />
                  </View>
                  <Text style={styles.taskMeta}>Клиент: {task.client?.fullName || 'Без клиента'}</Text>
                  <Text style={styles.taskMeta}>Дедлайн: {formatDateTime(task.dueAt)}</Text>
                  {task.status !== 'done' ? (
                    <Button
                      title="Завершить"
                      onPress={() => handleCompleteTask(task.id)}
                      variant="outline"
                      loading={completingTaskId === task.id}
                    />
                  ) : null}
                </View>
              );
            })
          ) : (
            <EmptyState icon="✅" title="Пока нет задач" description="Создай задачу позже — она появится здесь для быстрых действий." />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Пакеты клиентов</Text>
          {packages.length ? (
            packages.slice(0, 5).map((pkg) => (
              <View key={pkg.id} style={styles.packageCard}>
                <Text style={styles.packageTitle}>{pkg.title}</Text>
                <Text style={styles.packageMeta}>Клиент: {pkg.client?.fullName || '—'}</Text>
                <Text style={styles.packageMeta}>Осталось занятий: {pkg.sessionsRemaining}</Text>
                <Text style={styles.packageMeta}>Стоимость для учёта: {formatMoney(pkg.priceMinor)}</Text>
              </View>
            ))
          ) : (
            <EmptyState icon="🎟️" title="Пакетов пока нет" description="Создай пакет в карточке клиента, и он появится в этом разделе." />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
