import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { useAppStore } from '../../src/store/useAppStore';
import { OrganizerEvent, OrganizerEventStatus } from '../../src/types';
import { useTheme } from '../../src/contexts/ThemeContext';

type TabFilter = 'active' | 'past' | 'drafts';

const formatEventDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === now.toDateString()) {
    return 'Сегодня';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Завтра';
  }
  
  const day = date.getDate();
  const months = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 
                  'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
  return `${day} ${months[date.getMonth()]}`;
};

const formatEventTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

export default function OrganizerEventsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const { organizerEvents, organizerLoading, fetchOrganizerEvents } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabFilter>('active');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrganizerEvents();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrganizerEvents();
    setRefreshing(false);
  }, [fetchOrganizerEvents]);

  const filteredEvents = useMemo(() => {
    return organizerEvents.filter((event) => {
      switch (activeTab) {
        case 'active':
          return event.status === 'approved' || event.status === 'pending';
        case 'past':
          return event.status === 'finished' || event.status === 'canceled';
        case 'drafts':
          return event.status === 'draft' || event.status === 'rejected';
        default:
          return true;
      }
    });
  }, [organizerEvents, activeTab]);

  const getStatusBadge = (status: OrganizerEventStatus) => {
    switch (status) {
      case 'approved':
        return <Badge label="Опубликовано" variant="success" size="sm" />;
      case 'pending':
        return <Badge label="На модерации" variant="warning" size="sm" />;
      case 'draft':
        return <Badge label="Черновик" variant="default" size="sm" />;
      case 'rejected':
        return <Badge label="Отклонено" variant="accent" size="sm" />;
      case 'canceled':
        return <Badge label="Отменено" variant="default" size="sm" />;
      case 'finished':
        return <Badge label="Завершено" variant="default" size="sm" />;
      default:
        return <Badge label={status} variant="default" size="sm" />;
    }
  };

  if (organizerLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Загрузка событий...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Мои события</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/organizer-event/create')}>
          <Text style={styles.addButtonText}>+ Создать</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['active', 'past', 'drafts'] as TabFilter[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'active' ? 'Активные' : tab === 'past' ? 'Прошедшие' : 'Черновики'}
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
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {filteredEvents.length > 0 ? (
          <View style={styles.eventsList}>
            {filteredEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/organizer-event/${event.id}`)}
              >
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {getStatusBadge(event.status)}
                </View>

                <View style={styles.eventMeta}>
                  <Text style={styles.eventDate}>
                    {formatEventDate(event.startAt)} в {formatEventTime(event.startAt)}
                  </Text>
                </View>

                <View style={styles.eventStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {event.participantsJoinedCount}/{event.capacity || '∞'}
                    </Text>
                    <Text style={styles.statLabel}>участников</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>
                      {event.revenueTotal > 0 ? `${event.revenueTotal}₽` : '—'}
                    </Text>
                    <Text style={styles.statLabel}>выручка</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {event.capacity && event.capacity > 0 
                        ? Math.round((event.participantsJoinedCount / event.capacity) * 100) 
                        : 0}%
                    </Text>
                    <Text style={styles.statLabel}>заполнено</Text>
                  </View>
                </View>

                <View style={styles.eventActions}>
                  <Button
                    title="Редактировать"
                    variant="secondary"
                    size="sm"
                    style={styles.actionButton}
                    onPress={() => router.push({ pathname: '/organizer-event/create', params: { editId: event.id } })}
                  />
                  <Button
                    title="Участники"
                    variant="outline"
                    size="sm"
                    style={styles.actionButton}
                    onPress={() => router.push(`/organizer-event/${event.id}/participants`)}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Нет событий</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'drafts'
                ? 'У вас нет черновиков'
                : activeTab === 'past'
                ? 'Здесь появятся завершённые события'
                : 'Создайте своё первое событие'}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceMuted,
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
    paddingBottom: spacing.xxl * 2,
  },
  eventsList: {
    gap: spacing.md,
  },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  eventTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  eventMeta: {
    marginBottom: spacing.md,
  },
  eventDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  eventStats: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs - 1,
    color: colors.textMuted,
    marginTop: 2,
  },
  eventActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
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
