import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { OrganizerEventStatus } from '../../src/types';

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

export default function OrganizerEventDetailScreen() {
  const router = useRouter();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const {
    organizerEvents,
    organizerLoading,
    organizerError,
    fetchOrganizerEventById,
    cancelOrganizerEvent,
    updateOrganizerEvent,
    finishOrganizerEventAsync,
  } = useAppStore();

  const event = organizerEvents.find((e) => e.id === id);

  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event?.title || '');
  const [editDescription, setEditDescription] = useState(event?.description || '');

  useEffect(() => {
    if (edit === '1') {
      setIsEditing(true);
    }
  }, [edit]);

  useEffect(() => {
    if (id && !event && !organizerLoading) {
      fetchOrganizerEventById(id);
    }
  }, [id, event, organizerLoading, fetchOrganizerEventById]);

  if (organizerLoading && !event) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ fontSize: fontSize.md, color: colors.textMuted, marginTop: 12 }}>
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: fontSize.lg, color: colors.textMuted }}>
            {organizerError ? organizerError : 'Событие не найдено'}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: colors.accent, marginTop: 16 }}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleEdit = () => {
    router.push({
      pathname: '/organizer-event/create',
      params: { editId: event.id },
    });
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Ошибка', 'Название не может быть пустым');
      return;
    }
    
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    
    updateOrganizerEvent(event.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
    });
    
    setLoading(false);
    setIsEditing(false);
    Alert.alert('Сохранено', 'Изменения успешно сохранены');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(event.title);
    setEditDescription(event.description);
  };

  const handleCancel = () => {
    if (event.status === 'canceled' || event.status === 'finished') {
      Alert.alert('Невозможно отменить', 'Это событие уже завершено или отменено');
      return;
    }
    
    Alert.alert(
      'Отменить событие',
      'Вы уверены? Все участники получат уведомление об отмене.',
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Да, отменить',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await new Promise((r) => setTimeout(r, 1000));
            cancelOrganizerEvent(event.id);
            setLoading(false);
            Alert.alert('Событие отменено', 'Участники получат уведомление', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  };

  const handleViewParticipants = () => {
    router.push(`/organizer-event/${id}/participants`);
  };

  const handleOpenCheckIn = () => {
    if (!id) return;
    router.push(`/organizer-event/${id}/check-in`);
  };

  const canFinishEvent = () => {
    if (event.status !== 'approved') return false;
    const now = new Date();
    const eventEndAt = event.endAt 
      ? new Date(event.endAt) 
      : new Date(new Date(event.startAt).getTime() + (event.durationMin || 60) * 60 * 1000);
    return now >= eventEndAt;
  };

  const handleFinish = () => {
    if (!canFinishEvent()) {
      Alert.alert('Рано завершать', 'Событие можно завершить только после его окончания');
      return;
    }
    
    Alert.alert(
      'Завершить событие',
      'После завершения участники смогут подтвердить своё присутствие в течение 24 часов.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Завершить',
          onPress: async () => {
            setLoading(true);
            const result = await finishOrganizerEventAsync(event.id);
            setLoading(false);
            if (result) {
              Alert.alert(
                'Событие завершено',
                `Участников: ${result.stats?.joinedCount || 0}. Они получат уведомление о подтверждении присутствия.`,
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert('Ошибка', 'Не удалось завершить событие');
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMuted,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    backIcon: {
      fontSize: fontSize.xl,
      color: colors.text,
    },
    headerTitle: {
      flex: 1,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginRight: 40,
    },
    content: {
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      flex: 1,
      marginRight: spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    infoIcon: {
      fontSize: fontSize.lg,
    },
    infoText: {
      fontSize: fontSize.lg,
      color: colors.textMuted,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.neutralMuted,
      marginTop: spacing.md,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    statLabel: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    actionButton: {
      backgroundColor: colors.accent,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
      ...shadows.sm,
    },
    actionButtonText: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.white,
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    secondaryButton: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      marginBottom: spacing.sm,
    },
    secondaryButtonText: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    dangerButton: {
      paddingVertical: spacing.md,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerButtonText: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.accent,
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    successButton: {
      backgroundColor: colors.success,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    successButtonText: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.white,
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    description: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      marginBottom: spacing.md,
      lineHeight: 20,
    },
    editInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      marginRight: spacing.sm,
    },
    editTextArea: {
      minHeight: 80,
      textAlignVertical: 'top',
      marginRight: 0,
      marginBottom: spacing.md,
    },
    revenueRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.neutralMuted,
      marginTop: spacing.md,
    },
    revenueLabel: {
      fontSize: fontSize.md,
      color: colors.textMuted,
    },
    revenueValue: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.primary,
    },
  });

  const getStatusVariant = (status: OrganizerEventStatus) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'draft':
        return 'default';
      case 'rejected':
        return 'accent';
      case 'canceled':
        return 'default';
      case 'finished':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: OrganizerEventStatus) => {
    switch (status) {
      case 'approved':
        return 'Опубликовано';
      case 'pending':
        return 'На модерации';
      case 'draft':
        return 'Черновик';
      case 'rejected':
        return 'Отклонено';
      case 'canceled':
        return 'Отменено';
      case 'finished':
        return 'Завершено';
      default:
        return status;
    }
  };

  const getPriceLabel = () => {
    if (event.priceType === 'free') return 'Бесплатно';
    if (event.priceType === 'donation') return 'Донат';
    return `${event.priceValue || 0} ₽`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Редактирование' : 'Событие'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Название события"
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <Text style={styles.title}>{event.title}</Text>
            )}
            <Badge 
              label={getStatusLabel(event.status)} 
              variant={getStatusVariant(event.status) as 'default' | 'success' | 'warning' | 'accent'} 
              size="sm" 
            />
          </View>

          {isEditing ? (
            <TextInput
              style={[styles.editInput, styles.editTextArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Описание события"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          ) : (
            event.description ? (
              <Text style={styles.description}>{event.description}</Text>
            ) : null
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>
              {formatEventDate(event.startAt)}, {formatEventTime(event.startAt)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText}>
              {event.locationName || 'Не указано'}
              {event.locationAddress ? `, ${event.locationAddress}` : ''}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>💰</Text>
            <Text style={styles.infoText}>{getPriceLabel()}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>⏱</Text>
            <Text style={styles.infoText}>{event.durationMin} мин</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>{event.visibility === 'private' ? '🔒' : '🌍'}</Text>
            <Text style={styles.infoText}>
              {event.visibility === 'private' ? 'Приватное' : 'Публичное'}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{event.participantsJoinedCount}</Text>
              <Text style={styles.statLabel}>Записано</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{event.capacity || '∞'}</Text>
              <Text style={styles.statLabel}>Всего мест</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {event.capacity ? event.capacity - event.participantsJoinedCount : '∞'}
              </Text>
              <Text style={styles.statLabel}>Свободно</Text>
            </View>
          </View>

          {event.revenueTotal > 0 && (
            <View style={styles.revenueRow}>
              <Text style={styles.revenueLabel}>Выручка:</Text>
              <Text style={styles.revenueValue}>{event.revenueTotal} ₽</Text>
            </View>
          )}
        </View>

        {/* Private event invite section */}
        {event.visibility === 'private' && (event.inviteCode || event.inviteLinkToken) && (
          <View style={styles.card}>
            <Text style={[styles.title, { fontSize: fontSize.lg, marginBottom: spacing.md }]}>
              🔐 Приглашение
            </Text>
            
            {event.inviteCode && (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.infoText}>Код доступа:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
                  <View style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderRadius: borderRadius.lg,
                    padding: spacing.md,
                    borderWidth: 1,
                    borderColor: colors.neutralLight,
                  }}>
                    <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, letterSpacing: 2 }}>
                      {event.inviteCode}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      marginLeft: spacing.sm,
                      backgroundColor: colors.accent,
                      borderRadius: borderRadius.lg,
                      padding: spacing.md,
                    }}
                    onPress={async () => {
                      await Clipboard.setStringAsync(event.inviteCode!);
                      Alert.alert('Скопировано', 'Код скопирован в буфер');
                    }}
                  >
                    <Text style={{ color: colors.white, fontWeight: fontWeight.bold }}>Копировать</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {event.inviteLinkToken && (
              <TouchableOpacity
                style={[styles.secondaryButton, { marginBottom: 0 }]}
                onPress={async () => {
                  const inviteUrl = `mewego://invite/${event.inviteLinkToken}`;
                  try {
                    await Share.share({
                      message: `Присоединяйся к событию "${event.title}"!\n\nКод: ${event.inviteCode || '—'}\nСсылка: ${inviteUrl}`,
                    });
                  } catch (e) {
                    Alert.alert('Ошибка', 'Не удалось поделиться');
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>📤 Поделиться приглашением</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.infoText, { marginTop: spacing.md, fontSize: fontSize.xs }]}>
              Поделитесь кодом или ссылкой, чтобы участники могли получить доступ
            </Text>
          </View>
        )}

        {isEditing ? (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSaveEdit}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.actionButtonText}>Сохранить</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCancelEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Отмена</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewParticipants}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>
                Участники ({event.participantsJoinedCount})
              </Text>
            </TouchableOpacity>

            {event.status !== 'finished' && event.status !== 'canceled' ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleOpenCheckIn}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>📷 QR для чек-ина</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Редактировать</Text>
            </TouchableOpacity>

            {event.status === 'approved' && canFinishEvent() && (
              <TouchableOpacity
                style={styles.successButton}
                onPress={handleFinish}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.successButtonText}>
                  {loading ? 'Завершение...' : '✓ Завершить событие'}
                </Text>
              </TouchableOpacity>
            )}

            {event.status !== 'canceled' && event.status !== 'finished' && (
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleCancel}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.dangerButtonText}>
                  {loading ? 'Отмена...' : 'Отменить событие'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
