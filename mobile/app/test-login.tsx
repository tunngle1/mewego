import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAppStore } from '../src/store/useAppStore';

type Role = 'user' | 'organizer' | 'admin' | 'superadmin';

const ROLE_OPTIONS: Array<{ role: Role; label: string; hint: string }> = [
  { role: 'user', label: 'Участник', hint: 'Вкладки участника' },
  { role: 'organizer', label: 'Организатор', hint: 'Создание/ведение событий' },
  { role: 'admin', label: 'Админ', hint: 'Админка доступна из профиля' },
  { role: 'superadmin', label: 'Суперадмин', hint: 'Полные права' },
];

export default function TestLoginScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const startTestSession = useAppStore((s) => s.startTestSession);

  const [role, setRole] = useState<Role>('user');
  const [name, setName] = useState('');

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          borderRadius: borderRadius.full,
          backgroundColor: colors.white,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.neutralMuted,
          ...shadows.sm,
        },
        backText: { fontSize: fontSize.xl, color: colors.text },
        title: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.text },
        spacer: { width: 40 },
        content: { padding: spacing.lg, paddingBottom: spacing.xxl },
        card: {
          backgroundColor: colors.white,
          borderRadius: borderRadius.xxl,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.neutralMuted,
          ...shadows.sm,
          gap: spacing.md,
        },
        label: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMuted },
        input: {
          backgroundColor: colors.background,
          borderRadius: borderRadius.xl,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderWidth: 1,
          borderColor: colors.neutralMuted,
          fontSize: fontSize.md,
          color: colors.text,
        },
        roleGrid: { gap: spacing.sm },
        roleItem: {
          padding: spacing.md,
          borderRadius: borderRadius.xl,
          borderWidth: 1,
          borderColor: colors.neutralMuted,
          backgroundColor: colors.surfaceMuted,
        },
        roleItemSelected: {
          borderColor: colors.accent,
          backgroundColor: colors.accentLight,
        },
        roleTitle: { fontSize: fontSize.md, fontWeight: fontWeight.black, color: colors.text },
        roleHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
        submit: {
          marginTop: spacing.lg,
          backgroundColor: colors.accent,
          borderRadius: borderRadius.xl,
          paddingVertical: spacing.md,
          alignItems: 'center',
          ...shadows.md,
        },
        submitText: { fontSize: fontSize.md, fontWeight: fontWeight.black, color: colors.white },
        note: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 },
      }),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const handleStart = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Имя', 'Введите имя для тестового входа');
      return;
    }
    startTestSession({ role, name: trimmed });
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Тестовый вход</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.note}>
            Это локальный режим для тестов UI: без регистрации и без проверки токена на backend.
          </Text>

          <Text style={styles.label}>Роль</Text>
          <View style={styles.roleGrid}>
            {ROLE_OPTIONS.map((opt) => {
              const selected = opt.role === role;
              return (
                <TouchableOpacity
                  key={opt.role}
                  style={[styles.roleItem, selected && styles.roleItemSelected]}
                  onPress={() => setRole(opt.role)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.roleTitle}>{opt.label}</Text>
                  <Text style={styles.roleHint}>{opt.hint}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: spacing.sm }]}>Имя</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Например: Влад"
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity style={styles.submit} onPress={handleStart} activeOpacity={0.9}>
            <Text style={styles.submitText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

