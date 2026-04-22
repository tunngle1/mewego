import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { borderRadius, fontSize, fontWeight } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type BadgeVariant = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'outline';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: colors.primaryLight },
          text: { color: colors.primary },
        };
      case 'accent':
        return {
          container: { backgroundColor: colors.accent },
          text: { color: colors.black },
        };
      case 'success':
        return {
          container: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
          text: { color: colors.success },
        };
      case 'warning':
        return {
          container: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
          text: { color: colors.warning },
        };
      case 'outline':
        return {
          container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.neutralLight },
          text: { color: colors.text },
        };
      default:
        return {
          container: { backgroundColor: colors.surfaceLight },
          text: { color: colors.textLight },
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    if (size === 'sm') {
      return {
        container: { height: 32, paddingHorizontal: 12, justifyContent: 'center' },
        text: { fontSize: fontSize.xs },
      };
    }
    return {
      container: { height: 40, paddingHorizontal: 16, justifyContent: 'center' },
      text: { fontSize: fontSize.sm },
    };
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, variantStyles.container, sizeStyles.container, style]}>
      <Text style={[styles.text, variantStyles.text, sizeStyles.text, textStyle]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
