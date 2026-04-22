import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Badge } from '../../src/components/ui/Badge';
import { useAppStore } from '../../src/store/useAppStore';
import { CancelBookingModal } from '../../src/components/CancelBookingModal';
import { Booking, Event, WaitingOffer } from '../../src/types';

export default function BookingsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { 
    bookings, 
    events, 
    user, 
    leaveWaitingList, 
    waitingOffers,
    fetchMyBookings,
    refreshGamification,
    cancelBookingAsync,
    bookingsLoading,
    organizerEvents,
    fetchOrganizerEvents,
    finishOrganizerEventAsync,
  } = useAppStore();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'organizing' | 'participating'>('participating');

  const canSeeOrganizerFeatures = user?.role === 'organizer' || user?.role === 'superadmin';

  useEffect(() => {
    if (canSeeOrganizerFeatures) {
      setViewMode('organizing');
    }
  }, [canSeeOrganizerFeatures]);

  useEffect(() => {
    fetchMyBookings();
  }, []);

  useEffect(() => {
    if (canSeeOrganizerFeatures) {
      fetchOrganizerEvents();
    }
  }, [canSeeOrganizerFeatures, fetchOrganizerEvents]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyBookings();
    if (canSeeOrganizerFeatures) {
      await fetchOrganizerEvents();
    }
    await refreshGamification();
    setRefreshing(false);
  }, [fetchMyBookings, fetchOrganizerEvents, refreshGamification, canSeeOrganizerFeatures]);

  const activeBookings = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'pending'
  );

  const queuedEvents: Event[] = user
    ? events.filter((e) => e.waitingList?.some((w) => w.userId === user.id))
    : [];

  const pendingOffers: (WaitingOffer & { event: Event })[] = user
    ? waitingOffers
        .filter((o) => o.userId === user.id && o.status === 'pending')
        .map((o) => {
          const event = events.find((e) => e.id === o.eventId);
          return event ? { ...o, event } : null;
        })
        .filter((o): o is WaitingOffer & { event: Event } => o !== null)
    : [];

  const handleFindEvent = () => {
    router.push('/(tabs)/explore');
  };

  const handleOpenCancelModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async (reason: string, comment?: string) => {
    if (!selectedBooking) return;
    await cancelBookingAsync(selectedBooking.id, reason, comment);
    setCancelModalVisible(false);
    setSelectedBooking(null);
  };

  const handleLeaveQueue = async (eventId: string) => {
    leaveWaitingList(eventId);
  };

  const canFinishOrganizerEvent = (e: any) => {
    if (e.status !== 'approved') return false;
    const now = new Date();
    const start = new Date(e.startAt);
    const end = e.endAt ? new Date(e.endAt) : new Date(start.getTime() + (e.durationMin || 60) * 60 * 1000);
    return now >= end;
  };

  const getOrganizerPhase = (e: any): 'upcoming' | 'ongoing' | 'ended' => {
    const now = new Date();
    const start = new Date(e.startAt);
    const end = e.endAt ? new Date(e.endAt) : new Date(start.getTime() + (e.durationMin || 60) * 60 * 1000);
    if (now < start) return 'upcoming';
    if (now >= start && now < end) return 'ongoing';
    return 'ended';
  };

  const isParticipatingEmpty =
    pendingOffers.length === 0 && queuedEvents.length === 0 && activeBookings.length === 0;
  const isOrganizingEmpty = organizerEvents.length === 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    header: {
      marginBottom: spacing.xl,
      marginTop: spacing.sm,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    bookingsList: {
      gap: spacing.md,
    },
    bookingCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    bookingHeader: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    bookingTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    bookingMeta: {
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    metaIcon: {
      fontSize: fontSize.md,
    },
    metaText: {
      fontSize: fontSize.sm,
      color: colors.textLight,
    },
    bookingFooter: {
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.neutralMuted,
    },
    cancelButton: {
      alignSelf: 'flex-start',
    },
    cancelButtonText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.accent,
    },
    tipsCard: {
      flexDirection: 'row',
      backgroundColor: colors.primaryLight,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginTop: spacing.xl,
      borderWidth: 1,
      borderColor: colors.primaryLight,
      gap: spacing.sm,
    },
    tipsIcon: {
      fontSize: fontSize.lg,
    },
    tipsContent: {
      flex: 1,
    },
    tipsTitle: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.primary,
      marginBottom: spacing.xs,
    },
    tipsText: {
      fontSize: fontSize.xs,
      color: colors.textLight,
      lineHeight: 16,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: colors.neutralMuted,
      borderRadius: borderRadius.xxl,
      padding: 4,
    },
    segmentItem: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.xxl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentItemActive: {
      backgroundColor: colors.white,
      ...shadows.sm,
    },
    segmentText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
    },
    segmentTextActive: {
      color: colors.text,
    },
  });

  const Toggle = canSeeOrganizerFeatures ? (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segmentItem, viewMode === 'organizing' && styles.segmentItemActive]}
          onPress={() => setViewMode('organizing')}
          activeOpacity={0.85}
        >
          <Text style={[styles.segmentText, viewMode === 'organizing' && styles.segmentTextActive]}>Я организую</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentItem, viewMode === 'participating' && styles.segmentItemActive]}
          onPress={() => setViewMode('participating')}
          activeOpacity={0.85}
        >
          <Text style={[styles.segmentText, viewMode === 'participating' && styles.segmentTextActive]}>Я участвую</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        <View style={styles.header}>
          <Text style={styles.title}>Мои тренировки</Text>
        </View>

        {Toggle}

        {viewMode === 'participating' && isParticipatingEmpty && !bookingsLoading ? (
          <EmptyState
            icon="🗓️"
            title="Ваше расписание пусто"
            description="Вы еще не записались ни на одно занятие. Самое время выбрать тренировку."
            actionLabel="Найти событие"
            onAction={handleFindEvent}
          />
        ) : null}

        {viewMode === 'organizing' && isOrganizingEmpty && !bookingsLoading ? (
          <EmptyState
            icon="🗓️"
            title="Пока нет событий"
            description="Создайте событие, и оно появится здесь."
            actionLabel="Создать событие"
            onAction={() => router.push('/(organizer)/dashboard')}
          />
        ) : null}

        {viewMode === 'organizing' && canSeeOrganizerFeatures && organizerEvents.length > 0 && (
          <View style={{ marginBottom: spacing.xl }}>
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.bold,
                color: colors.textMuted,
                marginBottom: spacing.sm,
              }}
            >
              Я организую
            </Text>
            <View style={styles.bookingsList}>
              {organizerEvents.map((e: any) => (
                <TouchableOpacity
                  key={`org-${e.id}`}
                  style={styles.bookingCard}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/organizer-event/${e.id}`)}
                >
                  <View style={styles.bookingHeader}>
                    <Badge label={(e.movementType || 'EVENT').toUpperCase()} variant="default" size="sm" />
                    <Badge
                      label={
                        getOrganizerPhase(e) === 'ongoing'
                          ? 'Идёт'
                          : getOrganizerPhase(e) === 'ended'
                            ? 'Прошло'
                            : 'Предстоит'
                      }
                      variant={
                        getOrganizerPhase(e) === 'ongoing'
                          ? 'accent'
                          : getOrganizerPhase(e) === 'ended'
                            ? 'default'
                            : 'success'
                      }
                      size="sm"
                    />
                    <Badge
                      label={
                        e.status === 'finished'
                          ? 'Завершено'
                          : e.status === 'pending'
                            ? 'На модерации'
                            : e.hasPendingEditRequest
                              ? 'На модерации'
                            : e.status === 'approved'
                              ? 'Опубликовано'
                              : e.status
                      }
                      variant={
                        e.status === 'approved' && !e.hasPendingEditRequest
                          ? 'success'
                          : e.status === 'pending' || e.hasPendingEditRequest
                            ? 'warning'
                            : 'default'
                      }
                      size="sm"
                    />
                  </View>

                  <Text style={styles.bookingTitle}>{e.title}</Text>
                  <View style={styles.bookingMeta}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaIcon}>🕒</Text>
                      <Text style={styles.metaText}>{new Date(e.startAt).toLocaleString('ru-RU')}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaIcon}>📍</Text>
                      <Text style={styles.metaText}>{e.locationName}</Text>
                    </View>
                  </View>

                  {canFinishOrganizerEvent(e) && (
                    <View style={styles.bookingFooter}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={async (evt) => {
                          (evt as { stopPropagation?: () => void })?.stopPropagation?.();
                          const res = await finishOrganizerEventAsync(e.id);
                          if (res) {
                            await fetchOrganizerEvents();
                          }
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Завершить тренировку</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {viewMode === 'participating' && pendingOffers.length > 0 && (
          <View style={{ marginBottom: spacing.xl }}>
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.bold,
                color: colors.accent,
                marginBottom: spacing.sm,
              }}
            >
              Освободилось место!
            </Text>
            <View style={styles.bookingsList}>
              {pendingOffers.map((offer) => (
                <TouchableOpacity
                  key={`offer-${offer.id}`}
                  style={[styles.bookingCard, { borderColor: colors.accent, borderWidth: 2 }]}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: '/waiting',
                      params: { eventId: offer.eventId, mode: 'offered', waitingEntryId: offer.id },
                    })
                  }
                >
                  <View style={styles.bookingHeader}>
                    <Badge label={offer.event.category} variant="default" size="sm" />
                    <Badge label="Предложение" variant="accent" size="sm" />
                  </View>

                  <Text style={styles.bookingTitle}>{offer.event.title}</Text>

                  <View style={styles.bookingMeta}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaIcon}>🕒</Text>
                      <Text style={styles.metaText}>
                        {offer.event.date} в {offer.event.time}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaIcon}>📍</Text>
                      <Text style={styles.metaText}>{offer.event.location.name}</Text>
                    </View>
                  </View>

                  <View style={styles.bookingFooter}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.accent }}>
                      Подтвердить участие →
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {viewMode === 'participating' && queuedEvents.length > 0 && (
          <View style={{ marginBottom: spacing.xl }}>
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.bold,
                color: colors.textMuted,
                marginBottom: spacing.sm,
              }}
            >
              В очереди
            </Text>
            <View style={styles.bookingsList}>
              {queuedEvents.map((event) => (
                <TouchableOpacity
                  key={`queue-${event.id}`}
                  style={styles.bookingCard}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/event/${event.id}`)}
                >
                  <View style={styles.bookingHeader}>
                    <Badge label={event.category} variant="default" size="sm" />
                    <Badge label="Очередь" variant="warning" size="sm" />
                  </View>

                  <Text style={styles.bookingTitle}>{event.title}</Text>

                  <View style={styles.bookingMeta}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaIcon}>🕒</Text>
                      <Text style={styles.metaText}>
                        {event.date} в {event.time}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaIcon}>📍</Text>
                      <Text style={styles.metaText}>{event.location.name}</Text>
                    </View>
                  </View>

                  <View style={styles.bookingFooter}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={(e) => {
                        (e as { stopPropagation?: () => void })?.stopPropagation?.();
                        handleLeaveQueue(event.id);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Выйти из очереди</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {viewMode === 'participating' && (
          <View style={styles.bookingsList}>
            {activeBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={styles.bookingCard}
                activeOpacity={0.9}
                onPress={() => router.push(`/event/${booking.eventId}`)}
              >
                <View style={styles.bookingHeader}>
                  <Badge label={booking.event.category.toUpperCase()} variant="default" size="sm" />
                  {(booking.status === 'confirmed' || booking.status === 'attended' || booking.status === 'no_show') &&
                  booking.viewerPhase ? (
                    <Badge
                      label={
                        booking.viewerPhase === 'ongoing'
                          ? 'Идёт'
                          : booking.viewerPhase === 'ended'
                            ? 'Прошло'
                            : 'Предстоит'
                      }
                      variant={
                        booking.viewerPhase === 'ongoing'
                          ? 'accent'
                          : booking.viewerPhase === 'ended'
                            ? booking.status === 'attended'
                              ? 'accent'
                              : 'default'
                            : 'success'
                      }
                      size="sm"
                    />
                  ) : (
                    <Badge
                      label={booking.status === 'confirmed' ? 'Подтверждено' : 'Ожидает'}
                      variant={booking.status === 'confirmed' ? 'success' : 'warning'}
                      size="sm"
                    />
                  )}
                </View>

                <Text style={styles.bookingTitle}>{booking.event.title}</Text>

                <View style={styles.bookingMeta}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaIcon}>🕒</Text>
                    <Text style={styles.metaText}>
                      {booking.event.date} в {booking.event.time}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaIcon}>📍</Text>
                    <Text style={styles.metaText}>{booking.event.location.name}</Text>
                  </View>
                </View>

                <View style={styles.bookingFooter}>
                  {booking.status === 'confirmed' && booking.eventStatus !== 'finished' && booking.eventStatus !== 'canceled' && (
                    <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/check-in',
                            params: { eventId: booking.eventId, bookingId: booking.id },
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.cancelButtonText, { color: colors.primary }]}>Чек-ин (QR/код)</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {booking.status === 'attended' && booking.eventStatus === 'finished' && (
                    <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/review-event',
                            params: { eventId: booking.eventId },
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.cancelButtonText, { color: colors.text }]}>Оставить отзыв</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={(e) => {
                      (e as { stopPropagation?: () => void })?.stopPropagation?.();
                      handleOpenCancelModal(booking);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Отменить запись</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsIcon}>💡</Text>
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>ME·WE·GO СОВЕТ</Text>
            <Text style={styles.tipsText}>
              Не волнуйтесь, если передумаете. Мы возвращаем полную стоимость при
              отмене за 12 часов.
            </Text>
          </View>
        </View>
      </ScrollView>

      <CancelBookingModal
        visible={cancelModalVisible}
        onClose={() => {
          setCancelModalVisible(false);
          setSelectedBooking(null);
        }}
        onConfirm={handleConfirmCancel}
        eventTitle={selectedBooking?.event.title}
      />
    </SafeAreaView>
  );
}
