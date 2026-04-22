import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { api } from '../src/services/api';

type ComplaintReason = 'unsafe' | 'fraud' | 'abuse' | 'spam' | 'other';

const REASONS: { value: ComplaintReason; label: string; icon: string }[] = [
  { value: 'unsafe', label: 'Небезопасно', icon: '⚠️' },
  { value: 'fraud', label: 'Мошенничество', icon: '🚫' },
  { value: 'abuse', label: 'Оскорбления', icon: '😤' },
  { value: 'spam', label: 'Спам', icon: '📢' },
  { value: 'other', label: 'Другое', icon: '📝' },
];

export default function ComplaintScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ targetType?: string; targetId?: string; targetName?: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const [selectedReason, setSelectedReason] = useState<ComplaintReason | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const targetType = params.targetType || 'event';
  const targetId = params.targetId;
  const targetName = params.targetName || 'Событие';

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Выберите причину', 'Пожалуйста, укажите причину жалобы');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Опишите проблему', 'Пожалуйста, напишите причину жалобы');
      return;
    }

    if (!targetId) {
      Alert.alert('Ошибка', 'Не удалось определить объект жалобы');
      return;
    }

    setLoading(true);

    try {
      await api.createComplaint({
        targetType: targetType as any,
        targetId,
        reason: selectedReason,
        description: comment.trim(),
      });

      Alert.alert(
        'Жалоба отправлена',
        'Спасибо за обращение. Мы рассмотрим вашу жалобу в ближайшее время.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось отправить жалобу';
      Alert.alert('Ошибка', message);
    } finally {
      setLoading(false);
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
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMuted,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    backIcon: {
      fontSize: fontSize.xl,
      color: colors.text,
    },
    headerTitle: {
      flex: 1,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginRight: 40,
    },
    content: {
      padding: spacing.lg,
    },
    targetCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    targetLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: spacing.xs,
    },
    targetName: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    sectionTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    reasonsContainer: {
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    reasonButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 2,
      borderColor: colors.neutralLight,
      gap: spacing.md,
    },
    reasonButtonSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    reasonIcon: {
      fontSize: fontSize.xl,
    },
    reasonLabel: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: fontWeight.medium,
    },
    commentInput: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      fontSize: fontSize.md,
      color: colors.text,
      minHeight: 120,
      textAlignVertical: 'top',
      marginBottom: spacing.xl,
    },
    submitButton: {
      backgroundColor: colors.accent,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      ...shadows.md,
    },
    submitButtonDisabled: {
      backgroundColor: colors.neutralLight,
    },
    submitButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    note: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.md,
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Пожаловаться</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.targetCard}>
          <Text style={styles.targetLabel}>
            {targetType === 'event' ? 'СОБЫТИЕ' : 'ОРГАНИЗАТОР'}
          </Text>
          <Text style={styles.targetName}>{targetName}</Text>
        </View>

        <Text style={styles.sectionTitle}>Причина жалобы</Text>
        <View style={styles.reasonsContainer}>
          {REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.value}
              style={[
                styles.reasonButton,
                selectedReason === reason.value && styles.reasonButtonSelected,
              ]}
              onPress={() => setSelectedReason(reason.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.reasonIcon}>{reason.icon}</Text>
              <Text style={styles.reasonLabel}>{reason.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Комментарий</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Опишите ситуацию подробнее..."
          placeholderTextColor={colors.textMuted}
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedReason || loading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedReason || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Отправка...' : 'Отправить жалобу'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Мы рассмотрим вашу жалобу и примем меры, если обнаружим нарушение правил платформы.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
