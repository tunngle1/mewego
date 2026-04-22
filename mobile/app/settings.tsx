import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAppStore } from '../src/store/useAppStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const logout = useAppStore((state) => state.logout);

  const [pushEnabled, setPushEnabled] = React.useState(true);
  const [emailEnabled, setEmailEnabled] = React.useState(false);

  const handleResetAllData = () => {
    Alert.alert(
      'Сбросить все данные?',
      'Это удалит все локальные данные приложения. Вам придётся войти заново.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              logout();
              router.replace('/');
            } catch (e) {
              Alert.alert('Ошибка', 'Не удалось сбросить данные');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
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
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      overflow: 'hidden',
      ...shadows.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMuted,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    rowIcon: {
      fontSize: fontSize.xl,
    },
    rowText: {
      fontSize: fontSize.md,
      color: colors.text,
    },
    rowArrow: {
      fontSize: fontSize.md,
      color: colors.textMuted,
    },
    version: {
      textAlign: 'center',
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: spacing.xl,
    },
  });

  const SettingRow = ({
    icon,
    label,
    onPress,
    isLast = false,
    rightElement,
  }: {
    icon: string;
    label: string;
    onPress?: () => void;
    isLast?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowIcon}>{icon}</Text>
        <Text style={styles.rowText}>{label}</Text>
      </View>
      {rightElement || (onPress && <Text style={styles.rowArrow}>→</Text>)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройки</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>УВЕДОМЛЕНИЯ</Text>
          <View style={styles.card}>
            <SettingRow
              icon="🔔"
              label="Push-уведомления"
              rightElement={
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: colors.neutralLight, true: colors.accent }}
                />
              }
            />
            <SettingRow
              icon="📧"
              label="Email-рассылка"
              isLast
              rightElement={
                <Switch
                  value={emailEnabled}
                  onValueChange={setEmailEnabled}
                  trackColor={{ false: colors.neutralLight, true: colors.accent }}
                />
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>АККАУНТ</Text>
          <View style={styles.card}>
            <SettingRow
              icon="👤"
              label="Редактировать профиль"
              onPress={() => router.push('/profile/edit')}
            />
            <SettingRow
              icon="💳"
              label="Управление подпиской"
              onPress={() => router.push('/profile/subscription')}
            />
            <SettingRow
              icon="🔒"
              label="Приватность"
              onPress={() => {}}
              isLast
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ПОДДЕРЖКА</Text>
          <View style={styles.card}>
            <SettingRow
              icon="❓"
              label="Помощь и FAQ"
              onPress={() => {}}
            />
            <SettingRow
              icon="📝"
              label="Условия использования"
              onPress={() => {}}
            />
            <SettingRow
              icon="🛡️"
              label="Политика конфиденциальности"
              onPress={() => {}}
              isLast
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <SettingRow
              icon="🚪"
              label="Выйти из аккаунта"
              onPress={handleLogout}
            />
            <SettingRow
              icon="🗑️"
              label="Сбросить все данные"
              onPress={handleResetAllData}
              isLast
            />
          </View>
        </View>

        <Text style={styles.version}>ME·WE·GO v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
