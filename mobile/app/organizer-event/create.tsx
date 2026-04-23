import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import { OrganizerPriceType, OrganizerLocationType, EventVisibility } from '../../src/types';
import { isDarkTheme } from '../../src/constants/themes';
import { ApiError } from '../../src/services/api';

const TOTAL_STEPS = 7;

const STEP_TITLES = [
  'Основное',
  'Категория',
  'Дата и время',
  'Место',
  'Детали',
  'Стоимость',
  'Превью',
];

const MOVEMENT_TYPES = [
  { value: 'yoga', label: 'Йога' },
  { value: 'running', label: 'Бег' },
  { value: 'cycling', label: 'Велоспорт' },
  { value: 'strength', label: 'Силовые' },
  { value: 'swimming', label: 'Плавание' },
  { value: 'badminton', label: 'Бадминтон' },
  { value: 'tennis', label: 'Теннис' },
  { value: 'padel', label: 'Падел' },
  { value: 'team', label: 'Групповые' },
  { value: 'martial', label: 'Единоборства' },
];

const LEVELS = [
  { value: 'novice', label: 'Новичок' },
  { value: 'relaxed', label: 'Расслабленный' },
  { value: 'medium', label: 'Средний' },
  { value: 'dynamic', label: 'Динамичный' },
];

const PRICE_TYPES = [
  { value: 'free', label: 'Бесплатно' },
  { value: 'donation', label: 'Донат' },
  { value: 'fixed', label: 'Фиксированная' },
];

const LOCATION_TYPES = [
  { value: 'public_place', label: 'Парк/Площадь' },
  { value: 'venue', label: 'Студия/Зал' },
  { value: 'route', label: 'Маршрут' },
  { value: 'nature', label: 'Природа' },
];

const formatDateLabel = (d: Date) =>
  d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
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

