import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

interface CategoryCardProps {
  title: string;
  subtitle?: string;
  imageSource?: ImageSourcePropType;
  imageUri?: string;
  variant?: 'default' | 'accent' | 'primary';
  size?: 'small' | 'large';
  onPress?: () => void;
  style?: ViewStyle;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  title,
  subtitle,
  imageSource,
  imageUri,
  variant = 'default',
  size = 'small',
  onPress,
  style,
}) => {
  const { colors, borderRadius, fontSize, fontWeight, spacing, shadows } = useTheme();

  const styles = createStyles();

  const source = imageSource || (imageUri ? { uri: imageUri } : undefined);

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'accent':
        return {
          borderColor: colors.accentLight,
        };
      case 'primary':
        return {
          borderColor: colors.primaryLight,
        };
      default:
        return {
          borderColor: colors.neutralMuted,
        };
    }
  };

  const getSizeStyles = (): ViewStyle => {
    if (size === 'large') {
      return {
        height: 140,
        flexDirection: 'row',
        alignItems: 'center',
      };
    }
    return {
      height: 160,
    };
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.container,
        getVariantStyles(),
        getSizeStyles(),
        style,
      ]}
    >
      {source ? (
        <Image
          source={source}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          style={[styles.image, styles.imageRadius]}
        />
      ) : null}

      <LinearGradient
        colors={[
          'rgba(0,0,0,0.65)',
          'rgba(0,0,0,0.25)',
          'rgba(0,0,0,0.05)',
        ]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.overlay}
      />

      <View style={[styles.content, size === 'large' && styles.contentLarge]}>
        <Text style={[styles.title, size === 'large' && styles.titleLarge]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );

  function createStyles() {
    return StyleSheet.create({
      container: {
        borderRadius: borderRadius.xxl,
        borderWidth: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: colors.surface,
        ...shadows.sm,
      },
      image: {
        ...StyleSheet.absoluteFillObject,
      },
      imageRadius: {
        borderRadius: borderRadius.xxl,
      },
      overlay: {
        ...StyleSheet.absoluteFillObject,
      },
      content: {
        flex: 1,
        padding: spacing.xl,
        justifyContent: 'flex-end',
        gap: spacing.xs,
      },
      contentLarge: {
        paddingRight: spacing.xl,
      },
      title: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: '#FFFFFF',
        lineHeight: 22,
      },
      titleLarge: {
        fontSize: fontSize.xl,
      },
      subtitle: {
        fontSize: fontSize.sm,
        color: 'rgba(255,255,255,0.85)',
        marginTop: spacing.xs,
      },
    });
  }
};
