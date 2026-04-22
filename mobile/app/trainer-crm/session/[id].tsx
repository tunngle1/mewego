import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { api } from '../../../src/services/api';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { TrainerCrmClient, TrainerCrmSession, TrainerCrmSessionParticipant } from '../../../src/types';
import { isDarkTheme } from '../../../src/constants/themes';

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMoney = (amountMinor?: number | null) => `${((amountMinor || 0) / 100).toLocaleString('ru-RU')} ₽`;

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

export default function TrainerCrmSessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows, variant } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [updatingParticipantId, setUpdatingParticipantId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [session, setSession] = useState<TrainerCrmSession | null>(null);
  const [participants, setParticipants] = useState<TrainerCrmSessionParticipant[]>([]);
  const [clients, setClients] = useState<TrainerCrmClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<TrainerCrmClient | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [duplicateShiftDays, setDuplicateShiftDays] = useState('7');
  const [rescheduleDurationMin, setRescheduleDurationMin] = useState('60');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [participantName, setParticipantName] = useState('');
  const [participantPhone, setParticipantPhone] = useState('');
  const [participantPrice, setParticipantPrice] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!id) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const [sessionData, participantsData, clientsData] = await Promise.all([
        api.getTrainerCrmSession(id),
        api.getTrainerCrmSessionParticipants(id),
        api.getTrainerCrmClients({ limit: 100, archived: false }),
      ]);
      setSession(sessionData);
      setParticipants(participantsData);
      setClients(clientsData.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить сессию');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handlePublish = async () => {
    if (!id) return;
    try {
      setPublishing(true);
      const updated = await api.publishTrainerCrmSession(id);
      setSession(updated);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось опубликовать сессию');
    } finally {
      setPublishing(false);
    }
  };

  const openRescheduleModal = useCallback(() => {
    if (!session) return;
    const sessionStart = new Date(session.startAt);
    setSelectedDate(sessionStart);
    setSelectedTime(sessionStart);
    setTempDate(sessionStart);
    setTempTime(sessionStart);
    setRescheduleDurationMin(String(session.durationMin || 60));
    setRescheduleModalOpen(true);
  }, [session]);

  const handleCancelSession = async () => {
    if (!id) return;
    try {
      setCancelling(true);
      const updated = await api.cancelTrainerCrmSession(id, cancelReason.trim() || undefined);
      setSession(updated);
      setCancelModalOpen(false);
      setCancelReason('');
      await loadData(true);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось отменить сессию');
    } finally {
      setCancelling(false);
    }
  };

  const handleRescheduleSession = async () => {
    if (!id || !selectedDate || !selectedTime) {
      Alert.alert('Нужны дата и время', 'Выбери новую дату и время начала.');
      return;
    }

    try {
      setRescheduling(true);
      const durationMin = Math.max(15, Number(rescheduleDurationMin) || session?.durationMin || 60);
      const startAt = combineDateTime(selectedDate, selectedTime).toISOString();
      const updated = await api.rescheduleTrainerCrmSession(id, {
        startAt,
        durationMin,
      });
      setSession(updated);
      setRescheduleModalOpen(false);
      await loadData(true);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось перенести сессию');
    } finally {
      setRescheduling(false);
    }
  };

  const handleDuplicateSession = async () => {
    if (!id) return;

    try {
      setDuplicating(true);
      const duplicated = await api.duplicateTrainerCrmSession(id, {
        shiftDays: Math.max(1, Number(duplicateShiftDays) || 7),
      });
      setDuplicateModalOpen(false);
      setDuplicateShiftDays('7');
      router.push(`/trainer-crm/session/${duplicated.id}`);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось продублировать сессию');
    } finally {
      setDuplicating(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!id || (!selectedClient && !participantName.trim())) {
      Alert.alert('Нужен участник', 'Укажи имя клиента/участника.');
      return;
    }

    try {
      setAddingParticipant(true);
      const created = await api.createTrainerCrmSessionParticipant(id, {
        clientId: selectedClient?.id,
        userId: selectedClient?.userId || undefined,
        fullName: selectedClient?.fullName || participantName.trim(),
        phone: selectedClient?.phone || participantPhone.trim() || undefined,
        telegramHandle: selectedClient?.telegramHandle || undefined,
        email: selectedClient?.email || undefined,
        status: 'booked',
        paymentStatus: Number(participantPrice) > 0 ? 'unpaid' : 'waived',
        priceMinor: Math.max(0, Number(participantPrice) || 0) * 100,
        amountPaidMinor: 0,
      });
      setParticipants((current) => {
        const existingIndex = current.findIndex((item) => item.id === created.id);
        if (existingIndex === -1) {
          return [...current, created];
        }

        const next = [...current];
        next[existingIndex] = created;
        return next;
      });
      setSelectedClient(null);
      setClientSearch('');
      setParticipantName('');
      setParticipantPhone('');
      setParticipantPrice('0');
      await loadData(true);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось добавить участника');
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleStatusUpdate = async (participantId: string, status: 'confirmed' | 'attended' | 'cancelled' | 'no_show') => {
    try {
      setUpdatingParticipantId(participantId);
      const updated = await api.updateTrainerCrmParticipant(participantId, { status });
      setParticipants((current) => current.map((item) => (item.id === participantId ? updated : item)));
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось изменить статус участника');
    } finally {
      setUpdatingParticipantId(null);
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
    headerWrap: {
      flex: 1,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    subtitle: {
      marginTop: spacing.xs,
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl * 2,
      gap: spacing.lg,
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
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sessionTitle: {
      flex: 1,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    cardTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    meta: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      lineHeight: 18,
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
    helperText: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      lineHeight: 18,
    },
    clientList: {
      gap: spacing.sm,
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
    clientPickCard: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    clientPickCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    clientPickName: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
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
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    modalTitle: {
      flex: 1,
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
    participantCard: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.sm,
      gap: spacing.sm,
    },
    participantName: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    buttonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    miniButton: {
      minWidth: 120,
    },
    operationButton: {
      flex: 1,
      minWidth: 140,
    },
    errorText: {
      color: colors.accent,
      fontSize: fontSize.sm,
      lineHeight: 20,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  const filteredClients = clients.filter((client) => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [client.fullName, client.phone, client.email, client.telegramHandle]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const alreadyAddedClientIds = new Set(participants.map((item) => item.clientId).filter(Boolean));

  if (loading && !session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>{session?.title || 'Сессия'}</Text>
          <Text style={styles.subtitle}>Участники и управление статусами</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {session ? (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.sessionTitle}>{session.title}</Text>
              <Badge label={session.status} variant={session.status === 'completed' ? 'success' : session.status.includes('cancelled') ? 'accent' : 'warning'} size="sm" />
            </View>
            <Text style={styles.meta}>{formatDateTime(session.startAt)} · {session.type === 'personal' ? 'Персональная' : 'Групповая'}</Text>
            <Text style={styles.meta}>Локация: {session.locationName || session.onlineUrl || 'Не указана'}</Text>
            <Text style={styles.meta}>Стоимость для учёта: {formatMoney(session.priceMinor)} · Участников: {participants.length}</Text>
            {session.linkedEventId ? <Text style={styles.meta}>Публикация связана с Event #{session.linkedEventId}</Text> : null}
            <View style={styles.buttonGrid}>
              <Button title="Перенести" onPress={openRescheduleModal} loading={rescheduling} variant="outline" size="sm" style={styles.operationButton} />
              <Button title="Дублировать" onPress={() => setDuplicateModalOpen(true)} loading={duplicating} variant="outline" size="sm" style={styles.operationButton} />
              {!session.status.includes('cancelled') ? (
                <Button title="Отменить" onPress={() => setCancelModalOpen(true)} loading={cancelling} variant="outline" size="sm" style={styles.operationButton} />
              ) : null}
              {!session.linkedEventId && session.visibility !== 'crm_only' ? (
                <Button title="Опубликовать в events" onPress={handlePublish} loading={publishing} variant="accent" size="sm" style={styles.operationButton} />
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Добавить участника</Text>
          <TouchableOpacity style={styles.pickerButton} activeOpacity={0.8} onPress={() => setClientPickerOpen(true)}>
            <Text style={styles.clientPickName}>{selectedClient ? selectedClient.fullName : 'Выбрать готового участника'}</Text>
            <Text style={styles.meta}>{selectedClient ? selectedClient.phone || selectedClient.email || selectedClient.telegramHandle || 'Контакт не указан' : 'Откроется всплывающий список клиентов CRM'}</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>Выбери клиента из CRM во всплывающем списке. Если его ещё нет, можно добавить вручную ниже.</Text>
          {selectedClient ? (
            <Text style={styles.helperText}>Будет добавлен клиент: {selectedClient.fullName}</Text>
          ) : null}
          <TextInput value={participantName} onChangeText={setParticipantName} style={styles.input} placeholder="Имя клиента" placeholderTextColor={colors.textMuted} />
          <TextInput value={participantPhone} onChangeText={setParticipantPhone} style={styles.input} placeholder="Телефон" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
          <TextInput value={participantPrice} onChangeText={setParticipantPrice} style={styles.input} placeholder="Стоимость для учёта, ₽" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
          <Text style={styles.helperText}>Оплата принимается лично тренеру. Здесь CRM хранит только договорённую сумму и отметку расчёта.</Text>
          <Button title={selectedClient ? 'Добавить выбранного клиента' : 'Добавить участника'} onPress={handleAddParticipant} loading={addingParticipant} variant="accent" />
        </View>

        <Modal visible={clientPickerOpen} transparent animationType="slide" onRequestClose={() => setClientPickerOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Выбрать участника из CRM</Text>
                <TouchableOpacity onPress={() => setClientPickerOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
              <TextInput value={clientSearch} onChangeText={setClientSearch} style={styles.input} placeholder="Поиск по имени, телефону, email" placeholderTextColor={colors.textMuted} />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.clientList}>
                {filteredClients.length ? (
                  filteredClients.map((client) => {
                    const isSelected = selectedClient?.id === client.id;
                    const isAlreadyAdded = alreadyAddedClientIds.has(client.id);

                    return (
                      <TouchableOpacity
                        key={client.id}
                        style={[styles.clientPickCard, isSelected && styles.clientPickCardSelected]}
                        activeOpacity={0.8}
                        disabled={isAlreadyAdded}
                        onPress={() => {
                          if (isAlreadyAdded) return;
                          setSelectedClient(client);
                          setParticipantName(client.fullName);
                          setParticipantPhone(client.phone || '');
                          setClientPickerOpen(false);
                        }}
                      >
                        <View style={styles.rowBetween}>
                          <Text style={styles.clientPickName}>{client.fullName}</Text>
                          {isAlreadyAdded ? <Badge label="Уже в сессии" variant="default" size="sm" /> : isSelected ? <Badge label="Выбран" variant="success" size="sm" /> : null}
                        </View>
                        <Text style={styles.meta}>{client.phone || client.email || client.telegramHandle || 'Контакт не указан'}</Text>
                        <Text style={styles.meta}>Сессий: {client.sessionsCompletedCount} · LTV: {formatMoney(client.lifetimeValueMinor)}</Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.helperText}>Подходящих клиентов не найдено.</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={cancelModalOpen} transparent animationType="slide" onRequestClose={() => setCancelModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Отменить сессию</Text>
                <TouchableOpacity onPress={() => setCancelModalOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
              <TextInput value={cancelReason} onChangeText={setCancelReason} style={styles.input} placeholder="Причина отмены" placeholderTextColor={colors.textMuted} />
              <Text style={styles.helperText}>Сессия будет переведена в отменённую, а активные записи участников будут отменены сервером.</Text>
              <Button title="Подтвердить отмену" onPress={handleCancelSession} loading={cancelling} variant="accent" />
            </View>
          </View>
        </Modal>

        <Modal visible={duplicateModalOpen} transparent animationType="slide" onRequestClose={() => setDuplicateModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Дублировать сессию</Text>
                <TouchableOpacity onPress={() => setDuplicateModalOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
              <TextInput value={duplicateShiftDays} onChangeText={setDuplicateShiftDays} style={styles.input} placeholder="Сдвиг в днях" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
              <Text style={styles.helperText}>Новая сессия будет создана с теми же параметрами и сдвигом по дате.</Text>
              <Button title="Создать копию" onPress={handleDuplicateSession} loading={duplicating} variant="accent" />
            </View>
          </View>
        </Modal>

        <Modal visible={rescheduleModalOpen} transparent animationType="slide" onRequestClose={() => setRescheduleModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Перенести сессию</Text>
                <TouchableOpacity onPress={() => setRescheduleModalOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.pickerButton} activeOpacity={0.8} onPress={() => setDatePickerOpen(true)}>
                <Text style={styles.pickerValue}>{selectedDate ? formatDateLabel(selectedDate) : 'Выбрать дату'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerButton} activeOpacity={0.8} onPress={() => setTimePickerOpen(true)}>
                <Text style={styles.pickerValue}>{selectedTime ? formatTimeLabel(selectedTime) : 'Выбрать время'}</Text>
              </TouchableOpacity>
              <TextInput value={rescheduleDurationMin} onChangeText={setRescheduleDurationMin} style={styles.input} placeholder="Длительность, мин" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
              <Button title="Сохранить перенос" onPress={handleRescheduleSession} loading={rescheduling} variant="accent" />
            </View>
          </View>
        </Modal>

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
                onChange={(_e, nextDate) => {
                  if (!nextDate) {
                    if (Platform.OS !== 'ios') setDatePickerOpen(false);
                    return;
                  }
                  setTempDate(nextDate);
                  if (Platform.OS !== 'ios') {
                    setSelectedDate(nextDate);
                    setDatePickerOpen(false);
                  }
                }}
                minimumDate={new Date()}
              />
              {Platform.OS === 'ios' ? (
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
              ) : null}
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
                onChange={(_e, nextTime) => {
                  if (!nextTime) {
                    if (Platform.OS !== 'ios') setTimePickerOpen(false);
                    return;
                  }
                  setTempTime(nextTime);
                  if (Platform.OS !== 'ios') {
                    setSelectedTime(nextTime);
                    setTimePickerOpen(false);
                  }
                }}
              />
              {Platform.OS === 'ios' ? (
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
              ) : null}
            </View>
          </View>
        </Modal>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Участники</Text>
          {participants.length ? (
            participants.map((participant) => (
              <View key={participant.id} style={styles.participantCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.participantName}>{participant.client?.fullName || participant.user?.name || 'Участник'}</Text>
                  <Badge label={participant.status} variant={participant.status === 'attended' ? 'success' : participant.status === 'cancelled' || participant.status === 'late_cancelled' || participant.status === 'no_show' ? 'accent' : 'default'} size="sm" />
                </View>
                <Text style={styles.meta}>Расчёт: {participant.paymentStatus} · Стоимость: {formatMoney(participant.priceMinor)}</Text>
                <Text style={styles.meta}>Отмечено: {formatMoney(participant.amountPaidMinor)} · Записан: {formatDateTime(participant.bookedAt)}</Text>
                <View style={styles.buttonGrid}>
                  <Button title="Подтвердить" onPress={() => handleStatusUpdate(participant.id, 'confirmed')} variant="outline" size="sm" style={styles.miniButton} loading={updatingParticipantId === participant.id} />
                  <Button title="Был" onPress={() => handleStatusUpdate(participant.id, 'attended')} variant="outline" size="sm" style={styles.miniButton} loading={updatingParticipantId === participant.id} />
                  <Button title="Отмена" onPress={() => handleStatusUpdate(participant.id, 'cancelled')} variant="outline" size="sm" style={styles.miniButton} loading={updatingParticipantId === participant.id} />
                  <Button title="Не пришёл" onPress={() => handleStatusUpdate(participant.id, 'no_show')} variant="outline" size="sm" style={styles.miniButton} loading={updatingParticipantId === participant.id} />
                </View>
              </View>
            ))
          ) : (
            <EmptyState icon="👥" title="Участников пока нет" description="Добавь первого участника выше, чтобы отслеживать запись, расчёт и посещение." />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
