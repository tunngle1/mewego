import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api } from '../../src/services/api';
import { Badge } from '../../src/components/ui/Badge';

interface TrainerProfile {
  id: string;
  publicId: string;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  bio: string | null;
  tags: string[];
  status: string;
  ratingAvg: number | null;
  ratingCount: number;
  hostedEventsCount: number;
  certificates: {
    id: string;
    title: string;
    issuer: string | null;
    issuedAt: string | null;
    assetUrl: string | null;
    verified: boolean;
  }[];
}

interface TrainerEvent {
  id: string;
  title: string;
  movementType: string;
  level: string;
  startAt: string;
  durationMin: number | null;
  locationName: string;
  locationAddress: string | null;
  capacity: number | null;
  participantsCount: number;
  priceType: string;
  priceValue: number | null;
}

interface TrainerReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    publicId: string | null;
    name: string;
    avatarUrl: string | null;
  };
  event: {
    id: string;
    title: string;
    startAt: string;
  };
}

type TabType = 'upcoming' | 'past' | 'reviews';

export default function TrainerPublicProfileScreen() {
  const router = useRouter();
  const { publicId } = useLocalSearchParams<{ publicId: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [events, setEvents] = useState<TrainerEvent[]>([]);
  const [reviews, setReviews] = useState<TrainerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  useEffect(() => {
    if (publicId) {
      loadProfile();
    }
  }, [publicId]);

  useEffect(() => {
    if (profile) {
      if (activeTab === 'reviews') {
        loadReviews();
      } else {
        loadEvents(activeTab);
      }
    }
  }, [activeTab, profile]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTrainerProfile(publicId!);
      setProfile(data);
    } catch (e) {
      setError('Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (status: 'upcoming' | 'past') => {
    try {
      const data = await api.getTrainerEvents(publicId!, status);
      setEvents(data);
    } catch (e) {
      console.error('Failed to load events:', e);
    }
  };

  const loadReviews = async () => {
    try {
      const data = await api.getTrainerReviews(publicId!);
      setReviews(data.items);
    } catch (e) {
      console.error('Failed to load reviews:', e);
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const formatDateTime = (isoDate: string) => {
    const date = new Date(isoDate);
    const dateStr = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
    }).format(date);
    const timeStr = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    return `${dateStr} в ${timeStr}`;
  };

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
    headerPlaceholder: {
      width: 40,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    errorText: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    retryButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.xl,
    },
    retryButtonText: {
      color: colors.white,
      fontWeight: fontWeight.bold,
    },
    scrollContent: {
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    profileCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    avatarContainer: {
      marginBottom: spacing.md,
    },
    avatarBorder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 4,
      borderColor: colors.primary,
      padding: 4,
    },
    avatar: {
      width: '100%',
      height: '100%',
      borderRadius: 46,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: colors.primary,
    },
    avatarText: {
      fontSize: 40,
      fontWeight: fontWeight.bold,
      color: colors.primary,
    },
    name: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    roleBadge: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      marginBottom: spacing.sm,
    },
    roleBadgeText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.primary,
    },
    city: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    tag: {
      backgroundColor: colors.accent + '20',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    tagText: {
      fontSize: fontSize.xs,
      color: colors.accent,
      fontWeight: fontWeight.semibold || '600',
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      width: '100%',
    },
    statItem: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      alignItems: 'center',
    },
    statValue: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.black || '900',
      color: colors.primary,
    },
    statLabel: {
      fontSize: fontSize.xs - 1,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginTop: spacing.xs,
      textTransform: 'uppercase',
    },
    bioSection: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    bioTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    bioText: {
      fontSize: fontSize.sm,
      color: colors.textLight,
      lineHeight: 22,
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: borderRadius.full,
      padding: 4,
      marginBottom: spacing.lg,
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
      fontWeight: fontWeight.semibold || '600',
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.text,
    },
    listContainer: {
      gap: spacing.md,
    },
    eventCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      ...shadows.sm,
    },
    eventTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    eventMeta: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    eventFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    eventPrice: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.accent,
    },
    reviewCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.sm,
      ...shadows.sm,
    },
    reviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    reviewerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.neutralLight,
      marginRight: spacing.sm,
    },
    reviewerInfo: {
      flex: 1,
    },
    reviewerName: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    reviewDate: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    reviewRating: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.warningLight || colors.primaryLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
    },
    reviewRatingText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.warning || colors.primary,
    },
    reviewComment: {
      fontSize: fontSize.sm,
      color: colors.textLight,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    reviewEvent: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    emptyState: {
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
    },
    certificatesSection: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    certificatesTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    certificatesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    certificateCard: {
      width: '47%',
      backgroundColor: colors.surfaceMuted,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    certificateImage: {
      width: '100%',
      height: 100,
      backgroundColor: colors.neutralLight,
    },
    certificatePlaceholder: {
      width: '100%',
      height: 100,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    certificatePlaceholderIcon: {
      fontSize: 32,
      marginBottom: spacing.xs,
    },
    certificateContent: {
      padding: spacing.sm,
    },
    certificateTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    certificateIssuer: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    certificateVerified: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    certificateVerifiedText: {
      fontSize: fontSize.xs,
      color: colors.success,
      marginLeft: spacing.xs,
    },
    certificatePendingText: {
      fontSize: fontSize.xs,
      color: colors.warning,
      marginLeft: spacing.xs,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Тренер не найден'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderEventCard = (event: TrainerEvent) => (
    <TouchableOpacity
      key={event.id}
      style={styles.eventCard}
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.8}
    >
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventMeta}>🕒 {formatDateTime(event.startAt)}</Text>
      <Text style={styles.eventMeta}>📍 {event.locationName}</Text>
      <View style={styles.eventFooter}>
        <Badge label={event.movementType} variant="default" size="sm" />
        <Text style={styles.eventPrice}>
          {event.priceType === 'free' ? 'Бесплатно' : `${event.priceValue || 0} ₽`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderReviewCard = (review: TrainerReview) => (
    <View key={review.id} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {review.reviewer.avatarUrl ? (
          <Image
            source={{ uri: review.reviewer.avatarUrl }}
            style={styles.reviewerAvatar}
          />
        ) : (
          <View style={[styles.reviewerAvatar, { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
              {review.reviewer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.reviewer.name}</Text>
          <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
        </View>
        <View style={styles.reviewRating}>
          <Text style={styles.reviewRatingText}>{review.rating} ★</Text>
        </View>
      </View>
      {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
      <Text style={styles.reviewEvent}>Событие: {review.event.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profile.avatarUrl ? (
              <View style={styles.avatarBorder}>
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={styles.avatar}
                />
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Организатор</Text>
          </View>
          {profile.city && <Text style={styles.city}>{profile.city}</Text>}

          {profile.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {profile.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile.ratingAvg ? profile.ratingAvg.toFixed(1) : '—'}
              </Text>
              <Text style={styles.statLabel}>Рейтинг</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.ratingCount}</Text>
              <Text style={styles.statLabel}>Отзывов</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.hostedEventsCount}</Text>
              <Text style={styles.statLabel}>Событий</Text>
            </View>
          </View>
        </View>

        {profile.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioTitle}>О себе</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {profile.certificates.length > 0 && (
          <View style={styles.certificatesSection}>
            <Text style={styles.certificatesTitle}>Сертификаты</Text>
            <View style={styles.certificatesGrid}>
              {profile.certificates.map((cert) => (
                <View key={cert.id} style={styles.certificateCard}>
                  {cert.assetUrl ? (
                    <Image
                      source={{ uri: cert.assetUrl }}
                      style={styles.certificateImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.certificatePlaceholder}>
                      <Text style={styles.certificatePlaceholderIcon}>🎓</Text>
                    </View>
                  )}
                  <View style={styles.certificateContent}>
                    <Text style={styles.certificateTitle} numberOfLines={2}>{cert.title}</Text>
                    {cert.issuer && (
                      <Text style={styles.certificateIssuer} numberOfLines={1}>{cert.issuer}</Text>
                    )}
                    <View style={styles.certificateVerified}>
                      <Text>{cert.verified ? '✅' : '⏳'}</Text>
                      <Text style={cert.verified ? styles.certificateVerifiedText : styles.certificatePendingText}>
                        {cert.verified ? 'Подтверждён' : 'На проверке'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
              Предстоящие
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'past' && styles.tabActive]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
              Прошедшие
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
        </View>

        <View style={styles.listContainer}>
          {activeTab === 'reviews' ? (
            reviews.length > 0 ? (
              reviews.map(renderReviewCard)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Пока нет отзывов</Text>
              </View>
            )
          ) : events.length > 0 ? (
            events.map(renderEventCard)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {activeTab === 'upcoming' ? 'Нет предстоящих событий' : 'Нет прошедших событий'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
