import React, { createContext, useContext, useMemo } from 'react';
import { themeColors, ThemeColors, ThemeVariant } from '../constants/themes';
import { spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';

interface ThemeContextValue {
  colors: ThemeColors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  variant: ThemeVariant;
  setTheme: (variant: ThemeVariant) => void;
  shadows: {
    xs: object;
    sm: object;
    md: object;
    lg: object;
    xl: object;
    accent: object;
  };
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeVariant, setThemeVariant } = useAppStore();
  
  const colors = useMemo(() => themeColors[themeVariant], [themeVariant]);
  
  const shadows = useMemo(() => ({
    xs: {
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 1,
      elevation: 1,
    },
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
  }), [colors]);

  const value: ThemeContextValue = {
    colors,
    spacing,
    borderRadius,
    fontSize,
    fontWeight,
    variant: themeVariant,
    setTheme: setThemeVariant,
    shadows,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Safe version that returns fallback values when used outside ThemeProvider
// Use this for components that may render before ThemeProvider is mounted
const fallbackColors = themeColors.feminine;
const fallbackShadows = {
  xs: { shadowColor: fallbackColors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 1, elevation: 1 },
  sm: { shadowColor: fallbackColors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: fallbackColors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  lg: { shadowColor: fallbackColors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  xl: { shadowColor: fallbackColors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  accent: { shadowColor: fallbackColors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
};

export function useThemeSafe(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      colors: fallbackColors,
      spacing,
      borderRadius,
      fontSize,
      fontWeight,
      variant: 'feminine',
      setTheme: () => {},
      shadows: fallbackShadows,
    };
  }
  return context;
}
