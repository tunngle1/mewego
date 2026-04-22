import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAppStore } from '../src/store/useAppStore';
import { api, ApiError } from '../src/services/api';
import { BanAppeal } from '../src/types';

export default function BlockedScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { logout, updateUser } = useAppStore();
  const [rechecking, setRechecking] = useState(false);
  const [appealLoading, setAppealLoading] = useState(false);
  const [appeal, setAppeal] = useState<BanAppeal | null>(null);
  const [appealModalVisible, setAppealModalVisible] = useState(false);
  const [appealMessage, setAppealMessage] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  const params = useLocalSearchParams<{
    status?: string;
    reason?: string;
    until?: string;
  }>();

  const status = params.status || 'blocked';
  const reason = params.reason || '';
  const until = params.until || '';

  const isBanned = status === 'banned';
  const isFrozen = status === 'frozen';

  const title = isBanned ? 'Аккаунт заблокирован' : isFrozen ? 'Аккаунт заморожен' : 'Доступ ограничен';

  const subtitle = isBanned
    ? 'Вы не можете пользоваться приложением.'
    : isFrozen
      ? 'Доступ временно ограничен.'
      : 'Вы не можете продолжить.';

  const handleExit = () => {
    logout();
    router.replace('/auth');
  };

  const fetchAppeal = async () => {
    setAppealLoading(true);
    try {
      const res = await api.getMyBanAppeal();
      setAppeal(res.appeal);
    } catch (err) {
      console.error('[Blocked] getMyBanAppeal error:', err);
    } finally {
      setAppealLoading(false);
    }
  };

  useEffect(() => {
    if (isBanned) {
      fetchAppeal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBanned]);

  const handleOpenAppeal = () => {
    setAppealMessage('');
    setAppealModalVisible(true);
  };

  const handleSubmitAppeal = async () => {
    if (!appealMessage.trim()) {
      Alert.alert('Ошибка', 'Опишите причину обжалования');
      return;
    }

    setAppealSubmitting(true);
    try {
      const res = await api.createMyBanAppeal(appealMessage.trim());
      setAppeal(res.appeal);
      setAppealModalVisible(false);
      Alert.alert('Готово', 'Заявка отправлена. Ожидайте ответа администратора.');
    } catch (err) {
      Alert.alert('Ошибка', err instanceof Error ? err.message : 'Не удалось отправить заявку');
    } finally {
      setAppealSubmitting(false);
    }
  };

  const handleRecheck = async () => {
    setRechecking(true);
    try {
      const me = await api.getMe();

      // If backend returns active, let user in
      if (me?.accountStatus === 'active') {
        updateUser({
          accountStatus: 'active',
          bannedAt: undefined,
          bannedReason: undefined,
          frozenAt: undefined,
          frozenUntil: undefined,
          frozenReason: undefined,
        } as any);
        router.replace('/');
        return;
      }

      // still blocked - stay here
    } catch (err) {
      // If still blocked, backend may return 403
      if (err instanceof ApiError && err.statusCode === 403 && err.data && typeof err.data === 'object') {
        const data = err.data as any;
        if (data.status === 'frozen' || data.status === 'banned') {
          return;
        }
      }
      // otherwise force logout
      logout();
      router.replace('/auth');
    } finally {
      setRechecking(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.black,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      marginBottom: spacing.md,
      lineHeight: 22,
    },
    reasonBox: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    appealBox: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    appealStatus: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
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
      flexDirection: 'row',
      gap: spacing.sm,
    },
    modalButton: {
      flex: 1,
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
    reasonTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    reasonText: {
      fontSize: fontSize.sm,
      color: colors.text,
      lineHeight: 20,
    },
    button: {
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      backgroundColor: colors.accent,
    },
    secondaryButton: {
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.neutralLight,
    },
    buttonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    secondaryButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {(reason || until) ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonTitle}>Причина</Text>
            <Text style={styles.reasonText}>{reason || '—'}</Text>
            {until ? (
              <Text style={[styles.reasonText, { marginTop: spacing.xs }]}>
                До: {new Date(until).toLocaleString('ru-RU')}
              </Text>
            ) : null}
          </View>
        ) : null}

        {isBanned ? (
          <View style={styles.appealBox}>
            <Text style={styles.reasonTitle}>Обжалование</Text>
            {appealLoading ? (
              <ActivityIndicator />
            ) : appeal ? (
              <>
                <Text style={styles.appealStatus}>
                  Статус: {appeal.status === 'pending' ? 'на рассмотрении' : appeal.status === 'approved' ? 'одобрено' : 'отклонено'}
                </Text>
                <Text style={styles.reasonText}>Ваше сообщение: {appeal.userMessage}</Text>
                {appeal.adminResponse ? (
                  <Text style={[styles.reasonText, { marginTop: spacing.sm }]}>
                    Ответ администратора: {appeal.adminResponse}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.reasonText}>Вы можете отправить 1 заявку на пересмотр бана.</Text>
            )}
          </View>
        ) : null}

        {isFrozen ? (
          <View style={{ gap: spacing.sm }}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleRecheck} activeOpacity={0.85} disabled={rechecking}>
              {rechecking ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.secondaryButtonText}>Проверить снова</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleExit} activeOpacity={0.85}>
              <Text style={styles.buttonText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        ) : isBanned ? (
          <View style={{ gap: spacing.sm }}>
            {!appeal ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenAppeal} activeOpacity={0.85} disabled={appealLoading}>
                <Text style={styles.secondaryButtonText}>Обжаловать</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.secondaryButton} onPress={fetchAppeal} activeOpacity={0.85} disabled={appealLoading}>
                {appealLoading ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.secondaryButtonText}>Проверить статус</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.button} onPress={handleExit} activeOpacity={0.85}>
              <Text style={styles.buttonText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleExit} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Выйти</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={appealModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Обжалование бана</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Опишите, почему вы считаете бан ошибочным (1 заявка)"
              placeholderTextColor={colors.textMuted}
              value={appealMessage}
              onChangeText={setAppealMessage}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setAppealModalVisible(false);
                  setAppealMessage('');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSubmitAppeal}
                activeOpacity={0.85}
                disabled={appealSubmitting}
              >
                {appealSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Отправить</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
