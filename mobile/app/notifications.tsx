import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAppStore } from '../src/store/useAppStore';
import { Notification } from '../src/types';
import { notificationService } from '../src/services/notifications';
import { api } from '../src/services/api';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { notifications, markNotificationRead } = useAppStore();
  const [pushToken, setPushToken] = React.useState<string | null>(null);
  const [pushLoading, setPushLoading] = React.useState(false);

  const handleRequestPush = async () => {
    setPushLoading(true);
    try {
      const token = await notificationService.registerForPushNotifications();
      if (!token) {
        Alert.alert('Не получилось', 'Токен не получен. Проверьте разрешения уведомлений и сборку EAS.');
        return;
      }
      setPushToken(token);
      Alert.alert('Готово', 'Push token получен.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleShareToken = async () => {
    if (!pushToken) return;
    await Share.share({ message: pushToken });
  };

  const handleTestLocalNotification = async () => {
    const ok = await notificationService.requestPermissions();
    if (!ok) {
      Alert.alert('Нет доступа', 'Разрешите уведомления, чтобы получить тестовое уведомление.');
      return;
    }
    await notificationService.scheduleLocalNotification('ME·WE·GO', 'Тестовое уведомление (через 5 секунд)', 5, {
      type: 'test',
    });
    Alert.alert('Запланировано', 'Локальное уведомление придёт через ~5 секунд.');
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    try {
      const result = await api.sendTestPush();
      if (!result?.ok) {
        Alert.alert('Не получилось', 'Backend не смог отправить push. Проверьте, что токен сохранён в БД.');
        return;
      }
      Alert.alert('Отправлено', 'Backend отправил тестовый push.');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось отправить push');
    } finally {
      setPushLoading(false);
    }
  };

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
    toolsCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    toolsTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    toolsText: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      lineHeight: 17,
      marginBottom: spacing.md,
    },
    tokenBox: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.md,
    },
    tokenText: {
      fontSize: fontSize.xs,
      color: colors.text,
    },
    toolsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    toolsButton: {
      flexGrow: 1,
      backgroundColor: colors.accent,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
    },
    toolsButtonSecondary: {
      backgroundColor: colors.surfaceMuted,
    },
    toolsButtonDisabled: {
      opacity: 0.5,
    },
    toolsButtonText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    toolsButtonTextSecondary: {
      color: colors.text,
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

  const renderPushTools = () => (
    <View style={styles.toolsCard}>
      <Text style={styles.toolsTitle}>Push-уведомления</Text>
      <Text style={styles.toolsText}>
        Используйте эти кнопки для проверки токена и тестовых уведомлений на EAS/TestFlight сборке.
      </Text>
      {pushToken ? (
        <View style={styles.tokenBox}>
          <Text style={styles.tokenText} selectable>{pushToken}</Text>
        </View>
      ) : null}
      <View style={styles.toolsRow}>
        <TouchableOpacity style={styles.toolsButton} onPress={handleRequestPush} disabled={pushLoading}>
          {pushLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.toolsButtonText}>Получить токен</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolsButton, styles.toolsButtonSecondary, !pushToken && styles.toolsButtonDisabled]}
          onPress={handleShareToken}
          disabled={!pushToken}
        >
          <Text style={[styles.toolsButtonText, styles.toolsButtonTextSecondary]}>Поделиться</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolsButton, styles.toolsButtonSecondary]} onPress={handleTestLocalNotification}>
          <Text style={[styles.toolsButtonText, styles.toolsButtonTextSecondary]}>Тест локально</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolsButton} onPress={handleTestPush} disabled={pushLoading}>
          {pushLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.toolsButtonText}>Тест push</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Уведомления</Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderPushTools}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>Пока пусто</Text>
            <Text style={styles.emptyText}>
              Здесь будут уведомления о ваших записях и событиях
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