export default function OrganizerEventCreateScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows, variant } = useTheme();
  const {
    organizerEvents,
    fetchOrganizerEventById,
    createOrganizerEventAsync,
    updateOrganizerEventAsync,
    fetchOrganizerEvents,
    pickedLocation,
    setPickedLocation,
  } = useAppStore();

  const existingEvent = editId ? organizerEvents.find((e) => e.id === editId) : undefined;

  const [didPrefill, setDidPrefill] = useState(false);

  // Wizard step
  const [currentStep, setCurrentStep] = useState(0);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [movementType, setMovementType] = useState('yoga');
  const [level, setLevel] = useState('novice');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationType, setLocationType] = useState<OrganizerLocationType>('public_place');
  const [routeStart, setRouteStart] = useState('');
  const [routeFinish, setRouteFinish] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [capacity, setCapacity] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [priceType, setPriceType] = useState<OrganizerPriceType>('free');
  const [price, setPrice] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [customInviteCode, setCustomInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const yandexKey = String((Constants.expoConfig?.extra as any)?.yandexMapKitApiKey || (Constants.manifest2 as any)?.extra?.expoClient?.extra?.yandexMapKitApiKey || '').trim();
  const yandexGeocoderKey = String(process.env.EXPO_PUBLIC_YANDEX_GEOCODER_API_KEY || yandexKey || '').trim();

  React.useEffect(() => {
    if (!editId) return;

    if (!existingEvent) {
      fetchOrganizerEventById(editId);
      return;
    }

    if (didPrefill) return;

    setTitle(existingEvent.title || '');
    setDescription(existingEvent.description || '');
    setMovementType(existingEvent.movementType || 'yoga');
    setLevel(existingEvent.level || 'novice');

    const start = new Date(existingEvent.startAt);
    setSelectedDate(start);
    setSelectedTime(start);

    setLocationName(existingEvent.locationName || '');
    setLocationAddress(existingEvent.locationAddress || '');
    setLocationType(existingEvent.locationType || 'public_place');

    if ((existingEvent.locationType || 'public_place') === 'route') {
      const addr = String(existingEvent.locationAddress || '');
      const lines = addr
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      for (const line of lines) {
        const mStart = line.match(/^Старт:\s*(.+)$/i);
        if (mStart?.[1]) setRouteStart(mStart[1].trim());
        const mFinish = line.match(/^Финиш:\s*(.+)$/i);
        if (mFinish?.[1]) setRouteFinish(mFinish[1].trim());
      }
    }
    setLocationLat(typeof (existingEvent as any).lat === 'number' ? (existingEvent as any).lat : null);
    setLocationLng(typeof (existingEvent as any).lng === 'number' ? (existingEvent as any).lng : null);

    setCapacity(typeof existingEvent.capacity === 'number' ? String(existingEvent.capacity) : '');
    setDurationMin(existingEvent.durationMin ? String(existingEvent.durationMin) : '60');

    setPriceType(existingEvent.priceType || 'free');
    setPrice(typeof existingEvent.priceValue === 'number' ? String(existingEvent.priceValue) : '');
    setPaymentInstructions(existingEvent.paymentInstructions || '');

    setIsPrivate(existingEvent.visibility === 'private');
    setCustomInviteCode(existingEvent.inviteCode ? String(existingEvent.inviteCode) : '');
    setDidPrefill(true);
  }, [editId, existingEvent, fetchOrganizerEventById, didPrefill]);

  React.useEffect(() => {
    if (!pickedLocation) return;
    setLocationLat(pickedLocation.latitude);
    setLocationLng(pickedLocation.longitude);
    if (pickedLocation.address) {
      setLocationAddress(pickedLocation.address);
    }
    // one-shot: clear after consuming
    setPickedLocation(null);
  }, [pickedLocation, setPickedLocation]);

  if (editId && !existingEvent && !didPrefill) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ fontSize: fontSize.md, color: colors.textMuted, marginTop: 12 }}>
            Загрузка события...
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.accent }}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const openDatePicker = () => {
    const base = selectedDate || new Date();
    setTempDate(base);
    setDatePickerOpen(true);
  };

  const openTimePicker = () => {
    if (!selectedDate) {
      Alert.alert('Сначала выберите дату', 'Чтобы выбрать время, сначала укажите дату события.');
      return;
    }
    const base = selectedTime || new Date();
    setTempTime(base);
    setTimePickerOpen(true);
  };

  // Step validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Основное
        if (!title.trim()) {
          Alert.alert('Ошибка', 'Введите название события');
          return false;
        }
        return true;
      case 1: // Категория и уровень
        return true; // всегда есть дефолты
      case 2: // Дата и время
        if (!selectedDate) {
          Alert.alert('Ошибка', 'Выберите дату события');
          return false;
        }
        if (!selectedTime) {
          Alert.alert('Ошибка', 'Выберите время события');
          return false;
        }
        return true;
      case 3: // Место
        if (!locationName.trim()) {
          Alert.alert('Ошибка', 'Укажите название места');
          return false;
        }
        if (locationType === 'route') {
          if (!routeStart.trim()) {
            Alert.alert('Ошибка', 'Укажите старт маршрута');
            return false;
          }
          if (!routeFinish.trim()) {
            Alert.alert('Ошибка', 'Укажите финиш маршрута');
            return false;
          }
        }
        return true;
      case 4: // Длительность и вместимость
        const dur = parseInt(durationMin);
        if (!dur || dur <= 0) {
          Alert.alert('Ошибка', 'Укажите длительность больше 0');
          return false;
        }
        if (capacity && parseInt(capacity) <= 0) {
          Alert.alert('Ошибка', 'Количество мест должно быть больше 0');
          return false;
        }
        return true;
      case 5: // Стоимость
        if (priceType === 'fixed') {
          const p = parseInt(price);
          if (isNaN(p) || p < 0) {
            Alert.alert('Ошибка', 'Укажите корректную цену');
            return false;
          }
          if (!paymentInstructions.trim()) {
            Alert.alert('Ошибка', 'Укажите инструкцию по оплате');
            return false;
          }
        }
        return true;
      case 6: // Превью — всегда ok
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    
    try {
      const startAt = combineDateTime(selectedDate!, selectedTime!).toISOString();

      const paymentText = paymentInstructions.trim();

      const computedLocationAddress =
        locationType === 'route'
          ? `Старт: ${routeStart.trim()}\nФиниш: ${routeFinish.trim()}`
          : locationAddress.trim();

      const payload = {
        title: title.trim(),
        description: description.trim(),
        movementType,
        level,
        startAt,
        durationMin: parseInt(durationMin) || 60,
        locationName: locationName.trim(),
        locationAddress: computedLocationAddress ? computedLocationAddress : undefined,
        locationType,
        lat: locationLat ?? undefined,
        lng: locationLng ?? undefined,
        capacity: capacity ? parseInt(capacity) : undefined,
        priceType,
        priceValue: priceType === 'fixed' ? parseInt(price) || 0 : undefined,
        paymentInstructions: paymentText ? paymentText : undefined,
        paymentComment: paymentText ? paymentText : undefined,
        paymentInfo: paymentText ? paymentText : undefined,
        visibility: isPrivate ? ('private' as const) : ('public' as const),
        inviteCode: isPrivate && customInviteCode.trim() ? customInviteCode.trim().toUpperCase() : undefined,
      };

      const isEdit = Boolean(editId);

      const updatedOrCreated = isEdit
        ? await updateOrganizerEventAsync(editId!, payload)
        : await createOrganizerEventAsync(payload);

      if (!updatedOrCreated) {
        setLoading(false);
        const state = useAppStore.getState();
        const extra =
          typeof state.organizerError === 'string' && state.organizerError.trim()
            ? `\n\nПричина: ${state.organizerError}`
            : '';
        Alert.alert('Ошибка', (isEdit ? 'Не удалось обновить событие' : 'Не удалось создать событие') + extra);
        return;
      }

      try {
        await fetchOrganizerEvents();
      } catch {
        // ignore
      }
      
      setLoading(false);
      
      Alert.alert(
        editId ? 'Изменения сохранены' : 'Событие создано',
        editId ? 'Событие отправлено на повторную модерацию' : 'Ваше событие отправлено на модерацию',
        [{ text: 'OK', onPress: () => router.replace('/organizer-event/list') }]
      );
    } catch (error) {
      setLoading(false);
      if (error instanceof ApiError) {
        const detail =
          typeof error.data === 'string'
            ? error.data
            : error.data && typeof error.data === 'object' && 'error' in (error.data as any)
              ? String((error.data as any).error)
              : error.message;
        Alert.alert('Ошибка', `HTTP ${error.statusCode}\n${detail}`);
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Ошибка', message || (editId ? 'Не удалось обновить событие' : 'Не удалось создать событие'));
    }
  };

  // Helper to get label by value
  const getLabelByValue = (options: { value: string; label: string }[], val: string) =>
    options.find((o) => o.value === val)?.label || val;

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
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    backIcon: {
      fontSize: fontSize.xl,
      color: colors.text,
    },
    headerTitle: {
      flex: 1,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginRight: 40,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: spacing.md,
      marginTop: spacing.md,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 1.5,
      borderColor: colors.neutralLight,
      fontSize: fontSize.lg,
      color: colors.text,
      marginBottom: spacing.md,
      minHeight: 56,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
      paddingTop: spacing.md,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    pickerField: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 1.5,
      borderColor: colors.neutralLight,
      marginBottom: spacing.md,
      gap: spacing.md,
      minHeight: 72,
    },
    pickerFieldDisabled: {
      opacity: 0.5,
    },
    findOnMapBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.accent,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    findOnMapBtnDisabled: {
      opacity: 0.65,
    },
    findOnMapBtnText: {
      color: colors.white,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
    },
    pickerIconWrap: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerTextWrap: {
      flex: 1,
    },
    pickerLabel: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginBottom: 4,
    },
    pickerValue: {
      fontSize: fontSize.lg,
      color: colors.text,
      fontWeight: fontWeight.bold,
    },
    pickerPlaceholder: {
      color: colors.textMuted,
      fontWeight: fontWeight.medium,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: variant === 'masculine' ? colors.surface : colors.background,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      padding: spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    modalAction: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      backgroundColor: colors.surface,
    },
    modalActionPrimary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    modalActionText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    modalActionTextPrimary: {
      color: colors.white,
    },
    halfInput: {
      flex: 1,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    chip: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.full,
      borderWidth: 1.5,
      borderColor: colors.neutralLight,
      backgroundColor: colors.surface,
      minHeight: 48,
      justifyContent: 'center',
    },
    chipSelected: {
      borderColor: colors.accent,
      borderWidth: 2,
      backgroundColor: colors.accentLight,
    },
    chipText: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: fontWeight.semibold,
    },
    createButton: {
      backgroundColor: colors.accent,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
      ...shadows.md,
    },
    createButtonDisabled: {
      backgroundColor: colors.neutralLight,
    },
    createButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    note: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    // Wizard styles
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      gap: spacing.sm,
    },
    progressDot: {
      width: 10,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.neutral,
    },
    progressDotActive: {
      width: 40,
      backgroundColor: colors.accent,
    },
    progressDotCompleted: {
      backgroundColor: colors.primary,
    },
    stepContent: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    stepTitle: {
      fontSize: 32,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
      letterSpacing: -0.5,
    },
    stepSubtitle: {
      fontSize: fontSize.lg,
      color: colors.textLight,
      marginBottom: spacing.xxl,
      lineHeight: 24,
    },
    footer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
      backgroundColor: colors.background,
    },
    footerButton: {
      flex: 1,
      height: 56,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerButtonBack: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.neutralLight,
    },
    footerButtonNext: {
      backgroundColor: colors.accent,
      ...shadows.lg,
    },
    footerButtonDisabled: {
      backgroundColor: colors.neutralLight,
      opacity: 0.6,
    },
    footerButtonText: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
    },
    footerButtonTextBack: {
      color: colors.text,
    },
    footerButtonTextNext: {
      color: colors.white,
    },
    // Preview styles
    previewCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutralLight,
    },
    previewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    previewLabel: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      flex: 1,
    },
    previewValue: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: fontWeight.semibold,
      flex: 2,
      textAlign: 'right',
    },
    previewDivider: {
      height: 1,
      backgroundColor: colors.neutralLight,
      marginVertical: spacing.lg,
    },
  });

  const ChipSelect = ({
    options,
    value,
    onChange,
  }: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
  }) => (
    <View style={styles.chipContainer}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, value === opt.value && styles.chipSelected]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={styles.chipText}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Progress indicator
  const renderProgress = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            i === currentStep && styles.progressDotActive,
            i < currentStep && styles.progressDotCompleted,
          ]}
        />
      ))}
    </View>
  );

  // Step 0: Основное
  const renderStep0 = () => (
    <View>
      <Text style={styles.stepTitle}>Название и описание</Text>
      <Text style={styles.stepSubtitle}>Как называется ваше событие?</Text>
      <TextInput
        style={styles.input}
        placeholder="Название события"
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Описание (необязательно)"
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />
    </View>
  );

  // Step 1: Категория и уровень
  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Категория</Text>
      <Text style={styles.stepSubtitle}>Выберите тип активности и уровень</Text>
      <Text style={styles.sectionTitle}>ТИП ДВИЖЕНИЯ</Text>
      <ChipSelect
        options={MOVEMENT_TYPES}
        value={movementType}
        onChange={setMovementType}
      />
      <Text style={styles.sectionTitle}>УРОВЕНЬ</Text>
      <ChipSelect options={LEVELS} value={level} onChange={setLevel} />
    </View>
  );

  // Step 2: Дата и время
  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Дата и время</Text>
      <Text style={styles.stepSubtitle}>Когда состоится событие?</Text>
      <TouchableOpacity
        style={styles.pickerField}
        onPress={openDatePicker}
        activeOpacity={0.85}
      >
        <View style={styles.pickerIconWrap}>
          <Ionicons name="calendar-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.pickerTextWrap}>
          <Text style={styles.pickerLabel}>Дата</Text>
          <Text
            style={[
              styles.pickerValue,
              !selectedDate && styles.pickerPlaceholder,
            ]}
            numberOfLines={1}
          >
            {selectedDate ? formatDateLabel(selectedDate) : 'Выберите дату'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pickerField, !selectedDate && styles.pickerFieldDisabled]}
        onPress={openTimePicker}
        activeOpacity={0.85}
      >
        <View style={styles.pickerIconWrap}>
          <Ionicons name="time-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.pickerTextWrap}>
          <Text style={styles.pickerLabel}>Время</Text>
          <Text
            style={[
              styles.pickerValue,
              !selectedTime && styles.pickerPlaceholder,
            ]}
            numberOfLines={1}
          >
            {selectedTime ? formatTimeLabel(selectedTime) : 'Выберите время'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  // Step 3: Место
  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Место проведения</Text>
      <Text style={styles.stepSubtitle}>Где будет проходить событие?</Text>
      <Text style={styles.sectionTitle}>ТИП МЕСТА</Text>
      <ChipSelect
        options={LOCATION_TYPES}
        value={locationType}
        onChange={(v) => setLocationType(v as OrganizerLocationType)}
      />
      <TextInput
        style={styles.input}
        placeholder="Название места (напр. Парк Горького)"
        placeholderTextColor={colors.textMuted}
        value={locationName}
        onChangeText={setLocationName}
      />

      {locationType === 'route' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Старт маршрута"
            placeholderTextColor={colors.textMuted}
            value={routeStart}
            onChangeText={setRouteStart}
          />
          <TextInput
            style={styles.input}
            placeholder="Финиш маршрута"
            placeholderTextColor={colors.textMuted}
            value={routeFinish}
            onChangeText={setRouteFinish}
          />
        </>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Адрес (необязательно)"
        placeholderTextColor={colors.textMuted}
        value={locationAddress}
        onChangeText={setLocationAddress}
      />

      <TouchableOpacity
        style={[styles.findOnMapBtn, geocoding && styles.findOnMapBtnDisabled]}
        disabled={geocoding}
        activeOpacity={0.9}
        onPress={async () => {
          const q = `${locationName || ''} ${locationAddress || ''}`.trim();
          if (!q) {
            Alert.alert('Адрес', 'Введите название места или адрес, чтобы найти на карте.');
            return;
          }
          setGeocoding(true);
          try {
            let lat = NaN;
            let lon = NaN;
            let effectiveQuery = q;

            if (yandexGeocoderKey) {
              const yandexUrl = `https://geocode-maps.yandex.ru/v1/?apikey=${encodeURIComponent(
                yandexGeocoderKey
              )}&format=json&lang=ru_RU&geocode=${encodeURIComponent(q)}&results=1`;
              const yandexRes = await fetch(yandexUrl, {
                headers: {
                  Accept: 'application/json',
                },
              });
              const yandexJson = (await yandexRes.json()) as any;
              const member = yandexJson?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
              const pos = typeof member?.Point?.pos === 'string' ? member.Point.pos.trim() : '';
              const [lonStr, latStr] = pos.split(/\s+/);
              lat = Number(latStr);
              lon = Number(lonStr);
              if (typeof member?.metaDataProperty?.GeocoderMetaData?.text === 'string') {
                effectiveQuery = member.metaDataProperty.GeocoderMetaData.text;
              }
            }

            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
              const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
              const res = await fetch(url, {
                headers: {
                  Accept: 'application/json',
                  'Accept-Language': 'ru',
                },
              });
              const json = (await res.json()) as any[];
              const item = Array.isArray(json) ? json[0] : null;
              lat = item?.lat ? Number(item.lat) : NaN;
              lon = item?.lon ? Number(item.lon) : NaN;
              if (typeof item?.display_name === 'string' && item.display_name.trim()) {
                effectiveQuery = item.display_name.trim();
              }
            }

            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
              Alert.alert('Не найдено', 'Не удалось найти этот адрес. Попробуйте уточнить.');
              return;
            }

            setLocationLat(lat);
            setLocationLng(lon);
            setLocationAddress(effectiveQuery);
            router.push(`/map?mode=pick&centerLat=${lat}&centerLng=${lon}&query=${encodeURIComponent(effectiveQuery)}`);
          } catch (e) {
            Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось найти адрес');
          } finally {
            setGeocoding(false);
          }
        }}
      >
        <Ionicons name="search" size={18} color={colors.white} />
        <Text style={styles.findOnMapBtnText}>{geocoding ? 'Поиск…' : 'Найти на карте по адресу'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.pickerField}
        onPress={() => {
          const q = `${locationName || ''} ${locationAddress || ''}`.trim();
          router.push(q ? `/map?mode=pick&query=${encodeURIComponent(q)}` : '/map?mode=pick');
        }}
        activeOpacity={0.85}
      >
        <View style={styles.pickerIconWrap}>
          <Ionicons name="map-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.pickerTextWrap}>
          <Text style={styles.pickerLabel}>Координаты</Text>
          <Text
            style={[
              styles.pickerValue,
              (!locationLat || !locationLng) && styles.pickerPlaceholder,
            ]}
            numberOfLines={1}
          >
            {typeof locationLat === 'number' && typeof locationLng === 'number'
              ? locationAddress.trim()
                ? locationAddress.trim()
                : `${locationLat.toFixed(6)}, ${locationLng.toFixed(6)}`
              : 'Выбрать на карте'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  // Step 4: Длительность, вместимость и приватность
  const renderStep4 = () => (
    <View>
      <Text style={styles.stepTitle}>Детали события</Text>
      <Text style={styles.stepSubtitle}>Длительность и количество участников</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Длительность (мин)"
          placeholderTextColor={colors.textMuted}
          value={durationMin}
          onChangeText={setDurationMin}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Мест (пусто = ∞)"
          placeholderTextColor={colors.textMuted}
          value={capacity}
          onChangeText={setCapacity}
          keyboardType="number-pad"
        />
      </View>

      {/* Private event toggle */}
      <Text style={styles.sectionTitle}>ДОСТУП</Text>
      <TouchableOpacity
        style={[
          styles.pickerField,
          isPrivate && { borderColor: colors.accent, borderWidth: 2 },
        ]}
        onPress={() => setIsPrivate(!isPrivate)}
        activeOpacity={0.85}
      >
        <View style={[styles.pickerIconWrap, isPrivate && { backgroundColor: colors.accentLight }]}>
          <Ionicons name={isPrivate ? 'lock-closed' : 'globe-outline'} size={20} color={isPrivate ? colors.accent : colors.textMuted} />
        </View>
        <View style={styles.pickerTextWrap}>
          <Text style={styles.pickerLabel}>Тип события</Text>
          <Text style={styles.pickerValue}>
            {isPrivate ? 'Приватное' : 'Публичное'}
          </Text>
        </View>
        <View style={{
          width: 50,
          height: 28,
          borderRadius: 14,
          backgroundColor: isPrivate ? colors.accent : colors.neutralMuted,
          justifyContent: 'center',
          paddingHorizontal: 2,
        }}>
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.white,
            alignSelf: isPrivate ? 'flex-end' : 'flex-start',
          }} />
        </View>
      </TouchableOpacity>

      {isPrivate && (
        <>
          <Text style={[styles.note, { textAlign: 'left', marginTop: 0, marginBottom: spacing.md }]}>
            🔒 Приватное событие не отображается в общем списке. Доступ только по коду или ссылке.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Свой код (необязательно)"
            placeholderTextColor={colors.textMuted}
            value={customInviteCode}
            onChangeText={(t) => setCustomInviteCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={10}
          />
          <Text style={[styles.note, { textAlign: 'left', marginTop: 0 }]}>
            Оставьте пустым — код сгенерируется автоматически
          </Text>
        </>
      )}
    </View>
  );

  // Step 5: Стоимость
  const renderStep5 = () => (
    <View>
      <Text style={styles.stepTitle}>Стоимость</Text>
      <Text style={styles.stepSubtitle}>Укажите формат оплаты</Text>
      <ChipSelect
        options={PRICE_TYPES}
        value={priceType}
        onChange={(v) => setPriceType(v as OrganizerPriceType)}
      />
      {priceType === 'fixed' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Цена (₽)"
            placeholderTextColor={colors.textMuted}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Инструкция по оплате"
            placeholderTextColor={colors.textMuted}
            value={paymentInstructions}
            onChangeText={setPaymentInstructions}
            multiline
          />
        </>
      )}
    </View>
  );

  // Step 6: Превью
  const renderStep6 = () => (
    <View>
      <Text style={styles.stepTitle}>Проверьте данные</Text>
      <Text style={styles.stepSubtitle}>Убедитесь, что всё верно</Text>
      
      <View style={styles.previewCard}>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Название</Text>
          <Text style={styles.previewValue}>{title}</Text>
        </View>
        {description ? (
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Описание</Text>
            <Text style={styles.previewValue} numberOfLines={2}>{description}</Text>
          </View>
        ) : null}
        <View style={styles.previewDivider} />
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Категория</Text>
          <Text style={styles.previewValue}>{getLabelByValue(MOVEMENT_TYPES, movementType)}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Уровень</Text>
          <Text style={styles.previewValue}>{getLabelByValue(LEVELS, level)}</Text>
        </View>
        <View style={styles.previewDivider} />
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Дата</Text>
          <Text style={styles.previewValue}>{selectedDate ? formatDateLabel(selectedDate) : '—'}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Время</Text>
          <Text style={styles.previewValue}>{selectedTime ? formatTimeLabel(selectedTime) : '—'}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Длительность</Text>
          <Text style={styles.previewValue}>{durationMin} мин</Text>
        </View>
        <View style={styles.previewDivider} />
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Место</Text>
          <Text style={styles.previewValue}>{locationName}</Text>
        </View>
        {locationAddress ? (
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Адрес</Text>
            <Text style={styles.previewValue}>{locationAddress}</Text>
          </View>
        ) : null}
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Тип места</Text>
          <Text style={styles.previewValue}>{getLabelByValue(LOCATION_TYPES, locationType)}</Text>
        </View>
        <View style={styles.previewDivider} />
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Вместимость</Text>
          <Text style={styles.previewValue}>{capacity || '∞'}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Стоимость</Text>
          <Text style={styles.previewValue}>
            {priceType === 'free' ? 'Бесплатно' : priceType === 'donation' ? 'Донат' : `${price} ₽`}
          </Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Доступ</Text>
          <Text style={styles.previewValue}>
            {isPrivate ? `🔒 Приватное${customInviteCode ? ` (код: ${customInviteCode})` : ''}` : '🌍 Публичное'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.note}>
        После создания событие будет отправлено на модерацию
      </Text>
    </View>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return null;
    }
  };

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{STEP_TITLES[currentStep]}</Text>
      </View>

      {renderProgress()}

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.stepContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[styles.footerButton, styles.footerButtonBack]}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Text style={[styles.footerButtonText, styles.footerButtonTextBack]}>Назад</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.footerButton, 
              styles.footerButtonNext,
              loading && styles.footerButtonDisabled,
              currentStep === 0 && { flex: 2 },
            ]}
            onPress={isLastStep ? handleCreate : handleNext}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={[styles.footerButtonText, styles.footerButtonTextNext]}>
              {loading ? 'Создание...' : isLastStep ? 'Создать событие' : 'Далее'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Date picker */}
      {Platform.OS === 'android' ? (
        datePickerOpen ? (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            onChange={(e, d) => {
              setDatePickerOpen(false);
              if (d) {
                setTempDate(d);
                setSelectedDate(d);
              }
            }}
            minimumDate={new Date()}
          />
        ) : null
      ) : (
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
                display="inline"
                themeVariant={isDarkTheme(variant) ? 'dark' : 'light'}
                textColor={colors.text}
                accentColor={colors.accent}
                onChange={(e, d) => {
                  if (d) setTempDate(d);
                }}
                minimumDate={new Date()}
              />

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
            </View>
          </View>
        </Modal>
      )}

      {/* Time picker */}
      {Platform.OS === 'android' ? (
        timePickerOpen ? (
          <DateTimePicker
            value={tempTime}
            mode="time"
            display="default"
            is24Hour
            onChange={(e, d) => {
              setTimePickerOpen(false);
              if (d) {
                setTempTime(d);
                setSelectedTime(d);
              }
            }}
          />
        ) : null
      ) : (
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
                display="spinner"
                is24Hour
                themeVariant={isDarkTheme(variant) ? 'dark' : 'light'}
                textColor={colors.text}
                accentColor={colors.accent}
                onChange={(e, d) => {
                  if (d) setTempTime(d);
                }}
              />

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
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
