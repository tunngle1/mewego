import React, { useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function AuthPhoneScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { logout } = useAppStore();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const isPhoneValid = useMemo(() => phone.replace(/\D/g, '').length >= 10, [phone]);
  const isCodeValid = useMemo(() => code.replace(/\D/g, '').length >= 4, [code]);

  const handleSendCode = () => {
    if (!isPhoneValid) return;
    setStep('code');
  };

  const handleConfirm = () => {
    if (!isCodeValid) return;

    Alert.alert('Не поддерживается', 'Вход по телефону пока не реализован. Используйте регистрацию по email.');
    logout();
    router.replace({ pathname: '/auth/email', params: { role: role || 'user' } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Вход по номеру</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {step === 'phone' ? (
          <>
            <Text style={styles.label}>Номер телефона</Text>
            <TextInput
              style={styles.input}
              placeholder="+7 (999) 123-45-67"
              placeholderTextColor={colors.textDisabled}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <TouchableOpacity
              style={[styles.button, !isPhoneValid && styles.buttonDisabled]}
              onPress={handleSendCode}
              activeOpacity={0.9}
              disabled={!isPhoneValid}
            >
              <Text style={styles.buttonText}>Отправить код</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>Мок: код не отправляется, просто нажмите «Отправить код».</Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>Код из SMS</Text>
            <TextInput
              style={styles.input}
              placeholder="0000"
              placeholderTextColor={colors.textDisabled}
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.button, !isCodeValid && styles.buttonDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.9}
              disabled={!isCodeValid}
            >
              <Text style={styles.buttonText}>Подтвердить</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('phone')} style={styles.linkButton}>
              <Text style={styles.linkText}>Изменить номер</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>Мок: введите любой код (минимум 4 цифры).</Text>
          </>
        )}
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
  button: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  linkButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  linkText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textDecorationLine: 'underline',
  },
  hint: {
    marginTop: spacing.lg,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
