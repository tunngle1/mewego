import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../src/store/useAppStore';
import { useTheme } from '../src/contexts/ThemeContext';

export default function WaitingScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = React.useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const { eventId, mode, bookingId, waitingEntryId } = useLocalSearchParams<{
    eventId: string;
    mode?: 'confirmed' | 'queue' | 'offered';
    bookingId?: string;
    waitingEntryId?: string;
  }>();

  const { 
    events, 
    user, 
    leaveWaitingListAsync, 
    acceptWaitingOfferAsync, 
    declineWaitingOfferAsync, 
    simulateWaitingOffer, 
    addNotification,
  } = useAppStore();
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [accepting, setAccepting] = useState(false);

  const event = events.find((e) => e.id === eventId);

  const isOfferedMode = mode === 'offered';

  // Timer for offered mode (15 minutes countdown)
  useEffect(() => {
    if (!isOfferedMode) return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          Alert.alert(
            'Время истекло',
            'К сожалению, время на подтверждение места истекло.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)/explore') }]
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOfferedMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptOffer = async () => {
    if (!eventId || !waitingEntryId) return;
    setAccepting(true);
    try {
      const result = await acceptWaitingOfferAsync(waitingEntryId);
      if (result) {
        router.replace({
          pathname: '/waiting',
          params: { eventId, mode: 'confirmed' },
        });
      } else {
        Alert.alert('Ошибка', 'Не удалось подтвердить место');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось подтвердить место');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineOffer = () => {
    Alert.alert(
      'Отказаться от места?',
      'Место будет предложено следующему в очереди.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Да, отказаться',
          style: 'destructive',
          onPress: async () => {
            if (waitingEntryId) {
              await declineWaitingOfferAsync(waitingEntryId);
            }
            router.replace('/(tabs)/explore');
          },
        },
      ]
    );
  };

  const handleFinish = () => {
    router.replace({
      pathname: '/post-event',
      params: { eventId: eventId, bookingId },
    });
  };

  const handleGoToProfile = () => {
    router.replace('/(tabs)/bookings');
  };

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Событие не найдено</Text>
      </SafeAreaView>
    );
  }

  const myQueuePosition =
    user && event.waitingList
      ? event.waitingList.find((w) => w.userId === user.id)?.position
      : undefined;

  const isQueueMode = mode === 'queue';

  const handleLeaveQueue = async () => {
    if (!eventId) return;
    await leaveWaitingListAsync(eventId);
    router.replace('/(tabs)/explore');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Animation */}
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Text style={styles.successEmoji}>✨</Text>
          </View>
          <View style={styles.badgeCircle}>
            <Text style={styles.badgeNumber}>1</Text>
          </View>
        </View>

        {/* Message */}
        <Text style={styles.title}>
          {isOfferedMode
            ? 'Освободилось место!'
            : isQueueMode
            ? 'Вы в очереди'
            : 'Запись подтверждена'}
        </Text>
        <Text style={styles.description}>
          {isOfferedMode
            ? `На событие "${event.title}" освободилось место. Подтвердите участие.`
            : isQueueMode
            ? `Событие "${event.title}" заполнено. Мы уведомим, если освободится место.`
            : `Ваше место на событие "${event.title}" подтверждено.`}
        </Text>

        {/* Timer for offered mode */}
        {isOfferedMode && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Осталось времени:</Text>
            <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
          </View>
        )}

        {/* What's Next Card */}
        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>ЧТО ДАЛЬШЕ?</Text>
          <View style={styles.nextList}>
            <View style={styles.nextItem}>
              <Text style={styles.nextIcon}>📫</Text>
              <Text style={styles.nextText}>
                Уведомление придет за 2 часа до начала.
              </Text>
            </View>
            <View style={styles.nextItem}>
              <Text style={styles.nextIcon}>👟</Text>
              <Text style={styles.nextText}>
                Специальная одежда не нужна — главное, чтобы вам было удобно.
              </Text>
            </View>
            {isQueueMode && (
              <View style={styles.nextItem}>
                <Text style={styles.nextIcon}>⏳</Text>
                <Text style={styles.nextText}>
                  {myQueuePosition
                    ? `Ваша позиция в очереди: ${myQueuePosition}.`
                    : 'Вы в очереди ожидания.'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* CTA */}
        {isOfferedMode ? (
          <View style={styles.offeredActions}>
            <TouchableOpacity
              style={[styles.acceptButton, accepting && styles.acceptButtonDisabled]}
              onPress={handleAcceptOffer}
              disabled={accepting}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptButtonText}>
                {accepting ? 'Подтверждение...' : 'Подтвердить участие'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeclineOffer} style={styles.declineButton}>
              <Text style={styles.declineButtonText}>Отказаться</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={handleGoToProfile}>
              <Text style={styles.ctaText}>Перейти в личный кабинет →</Text>
            </TouchableOpacity>

            {isQueueMode && (
              <TouchableOpacity onPress={handleLeaveQueue} style={styles.leaveQueueButton}>
                <Text style={styles.leaveQueueText}>Выйти из очереди</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Dev Toggle (hidden in production) */}
        <TouchableOpacity
          onPress={handleFinish}
          style={styles.devToggle}
        >
          <Text style={styles.devToggleText}>
            [ Симуляция завершения события ]
          </Text>
        </TouchableOpacity>

        {isQueueMode && (
          <TouchableOpacity
            onPress={() => {
              if (!eventId) return;
              const offer = simulateWaitingOffer(eventId);
              if (offer) {
                addNotification({
                  id: `notif-${Date.now()}`,
                  type: 'waiting_list_spot',
                  title: 'Освободилось место!',
                  body: `На событие "${event?.title}" освободилось место. Подтвердите участие.`,
                  data: { eventId, offerId: offer.id },
                  read: false,
                  createdAt: new Date().toISOString(),
                });
                router.replace({
                  pathname: '/waiting',
                  params: { eventId, mode: 'offered', waitingEntryId: offer.id },
                });
              }
            }}
            style={styles.devToggle}
          >
            <Text style={styles.devToggleText}>
              [ Симуляция: освободилось место ]
            </Text>
          </TouchableOpacity>
        )}
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
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContainer: {
    position: 'relative',
    marginBottom: spacing.xxl,
  },
  successCircle: {
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successEmoji: {
    fontSize: 64,
  },
  badgeCircle: {
    position: 'absolute',
    top: -16,
    right: -16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 300,
    lineHeight: 22,
  },
  timerContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral,
    marginBottom: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  timerLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textDisabled,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  timerValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.accent,
  },
  nextCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral,
    width: '100%',
    marginBottom: spacing.xxl,
    ...shadows.sm,
  },
  nextTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textDisabled,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  nextList: {
    gap: spacing.md,
  },
  nextItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  nextIcon: {
    fontSize: fontSize.xl,
  },
  nextText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textLight,
    lineHeight: 20,
  },
  ctaText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  offeredActions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  acceptButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  acceptButtonDisabled: {
    backgroundColor: colors.neutral,
  },
  acceptButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  declineButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  declineButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  devToggle: {
    marginTop: spacing.xl,
    opacity: 0.1,
  },
  devToggleText: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  leaveQueueButton: {
    marginTop: spacing.lg,
  },
  leaveQueueText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
});
