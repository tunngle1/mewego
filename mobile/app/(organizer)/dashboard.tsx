import React, { useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { Avatar } from '../../src/components/ui/Avatar';
import { ProgressBar } from '../../src/components/ui/ProgressBar';

const formatEventDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === now.toDateString()) {
    return 'Сегодня';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Завтра';
  }
  
  const day = date.getDate();
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Мая', 'Июн', 
                  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  return `${day} ${months[date.getMonth()]}`;
};

const formatEventTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const formatRevenue = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}к`;
  }
  return value.toString();
};

export default function OrganizerDashboard() {
  const router = useRouter();
  const { user, logout, organizerEvents } = useAppStore();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const stats = useMemo(() => {
    const activeEvents = organizerEvents.filter(
      (e) => e.status === 'approved' || e.status === 'pending'
    );
    const totalParticipants = organizerEvents.reduce(
      (sum, e) => sum + e.participantsJoinedCount, 0
    );
    const totalRevenue = organizerEvents.reduce(
      (sum, e) => sum + e.revenueTotal, 0
    );
    
    return [
      { label: 'Событий', value: organizerEvents.length.toString(), trend: `+${activeEvents.length}`, color: colors.primary },
      { label: 'Участников', value: totalParticipants.toString(), trend: '+', color: colors.accent },
      { label: 'Выручка', value: formatRevenue(totalRevenue), trend: '', color: colors.text },
    ];
  }, [organizerEvents, colors]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return organizerEvents
      .filter((e) => (e.status === 'approved' || e.status === 'pending') && new Date(e.startAt) > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 3);
  }, [organizerEvents]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create':
        router.push('/organizer-event/create');
        break;
      case 'stats':
        router.push('/(organizer)/stats');
        break;
      case 'certificates':
        router.push('/(organizer)/certificates');
        break;
      case 'reviews':
        Alert.alert('Отзывы', 'Функция отзывов находится в разработке');
        break;
      case 'profile':
        router.push('/organizer-event/profile-edit');
        break;
    }
  };

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
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    greeting: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      alignItems: 'center',
      ...shadows.sm,
    },
    statValue: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.black,
    },
    statLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    statTrend: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      marginTop: spacing.sm,
    },
    statTrendText: {
      fontSize: fontSize.xs - 1,
      fontWeight: fontWeight.bold,
      color: colors.primary,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    seeAllButton: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.accent,
      letterSpacing: 2,
    },
    eventsList: {
      gap: spacing.sm,
    },
    eventCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      ...shadows.sm,
    },
    eventInfo: {
      flex: 1,
    },
    eventTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    eventDate: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
    eventParticipants: {
      alignItems: 'flex-end',
      width: 60,
    },
    participantsCount: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.primary,
    },
    participantsBar: {
      width: 60,
      marginTop: spacing.xs,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    actionCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      alignItems: 'center',
      ...shadows.sm,
    },
    actionIcon: {
      marginBottom: spacing.sm,
    },
    actionLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    tipCard: {
      flexDirection: 'row',
      backgroundColor: colors.primaryLight,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: 'rgba(20, 184, 166, 0.2)',
    },
    tipEmoji: {
      fontSize: 24,
      marginRight: spacing.md,
    },
    tipContent: {
      flex: 1,
    },
    tipTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    tipText: {
      fontSize: fontSize.xs,
      color: colors.textLight,
      lineHeight: 16,
    },
    emptyEvents: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
    },
    emptyEventsText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    emptyEventsLink: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.accent,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Привет, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.subtitle}>Панель организатора</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Avatar source={user?.avatar} size={48} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              {stat.trend ? (
                <View style={styles.statTrend}>
                  <Text style={styles.statTrendText}>{stat.trend}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ближайшие события</Text>
            <TouchableOpacity onPress={() => router.push('/(organizer)/events')}>
              <Text style={styles.seeAllButton}>ВСЕ</Text>
            </TouchableOpacity>
          </View>

          {upcomingEvents.length > 0 ? (
            <View style={styles.eventsList}>
              {upcomingEvents.map((event) => (
                <TouchableOpacity 
                  key={event.id} 
                  style={styles.eventCard}
                  onPress={() => router.push(`/organizer-event/${event.id}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventDate}>
                      {formatEventDate(event.startAt)}, {formatEventTime(event.startAt)}
                    </Text>
                  </View>
                  <View style={styles.eventParticipants}>
                    <Text style={styles.participantsCount}>
                      {event.participantsJoinedCount}/{event.capacity || '∞'}
                    </Text>
                    {event.capacity && (
                      <ProgressBar
                        progress={event.participantsJoinedCount / event.capacity}
                        height={4}
                        style={styles.participantsBar}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyEvents}>
              <Text style={styles.emptyEventsText}>Нет предстоящих событий</Text>
              <TouchableOpacity onPress={() => router.push('/organizer-event/create')}>
                <Text style={styles.emptyEventsLink}>Создать первое событие</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Быстрые действия</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('create')}>
              <Ionicons name="add-circle" size={32} color={colors.accent} style={styles.actionIcon} />
              <Text style={styles.actionLabel}>Создать событие</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('stats')}>
              <Ionicons name="stats-chart" size={32} color={colors.primary} style={styles.actionIcon} />
              <Text style={styles.actionLabel}>Статистика</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('certificates')}>
              <Ionicons name="ribbon" size={32} color={colors.warning} style={styles.actionIcon} />
              <Text style={styles.actionLabel}>Сертификаты</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('reviews')}>
              <Ionicons name="chatbubbles" size={32} color={colors.success} style={styles.actionIcon} />
              <Text style={styles.actionLabel}>Отзывы</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('profile')}>
              <Ionicons name="person-circle" size={32} color={colors.text} style={styles.actionIcon} />
              <Text style={styles.actionLabel}>Мой профиль</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipEmoji}>💡</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Совет дня</Text>
            <Text style={styles.tipText}>
              События утром в выходные собирают на 40% больше участников. Попробуйте добавить утреннюю йогу на субботу!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
