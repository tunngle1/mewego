import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { Button } from '../src/components/ui/Button';
import { Badge } from '../src/components/ui/Badge';
import { useAppStore } from '../src/store/useAppStore';
import { api } from '../src/services/api';
import { SUBSCRIPTION_PRICES } from '../src/constants';

const FEATURES = [
  {
    icon: '👥',
    title: 'Персональный куратор',
    description: 'Поможет выбрать направление и держать регулярность.',
  },
  {
    icon: '🛡️',
    title: 'Страховка старта',
    description: 'Возвращаем 50% стоимости, если вы не пришли из-за тревоги.',
  },
  {
    icon: '🔑',
    title: 'Секретные группы',
    description: 'Доступ к камерным встречам только "для своих".',
  },
  {
    icon: '🔔',
    title: 'Очередь на события',
    description: 'Встаньте в очередь на заполненные события и получите уведомление о свободном месте.',
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { updateUser } = useAppStore();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_DISABLE_SUBSCRIPTIONS === 'true') {
      Alert.alert(
        'Подписки временно отключены',
        'В первые месяцы подписок в приложении не будет. Доступ к функциям уже открыт.'
      );
      router.back();
    }
  }, [router]);

  const handleClose = () => {
    router.back();
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const result = await api.subscribe('user_349', { trial: true });
      updateUser({
        subscription: {
          plan: result.status === 'trial' ? 'trial' : 'basic',
          startDate: result.startAt.split('T')[0],
          endDate: result.endAt.split('T')[0],
          isActive: true,
          trialUsed: result.status !== 'trial',
        },
      });
      router.back();
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeIcon}>×</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🤝</Text>
          <Text style={styles.title}>Поддержка процесса</Text>
          <Text style={styles.subtitle}>
            ME·WE·GO — это не просто поиск занятий. Это ваша страховка от того,
            чтобы всё не бросить.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>{feature.icon}</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing Card */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingTitle}>Доступ на месяц</Text>
            <Badge label="Хит" variant="accent" size="sm" />
          </View>
          <Text style={styles.pricingDescription}>
            Все функции поддержки + 1 событие в подарок
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{SUBSCRIPTION_PRICES.basic} ₽</Text>
            <Text style={styles.pricePeriod}>/ месяц</Text>
          </View>
        </View>

        {/* CTA */}
        <Button
          title="Попробовать неделю бесплатно"
          onPress={handleSubscribe}
          variant="accent"
          size="lg"
          fullWidth
          loading={loading}
        />

        <Text style={styles.disclaimer}>
          БЕЗОПАСНАЯ ОПЛАТА • ОТМЕНА В ЛЮБОЙ МОМЕНТ
        </Text>
      </ScrollView>
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
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 32,
    color: colors.textMuted,
    fontWeight: fontWeight.normal,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  headerIcon: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: {
    fontSize: fontSize.xxl,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    lineHeight: 20,
  },
  pricingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.accent,
    marginBottom: spacing.xl,
    ...shadows.xl,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pricingTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  pricingDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  price: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  pricePeriod: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  disclaimer: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: spacing.md,
  },
});
