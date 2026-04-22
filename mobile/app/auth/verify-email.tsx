import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api, ApiError } from '../../src/services/api';
import { useAppStore } from '../../src/store/useAppStore';
import { User } from '../../src/types';

const toStoreUser = (payload: {
  id: string;
  publicId?: string;
  email?: string;
  name?: string;
  role: string;
  avatarUrl?: string;
  cityId?: string;
  interests?: string[];
  onboardingCompleted?: boolean;
  accountStatus?: 'active' | 'banned' | 'frozen';
  bannedAt?: string;
  bannedReason?: string;
  frozenAt?: string;
  frozenUntil?: string;
  frozenReason?: string;
}): User => ({
  id: payload.id,
  publicId: payload.publicId,
  email: payload.email || `${payload.id}@mewego.app`,
  name: payload.name || 'Пользователь',
  avatar: payload.avatarUrl || undefined,
  role: (payload.role as User['role']) || 'user',
  accountStatus: payload.accountStatus || 'active',
  bannedAt: payload.bannedAt,
  bannedReason: payload.bannedReason,
  frozenAt: payload.frozenAt,
  frozenUntil: payload.frozenUntil,
  frozenReason: payload.frozenReason,
  subscription: {
    plan: 'free',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    isActive: false,
    trialUsed: false,
  },
  points: 0,
  status: 'начал_движение',
  level: 1,
  experience: 0,
  totalEvents: 0,
  createdAt: new Date().toISOString(),
  city: payload.cityId || '',
  interests: payload.interests || [],
  onboardingCompleted: payload.onboardingCompleted === true,
});

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { login, updateUser } = useAppStore();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canResend = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canVerify = /^[0-9]{6}$/.test(code.trim());

  const handleResend = async () => {
    if (!canResend || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.requestEmailVerification(email.trim());
      const label = result.deliveryStatus === 'sent'
        ? 'Письмо с подтверждением отправлено повторно.'
        : result.deliveryStatus === 'queued'
          ? 'Письмо поставлено в отправку. Проверьте inbox/спам через минуту.'
        : result.deliveryStatus === 'skipped'
          ? 'SMTP пока не настроен, поэтому письмо не было отправлено автоматически.'
          : 'Не удалось отправить письмо подтверждения.';
      Alert.alert('Подтверждение почты', label);
    } catch (err) {
      if (err instanceof ApiError) {
        const apiMessage = typeof err.data === 'object' && err.data && 'error' in (err.data as any)
          ? String((err.data as any).error)
          : err.message;
        setError(apiMessage);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось повторно отправить письмо');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!canVerify || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.verifyEmailCode(email.trim(), code.trim());
      const user = toStoreUser(result.user);
      api.setAuthContext(user.id, (user.role as 'user' | 'organizer' | 'admin' | 'superadmin') || 'user');
      login(user);

      if (user.accountStatus && user.accountStatus !== 'active') {
        router.replace({
          pathname: '/blocked',
          params: {
            status: user.accountStatus,
            reason: user.accountStatus === 'banned' ? (user.bannedReason || '') : (user.frozenReason || ''),
            until: user.frozenUntil || '',
          },
        });
        return;
      }

      updateUser({ email: result.user.email || user.email } as any);

      // After successful email verification, continue onboarding instead of going straight to events.
      if (user.onboardingCompleted) {
        router.replace('/');
        return;
      }

      const state = useAppStore.getState();
      if (!state.gender) {
        router.replace('/auth/gender');
        return;
      }

      if (!state.birthDate) {
        router.replace('/auth/birthdate');
        return;
      }

      router.replace('/auth/profile-setup');
    } catch (err) {
      if (err instanceof ApiError) {
        const apiMessage = typeof err.data === 'object' && err.data && 'error' in (err.data as any)
          ? String((err.data as any).error)
          : err.message;
        setError(apiMessage);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось подтвердить email');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Подтверждение почты</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          После регистрации мы отправляем 6-значный код на email. Введи код ниже
          или запроси повторную отправку письма.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.textDisabled}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity
          style={[styles.secondaryButton, (!canResend || loading) && styles.buttonDisabled]}
          onPress={handleResend}
          activeOpacity={0.9}
          disabled={!canResend || loading}
        >
          <Text style={styles.secondaryButtonText}>Отправить письмо ещё раз</Text>
        </TouchableOpacity>

        <Text style={[styles.label, styles.tokenLabel]}>Код подтверждения</Text>
        <TextInput
          style={[styles.input, styles.tokenInput]}
          placeholder="Введите 6-значный код"
          placeholderTextColor={colors.textDisabled}
          keyboardType="number-pad"
          maxLength={6}
          autoCapitalize="none"
          autoCorrect={false}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (!canVerify || loading) && styles.buttonDisabled]}
          onPress={handleVerify}
          activeOpacity={0.9}
          disabled={!canVerify || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Подождите...' : 'Подтвердить email'}</Text>
        </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  backText: {
    fontSize: fontSize.xl,
    color: colors.text,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tokenLabel: {
    marginTop: spacing.xl,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.neutralMuted,
  },
  tokenInput: {
    minHeight: 56,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  secondaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutralMuted,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  errorText: {
    marginTop: spacing.sm,
    color: colors.error,
    fontSize: fontSize.sm,
  },
});
