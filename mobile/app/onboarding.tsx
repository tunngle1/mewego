import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../src/components/ui/Button';
import { useAppStore } from '../src/store/useAppStore';
import { useTheme } from '../src/contexts/ThemeContext';

const { width } = Dimensions.get('window');

const APP_LOGO = require('../assets/logo.png');

const ONBOARDING_STEPS = [
  {
    title: 'ME·WE·GO',
    subtitle: 'Двигаться — это просто',
    description: 'Забудьте про спортзалы с зеркалами. Мы верим, что каждое движение имеет значение.',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
  },
  {
    title: 'БЕЗ ДАВЛЕНИЯ',
    subtitle: 'Твой темп — твой выбор',
    description: 'Выбирайте формат, который подходит вам сегодня. Комфортный темп — это тоже результат.',
    image: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&q=80&w=800',
  },
  {
    title: 'ВМЕСТЕ ПРОЩЕ',
    subtitle: 'Найди своих людей',
    description: 'Присоединяйтесь к группам по интересам. Двигаться вместе — значит не сойти с пути.',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=800',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const { colors, spacing, fontSize, fontWeight, borderRadius } = useTheme();
  const styles = React.useMemo(
    () => createStyles(colors, spacing, fontSize, fontWeight, borderRadius),
    [colors, spacing, fontSize, fontWeight, borderRadius]
  );

  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    completeOnboarding();
    router.replace('/auth');
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.accent, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[colors.accent, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Image source={APP_LOGO} style={styles.logoFill} resizeMode="cover" />
          </LinearGradient>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.subtitle}>{step.subtitle}</Text>
          <Text style={styles.description}>{step.description}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentStep && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>

        <Button
          title={isLastStep ? 'Начать' : 'Продолжить'}
          onPress={handleNext}
          variant="primary"
          size="lg"
          fullWidth
        />

        <Button
          title="Пропустить"
          onPress={handleComplete}
          variant="ghost"
          size="sm"
          disabled={isLastStep}
          style={[styles.skipButton, isLastStep && styles.skipButtonHidden]}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: any,
  spacing: any,
  fontSize: any,
  fontWeight: any,
  borderRadius: any
) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    opacity: 0.1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 72,
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.xxl,
  },
  logoGradient: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoFill: {
    width: '100%',
    height: '100%',
    borderRadius: 110,
  },
  textContainer: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.accent,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  footer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  paginationDot: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral,
  },
  paginationDotActive: {
    width: 40,
    backgroundColor: colors.primary,
  },
  skipButton: {
    marginTop: spacing.md,
  },
  skipButtonHidden: {
    opacity: 0,
  },
});
