import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { EventCard } from '../../src/components/EventCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAppStore } from '../../src/store/useAppStore';
import { CancelBookingModal } from '../../src/components/CancelBookingModal';
import { Booking } from '../../src/types';

const CATEGORY_META: Record<
  string,
  {
    title: string;
    description: string;
    imageUri: string;
  }
> = {
  yoga: {
    title: 'Йога',
    description: 'Практики на мобильность, дыхание и контроль. Подойдет для восстановления и регулярности.',
    imageUri: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=80',
  },
  running: {
    title: 'Бег',
    description: 'Групповые пробежки и тренировки на выносливость. Темп можно адаптировать под себя.',
    imageUri: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=80',
  },
  cycling: {
    title: 'Велоспорт',
    description: 'Маршруты по городу и паркам. Спокойный формат, важна безопасность и исправный велосипед.',
    imageUri: 'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=1600&q=80',
  },
  strength: {
    title: 'Силовые',
    description: 'Функциональные тренировки на всё тело. Акцент на технику и прогрессию без перегруза.',
    imageUri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1600&q=80',
  },
  swimming: {
    title: 'Плавание',
    description: 'Тренировки в бассейне для выносливости и техники. Подходит для мягкой нагрузки и восстановления.',
    imageUri: 'https://images.unsplash.com/photo-1511317559916-56d5ddb62563?auto=format&fit=crop&w=1600&q=80',
  },
  badminton: {
    title: 'Бадминтон',
    description: 'Динамичные игры на реакцию и координацию. Подходит для любого уровня, главное — комфортный темп.',
    imageUri: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1600&q=80',
  },
  tennis: {
    title: 'Теннис',
    description: 'Классический корт, отработка ударов и игры. Подходит для парных и одиночных матчей любого уровня.',
    imageUri: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1600&q=80',
  },
  padel: {
    title: 'Падел',
    description: 'Динамичный микс тенниса и сквоша. Играется парами на закрытом корте со стенками.',
    imageUri: 'https://images.unsplash.com/photo-1612534847738-b3af9bc31f0c?auto=format&fit=crop&w=1600&q=80',
  },
  team: {
    title: 'Групповые виды спорта',
    description: 'Командные форматы и игровые тренировки. Больше энергии, больше общения, больше драйва.',
    imageUri: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1600&q=80',
  },
  martial: {
    title: 'Единоборства',
    description: 'Техника, дисциплина и контроль. Тренировки по ударным и борцовским направлениям под присмотром тренера.',
    imageUri: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1600&q=80',
  },
};

export default function CategoryScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { events, selectEvent, getActiveBookingForEvent, cancelBooking } = useAppStore();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const styles = createStyles();

  const meta = CATEGORY_META[slug || ''] || {
    title: 'Категория',
    description: '',
    imageUri: 'https://images.unsplash.com/photo-1526403226-6f2b96d11b55?auto=format&fit=crop&w=1400&q=80',
  };

  const filteredEvents = events.filter((e) => e.category === (slug || ''));

  const handleBack = () => {
    router.back();
  };

  const handleEventPress = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event) {
      selectEvent(event);
      router.push(`/event/${eventId}`);
    }
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{meta.title}</Text>
          </View>
        </View>

        <ImageBackground
          source={{ uri: meta.imageUri }}
          resizeMode="cover"
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.05)']}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.heroOverlay}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{meta.title}</Text>
            <Text style={styles.heroDescription}>{meta.description}</Text>
          </View>
        </ImageBackground>

        {filteredEvents.length > 0 ? (
          <View style={styles.eventsList}>
            {filteredEvents.map((event) => {
              const activeBooking = getActiveBookingForEvent(event.id);
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={() => handleEventPress(event.id)}
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
        ) : (
          <EmptyState
            icon=""
            title="Пока нет событий"
            description="В этой категории пока нет доступных тренировок. Проверьте позже или выберите другую категорию."
          />
        )}
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

  function createStyles() {
    return StyleSheet.create({
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
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
      },
      backButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
      },
      backIcon: {
        fontSize: fontSize.xl,
        color: colors.text,
      },
      headerContent: {
        flex: 1,
      },
      title: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.black,
        color: colors.text,
      },
      hero: {
        height: 180,
        borderRadius: borderRadius.xxl,
        overflow: 'hidden',
        marginBottom: spacing.xl,
        backgroundColor: colors.surface,
        ...shadows.sm,
      },
      heroImage: {
        borderRadius: borderRadius.xxl,
      },
      heroOverlay: {
        ...StyleSheet.absoluteFillObject,
      },
      heroContent: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: spacing.xl,
        gap: spacing.xs,
      },
      heroTitle: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.black,
        color: colors.black,
      },
      heroDescription: {
        fontSize: fontSize.md,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 20,
      },
      eventsList: {
        gap: spacing.md,
      },
    });
  }
}
