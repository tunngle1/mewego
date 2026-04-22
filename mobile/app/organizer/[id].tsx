import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { OrganizerPublicProfile, Certificate, OrganizerReview } from '../../src/types';

interface OrganizerEvent {
  id: string;
  title: string;
  movementType: string;
  startAt: string;
  durationMin?: number;
  locationName: string;
  capacity?: number;
  participantsCount: number;
  priceType: string;
  priceValue?: number;
  status: string;
}

const MOCK_PROFILE: OrganizerPublicProfile = {
  userId: '1',
  displayName: 'Анна Петрова',
  avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
  bio: 'Сертифицированный инструктор йоги с 5-летним опытом. Провожу занятия для начинающих и продвинутых практиков. Специализируюсь на хатха-йоге и виньяса-флоу.',
  tags: ['yoga', 'meditation', 'stretching'],
  city: 'Москва',
  contactTelegram: '@anna_yoga',
  paymentInfo: 'Оплата наличными или переводом на карту перед занятием',
  ratingAvg: 4.8,
  ratingCount: 47,
  eventsHostedCount: 156,
  totalAttendeesCount: 1240,
  certificates: [
    { id: '1', title: 'RYT-200 Yoga Alliance', issuer: 'Yoga Alliance', issuedAt: '2019-06-15', verified: true },
    { id: '2', title: 'Инструктор по медитации', issuer: 'Mindfulness Academy', issuedAt: '2021-03-20', verified: false },
  ],
};

const MOCK_EVENTS: OrganizerEvent[] = [
  {
    id: '1',
    title: 'Утренняя йога в парке',
    movementType: 'yoga',
    startAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    durationMin: 60,
    locationName: 'Парк Горького',
    capacity: 15,
    participantsCount: 8,
    priceType: 'fixed',
    priceValue: 500,
    status: 'approved',
  },
  {
    id: '2',
    title: 'Медитация на закате',
    movementType: 'meditation',
    startAt: new Date(Date.now() + 86400000 * 5).toISOString(),
    durationMin: 45,
    locationName: 'Набережная',
    capacity: 20,
    participantsCount: 12,
    priceType: 'donation',
    status: 'approved',
  },
];

