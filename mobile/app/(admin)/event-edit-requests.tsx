import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function AdminEventEditRequestsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const { adminLoading, fetchAdminEventEditRequests, getAdminPendingEventEditRequests } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAdminEventEditRequests();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAdminEventEditRequests();
    }, [fetchAdminEventEditRequests])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAdminEventEditRequests();
    setRefreshing(false);
  }, [fetchAdminEventEditRequests]);

  const items = useMemo(() => getAdminPendingEventEditRequests(), [getAdminPendingEventEditRequests]);

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
        <Text style={styles.title}>Правки событий</Text>
        <Badge label={`${items.length}`} variant="warning" size="sm" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {items.length > 0 ? (
          <View style={styles.list}>
            {items.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => router.push(`/admin-event-edit-request/${r.id}`)}
              >
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>Запрос на изменение</Text>
                  <Badge label="pending" variant="warning" size="sm" />
                </View>
                <Text style={styles.meta}>Event: {r.eventId}</Text>
                <Text style={styles.meta}>Organizer: {r.organizerId}</Text>
                <Text style={styles.hint}>Нажмите, чтобы увидеть до/после →</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>Нет правок</Text>
            <Text style={styles.emptyText}>Сейчас нет запросов на изменение событий</Text>
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
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  hint: {
    marginTop: spacing.md,
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
