import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';

export default function HelpScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

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
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    title: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    text: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Помощь</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Как создать событие?</Text>
          <Text style={styles.text}>
            Перейдите в профиль организатора, нажмите «Создать событие» и заполните шаги мастера. После отправки событие попадёт на модерацию.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Как записаться на событие?</Text>
          <Text style={styles.text}>
            Откройте карточку события и нажмите кнопку записи. Если мест нет, приложение предложит лист ожидания.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Куда писать по проблемам?</Text>
          <Text style={styles.text}>
            Пока раздел поддержки работает как справка. Для тестирования передавайте ошибку, роль пользователя, шаги воспроизведения и скриншот команде проекта.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
