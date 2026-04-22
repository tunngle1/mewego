import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api } from '../../src/services/api';
import { Button } from '../../src/components/ui/Button';

const statusOptions = [
  { key: 'lead', label: 'Лид' },
  { key: 'active', label: 'Активный' },
  { key: 'inactive', label: 'Неактивный' },
  { key: 'paused', label: 'На паузе' },
];

export default function TrainerCrmClientCreateScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [source, setSource] = useState('manual');
  const [goals, setGoals] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('lead');
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => fullName.trim().length > 1, [fullName]);

  const handleSave = async () => {
    if (!canSubmit) {
      Alert.alert('Заполни имя', 'Укажи имя клиента, чтобы сохранить карточку.');
      return;
    }

    try {
      setSaving(true);
      const client = await api.createTrainerCrmClient({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        telegramHandle: telegramHandle.trim() || undefined,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        source: source.trim() || 'manual',
        status,
        goals: goals.trim() || undefined,
        medicalNotes: medicalNotes.trim() || undefined,
        privateNotes: privateNotes.trim() || undefined,
        tags: tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      });
      router.replace(`/trainer-crm/client/${client.id}`);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось создать клиента');
    } finally {
      setSaving(false);
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
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    title: {
      flex: 1,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl * 2,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      gap: spacing.sm,
      ...shadows.sm,
    },
    label: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.text,
      fontSize: fontSize.sm,
    },
    inputMultiline: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    sectionTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    statusRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    statusChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    statusChipActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    statusChipText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Новый клиент</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Основное</Text>
          <Text style={styles.label}>Имя</Text>
          <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="Например, Анна Иванова" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Телефон</Text>
          <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholder="+7 ..." placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
          <Text style={styles.label}>Telegram</Text>
          <TextInput value={telegramHandle} onChangeText={setTelegramHandle} style={styles.input} placeholder="@username" placeholderTextColor={colors.textMuted} autoCapitalize="none" />
          <Text style={styles.label}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="name@email.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.label}>Город</Text>
          <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder="Москва" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Источник</Text>
          <TextInput value={source} onChangeText={setSource} style={styles.input} placeholder="manual / instagram / referral" placeholderTextColor={colors.textMuted} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Статус</Text>
          <View style={styles.statusRow}>
            {statusOptions.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.statusChip, status === item.key && styles.statusChipActive]}
                onPress={() => setStatus(item.key)}
              >
                <Text style={styles.statusChipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Дополнительно</Text>
          <Text style={styles.label}>Цели клиента</Text>
          <TextInput value={goals} onChangeText={setGoals} style={[styles.input, styles.inputMultiline]} placeholder="Цели, запрос, план занятий" placeholderTextColor={colors.textMuted} multiline />
          <Text style={styles.label}>Медицинские заметки</Text>
          <TextInput value={medicalNotes} onChangeText={setMedicalNotes} style={[styles.input, styles.inputMultiline]} placeholder="Ограничения, особенности, противопоказания" placeholderTextColor={colors.textMuted} multiline />
          <Text style={styles.label}>Приватные заметки</Text>
          <TextInput value={privateNotes} onChangeText={setPrivateNotes} style={[styles.input, styles.inputMultiline]} placeholder="Внутренние заметки тренера" placeholderTextColor={colors.textMuted} multiline />
          <Text style={styles.label}>Теги</Text>
          <TextInput value={tags} onChangeText={setTags} style={styles.input} placeholder="утро, онлайн, йога" placeholderTextColor={colors.textMuted} />
        </View>

        <Button title="Сохранить клиента" onPress={handleSave} loading={saving} disabled={!canSubmit} variant="accent" />
      </ScrollView>
    </SafeAreaView>
  );
}
