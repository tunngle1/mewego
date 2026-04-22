import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { Button } from '../src/components/ui/Button';
import { useAppStore } from '../src/store/useAppStore';
import { POINTS } from '../src/constants';
import { api } from '../src/services/api';

const FEELINGS = [
  { emoji: '😊', label: 'Спокойно' },
  { emoji: '💪', label: 'Бодро' },
  { emoji: '😴', label: 'Устал(а)' },
];

export default function PostEventScreen() {
  const router = useRouter();
  const { eventId, bookingId } = useLocalSearchParams<{ eventId: string; bookingId?: string }>();
  const { addPoints, addExperience, updateBookingStatus, refreshGamification } = useAppStore();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFeelingSelect = (feeling: string) => {
    setSelectedFeeling(feeling);
  };

  const handleContinue = async () => {
    if (!eventId) {
      router.replace('/(tabs)/challenges');
      return;
    }

    setLoading(true);
    try {
      // Self check-in через API
      const result = await api.confirmAttendance(eventId);
      
      // Обновляем локальный статус
      if (bookingId) {
        updateBookingStatus(bookingId, 'attended');
      }
      
      // Обновляем gamification с сервера
      await refreshGamification();
      
      // Локальный fallback для очков
      addPoints(POINTS.eventAttended);
      addExperience(POINTS.eventAttended);
      
      router.replace('/(tabs)/challenges');
    } catch (error: any) {
      console.error('[PostEvent] confirmAttendance error:', error);
      
      // Parse backend error message
      let title = 'Ошибка';
      let message = 'Не удалось подтвердить присутствие. Попробуйте позже.';
      let showRetry = true;
      
      const errorData = error?.data || error?.response?.data || {};
      const backendError = errorData?.error || '';
      const backendMessage = errorData?.message || '';
      
      if (backendError === 'Event not finished yet' || backendMessage.includes('завершения события')) {
        title = 'Событие ещё не завершено';
        message = 'Подтверждение посещения будет доступно после того, как организатор завершит событие.';
        showRetry = false;
      } else if (backendError === 'Attendance window expired' || backendMessage.includes('истекло')) {
        title = 'Время истекло';
        message = 'Окно подтверждения посещения (24 часа после окончания) истекло.';
        showRetry = false;
      }
      
      const buttons = showRetry
        ? [
            { text: 'Пропустить', onPress: () => router.replace('/(tabs)/challenges') },
            { text: 'Повторить', onPress: handleContinue },
          ]
        : [{ text: 'Понятно', onPress: () => router.replace('/(tabs)/challenges') }];
      
      Alert.alert(title, message, buttons);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <Text style={styles.icon}>🌱</Text>

        {/* Message */}
        <Text style={styles.title}>Ваше тело говорит "спасибо"</Text>
        <Text style={styles.description}>
          Не важно, как много вы сделали. Важно, что вы нашли время для себя.
          Как самочувствие?
        </Text>

        {/* Feeling Selection */}
        <View style={styles.feelingsGrid}>
          {FEELINGS.map((feeling) => (
            <TouchableOpacity
              key={feeling.label}
              style={[
                styles.feelingButton,
                selectedFeeling === feeling.label && styles.feelingButtonActive,
              ]}
              onPress={() => handleFeelingSelect(feeling.label)}
              activeOpacity={0.8}
            >
              <Text style={styles.feelingEmoji}>{feeling.emoji}</Text>
              <Text
                style={[
                  styles.feelingLabel,
                  selectedFeeling === feeling.label && styles.feelingLabelActive,
                ]}
              >
                {feeling.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Motivational Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "Сегодня вы сделали шаг навстречу привычке. Завтра вы почувствуете
            это в каждом движении."
          </Text>
        </View>

        {/* Continue Button */}
        <Button
          title={loading ? "Подтверждение..." : "Подтвердить присутствие"}
          onPress={handleContinue}
          variant="accent"
          size="lg"
          fullWidth
          disabled={loading}
        />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 38,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  feelingsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginBottom: spacing.xxl,
  },
  feelingButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral,
    ...shadows.sm,
  },
  feelingButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  feelingEmoji: {
    fontSize: fontSize.xxl,
    marginBottom: spacing.xs,
  },
  feelingLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  feelingLabelActive: {
    color: colors.primary,
  },
  quoteCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral,
    width: '100%',
    marginBottom: spacing.xxl,
  },
  quoteText: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
});
