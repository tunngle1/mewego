import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { useAppStore } from '../src/store/useAppStore';
import { useTheme } from '../src/contexts/ThemeContext';

export default function BookingScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = React.useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const { 
    events, 
    joinWaitingList, 
    user, 
    getActiveBookingForEvent,
    createBooking,
    bookingsLoading,
    bookingsError,
  } = useAppStore();
  const [loading, setLoading] = useState(false);

  const event = events.find((e) => e.id === eventId);
  const existingBooking = eventId ? getActiveBookingForEvent(eventId) : undefined;

  const handleCancel = () => {
    router.back();
  };

  const handleConfirm = async () => {
    if (!event) return;

    if (!user) {
      router.replace('/auth');
      return;
    }

    setLoading(true);
    try {
      // If event is full -> join waiting list
      if (event.isFull || event.spotsTaken >= event.spotsTotal) {
        joinWaitingList(event.id);
        router.replace({
          pathname: '/waiting',
          params: { eventId: event.id, mode: 'queue' },
        });
        return;
      }

      const booking = await createBooking(event.id);
      if (!booking) {
        Alert.alert('Ошибка', bookingsError || 'Не удалось записаться');
        return;
      }

      router.replace({
        pathname: '/waiting',
        params: { eventId: event.id, mode: 'confirmed', bookingId: booking.id },
      });
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Ошибка', 'Не удалось записаться на событие');
    } finally {
      setLoading(false);
    }
  };

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Событие не найдено</Text>
      </SafeAreaView>
    );
  }

  const formatPrice = (price: number, isFree: boolean) => {
    if (isFree) return 'Бесплатно';
    return `${price} ₽`;
  };

  const handleGoToBookings = () => {
    router.replace('/(tabs)/bookings');
  };

  if (existingBooking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelIcon}>←</Text>
              <Text style={styles.cancelText}>Назад</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.alreadyBookedContainer}>
            <Text style={styles.alreadyBookedEmoji}>✓</Text>
            <Text style={styles.alreadyBookedTitle}>Вы уже записаны</Text>
            <Text style={styles.alreadyBookedSubtitle}>
              У вас уже есть активная запись на это событие
            </Text>
          </View>

          <View style={styles.spacer} />

          <Button
            title="Перейти в мои тренировки"
            onPress={handleGoToBookings}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelIcon}>←</Text>
            <Text style={styles.cancelText}>Отмена</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Подтверждение</Text>
          <Text style={styles.subtitle}>Мы забронируем за вами место</Text>
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Событие</Text>
            <Text style={styles.summaryValue}>{event.title}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Время</Text>
            <Text style={styles.summaryValue}>
              {event.date}, {event.time}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Стоимость</Text>
            <Text style={styles.totalValue}>
              {formatPrice(event.price, event.isFree)}
            </Text>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsEmoji}>💡</Text>
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>ME·WE·GO СОВЕТ:</Text>
            <Text style={styles.tipsText}>
              Не волнуйтесь, если передумаете. Мы возвращаем полную стоимость
              при отмене за 12 часов. Нам важно, чтобы вы чувствовали себя
              спокойно.
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Confirm Button */}
        <Button
          title="Записаться"
          onPress={handleConfirm}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
        />
      </View>
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  cancelIcon: {
    fontSize: fontSize.xl,
    color: colors.text,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  title: {
    marginTop: spacing.lg,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.bold,
    maxWidth: '65%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutralMuted,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
  totalValue: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },
  tipsCard: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutralMuted,
  },
  tipsEmoji: {
    fontSize: 22,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  tipsText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    lineHeight: 20,
  },
  spacer: {
    flex: 1,
  },
  alreadyBookedContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.sm,
  },
  alreadyBookedEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  alreadyBookedTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  alreadyBookedSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
