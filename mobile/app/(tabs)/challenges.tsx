import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { useAppStore } from '../../src/store/useAppStore';

export default function ChallengesScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { user, refreshGamification } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshGamification();
    setRefreshing(false);
  }, [refreshGamification]);

  const handleUpgrade = () => {
    if (process.env.EXPO_PUBLIC_DISABLE_SUBSCRIPTIONS === 'true') {
      Alert.alert(
        'Подписки временно отключены',
        'Челленджи доступны без подписки в первые месяцы.'
      );
      return;
    }
    router.push('/paywall');
  };

  const experienceProgress = user ? (user.experience / 1000) * 100 : 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl * 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xl,
      marginTop: spacing.sm,
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
    backIcon: {
      fontSize: fontSize.xl,
      color: colors.text,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    placeholder: {
      width: 40,
    },
    levelCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      marginBottom: spacing.xl,
      alignItems: 'center',
      overflow: 'hidden',
      ...shadows.sm,
    },
    levelDecor: {
      position: 'absolute',
      top: -48,
      right: -48,
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primaryLight,
    },
    levelLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.accent,
      letterSpacing: 2,
      marginBottom: spacing.sm,
    },
    levelTitle: {
      fontSize: fontSize.xxxl,
      fontWeight: fontWeight.black,
      color: colors.text,
      marginBottom: spacing.md,
    },
    progressBar: {
      marginBottom: spacing.sm,
    },
    levelProgress: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    communityCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    avatarsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    avatarWrapper: {
      width: 48,
      height: 48,
      position: 'relative',
    },
    progressRing: {
      position: 'absolute',
      inset: -4,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: colors.neutral,
      opacity: 0.2,
    },
    progressRingFill: {
      position: 'absolute',
      inset: 0,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: colors.accent,
      borderTopColor: 'transparent',
      borderRightColor: 'transparent',
    },
    memberAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: colors.white,
    },
    showAllButton: {
      alignItems: 'center',
    },
    showAllText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.accent,
      letterSpacing: 1,
    },
    goalCta: {
      backgroundColor: colors.text,
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      overflow: 'hidden',
      ...shadows.lg,
    },
    goalCtaContent: {
      position: 'relative',
      zIndex: 1,
    },
    goalCtaTitle: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.white,
      marginBottom: spacing.sm,
    },
    goalCtaDescription: {
      fontSize: fontSize.sm,
      color: colors.white,
      opacity: 0.7,
      lineHeight: 20,
      marginBottom: spacing.lg,
    },
    goalCtaButton: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    goalCtaButtonGradient: {
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderRadius: borderRadius.lg,
    },
    goalCtaButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    goalCtaEmoji: {
      position: 'absolute',
      bottom: -20,
      right: -10,
      fontSize: 120,
      opacity: 0.1,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Ваш путь</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Level Card */}
        <View style={styles.levelCard}>
          <View style={styles.levelDecor} />
          <Text style={styles.levelLabel}>УРОВЕНЬ {user?.level || 1}</Text>
          <Text style={styles.levelTitle}>Искатель комфорта</Text>
          <ProgressBar
            progress={experienceProgress}
            height={12}
            style={styles.progressBar}
          />
          <Text style={styles.levelProgress}>
            {user?.experience || 0} / 1000 опыта
          </Text>
        </View>

        {/* New Goal CTA */}
        <View style={styles.goalCta}>
          <View style={styles.goalCtaContent}>
            <Text style={styles.goalCtaTitle}>Задать новую цель?</Text>
            <Text style={styles.goalCtaDescription}>
              Система ME·WE·GO подберет для вас челлендж на неделю на
              основе ваших прошлых успехов.
            </Text>
            <TouchableOpacity
              style={styles.goalCtaButton}
              onPress={handleUpgrade}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.accent, colors.accent]}
                style={styles.goalCtaButtonGradient}
              >
                <Text style={styles.goalCtaButtonText}>Подобрать цель</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Text style={styles.goalCtaEmoji}>🌱</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
