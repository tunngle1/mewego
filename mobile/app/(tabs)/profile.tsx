import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { notificationService } from '../../src/services/notifications';
import { api } from '../../src/services/api';
import { getThemeEmoji, getThemeLabel, themeOptions } from '../../src/constants/themes';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows, variant, setTheme } = useTheme();
  const { user, logout, refreshGamification, refreshSubscriptionStatus, organizerEvents, isTestSession } = useAppStore();
  const updateUser = useAppStore((s) => s.updateUser);
  const [refreshing, setRefreshing] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  const isOrganizer =
    user?.role === 'organizer' || user?.role === 'admin' || user?.role === 'superadmin';
  const canOpenAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    refreshGamification();
  }, [refreshGamification]);

  const syncMe = useCallback(async () => {
    if (!user) return;
    if (isTestSession) return;
    try {
      const me = await api.getMe();
      if (me?.role && me.role !== user.role) {
        updateUser({ role: me.role } as any);
        api.setAuthContext(user.id, me.role);
      }
    } catch {
      // ignore (offline etc)
    }
  }, [isTestSession, updateUser, user]);

  useEffect(() => {
    syncMe();
  }, [syncMe]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncMe();
    await refreshGamification();
    await refreshSubscriptionStatus();
    setRefreshing(false);
  }, [refreshGamification, refreshSubscriptionStatus, syncMe]);

  const MENU_ITEMS = [
    ...(canOpenAdmin ? [{ title: 'Админ-панель', icon: '🛡️', detail: '', route: '/(admin)/dashboard' }] : []),
    { title: 'Тестовый вход', icon: '🧪', detail: '', route: '/test-login' },
    { title: 'Карта', icon: '🗺️', detail: '', route: '/map' },
    { title: 'Мои уведомления', icon: '🔔', detail: 'Включены', route: '/notifications' },
    { title: 'Подписка', icon: '💳', detail: 'PRO', route: '/profile/subscription' },
    { title: 'Редактировать профиль', icon: '✏️', detail: '', route: '/profile/edit' },
    { title: 'О приложении', icon: 'ℹ️', detail: 'v1.0.0', route: null },
  ];

  const handleUpgrade = () => {
    if (process.env.EXPO_PUBLIC_DISABLE_SUBSCRIPTIONS === 'true') {
      Alert.alert(
        'Подписки временно отключены',
        'В первые месяцы подписок не будет. Доступ к функциям уже открыт.'
      );
      return;
    }
    router.push('/paywall');
  };

  const handleLogout = () => {
    logout();
    // Go through root redirect to reset navigation state.
    router.replace('/');
  };

  const handleToggleTheme = () => {
    // Android Alert shows max ~3 buttons, so we use a custom modal list to display all themes.
    setThemePickerOpen(true);
  };

  const handleRequestPush = async () => {
    setPushLoading(true);
    try {
      const token = await notificationService.registerForPushNotifications();
      if (!token) {
        Alert.alert(
          'Не получилось',
          'Токен не получен. Проверьте разрешения уведомлений для Expo Go и что в app.json задан expo.extra.eas.projectId (EAS Project ID).'
        );
        return;
      }
      setPushToken(token);
      Alert.alert('Готово', 'Push token получен.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleShareToken = async () => {
    if (!pushToken) return;
    await Share.share({ message: pushToken });
  };

  const handleTestLocalNotification = async () => {
    const ok = await notificationService.requestPermissions();
    if (!ok) {
      Alert.alert('Нет доступа', 'Разрешите уведомления, чтобы получить тестовое уведомление.');
      return;
    }
    await notificationService.scheduleLocalNotification('ME·WE·GO', 'Тестовое уведомление (через 5 секунд)', 5, {
      type: 'test',
    });
    Alert.alert('Запланировано', 'Локальное уведомление придёт через ~5 секунд.');
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    try {
      const result = await api.sendTestPush();
      if (!result?.ok) {
        Alert.alert('Не получилось', 'Backend не смог отправить push. Проверьте, что токен сохранён в БД и устройство не в Expo Go.');
        return;
      }
      Alert.alert('Отправлено', 'Если всё настроено, push придёт в течение нескольких секунд.');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Failed to send push');
    } finally {
      setPushLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl * 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xl,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    settingsButton: {
      width: 40,
      height: 40,
      backgroundColor: colors.white,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    settingsIcon: {
      fontSize: fontSize.lg,
    },
    userCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: spacing.md,
    },
    avatarBorder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 4,
      borderColor: colors.primary,
      padding: 4,
    },
    avatar: {
      width: '100%',
      height: '100%',
      borderRadius: 46,
    },
    proBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      borderWidth: 2,
      borderColor: colors.white,
    },
    proBadgeText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    userName: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    userEmail: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginBottom: spacing.lg,
    },
    userAbout: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: -spacing.md,
      marginBottom: spacing.lg,
      maxWidth: 320,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      width: '100%',
    },
    statItem: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      alignItems: 'center',
    },
    statValue: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.black,
      color: colors.primary,
    },
    statLabel: {
      fontSize: fontSize.xs - 1,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      letterSpacing: 1,
      marginTop: spacing.xs,
    },
    subscriptionCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.xl,
    },
    subscriptionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    subscriptionTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    subscriptionDate: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.primary,
    },
    subscriptionDescription: {
      fontSize: fontSize.xs,
      color: colors.textLight,
      lineHeight: 18,
      marginBottom: spacing.md,
    },
    subscriptionLink: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.accent,
      textDecorationLine: 'underline',
    },
    themeCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...shadows.sm,
    },
    themeCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    themeIcon: {
      fontSize: 24,
    },
    themeTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    themeSubtitle: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    themeSwitch: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
    },
    themeSwitchText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    notificationsCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    notificationsTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    notificationsSubtitle: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginBottom: spacing.md,
      lineHeight: 16,
    },
    tokenBox: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.md,
    },
    tokenText: {
      fontSize: fontSize.xs,
      color: colors.text,
    },
    notifButtonsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    notifButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    notifButtonSecondary: {
      backgroundColor: colors.surfaceMuted,
    },
    notifButtonText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    notifButtonTextSecondary: {
      color: colors.text,
    },
    menuList: {
      gap: spacing.sm,
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.white,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      ...shadows.sm,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    menuIcon: {
      fontSize: fontSize.xl,
    },
    menuTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    menuDetail: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.textDisabled,
    },
    logoutButton: {
      marginTop: spacing.xl,
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    logoutText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.accent,
      opacity: 0.4,
      letterSpacing: 2,
    },
    // Organizer section styles
    organizerSection: {
      marginBottom: spacing.xl,
    },
    organizerSectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    organizerCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      ...shadows.sm,
    },
    organizerStatsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    organizerStatItem: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      alignItems: 'center',
    },
    organizerStatValue: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.black,
      color: colors.primary,
    },
    organizerStatLabel: {
      fontSize: fontSize.xs - 1,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    organizerActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    organizerActionCard: {
      width: '48%',
      backgroundColor: colors.background,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    organizerActionIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    organizerActionText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      flex: 1,
    },

    modalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      top: 96,
      bottom: 96,
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      overflow: 'hidden',
      ...shadows.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMuted,
    },
    modalTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    modalClose: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    modalCloseText: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      fontWeight: fontWeight.black,
    },
    modalList: {
      padding: spacing.lg,
      gap: spacing.sm,
      paddingBottom: spacing.xl,
    },
    modalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surfaceMuted,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    modalItemSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    modalItemEmoji: {
      fontSize: 22,
    },
    modalItemLabel: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    modalItemHint: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
    modalItemCheck: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.black,
      color: colors.accent,
      marginLeft: spacing.sm,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Modal
        visible={themePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setThemePickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setThemePickerOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Оформление</Text>
            <TouchableOpacity onPress={() => setThemePickerOpen(false)} style={styles.modalClose} activeOpacity={0.8}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
            {themeOptions.map((t) => {
              const selected = t.variant === variant;
              return (
                <TouchableOpacity
                  key={t.variant}
                  style={[styles.modalItem, selected && styles.modalItemSelected]}
                  onPress={() => {
                    setTheme(t.variant);
                    setThemePickerOpen(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalItemEmoji}>{t.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemLabel}>{t.label}</Text>
                    <Text style={styles.modalItemHint}>{t.isDark ? 'Тёмная' : 'Светлая'}</Text>
                  </View>
                  {selected ? <Text style={styles.modalItemCheck}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Профиль</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBorder}>
              <Image
                source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?u=me' }}
                style={styles.avatar}
              />
            </View>
            {user?.subscription?.isActive && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>

          <Text style={styles.userName}>{user?.name || 'Пользователь'}</Text>
          <Text style={styles.userEmail}>ID: {user?.publicId || '—'}</Text>
          {user?.about ? <Text style={styles.userAbout}>{user.about}</Text> : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.totalEvents || 0}</Text>
              <Text style={styles.statLabel}>ЗАНЯТИЙ</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {user?.points
                  ? user.points >= 1000
                    ? `${(user.points / 1000).toFixed(1)}к`
                    : String(user.points)
                  : '0'}
              </Text>
              <Text style={styles.statLabel}>БАЛАНС</Text>
            </View>
          </View>
        </View>

        {/* Organizer Section - only for organizers */}
        {isOrganizer && (
          <View style={styles.organizerSection}>
            <Text style={styles.organizerSectionTitle}>Панель организатора</Text>
            <View style={styles.organizerCard}>
              {/* Stats */}
              <View style={styles.organizerStatsRow}>
                <View style={styles.organizerStatItem}>
                  <Text style={styles.organizerStatValue}>{organizerEvents?.length || 0}</Text>
                  <Text style={styles.organizerStatLabel}>Событий</Text>
                </View>
                <View style={styles.organizerStatItem}>
                  <Text style={[styles.organizerStatValue, { color: colors.accent }]}>
                    {organizerEvents?.reduce((sum, e) => sum + e.participantsJoinedCount, 0) || 0}
                  </Text>
                  <Text style={styles.organizerStatLabel}>Участников</Text>
                </View>
                <View style={styles.organizerStatItem}>
                  <Text style={[styles.organizerStatValue, { color: colors.success }]}>
                    {organizerEvents?.filter(e => e.status === 'approved').length || 0}
                  </Text>
                  <Text style={styles.organizerStatLabel}>Активных</Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.organizerActionsGrid}>
                <TouchableOpacity
                  style={styles.organizerActionCard}
                  onPress={() => router.push('/organizer-event/create')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.organizerActionIcon, { backgroundColor: colors.accentLight || colors.primaryLight }]}>
                    <Ionicons name="add-circle" size={20} color={colors.accent} />
                  </View>
                  <Text style={styles.organizerActionText}>Создать</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.organizerActionCard}
                  onPress={() => router.push('/trainer-crm')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.organizerActionIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="briefcase" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.organizerActionText}>CRM</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.organizerActionCard}
                  onPress={() => router.push('/organizer-event/list')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.organizerActionIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.organizerActionText}>События</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.organizerActionCard}
                  onPress={() => router.push('/organizer-event/stats')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.organizerActionIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="stats-chart" size={20} color={colors.warning} />
                  </View>
                  <Text style={styles.organizerActionText}>Статистика</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.organizerActionCard}
                  onPress={() => router.push('/organizer-event/certificates')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.organizerActionIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="ribbon" size={20} color={colors.success} />
                  </View>
                  <Text style={styles.organizerActionText}>Серт.</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Subscription Status */}
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Text style={styles.subscriptionTitle}>
              {user?.subscription?.isActive ? 'Подписка активна' : 'Подписка неактивна'}
            </Text>
            {user?.subscription?.isActive && (
              <Text style={styles.subscriptionDate}>
                До {user.subscription.endDate?.split('-').reverse().join('.')}
              </Text>
            )}
          </View>
          <Text style={styles.subscriptionDescription}>
            {user?.subscription?.isActive
              ? 'Ваш куратор Катерина на связи и готова помочь с выбором направления.'
              : 'Оформите подписку, чтобы получить доступ ко всем функциям.'}
          </Text>
          <TouchableOpacity onPress={handleUpgrade}>
            <Text style={styles.subscriptionLink}>Управление подпиской</Text>
          </TouchableOpacity>
        </View>

        {/* Theme Switch */}
        <TouchableOpacity style={styles.themeCard} onPress={handleToggleTheme} activeOpacity={0.85}>
          <View style={styles.themeCardLeft}>
            <Text style={styles.themeIcon}>{getThemeEmoji(variant)}</Text>
            <View>
              <Text style={styles.themeTitle}>Оформление</Text>
              <Text style={styles.themeSubtitle}>
                {getThemeLabel(variant)}
              </Text>
            </View>
          </View>
          <View style={styles.themeSwitch}>
            <Text style={styles.themeSwitchText}>Сменить</Text>
          </View>
        </TouchableOpacity>

        {/* Notifications */}
        <View style={styles.notificationsCard}>
          <Text style={styles.notificationsTitle}>Уведомления</Text>
          <Text style={styles.notificationsSubtitle}>
            В Expo Go push-токен получается на телефоне. Для быстрой проверки можно отправить себе push через Expo Push API.
          </Text>

          {pushToken ? (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenText}>{pushToken}</Text>
            </View>
          ) : null}

          <View style={styles.notifButtonsRow}>
            <TouchableOpacity style={styles.notifButton} onPress={handleRequestPush} activeOpacity={0.85}>
              <Text style={styles.notifButtonText}>{pushLoading ? '...' : 'Получить токен'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.notifButton, styles.notifButtonSecondary]}
              onPress={handleShareToken}
              activeOpacity={0.85}
              disabled={!pushToken}
            >
              <Text style={[styles.notifButtonText, styles.notifButtonTextSecondary]}>
                Поделиться
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.notifButtonsRow, { marginTop: spacing.sm }]}>
            <TouchableOpacity
              style={[styles.notifButton, styles.notifButtonSecondary]}
              onPress={handleTestLocalNotification}
              activeOpacity={0.85}
            >
              <Text style={[styles.notifButtonText, styles.notifButtonTextSecondary]}>
                Тест (локально)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notifButton}
              onPress={handleTestPush}
              activeOpacity={0.85}
            >
              <Text style={styles.notifButtonText}>{pushLoading ? '...' : 'Тест (push)'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu List */}
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => item.route && router.push(item.route as any)}
              activeOpacity={item.route ? 0.7 : 1}
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Text style={styles.menuDetail}>{item.detail}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>СМЕНИТЬ АККАУНТ</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
