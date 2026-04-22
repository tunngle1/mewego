import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAppStore } from '../src/store/useAppStore';
import { Notification } from '../src/types';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { notifications, markNotificationRead } = useAppStore();

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'waiting_list_spot':
        return '🎉';
      case 'post_event':
        return '✅';
      case 'reminder_2h':
      case 'reminder_24h':
      case 'reminder_30m':
        return '⏰';
      case 'challenge':
        return '🏆';
      case 'activation':
        return '🚀';
      default:
        return '📬';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;
    return 'Вчера';
  };

  const handleNotificationPress = (item: Notification) => {
    markNotificationRead(item.id);
    if (item.type === 'waiting_list_spot' && item.data) {
      const { eventId, offerId } = item.data as { eventId?: string; offerId?: string };
      if (eventId && offerId) {
        router.push({
          pathname: '/waiting',
          params: { eventId, mode: 'offered', waitingEntryId: offerId },
        });
      }
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
    list: {
      flex: 1,
    },
    listContent: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    notificationCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      flexDirection: 'row',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    unread: {
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.neutralMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      fontSize: fontSize.xl,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    body: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    time: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unread]}
      activeOpacity={0.7}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getIcon(item.type)}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Уведомления</Text>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Пока пусто</Text>
          <Text style={styles.emptyText}>
            Здесь будут уведомления о ваших записях и событиях
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
