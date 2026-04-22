// BACKUP: theme.ts (до редизайна по DESIGN_REFERENCES.md)
// Дата: 2026-01-22
// Для отката: переименовать обратно в theme.ts

export const colors = {
  // Primary palette
  background: '#FBF5E5',
  neutral: '#D0D4C5',
  surface: '#AAC4BB',
  text: '#171E22',
  accent: '#e8336c',
  primary: '#14b8a6',
  
  // Semantic colors
  white: '#FFFFFF',
  black: '#000000',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  
  // Opacity variants
  textLight: 'rgba(23, 30, 34, 0.6)',
  textMuted: 'rgba(23, 30, 34, 0.4)',
  textDisabled: 'rgba(23, 30, 34, 0.3)',
  surfaceLight: 'rgba(170, 196, 187, 0.3)',
  surfaceMuted: 'rgba(170, 196, 187, 0.2)',
  neutralLight: 'rgba(208, 212, 197, 0.5)',
  neutralMuted: 'rgba(208, 212, 197, 0.3)',
  accentLight: 'rgba(232, 51, 108, 0.1)',
  primaryLight: 'rgba(20, 184, 166, 0.1)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  full: 9999,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  xxxl: 32,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

export const shadows = {
  sm: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  accent: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
};

export type Theme = typeof theme;
