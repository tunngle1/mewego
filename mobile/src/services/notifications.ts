import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Notification, NotificationResponse } from 'expo-notifications';
import { api } from './api';

const getNotifications = (): any | null => {
  // expo-notifications remote push is not supported in Expo Go on Android since SDK 53
  // and the module can throw during import due to auto-registration side effects.
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
    return null;
  }

  try {
    // Lazy import to avoid crashing app startup in unsupported runtimes
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications');
  } catch {
    return null;
  }
};

const Notifications = getNotifications();

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

class NotificationService {
  private expoPushToken: string | null = null;

  async requestPermissions(): Promise<boolean> {
    if (!Notifications) return false;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  async registerForPushNotifications(): Promise<string | null> {
    if (!Notifications) return null;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e8336c',
      });
    }

    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;

      if (!projectId) {
        throw new Error('Missing Expo projectId. Set expo.extra.eas.projectId in app.json (EAS Project ID).');
      }
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      this.expoPushToken = token;
      
      await api.registerPushToken(token);
      
      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    triggerSeconds: number,
    data?: Record<string, unknown>
  ): Promise<string> {
    if (!Notifications) return '';
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: triggerSeconds,
      },
    });
    return id;
  }

  async scheduleEventReminder(
    eventId: string,
    eventTitle: string,
    eventDate: Date
  ): Promise<void> {
    const now = new Date();
    const timeDiff = eventDate.getTime() - now.getTime();

    // 24h reminder
    if (timeDiff > 24 * 60 * 60 * 1000) {
      await this.scheduleLocalNotification(
        'Завтра важный день! 🌟',
        `${eventTitle} ждёт вас. Всё получится — мы верим в вас.`,
        Math.floor((timeDiff - 24 * 60 * 60 * 1000) / 1000),
        { eventId, type: 'reminder_24h' }
      );
    }

    // 2h reminder
    if (timeDiff > 2 * 60 * 60 * 1000) {
      await this.scheduleLocalNotification(
        'Через 2 часа начинаем!',
        `${eventTitle}. Не забудьте удобную одежду и хорошее настроение.`,
        Math.floor((timeDiff - 2 * 60 * 60 * 1000) / 1000),
        { eventId, type: 'reminder_2h' }
      );
    }

    // 30m reminder (optional)
    if (timeDiff > 30 * 60 * 1000) {
      await this.scheduleLocalNotification(
        'Скоро начнём! ⏰',
        `${eventTitle} через 30 минут. Вы уже в пути?`,
        Math.floor((timeDiff - 30 * 60 * 1000) / 1000),
        { eventId, type: 'reminder_30m' }
      );
    }
  }

  async cancelEventReminders(eventId: string): Promise<void> {
    if (!Notifications) return;
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.eventId === eventId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  async sendWaitingListNotification(eventTitle: string): Promise<void> {
    if (!Notifications) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Освободилось место! 🎉',
        body: `В "${eventTitle}" появилось место. У вас 30 минут, чтобы подтвердить.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Immediate
    });
  }

  async sendPostEventNotification(eventTitle: string): Promise<void> {
    if (!Notifications) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Как всё прошло? 🌱',
        body: `Расскажите о своих впечатлениях от "${eventTitle}". Это займёт минуту.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 6 * 60 * 60, // 6 hours after event
      },
    });
  }

  addNotificationReceivedListener(
    callback: (notification: Notification) => void
  ) {
    if (!Notifications) return { remove: () => {} };
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(
    callback: (response: NotificationResponse) => void
  ) {
    if (!Notifications) return { remove: () => {} };
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  async getBadgeCount(): Promise<number> {
    if (!Notifications) return 0;
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    if (!Notifications) return;
    await Notifications.setBadgeCountAsync(count);
  }
}

export const notificationService = new NotificationService();
