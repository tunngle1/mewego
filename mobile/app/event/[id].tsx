import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Avatar, AvatarGroup } from '../../src/components/ui/Avatar';
import { useAppStore } from '../../src/store/useAppStore';
import { CancelBookingModal } from '../../src/components/CancelBookingModal';
import { api } from '../../src/services/api';
import { useTheme } from '../../src/contexts/ThemeContext';
import { YandexEventMap } from '../../src/components/YandexEventMap';

const DEFAULT_COVERS: Record<string, any> = {
  yoga: require('../../assets/categories/yoga.jpg'),
  running: require('../../assets/event-covers/running.jpg'),
  cycling: require('../../assets/categories/cycling.jpg'),
  strength: require('../../assets/categories/strength.jpg'),
};

const normalizeCategorySlug = (input: string | undefined | null): keyof typeof DEFAULT_COVERS => {
  const raw = String(input || '').trim().toLowerCase();
  if (raw in DEFAULT_COVERS) return raw as keyof typeof DEFAULT_COVERS;
  if (raw === 'run' || raw === 'runner' || raw === 'бег' || raw === 'running') return 'running';
  if (raw === 'йога' || raw === 'yoga') return 'yoga';
  if (raw === 'велоспорт' || raw === 'bike' || raw === 'cycling') return 'cycling';
  if (raw === 'силовые' || raw === 'strength') return 'strength';
  return 'running';
};

