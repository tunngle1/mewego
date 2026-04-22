import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { api } from '../../src/services/api';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function AuthBirthdateScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { setBirthDate } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const isValid = useMemo(() => {
    if (!selectedDate) return false;
    const yyyy = selectedDate.getFullYear();
    if (yyyy < 1900 || yyyy > new Date().getFullYear()) return false;
    return true;
  }, [selectedDate]);

  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const yyyy = String(selectedDate.getFullYear());
    return `${dd}.${mm}.${yyyy}`;
  }, [selectedDate]);

  const handlePickerChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowPicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleContinue = async () => {
    if (!isValid) return;
    const yyyy = String(selectedDate!.getFullYear());
    const mm = String(selectedDate!.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate!.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    setBirthDate(iso);

    // Сохраняем birthDate на сервер
    try {
      await api.updateProfile({ birthDate: iso });
    } catch (e) {
      console.error('[Birthdate] Failed to save birthDate:', e);
    }

    router.replace('/auth/profile-setup');
  };

  const handleSkip = () => {
    Alert.alert('Нужно заполнить', 'Дата рождения обязательна для продолжения.');
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
    dateField: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: fontSize.lg,
      color: colors.text,
      borderWidth: 2,
      borderColor: colors.neutralMuted,
      alignItems: 'center',
    },
    dateFieldValid: {
      borderColor: colors.accent,
    },
    dateFieldText: {
      fontSize: fontSize.lg,
      color: colors.text,
      fontWeight: fontWeight.bold,
      letterSpacing: 1,
    },
    dateFieldPlaceholder: {
      color: colors.textDisabled,
      fontWeight: fontWeight.medium,
    },
    hint: {
      marginTop: spacing.md,
      fontSize: fontSize.xs,
      color: colors.textDisabled,
      textAlign: 'center',
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
    skip: {
      marginTop: spacing.lg,
      alignItems: 'center',
    },
    skipText: {
      fontSize: fontSize.xs,
      color: colors.textDisabled,
      textDecorationLine: 'underline',
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
        <Text style={styles.heroTitle}>Дата рождения</Text>
        <Text style={styles.heroSubtitle}>Нужна для корректных рекомендаций и статистики</Text>

        <TouchableOpacity
          style={[styles.dateField, isValid && styles.dateFieldValid]}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.9}
        >
          <Text style={[styles.dateFieldText, !selectedDate && styles.dateFieldPlaceholder]}>
            {selectedDate ? formattedDate : 'Выбрать дату'}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={selectedDate || new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={handlePickerChange}
          />
        )}
        <Text style={styles.hint}>Выберите дату рождения в календаре</Text>

        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleContinue}
          activeOpacity={0.9}
          disabled={!isValid}
        >
          <Text style={styles.buttonText}>Продолжить</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skip} onPress={handleSkip}>
          <Text style={styles.skipText}>Пропустить</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
