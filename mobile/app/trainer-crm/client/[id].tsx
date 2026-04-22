import React, { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { api } from '../../../src/services/api';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { TrainerCrmClient, TrainerCrmClientHistory, TrainerCrmPackage } from '../../../src/types';

const statusLabel: Record<string, string> = {
  lead: 'Лид',
  active: 'Активен',
  inactive: 'Неактивен',
  paused: 'Пауза',
  archived: 'Архив',
};

const formatMoney = (amountMinor: number) => `${(amountMinor / 100).toLocaleString('ru-RU')} ₽`;
const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const packageStatusLabel: Record<string, string> = {
  draft: 'Черновик',
  active: 'Активен',
  paused: 'На паузе',
  expired: 'Истёк',
  cancelled: 'Отменён',
  completed: 'Завершён',
};

export default function TrainerCrmClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingPackage, setSavingPackage] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [archivingClient, setArchivingClient] = useState(false);
  const [restoringClient, setRestoringClient] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [packageActionId, setPackageActionId] = useState<string | null>(null);
  const [consumeModalOpen, setConsumeModalOpen] = useState(false);
  const [packageToConsume, setPackageToConsume] = useState<TrainerCrmPackage | null>(null);
  const [selectedHistoryParticipantId, setSelectedHistoryParticipantId] = useState<string | null>(null);
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState<string | null>(null);
  const [consumeUnits, setConsumeUnits] = useState('1');
  const [client, setClient] = useState<TrainerCrmClient | null>(null);
  const [history, setHistory] = useState<TrainerCrmClientHistory | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [packageTitle, setPackageTitle] = useState('');
  const [packageSessions, setPackageSessions] = useState('8');
  const [packagePrice, setPackagePrice] = useState('0');
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTelegramHandle, setEditTelegramHandle] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editStatus, setEditStatus] = useState<TrainerCrmClient['status']>('active');
  const [editGoals, setEditGoals] = useState('');
  const [editMedicalNotes, setEditMedicalNotes] = useState('');
  const [editPrivateNotes, setEditPrivateNotes] = useState('');
  const [editTags, setEditTags] = useState('');
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
      const [clientData, historyData] = await Promise.all([
        api.getTrainerCrmClient(id),
        api.getTrainerCrmClientHistory(id),
      ]);
      setClient(clientData);
      setHistory(historyData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить клиента');
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

  const handleSaveNote = async () => {
    if (!id || !noteContent.trim()) {
      Alert.alert('Нужен текст', 'Заполни заметку, чтобы сохранить её в CRM.');
      return;
    }
    try {
      setSavingNote(true);
      await api.createTrainerCrmClientNote(id, {
        title: noteTitle.trim() || undefined,
        content: noteContent.trim(),
        type: 'general',
      });
      setNoteTitle('');
      setNoteContent('');
      await loadData(true);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось сохранить заметку');
    } finally {
      setSavingNote(false);
    }
  };

  const handleCreatePackage = async () => {
    if (!id || !packageTitle.trim()) {
      Alert.alert('Нужен пакет', 'Укажи название пакета, чтобы сохранить его.');
      return;
    }
    try {
      setSavingPackage(true);
      const sessionsIncluded = Math.max(1, Number(packageSessions) || 1);
      const priceMinor = Math.max(0, Number(packagePrice) || 0) * 100;
      await api.createTrainerCrmPackage({
        clientId: id,
        title: packageTitle.trim(),
        kind: 'package',
        sessionsIncluded,
        sessionsRemaining: sessionsIncluded,
        priceMinor,
        status: 'active',
        paymentStatus: priceMinor > 0 ? 'unpaid' : 'waived',
      });
      setPackageTitle('');
      setPackageSessions('8');
      setPackagePrice('0');
      await loadData(true);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось создать пакет');
    } finally {
      setSavingPackage(false);
    }
  };

  const runPackageAction = async (pkgId: string, action: 'pause' | 'resume' | 'expire') => {
    try {
      setPackageActionId(pkgId);
      if (action === 'pause') {
        await api.pauseTrainerCrmPackage(pkgId);
      } else if (action === 'resume') {
        await api.resumeTrainerCrmPackage(pkgId);
      } else {
        await api.expireTrainerCrmPackage(pkgId);
      }
      await loadData(true);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось обновить пакет');
    } finally {
      setPackageActionId(null);
    }
  };

  const openConsumeModal = (pkg: TrainerCrmPackage) => {
    const firstHistorySession = history?.sessions.find((item) => item.session?.id);
    if (!firstHistorySession?.session?.id) {
      Alert.alert('Нет подходящей сессии', 'Для списания нужен участник, привязанный к сессии этого клиента.');
      return;
    }

    setPackageToConsume(pkg);
    setSelectedHistoryParticipantId(firstHistorySession.id);
    setSelectedHistorySessionId(firstHistorySession.session.id);
    setConsumeUnits('1');
    setConsumeModalOpen(true);
  };

  const handleConsumePackage = async () => {
    if (!packageToConsume || !selectedHistoryParticipantId || !selectedHistorySessionId) {
      Alert.alert('Нужна сессия', 'Выбери сессию клиента, для которой нужно списать пакет.');
      return;
    }

    try {
      setPackageActionId(packageToConsume.id);
      await api.consumeTrainerCrmPackage(packageToConsume.id, {
        sessionId: selectedHistorySessionId,
        participantId: selectedHistoryParticipantId,
        usedUnits: Math.max(1, Number(consumeUnits) || 1),
      });
      setConsumeModalOpen(false);
      setPackageToConsume(null);
      await loadData(true);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось списать пакет');
    } finally {
      setPackageActionId(null);
    }
  };

  const openEditModal = () => {
    if (!client) return;
    setEditFullName(client.fullName);
    setEditPhone(client.phone || '');
    setEditTelegramHandle(client.telegramHandle || '');
    setEditEmail(client.email || '');
    setEditCity(client.city || '');
    setEditStatus(client.status);
    setEditGoals(client.goals || '');
    setEditMedicalNotes(client.medicalNotes || '');
    setEditPrivateNotes(client.privateNotes || '');
    setEditTags(client.tags.join(', '));
    setEditModalOpen(true);
  };

  const handleSaveClient = async () => {
    if (!id || !editFullName.trim()) {
      Alert.alert('Нужно имя', 'Укажи имя клиента.');
      return;
    }

    try {
      setSavingClient(true);
      const updated = await api.updateTrainerCrmClient(id, {
        fullName: editFullName.trim(),
        phone: editPhone.trim() || null,
        telegramHandle: editTelegramHandle.trim() || null,
        email: editEmail.trim() || null,
        city: editCity.trim() || null,
        status: editStatus,
        goals: editGoals.trim() || null,
        medicalNotes: editMedicalNotes.trim() || null,
        privateNotes: editPrivateNotes.trim() || null,
        tags: editTags.split(',').map((item) => item.trim()).filter(Boolean),
      });
      setEditModalOpen(false);
      if (updated.status === 'archived') {
        router.replace('/trainer-crm/clients?tab=archived');
        return;
      }
      await loadData(true);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось обновить клиента');
    } finally {
      setSavingClient(false);
    }
  };

  const handleArchiveClient = async () => {
    if (!id) return;
    try {
      setArchivingClient(true);
      await api.archiveTrainerCrmClient(id);
      router.replace('/trainer-crm/clients?tab=archived');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось отправить клиента в архив');
    } finally {
      setArchivingClient(false);
    }
  };

  const handleRestoreClient = async () => {
    if (!id) return;
    try {
      setRestoringClient(true);
      await api.updateTrainerCrmClient(id, {
        status: 'active',
        archivedAt: null,
      });
      router.replace('/trainer-crm/clients');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось вернуть клиента из архива');
    } finally {
      setRestoringClient(false);
    }
  };

  const summary = useMemo(() => history?.summary, [history]);
  const consumableHistorySessions = useMemo(
    () => (history?.sessions || []).filter((item) => item.session?.id),
    [history],
  );

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
    headerTitleWrap: {
      flex: 1,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    headerMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    subtitle: {
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
    cardTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    clientName: {
      flex: 1,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.black,
      color: colors.text,
    },
    meta: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      lineHeight: 18,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statBox: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.sm,
    },
    statValue: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    statLabel: {
      marginTop: 2,
      fontSize: fontSize.xs - 1,
      color: colors.textMuted,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.sm,
      color: colors.text,
    },
    inputMultiline: {
      minHeight: 90,
      textAlignVertical: 'top',
    },
    itemCard: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    itemTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    buttonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    miniButton: {
      minWidth: 120,
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
    sessionPickCard: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    sessionPickCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
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
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    statusChipText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      fontSize: fontSize.sm,
      color: colors.accent,
      lineHeight: 20,
    },
  });

  if (loading && !client) {
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
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>{client?.fullName || 'Клиент'}</Text>
          <View style={styles.headerMetaRow}>
            <Text style={styles.subtitle}>{client?.status === 'archived' ? 'Карточка архивного клиента CRM' : 'Карточка клиента CRM'}</Text>
            {client?.status === 'archived' ? <Badge label="Архив" variant="accent" size="sm" /> : null}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {client ? (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.clientName}>{client.fullName}</Text>
              <Badge label={statusLabel[client.status] || client.status} variant={client.status === 'active' ? 'success' : client.status === 'lead' ? 'warning' : 'default'} size="sm" />
            </View>
            <Text style={styles.meta}>{client.phone || client.email || client.telegramHandle || 'Контакты не указаны'}</Text>
            <Text style={styles.meta}>Город: {client.city || '—'} · Следующая сессия: {formatDateTime(client.nextSessionAt)}</Text>
            <Text style={styles.meta}>Теги: {client.tags.length ? client.tags.join(', ') : 'нет'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{summary?.sessionsCompletedCount || 0}</Text>
                <Text style={styles.statLabel}>Проведено</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{summary?.cancelledCount || 0}</Text>
                <Text style={styles.statLabel}>Отмены</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatMoney(summary?.lifetimeValueMinor || 0)}</Text>
                <Text style={styles.statLabel}>LTV в учёте</Text>
              </View>
            </View>
            <View style={styles.buttonGrid}>
              <Button title="Редактировать" onPress={openEditModal} variant="outline" size="sm" style={styles.miniButton} />
              {client.status === 'archived' ? (
                <Button title="Вернуть из архива" onPress={handleRestoreClient} variant="accent" size="sm" style={styles.miniButton} loading={restoringClient} />
              ) : (
                <Button title="В архив" onPress={handleArchiveClient} variant="outline" size="sm" style={styles.miniButton} loading={archivingClient} />
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Добавить заметку</Text>
          <TextInput value={noteTitle} onChangeText={setNoteTitle} style={styles.input} placeholder="Заголовок заметки" placeholderTextColor={colors.textMuted} />
          <TextInput value={noteContent} onChangeText={setNoteContent} style={[styles.input, styles.inputMultiline]} placeholder="Что важно по клиенту, как прошла тренировка, что учесть дальше" placeholderTextColor={colors.textMuted} multiline />
          <Button title="Сохранить заметку" onPress={handleSaveNote} loading={savingNote} variant="accent" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Создать пакет</Text>
          <TextInput value={packageTitle} onChangeText={setPackageTitle} style={styles.input} placeholder="Например, 8 персональных тренировок" placeholderTextColor={colors.textMuted} />
          <TextInput value={packageSessions} onChangeText={setPackageSessions} style={styles.input} placeholder="Количество занятий" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
          <TextInput value={packagePrice} onChangeText={setPackagePrice} style={styles.input} placeholder="Стоимость пакета, ₽" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
          <Text style={styles.meta}>Оплата принимается лично тренеру. Цена нужна только для учёта в CRM.</Text>
          <Button title="Создать пакет" onPress={handleCreatePackage} loading={savingPackage} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>История сессий</Text>
          {history?.sessions.length ? (
            history.sessions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                activeOpacity={0.8}
                onPress={() => item.session?.id ? router.push(`/trainer-crm/session/${item.session.id}`) : undefined}
              >
                <Text style={styles.itemTitle}>{item.session?.title || 'Сессия'}</Text>
                <Text style={styles.meta}>{formatDateTime(item.session?.startAt)} · Статус: {item.status}</Text>
                <Text style={styles.meta}>Расчёт: {item.paymentStatus} · Отмечено: {formatMoney(item.amountPaidMinor || 0)}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState icon="🧘" title="Сессий пока нет" description="Когда клиент будет записан на занятия, история появится здесь." />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Заметки</Text>
          {history?.notes.length ? (
            history.notes.map((note) => (
              <View key={note.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{note.title || 'Заметка'}</Text>
                <Text style={styles.meta}>{note.content}</Text>
                <Text style={styles.meta}>{formatDateTime(note.createdAt)}</Text>
              </View>
            ))
          ) : (
            <EmptyState icon="📝" title="Заметок пока нет" description="Добавь первую заметку выше, чтобы фиксировать прогресс клиента." />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Пакеты</Text>
          {history?.packages.length ? (
            history.packages.map((pkg) => (
              <View key={pkg.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{pkg.title}</Text>
                <Text style={styles.meta}>Осталось: {pkg.sessionsRemaining} · Использовано: {pkg.sessionsUsed}</Text>
                <Text style={styles.meta}>Статус: {packageStatusLabel[pkg.status] || pkg.status} · Расчёт: {pkg.paymentStatus}</Text>
                <Text style={styles.meta}>Стоимость для учёта: {formatMoney(pkg.priceMinor || 0)}</Text>
                <View style={styles.buttonGrid}>
                  {pkg.status === 'active' ? (
                    <Button
                      title="Пауза"
                      onPress={() => runPackageAction(pkg.id, 'pause')}
                      variant="outline"
                      size="sm"
                      style={styles.miniButton}
                      loading={packageActionId === pkg.id}
                    />
                  ) : null}
                  {pkg.status === 'paused' ? (
                    <Button
                      title="Возобновить"
                      onPress={() => runPackageAction(pkg.id, 'resume')}
                      variant="outline"
                      size="sm"
                      style={styles.miniButton}
                      loading={packageActionId === pkg.id}
                    />
                  ) : null}
                  {(pkg.status === 'active' || pkg.status === 'paused') && pkg.sessionsRemaining > 0 ? (
                    <Button
                      title="Списать"
                      onPress={() => openConsumeModal(pkg)}
                      variant="outline"
                      size="sm"
                      style={styles.miniButton}
                      loading={packageActionId === pkg.id}
                    />
                  ) : null}
                  {(pkg.status === 'active' || pkg.status === 'paused') ? (
                    <Button
                      title="Завершить"
                      onPress={() => runPackageAction(pkg.id, 'expire')}
                      variant="outline"
                      size="sm"
                      style={styles.miniButton}
                      loading={packageActionId === pkg.id}
                    />
                  ) : null}
                </View>
              </View>
            ))
          ) : (
            <EmptyState icon="🎫" title="Пакетов пока нет" description="Создай пакет выше, чтобы учитывать абонементы и остаток занятий." />
          )}
        </View>

        <Modal visible={consumeModalOpen} transparent animationType="slide" onRequestClose={() => setConsumeModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Списать пакет</Text>
                <TouchableOpacity onPress={() => setConsumeModalOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.meta}>{packageToConsume?.title || 'Пакет'}</Text>
              <TextInput
                value={consumeUnits}
                onChangeText={setConsumeUnits}
                style={styles.input}
                placeholder="Сколько занятий списать"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
              <Text style={styles.cardTitle}>Выбери сессию клиента</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {consumableHistorySessions.map((item) => {
                  const isSelected = selectedHistoryParticipantId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.sessionPickCard, isSelected && styles.sessionPickCardSelected]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedHistoryParticipantId(item.id);
                        setSelectedHistorySessionId(item.session?.id || null);
                      }}
                    >
                      <Text style={styles.itemTitle}>{item.session?.title || 'Сессия'}</Text>
                      <Text style={styles.meta}>{formatDateTime(item.session?.startAt)} · Статус участия: {item.status}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Button
                title="Подтвердить списание"
                onPress={handleConsumePackage}
                loading={packageToConsume ? packageActionId === packageToConsume.id : false}
                variant="accent"
              />
            </View>
          </View>
        </Modal>

        <Modal visible={editModalOpen} transparent animationType="slide" onRequestClose={() => setEditModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Редактировать клиента</Text>
                <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
              <TextInput value={editFullName} onChangeText={setEditFullName} style={styles.input} placeholder="Имя" placeholderTextColor={colors.textMuted} />
              <TextInput value={editPhone} onChangeText={setEditPhone} style={styles.input} placeholder="Телефон" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
              <TextInput value={editTelegramHandle} onChangeText={setEditTelegramHandle} style={styles.input} placeholder="Telegram" placeholderTextColor={colors.textMuted} />
              <TextInput value={editEmail} onChangeText={setEditEmail} style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted} keyboardType="email-address" />
              <TextInput value={editCity} onChangeText={setEditCity} style={styles.input} placeholder="Город" placeholderTextColor={colors.textMuted} />
              <Text style={styles.cardTitle}>Статус</Text>
              <View style={styles.statusRow}>
                {(['lead', 'active', 'inactive', 'paused', 'archived'] as const).map((value) => (
                  <TouchableOpacity key={value} style={[styles.statusChip, editStatus === value && styles.statusChipActive]} onPress={() => setEditStatus(value)}>
                    <Text style={styles.statusChipText}>{statusLabel[value]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={editGoals} onChangeText={setEditGoals} style={[styles.input, styles.inputMultiline]} placeholder="Цели клиента" placeholderTextColor={colors.textMuted} multiline />
              <TextInput value={editMedicalNotes} onChangeText={setEditMedicalNotes} style={[styles.input, styles.inputMultiline]} placeholder="Медицинские заметки" placeholderTextColor={colors.textMuted} multiline />
              <TextInput value={editPrivateNotes} onChangeText={setEditPrivateNotes} style={[styles.input, styles.inputMultiline]} placeholder="Приватные заметки" placeholderTextColor={colors.textMuted} multiline />
              <TextInput value={editTags} onChangeText={setEditTags} style={styles.input} placeholder="Теги через запятую" placeholderTextColor={colors.textMuted} />
              <Button title="Сохранить изменения" onPress={handleSaveClient} loading={savingClient} variant="accent" />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
