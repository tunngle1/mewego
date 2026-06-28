import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function TermsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    backIcon: { fontSize: fontSize.xl, color: colors.text },
    headerTitle: {
      flex: 1,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginRight: 40,
    },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
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
      marginBottom: spacing.md,
    },
    text: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      lineHeight: 21,
      marginBottom: spacing.md,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Условия использования</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Основные правила</Text>
          <Text style={styles.text}>
            Пользователь отвечает за корректность данных профиля, уважительное общение и соблюдение правил безопасности на событиях.
          </Text>
          <Text style={styles.text}>
            Организаторы обязуются указывать достоверное описание, место, время и условия участия. События могут проходить модерацию перед публикацией.
          </Text>
          <Text style={styles.text}>
            Финальная юридическая редакция условий будет добавлена перед публичным релизом. Сейчас страница закрывает навигацию и базовую проверку интерфейса.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
