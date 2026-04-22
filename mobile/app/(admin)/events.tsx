import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { useTheme } from '../../src/contexts/ThemeContext';

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
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Мая', 'Июн', 
                  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  return `${day} ${months[date.getMonth()]}`;
};

const formatEventTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

export default function AdminEventsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const { getAdminPendingEvents, adminLoading, fetchAdminPendingEvents } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAdminPendingEvents();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAdminPendingEvents();
    }, [fetchAdminPendingEvents])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAdminPendingEvents();
    setRefreshing(false);
  }, [fetchAdminPendingEvents]);

  const pendingEvents = useMemo(() => getAdminPendingEvents(), [getAdminPendingEvents]);

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
        <Text style={styles.title}>Модерация событий</Text>
        <Badge label={`${pendingEvents.length}`} variant="warning" size="sm" />
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
        {pendingEvents.length > 0 ? (
          <View style={styles.eventsList}>
            {pendingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/admin-event/${event.id}`)}
              >
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Badge label="На модерации" variant="warning" size="sm" />
                </View>

                <Text style={styles.eventDescription} numberOfLines={2}>
                  {event.description}
                </Text>

                <View style={styles.eventMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>📅</Text>
                    <Text style={styles.metaText}>
                      {formatEventDate(event.startAt)}, {formatEventTime(event.startAt)}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>📍</Text>
                    <Text style={styles.metaText}>{event.locationName}</Text>
                  </View>
                </View>

                <View style={styles.eventFooter}>
                  <Text style={styles.organizerText}>
                    Организатор: {event.organizerId}
                  </Text>
                  <Text style={styles.actionHint}>Нажмите для модерации →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>Всё проверено!</Text>
            <Text style={styles.emptyText}>
              Нет событий, ожидающих модерации
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
    borderBottomWidth: 1,
    borderBottomColor: colors.neutralMuted,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  eventsList: {
    gap: spacing.md,
  },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  eventTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  eventDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  eventMeta: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutralMuted,
  },
  organizerText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actionHint: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.accent,
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
