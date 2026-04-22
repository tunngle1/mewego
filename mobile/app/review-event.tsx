import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { Button } from '../src/components/ui/Button';
import { api } from '../src/services/api';

export default function ReviewEventScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!eventId) {
      router.back();
      return;
    }

    setLoading(true);
    try {
      await api.createReview(eventId, rating, comment.trim() || undefined);
      Alert.alert('Спасибо!', 'Отзыв сохранён.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || 'Не удалось отправить отзыв';
      Alert.alert('Ошибка', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Оцените тренировку</Text>

        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.starButton, rating >= n && styles.starActive]}
              onPress={() => setRating(n)}
              activeOpacity={0.8}
            >
              <Text style={styles.starText}>{rating >= n ? '★' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Отзыв (по желанию)</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Напишите пару слов..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.input}
        />

        <Button
          title={loading ? 'Отправка...' : 'Отправить'}
          onPress={handleSubmit}
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  ratingRow: { flexDirection: 'row', gap: 8 },
  starButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutralLight,
    ...shadows.sm,
  },
  starActive: { borderColor: colors.accent },
  starText: { fontSize: 24, color: colors.accent },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMuted },
  input: {
    minHeight: 120,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutralLight,
    color: colors.text,
    textAlignVertical: 'top',
    ...shadows.sm,
  },
});
