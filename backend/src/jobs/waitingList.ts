/**
 * Waiting List Offers Job
 * Обрабатывает истёкшие offers и предлагает места следующим в очереди
 */

import { PrismaClient } from '@prisma/client';
import { sendPushToUser } from '../services/push';

const prisma = new PrismaClient();

const OFFER_EXPIRY_MINUTES = 30;

/**
 * Обработать истёкшие offers
 */
async function processExpiredOffers() {
  const now = new Date();

  // Найти все истёкшие offers
  const expiredOffers = await prisma.waitingListEntry.findMany({
    where: {
      status: 'offered',
      offerExpiresAt: {
        lt: now,
      },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          capacity: true,
        },
      },
    },
  });

  for (const offer of expiredOffers) {
    // Помечаем как expired
    await prisma.waitingListEntry.update({
      where: { id: offer.id },
      data: { status: 'expired' },
    });

    console.log(`[WaitingList] Offer expired for user ${offer.userId} on event ${offer.eventId}`);

    // Пытаемся предложить следующему в очереди
    await offerToNextInQueue(offer.eventId, offer.event.title);
  }

  return expiredOffers.length;
}

/**
 * Предложить место следующему в очереди
 */
export async function offerToNextInQueue(eventId: string, eventTitle: string): Promise<boolean> {
  // Проверяем, есть ли свободные места
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      capacity: true,
      title: true,
    },
  });

  if (!event) return false;

  // Считаем текущих участников
  const participantsCount = await prisma.participation.count({
    where: {
      eventId,
      status: 'joined',
    },
  });

  // Считаем активные offers (только те, у которых offerExpiresAt > now)
  const now = new Date();
  const activeOffersCount = await prisma.waitingListEntry.count({
    where: {
      eventId,
      status: 'offered',
      offerExpiresAt: { gt: now },
    },
  });

  // Если нет свободных мест (с учётом активных offers), выходим
  if (event.capacity && participantsCount + activeOffersCount >= event.capacity) {
    return false;
  }

  // Находим первого в очереди (waiting)
  const nextInQueue = await prisma.waitingListEntry.findFirst({
    where: {
      eventId,
      status: 'waiting',
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!nextInQueue) return false;

  const expiresAt = new Date(Date.now() + OFFER_EXPIRY_MINUTES * 60 * 1000);

  // Обновляем статус на offered
  await prisma.waitingListEntry.update({
    where: { id: nextInQueue.id },
    data: {
      status: 'offered',
      offerExpiresAt: expiresAt,
    },
  });

  // Отправляем push-уведомление
  await sendPushToUser(nextInQueue.userId, {
    title: 'Освободилось место! 🎉',
    body: `В "${eventTitle}" появилось место. У вас ${OFFER_EXPIRY_MINUTES} минут, чтобы подтвердить.`,
    data: {
      type: 'waiting_list_offer',
      eventId,
      expiresAt: expiresAt.toISOString(),
    },
  });

  // Логируем уведомление
  await prisma.notificationLog.create({
    data: {
      userId: nextInQueue.userId,
      eventId,
      type: 'waiting_list_offer',
      channel: 'push',
      status: 'sent',
    },
  });

  console.log(`[WaitingList] Offered place to user ${nextInQueue.userId} for event ${eventId}`);

  return true;
}

/**
 * Основная функция: обработать waiting list
 */
export async function processWaitingList() {
  console.log('[WaitingList] Starting waiting list job...');

  const expiredCount = await processExpiredOffers();

  console.log(`[WaitingList] Job completed: processed ${expiredCount} expired offers`);
}

/**
 * Запустить cron job
 */
export function startWaitingListCron(intervalMs: number = 2 * 60 * 1000) {
  console.log(`[WaitingList] Starting cron job with interval ${intervalMs}ms`);

  // Первый запуск сразу
  processWaitingList().catch((err) => {
    console.error('[WaitingList] Error in initial run:', err);
  });

  // Повторять каждые intervalMs
  setInterval(() => {
    processWaitingList().catch((err) => {
      console.error('[WaitingList] Error in cron run:', err);
    });
  }, intervalMs);
}
