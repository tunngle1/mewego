// BACKUP: themes.ts (до редизайна по DESIGN_REFERENCES.md)
// Дата: 2026-01-22
// Для отката: переименовать обратно в themes.ts

// Feminine theme - розово-пастельные тона (текущая)
export const feminineColors = {
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

// Masculine theme - тёмный графит + оранжевый акцент (как на сайте WeMeGo)
export const masculineColors = {
  // Primary palette (dark graphite)
  background: '#11191F',
  neutral: '#2A3844',
  surface: '#1E2B35',
  text: '#F3F6F8',
  accent: '#FF7A1A',
  primary: '#FF7A1A',
  
  // Semantic colors (white = card background in dark theme)
  white: '#1E2B35',
  black: '#F3F6F8',
  error: '#FF4D4F',
  success: '#2ECC71',
  warning: '#F5A623',
  
  // Opacity variants
  textLight: 'rgba(243, 246, 248, 0.85)',
  textMuted: '#B7C2CC',
  textDisabled: '#5B6873',
  surfaceLight: '#243242',
  surfaceMuted: '#1E2B35',
  neutralLight: '#2A3844',
  neutralMuted: '#20303B',
  accentLight: 'rgba(255, 122, 26, 0.2)',
  primaryLight: 'rgba(255, 122, 26, 0.15)',
};

export type ThemeColors = typeof feminineColors;
export type ThemeVariant = 'feminine' | 'masculine';

export const themeColors: Record<ThemeVariant, ThemeColors> = {
  feminine: feminineColors,
  masculine: masculineColors,
};