const MOCK_REVIEWS: OrganizerReview[] = [
  {
    id: '1',
    eventId: '1',
    eventTitle: 'Утренняя йога',
    userId: '2',
    userName: 'Мария К.',
    userAvatar: 'https://randomuser.me/api/portraits/women/32.jpg',
    rating: 5,
    comment: 'Отличное занятие! Анна прекрасно объясняет и создаёт уютную атмосферу.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '2',
    eventId: '2',
    eventTitle: 'Медитация',
    userId: '3',
    userName: 'Алексей П.',
    rating: 4,
    comment: 'Хорошая практика, но хотелось бы больше времени на расслабление.',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate();
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${day} ${months[date.getMonth()]}`;
};

const formatTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const formatPrice = (priceType: string, priceValue?: number): string => {
  if (priceType === 'free') return 'Бесплатно';
  if (priceType === 'donation') return 'Донат';
  if (priceValue) return `${priceValue} ₽`;
  return 'Уточняйте';
};

const TAG_LABELS: Record<string, string> = {
  yoga: 'Йога',
  running: 'Бег',
  cycling: 'Велоспорт',
  strength: 'Силовые',
  meditation: 'Медитация',
  stretching: 'Растяжка',
  swimming: 'Плавание',
  dance: 'Танцы',
};

export default function OrganizerPublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const [profile, setProfile] = useState<OrganizerPublicProfile | null>(null);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [reviews, setReviews] = useState<OrganizerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const fetchData = async () => {
    // TODO: Replace with real API calls
    await new Promise(resolve => setTimeout(resolve, 500));
    setProfile(MOCK_PROFILE);
    setEvents(MOCK_EVENTS);
    setReviews(MOCK_REVIEWS);
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleContactTelegram = () => {
    if (profile?.contactTelegram) {
      const username = profile.contactTelegram.replace('@', '');
      Linking.openURL(`https://t.me/${username}`);
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
      marginRight: spacing.md,
    },
    headerTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.xxl * 2,
    },
    profileHeader: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    avatarContainer: {
      marginBottom: spacing.md,
    },
    displayName: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
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
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xl,
    },
    statItem: {
      alignItems: 'center',
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
    ratingValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    section: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    bioText: {
      fontSize: fontSize.sm,
      color: colors.textLight,
      lineHeight: 22,
    },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      ...shadows.sm,
    },
    contactInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    contactLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    contactValue: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.text,
    },
    contactButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    contactButtonText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    paymentNote: {
      backgroundColor: colors.warningLight || colors.surfaceMuted,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    paymentNoteText: {
      flex: 1,
      fontSize: fontSize.sm,
      color: colors.text,
      lineHeight: 20,
    },
    tabsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    tab: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceMuted,
    },
    tabActive: {
      backgroundColor: colors.accent,
    },
    tabText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.white,
    },
    eventCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.sm,
    },
    eventHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    eventTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      flex: 1,
    },
    eventPrice: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.accent,
    },
    eventMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    eventMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    eventMetaText: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    certificateCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      ...shadows.sm,
    },
    certificateIcon: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    certificateInfo: {
      flex: 1,
    },
    certificateTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    certificateIssuer: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    verifiedText: {
      fontSize: fontSize.xs,
      color: colors.success,
      fontWeight: fontWeight.semibold,
    },
    reviewCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.sm,
    },
    reviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    reviewerInfo: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    reviewerName: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.text,
    },
    reviewEvent: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    reviewRating: {
      flexDirection: 'row',
      gap: 2,
    },
    reviewComment: {
      fontSize: fontSize.sm,
      color: colors.textLight,
      lineHeight: 20,
    },
    reviewDate: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
  });

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Профиль организатора</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Организатор не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Профиль организатора</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Avatar source={profile.avatarUrl} size={96} />
          </View>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          {profile.city && <Text style={styles.city}>{profile.city}</Text>}

          {profile.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {profile.tags.map((tag) => (
                <Badge key={tag} label={TAG_LABELS[tag] || tag} variant="outline" size="sm" />
              ))}
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.ratingValue}>
                <Ionicons name="star" size={18} color={colors.warning} />
                <Text style={styles.statValue}>{profile.ratingAvg}</Text>
              </View>
              <Text style={styles.statLabel}>{profile.ratingCount} отзывов</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.eventsHostedCount}</Text>
              <Text style={styles.statLabel}>событий</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.totalAttendeesCount}</Text>
              <Text style={styles.statLabel}>участников</Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>О себе</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Contact */}
        {profile.contactTelegram && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Контакт</Text>
            <View style={styles.contactCard}>
              <Ionicons name="paper-plane" size={32} color="#0088cc" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Telegram</Text>
                <Text style={styles.contactValue}>{profile.contactTelegram}</Text>
              </View>
              <TouchableOpacity style={styles.contactButton} onPress={handleContactTelegram}>
                <Text style={styles.contactButtonText}>Написать</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Payment Info */}
        {profile.paymentInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Оплата</Text>
            <View style={styles.paymentNote}>
              <Ionicons name="information-circle" size={20} color={colors.warning} />
              <Text style={styles.paymentNoteText}>{profile.paymentInfo}</Text>
            </View>
          </View>
        )}

        {/* Certificates */}
        {profile.certificates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Сертификаты</Text>
            {profile.certificates.map((cert) => (
              <View key={cert.id} style={styles.certificateCard}>
                <View style={styles.certificateIcon}>
                  <Ionicons name="ribbon" size={24} color={colors.primary} />
                </View>
                <View style={styles.certificateInfo}>
                  <Text style={styles.certificateTitle}>{cert.title}</Text>
                  {cert.issuer && <Text style={styles.certificateIssuer}>{cert.issuer}</Text>}
                </View>
                {cert.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.verifiedText}>Проверен</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>События</Text>
          <View style={styles.tabsRow}>
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
          </View>

          {events.length > 0 ? (
            events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/event/${event.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventPrice}>
                    {formatPrice(event.priceType, event.priceValue)}
                  </Text>
                </View>
                <View style={styles.eventMeta}>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.eventMetaText}>
                      {formatDate(event.startAt)}, {formatTime(event.startAt)}
                    </Text>
                  </View>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.eventMetaText}>{event.locationName}</Text>
                  </View>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.eventMetaText}>
                      {event.participantsCount}/{event.capacity || '∞'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Нет событий</Text>
            </View>
          )}
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Отзывы</Text>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Avatar source={review.userAvatar} size={40} />
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>{review.userName}</Text>
                    <Text style={styles.reviewEvent}>{review.eventTitle}</Text>
                  </View>
                  <View style={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={14}
                        color={colors.warning}
                      />
                    ))}
                  </View>
                </View>
                {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Пока нет отзывов</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
