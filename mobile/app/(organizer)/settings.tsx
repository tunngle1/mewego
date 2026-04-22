import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/ui/Avatar';
import { useAppStore } from '../../src/store/useAppStore';
import { useTheme } from '../../src/contexts/ThemeContext';

const SETTINGS_SECTIONS = [
  {
    title: 'Профиль',
    items: [
      { id: 'profile', label: 'Редактировать профиль', icon: '👤', type: 'link' },
      { id: 'portfolio', label: 'Портфолио и сертификаты', icon: '📜', type: 'link' },
      { id: 'schedule', label: 'Расписание работы', icon: '📅', type: 'link' },
    ],
  },
  {
    title: 'Уведомления',
    items: [
      { id: 'push', label: 'Push-уведомления', icon: '🔔', type: 'toggle', value: true },
      { id: 'email', label: 'Email-уведомления', icon: '📧', type: 'toggle', value: true },
      { id: 'booking', label: 'Новые записи', icon: '📝', type: 'toggle', value: true },
    ],
  },
  {
    title: 'Финансы',
    items: [
      { id: 'payout', label: 'Способ выплат', icon: '💳', type: 'link', detail: '**** 4242' },
      { id: 'history', label: 'История выплат', icon: '📊', type: 'link' },
      { id: 'tax', label: 'Налоговые документы', icon: '📄', type: 'link' },
    ],
  },
  {
    title: 'Поддержка',
    items: [
      { id: 'help', label: 'Центр помощи', icon: '❓', type: 'link' },
      { id: 'chat', label: 'Написать в поддержку', icon: '💬', type: 'link' },
      { id: 'terms', label: 'Условия использования', icon: '📋', type: 'link' },
    ],
  },
];

export default function OrganizerSettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAppStore();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = React.useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const handleLogout = () => {
    logout();
    router.replace('/auth');
  };

  const handleSwitchAccount = () => {
    logout();
    router.replace('/auth');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Настройки</Text>

        <View style={styles.profileCard}>
          <Avatar source={user?.avatar} size={64} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileRole}>Организатор</Text>
            <View style={styles.subscriptionBadge}>
              <Text style={styles.subscriptionText}>PRO до 01.06.2025</Text>
            </View>
          </View>
        </View>

        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingItem,
                    index < section.items.length - 1 && styles.settingItemBorder,
                  ]}
                  activeOpacity={item.type === 'toggle' ? 1 : 0.7}
                >
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>{item.icon}</Text>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={'value' in item ? item.value : false}
                      trackColor={{ false: colors.neutralMuted, true: colors.primary }}
                      thumbColor={colors.white}
                    />
                  ) : (
                    <View style={styles.settingRight}>
                      {'detail' in item && item.detail && (
                        <Text style={styles.settingDetail}>{item.detail}</Text>
                      )}
                      <Text style={styles.settingArrow}>›</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.switchButton} onPress={handleSwitchAccount}>
          <Text style={styles.switchButtonText}>Сменить аккаунт</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Выйти</Text>
        </TouchableOpacity>

        <Text style={styles.version}>ME·WE·GO Organizer v1.0.0</Text>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  profileRole: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  subscriptionBadge: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  subscriptionText: {
    fontSize: fontSize.xs - 1,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  sectionContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutralMuted,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIcon: {
    fontSize: fontSize.xl,
  },
  settingLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingDetail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  settingArrow: {
    fontSize: fontSize.xl,
    color: colors.textDisabled,
  },
  switchButton: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  switchButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  logoutButton: {
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoutButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  version: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    textAlign: 'center',
  },
});
