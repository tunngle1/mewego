import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAppStore } from '../src/store/useAppStore';

export default function AuthEntryScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { setFirstLaunch, resetRegistration } = useAppStore();
  const [role, setRole] = useState<'user' | 'organizer' | 'admin'>('user');

  const handleRepeatOnboarding = () => {
    setFirstLaunch(true);
    router.replace('/onboarding');
  };

  const handleResetRegistration = () => {
    resetRegistration();
  };

  const handleAuthMethod = (method: 'phone' | 'email') => {
    router.push({ pathname: `/auth/${method}`, params: { role } });
  };

  const handleTestLogin = () => {
    router.push('/test-login');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: spacing.xl,
      justifyContent: 'center',
    },
    logo: {
      fontSize: fontSize.xxxl,
      fontWeight: fontWeight.black,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.lg,
      letterSpacing: -1,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: colors.textLight,
      textAlign: 'center',
      marginBottom: spacing.xxl,
    },
    roleSwitch: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: borderRadius.full,
      padding: 4,
      marginBottom: spacing.lg,
    },
    rolePill: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      alignItems: 'center',
    },
    rolePillActive: {
      backgroundColor: colors.text,
    },
    roleText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
    },
    roleTextActive: {
      color: colors.white,
    },
    actions: {
      gap: spacing.md,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      ...shadows.md,
    },
    phoneCard: {
      borderColor: colors.accentLight,
    },
    emailCard: {
      borderColor: colors.primary,
    },
    cardEmoji: {
      fontSize: 36,
      marginRight: spacing.md,
    },
    cardText: {
      flex: 1,
    },
    cardTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: 2,
    },
    cardSubtitle: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    cardArrow: {
      fontSize: fontSize.xl,
      color: colors.accent,
      fontWeight: fontWeight.bold,
    },
    note: {
      marginTop: spacing.xxl,
      fontSize: fontSize.xs,
      color: colors.textDisabled,
      textAlign: 'center',
      lineHeight: 16,
    },
    resetButton: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
    },
    resetButtonText: {
      fontSize: fontSize.xs,
      color: colors.accent,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    testLoginButton: {
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    testLoginButtonText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>ME·WE·GO</Text>
        <Text style={styles.title}>Регистрация</Text>
        <Text style={styles.subtitle}>Выберите удобный способ входа</Text>

        <View style={styles.roleSwitch}>
          <TouchableOpacity
            style={[styles.rolePill, role === 'user' && styles.rolePillActive]}
            onPress={() => setRole('user')}
            activeOpacity={0.85}
          >
            <Text style={[styles.roleText, role === 'user' && styles.roleTextActive]}>
              Участник
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rolePill, role === 'organizer' && styles.rolePillActive]}
            onPress={() => setRole('organizer')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.roleText,
                role === 'organizer' && styles.roleTextActive,
              ]}
            >
              Тренер
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rolePill, role === 'admin' && styles.rolePillActive]}
            onPress={() => setRole('admin')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.roleText,
                role === 'admin' && styles.roleTextActive,
              ]}
            >
              Админ
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.card, styles.emailCard]}
            onPress={() => handleAuthMethod('email')}
            activeOpacity={0.85}
          >
            <Text style={styles.cardEmoji}>✉️</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Войти по почте</Text>
              <Text style={styles.cardSubtitle}>Email и пароль, с базой для будущих рассылок</Text>
            </View>
            <Text style={styles.cardArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.phoneCard]}
            onPress={() => handleAuthMethod('phone')}
            activeOpacity={0.85}
          >
            <Text style={styles.cardEmoji}>📱</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Войти по номеру</Text>
              <Text style={styles.cardSubtitle}>Отправим код подтверждения</Text>
            </View>
            <Text style={styles.cardArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Регистрация доступна по email. Вход по номеру пока остаётся заглушкой.
        </Text>

        <TouchableOpacity style={styles.resetButton} onPress={handleRepeatOnboarding}>
          <Text style={styles.resetButtonText}>Пройти онбординг заново</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={handleResetRegistration}>
          <Text style={styles.resetButtonText}>Сбросить регистрацию (dev)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testLoginButton} onPress={handleTestLogin}>
          <Text style={styles.testLoginButtonText}>Тестовый вход (без регистрации)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
