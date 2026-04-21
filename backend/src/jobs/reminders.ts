/**
 * Event Reminders Job
 * Отправляет напоминания T-24h и T-2h участникам событий
 */

import { PrismaClient } from '@prisma/client';
import { sendPushToUsers } from '../services/push';

const prisma = new PrismaClient();

// Типы напоминаний
const REMINDER_TYPES = {
  T_24H: 'event_reminder_24h',
  T_2H: 'event_reminder_2h',
} as const;

// Окна времени (в минутах от события)
const REMINDER_WINDOWS = {
  [REMINDER_TYPES.T_24H]: { minBefore: 23 * 60 + 55, maxBefore: 24 * 60 + 5 }, // 23h55m - 24h05m
  [REMINDER_TYPES.T_2H]: { minBefore: 1 * 60 + 55, maxBefore: 2 * 60 + 5 },     // 1h55m - 2h05m
};

interface ReminderConfig {
  type: string;
  title: string;
  body: (eventTitle: string) => string;
}

const REMINDER_CONFIGS: ReminderConfig[] = [
  {
    type: REMINDER_TYPES.T_24H,
    title: 'Завтра важный день! 🌟',
    body: (eventTitle) => `${eventTitle} ждёт вас. Всё получится — мы верим в вас.`,
  },
  {
    type: REMINDER_TYPES.T_2H,
    title: 'Через 2 часа начинаем!',
    body: (eventTitle) => `${eventTitle}. Не забудьте удобную одежду и хорошее настроение.`,
  },
];

/**
 * Найти события, которым нужно отправить напоминание определённого типа
 */
async function findEventsForReminder(reminderType: string) {
  const window = REMINDER_WINDOWS[reminderType as keyof typeof REMINDER_WINDOWS];
  if (!window) return [];

  const now = new Date();
  const minStartAt = new Date(now.getTime() + window.minBefore * 60 * 1000);
  const maxStartAt = new Date(now.getTime() + window.maxBefore * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      status: 'approved',
      startAt: {
        gte: minStartAt,
        lte: maxStartAt,
      },
    },
    select: {
      id: true,
      title: true,
      startAt: true,
    },
  });

  return events;
}

/**
 * Получить участников события, которым ещё не отправлено напоминание данного типа
 */
async function getParticipantsToNotify(eventId: string, reminderType: string) {
  // Получаем всех joined участников
  const participations = await prisma.participation.findMany({
    where: {
      eventId,
      status: 'joined',
    },
    select: {
      userId: true,
    },
  });

  if (!participations.length) return [];

  const userIds = participations.map((p) => p.userId);

  // Проверяем, кому уже отправлено
  const alreadySent = await prisma.notificationLog.findMany({
    where: {
      eventId,
      type: reminderType,
      userId: { in: userIds },
    },
    select: {
      userId: true,
    },
  });

  const sentUserIds = new Set(alreadySent.map((n) => n.userId));

  // Возвращаем только тех, кому ещё не отправлено
  return userIds.filter((id) => !sentUserIds.has(id));
}

/**
 * Отправить напоминания для одного события
 */
async function sendRemindersForEvent(
  event: { id: string; title: string },
  config: ReminderConfig
) {
  const userIds = await getParticipantsToNotify(event.id, config.type);

  if (!userIds.length) {
    return { sent: 0, skipped: 0 };
  }

  // Отправляем push
  const result = await sendPushToUsers(userIds, {
    title: config.title,
    body: config.body(event.title),
    data: {
      type: config.type,
      eventId: event.id,
    },
  });

  // Логируем отправку
  const logs = userIds.map((userId) => ({
    userId,
    eventId: event.id,
    type: config.type,
    channel: 'push',
    status: result.successCount > 0 ? 'sent' : 'failed',
  }));

  await prisma.notificationLog.createMany({
    data: logs,
    skipDuplicates: true,
  });

  console.log(
    `[Reminders] ${config.type} for event ${event.id}: sent=${result.successCount}, failed=${result.failedCount}`
  );

  return { sent: result.successCount, skipped: result.failedCount };
}

/**
 * Основная функция: обработать все напоминания
 */
export async function processReminders() {
  console.log('[Reminders] Starting reminder job...');

  let totalSent = 0;
  let totalSkipped = 0;

  for (const config of REMINDER_CONFIGS) {
    const events = await findEventsForReminder(config.type);

    for (const event of events) {
      const { sent, skipped } = await sendRemindersForEvent(event, config);
      totalSent += sent;
      totalSkipped += skipped;
    }
  }

  console.log(`[Reminders] Job completed: sent=${totalSent}, skipped=${totalSkipped}`);
}

/**
 * Запустить cron job (каждые 5 минут)
 */
export function startRemindersCron(intervalMs: number = 5 * 60 * 1000) {
  console.log(`[Reminders] Starting cron job with interval ${intervalMs}ms`);

  // Первый запуск сразу
  processReminders().catch((err) => {
    console.error('[Reminders] Error in initial run:', err);
  });

  // Повторять каждые intervalMs
  setInterval(() => {
    processReminders().catch((err) => {
      console.error('[Reminders] Error in cron run:', err);
    });
  }, intervalMs);
}
