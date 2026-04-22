import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { spacing, fontSize } from '../../constants/theme';
import { useThemeSafe } from '../../contexts/ThemeContext';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  text,
  fullScreen = false,
}) => {
  const { colors } = useThemeSafe();
  const spinnerColor = color || colors.primary;

  const content = (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {text && <Text style={[styles.text, { color: colors.textLight }]}>{text}</Text>}
    </View>
  );

  if (fullScreen) {
    return <View style={[styles.overlay, { backgroundColor: colors.background }]}>{content}</View>;
  }

  return content;
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fullScreen: {
    flex: 1,
  },
  text: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
  },
});
