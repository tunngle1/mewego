import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { useTheme } from '../../src/contexts/ThemeContext';

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate();
  const months = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 
                  'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${months[date.getMonth()]}, ${hours}:${minutes}`;
};

const getReasonLabel = (reason: string): string => {
  switch (reason) {
    case 'unsafe': return 'Небезопасно';
    case 'fraud': return 'Мошенничество';
    case 'other': return 'Другое';
    default: return reason;
  }
};

const getTargetTypeLabel = (type: string): string => {
  switch (type) {
    case 'event': return 'Событие';
    case 'organizer': return 'Организатор';
    case 'user': return 'Пользователь';
    default: return type;
  }
};

export default function AdminComplaintDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const { adminComplaints, closeComplaintAsync, resolveComplaintAsync } = useAppStore();

  const complaint = adminComplaints.find((c) => c.id === id);
  const [loading, setLoading] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [pendingAction, setPendingAction] = useState<
    'dismiss' | 'freeze' | 'ban' | 'unpublish_event' | 'reject_event' | 'delete_event' | null
  >(null);
  const [pendingTitle, setPendingTitle] = useState<string>('');

  if (!complaint) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundTitle}>Жалоба не найдена</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleClose = () => {
    Alert.alert(
      'Закрыть жалобу',
      'Вы уверены, что хотите закрыть эту жалобу?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Закрыть',
          onPress: async () => {
            setLoading(true);
            const result = await closeComplaintAsync(complaint.id);
            setLoading(false);
            if (result) {
              Alert.alert('Готово', 'Жалоба закрыта', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } else {
              Alert.alert('Ошибка', 'Не удалось закрыть жалобу');
            }
          },
        },
      ]
    );
  };

  const isOpen = complaint.status === 'open';

  const canModerateTargetUser = complaint.targetType === 'user' || complaint.targetType === 'organizer';
  const canModerateEvent = complaint.targetType === 'event';

  const handleOpenReporter = () => {
    router.push(`/admin-user/${complaint.reporterId}`);
  };

  const handleOpenOrganizer = () => {
    if (complaint.targetType !== 'event') return;
    if (!complaint.targetOrganizerId) return;
    router.push(`/admin-user/${complaint.targetOrganizerId}`);
  };

  const handleOpenTarget = () => {
    if (complaint.targetType === 'event') {
      router.push(`/admin-event/${complaint.targetId}`);
      return;
    }
    router.push(`/admin-user/${complaint.targetId}`);
  };

  const buildDefaultNote = () => `Жалоба (${getReasonLabel(complaint.reason)}): ${complaint.description || ''}`.trim();

  const handleResolve = (
    action: 'dismiss' | 'freeze' | 'ban' | 'unpublish_event' | 'reject_event' | 'delete_event'
  ) => {
    const title =
      action === 'dismiss'
        ? 'Закрыть без действий'
        : action === 'freeze'
          ? 'Заморозить'
          : action === 'ban'
            ? 'Забанить'
            : action === 'unpublish_event'
              ? 'Снять с публикации'
              : action === 'reject_event'
                ? 'Отклонить событие'
                : 'Удалить событие';

    const confirm =
      action === 'dismiss'
        ? 'Закрыть жалобу без действий?'
        : action === 'freeze' || action === 'ban'
          ? `${title} пользователя по этой жалобе?`
          : action === 'unpublish_event'
            ? 'Снять событие с публикации (сделать приватным) и закрыть жалобу?'
            : action === 'reject_event'
              ? 'Отклонить событие и закрыть жалобу?'
              : 'Удалить событие и закрыть жалобу? Это действие необратимо.';

    const submit = async (noteValue?: string) => {
      setLoading(true);
      const note = (noteValue || '').trim() || buildDefaultNote();
      const updated = await resolveComplaintAsync(complaint.id, { action, note });
      setLoading(false);
      if (updated) {
        Alert.alert('Готово', 'Решение сохранено', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        Alert.alert('Ошибка', 'Не удалось применить решение');
      }
    };

    Alert.alert(title, confirm, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Продолжить',
        style: action === 'dismiss' ? 'default' : 'destructive',
        onPress: () => {
          setPendingAction(action);
          setPendingTitle(title);
          setNoteDraft(buildDefaultNote());
          setNoteModalVisible(true);
        },
      },
    ]);
  };

  const handleSubmitNote = async () => {
    if (!pendingAction) {
      setNoteModalVisible(false);
      return;
    }
    const action = pendingAction;
    setNoteModalVisible(false);
    await (async () => {
      setLoading(true);
      const note = (noteDraft || '').trim() || buildDefaultNote();
      const updated = await resolveComplaintAsync(complaint.id, { action, note });
      setLoading(false);
      if (updated) {
        Alert.alert('Готово', 'Решение сохранено', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        Alert.alert('Ошибка', 'Не удалось применить решение');
      }
    })();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Modal visible={noteModalVisible} transparent animationType="fade" onRequestClose={() => setNoteModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <Pressable style={styles.modalBackdrop} onPress={() => setNoteModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{pendingTitle || 'Комментарий'}</Text>
            <Text style={styles.modalSubtitle}>Комментарий администратора (сохранится в решении)</Text>
            <TextInput
              style={styles.modalInput}
              value={noteDraft}
              onChangeText={setNoteDraft}
              multiline
              placeholder="Комментарий"
              placeholderTextColor={colors.textMuted}
              editable={!loading}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setNoteModalVisible(false)}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleSubmitNote}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.modalConfirmText}>Подтвердить</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Жалоба</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.typeInfo}>
              <Text style={styles.typeEmoji}>
                {complaint.targetType === 'event' ? '📅' : 
                 complaint.targetType === 'organizer' ? '👤' : '🙋'}
              </Text>
              <Text style={styles.typeText}>
                {getTargetTypeLabel(complaint.targetType)}
              </Text>
            </View>
            <Badge 
              label={complaint.status === 'open' ? 'Открыта' : 'Закрыта'} 
              variant={complaint.status === 'open' ? 'warning' : 'default'} 
              size="sm" 
            />
          </View>

          <View style={styles.reasonBadge}>
            <Text style={styles.reasonText}>{getReasonLabel(complaint.reason)}</Text>
          </View>

          {complaint.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Описание</Text>
              <Text style={styles.description}>{complaint.description}</Text>
            </View>
          )}

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Информация</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID цели:</Text>
              <Text style={styles.infoValue}>{complaint.targetId}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Автор жалобы:</Text>
              <Text style={styles.infoValue}>
                {complaint.reporterName || complaint.reporterId}
              </Text>
            </View>

            <View style={styles.linksRow}>
              <TouchableOpacity style={styles.linkButton} onPress={handleOpenReporter} activeOpacity={0.85}>
                <Text style={styles.linkButtonText}>Профиль автора</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton} onPress={handleOpenTarget} activeOpacity={0.85}>
                <Text style={styles.linkButtonText}>
                  {complaint.targetType === 'event' ? 'Открыть событие' : 'Профиль цели'}
                </Text>
              </TouchableOpacity>
            </View>

            {complaint.targetType === 'event' && complaint.targetOrganizerId ? (
              <View style={styles.linksRow}>
                <TouchableOpacity style={styles.linkButton} onPress={handleOpenOrganizer} activeOpacity={0.85}>
                  <Text style={styles.linkButtonText}>
                    Организатор{complaint.targetOrganizerName ? `: ${complaint.targetOrganizerName}` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Создана:</Text>
              <Text style={styles.infoValue}>{formatDate(complaint.createdAt)}</Text>
            </View>

            {complaint.closedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Закрыта:</Text>
                <Text style={styles.infoValue}>{formatDate(complaint.closedAt)}</Text>
              </View>
            )}
          </View>
        </View>

        {isOpen && (
          <View style={styles.actions}>
            {canModerateEvent ? (
              <>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => handleResolve('unpublish_event')}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Снять с публикации</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => handleResolve('reject_event')}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Отклонить событие</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dangerButton}
                  onPress={() => handleResolve('delete_event')}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.dangerButtonText}>Удалить событие</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}
            {canModerateTargetUser ? (
              <>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => handleResolve('freeze')} disabled={loading} activeOpacity={0.8}>
                  {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.secondaryButtonText}>Заморозить</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerButton} onPress={() => handleResolve('ban')} disabled={loading} activeOpacity={0.8}>
                  {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.dangerButtonText}>Забанить</Text>}
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => handleResolve('dismiss')}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.closeButtonText}>Закрыть без действий</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!isOpen && (
          <View style={styles.statusMessage}>
            <Text style={styles.statusEmoji}>✅</Text>
            <Text style={styles.statusText}>Жалоба закрыта</Text>
            {complaint.resolutionAction ? (
              <Text style={styles.statusSubText}>
                Решение: {complaint.resolutionAction}
                {complaint.resolvedByName ? ` • ${complaint.resolvedByName}` : ''}
              </Text>
            ) : null}
            {complaint.resolutionNote ? (
              <Text style={styles.statusSubText} numberOfLines={3}>
                {complaint.resolutionNote}
              </Text>
            ) : null}
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
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  typeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reasonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  reasonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  descriptionSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },
  infoSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutralMuted,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  linksRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  linkButton: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.sm,
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  dangerButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  dangerButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  closeButton: {
    marginTop: 0,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  closeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
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
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statusSubText: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalSubtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  modalInput: {
    marginTop: spacing.md,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceMuted,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutralLight,
  },
  modalCancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
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
