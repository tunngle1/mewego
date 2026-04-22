import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { api } from '../../src/services/api';

type SubscriptionStatus = 'none' | 'trial' | 'active' | 'expired' | 'free';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { user, updateUser } = useAppStore();
  const [loading, setLoading] = useState(false);

  // Читаем статус подписки из user.subscription
  const subscription = user?.subscription;
  const subscriptionStatus: SubscriptionStatus = subscription?.isActive
    ? (subscription.plan as SubscriptionStatus)
    : 'none';
  
  // Вычисляем оставшиеся дни
  const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
  const now = new Date();
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  
  const planName = subscription?.plan === 'trial' ? 'Пробный' : subscription?.plan === 'basic' ? 'Basic' : 'Бесплатный';
  const planPrice = subscription?.isActive ? '349 ₽/мес' : 'Бесплатно';

  const handleUpgrade = () => {
    if (process.env.EXPO_PUBLIC_DISABLE_SUBSCRIPTIONS === 'true') {
      Alert.alert(
        'Подписки временно отключены',
        'Покупки/подписки будут добавлены позже. Сейчас доступ к функциям открыт.'
      );
      return;
    }
    router.push('/paywall');
  };

  const handleRestore = () => {
    Alert.alert('Восстановление', 'Покупки восстановлены');
  };

  const handleCancel = () => {
    Alert.alert(
      'Отмена подписки',
      'Вы уверены, что хотите отменить подписку? Вы потеряете доступ к премиум-функциям.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отменить подписку',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await api.cancelSubscription();
              updateUser({
                subscription: {
                  ...subscription!,
                  isActive: true, // Остаётся активной до endAt
                },
              });
              Alert.alert('Готово', result.message || 'Подписка отменена. Доступ сохранится до конца периода.');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось отменить подписку');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
    statusCard: {
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.lg,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.full,
      marginBottom: spacing.md,
    },
    statusBadgeText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.white,
      letterSpacing: 1,
    },
    planName: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.black,
      color: colors.white,
      marginBottom: spacing.xs,
    },
    planPrice: {
      fontSize: fontSize.lg,
      color: colors.white,
      opacity: 0.9,
      marginBottom: spacing.md,
    },
    trialInfo: {
      fontSize: fontSize.sm,
      color: colors.white,
      opacity: 0.8,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: spacing.md,
    },
    benefitsList: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.md,
    },
    benefitIcon: {
      fontSize: fontSize.lg,
    },
    benefitText: {
      fontSize: fontSize.md,
      color: colors.text,
      flex: 1,
    },
    actionButton: {
      backgroundColor: colors.accent,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginBottom: spacing.md,
      ...shadows.md,
    },
    actionButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    secondaryButton: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      marginBottom: spacing.md,
    },
    secondaryButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    cancelButton: {
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    note: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
      lineHeight: 18,
    },
  });

  const getStatusLabel = () => {
    switch (subscriptionStatus) {
      case 'trial':
        return 'ПРОБНЫЙ ПЕРИОД';
      case 'active':
        return 'АКТИВНА';
      case 'expired':
        return 'ИСТЕКЛА';
      default:
        return 'НЕТ ПОДПИСКИ';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Подписка</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={[colors.accent, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statusCard}
        >
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{getStatusLabel()}</Text>
          </View>
          <Text style={styles.planName}>{planName}</Text>
          <Text style={styles.planPrice}>{planPrice}</Text>
          {subscriptionStatus === 'trial' && daysLeft > 0 && (
            <Text style={styles.trialInfo}>
              Осталось {daysLeft} дней пробного периода
            </Text>
          )}
          {subscriptionStatus === 'active' && daysLeft > 0 && (
            <Text style={styles.trialInfo}>
              Активна ещё {daysLeft} дней
            </Text>
          )}
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ЧТО ВКЛЮЧЕНО</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>📋</Text>
              <Text style={styles.benefitText}>Очередь ожидания на события</Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>🎯</Text>
              <Text style={styles.benefitText}>Челленджи и достижения</Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>📊</Text>
              <Text style={styles.benefitText}>Расширенная статистика</Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>🔔</Text>
              <Text style={styles.benefitText}>Умные напоминания</Text>
            </View>
          </View>
        </View>

        {subscriptionStatus === 'trial' || subscriptionStatus === 'none' ? (
          <TouchableOpacity style={styles.actionButton} onPress={handleUpgrade}>
            <Text style={styles.actionButtonText}>Оформить подписку</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.secondaryButton} onPress={handleRestore}>
          <Text style={styles.secondaryButtonText}>Восстановить покупки</Text>
        </TouchableOpacity>

        {subscriptionStatus === 'active' && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Отменить подписку</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.note}>
          Подписка автоматически продлевается. Отменить можно в любой момент в настройках App Store или Google Play.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
