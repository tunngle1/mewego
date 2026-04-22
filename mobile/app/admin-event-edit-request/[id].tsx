import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { useTheme } from '../../src/contexts/ThemeContext';

const renderJson = (obj: any) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

export default function AdminEventEditRequestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const {
    adminLoading,
    fetchAdminEventEditRequestById,
    getAdminEventEditRequestById,
    approveAdminEventEditRequestAsync,
    rejectAdminEventEditRequestAsync,
  } = useAppStore();

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) fetchAdminEventEditRequestById(id);
  }, [id, fetchAdminEventEditRequestById]);

  const item = useMemo(() => (id ? getAdminEventEditRequestById(id) : null), [id, getAdminEventEditRequestById]);

  const handleApprove = useCallback(() => {
    if (!id) return;
    Alert.alert('Одобрить правку', 'Применить изменения к событию и уведомить участников?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Одобрить',
        onPress: async () => {
          setActionLoading(true);
          const ok = await approveAdminEventEditRequestAsync(id);
          setActionLoading(false);
          if (ok) {
            Alert.alert('Готово', 'Правка одобрена и применена', [{ text: 'OK', onPress: () => router.back() }]);
          } else {
            Alert.alert('Ошибка', 'Не удалось одобрить правку');
          }
        },
      },
    ]);
  }, [id, approveAdminEventEditRequestAsync, router]);

  const handleReject = useCallback(() => {
    if (!id) return;
    Alert.alert('Отклонить правку', 'Отклонить запрос на изменение?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Отклонить',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          const ok = await rejectAdminEventEditRequestAsync(id);
          setActionLoading(false);
          if (ok) {
            Alert.alert('Готово', 'Правка отклонена', [{ text: 'OK', onPress: () => router.back() }]);
          } else {
            Alert.alert('Ошибка', 'Не удалось отклонить правку');
          }
        },
      },
    ]);
  }, [id, rejectAdminEventEditRequestAsync, router]);

  if (adminLoading && !item) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundTitle}>Запрос не найден</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Правка</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>Запрос на изменение</Text>
            <Badge label={item.status} variant={item.status === 'pending' ? 'warning' : item.status === 'approved' ? 'success' : 'accent'} size="sm" />
          </View>
          <Text style={styles.meta}>Event: {item.eventId}</Text>
          <Text style={styles.meta}>Organizer: {item.organizerId}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.blockTitle}>Было</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codeBox}>
            <Text style={styles.codeText}>{renderJson(item.before)}</Text>
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.blockTitle}>Стало</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codeBox}>
            <Text style={styles.codeText}>{renderJson(item.after)}</Text>
          </ScrollView>
        </View>

        {item.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.approveButton} onPress={handleApprove} disabled={actionLoading} activeOpacity={0.8}>
              {actionLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.approveButtonText}>✓ Одобрить</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectButton} onPress={handleReject} disabled={actionLoading} activeOpacity={0.8}>
              <Text style={styles.rejectButtonText}>✕ Отклонить</Text>
            </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutralMuted,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  backIcon: {
    fontSize: fontSize.xl,
    color: colors.text,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
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
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  blockTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  codeBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  codeText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontFamily: 'Courier',
  },
  actions: {
    gap: spacing.sm,
  },
  approveButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  approveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  rejectButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutralLight,
  },
  rejectButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  notFoundEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  notFoundTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  backLink: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.sm,
  },
});
