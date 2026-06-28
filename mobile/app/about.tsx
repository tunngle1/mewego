import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';

export default function AboutScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const version = Constants.expoConfig?.version || '1.0.0';

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
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    logo: {
      fontSize: 34,
      fontWeight: fontWeight.black,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    version: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    text: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      lineHeight: 21,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>О приложении</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.logo}>ME·WE·GO</Text>
          <Text style={styles.version}>Версия {version}</Text>
          <Text style={styles.text}>
            ME·WE·GO помогает находить события, присоединяться к активностям и организовывать встречи рядом с вами.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
