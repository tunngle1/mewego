import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useAppStore } from '../../../src/store/useAppStore';
import { Badge } from '../../../src/components/ui/Badge';
import { OrganizerParticipant, OrganizerParticipantStatus } from '../../../src/types';

type ParticipantFilter = 'all' | 'joined' | 'attended' | 'no_show' | 'canceled';

const FILTERS: { key: ParticipantFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'joined', label: 'Записаны' },
  { key: 'attended', label: 'Были' },
  { key: 'no_show', label: 'Не пришли' },
  { key: 'canceled', label: 'Отменили' },
];

const formatEventDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate();
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${day} ${months[date.getMonth()]}`;
};

const formatEventTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const formatJoinedAt = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate();
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${months[date.getMonth()]}, ${time}`;
};

export default function ParticipantsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { organizerEvents, getOrganizerParticipants, organizerLoading, fetchOrganizerParticipants } = useAppStore();

  const event = organizerEvents.find((e) => e.id === id);
  const participants = getOrganizerParticipants(id || '');

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ParticipantFilter>('all');

  useEffect(() => {
    if (!id) return;
    fetchOrganizerParticipants(id);
  }, [id]);

  const onRefresh = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    await fetchOrganizerParticipants(id);
    setRefreshing(false);
  }, [id, fetchOrganizerParticipants]);
  
  const filteredParticipants = useMemo(() => {
    if (activeFilter === 'all') return participants;
    return participants.filter((p) => p.status === activeFilter);
  }, [participants, activeFilter]);
  
  const filterCounts = useMemo(() => ({
    all: participants.length,
    joined: participants.filter((p) => p.status === 'joined').length,
    attended: participants.filter((p) => p.status === 'attended').length,
    no_show: participants.filter((p) => p.status === 'no_show').length,
    canceled: participants.filter((p) => p.status === 'canceled').length,
  }), [participants]);

  const getStatusBadge = (status: OrganizerParticipantStatus) => {
    switch (status) {
      case 'joined':
        return { label: 'Записан', variant: 'default' as const, color: colors.primary };
      case 'attended':
        return { label: 'Был', variant: 'success' as const, color: colors.success };
      case 'no_show':
        return { label: 'Не пришёл', variant: 'accent' as const, color: colors.accent };
      case 'canceled':
        return { label: 'Отменил', variant: 'default' as const, color: colors.textMuted };
    }
  };

  const handleParticipantPress = (participant: OrganizerParticipant) => {
    router.push(`/user/${participant.userId}`);
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
    eventInfo: {
      padding: spacing.lg,
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    eventTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    eventMeta: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    listContent: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    participantCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    avatarText: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    participantInfo: {
      flex: 1,
    },
    participantName: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    repeatBadge: {
      fontSize: fontSize.xs,
      color: colors.primary,
      marginTop: spacing.xs,
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
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterContainer: {
      marginBottom: spacing.sm,
    },
    filterList: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.white,
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.neutralLight,
    },
    filterChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterChipText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold || '600',
      color: colors.textMuted,
    },
    filterChipTextActive: {
      color: colors.white,
    },
    tabsBar: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: 'transparent',
    },
    tabsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    tab: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      borderRadius: borderRadius.xl,
      backgroundColor: colors.surfaceMuted,
    },
    tabActive: {
      backgroundColor: colors.accent,
    },
    tabText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold || '600',
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.white,
    },
    participantSubtext: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
    avatarImage: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    chevron: {
      fontSize: fontSize.lg,
      color: colors.textMuted,
      marginLeft: spacing.sm,
    },
  });

  const renderParticipant = ({ item }: { item: OrganizerParticipant }) => {
    const badge = getStatusBadge(item.status);
    const safeName = (item.name || 'Участник').trim() || 'Участник';
    const subtext = item.isRepeat 
      ? '🔄 Повторный участник' 
      : item.joinedAt 
        ? `Записался: ${formatJoinedAt(item.joinedAt)}`
        : null;
    
    return (
      <TouchableOpacity 
        style={styles.participantCard}
        onPress={() => handleParticipantPress(item)}
        activeOpacity={0.7}
      >
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { width: 48, height: 48, borderRadius: 24 }]}>
            <Text style={styles.avatarText}>{safeName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={[styles.participantInfo, { marginLeft: spacing.md }]}>
          <Text style={styles.participantName}>{safeName}</Text>
          {subtext && (
            <Text style={styles.participantSubtext}>{subtext}</Text>
          )}
        </View>
        <Badge label={badge.label} variant={badge.variant} size="sm" />
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const getFilterLabel = (filter: ParticipantFilter): string => {
    switch (filter) {
      case 'all': return `Все (${filterCounts.all})`;
      case 'joined': return `Записаны (${filterCounts.joined})`;
      case 'attended': return `Были (${filterCounts.attended})`;
      case 'no_show': return `Не пришли (${filterCounts.no_show})`;
      case 'canceled': return `Отменили (${filterCounts.canceled})`;
    }
  };

  if (organizerLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Участники</Text>
      </View>

      {event && (
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventMeta}>
            {formatEventDate(event.startAt)}, {formatEventTime(event.startAt)} • {event.participantsJoinedCount}/{event.capacity || '∞'} мест
          </Text>
        </View>
      )}

      <View style={styles.tabsBar}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.tab,
                activeFilter === filter.key && styles.tabActive,
              ]}
              onPress={() => setActiveFilter(filter.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeFilter === filter.key && styles.tabTextActive,
                ]}
              >
                {filter.label} ({filterCounts[filter.key]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredParticipants.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>
            {activeFilter === 'all' ? 'Пока нет участников' : 'Нет участников с таким статусом'}
          </Text>
          <Text style={styles.emptyText}>
            {activeFilter === 'all' 
              ? 'Когда кто-то запишется на событие, вы увидите их здесь'
              : 'Попробуйте выбрать другой фильтр'}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredParticipants}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        />
      )}
    </SafeAreaView>
  );
}
