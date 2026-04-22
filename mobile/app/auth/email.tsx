import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { api, ApiError, getApiBaseUrl } from '../../src/services/api';
import { User } from '../../src/types';

const createStoreUser = (payload: {
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
}) : User => ({
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

export default function AuthEmailScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { login, updateUser } = useAppStore();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pingState, setPingState] = useState<{ ok: boolean; text: string } | null>(null);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const passwordValid = useMemo(() => password.length >= 8, [password]);
  const canSubmit = mode === 'login' ? emailValid && passwordValid : emailValid && passwordValid && name.trim().length >= 2;

  const continueAfterAuth = async (userPayload: {
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
    isEmailVerified?: boolean;
  }) => {
    const user = createStoreUser(userPayload);
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

    updateUser({ email: userPayload.email || user.email });

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
  };

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        const response = await api.loginWithEmail(email.trim(), password);
        await continueAfterAuth(response.user);
      } else {
        const effectiveRole = role === 'organizer' ? 'organizer' : 'user';
        const response = await api.registerWithEmail({
          email: email.trim(),
          password,
          name: name.trim(),
          role: effectiveRole,
          marketingEmailOptIn: marketingOptIn,
        });
        if (response.verification?.required) {
          const deliveryLabel = response.verification.deliveryStatus === 'sent'
            ? 'Письмо с подтверждением отправлено.'
            : response.verification.deliveryStatus === 'queued'
              ? 'Письмо поставлено в отправку. Если не пришло — проверьте позже или нажмите “Отправить код повторно”.'
              : response.verification.deliveryStatus === 'skipped'
                ? 'Почтовый транспорт пока не настроен. Подтверждение email нужно будет завершить после настройки SMTP.'
                : 'Не удалось отправить письмо подтверждения автоматически.';
          Alert.alert('Почта для подтверждения', deliveryLabel);
        }
        router.push({
          pathname: '/auth/verify-email',
          params: { email: email.trim() },
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const apiMessage = typeof err.data === 'object' && err.data && 'error' in (err.data as any)
          ? String((err.data as any).error)
          : err.message;
        setError(apiMessage);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось выполнить авторизацию по почте');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePing = async () => {
    setPingState(null);
    try {
      const startedAt = Date.now();
      const result = await api.pingHealth();
      const ms = Date.now() - startedAt;
      setPingState({ ok: true, text: `OK (${ms}ms): ${result.status}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPingState({ ok: false, text: message });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{mode === 'login' ? 'Вход по почте' : 'Регистрация по почте'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[styles.modePill, mode === 'register' && styles.modePillActive]}
              onPress={() => setMode('register')}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeText, mode === 'register' && styles.modeTextActive]}>Регистрация</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modePill, mode === 'login' && styles.modePillActive]}
              onPress={() => setMode('login')}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>Вход</Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' ? (
            <>
              <Text style={styles.label}>Имя</Text>
              <TextInput
                style={styles.input}
                placeholder="Как к вам обращаться"
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            placeholder="Минимум 8 символов"
            placeholderTextColor={colors.textDisabled}
            secureTextEntry
            autoCapitalize="none"
            textContentType={mode === 'login' ? 'password' : 'newPassword'}
            value={password}
            onChangeText={setPassword}
          />

          {mode === 'register' ? (
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceTextWrap}>
                <Text style={styles.preferenceTitle}>Получать письма и новости</Text>
                <Text style={styles.preferenceSubtitle}>Согласие на будущие email-рассылки и обновления продукта</Text>
              </View>
              <Switch value={marketingOptIn} onValueChange={setMarketingOptIn} />
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.9}
            disabled={!canSubmit || loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push({ pathname: '/auth/verify-email', params: { email: email.trim() } })}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Подтвердить email или отправить письмо повторно</Text>
          </TouchableOpacity>

          {mode === 'login' ? (
            <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} style={styles.linkButton}>
              <Text style={styles.linkText}>Забыли пароль?</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.hint}>
            После регистрации потребуется подтверждение email. Если SMTP Yandex 360 ещё не настроен,
            аккаунт всё равно создастся, а подтверждение можно будет завершить после настройки почтового транспорта.
          </Text>

          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>Диагностика API</Text>
            <Text style={styles.debugText}>Base URL: {getApiBaseUrl()}</Text>
            <TouchableOpacity onPress={handlePing} style={styles.debugButton} activeOpacity={0.9}>
              <Text style={styles.debugButtonText}>Проверить /health</Text>
            </TouchableOpacity>
            {pingState ? (
              <Text style={[styles.debugResult, pingState.ok ? styles.debugOk : styles.debugFail]}>
                {pingState.text}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardContainer: {
    flex: 1,
  },
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
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.full,
    padding: 4,
    marginBottom: spacing.xl,
  },
  modePill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  modePillActive: {
    backgroundColor: colors.text,
  },
  modeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  modeTextActive: {
    color: colors.white,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
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
    marginBottom: spacing.md,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  preferenceTextWrap: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  preferenceSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  linkButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textDecorationLine: 'underline',
  },
  errorText: {
    marginTop: spacing.sm,
    color: colors.error,
    fontSize: fontSize.sm,
  },
  hint: {
    marginTop: spacing.md,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  debugCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutralMuted,
  },
  debugTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  debugText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  debugButton: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  debugButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  debugResult: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
  },
  debugOk: {
    color: '#16a34a',
  },
  debugFail: {
    color: colors.error,
  },
});
