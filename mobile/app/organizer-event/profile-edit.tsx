import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api } from '../../src/services/api';

const AVAILABLE_TAGS = [
  'yoga', 'running', 'strength', 'dance', 'meditation',
  'pilates', 'stretching', 'crossfit', 'swimming', 'cycling',
];

const TAG_LABELS: Record<string, string> = {
  yoga: 'Йога',
  running: 'Бег',
  strength: 'Силовые',
  dance: 'Танцы',
  meditation: 'Медитация',
  pilates: 'Пилатес',
  stretching: 'Растяжка',
  crossfit: 'Кроссфит',
  swimming: 'Плавание',
  cycling: 'Велоспорт',
};

interface OrganizerProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  tags: string[];
  city: string | null;
  contactPhone: string | null;
  contactTelegram: string | null;
  contactEmail: string | null;
  paymentInfo: string | null;
  status: string;
}

export default function OrganizerProfileEditScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [contactPhone, setContactPhone] = useState('');
  const [contactTelegram, setContactTelegram] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getOrganizerProfile();
      setProfile(data);
      setDisplayName(data.displayName || '');
      setBio(data.bio || '');
      setCity(data.city || '');
      setTags(data.tags || []);
      setContactPhone(data.contactPhone || '');
      setContactTelegram(data.contactTelegram || '');
      setContactEmail(data.contactEmail || '');
      setPaymentInfo(data.paymentInfo || '');
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Ошибка', 'Введите имя');
      return;
    }

    setSaving(true);
    try {
      await api.updateOrganizerProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
        tags,
        contactPhone: contactPhone.trim() || undefined,
        contactTelegram: contactTelegram.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        paymentInfo: paymentInfo.trim() || undefined,
      });
      Alert.alert('Сохранено', 'Профиль обновлён', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMuted,
      backgroundColor: colors.surface,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      fontSize: fontSize.lg,
      color: colors.text,
    },
    headerTitle: {
      flex: 1,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginRight: 40,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      padding: spacing.lg,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      marginBottom: spacing.md,
      textTransform: 'uppercase',
    },
    fieldContainer: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      fontSize: fontSize.md,
      color: colors.text,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    tag: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    tagSelected: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    tagText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    tagTextSelected: {
      color: colors.primary,
      fontWeight: fontWeight.semibold,
    },
    hint: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    saveButton: {
      backgroundColor: colors.accent,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.xxl,
      ...shadows.md,
    },
    saveButtonDisabled: {
      backgroundColor: colors.neutralLight,
    },
    saveButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Редактирование профиля</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Редактирование профиля</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Основная информация</Text>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Имя / Название *</Text>
                  <TextInput
                    style={styles.input}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Как вас будут видеть участники"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>О себе</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Расскажите о себе, своём опыте и подходе"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Город</Text>
                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={setCity}
                    placeholder="Москва"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Специализации</Text>
                <View style={styles.tagsContainer}>
                  {AVAILABLE_TAGS.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tag, tags.includes(tag) && styles.tagSelected]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text style={[styles.tagText, tags.includes(tag) && styles.tagTextSelected]}>
                        {TAG_LABELS[tag] || tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Контакты</Text>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Телефон</Text>
                  <TextInput
                    style={styles.input}
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    placeholder="+7 (999) 123-45-67"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Telegram</Text>
                  <TextInput
                    style={styles.input}
                    value={contactTelegram}
                    onChangeText={setContactTelegram}
                    placeholder="@username"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={contactEmail}
                    onChangeText={setContactEmail}
                    placeholder="email@example.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Оплата</Text>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Реквизиты для оплаты</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={paymentInfo}
                    onChangeText={setPaymentInfo}
                    placeholder="Номер карты, СБП или другие реквизиты"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                  />
                  <Text style={styles.hint}>
                    Эта информация будет показана участникам платных событий
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