const getEventCoverSource = (image: string | undefined | null, category: string): any => {
  const uri = (image || '').trim();
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return { uri };
  }
  const slug = normalizeCategorySlug(category);
  return DEFAULT_COVERS[slug];
};

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const openInYandexMaps = async () => {
    const lat = event?.location?.coordinates?.latitude;
    const lng = event?.location?.coordinates?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      Alert.alert('Нет координат', 'Для этого события не заданы координаты точки встречи.');
      return;
    }
    const url = `https://yandex.com/maps/?pt=${lng},${lat}&z=16&l=map`;
    await Linking.openURL(url);
  };

  const buildRouteInYandexMaps = async () => {
    const lat = event?.location?.coordinates?.latitude;
    const lng = event?.location?.coordinates?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      Alert.alert('Нет координат', 'Для этого события не заданы координаты точки встречи.');
      return;
    }
    const url = `https://yandex.com/maps/?rtext=~${lng},${lat}&rtt=auto`;
    await Linking.openURL(url);
  };
  const { 
    events, 
    selectedEvent, 
    user, 
    getActiveBookingForEvent, 
    cancelBookingAsync, 
    joinWaitingListAsync,
    leaveWaitingListAsync,
    fetchEventById,
    eventsLoading,
  } = useAppStore();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    if (id && !selectedEvent) {
      fetchEventById(id);
    }
  }, [id, selectedEvent]);

  const event = useMemo(() => {
    if (selectedEvent?.id === id) return selectedEvent;
    return events.find((e) => e.id === id) || null;
  }, [events, id, selectedEvent]);

  if (eventsLoading && !event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const organizerOwnerId = (event as any)?.instructor?.id || (event as any)?.trainer?.id;
  const isOrganizerOwnEvent = Boolean(user?.id && organizerOwnerId && user.id === organizerOwnerId);

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundTitle}>Событие не найдено</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    router.back();
  };

  const handleBook = () => {
    router.push({
      pathname: '/booking',
      params: { eventId: event.id },
    });
  };

  const handleJoinWaitingList = async () => {
    if (!user) return;

    try {
      await joinWaitingListAsync(event.id);
      router.push({
        pathname: '/waiting',
        params: { eventId: event.id, mode: 'queue' },
      });
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось встать в очередь');
    }
  };

  const handleLeaveWaitingList = async () => {
    if (!user) return;

    try {
      await leaveWaitingListAsync(event.id);
      Alert.alert('Готово', 'Вы вышли из очереди.', [{ text: 'Понятно' }]);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось выйти из очереди');
    }
  };

  const formatPrice = (price: number, isFree: boolean) => {
    if (isFree) return 'Бесплатно';
    return `${price} ₽`;
  };

  const canJoinWaitingList = event.isFull && user?.subscription?.isActive;

  const coverSource = event
    ? (coverFailed ? getEventCoverSource(null, event.category) : getEventCoverSource(event.image, event.category))
    : null;

  const activeBooking = getActiveBookingForEvent(event.id);
  const viewerWaiting = (event as any)?.viewerWaiting;
  const isInWaitingList = viewerWaiting?.status === 'waiting';
  const activeOffer = viewerWaiting?.status === 'offered'
    ? { id: viewerWaiting.entryId }
    : null;

  // Check if event has started (for UI gating)
  const eventStartTime = new Date(event.date);
  const now = new Date();
  const eventHasStarted = now >= eventStartTime;
  
  // Grace window for cancel: 30 minutes after start
  const CANCEL_GRACE_MINUTES = 30;
  const minutesSinceStart = (now.getTime() - eventStartTime.getTime()) / (1000 * 60);
  const canStillCancel = !eventHasStarted || minutesSinceStart <= CANCEL_GRACE_MINUTES;

  const handleCancelBooking = async (reason: string, comment?: string) => {
    if (activeBooking) {
      try {
        await cancelBookingAsync(activeBooking.id, reason, comment);
        if (eventHasStarted && canStillCancel) {
          Alert.alert(
            'Запись отменена',
            'Обратите внимание: за отмену после начала события списаны штрафные баллы.',
            [{ text: 'Понятно' }]
          );
        }
      } catch (error: any) {
        const message = error?.data?.message || error?.message || 'Не удалось отменить запись';
        Alert.alert('Ошибка', message);
      }
    }
    setCancelModalVisible(false);
  };

  const handleTryCancelBooking = () => {
    if (!canStillCancel) {
      Alert.alert(
        'Отмена невозможна',
        'Прошло более 30 минут с начала события. Отмена записи больше недоступна.',
        [{ text: 'Понятно' }]
      );
      return;
    }
    
    if (eventHasStarted) {
      Alert.alert(
        'Внимание',
        'Событие уже началось. При отмене записи будут списаны штрафные баллы. Продолжить?',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Да, отменить', style: 'destructive', onPress: () => setCancelModalVisible(true) },
        ]
      );
      return;
    }
    
    setCancelModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={coverSource}
            style={styles.heroImage}
            resizeMode="cover"
            onError={() => setCoverFailed(true)}
          />
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Badge label={event.category} variant="default" />
            <Text style={styles.price}>
              {formatPrice(event.price, event.isFree)}
            </Text>
          </View>

          <Text style={styles.title}>{event.title}</Text>

          {/* Vibe Tags */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.vibeContainer}
            contentContainerStyle={styles.vibeContent}
          >
            {event.vibe.map((tag) => (
              <View key={tag} style={styles.vibeTag}>
                <Text style={styles.vibeText}>#{tag}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Info Cards */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Text style={styles.infoEmoji}>🕒</Text>
              </View>
              <View>
                <Text style={styles.infoTitle}>
                  {event.date} в {event.time}
                </Text>
                <Text style={styles.infoSubtitle}>
                  Длительность: {event.duration} минут
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Text style={styles.infoEmoji}>📍</Text>
              </View>
              <View>
                <Text style={styles.infoTitle}>{event.location.name}</Text>
                <Text style={styles.infoSubtitle}>
                  {event.location.type === 'online' ? 'Подключение онлайн' : 'Приходите за 10 мин до начала'}
                </Text>
                {event.location.type === 'route' && (event.location.routeStart || event.location.routeFinish) ? (
                  <Text style={styles.infoSubtitle}>
                    {event.location.routeStart ? `Старт: ${event.location.routeStart}` : ''}
                    {event.location.routeStart && event.location.routeFinish ? '\n' : ''}
                    {event.location.routeFinish ? `Финиш: ${event.location.routeFinish}` : ''}
                  </Text>
                ) : null}
              </View>
            </View>

            {event.location?.coordinates ? (
              <View style={styles.locationActions}>
                <TouchableOpacity
                  style={[styles.locBtn, styles.locBtnPrimary]}
                  onPress={buildRouteInYandexMaps}
                  activeOpacity={0.9}
                >
                  <Text style={styles.locBtnPrimaryText}>Маршрут</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.locBtn, styles.locBtnSecondary]}
                  onPress={openInYandexMaps}
                  activeOpacity={0.9}
                >
                  <Text style={styles.locBtnSecondaryText}>Открыть в Яндекс.Картах</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Text style={styles.infoEmoji}>⚡</Text>
              </View>
              <View>
                <Text style={styles.infoTitle}>Интенсивность: {event.intensity}</Text>
                <Text style={styles.infoSubtitle}>Выберите уровень, который вам комфортен</Text>
              </View>
            </View>
          </View>

          <YandexEventMap
            location={event.location}
            title="Точка встречи"
          />

          {event.paymentInstructions ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Оплата</Text>
              <Text style={styles.description}>{event.paymentInstructions}</Text>
            </View>
          ) : null}

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>О чем это?</Text>
            <Text style={styles.description}>"{event.description}"</Text>
          </View>

          {/* Instructor Card */}
          <TouchableOpacity
            style={styles.instructorCard}
            onPress={() => {
              if (event.instructor.publicId) {
                router.push(`/trainer/${event.instructor.publicId}`);
              }
            }}
            activeOpacity={event.instructor.publicId ? 0.7 : 1}
          >
            <Text style={styles.instructorLabel}>ВЕДУЩИЙ ПРОЦЕССА</Text>
            <View style={styles.instructorInfo}>
              <Avatar
                source={event.instructor.avatar}
                size={64}
                style={styles.instructorAvatar}
              />
              <View style={styles.instructorDetails}>
                <Text style={styles.instructorName}>{event.instructor.name}</Text>
                <View style={styles.instructorMeta}>
                  <Text style={styles.instructorRole}>Инструктор</Text>
                  <Text style={styles.instructorDot}>•</Text>
                  <Text style={styles.instructorRating}>
                    {event.instructor.rating > 0 ? `${event.instructor.rating} ★` : '—'}
                  </Text>
                </View>
              </View>
              {event.instructor.publicId && (
                <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Safety Notice */}
          <View style={styles.safetyCard}>
            <Text style={styles.safetyTitle}>Безопасность и комфорт</Text>
            <Text style={styles.safetyText}>
              Мы проверили локацию и мастера. Если вам станет некомфортно, вы
              можете покинуть занятие в любой момент без объяснения причин.
            </Text>
            {!isOrganizerOwnEvent && (
              <TouchableOpacity
                style={{ marginTop: 12 }}
                onPress={() => router.push({ pathname: '/complaint', params: { targetType: 'event', targetId: event.id, targetName: event.title } })}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>
                  Пожаловаться
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Participants */}
          {event.participants.length > 0 && (
            <View style={styles.participantsSection}>
              <Text style={styles.participantsTitle}>Уже идут:</Text>
              <View style={styles.participantsRow}>
                <AvatarGroup
                  avatars={event.participants.map((p) => ({
                    source: p.avatar,
                    name: p.name,
                  }))}
                  max={5}
                  size={36}
                />
                <Text style={styles.participantsCount}>
                  {event.spotsTaken}/{event.spotsTotal} мест занято
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
        {isOrganizerOwnEvent ? (
          <View style={styles.bookedContainer}>
            <Button
              title="Управление событием"
              onPress={() => router.push(`/organizer-event/${event.id}`)}
              variant="accent"
              size="lg"
              fullWidth
            />
          </View>
        ) : activeBooking ? (
          <View style={styles.bookedContainer}>
            <View style={styles.bookedBadge}>
              <Text style={styles.bookedBadgeText}>✓ Вы записаны</Text>
            </View>
            {eventHasStarted && !canStillCancel ? (
              <View style={styles.eventStartedNotice}>
                <Text style={styles.eventStartedText}>
                  Событие идёт. Отмена записи недоступна.
                </Text>
              </View>
            ) : (
              <Button
                title={eventHasStarted ? "Отменить запись (со штрафом)" : "Отменить запись"}
                onPress={handleTryCancelBooking}
                variant="secondary"
                size="lg"
                fullWidth
              />
            )}
          </View>
        ) : activeOffer ? (
          <View style={styles.bookedContainer}>
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>🎉 Освободилось место!</Text>
            </View>
            <Button
              title="Подтвердить участие"
              onPress={() =>
                router.push({
                  pathname: '/waiting',
                  params: { eventId: event.id, mode: 'offered', waitingEntryId: activeOffer.id },
                })
              }
              variant="accent"
              size="lg"
              fullWidth
            />
          </View>
        ) : isInWaitingList ? (
          <View style={styles.bookedContainer}>
            <View style={styles.queueBadge}>
              <Text style={styles.queueBadgeText}>⏳ Вы в очереди</Text>
            </View>
            <Button
              title="Выйти из очереди"
              onPress={handleLeaveWaitingList}
              variant="secondary"
              size="lg"
              fullWidth
            />
          </View>
        ) : event.isFull ? (
          canJoinWaitingList ? (
            <Button
              title="Встать в очередь"
              onPress={handleJoinWaitingList}
              variant="secondary"
              size="lg"
              fullWidth
            />
          ) : (
            <View style={styles.fullNotice}>
              <Text style={styles.fullNoticeText}>
                Все места заняты. Оформите подписку, чтобы встать в очередь.
              </Text>
              <Button
                title="Узнать о подписке"
                onPress={() => {
                  if (process.env.EXPO_PUBLIC_DISABLE_SUBSCRIPTIONS === 'true') {
                    Alert.alert(
                      'Подписки временно отключены',
                      'Очередь ожидания уже доступна. Обновите экран и попробуйте снова.'
                    );
                    return;
                  }
                  router.push('/paywall');
                }}
                variant="accent"
                size="md"
                fullWidth
              />
            </View>
          )
        ) : eventHasStarted ? (
          <View style={styles.eventStartedNotice}>
            <Text style={styles.eventStartedText}>
              Событие уже началось. Запись недоступна.
            </Text>
          </View>
        ) : (
          <Button
            title="Присоединиться к группе"
            onPress={handleBook}
            variant="accent"
            size="lg"
            fullWidth
          />
        )}
      </SafeAreaView>

      <CancelBookingModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleCancelBooking}
        eventTitle={event.title}
      />
    </View>
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
  heroContainer: {
    position: 'relative',
    height: 280,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: spacing.lg,
    width: 40,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  backIcon: {
    fontSize: fontSize.xl,
    color: colors.text,
  },
  content: {
    marginTop: -40,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  price: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: 38,
  },
  vibeContainer: {
    marginBottom: spacing.xl,
    marginHorizontal: -spacing.lg,
  },
  vibeContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  vibeTag: {
    backgroundColor: colors.neutralMuted,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  vibeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textLight,
  },
  infoSection: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoEmoji: {
    fontSize: fontSize.xl,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  infoSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  descriptionSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textLight,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  instructorCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral,
    marginBottom: spacing.xl,
  },
  instructorLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  instructorAvatar: {
    borderRadius: borderRadius.lg,
  },
  instructorDetails: {
    flex: 1,
  },
  instructorName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  instructorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  instructorRole: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  instructorDot: {
    marginHorizontal: spacing.xs,
    color: colors.textMuted,
  },
  instructorRating: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  safetyCard: {
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accentLight,
    marginBottom: spacing.xl,
  },
  safetyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  safetyText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    lineHeight: 20,
  },
  participantsSection: {
    marginBottom: spacing.lg,
  },
  participantsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  participantsCount: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  bottomContainer: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.neutralMuted,
  },
  fullNotice: {
    gap: spacing.md,
  },
  fullNoticeText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
  },
  bookedContainer: {
    gap: spacing.md,
  },
  bookedBadge: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  bookedBadgeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  queueBadge: {
    backgroundColor: colors.accentLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  queueBadgeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  offerBadge: {
    backgroundColor: colors.warning + '1A',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning + '66',
  },
  offerBadgeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  eventStartedNotice: {
    backgroundColor: colors.neutralMuted,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  eventStartedText: {
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
  notFoundContainer: {
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
