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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api } from '../../src/services/api';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { TrainerCrmClient } from '../../src/types';

const formatMoney = (amountMinor: number) => `${(amountMinor / 100).toLocaleString('ru-RU')} ₽`;

const statusMeta: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'accent' }> = {
  lead: { label: 'Лид', variant: 'warning' },
  active: { label: 'Активен', variant: 'success' },
  inactive: { label: 'Неактивен', variant: 'default' },
  paused: { label: 'Пауза', variant: 'accent' },
  archived: { label: 'Архив', variant: 'default' },
};

export default function TrainerCrmClientsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<TrainerCrmClient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'archived'>(params.tab === 'archived' ? 'archived' : 'active');

  const loadClients = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const response = await api.getTrainerCrmClients({
        limit: 100,
        q: query.trim() || undefined,
        archived: tab === 'archived',
      });
      setClients(response.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить клиентов');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, tab]);

  React.useEffect(() => {
    setTab(params.tab === 'archived' ? 'archived' : 'active');
  }, [params.tab]);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((client) => {
      return [client.fullName, client.phone, client.email, client.telegramHandle, client.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [clients, query]);

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
      paddingVertical: spacing.xs,
    },
    tabsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    tabChip: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    tabChipText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    tabChipTextActive: {
      color: colors.white,
    },
    clientCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      gap: spacing.sm,
      ...shadows.sm,
      marginBottom: spacing.sm,
    },
    clientTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    clientName: {
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
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statChip: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.sm,
    },
    statValue: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    statLabel: {
      marginTop: 2,
      fontSize: fontSize.xs - 1,
      color: colors.textMuted,
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

  if (loading && !clients.length) {
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
          <Text style={styles.title}>Клиенты CRM</Text>
          <Text style={styles.subtitle}>База клиентов, статусы и история занятий</Text>
        </View>
      </View>

      {tab === 'active' ? (
        <Button
          title="Добавить клиента"
          onPress={() => router.push('/trainer-crm/client-create')}
          variant="accent"
          style={styles.createButton}
        />
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadClients(true)} />}
        ListHeaderComponent={
          <View>
            <View style={styles.tabsRow}>
              <TouchableOpacity style={[styles.tabChip, tab === 'active' && styles.tabChipActive]} onPress={() => setTab('active')}>
                <Text style={[styles.tabChipText, tab === 'active' && styles.tabChipTextActive]}>Активные</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabChip, tab === 'archived' && styles.tabChipActive]} onPress={() => setTab('archived')}>
                <Text style={[styles.tabChipText, tab === 'archived' && styles.tabChipTextActive]}>Архив</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={tab === 'archived' ? 'Поиск по архиву клиентов' : 'Поиск по имени, телефону, email'}
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={() => loadClients()}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const meta = statusMeta[item.status] || { label: item.status, variant: 'default' as const };
          return (
            <TouchableOpacity
              style={styles.clientCard}
              activeOpacity={0.8}
              onPress={() => router.push(`/trainer-crm/client/${item.id}${tab === 'archived' ? '?tab=archived' : ''}`)}
            >
              <View style={styles.clientTopRow}>
                <Text style={styles.clientName}>{item.fullName}</Text>
                <Badge label={meta.label} variant={meta.variant} size="sm" />
              </View>
              <Text style={styles.meta}>{item.phone || item.email || item.telegramHandle || 'Контакт пока не указан'}</Text>
              <Text style={styles.meta}>Город: {item.city || '—'} · Теги: {item.tags.length ? item.tags.join(', ') : 'нет'}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statChip}>
                  <Text style={styles.statValue}>{item.sessionsCompletedCount}</Text>
                  <Text style={styles.statLabel}>Проведено</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statValue}>{item.stats?.packagesCount || 0}</Text>
                  <Text style={styles.statLabel}>Пакетов</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statValue}>{formatMoney(item.lifetimeValueMinor)}</Text>
                  <Text style={styles.statLabel}>LTV</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="🧍"
            title={tab === 'archived' ? 'Архив пока пуст' : 'Клиентов пока нет'}
            description={tab === 'archived'
              ? 'Архивные клиенты будут появляться здесь и не будут мешать в рабочем списке.'
              : 'Добавь первого клиента и начни вести историю тренировок, заметки и пакеты прямо в приложении.'}
            actionLabel={tab === 'archived' ? undefined : 'Создать клиента'}
            onAction={tab === 'archived' ? undefined : () => router.push('/trainer-crm/client-create')}
          />
        }
      />
    </SafeAreaView>
  );
}
