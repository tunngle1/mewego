import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api } from '../../src/services/api';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { TrainerCrmSession } from '../../src/types';

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusVariant = (status: string) => {
  if (status === 'completed') return 'success' as const;
  if (status.includes('cancelled')) return 'accent' as const;
  if (status === 'scheduled' || status === 'confirmed') return 'warning' as const;
  return 'default' as const;
};

export default function TrainerCrmSessionsScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<TrainerCrmSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const response = await api.getTrainerCrmSessions();
      setSessions(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить сессии');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((item) => {
      return [item.title, item.description, item.discipline, item.locationName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [sessions, query]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    titleWrap: {
      flex: 1,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    subtitle: {
      marginTop: spacing.xs,
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl * 2,
      gap: spacing.md,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.md,
    },
    searchInput: {
      flex: 1,
      fontSize: fontSize.sm,
      color: colors.text,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      gap: spacing.sm,
      marginBottom: spacing.sm,
      ...shadows.sm,
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sessionTitle: {
      flex: 1,
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    meta: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      lineHeight: 18,
    },
    createButton: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    errorText: {
      color: colors.accent,
      fontSize: fontSize.sm,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  if (loading && !sessions.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Сессии CRM</Text>
          <Text style={styles.subtitle}>Личные и групповые тренировки, привязанные к CRM</Text>
        </View>
      </View>

      <Button
        title="Создать сессию"
        onPress={() => router.push('/trainer-crm/session-create')}
        variant="accent"
        style={styles.createButton}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSessions(true)} />}
        ListHeaderComponent={
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Поиск по названию, дисциплине, месту"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push(`/trainer-crm/session/${item.id}`)}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.sessionTitle}>{item.title}</Text>
              <Badge label={item.status} variant={statusVariant(item.status)} size="sm" />
            </View>
            <Text style={styles.meta}>{formatDateTime(item.startAt)} · {item.type === 'personal' ? 'Персональная' : 'Групповая'}</Text>
            <Text style={styles.meta}>Участников: {item.stats?.participantsCount || 0} · Видимость: {item.visibility}</Text>
            <Text style={styles.meta}>Локация: {item.locationName || item.onlineUrl || 'Не указана'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📅"
            title="Сессий пока нет"
            description="Создай первую CRM-сессию, чтобы вести клиентов и участников из приложения."
            actionLabel="Создать сессию"
            onAction={() => router.push('/trainer-crm/session-create')}
          />
        }
      />
    </SafeAreaView>
  );
}
