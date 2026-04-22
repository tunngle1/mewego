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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { BanAppealStatus } from '../../src/types';
import { useTheme } from '../../src/contexts/ThemeContext';

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU');
};

const getStatusLabel = (status: BanAppealStatus): string => {
  switch (status) {
    case 'pending':
      return 'На рассмотрении';
    case 'approved':
      return 'Одобрено';
    case 'rejected':
      return 'Отклонено';
    default:
      return status;
  }
};

const getStatusVariant = (status: BanAppealStatus): 'warning' | 'success' | 'default' => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'default';
    default:
      return 'default';
  }
};

export default function AdminBanAppealDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAdminBanAppeals, resolveBanAppealAsync, adminLoading } = useAppStore();

  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const appeal = useMemo(() => getAdminBanAppeals().find((a) => a.id === id), [getAdminBanAppeals, id]);

  const [modalVisible, setModalVisible] = useState(false);
  const [targetStatus, setTargetStatus] = useState<BanAppealStatus>('approved');
  const [adminResponse, setAdminResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!appeal) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundTitle}>Заявка не найдена</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const openResolveModal = (status: BanAppealStatus) => {
    setTargetStatus(status);
    setAdminResponse('');
    setModalVisible(true);
  };

  const handleResolve = async () => {
    if (!adminResponse.trim()) {
      Alert.alert('Ошибка', 'Ответ администратора обязателен');
      return;
    }

    Alert.alert(
      targetStatus === 'approved' ? 'Одобрить' : 'Отклонить',
      targetStatus === 'approved'
        ? 'Одобрить заявку и разбанить пользователя?'
        : 'Отклонить заявку?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: targetStatus === 'approved' ? 'Одобрить' : 'Отклонить',
          style: targetStatus === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            setSubmitting(true);
            const finalStatus = targetStatus === 'approved' ? 'approved' : 'rejected';
            const result = await resolveBanAppealAsync(appeal.id, finalStatus, adminResponse.trim());
            setSubmitting(false);
            if (result) {
              setModalVisible(false);
              Alert.alert('Готово', 'Заявка обновлена', [{ text: 'OK', onPress: () => router.back() }]);
            } else {
              Alert.alert('Ошибка', 'Не удалось обновить заявку');
            }
          },
        },
      ]
    );
  };

  const isPending = appeal.status === 'pending';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Обжалование</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Заявка</Text>
            <Badge label={getStatusLabel(appeal.status)} variant={getStatusVariant(appeal.status)} size="sm" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Пользователь</Text>
            <Text style={styles.value}>{appeal.user?.name || appeal.userId}</Text>
            <Text style={styles.valueMuted}>{appeal.user?.phone || appeal.user?.telegramId || '—'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Сообщение</Text>
            <Text style={styles.value}>{appeal.userMessage}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Даты</Text>
            <Text style={styles.valueMuted}>Создана: {formatDateTime(appeal.createdAt)}</Text>
            <Text style={styles.valueMuted}>Обновлена: {formatDateTime(appeal.updatedAt)}</Text>
            <Text style={styles.valueMuted}>Решена: {formatDateTime(appeal.resolvedAt)}</Text>
          </View>

          {appeal.adminResponse ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ответ администратора</Text>
              <Text style={styles.value}>{appeal.adminResponse}</Text>
            </View>
          ) : null}
        </View>

        {isPending && (
          <View style={{ gap: spacing.sm }}>
            <TouchableOpacity style={styles.approveButton} onPress={() => openResolveModal('approved')} disabled={adminLoading}>
              <Text style={styles.actionButtonTextWhite}>Одобрить (разбан)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectButton} onPress={() => openResolveModal('rejected')} disabled={adminLoading}>
              <Text style={styles.actionButtonTextWhite}>Отклонить</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{targetStatus === 'approved' ? 'Одобрить заявку' : 'Отклонить заявку'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ответ администратора (обязательно)"
              placeholderTextColor={colors.textMuted}
              value={adminResponse}
              onChangeText={setAdminResponse}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setModalVisible(false);
                  setAdminResponse('');
                }}
              >
                <Text style={styles.actionButtonTextDark}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleResolve}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.actionButtonTextWhite}>Сохранить</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  value: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  valueMuted: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  approveButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  rejectButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionButtonTextWhite: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  actionButtonTextDark: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  notFoundEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  notFoundTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  backLink: {
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.sm,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.neutralLight,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  modalButton: {
    width: '100%',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.surface,
  },
  modalButtonConfirm: {
    backgroundColor: colors.accent,
  },
});
