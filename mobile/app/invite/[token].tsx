import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api } from '../../src/services/api';

export default function InviteTokenScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventInfo, setEventInfo] = useState<{
    eventId: string;
    title: string;
    organizer: string;
    startAt: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Ссылка недействительна');
      setLoading(false);
      return;
    }

    const resolveInvite = async () => {
      try {
        const result = await api.resolvePrivateEventByToken(token);
        setEventInfo({
          eventId: result.eventId,
          title: result.title,
          organizer: result.organizer,
          startAt: result.startAt,
        });
        setLoading(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось получить доступ';
        setError(message);
        setLoading(false);
      }
    };

    resolveInvite();
  }, [token]);

  const handleGoToEvent = () => {
    if (eventInfo) {
      router.replace(`/event/${eventInfo.eventId}`);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: spacing.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: {
      fontSize: 64,
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 22,
    },
    eventCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    eventTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    eventInfo: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xxl,
      alignItems: 'center',
      ...shadows.md,
    },
    buttonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    errorText: {
      fontSize: fontSize.md,
      color: colors.accent,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    backButton: {
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
    },
    backButtonText: {
      fontSize: fontSize.md,
      color: colors.accent,
      fontWeight: fontWeight.semibold,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.subtitle, { marginTop: spacing.lg }]}>
            Проверяем приглашение...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.icon}>😔</Text>
          <Text style={styles.title}>Ошибка</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
            <Text style={styles.backButtonText}>Вернуться на главную</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (eventInfo) {
    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.icon}>🎉</Text>
          <Text style={styles.title}>Доступ получен!</Text>
          <Text style={styles.subtitle}>
            Вы получили доступ к приватному событию
          </Text>

          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>{eventInfo.title}</Text>
            <Text style={styles.eventInfo}>👤 {eventInfo.organizer}</Text>
            <Text style={styles.eventInfo}>📅 {formatDate(eventInfo.startAt)}</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleGoToEvent} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Перейти к событию</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}
