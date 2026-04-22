import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge } from '../../src/components/ui/Badge';
import { getThemeLabel, themeOptions } from '../../src/constants/themes';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAppStore();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows, variant, setTheme } = useTheme();

  const roleLabel = user?.role === 'superadmin' ? 'Суперадмин' : 'Администратор';
  const roleVariant = user?.role === 'superadmin' ? 'accent' : 'warning';

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  const handleGoToUsers = () => router.push('/(admin)/users');
  const handleGoToComplaints = () => router.push('/(admin)/complaints');
  const handleGoToBanAppeals = () => router.push('/(admin)/ban-appeals');
  const handleGoToAnalytics = () => router.push('/(admin)/analytics');
  const handleGoToEvents = () => router.push('/(admin)/events');
  const handleGoToLogs = () => router.push('/(admin)/logs');

  const handleChooseTheme = () => {
    Alert.alert(
      'Оформление',
      'Выберите тему',
      [
        ...themeOptions.map((t) => ({
          text: `${t.emoji} ${t.label}`,
          onPress: () => setTheme(t.variant),
        })),
        { text: 'Отмена', style: 'cancel' },
      ]
    );
  };

  const themeLabel = getThemeLabel(variant);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
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
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    profileInfo: {
      flex: 1,
      marginLeft: spacing.md,
      gap: spacing.xs,
    },
    profileName: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    section: {
      marginTop: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    infoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.xs,
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
    menuList: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      overflow: 'hidden',
      ...shadows.sm,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    menuItemBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.neutralMuted,
    },
    menuIcon: {
      fontSize: 22,
      marginRight: spacing.md,
      width: 26,
      textAlign: 'center',
    },
    menuContent: {
      flex: 1,
    },
    menuLabel: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    menuHint: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 16,
    },
    menuArrow: {
      fontSize: fontSize.xl,
      color: colors.textMuted,
      marginLeft: spacing.md,
    },
    logoutButton: {
      marginTop: spacing.xl,
      backgroundColor: colors.accent + '1A',
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.accent + '33',
    },
    logoutText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.accent,
    },
    footerText: {
      marginTop: spacing.lg,
      fontSize: fontSize.xs,
      color: colors.textDisabled,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Настройки</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.card, styles.profileCard]}>
          <Avatar source={user?.avatar} size={72} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Администратор'}</Text>
            <Badge label={roleLabel} variant={roleVariant} size="sm" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Профиль</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>ID</Text>
            <Text style={styles.infoValue} selectable>{user?.id}</Text>
          </View>

          {user?.telegramId && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Telegram ID</Text>
              <Text style={styles.infoValue} selectable>{user.telegramId}</Text>
            </View>
          )}

          {user?.phone && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Телефон</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          )}

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Роль</Text>
            <Text style={styles.infoValue}>{user?.role}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Последняя активность</Text>
            <Text style={styles.infoValue}>{formatDate(user?.lastActiveAt)}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Регистрация</Text>
            <Text style={styles.infoValue}>{formatDate(user?.createdAt)}</Text>
          </View>

          <TouchableOpacity style={styles.infoItem} onPress={handleChooseTheme} activeOpacity={0.85}>
            <Text style={styles.infoLabel}>Оформление</Text>
            <Text style={styles.infoValue}>{themeLabel}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Быстрые действия</Text>

          <View style={styles.menuList}>
            <TouchableOpacity style={styles.menuItem} onPress={handleGoToUsers}>
              <Text style={styles.menuIcon}>👥</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Пользователи</Text>
                <Text style={styles.menuHint}>Управление пользователями</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} onPress={handleGoToComplaints}>
              <Text style={styles.menuIcon}>⚠️</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Жалобы</Text>
                <Text style={styles.menuHint}>Обработка жалоб</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} onPress={handleGoToBanAppeals}>
              <Text style={styles.menuIcon}>🚫</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Обжалования банов</Text>
                <Text style={styles.menuHint}>Заявки на пересмотр бана</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            {user?.role === 'superadmin' && (
              <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} onPress={handleGoToAnalytics}>
                <Text style={styles.menuIcon}>📊</Text>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>Аналитика</Text>
                  <Text style={styles.menuHint}>Глобальная статистика приложения</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} onPress={handleGoToEvents}>
              <Text style={styles.menuIcon}>📋</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Модерация событий</Text>
                <Text style={styles.menuHint}>Одобрение и отклонение</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} onPress={handleGoToLogs}>
              <Text style={styles.menuIcon}>📜</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Логи действий</Text>
                <Text style={styles.menuHint}>История действий админов</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Информация</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Версия приложения</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Права доступа</Text>
            <Text style={styles.infoValue}>
              {user?.role === 'superadmin' 
                ? 'Полный доступ' 
                : 'Модерация (без ролей/удаления)'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          ME·WE·GO Admin Panel v1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
