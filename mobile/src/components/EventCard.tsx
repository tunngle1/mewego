import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Event } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { Badge } from './ui/Badge';
import { AvatarGroup } from './ui/Avatar';

const DEFAULT_COVERS: Record<string, any> = {
  yoga: require('../../assets/categories/yoga.jpg'),
  running: require('../../assets/event-covers/running.jpg'),
  cycling: require('../../assets/categories/cycling.jpg'),
  strength: require('../../assets/categories/strength.jpg'),
};

const normalizeCategorySlug = (input: string | undefined | null): keyof typeof DEFAULT_COVERS => {
  const raw = String(input || '').trim().toLowerCase();
  if (raw in DEFAULT_COVERS) return raw as keyof typeof DEFAULT_COVERS;
  if (raw === 'run' || raw === 'runner' || raw === 'бег' || raw === 'running') return 'running';
  if (raw === 'йога' || raw === 'yoga') return 'yoga';
  if (raw === 'велоспорт' || raw === 'bike' || raw === 'cycling') return 'cycling';
  if (raw === 'силовые' || raw === 'strength') return 'strength';
  return 'running';
};

const getEventCoverSource = (image: string | undefined | null, category: string): any => {
  const uri = (image || '').trim();
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return { uri };
  }
  const slug = normalizeCategorySlug(category);
  return DEFAULT_COVERS[slug];
};

interface EventCardProps {
  event: Event;
  onPress: () => void;
  variant?: 'compact' | 'full';
  isBooked?: boolean;
  onCancelBooking?: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  variant = 'compact',
  isBooked = false,
  onCancelBooking,
}) => {
  const { colors, borderRadius, fontSize, fontWeight, spacing, shadows } = useTheme();

  const [coverFailed, setCoverFailed] = useState(false);
  const localCover = useMemo(() => getEventCoverSource(null, event.category), [event.category]);
  const coverSource = coverFailed ? localCover : getEventCoverSource(event.image, event.category);

  const categoryLabel =
    CATEGORY_LABELS[event.category as keyof typeof CATEGORY_LABELS] || event.category;

  const styles = StyleSheet.create({
    // Compact variant
    compactContainer: {
      backgroundColor: colors.white,
      borderRadius: 8,
      overflow: 'hidden',
      ...shadows.sm,
    },
    compactBackground: {
      width: '100%',
      minHeight: 112,
      backgroundColor: colors.neutralDark || '#0B1220',
    },
    compactBackgroundImage: {
      borderRadius: 8,
      top: 0,
    },
    compactBottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    compactBottomRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    compactBottomLeft: {
      flex: 1,
    },
    compactMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 2,
    },
    compactMetaText: {
      fontSize: fontSize.xs,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: fontWeight.medium,
    },
    compactPricePill: {
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      alignSelf: 'flex-start',
    },
    compactTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    compactTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.white,
      flex: 1,
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    compactPrice: {
      fontSize: fontSize.sm,
      color: colors.accent,
      fontWeight: fontWeight.bold,
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },

    // Full variant
    fullContainer: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xxl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.md,
    },
    fullImage: {
      width: '100%',
      height: 180,
    },
    fullContent: {
      padding: spacing.md,
    },
    fullHeader: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    fullTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    fullMeta: {
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    metaIcon: {
      fontSize: fontSize.md,
    },
    metaText: {
      fontSize: fontSize.sm,
      color: colors.textLight,
    },
    fullFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.neutralMuted,
    },
    participants: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    spotsText: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      fontWeight: fontWeight.medium,
    },
    fullPrice: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.accent,
    },
    freePrice: {
      color: colors.primary,
    },
    bookedBadge: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      marginTop: spacing.sm,
    },
    bookedBadgeText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.primary,
    },
    cancelLink: {
      marginTop: spacing.xs,
    },
    cancelLinkText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      color: colors.accent,
    },
  });

  const formatPrice = (price: number, isFree: boolean) => {
    if (isFree) return 'Бесплатно';
    return `${price} ₽`;
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.compactContainer}
      >
        <ImageBackground
          source={coverSource}
          style={styles.compactBackground}
          imageStyle={styles.compactBackgroundImage}
          resizeMode="cover"
          onError={() => setCoverFailed(true)}
        >
          <View style={styles.compactBottomBar}>
            <View style={styles.compactBottomRow}>
              <View style={styles.compactBottomLeft}>
                <Text style={styles.compactTitle} numberOfLines={1}>
                  {event.title || categoryLabel}
                </Text>
                <View style={styles.compactMetaRow}>
                  <Text style={styles.compactMetaText} numberOfLines={1}>
                    🕒 {event.date}{event.time ? ` в ${event.time}` : ''}
                  </Text>
                </View>
                <View style={styles.compactMetaRow}>
                  <Text style={styles.compactMetaText} numberOfLines={1}>
                    📍 {event.location.name}
                  </Text>
                </View>
                <View style={styles.compactMetaRow}>
                  <Text style={styles.compactMetaText} numberOfLines={1}>
                    ⚡ {event.intensity}
                  </Text>
                </View>
              </View>

              <View style={styles.compactPricePill}>
                <Text style={[styles.compactPrice, event.isFree && styles.freePrice]}>
                  {formatPrice(event.price, event.isFree)}
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={styles.fullContainer}
    >
      <Image
        source={coverSource}
        style={styles.fullImage}
        resizeMode="cover"
        onError={() => setCoverFailed(true)}
      />
      
      <View style={styles.fullContent}>
        <View style={styles.fullHeader}>
          <Badge label={categoryLabel} variant="default" size="sm" />
          {isBooked && (
            <Badge label="Вы записаны" variant="success" size="sm" />
          )}
          {!isBooked && event.isFull && (
            <Badge label="Заполнено" variant="accent" size="sm" />
          )}
        </View>

        <Text style={styles.fullTitle}>{event.title}</Text>
        
        <View style={styles.fullMeta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>🕒</Text>
            <Text style={styles.metaText}>
              {event.date} в {event.time}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>📍</Text>
            <Text style={styles.metaText}>{event.location.name}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>⚡</Text>
            <Text style={styles.metaText}>{event.intensity}</Text>
          </View>
        </View>

        <View style={styles.fullFooter}>
          <View style={styles.participants}>
            {event.participants.length > 0 && (
              <AvatarGroup
                avatars={event.participants.map((p) => ({
                  source: p.avatar,
                  name: p.name,
                }))}
                max={3}
                size={28}
              />
            )}
            <Text style={styles.spotsText}>
              {event.spotsTaken}/{event.spotsTotal} мест
            </Text>
          </View>
          {isBooked && onCancelBooking ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                onCancelBooking();
              }}
            >
              <Text style={styles.cancelLinkText}>Отменить</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.fullPrice, event.isFree && styles.freePrice]}>
              {formatPrice(event.price, event.isFree)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};
