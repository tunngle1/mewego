import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { AdminUser } from '../../src/types';
import { api } from '../../src/services/api';

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

const ROLE_FILTER_OPTIONS = [
  { label: 'Все', value: '' },
  { label: 'Пользователи', value: 'user' },
  { label: 'Организаторы', value: 'organizer' },
  { label: 'Админы', value: 'admin' },
  { label: 'Суперадмины', value: 'superadmin' },
];

const ROLE_OPTIONS: Array<'user' | 'organizer' | 'admin' | 'superadmin'> = ['user', 'organizer', 'admin', 'superadmin'];

export default function AdminUsersScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { user, adminLoading, adminError, fetchAdminUsers, setAdminUserRoleAsync } = useAppStore();
  const adminUsers = useAppStore((s) => s.adminUsers);

  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [freezeModalVisible, setFreezeModalVisible] = useState(false);
  const [freezeTarget, setFreezeTarget] = useState<{ id: string; name: string } | null>(null);
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeUntil, setFreezeUntil] = useState<Date | null>(null);
  const [showFreezeDatePicker, setShowFreezeDatePicker] = useState(false);
  const [showFreezeTimePicker, setShowFreezeTimePicker] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';
  const canView = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (!canView) return;
    fetchAdminUsers({ q: '', role: roleFilter });
  }, [fetchAdminUsers, canView, roleFilter]);

  const handleRefresh = useCallback(async () => {
    if (!canView) return;
    setRefreshing(true);
    await fetchAdminUsers({ q, role: roleFilter });
    setRefreshing(false);
  }, [fetchAdminUsers, canView, q, roleFilter]);

  const handleSearch = useCallback(async () => {
    if (!canView) return;
    await fetchAdminUsers({ q, role: roleFilter });
  }, [fetchAdminUsers, canView, q, roleFilter]);

  const users = adminUsers;

  const handleUserAction = async (userId: string, action: string, userName: string) => {
    setActionLoading(userId);
    try {
      switch (action) {
        case 'ban':
          await api.banAdminUser(userId, 'Banned by admin');
          Alert.alert('Готово', `${userName} забанен`);
          break;
        case 'unban':
          await api.unbanAdminUser(userId);
          Alert.alert('Готово', `${userName} разбанен`);
          break;
        case 'freeze':
          break;
        case 'unfreeze':
          await api.unfreezeAdminUser(userId);
          Alert.alert('Готово', `${userName} разморожен`);
          break;
        case 'reset_progress':
          await api.resetAdminUserProgress(userId);
          Alert.alert('Готово', `Прогресс ${userName} сброшен`);
          break;
        case 'reset_subscriptions':
          await api.resetAdminUserSubscriptions(userId);
          Alert.alert('Готово', `Подписки ${userName} сброшены`);
          break;
        case 'delete':
          await api.deleteAdminUser(userId);
          Alert.alert('Готово', `${userName} удалён`);
          break;
      }
      await fetchAdminUsers({ q, role: roleFilter });
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось выполнить действие');
    } finally {
      setActionLoading(null);
    }
  };

  const openFreezeModal = (u: AdminUser) => {
    setFreezeTarget({ id: u.id, name: u.name || u.id });
    setFreezeReason('');
    // default: +7 days
    setFreezeUntil(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setFreezeModalVisible(true);
  };

  const handleFreezeConfirm = async () => {
    if (!freezeTarget) return;

    if (!freezeReason.trim()) {
      Alert.alert('Ошибка', 'Укажите причину заморозки');
      return;
    }

    if (!freezeUntil) {
      Alert.alert('Ошибка', 'Укажите дату и время до (обязательно)');
      return;
    }

    setActionLoading(freezeTarget.id);
    try {
      await api.freezeAdminUser(freezeTarget.id, freezeReason.trim(), freezeUntil.toISOString());
      Alert.alert('Готово', `${freezeTarget.name} заморожен`);
      setFreezeModalVisible(false);
      setFreezeTarget(null);
      await fetchAdminUsers({ q, role: roleFilter });
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось заморозить');
    } finally {
      setActionLoading(null);
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

  const showActionsMenu = (u: AdminUser) => {
    const userName = u.name || u.id;
    const isTargetAdmin = u.role === 'admin' || u.role === 'superadmin';
    const status = u.status || 'active';

    const actions: Array<{ text: string; style?: 'destructive' | 'cancel' | 'default'; onPress?: () => void }> = [];

    if (status === 'banned') {
      actions.push({ text: 'Разбанить', onPress: () => handleUserAction(u.id, 'unban', userName) });
    } else if (status === 'frozen') {
      actions.push({ text: 'Разморозить', onPress: () => handleUserAction(u.id, 'unfreeze', userName) });
    } else if (!isTargetAdmin) {
      actions.push({ text: 'Забанить', style: 'destructive', onPress: () => {
        Alert.alert('Подтвердите', `Забанить ${userName}?`, [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Забанить', style: 'destructive', onPress: () => handleUserAction(u.id, 'ban', userName) },
        ]);
      }});
      actions.push({ text: 'Заморозить', onPress: () => openFreezeModal(u) });
    }

    actions.push({ text: 'Сбросить прогресс', onPress: () => {
      Alert.alert('Подтвердите', `Сбросить прогресс ${userName}?`, [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Сбросить', style: 'destructive', onPress: () => handleUserAction(u.id, 'reset_progress', userName) },
      ]);
    }});

    actions.push({ text: 'Сбросить подписки', onPress: () => {
      Alert.alert('Подтвердите', `Сбросить подписки ${userName}?`, [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Сбросить', style: 'destructive', onPress: () => handleUserAction(u.id, 'reset_subscriptions', userName) },
      ]);
    }});

    if (isSuperAdmin) {
      actions.push({ text: 'Выдать PRO (пользователь)', onPress: async () => {
        setActionLoading(u.id);
        try {
          await api.grantAdminUserSubscription(u.id, 'user_349');
          Alert.alert('Готово', `Подписка PRO выдана: ${userName}`);
          await fetchAdminUsers({ q, role: roleFilter });
        } catch (e) {
          Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось выдать подписку');
        } finally {
          setActionLoading(null);
        }
      }});

      actions.push({ text: 'Выдать PRO (организатор)', onPress: async () => {
        setActionLoading(u.id);
        try {
          await api.grantAdminUserSubscription(u.id, 'organizer_999');
          Alert.alert('Готово', `Подписка организатора выдана: ${userName}`);
          await fetchAdminUsers({ q, role: roleFilter });
        } catch (e) {
          Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось выдать подписку');
        } finally {
          setActionLoading(null);
        }
      }});
    }

    if (isSuperAdmin && !isTargetAdmin) {
      actions.push({ text: 'Удалить пользователя', style: 'destructive', onPress: () => {
        Alert.alert('Удалить пользователя?', `Это действие необратимо. Удалить ${userName}?`, [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Удалить', style: 'destructive', onPress: () => handleUserAction(u.id, 'delete', userName) },
        ]);
      }});
    }

    actions.push({ text: 'Отмена', style: 'cancel' });

    Alert.alert('Действия', userName, actions);
  };

  const renderUserRow = (u: AdminUser) => {
    const canEditRole = isSuperAdmin;
    const status = u.status || 'active';

    const handleChangeRole = () => {
      if (!canEditRole) return;

      Alert.alert(
        'Сменить роль',
        `Пользователь: ${u.name || u.id}`,
        [
          ...ROLE_OPTIONS.map((role) => ({
            text: ROLE_LABELS[role],
            style: (role === 'superadmin' ? 'destructive' : 'default') as 'destructive' | 'default',
            onPress: async () => {
              if (role === 'superadmin') {
                Alert.alert('Подтвердите', 'Выдать superadmin права?', [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Выдать', style: 'destructive', onPress: async () => {
                    const ok = await setAdminUserRoleAsync(u.id, role);
                    if (!ok) Alert.alert('Ошибка', 'Не удалось обновить роль');
                  }},
                ]);
              } else {
                const ok = await setAdminUserRoleAsync(u.id, role);
                if (!ok) Alert.alert('Ошибка', 'Не удалось обновить роль');
              }
            },
          })),
          { text: 'Отмена', style: 'cancel' },
        ]
      );
    };

    const isLoading = actionLoading === u.id;

    return (
      <TouchableOpacity
        key={u.id}
        style={styles.userCard}
        onPress={() => router.push(`/admin-user/${u.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.userHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {u.name || 'Без имени'}
            </Text>
            <Text style={styles.userSub} numberOfLines={1}>
              ID: {u.id.slice(0, 8)}...
            </Text>
            {u.telegramId ? (
              <Text style={styles.userSub} numberOfLines={1}>
                TG: {u.telegramId}
              </Text>
            ) : null}
          </View>

          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Badge
              label={ROLE_LABELS[u.role] || u.role}
              variant={u.role === 'superadmin' ? 'accent' : u.role === 'admin' ? 'warning' : 'default'}
              size="sm"
            />
            {status !== 'active' && (
              <Badge
                label={STATUS_LABELS[status]}
                variant={status === 'banned' ? 'accent' : 'warning'}
                size="sm"
              />
            )}
          </View>
        </View>

        <View style={styles.userActions}>
          {canEditRole && (
            <TouchableOpacity
              style={styles.roleButton}
              onPress={handleChangeRole}
              activeOpacity={0.8}
            >
              <Text style={styles.roleButtonText}>Роль</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, isLoading && { opacity: 0.5 }]}
            onPress={() => showActionsMenu(u)}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.actionButtonText}>Действия</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMuted,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    notice: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    noticeTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    noticeText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      lineHeight: 18,
    },
    searchRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      fontSize: fontSize.sm,
      color: colors.text,
    },
    searchButton: {
      backgroundColor: colors.accent,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      ...shadows.sm,
    },
    searchButtonText: {
      color: colors.white,
      fontWeight: fontWeight.bold,
      fontSize: fontSize.sm,
    },
    userCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      ...shadows.sm,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    userHeader: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    userName: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    userSub: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginBottom: 2,
    },
    filterRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
      marginBottom: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    filterChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterChipText: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      fontWeight: fontWeight.medium,
    },
    filterChipTextActive: {
      color: colors.white,
    },
    userActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
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
      minHeight: 90,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      marginBottom: spacing.md,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
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
    roleButton: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.primary,
      flex: 1,
      alignItems: 'center',
    },
    roleButtonText: {
      color: colors.primary,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
    },
    actionButton: {
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      flex: 1,
      alignItems: 'center',
    },
    actionButtonText: {
      color: colors.text,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
    },
    actionButtonTextDark: {
      color: colors.text,
    },
    actionButtonTextWhite: {
      color: colors.white,
    },
    errorText: {
      color: colors.accent,
      fontSize: fontSize.sm,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    emptyText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });

  if (!canView) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Пользователи</Text>
        </View>
        <View style={{ padding: spacing.lg }}>
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Нет доступа</Text>
            <Text style={styles.noticeText}>
              Экран пользователей доступен только для admin/superadmin.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Пользователи</Text>
        <Badge label={`${users.length}`} variant="default" size="sm" />
      </View>

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
        <View style={styles.filterRow}>
          {ROLE_FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.filterChip, roleFilter === opt.value && styles.filterChipActive]}
              onPress={() => setRoleFilter(opt.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, roleFilter === opt.value && styles.filterChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Поиск: имя / id / телефон / telegramId"
            placeholderTextColor={colors.textDisabled}
            style={styles.searchInput}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch} activeOpacity={0.8}>
            <Text style={styles.searchButtonText}>Найти</Text>
          </TouchableOpacity>
        </View>

        {adminError ? <Text style={styles.errorText}>{adminError}</Text> : null}

        {adminLoading ? (
          <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : users.length > 0 ? (
          users.map(renderUserRow)
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Пользователи не найдены</Text>
            <Text style={styles.emptyText}>Попробуйте изменить запрос поиска.</Text>
          </View>
        )}
      </ScrollView>

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
                onPress={() => setShowFreezeDatePicker(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalPickerButtonText}>Дата до: {formatFreezeUntil(freezeUntil)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPickerButton}
                onPress={() => setShowFreezeTimePicker(true)}
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
                  setFreezeTarget(null);
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
                onPress={handleFreezeConfirm}
                disabled={actionLoading === freezeTarget?.id}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextWhite]}>
                  {actionLoading === freezeTarget?.id ? '...' : 'Заморозить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
