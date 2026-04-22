import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { useTheme } from '../../src/contexts/ThemeContext';

const formatEventDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate();
  const months = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 
                  'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
  return `${day} ${months[date.getMonth()]}`;
};

const formatEventTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

export default function AdminEventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const { organizerEvents, approveEventAsync, rejectEventAsync } = useAppStore();

  const event = organizerEvents.find((e) => e.id === id);
  const [loading, setLoading] = useState(false);

  if (!event) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundTitle}>Событие не найдено</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleApprove = () => {
    Alert.alert(
      'Одобрить событие',
      `Вы уверены, что хотите одобрить "${event.title}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Одобрить',
          onPress: async () => {
            setLoading(true);
            const result = await approveEventAsync(event.id);
            setLoading(false);
            if (result) {
              Alert.alert('Готово', 'Событие одобрено', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } else {
              Alert.alert('Ошибка', 'Не удалось одобрить событие');
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Отклонить событие',
      `Вы уверены, что хотите отклонить "${event.title}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отклонить',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await rejectEventAsync(event.id);
            setLoading(false);
            if (result) {
              Alert.alert('Готово', 'Событие отклонено', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } else {
              Alert.alert('Ошибка', 'Не удалось отклонить событие');
            }
          },
        },
      ]
    );
  };

  const isPending = event.status === 'pending';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Модерация</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.title}</Text>
            <Badge 
              label={event.status === 'pending' ? 'На модерации' : 
                     event.status === 'approved' ? 'Одобрено' : 'Отклонено'} 
              variant={event.status === 'pending' ? 'warning' : 
                       event.status === 'approved' ? 'success' : 'accent'} 
              size="sm" 
            />
          </View>

          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Детали события</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoText}>
                {formatEventDate(event.startAt)}, {formatEventTime(event.startAt)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⏱</Text>
              <Text style={styles.infoText}>{event.durationMin} минут</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>
                {event.locationName}
                {event.locationAddress ? `, ${event.locationAddress}` : ''}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👥</Text>
              <Text style={styles.infoText}>
                Вместимость: {event.capacity || 'Без ограничений'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>💰</Text>
              <Text style={styles.infoText}>
                {event.priceType === 'free' ? 'Бесплатно' : 
                 event.priceType === 'donation' ? 'Донат' : 
                 `${event.priceValue} ₽`}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Организатор</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👤</Text>
              <Text style={styles.infoText}>ID: {event.organizerId}</Text>
            </View>

            <TouchableOpacity
              style={styles.organizerLink}
              onPress={() => router.push(`/admin-user/${event.organizerId}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.organizerLinkText}>Открыть профиль</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Категория</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🏷</Text>
              <Text style={styles.infoText}>
                {event.movementType} • {event.level}
              </Text>
            </View>
          </View>
        </View>

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={handleApprove}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.approveButtonText}>✓ Одобрить</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectButton}
              onPress={handleReject}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.rejectButtonText}>✕ Отклонить</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPending && (
          <View style={styles.statusMessage}>
            <Text style={styles.statusEmoji}>
              {event.status === 'approved' ? '✅' : '❌'}
            </Text>
            <Text style={styles.statusText}>
              Событие {event.status === 'approved' ? 'одобрено' : 'отклонено'}
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
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    lineHeight: 20,
  },
  infoSection: {
    marginTop: spacing.md,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  organizerLink: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'flex-start',
  },
  organizerLinkText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  approveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  approveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  rejectButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  rejectButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  statusMessage: {
    marginTop: spacing.xl,
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.xl,
  },
  statusEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});
