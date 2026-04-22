import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge } from '../../src/components/ui/Badge';
import { useTheme } from '../../src/contexts/ThemeContext';

const PARTICIPANTS = [
  {
    id: 'p1',
    name: 'Мария Иванова',
    avatar: 'https://i.pravatar.cc/100?u=p1',
    eventsAttended: 8,
    totalSpent: 6400,
    lastVisit: '2 дня назад',
    status: 'active',
  },
  {
    id: 'p2',
    name: 'Алексей Петров',
    avatar: 'https://i.pravatar.cc/100?u=p2',
    eventsAttended: 12,
    totalSpent: 9600,
    lastVisit: 'Вчера',
    status: 'vip',
  },
  {
    id: 'p3',
    name: 'Екатерина Смирнова',
    avatar: 'https://i.pravatar.cc/100?u=p3',
    eventsAttended: 3,
    totalSpent: 2400,
    lastVisit: '5 дней назад',
    status: 'new',
  },
  {
    id: 'p4',
    name: 'Дмитрий Козлов',
    avatar: 'https://i.pravatar.cc/100?u=p4',
    eventsAttended: 15,
    totalSpent: 12000,
    lastVisit: 'Сегодня',
    status: 'vip',
  },
  {
    id: 'p5',
    name: 'Ольга Новикова',
    avatar: 'https://i.pravatar.cc/100?u=p5',
    eventsAttended: 1,
    totalSpent: 800,
    lastVisit: '2 недели назад',
    status: 'inactive',
  },
];

export default function ParticipantsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const styles = React.useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius, shadows),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  const filteredParticipants = PARTICIPANTS.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vip':
        return <Badge label="VIP" variant="accent" size="sm" />;
      case 'new':
        return <Badge label="Новый" variant="success" size="sm" />;
      case 'inactive':
        return <Badge label="Неактивен" variant="warning" size="sm" />;
      default:
        return null;
    }
  };

  const totalParticipants = PARTICIPANTS.length;
  const activeParticipants = PARTICIPANTS.filter((p) => p.status !== 'inactive').length;
  const totalRevenue = PARTICIPANTS.reduce((sum, p) => sum + p.totalSpent, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Участники</Text>
        <TouchableOpacity style={styles.exportButton}>
          <Text style={styles.exportButtonText}>Экспорт</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalParticipants}</Text>
          <Text style={styles.statLabel}>Всего</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{activeParticipants}</Text>
          <Text style={styles.statLabel}>Активных</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.accent }]}>{(totalRevenue / 1000).toFixed(1)}к</Text>
          <Text style={styles.statLabel}>Выручка</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по имени..."
          placeholderTextColor={colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.participantsList}>
          {filteredParticipants.map((participant) => (
            <TouchableOpacity key={participant.id} style={styles.participantCard} activeOpacity={0.8}>
              <Avatar source={participant.avatar} size={48} />
              <View style={styles.participantInfo}>
                <View style={styles.participantHeader}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  {getStatusBadge(participant.status)}
                </View>
                <Text style={styles.participantMeta}>
                  {participant.eventsAttended} занятий • {participant.totalSpent} р
                </Text>
                <Text style={styles.participantLastVisit}>
                  Последний визит: {participant.lastVisit}
                </Text>
              </View>
              <TouchableOpacity style={styles.messageButton}>
                <Text style={styles.messageIcon}>💬</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  exportButton: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  exportButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.neutralMuted,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl * 2,
  },
  participantsList: {
    gap: spacing.sm,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  participantInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  participantName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  participantMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  participantLastVisit: {
    fontSize: fontSize.xs - 1,
    color: colors.textDisabled,
    marginTop: 2,
  },
  messageButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageIcon: {
    fontSize: fontSize.lg,
  },
});
