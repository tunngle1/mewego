import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../src/store/useAppStore';
import { useTheme } from '../src/contexts/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { setFirstLaunch } = useAppStore();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = React.useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const handleGoAuth = () => {
    router.replace('/auth');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>ME·WE·GO</Text>
        <Text style={styles.title}>Демо-аккаунты отключены</Text>
        <Text style={styles.subtitle}>
          Демо-данные удалены. Используйте реальную авторизацию.
        </Text>

        <TouchableOpacity style={styles.createUserButton} onPress={handleGoAuth} activeOpacity={0.8}>
          <Text style={styles.createUserButtonText}>Перейти к авторизации</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={() => { setFirstLaunch(true); router.replace('/onboarding'); }}>
            <Text style={styles.resetButtonText}>Пройти онбординг заново</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    marginBottom: spacing.xl,
    letterSpacing: -1,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 20,
  },
  accountsList: {
    gap: spacing.md,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.neutralMuted,
    ...shadows.md,
  },
  accountEmoji: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  accountSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  accountArrow: {
    fontSize: fontSize.xl,
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },
  footer: {
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutralMuted,
  },
  footerText: {
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
  createUserButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createUserButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
