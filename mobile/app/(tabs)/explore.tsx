import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { EventCard } from '../../src/components/EventCard';
import { CategoryCard } from '../../src/components/CategoryCard';
import { useAppStore } from '../../src/store/useAppStore';
import { CancelBookingModal } from '../../src/components/CancelBookingModal';
import { Booking } from '../../src/types';

export default function ExploreScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { 
    events, 
    user, 
    selectEvent, 
    getActiveBookingForEvent, 
    cancelBooking,
    fetchEvents,
    refreshGamification,
    eventsLoading,
    eventsError,
  } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    await refreshGamification();
    setRefreshing(false);
  };
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const parseEventDateTime = (dateStr: string, timeStr: string): number => {
    const now = new Date();
    const [h, m] = timeStr.split(':').map((v) => Number(v));

    if (dateStr.toLowerCase() === 'завтра') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(h || 0, m || 0, 0, 0);
      return d.getTime();
    }

    const match = dateStr.match(/^(\d{1,2})\s+([А-Яа-я]+)/);
    if (match) {
      const day = Number(match[1]);
      const monthName = match[2].toLowerCase();
      const months: Record<string, number> = {
        января: 0,
        февраля: 1,
        марта: 2,
        апреля: 3,
        мая: 4,
        июня: 5,
        июля: 6,
        августа: 7,
        сентября: 8,
        октября: 9,
        ноября: 10,
        декабря: 11,
      };
      const month = months[monthName];
      if (month !== undefined) {
        const d = new Date(now.getFullYear(), month, day, h || 0, m || 0, 0, 0);
        return d.getTime();
      }
    }

    return Number.MAX_SAFE_INTEGER;
  };

  const handleEventPress = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event) {
      selectEvent(event);
      router.push(`/event/${eventId}`);
    }
  };

  const handleCategoryPress = (slug: string) => {
    router.push(`/category/${slug}`);
  };

  const handleSeeAllCategories = () => {
    router.push('/categories');
  };

  const handleSeeAll = () => {
    router.push('/all-events');
  };

  const handleOpenCancelModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = (reason: string, comment?: string) => {
    if (!selectedBooking) return;
    cancelBooking(selectedBooking.id, reason, comment);
    setCancelModalVisible(false);
    setSelectedBooking(null);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xl,
      marginTop: spacing.sm,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    logo: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.black,
      color: colors.text,
      letterSpacing: -1,
    },
    mapButton: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    mapButtonText: {
      fontSize: fontSize.lg,
    },
    levelBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      gap: spacing.sm,
      ...shadows.sm,
    },
    levelIcon: {
      fontSize: fontSize.lg,
    },
    levelText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    privateCta: {
      marginBottom: spacing.lg,
      borderRadius: borderRadius.xxl,
      overflow: 'hidden',
      ...shadows.lg,
    },
    privateCtaGradient: {
      padding: spacing.lg,
      borderRadius: borderRadius.xxl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    privateCtaLeft: {
      flex: 1,
      paddingRight: spacing.md,
    },
    privateCtaTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.white,
      marginBottom: spacing.xs,
    },
    privateCtaSubtitle: {
      fontSize: fontSize.sm,
      color: colors.white,
      opacity: 0.9,
    },
    privateCtaRight: {
      width: 56,
      height: 56,
      borderRadius: borderRadius.xl,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    privateCtaIcon: {
      fontSize: 26,
    },
    categoriesGrid: {
      marginBottom: spacing.xl,
      gap: spacing.md,
    },
    categoriesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    categoriesTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    categoriesRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    categorySmall: {
      flex: 1,
    },
    categoryLarge: {
      width: '100%',
    },
    eventsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    seeAllButton: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.accent,
      letterSpacing: 2,
    },
    eventsList: {
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>ME·WE·GO</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => router.push('/map')}
              activeOpacity={0.85}
            >
              <Text style={styles.mapButtonText}>🗺️</Text>
            </TouchableOpacity>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Уровень {user?.level || 1}</Text>
            </View>
          </View>
        </View>

        {/* Categories Grid */}
        <View style={styles.categoriesGrid}>
          <View style={styles.categoriesHeader}>
            <Text style={styles.categoriesTitle}>Категории</Text>
            <TouchableOpacity onPress={handleSeeAllCategories}>
              <Text style={styles.seeAllButton}>ВСЕ</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.categoriesRow}>
            <CategoryCard
              title="Йога"
              imageSource={require('../../assets/categories/yoga.jpg')}
              variant="default"
              style={styles.categorySmall}
              onPress={() => handleCategoryPress('yoga')}
            />
            <CategoryCard
              title="Бег"
              imageSource={require('../../assets/categories/running.jpg')}
              variant="accent"
              style={styles.categorySmall}
              onPress={() => handleCategoryPress('running')}
            />
          </View>
          <CategoryCard
            title="Велоспорт"
            subtitle="Маршруты и прогулки"
            imageSource={require('../../assets/categories/cycling.jpg')}
            variant="primary"
            size="large"
            style={styles.categoryLarge}
            onPress={() => handleCategoryPress('cycling')}
          />
          <CategoryCard
            title="Силовые"
            subtitle="Техника и прогресс"
            imageSource={require('../../assets/categories/strength.jpg')}
            variant="default"
            size="large"
            style={styles.categoryLarge}
            onPress={() => handleCategoryPress('strength')}
          />
        </View>

        {/* Private event CTA */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/private-event')}
          style={styles.privateCta}
        >
          <LinearGradient
            colors={[colors.accent, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.privateCtaGradient}
          >
            <View style={styles.privateCtaLeft}>
              <Text style={styles.privateCtaTitle}>Приватное событие</Text>
              <Text style={styles.privateCtaSubtitle}>Войти по коду или ссылке</Text>
            </View>
            <View style={styles.privateCtaRight}>
              <Text style={styles.privateCtaIcon}>🔐</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Events Section */}
        <View style={styles.eventsHeader}>
          <Text style={styles.sectionTitle}>Ближайшее в городе</Text>
          <TouchableOpacity onPress={handleSeeAll}>
            <Text style={styles.seeAllButton}>ВСЕ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.eventsList}>
          {[...events]
            .sort(
              (a, b) =>
                parseEventDateTime(a.date, a.time) -
                parseEventDateTime(b.date, b.time)
            )
            .map((event) => {
              const activeBooking = getActiveBookingForEvent(event.id);
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={() => handleEventPress(event.id)}
                  variant="compact"
                  isBooked={!!activeBooking}
                  onCancelBooking={
                    activeBooking
                      ? () => handleOpenCancelModal(activeBooking)
                      : undefined
                  }
                />
              );
            })}
        </View>
      </ScrollView>

      <CancelBookingModal
        visible={cancelModalVisible}
        onClose={() => {
          setCancelModalVisible(false);
          setSelectedBooking(null);
        }}
        onConfirm={handleConfirmCancel}
        eventTitle={selectedBooking?.event.title}
      />
    </SafeAreaView>
  );
}
