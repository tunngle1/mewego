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
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { api } from '../../src/services/api';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { TrainerCrmClient, TrainerCrmTask, TrainerCrmTaskPriority, TrainerCrmTaskStatus } from '../../src/types';

const statusMeta: Record<TrainerCrmTaskStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'accent' }> = {
  open: { label: 'Открыта', variant: 'warning' },
  done: { label: 'Готово', variant: 'success' },
  cancelled: { label: 'Отменена', variant: 'accent' },
};

const priorityMeta: Record<TrainerCrmTaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Без срока';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const parseDueAtInput = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return undefined;

  const parsed = new Date(normalized.includes('T') ? normalized : normalized.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

export default function TrainerCrmTasksScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [tasks, setTasks] = useState<TrainerCrmTask[]>([]);
  const [clients, setClients] = useState<TrainerCrmClient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | TrainerCrmTaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TrainerCrmTaskPriority>('all');
  const [clientFilter, setClientFilter] = useState<'all' | string>('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TrainerCrmTaskPriority>('medium');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [dueAtInput, setDueAtInput] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const [tasksData, clientsData] = await Promise.all([
        api.getTrainerCrmTasks(),
        api.getTrainerCrmClients({ limit: 100, archived: false }),
      ]);
      setTasks(tasksData);
      setClients(clientsData.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить задачи');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (clientFilter !== 'all' && task.clientId !== clientFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, clientFilter]);

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Нужно название', 'Укажи название задачи.');
      return;
    }

    const dueAt = parseDueAtInput(dueAtInput);
    if (dueAt === null) {
      Alert.alert('Неверный срок', 'Укажи дату в формате 2026-04-10 18:00.');
      return;
    }

    try {
      setSaving(true);
      const created = await api.createTrainerCrmTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        clientId: selectedClientId || undefined,
        dueAt,
      });
      setTasks((current) => [created, ...current]);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setSelectedClientId(null);
      setDueAtInput('');
      setCreateOpen(false);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось создать задачу');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, nextStatus: TrainerCrmTaskStatus) => {
    try {
      setUpdatingTaskId(taskId);
      const updated =
        nextStatus === 'done'
          ? await api.completeTrainerCrmTask(taskId)
          : await api.updateTrainerCrmTask(taskId, { status: nextStatus });
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось обновить задачу');
    } finally {
      setUpdatingTaskId(null);
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
    titleWrap: {
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
    cardTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    filterRow: {
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
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    chipText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    taskTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    meta: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      lineHeight: 18,
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    buttonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    miniButton: {
      minWidth: 120,
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
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      color: colors.accent,
      fontSize: fontSize.sm,
      lineHeight: 20,
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
  });

  if (loading && !tasks.length) {
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
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Задачи CRM</Text>
          <Text style={styles.subtitle}>Создание, фильтрация и быстрые статусы задач</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => setCreateOpen(true)}>
          <Ionicons name="add" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Фильтр по статусу</Text>
          <View style={styles.filterRow}>
            {(['all', 'open', 'done', 'cancelled'] as const).map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, statusFilter === value && styles.chipActive]}
                onPress={() => setStatusFilter(value)}
              >
                <Text style={styles.chipText}>{value === 'all' ? 'Все' : statusMeta[value].label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.cardTitle}>Фильтр по приоритету</Text>
          <View style={styles.filterRow}>
            {(['all', 'low', 'medium', 'high'] as const).map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, priorityFilter === value && styles.chipActive]}
                onPress={() => setPriorityFilter(value)}
              >
                <Text style={styles.chipText}>{value === 'all' ? 'Все' : priorityMeta[value]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.cardTitle}>Фильтр по клиенту</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity style={[styles.chip, clientFilter === 'all' && styles.chipActive]} onPress={() => setClientFilter('all')}>
              <Text style={styles.chipText}>Все</Text>
            </TouchableOpacity>
            {clients.slice(0, 12).map((client) => (
              <TouchableOpacity
                key={client.id}
                style={[styles.chip, clientFilter === client.id && styles.chipActive]}
                onPress={() => setClientFilter(client.id)}
              >
                <Text style={styles.chipText}>{client.fullName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredTasks.length ? (
          filteredTasks.map((task) => {
            const badge = statusMeta[task.status];
            return (
              <View key={task.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Badge label={badge.label} variant={badge.variant} size="sm" />
                </View>
                <Text style={styles.meta}>Приоритет: {priorityMeta[task.priority]} · Клиент: {task.client?.fullName || 'Без клиента'}</Text>
                <Text style={styles.meta}>Срок: {formatDateTime(task.dueAt)}</Text>
                {task.description ? <Text style={styles.meta}>{task.description}</Text> : null}
                <View style={styles.buttonGrid}>
                  {task.status !== 'done' ? (
                    <Button title="Готово" onPress={() => handleUpdateTaskStatus(task.id, 'done')} variant="outline" size="sm" style={styles.miniButton} loading={updatingTaskId === task.id} />
                  ) : null}
                  {task.status !== 'cancelled' ? (
                    <Button title="Отменить" onPress={() => handleUpdateTaskStatus(task.id, 'cancelled')} variant="outline" size="sm" style={styles.miniButton} loading={updatingTaskId === task.id} />
                  ) : null}
                  {task.status !== 'open' ? (
                    <Button title="Открыть снова" onPress={() => handleUpdateTaskStatus(task.id, 'open')} variant="outline" size="sm" style={styles.miniButton} loading={updatingTaskId === task.id} />
                  ) : null}
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState
            icon="✅"
            title="Задач пока нет"
            description="Создай первую задачу и управляй follow-up, дедлайнами и приоритетами прямо в CRM."
            actionLabel="Создать задачу"
            onAction={() => setCreateOpen(true)}
          />
        )}
      </ScrollView>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Новая задача</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Название задачи" placeholderTextColor={colors.textMuted} />
            <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.inputMultiline]} placeholder="Описание" placeholderTextColor={colors.textMuted} multiline />
            <TextInput value={dueAtInput} onChangeText={setDueAtInput} style={styles.input} placeholder="Срок в формате 2026-04-10 18:00" placeholderTextColor={colors.textMuted} />
            <Text style={styles.cardTitle}>Приоритет</Text>
            <View style={styles.filterRow}>
              {(['low', 'medium', 'high'] as const).map((value) => (
                <TouchableOpacity key={value} style={[styles.chip, priority === value && styles.chipActive]} onPress={() => setPriority(value)}>
                  <Text style={styles.chipText}>{priorityMeta[value]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.cardTitle}>Клиент</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity style={[styles.chip, selectedClientId === null && styles.chipActive]} onPress={() => setSelectedClientId(null)}>
                <Text style={styles.chipText}>Без клиента</Text>
              </TouchableOpacity>
              {clients.slice(0, 12).map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[styles.chip, selectedClientId === client.id && styles.chipActive]}
                  onPress={() => setSelectedClientId(client.id)}
                >
                  <Text style={styles.chipText}>{client.fullName}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Сохранить задачу" onPress={handleCreateTask} loading={saving} variant="accent" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
