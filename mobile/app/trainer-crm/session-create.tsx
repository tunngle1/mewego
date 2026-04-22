import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api } from '../../src/services/api';
import { Button } from '../../src/components/ui/Button';
import { isDarkTheme } from '../../src/constants/themes';

const typeOptions = [
  { key: 'personal', label: 'Персональная' },
  { key: 'group', label: 'Групповая' },
];

const visibilityOptions = [
  { key: 'crm_only', label: 'Только CRM' },
  { key: 'private', label: 'Приватная' },
  { key: 'public', label: 'Публичная' },
];

const formatDateLabel = (d: Date) =>
  d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const formatTimeLabel = (d: Date) =>
  d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

const combineDateTime = (dateOnly: Date, timeOnly: Date) => {
  const combined = new Date(dateOnly);
  combined.setHours(timeOnly.getHours(), timeOnly.getMinutes(), 0, 0);
  return combined;
};

export default function TrainerCrmSessionCreateScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows, variant } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [format, setFormat] = useState('offline');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [durationMin, setDurationMin] = useState('60');
  const [capacity, setCapacity] = useState('1');
  const [priceRub, setPriceRub] = useState('0');
  const [paymentNote, setPaymentNote] = useState('');
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);
  const [type, setType] = useState<'personal' | 'group'>('personal');
  const [visibility, setVisibility] = useState<'crm_only' | 'private' | 'public'>('crm_only');
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => title.trim() && selectedDate && selectedTime, [title, selectedDate, selectedTime]);

  const handleCreate = async () => {
    if (!canSubmit) {
      Alert.alert('Не хватает данных', 'Укажи название, дату и время начала.');
      return;
    }

    try {
      setSaving(true);
      const startAt = combineDateTime(selectedDate as Date, selectedTime as Date).toISOString();
      const session = await api.createTrainerCrmSession({
        type,
        visibility,
        title: title.trim(),
        description: description.trim() || undefined,
        discipline: discipline.trim() || undefined,
        format: format.trim() || undefined,
        locationName: locationName.trim() || undefined,
        locationAddress: locationAddress.trim() || undefined,
        onlineUrl: onlineUrl.trim() || undefined,
        startAt: startAt.trim(),
        durationMin: Math.max(15, Number(durationMin) || 60),
        capacity: Math.max(1, Number(capacity) || 1),
        waitlistEnabled,
        priceMinor: Math.max(0, Number(priceRub) || 0) * 100,
        paymentNote: paymentNote.trim() || undefined,
        status: 'scheduled',
      });
      router.replace(`/trainer-crm/session/${session.id}`);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось создать сессию');
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
    cardTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
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
      minHeight: 90,
      textAlignVertical: 'top',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    chipActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    switchLabel: {
      flex: 1,
      marginRight: spacing.md,
      fontSize: fontSize.sm,
      color: colors.text,
    },
    pickerButton: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    pickerValue: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    helper: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      lineHeight: 18,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.md,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    modalAction: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
    },
    modalActionPrimary: {
      backgroundColor: colors.primary,
    },
    modalActionText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    modalActionTextPrimary: {
      color: colors.black,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Новая сессия</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Тип и доступ</Text>
          <Text style={styles.label}>Тип сессии</Text>
          <View style={styles.chipRow}>
            {typeOptions.map((item) => (
              <TouchableOpacity key={item.key} style={[styles.chip, type === item.key && styles.chipActive]} onPress={() => setType(item.key as 'personal' | 'group')}>
                <Text style={styles.chipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Видимость</Text>
          <View style={styles.chipRow}>
            {visibilityOptions.map((item) => (
              <TouchableOpacity key={item.key} style={[styles.chip, visibility === item.key && styles.chipActive]} onPress={() => setVisibility(item.key as 'crm_only' | 'private' | 'public')}>
                <Text style={styles.chipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Основное</Text>
          <Text style={styles.label}>Название</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Персональная тренировка / Групповая йога" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Описание</Text>
          <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.inputMultiline]} placeholder="Что будет на тренировке" placeholderTextColor={colors.textMuted} multiline />
          <Text style={styles.label}>Дисциплина</Text>
          <TextInput value={discipline} onChangeText={setDiscipline} style={styles.input} placeholder="Йога, бег, сила" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Формат</Text>
          <TextInput value={format} onChangeText={setFormat} style={styles.input} placeholder="offline / online / hybrid" placeholderTextColor={colors.textMuted} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Дата, место и учёт</Text>
          <Text style={styles.label}>Дата</Text>
          <TouchableOpacity style={styles.pickerButton} activeOpacity={0.8} onPress={() => setDatePickerOpen(true)}>
            <Text style={styles.pickerValue}>{selectedDate ? formatDateLabel(selectedDate) : 'Выбрать дату'}</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Время</Text>
          <TouchableOpacity style={styles.pickerButton} activeOpacity={0.8} onPress={() => setTimePickerOpen(true)}>
            <Text style={styles.pickerValue}>{selectedTime ? formatTimeLabel(selectedTime) : 'Выбрать время'}</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Длительность, мин</Text>
          <TextInput value={durationMin} onChangeText={setDurationMin} style={styles.input} placeholder="60" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
          <Text style={styles.label}>Локация</Text>
          <TextInput value={locationName} onChangeText={setLocationName} style={styles.input} placeholder="Студия / парк / онлайн" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Адрес</Text>
          <TextInput value={locationAddress} onChangeText={setLocationAddress} style={styles.input} placeholder="Адрес площадки" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Ссылка online</Text>
          <TextInput value={onlineUrl} onChangeText={setOnlineUrl} style={styles.input} placeholder="https://..." placeholderTextColor={colors.textMuted} autoCapitalize="none" />
          <Text style={styles.label}>Вместимость</Text>
          <TextInput value={capacity} onChangeText={setCapacity} style={styles.input} placeholder="1" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
          <Text style={styles.label}>Стоимость, ₽</Text>
          <TextInput value={priceRub} onChangeText={setPriceRub} style={styles.input} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
          <Text style={styles.label}>Комментарий по расчёту</Text>
          <TextInput value={paymentNote} onChangeText={setPaymentNote} style={[styles.input, styles.inputMultiline]} placeholder="Например: оплата лично тренеру на месте" placeholderTextColor={colors.textMuted} multiline />
          <Text style={styles.helper}>Оплата принимается лично тренеру вне приложения. Эти поля нужны только для учёта в CRM.</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Включить лист ожидания</Text>
            <Switch value={waitlistEnabled} onValueChange={setWaitlistEnabled} trackColor={{ false: colors.neutralMuted, true: colors.primaryLight }} thumbColor={waitlistEnabled ? colors.primary : colors.white} />
          </View>
        </View>

        <Button title="Создать сессию" onPress={handleCreate} loading={saving} disabled={!canSubmit} variant="accent" />
      </ScrollView>

      <Modal visible={datePickerOpen} transparent animationType="slide" onRequestClose={() => setDatePickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите дату</Text>
              <TouchableOpacity onPress={() => setDatePickerOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant={isDarkTheme(variant) ? 'dark' : 'light'}
              textColor={colors.text}
              accentColor={colors.accent}
              onChange={(e, d) => {
                if (!d) {
                  if (Platform.OS !== 'ios') setDatePickerOpen(false);
                  return;
                }
                setTempDate(d);
                if (Platform.OS !== 'ios') {
                  setSelectedDate(d);
                  setDatePickerOpen(false);
                }
              }}
              minimumDate={new Date()}
            />

            {Platform.OS === 'ios' && (
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalAction} onPress={() => setDatePickerOpen(false)}>
                  <Text style={styles.modalActionText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalAction, styles.modalActionPrimary]}
                  onPress={() => {
                    setSelectedDate(tempDate);
                    setDatePickerOpen(false);
                  }}
                >
                  <Text style={[styles.modalActionText, styles.modalActionTextPrimary]}>Готово</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={timePickerOpen} transparent animationType="slide" onRequestClose={() => setTimePickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите время</Text>
              <TouchableOpacity onPress={() => setTimePickerOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <DateTimePicker
              value={tempTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour
              themeVariant={isDarkTheme(variant) ? 'dark' : 'light'}
              textColor={colors.text}
              accentColor={colors.accent}
              onChange={(e, d) => {
                if (!d) {
                  if (Platform.OS !== 'ios') setTimePickerOpen(false);
                  return;
                }
                setTempTime(d);
                if (Platform.OS !== 'ios') {
                  setSelectedTime(d);
                  setTimePickerOpen(false);
                }
              }}
            />

            {Platform.OS === 'ios' && (
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalAction} onPress={() => setTimePickerOpen(false)}>
                  <Text style={styles.modalActionText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalAction, styles.modalActionPrimary]}
                  onPress={() => {
                    setSelectedTime(tempTime);
                    setTimePickerOpen(false);
                  }}
                >
                  <Text style={[styles.modalActionText, styles.modalActionTextPrimary]}>Готово</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
