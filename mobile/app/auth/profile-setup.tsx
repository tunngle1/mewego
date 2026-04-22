import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { api } from '../../src/services/api';

const CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Другой',
];

const SPORTS = [
  { id: 'yoga', label: 'Йога', emoji: '🧘' },
  { id: 'running', label: 'Бег', emoji: '🏃' },
  { id: 'cycling', label: 'Велоспорт', emoji: '🚴' },
  { id: 'strength', label: 'Силовые', emoji: '💪' },
  { id: 'swimming', label: 'Плавание', emoji: '🏊' },
  { id: 'dance', label: 'Танцы', emoji: '💃' },
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { user, updateUser } = useAppStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: name, 2: city, 3: sports, 4: avatar

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужен доступ', 'Разрешите доступ к галерее в настройках');
      return;
    }

    const anyPicker: any = ImagePicker as any;
    const mediaTypes = anyPicker.MediaType
      ? [anyPicker.MediaType.Images]
      : anyPicker.MediaTypeOptions
        ? anyPicker.MediaTypeOptions.Images
        : undefined;

    const result = await ImagePicker.launchImageLibraryAsync({
      ...(mediaTypes ? { mediaTypes } : {}),
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Ошибка', 'Не удалось прочитать изображение. Попробуйте другое фото.');
      return;
    }

    const mime = asset.mimeType || 'image/jpeg';
    setAvatarDataUrl(`data:${mime};base64,${asset.base64}`);
  };

  const toggleSport = (sportId: string) => {
    setSelectedSports((prev) =>
      prev.includes(sportId)
        ? prev.filter((id) => id !== sportId)
        : [...prev, sportId]
    );
  };

  const renderStep4 = () => (
    <>
      <Text style={styles.heroEmoji}>📸</Text>
      <Text style={styles.heroTitle}>Добавьте аватар</Text>
      <Text style={styles.heroSubtitle}>
        Профили с фото вызывают больше доверия и охотнее принимаются в события
      </Text>

      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          {avatarDataUrl ? (
            <Image source={{ uri: avatarDataUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarPlaceholder}>👤</Text>
          )}
        </View>
        <TouchableOpacity style={styles.avatarButton} onPress={handlePickAvatar} activeOpacity={0.9}>
          <Text style={styles.avatarButtonText}>
            {avatarDataUrl ? 'Изменить фото' : 'Выбрать фото'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.trustNote}>
        <Text style={styles.trustNoteText}>
          💡 С фото профиля люди чаще доверяют и охотнее идут на совместные тренировки
        </Text>
      </View>
    </>
  );

  const handleNext = () => {
    if (step === 1 && !firstName.trim()) {
      Alert.alert('Введите имя', 'Имя обязательно для заполнения');
      return;
    }
    if (step === 2 && !city) {
      Alert.alert('Выберите город', 'Город обязателен для заполнения');
      return;
    }
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setLoading(true);

    try {
      // Обновляем профиль на backend
      const profileData = {
        name: `${firstName.trim()} ${lastName.trim()}`.trim() || user?.name,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        city: city || undefined,
        interests: selectedSports.length > 0 ? selectedSports : undefined,
        avatarUrl: avatarDataUrl || undefined,
        onboardingCompleted: true,
      };

      await api.updateProfile(profileData);

      // Обновляем локальный store
      updateUser({
        name: profileData.name,
        city: profileData.city,
        interests: profileData.interests,
        avatar: profileData.avatarUrl,
        onboardingCompleted: true,
      });

      // Переходим в приложение (все роли заходят как участники, админка открывается из Профиля)
      router.replace('/');
    } catch (error) {
      console.error('[ProfileSetup] Error:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить профиль. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      backgroundColor: colors.white,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    backText: {
      fontSize: fontSize.xl,
      color: colors.text,
    },
    stepIndicator: {
      flexDirection: 'row',
      gap: 6,
    },
    stepDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.neutralMuted,
    },
    stepDotActive: {
      backgroundColor: colors.accent,
      width: 24,
    },
    content: {
      flex: 1,
      padding: spacing.xl,
    },
    heroEmoji: {
      fontSize: 64,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    heroTitle: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    heroSubtitle: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 20,
    },
    input: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.md,
    },
    cityList: {
      gap: spacing.sm,
    },
    cityOption: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 2,
      borderColor: colors.neutralMuted,
    },
    cityOptionSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    cityOptionText: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: fontWeight.medium,
    },
    sportsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    sportOption: {
      width: '48%',
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.neutralMuted,
    },
    sportOptionSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    sportEmoji: {
      fontSize: 32,
      marginBottom: spacing.xs,
    },
    sportLabel: {
      fontSize: fontSize.sm,
      color: colors.text,
      fontWeight: fontWeight.medium,
    },
    avatarContainer: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: 120,
      height: 120,
    },
    avatarPlaceholder: {
      fontSize: 48,
    },
    avatarButton: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    avatarButtonText: {
      fontSize: fontSize.sm,
      color: colors.accent,
      fontWeight: fontWeight.bold,
    },
    trustNote: {
      backgroundColor: colors.primaryLight,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    trustNoteText: {
      fontSize: fontSize.xs,
      color: colors.text,
      textAlign: 'center',
      lineHeight: 18,
    },
    footer: {
      padding: spacing.xl,
      gap: spacing.md,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      ...shadows.md,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    skipButton: {
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    skipButtonText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
  });

  const renderStep1 = () => (
    <>
      <Text style={styles.heroEmoji}>👋</Text>
      <Text style={styles.heroTitle}>Как вас зовут?</Text>
      <Text style={styles.heroSubtitle}>
        Представьтесь, чтобы другие участники знали, с кем тренируются
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Имя"
        placeholderTextColor={colors.textDisabled}
        value={firstName}
        onChangeText={setFirstName}
        autoFocus
      />
      <TextInput
        style={styles.input}
        placeholder="Фамилия (необязательно)"
        placeholderTextColor={colors.textDisabled}
        value={lastName}
        onChangeText={setLastName}
      />
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.heroEmoji}>📍</Text>
      <Text style={styles.heroTitle}>Где вы находитесь?</Text>
      <Text style={styles.heroSubtitle}>
        Мы покажем события рядом с вами
      </Text>
      <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
        <View style={styles.cityList}>
          {CITIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.cityOption, city === c && styles.cityOptionSelected]}
              onPress={() => setCity(c)}
              activeOpacity={0.8}
            >
              <Text style={styles.cityOptionText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.heroEmoji}>🏃</Text>
      <Text style={styles.heroTitle}>Что вам интересно?</Text>
      <Text style={styles.heroSubtitle}>
        Выберите виды активности, которые вам нравятся
      </Text>
      <View style={styles.sportsGrid}>
        {SPORTS.map((sport) => (
          <TouchableOpacity
            key={sport.id}
            style={[
              styles.sportOption,
              selectedSports.includes(sport.id) && styles.sportOptionSelected,
            ]}
            onPress={() => toggleSport(sport.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.sportEmoji}>{sport.emoji}</Text>
            <Text style={styles.sportLabel}>{sport.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
          style={styles.backButton}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[styles.stepDot, s === step && styles.stepDotActive]}
            />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleNext}
          activeOpacity={0.9}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Сохранение...' : step === 4 ? 'Завершить' : 'Продолжить'}
          </Text>
        </TouchableOpacity>
        
        {step > 1 && step < 4 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Пропустить</Text>
          </TouchableOpacity>
        )}
        
        {step === 3 && selectedSports.length === 0 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleFinish}>
            <Text style={styles.skipButtonText}>Пропустить и завершить</Text>
          </TouchableOpacity>
        )}

        {step === 4 && !avatarDataUrl && (
          <TouchableOpacity style={styles.skipButton} onPress={handleFinish}>
            <Text style={styles.skipButtonText}>Пропустить и завершить</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
