import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { api } from '../../src/services/api';
import { UserProfile } from '../../src/types';
import { CATEGORY_LABELS } from '../../src/constants';

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const getActivityLevelLabel = (level?: string): string => {
  switch (level) {
    case 'rare': return 'Редко';
    case 'sometimes': return 'Иногда';
    case 'regular': return 'Регулярно';
    default: return '';
  }
};

const getCategoryLabel = (slug: string): string => {
  return (CATEGORY_LABELS as Record<string, string>)[slug] || slug;
};

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { user: currentUser } = useAppStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'reviews' | 'about'>('activity');

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getUserProfile(id);
      setProfile(data);
    } catch (error) {
      console.error('[UserProfile] fetchProfile error:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  const handleMorePress = useCallback(() => {
    if (!profile || !id) return;

    const targetName = profile.name || 'Профиль';

    Alert.alert('Действия', undefined, [
      {
        text: 'Пожаловаться',
        style: 'destructive',
        onPress: () =>
          router.push({
            pathname: '/complaint',
            params: {
              targetType: 'user',
              targetId: String(id),
              targetName,
            },
          }),
      },
      { text: 'Отмена', style: 'cancel' },
    ]);
  }, [id, profile, router]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
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
    moreButton: {
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
    moreIcon: {
      fontSize: fontSize.lg,
      color: colors.text,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroSection: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    avatarLarge: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      borderWidth: 3,
      borderColor: colors.white,
      ...shadows.md,
    },
    avatarImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    avatarText: {
      fontSize: 40,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    userName: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    userMeta: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    editButton: {
      marginTop: spacing.sm,
    },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      justifyContent: 'space-around',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    statItem: {
      alignItems: 'center',
      minWidth: 60,
    },
    statValue: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.accent,
    },
    statLabel: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    badgesSection: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    badgesTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    badgesWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    badge: {
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    badgeText: {
      fontSize: fontSize.xs,
      color: colors.text,
      fontWeight: fontWeight.semibold || '600',
    },
    tabsContainer: {
      flexDirection: 'row',
      marginHorizontal: spacing.lg,
      marginVertical: spacing.md,
      backgroundColor: colors.surfaceMuted,
      borderRadius: borderRadius.full,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: borderRadius.full,
    },
    tabActive: {
      backgroundColor: colors.white,
      ...shadows.sm,
    },
    tabText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      fontWeight: fontWeight.semibold || '600',
    },
    tabTextActive: {
      color: colors.text,
    },
    contentSection: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    activityCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    activityTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: 4,
    },
    activityMeta: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    reviewCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    reviewEvent: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      flex: 1,
    },
    reviewRating: {
      fontSize: fontSize.sm,
      color: colors.accent,
      fontWeight: fontWeight.bold,
    },
    reviewComment: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      lineHeight: 20,
    },
    reviewDate: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    aboutCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    aboutLabel: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    aboutValue: {
      fontSize: fontSize.md,
      color: colors.text,
      marginBottom: spacing.md,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: spacing.md,
    },
    emptyText: {
      fontSize: fontSize.md,
      color: colors.textMuted,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: fontSize.lg, color: colors.textMuted }}>Профиль не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  const safeName = profile.name || 'Участник';
  const metaParts: string[] = [];
  if (profile.city) metaParts.push(profile.city);
  if (profile.activityLevel) metaParts.push(getActivityLevelLabel(profile.activityLevel));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreButton} onPress={handleMorePress}>
          <Text style={styles.moreIcon}>⋯</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{safeName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.userName}>{safeName}</Text>
          {metaParts.length > 0 && (
            <Text style={styles.userMeta}>{metaParts.join(' • ')}</Text>
          )}
          {profile.isOwnProfile && (
            <Button
              title="Редактировать профиль"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/settings')}
            />
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.stats.totalEvents}</Text>
            <Text style={styles.statLabel}>Событий</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.stats.attendedCount}</Text>
            <Text style={styles.statLabel}>Посещений</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.stats.attendanceRate}%</Text>
            <Text style={styles.statLabel}>Посещаемость</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.stats.streak}</Text>
            <Text style={styles.statLabel}>Серия</Text>
          </View>
        </View>

        {/* Badges / Tags */}
        {(profile.favoriteCategories.length > 0 || profile.interests.length > 0) && (
          <View style={styles.badgesSection}>
            <Text style={styles.badgesTitle}>Интересы</Text>
            <View style={styles.badgesWrap}>
              {profile.favoriteCategories.map((cat) => (
                <View key={cat} style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                  <Text style={[styles.badgeText, { color: colors.accent }]}>
                    {getCategoryLabel(cat)}
                  </Text>
                </View>
              ))}
              {profile.interests
                .filter((i) => !profile.favoriteCategories.includes(i))
                .map((interest) => (
                  <View key={interest} style={styles.badge}>
                    <Text style={styles.badgeText}>{getCategoryLabel(interest)}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
              Активность
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
              Отзывы
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.tabActive]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>
              О себе
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.contentSection}>
          {activeTab === 'activity' && (
            <>
              {profile.recentActivity.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📅</Text>
                  <Text style={styles.emptyText}>Пока нет активности</Text>
                </View>
              ) : (
                profile.recentActivity.map((activity, index) => (
                  <TouchableOpacity
                    key={`${activity.eventId}-${index}`}
                    style={styles.activityCard}
                    onPress={() => router.push(`/event/${activity.eventId}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.activityTitle}>{activity.eventTitle}</Text>
                    <Text style={styles.activityMeta}>
                      {getCategoryLabel(activity.category)} • {formatDate(activity.date)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {activeTab === 'reviews' && (
            <>
              {profile.reviews.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={styles.emptyText}>Пока нет отзывов</Text>
                </View>
              ) : (
                profile.reviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewEvent} numberOfLines={1}>
                        {review.eventTitle}
                      </Text>
                      <Text style={styles.reviewRating}>{'★'.repeat(review.rating)}</Text>
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                    <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                  </View>
                ))
              )}
            </>
          )}

          {activeTab === 'about' && (
            <View style={styles.aboutCard}>
              <Text style={styles.aboutLabel}>Участник с</Text>
              <Text style={styles.aboutValue}>{formatDate(profile.memberSince)}</Text>

              {profile.city && (
                <>
                  <Text style={styles.aboutLabel}>Город</Text>
                  <Text style={styles.aboutValue}>{profile.city}</Text>
                </>
              )}

              {profile.activityLevel && (
                <>
                  <Text style={styles.aboutLabel}>Уровень активности</Text>
                  <Text style={styles.aboutValue}>{getActivityLevelLabel(profile.activityLevel)}</Text>
                </>
              )}

              {profile.interests.length > 0 && (
                <>
                  <Text style={styles.aboutLabel}>Интересы</Text>
                  <Text style={[styles.aboutValue, { marginBottom: 0 }]}>
                    {profile.interests.map(getCategoryLabel).join(', ')}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
