import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { api } from '../../src/services/api';
import { AdminUserDetail } from '../../src/types';

const ROLE_LABELS: Record<string, string> = {
  user: 'Пользователь',
  organizer: 'Организатор',
  admin: 'Админ',
  superadmin: 'Суперадмин',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  banned: 'Забанен',
  frozen: 'Заморожен',
};

export default function AdminUserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { user: currentUser } = useAppStore();

  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [freezeModalVisible, setFreezeModalVisible] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeUntil, setFreezeUntil] = useState<Date | null>(null);
  const [showFreezeDatePicker, setShowFreezeDatePicker] = useState(false);
  const [showFreezeTimePicker, setShowFreezeTimePicker] = useState(false);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  const fetchUserDetail = async () => {
    if (!id) return;
    try {
      const data = await api.getAdminUserDetail(id);
      setUserDetail(data);
    } catch (error) {
      console.error('[AdminUserProfile] fetch error:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные пользователя');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserDetail();
  }, [id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserDetail();
  };

  const handleBan = async () => {
    if (!banReason.trim()) {
      Alert.alert('Ошибка', 'Укажите причину бана');
      return;
    }
    setActionLoading(true);
    try {
      await api.banAdminUser(id!, banReason.trim());
      setBanModalVisible(false);
      setBanReason('');
      Alert.alert('Готово', 'Пользователь забанен');
      await fetchUserDetail();
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось забанить');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnban = async () => {
    setActionLoading(true);
    try {
      await api.unbanAdminUser(id!);
      Alert.alert('Готово', 'Пользователь разбанен');
      await fetchUserDetail();
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось разбанить');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFreeze = async () => {
    if (!freezeReason.trim()) {
      Alert.alert('Ошибка', 'Укажите причину заморозки');
      return;
    }

    if (!freezeUntil) {
      Alert.alert('Ошибка', 'Укажите дату и время до (обязательно)');
      return;
    }
    setActionLoading(true);
    try {
      await api.freezeAdminUser(id!, freezeReason.trim(), freezeUntil.toISOString());
      setFreezeModalVisible(false);
      setFreezeReason('');
      setFreezeUntil(null);
      Alert.alert('Готово', 'Пользователь заморожен');
      await fetchUserDetail();
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось заморозить');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFreezeDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowFreezeDatePicker(false);
    }
    if (!date) return;
    const current = freezeUntil || new Date();
    const next = new Date(date);
    next.setHours(current.getHours(), current.getMinutes(), 0, 0);
    setFreezeUntil(next);
  };

  const handleFreezeTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowFreezeTimePicker(false);
    }
    if (!date) return;
    const current = freezeUntil || new Date();
    const next = new Date(current);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setFreezeUntil(next);
  };

  const formatFreezeUntil = (d: Date | null) => {
    if (!d) return '—';
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleUnfreeze = async () => {
    setActionLoading(true);
    try {
      await api.unfreezeAdminUser(id!);
      Alert.alert('Готово', 'Пользователь разморожен');
      await fetchUserDetail();
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось разморозить');
    } finally {
      setActionLoading(false);
    }
  };

  const canModifyUser = () => {
    if (!userDetail) return false;
    const targetRole = userDetail.role;
    if (targetRole === 'superadmin') return isSuperAdmin;
    if (targetRole === 'admin') return isSuperAdmin;
    return isAdmin;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    cardTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMuted,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    label: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    value: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      textAlign: 'right',
      flex: 1,
      marginLeft: spacing.md,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    userName: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    statItem: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
    },
    statValue: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    statLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    actionButton: {
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    actionButtonPrimary: {
      backgroundColor: colors.accent,
    },
    actionButtonSecondary: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.neutralLight,
    },
    actionButtonDanger: {
      backgroundColor: colors.accent,
    },
    actionButtonSuccess: {
      backgroundColor: colors.success,
    },
    actionButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
    },
    actionButtonTextWhite: {
      color: colors.white,
    },
    actionButtonTextDark: {
      color: colors.text,
    },
    reasonBox: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    reasonLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    reasonText: {
      fontSize: fontSize.sm,
      color: colors.text,
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
      minHeight: 100,
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
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    modalButtonCancel: {
      backgroundColor: colors.surface,
    },
    modalButtonConfirm: {
      backgroundColor: colors.accent,
    },
    modalPickerButton: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    modalPickerButtonText: {
      fontSize: fontSize.sm,
      color: colors.text,
      fontWeight: fontWeight.semibold,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Профиль</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!userDetail) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Профиль</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.textMuted }}>Пользователь не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = userDetail.status || 'active';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Профиль</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {/* Header Card */}
        <View style={styles.card}>
          <Text style={styles.userName}>{userDetail.name || userDetail.firstName || 'Без имени'}</Text>
          <View style={styles.badgeRow}>
            <Badge
              label={ROLE_LABELS[userDetail.role] || userDetail.role}
              variant={userDetail.role === 'superadmin' ? 'accent' : userDetail.role === 'admin' ? 'warning' : 'default'}
              size="sm"
            />
            <Badge
              label={STATUS_LABELS[status]}
              variant={status === 'banned' ? 'accent' : status === 'frozen' ? 'warning' : 'success'}
              size="sm"
            />
          </View>

          {status === 'banned' && userDetail.bannedReason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Причина бана:</Text>
              <Text style={styles.reasonText}>{userDetail.bannedReason}</Text>
              <Text style={[styles.reasonLabel, { marginTop: spacing.xs }]}>
                Забанен: {formatDate(userDetail.bannedAt)}
              </Text>
            </View>
          )}

          {status === 'frozen' && (
            <View style={styles.reasonBox}>
              {userDetail.frozenReason && (
                <>
                  <Text style={styles.reasonLabel}>Причина заморозки:</Text>
                  <Text style={styles.reasonText}>{userDetail.frozenReason}</Text>
                </>
              )}
              <Text style={[styles.reasonLabel, { marginTop: userDetail.frozenReason ? spacing.xs : 0 }]}>
                Заморожен: {formatDate(userDetail.frozenAt)}
              </Text>
              {userDetail.frozenUntil && (
                <Text style={styles.reasonText}>До: {formatDate(userDetail.frozenUntil)}</Text>
              )}
            </View>
          )}
        </View>

        {/* Basic Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Основная информация</Text>
          <View style={styles.row}>
            <Text style={styles.label}>ID</Text>
            <Text style={styles.value} numberOfLines={1}>{userDetail.id}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Public ID</Text>
            <Text style={styles.value}>{userDetail.publicId || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Телефон</Text>
            <Text style={styles.value}>{userDetail.phone || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Telegram ID</Text>
            <Text style={styles.value}>{userDetail.telegramId || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Пол</Text>
            <Text style={styles.value}>{userDetail.gender || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Дата рождения</Text>
            <Text style={styles.value}>{userDetail.birthDate ? formatDate(userDetail.birthDate) : '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Онбординг</Text>
            <Text style={styles.value}>{userDetail.onboardingCompleted ? '✓ Завершён' : '✗ Не завершён'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Регистрация</Text>
            <Text style={styles.value}>{formatDate(userDetail.createdAt)}</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>Последняя активность</Text>
            <Text style={styles.value}>{formatDate(userDetail.lastActiveAt)}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Статистика</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userDetail.stats?.participations || 0}</Text>
              <Text style={styles.statLabel}>Участий</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userDetail.stats?.events || 0}</Text>
              <Text style={styles.statLabel}>Создано событий</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userDetail.stats?.reviews || 0}</Text>
              <Text style={styles.statLabel}>Отзывов</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userDetail.stats?.complaintsReported || 0}</Text>
              <Text style={styles.statLabel}>Жалоб подано</Text>
            </View>
          </View>
        </View>

        {/* Organizer Profile */}
        {userDetail.organizerProfile && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Профиль организатора</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Имя</Text>
              <Text style={styles.value}>{userDetail.organizerProfile.displayName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Статус</Text>
              <Text style={styles.value}>{userDetail.organizerProfile.status}</Text>
            </View>
            {userDetail.organizerProfile.bio && (
              <View style={[styles.row, styles.rowLast]}>
                <Text style={styles.label}>Bio</Text>
                <Text style={styles.value}>{userDetail.organizerProfile.bio}</Text>
              </View>
            )}
          </View>
        )}

        {/* Subscription */}
        {userDetail.subscription && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Подписка</Text>
            <View style={styles.row}>
              <Text style={styles.label}>План</Text>
              <Text style={styles.value}>{userDetail.subscription.plan}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Статус</Text>
              <Text style={styles.value}>{userDetail.subscription.status}</Text>
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.label}>До</Text>
              <Text style={styles.value}>{formatDate(userDetail.subscription.endAt)}</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {canModifyUser() && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Действия</Text>

            {status === 'banned' ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSuccess]}
                onPress={handleUnban}
                disabled={actionLoading}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextWhite]}>
                  {actionLoading ? 'Загрузка...' : '✓ Разбанить'}
                </Text>
              </TouchableOpacity>
            ) : status === 'frozen' ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSuccess]}
                onPress={handleUnfreeze}
                disabled={actionLoading}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextWhite]}>
                  {actionLoading ? 'Загрузка...' : '✓ Разморозить'}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={() => setBanModalVisible(true)}
                  disabled={actionLoading}
                >
                  <Text style={[styles.actionButtonText, styles.actionButtonTextWhite]}>
                    🚫 Забанить
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => setFreezeModalVisible(true)}
                  disabled={actionLoading}
                >
                  <Text style={[styles.actionButtonText, styles.actionButtonTextDark]}>
                    ❄️ Заморозить
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Ban Modal */}
      <Modal visible={banModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Забанить пользователя</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Укажите причину бана (обязательно)"
              placeholderTextColor={colors.textMuted}
              value={banReason}
              onChangeText={setBanReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setBanModalVisible(false);
                  setBanReason('');
                }}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextDark]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleBan}
                disabled={actionLoading}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextWhite]}>
                  {actionLoading ? '...' : 'Забанить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Freeze Modal */}
      <Modal visible={freezeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Заморозить пользователя</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Укажите причину заморозки (обязательно)"
              placeholderTextColor={colors.textMuted}
              value={freezeReason}
              onChangeText={setFreezeReason}
              multiline
            />

            <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              <TouchableOpacity
                style={styles.modalPickerButton}
                onPress={() => {
                  if (!freezeUntil) setFreezeUntil(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
                  setShowFreezeDatePicker(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalPickerButtonText}>Дата/время до: {formatFreezeUntil(freezeUntil)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPickerButton}
                onPress={() => {
                  if (!freezeUntil) setFreezeUntil(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
                  setShowFreezeTimePicker(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalPickerButtonText}>Время до: {formatFreezeUntil(freezeUntil)}</Text>
              </TouchableOpacity>
            </View>

            {showFreezeDatePicker && (
              <DateTimePicker
                value={freezeUntil || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={handleFreezeDateChange}
              />
            )}

            {showFreezeTimePicker && (
              <DateTimePicker
                value={freezeUntil || new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleFreezeTimeChange}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setFreezeModalVisible(false);
                  setFreezeReason('');
                  setFreezeUntil(null);
                  setShowFreezeDatePicker(false);
                  setShowFreezeTimePicker(false);
                }}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextDark]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleFreeze}
                disabled={actionLoading}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextWhite]}>
                  {actionLoading ? '...' : 'Заморозить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
