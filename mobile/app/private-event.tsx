import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { api } from '../src/services/api';

export default function PrivateEventScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert('Ошибка', 'Введите код приглашения');
      return;
    }

    setLoading(true);
    try {
      const result = await api.resolvePrivateEventByCode(code.trim());
      setLoading(false);

      Alert.alert(
        'Доступ получен!',
        `Событие: ${result.title}\nОрганизатор: ${result.organizer}`,
        [
          {
            text: 'Перейти к событию',
            onPress: () => router.replace(`/event/${result.eventId}`),
          },
        ]
      );
    } catch (error) {
      setLoading(false);
      const message = error instanceof Error ? error.message : 'Не удалось получить доступ';
      Alert.alert('Ошибка', message);
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
      flex: 1,
      padding: spacing.xl,
      justifyContent: 'center',
    },
    icon: {
      fontSize: 64,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.xxl,
      lineHeight: 22,
    },
    input: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      fontSize: fontSize.xl,
      color: colors.text,
      fontWeight: fontWeight.bold,
      textAlign: 'center',
      letterSpacing: 4,
      borderWidth: 2,
      borderColor: colors.neutralLight,
      marginBottom: spacing.lg,
    },
    inputFocused: {
      borderColor: colors.accent,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      ...shadows.md,
    },
    buttonDisabled: {
      backgroundColor: colors.neutralMuted,
    },
    buttonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    hint: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Приватное событие</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.icon}>🔐</Text>
            <Text style={styles.title}>Введите код</Text>
            <Text style={styles.subtitle}>
              Получите код от организатора события, чтобы присоединиться
            </Text>

            <TextInput
              style={styles.input}
              placeholder="ABC123"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                handleSubmit();
              }}
            />

            <TouchableOpacity
              style={[styles.button, (loading || !code.trim()) && styles.buttonDisabled]}
              onPress={() => {
                Keyboard.dismiss();
                handleSubmit();
              }}
              disabled={loading || !code.trim()}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Получить доступ</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              Код состоит из букв и цифр, например: ABC123
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
