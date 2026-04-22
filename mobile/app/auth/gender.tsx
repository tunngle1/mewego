import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore, Gender } from '../../src/store/useAppStore';
import { api } from '../../src/services/api';

const GENDER_OPTIONS: { id: Gender; label: string; emoji: string }[] = [
  { id: 'female', label: 'Женщина', emoji: '👩' },
  { id: 'male', label: 'Мужчина', emoji: '👨' },
  { id: 'other', label: 'Не указывать', emoji: '🙂' },
];

export default function AuthGenderScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { setGender } = useAppStore();
  const [selected, setSelected] = useState<Gender | null>(null);

  const handleContinue = async () => {
    if (selected) {
      setGender(selected);
      // Сохраняем gender на сервер
      try {
        await api.updateProfile({ gender: selected });
      } catch (e) {
        console.error('[Gender] Failed to save gender:', e);
      }
      router.replace('/auth/birthdate');
    }
  };

  const styles = StyleSheet.create({
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
      justifyContent: 'center',
    },
    heroTitle: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    heroSubtitle: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.xxl,
    },
    options: {
      gap: spacing.md,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 2,
      borderColor: colors.neutralMuted,
    },
    optionSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    optionEmoji: {
      fontSize: 32,
      marginRight: spacing.md,
    },
    optionLabel: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    button: {
      marginTop: spacing.xxl,
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
    note: {
      marginTop: spacing.lg,
      fontSize: fontSize.xs,
      color: colors.textDisabled,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Регистрация</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.heroTitle}>Как к вам обращаться?</Text>
        <Text style={styles.heroSubtitle}>
          Это поможет подобрать оформление приложения
        </Text>

        <View style={styles.options}>
          {GENDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.option,
                selected === option.id && styles.optionSelected,
              ]}
              onPress={() => setSelected(option.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <Text style={styles.optionLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !selected && styles.buttonDisabled]}
          onPress={handleContinue}
          activeOpacity={0.9}
          disabled={!selected}
        >
          <Text style={styles.buttonText}>Продолжить</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Оформление можно изменить в настройках
        </Text>
      </View>
    </SafeAreaView>
  );
}
