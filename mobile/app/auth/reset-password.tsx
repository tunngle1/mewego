import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api, ApiError } from '../../src/services/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const [token, setToken] = useState(typeof params.token === 'string' ? params.token : '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = token.trim().length >= 16 && password.length >= 8;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api.resetPassword(token.trim(), password);
      Alert.alert('Пароль обновлён', 'Новый пароль сохранён. Теперь можно войти по почте.');
      router.replace('/auth/email');
    } catch (err) {
      if (err instanceof ApiError) {
        const apiMessage = typeof err.data === 'object' && err.data && 'error' in (err.data as any)
          ? String((err.data as any).error)
          : err.message;
        setError(apiMessage);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось обновить пароль');
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
        <Text style={styles.title}>Новый пароль</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Открой ссылку из письма или вставь token вручную и задай новый пароль.
        </Text>

        <Text style={styles.label}>Token</Text>
        <TextInput
          style={[styles.input, styles.tokenInput]}
          placeholder="Вставь token из ссылки"
          placeholderTextColor={colors.textDisabled}
          autoCapitalize="none"
          autoCorrect={false}
          value={token}
          onChangeText={setToken}
        />

        <Text style={styles.label}>Новый пароль</Text>
        <TextInput
          style={styles.input}
          placeholder="Минимум 8 символов"
          placeholderTextColor={colors.textDisabled}
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (!canSubmit || loading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={!canSubmit || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Подождите...' : 'Сохранить пароль'}</Text>
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  errorText: {
    marginTop: spacing.sm,
    color: colors.error,
    fontSize: fontSize.sm,
  },
});
