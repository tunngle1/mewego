import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAppStore } from '../src/store/useAppStore';
import { api } from '../src/services/api';
import { AdminUser } from '../src/types';

type Mode = 'events' | 'organizers';

type AdminSearchEventItem = {
  id: string;
  title: string;
  movementType: string | null;
  status: string;
  startAt: string;
  organizerId: string;
  organizerName: string | null;
};

export default function AdminSearchScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const isSuperAdmin = user?.role === 'superadmin';

  const [mode, setMode] = useState<Mode>('events');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const [events, setEvents] = useState<AdminSearchEventItem[]>([]);
  const [organizers, setOrganizers] = useState<AdminUser[]>([]);

  const canSearch = q.trim().length >= 2;

  const runSearch = useCallback(async () => {
    if (!isSuperAdmin) return;
    if (!canSearch) {
      setEvents([]);
      setOrganizers([]);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'events') {
        const res = await api.searchAdminEvents({ q: q.trim() });
        setEvents(res.items);
      } else {
        const res = await api.getAdminUsers({ q: q.trim(), role: 'organizer' });
        setOrganizers(res);
      }
    } catch (e) {
      console.error('[AdminSearch] runSearch error:', e);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, canSearch, mode, q]);

  useEffect(() => {
    const t = setTimeout(() => {
      runSearch();
    }, 300);
    return () => clearTimeout(t);
  }, [runSearch]);

  const styles = useMemo(
    () =>
      createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  if (!isSuperAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Недоступно</Text>
          <Text style={styles.emptyText}>Поиск доступен только суперадмину.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Поиск</Text>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.backText}>Назад</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segmentItem, mode === 'events' && styles.segmentItemActive]}
          onPress={() => setMode('events')}
          activeOpacity={0.85}
        >
          <Text style={[styles.segmentText, mode === 'events' && styles.segmentTextActive]}>События</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentItem, mode === 'organizers' && styles.segmentItemActive]}
          onPress={() => setMode('organizers')}
          activeOpacity={0.85}
        >
          <Text style={[styles.segmentText, mode === 'organizers' && styles.segmentTextActive]}>Организаторы</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputWrap}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={mode === 'events' ? 'Название или id события…' : 'Имя/телефон организатора…'}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {!canSearch ? <Text style={styles.hint}>Введите минимум 2 символа</Text> : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {mode === 'events' ? (
          events.length > 0 ? (
            events.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => router.push(`/event/${e.id}`)}
              >
                <View style={styles.row}>
                  <View style={{ flex: 1, paddingRight: spacing.md }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {e.movementType || 'event'} • {new Date(e.startAt).toLocaleString('ru-RU')} • {e.organizerName || e.organizerId}
                    </Text>
                  </View>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>{String(e.status || '').toUpperCase()}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : canSearch && !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Ничего не найдено</Text>
              <Text style={styles.emptyText}>Попробуйте изменить запрос.</Text>
            </View>
          ) : null
        ) : organizers.length > 0 ? (
          organizers.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => router.push(`/admin-user/${u.id}`)}
            >
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{u.name || u.id}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>{u.phone || u.telegramId || u.id}</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{String(u.role || '').toUpperCase()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : canSearch && !loading ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Ничего не найдено</Text>
            <Text style={styles.emptyText}>Попробуйте изменить запрос.</Text>
          </View>
        ) : null}
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
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
        back: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: colors.white,
          borderRadius: borderRadius.full,
          borderWidth: 1,
          borderColor: colors.neutralLight,
          ...shadows.sm,
        },
        backText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },

        segment: {
          marginHorizontal: spacing.lg,
          flexDirection: 'row',
          backgroundColor: colors.surfaceMuted,
          borderRadius: borderRadius.full,
          padding: 4,
          marginBottom: spacing.md,
        },
        segmentItem: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.full },
        segmentItemActive: { backgroundColor: colors.white, ...shadows.sm },
        segmentText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.semibold || '600' },
        segmentTextActive: { color: colors.text },

        inputWrap: {
          marginHorizontal: spacing.lg,
          backgroundColor: colors.white,
          borderRadius: borderRadius.xl,
          borderWidth: 1,
          borderColor: colors.neutralLight,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          ...shadows.sm,
          marginBottom: spacing.md,
        },
        input: { fontSize: fontSize.md, color: colors.text },
        hint: { marginHorizontal: spacing.lg, fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.md },

        list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
        card: {
          backgroundColor: colors.white,
          borderRadius: borderRadius.xl,
          borderWidth: 1,
          borderColor: colors.neutralLight,
          padding: spacing.lg,
          marginBottom: spacing.sm,
          ...shadows.sm,
        },
        row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 4 },
        cardMeta: { fontSize: fontSize.sm, color: colors.textMuted },
        pill: {
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
          borderRadius: borderRadius.full,
          backgroundColor: colors.surfaceMuted,
        },
        pillText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted },

        loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
        emptyWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, alignItems: 'center' },
        emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
        emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
