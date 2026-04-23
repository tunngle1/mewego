import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { getUserEntitlements } from './subscriptions';
import { onParticipationAttended, onReviewCreated, onLateCancelAfterStart } from '../services/gamification';
import { sendPushToUser } from '../services/push';
import { hashOpaqueToken } from '../services/tokenService';

const router = Router();
const prisma = new PrismaClient();

const toMinorPriceValue = (priceValue: number | null | undefined) => {
  if (typeof priceValue !== 'number') return null;
  return priceValue * 100;
};

const getParticipantIdentityScore = (participant: { clientId?: string | null; userId?: string | null; amountPaidMinor?: number | null }) => {
  let score = 0;
  if (participant.clientId) score += 4;
  if (participant.userId) score += 4;
  if ((participant.amountPaidMinor || 0) > 0) score += 1;
  return score;
};

const compareParticipantsByIdentityPriority = (
  a: { clientId?: string | null; userId?: string | null; amountPaidMinor?: number | null; updatedAt?: Date; createdAt?: Date },
  b: { clientId?: string | null; userId?: string | null; amountPaidMinor?: number | null; updatedAt?: Date; createdAt?: Date },
) => {
  const scoreDiff = getParticipantIdentityScore(b) - getParticipantIdentityScore(a);
  if (scoreDiff !== 0) return scoreDiff;

  const left = b.updatedAt?.getTime() || b.createdAt?.getTime() || 0;
  const right = a.updatedAt?.getTime() || a.createdAt?.getTime() || 0;
  return left - right;
};

const calculateEventEndAt = (startAt: Date, durationMin: number | null, endAt: Date | null): Date => {
  if (endAt) return endAt;
  if (durationMin) {
    return new Date(startAt.getTime() + durationMin * 60 * 1000);
  }
  return startAt;
};

const getViewerPhase = (params: { now: Date; startAt: Date; endAt: Date }): 'upcoming' | 'ongoing' | 'ended' => {
  const { now, startAt, endAt } = params;
  if (now < startAt) return 'upcoming';
  if (now >= startAt && now < endAt) return 'ongoing';
  return 'ended';
};

const SCHEDULE_GAP_MINUTES = 60;
const MAX_EVENT_DURATION_HOURS_FALLBACK = 12;

const hasScheduleConflict = async (params: {
  userId: string;
  targetEventId: string;
  targetStartAt: Date;
  targetDurationMin: number | null;
  targetEndAt: Date | null;
}): Promise<{ conflict: boolean; conflictingEventId?: string }> => {
  const { userId, targetEventId, targetStartAt, targetDurationMin, targetEndAt } = params;

  const targetEnd = calculateEventEndAt(targetStartAt, targetDurationMin, targetEndAt);
  const bufferMs = SCHEDULE_GAP_MINUTES * 60 * 1000;
  const rangeStart = new Date(targetStartAt.getTime() - (bufferMs + MAX_EVENT_DURATION_HOURS_FALLBACK * 60 * 60 * 1000));
  const rangeEnd = new Date(targetEnd.getTime() + bufferMs);

  const candidates = await prisma.participation.findMany({
    where: {
      userId,
      status: 'joined',
      eventId: { not: targetEventId },
      event: {
        startAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
    },
    select: {
      eventId: true,
      event: { select: { startAt: true, endAt: true, durationMin: true } },
    },
    take: 50,
  });

  for (const c of candidates) {
    const otherStart = c.event.startAt;
    const otherEnd = calculateEventEndAt(otherStart, c.event.durationMin, c.event.endAt);

    // Conflict if intervals overlap OR gap between them is < 60 minutes.
    // Equivalent to checking overlap after expanding both intervals by 60 minutes buffer.
    const targetStartBuffered = new Date(targetStartAt.getTime() - bufferMs);
    const targetEndBuffered = new Date(targetEnd.getTime() + bufferMs);
    if (otherStart < targetEndBuffered && otherEnd > targetStartBuffered) {
      return { conflict: true, conflictingEventId: c.eventId };
    }
  }

  return { conflict: false };
};

const ensureUserExists = async (userId: string, role: 'user' | 'organizer' | 'admin' | 'superadmin') => {
  await prisma.user.upsert({
    where: { id: userId },
    update: {
      lastActiveAt: new Date(),
    },
    create: {
      id: userId,
      role,
      name:
        role === 'superadmin'
          ? 'SuperAdmin'
          : role === 'admin'
            ? 'Admin'
            : role === 'organizer'
              ? 'Organizer'
              : 'User',
    },
  });
};

const ensureTrainerCrmClientForUser = async (trainerId: string, userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      telegramId: true,
    },
  });

  return prisma.trainerClient.upsert({
    where: {
      trainerId_userId: {
        trainerId,
        userId,
      },
    },
    update: {
      fullName: user?.name || 'Client',
      phone: user?.phone || null,
      telegramHandle: user?.telegramId || null,
      status: 'active',
    },
    create: {
      trainerId,
      userId,
      fullName: user?.name || 'Client',
      phone: user?.phone || null,
      telegramHandle: user?.telegramId || null,
      status: 'active',
      source: 'event_sync',
      tags: [],
    },
  });
};

const syncCrmParticipantForEvent = async (params: {
  eventId: string;
  userId: string;
  status: 'booked' | 'confirmed' | 'attended' | 'cancelled' | 'late_cancelled' | 'no_show';
}) => {
  const { eventId, userId, status } = params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      organizerId: true,
      priceValue: true,
      crmSession: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!event?.crmSession) {
    return;
  }

  const client = await ensureTrainerCrmClientForUser(event.organizerId, userId);
  const existingParticipants = await prisma.trainerSessionParticipant.findMany({
    where: {
      sessionId: event.crmSession.id,
      OR: [
        { clientId: client.id },
        { userId },
      ],
    },
  });
  const primaryParticipant = [...existingParticipants].sort(compareParticipantsByIdentityPriority)[0];
  const nextPriceMinor = toMinorPriceValue(event.priceValue);

  if (primaryParticipant) {
    await prisma.trainerSessionParticipant.update({
      where: { id: primaryParticipant.id },
      data: {
        clientId: client.id,
        userId,
        status,
        priceMinor: nextPriceMinor,
        confirmedAt: status === 'confirmed' ? new Date() : undefined,
        attendedAt: status === 'attended' ? new Date() : undefined,
        cancelledAt: status === 'cancelled' || status === 'late_cancelled' ? new Date() : undefined,
        attendanceMarkedBy: status === 'attended' || status === 'no_show' ? event.organizerId : undefined,
      },
    });
    return;
  }

  await prisma.trainerSessionParticipant.create({
    data: {
      sessionId: event.crmSession.id,
      clientId: client.id,
      userId,
      status,
      paymentStatus: 'unpaid',
      priceMinor: nextPriceMinor,
      confirmedAt: status === 'confirmed' ? new Date() : null,
      attendedAt: status === 'attended' ? new Date() : null,
      cancelledAt: status === 'cancelled' || status === 'late_cancelled' ? new Date() : null,
      attendanceMarkedBy: status === 'attended' || status === 'no_show' ? event.organizerId : null,
    },
  });
};

const getActiveOffersCount = async (eventId: string) => {
  return prisma.waitingListEntry.count({
    where: {
      eventId,
      status: 'offered',
      offerExpiresAt: { gt: new Date() },
    },
  });
};

const OFFER_TIMEOUT_MINUTES = 30;

const levelToIntensityLabel = (level: unknown): string => {
  const key = String(level || '').trim().toLowerCase();
  switch (key) {
    case 'dynamic':
      return 'Динамичный';
    case 'medium':
      return 'Средне';
    case 'relaxed':
      return 'Мягко';
    case 'novice':
      return 'Мягко';
    default:
      return 'Мягко';
  }
};

const toPublicEventDTO = (params: {
  event: any;
  spotsTaken: number;
  isFull: boolean;
  trainerRating: number;
  waitingList?: any[];
  viewerWaiting?: any;
  viewerPhase?: any;
}) => {
  const { event, spotsTaken, isFull, trainerRating, waitingList, viewerWaiting, viewerPhase } = params;

  const dto: any = {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.movementType,
    // Legacy field used by mobile normalizeEvent()
    intensity: event.level,
    // New contract fields
    level: event.level,
    intensityLabel: levelToIntensityLabel(event.level),
    date: event.startAt.toISOString(),
    time: event.startAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    durationMin: event.durationMin,
    location: event.locationName,
    address: event.locationAddress,
    locationType: event.locationType,
    lat: event.lat,
    lng: event.lng,
    spotsTotal: event.capacity || 999,
    spotsTaken,
    isFull,
    isFree: event.priceType === 'free',
    price: event.priceValue || 0,
    paymentInstructions: event.paymentInstructions,
    trainer: {
      id: event.organizer.id,
      publicId: event.organizer.publicId,
      name: event.organizer.name || 'Организатор',
      avatar: event.organizer.avatarUrl,
      rating: trainerRating,
    },
    status: event.status,
  };

  if (waitingList) dto.waitingList = waitingList;
  if (viewerWaiting) dto.viewerWaiting = viewerWaiting;
  if (viewerPhase) dto.viewerPhase = viewerPhase;

  return dto;
};

/**
 * Выдаёт offer следующему в очереди, если есть свободное место.
 * Возвращает созданный offer или null.
 */
const offerNextInQueue = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      _count: {
        select: {
          participations: { where: { status: 'joined' } },
        },
      },
    },
  });

  if (!event || !event.capacity) return null;

  // Считаем активные offers (зарезервированные места)
  const activeOffersCount = await prisma.waitingListEntry.count({
    where: {
      eventId,
      status: 'offered',
      offerExpiresAt: { gt: new Date() },
    },
  });

  const joinedCount = event._count.participations;
  const effectiveFreeSpots = event.capacity - joinedCount - activeOffersCount;

  if (effectiveFreeSpots <= 0) return null;

  // Находим первого в очереди со статусом waiting
  const nextInQueue = await prisma.waitingListEntry.findFirst({
    where: {
      eventId,
      status: 'waiting',
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!nextInQueue) return null;

  // Создаём offer
  const offerExpiresAt = new Date(Date.now() + OFFER_TIMEOUT_MINUTES * 60 * 1000);
  
  const updatedEntry = await prisma.waitingListEntry.update({
    where: { id: nextInQueue.id },
    data: {
      status: 'offered',
      offerExpiresAt,
    },
  });

  console.log(`[Waitlist] Offer created for user ${nextInQueue.userId} on event ${eventId}, expires at ${offerExpiresAt.toISOString()}`);

  // Отправляем push notification пользователю
  sendPushToUser(nextInQueue.userId, {
    title: 'Освободилось место! 🎉',
    body: `В "${event.title}" появилось место. У вас ${OFFER_TIMEOUT_MINUTES} минут, чтобы подтвердить.`,
    data: {
      type: 'waiting_list_offer',
      eventId,
      waitingEntryId: updatedEntry.id,
      expiresAt: offerExpiresAt.toISOString(),
    },
  }).catch((err) => console.error('[Waitlist] Failed to send push:', err));

  // Логируем уведомление
  prisma.notificationLog.create({
    data: {
      userId: nextInQueue.userId,
      eventId,
      type: 'waiting_list_offer',
      channel: 'push',
      status: 'sent',
    },
  }).catch(() => {});

  return updatedEntry;
};

/**
 * Помечает просроченные offers как expired и выдаёт offer следующим.
 */
const processExpiredOffers = async (eventId: string) => {
  const now = new Date();
  
  const expiredOffers = await prisma.waitingListEntry.findMany({
    where: {
      eventId,
      status: 'offered',
      offerExpiresAt: { lt: now },
    },
  });

  for (const offer of expiredOffers) {
    await prisma.waitingListEntry.update({
      where: { id: offer.id },
      data: { status: 'expired' },
    });
    console.log(`[Waitlist] Offer expired for user ${offer.userId} on event ${eventId}`);
  }

  // После истечения offers пробуем выдать новые
  if (expiredOffers.length > 0) {
    await offerNextInQueue(eventId);
  }
};

// GET /api/v1/events - список событий (только approved, public, и будущие для обычных пользователей)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, level, search, type } = req.query;
    const now = new Date();

    const where: any = {
      status: 'approved', // только одобренные события видны пользователям
      visibility: 'public', // исключаем приватные события из публичного списка
      startAt: { gte: now }, // только будущие события (по решению: вариант 2A)
    };

    if (category || type) {
      where.movementType = (category || type) as string;
    }

    if (level) {
      where.level = level as string;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            publicId: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            participations: {
              where: { status: 'joined' },
            },
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    // Get unique organizer IDs and fetch their ratings
    const organizerIds = [...new Set(events.map(e => e.organizerId))];
    const ratingsMap: Record<string, number> = {};
    
    for (const orgId of organizerIds) {
      const agg = await prisma.review.aggregate({
        where: { event: { organizerId: orgId } },
        _avg: { rating: true },
      });
      ratingsMap[orgId] = agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0;
    }

    // Transform to match mobile API contract
    const result = await Promise.all(
      events.map(async (event) => {
        const activeOffersCount = event.capacity ? await getActiveOffersCount(event.id) : 0;
        const effectiveTaken = event._count.participations + activeOffersCount;

        return toPublicEventDTO({
          event,
          spotsTaken: effectiveTaken,
          isFull: event.capacity ? effectiveTaken >= event.capacity : false,
          trainerRating: ratingsMap[event.organizerId] || 0,
        });
      })
    );

    res.json(result);
  } catch (error) {
    console.error('[Events] GET / error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/v1/events/:id - детали события
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const now = new Date();

    // Ленивая проверка просроченных offers
    await processExpiredOffers(id);

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            publicId: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            participations: {
              where: { status: 'joined' },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get trainer rating
    const ratingAgg = await prisma.review.aggregate({
      where: { event: { organizerId: event.organizerId } },
      _avg: { rating: true },
    });
    const trainerRating = ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : 0;

    // Fairness: include active offers in fullness calculation
    const activeOffersCount = event.capacity ? await getActiveOffersCount(event.id) : 0;
    const effectiveTaken = event._count.participations + activeOffersCount;

    // Variant A: viewer-specific waiting list status (if caller is authenticated)
    const viewerId = (req as any).auth?.userId as string | undefined;
    let viewerWaiting: any | undefined;
    let viewerPhase: any | undefined;
    if (viewerId) {
      const entry = await prisma.waitingListEntry.findFirst({
        where: {
          eventId: id,
          userId: viewerId,
          status: { in: ['waiting', 'offered'] },
        },
        select: {
          id: true,
          status: true,
          offerExpiresAt: true,
        },
      });

      viewerWaiting = entry
        ? {
            status: entry.status,
            entryId: entry.id,
            offerExpiresAt: entry.offerExpiresAt?.toISOString(),
          }
        : { status: 'none' };

      const participation = await prisma.participation.findUnique({
        where: {
          eventId_userId: { eventId: id, userId: viewerId },
        },
        select: { status: true },
      });

      if (participation?.status === 'joined') {
        const endAt = calculateEventEndAt(event.startAt, event.durationMin, event.endAt);
        viewerPhase = getViewerPhase({ now, startAt: event.startAt, endAt });
      }
    }

    const result = toPublicEventDTO({
      event,
      spotsTaken: effectiveTaken,
      isFull: event.capacity ? effectiveTaken >= event.capacity : false,
      trainerRating,
      waitingList: [],
      viewerWaiting,
      viewerPhase,
    });

    res.json(result);
  } catch (error) {
    console.error('[Events] GET /:id error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/v1/events/:id/join - записаться на событие
router.post('/:id/join', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;
    await ensureUserExists(userId, req.auth!.role);

    // Check if event exists and is approved
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            participations: {
              where: { status: 'joined' },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Organizer cannot join their own event
    if (event.organizerId === userId) {
      return res.status(403).json({ error: 'Organizer cannot join their own event' });
    }

    if (event.status !== 'approved') {
      return res.status(400).json({ error: 'Event is not available for joining' });
    }

    // Schedule conflict rule: user cannot be booked into events too close together (< 1h gap)
    const conflict = await hasScheduleConflict({
      userId,
      targetEventId: id,
      targetStartAt: event.startAt,
      targetDurationMin: event.durationMin,
      targetEndAt: event.endAt,
    });
    if (conflict.conflict) {
      return res.status(409).json({
        error: 'Schedule conflict',
        message: `Нельзя записаться: между событиями должно быть минимум ${SCHEDULE_GAP_MINUTES} минут`,
        conflictingEventId: conflict.conflictingEventId,
      });
    }

    // Queue fairness: count active offers as reserved seats
    const activeOffersCount = event.capacity ? await getActiveOffersCount(id) : 0;
    const effectiveTaken = event._count.participations + activeOffersCount;

    // If there are active offers, we must not allow bypassing the queue
    if (event.capacity && activeOffersCount > 0 && effectiveTaken >= event.capacity) {
      return res.status(409).json({ error: 'Event is full (reserved for waiting list)' });
    }

    // Check capacity
    if (event.capacity && effectiveTaken >= event.capacity) {
      return res.status(409).json({ error: 'Event is full' });
    }

    // Check if already joined
    const existing = await prisma.participation.findUnique({
      where: {
        eventId_userId: { eventId: id, userId },
      },
    });

    if (existing && existing.status === 'joined') {
      return res.status(409).json({ error: 'Already joined' });
    }

    // Create or update participation
    const participation = await prisma.participation.upsert({
      where: {
        eventId_userId: { eventId: id, userId },
      },
      update: {
        status: 'joined',
        joinedAt: new Date(),
        canceledAt: null,
      },
      create: {
        eventId: id,
        userId,
        status: 'joined',
      },
    });

    await syncCrmParticipantForEvent({
      eventId: id,
      userId,
      status: 'booked',
    });

    res.json({
      id: participation.id,
      eventId: participation.eventId,
      userId: participation.userId,
      status: participation.status,
      bookedAt: participation.joinedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Events] POST /:id/join error:', error);
    res.status(500).json({ error: 'Failed to join event' });
  }
});

// POST /api/v1/events/:id/cancel - отменить участие
// Правила:
// - До старта события: отмена разрешена
// - После старта: grace window 30 минут с штрафом в геймификации
// - После старта + 30 мин: отмена запрещена
const CANCEL_GRACE_WINDOW_MINUTES = 30;

router.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;
    const { reason, comment } = req.body;

    await ensureUserExists(userId, req.auth!.role);

    const participation = await prisma.participation.findUnique({
      where: {
        eventId_userId: { eventId: id, userId },
      },
      include: {
        event: true,
      },
    });

    if (!participation || participation.status !== 'joined') {
      return res.status(404).json({ error: 'Participation not found' });
    }

    const now = new Date();
    const startAt = participation.event.startAt;
    const diffMinutesFromStart = (now.getTime() - startAt.getTime()) / (1000 * 60);

    // Check if event has started
    const eventStarted = now >= startAt;
    
    // If event started more than 30 minutes ago, cancel is forbidden
    if (eventStarted && diffMinutesFromStart > CANCEL_GRACE_WINDOW_MINUTES) {
      return res.status(400).json({ 
        error: 'Cannot cancel after grace window',
        message: `Отмена невозможна: прошло более ${CANCEL_GRACE_WINDOW_MINUTES} минут с начала события`,
      });
    }

    // Late cancel: less than 60 minutes before start OR after start (in grace window)
    const diffMinutesBeforeStart = (startAt.getTime() - now.getTime()) / (1000 * 60);
    const lateCancel = diffMinutesBeforeStart < 60 || eventStarted;

    // Cancel in grace window after start = penalty
    const cancelWithPenalty = eventStarted && diffMinutesFromStart <= CANCEL_GRACE_WINDOW_MINUTES;

    await prisma.participation.update({
      where: { id: participation.id },
      data: {
        status: 'canceled',
        canceledAt: now,
        lateCancel,
      },
    });

    await syncCrmParticipantForEvent({
      eventId: id,
      userId,
      status: lateCancel ? 'late_cancelled' : 'cancelled',
    });

    // Apply gamification penalty if canceling after event start
    if (cancelWithPenalty) {
      await onLateCancelAfterStart(userId, id);
    }

    // Триггер: выдаём offer следующему в очереди
    await offerNextInQueue(id);

    res.json({ 
      status: 'canceled', 
      lateCancel,
      penaltyApplied: cancelWithPenalty,
      message: cancelWithPenalty 
        ? 'Участие отменено. Применён штраф за позднюю отмену.' 
        : 'Участие отменено',
    });
  } catch (error) {
    console.error('[Events] POST /:id/cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel participation' });
  }
});

// POST /api/v1/events/:id/waiting-list - встать в очередь ожидания
router.post('/:id/waiting-list', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;
    await ensureUserExists(userId, req.auth!.role);

    // ГЕЙТ: waiting list только для подписчиков (по TZ.md)
    const entitlements = await getUserEntitlements(userId, req.auth!.role);
    if (!entitlements.canUseWaitingList) {
      return res.status(403).json({ 
        error: 'Subscription required',
        message: 'Очередь ожидания доступна только с подпиской',
        requiredFeature: 'waiting_list',
      });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            participations: { where: { status: 'joined' } },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if already in waiting list
    const existingEntry = await prisma.waitingListEntry.findFirst({
      where: {
        eventId: id,
        userId,
        status: { in: ['waiting', 'offered'] },
      },
    });

    if (existingEntry) {
      return res.status(409).json({ error: 'Already in waiting list' });
    }

    // Check if already joined
    const existingParticipation = await prisma.participation.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
    });

    if (existingParticipation && existingParticipation.status === 'joined') {
      return res.status(409).json({ error: 'Already joined this event' });
    }

    // Create waiting list entry
    const entry = await prisma.waitingListEntry.create({
      data: {
        eventId: id,
        userId,
        status: 'waiting',
      },
    });

    // Calculate position
    const position = await prisma.waitingListEntry.count({
      where: {
        eventId: id,
        status: { in: ['waiting', 'offered'] },
        createdAt: { lte: entry.createdAt },
      },
    });

    res.json({
      id: entry.id,
      eventId: entry.eventId,
      position,
      status: entry.status,
      joinedAt: entry.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('[Events] POST /:id/waiting-list error:', error);
    res.status(500).json({ error: 'Failed to join waiting list' });
  }
});

// DELETE /api/v1/events/:id/waiting-list - выйти из очереди ожидания
router.delete('/:id/waiting-list', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;

    const entry = await prisma.waitingListEntry.findFirst({
      where: {
        eventId: id,
        userId,
        status: { in: ['waiting', 'offered'] },
      },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Not in waiting list' });
    }

    await prisma.waitingListEntry.update({
      where: { id: entry.id },
      data: { status: 'canceled' },
    });

    res.json({ status: 'canceled' });
  } catch (error) {
    console.error('[Events] DELETE /:id/waiting-list error:', error);
    res.status(500).json({ error: 'Failed to leave waiting list' });
  }
});

// POST /api/v1/waiting-list/:id/accept - принять предложение места
router.post('/waiting-list/:entryId/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const userId = req.auth!.userId;

    const entry = await prisma.waitingListEntry.findUnique({
      where: { id: entryId },
      include: { event: true },
    });

    if (!entry || entry.userId !== userId) {
      return res.status(404).json({ error: 'Waiting list entry not found' });
    }

    if (entry.status !== 'offered') {
      return res.status(400).json({ error: 'No active offer' });
    }

    const now = new Date();

    // Check if offer expired
    if (entry.offerExpiresAt && entry.offerExpiresAt < now) {
      await prisma.waitingListEntry.update({
        where: { id: entryId },
        data: { status: 'expired' },
      });
      // Выдаём offer следующему
      await offerNextInQueue(entry.eventId);
      return res.status(400).json({ error: 'Offer expired' });
    }

    // Check if event already started (нельзя принять offer после начала события)
    if (entry.event.startAt <= now) {
      await prisma.waitingListEntry.update({
        where: { id: entryId },
        data: { status: 'expired' },
      });
      // Выдаём offer следующему
      await offerNextInQueue(entry.eventId);
      return res.status(400).json({ error: 'Event already started, cannot accept offer' });
    }

    // Schedule conflict rule
    const conflict = await hasScheduleConflict({
      userId,
      targetEventId: entry.eventId,
      targetStartAt: entry.event.startAt,
      targetDurationMin: entry.event.durationMin,
      targetEndAt: entry.event.endAt,
    });
    if (conflict.conflict) {
      return res.status(409).json({
        error: 'Schedule conflict',
        message: `Нельзя принять место: между событиями должно быть минимум ${SCHEDULE_GAP_MINUTES} минут`,
        conflictingEventId: conflict.conflictingEventId,
      });
    }

    // Accept with capacity re-check in transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Re-check capacity inside transaction
      const event = await tx.event.findUnique({
        where: { id: entry.eventId },
        include: {
          _count: {
            select: { participations: { where: { status: 'joined' } } },
          },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Check if still has capacity
      if (event.capacity && event._count.participations >= event.capacity) {
        // No capacity - expire the offer and try next
        await tx.waitingListEntry.update({
          where: { id: entryId },
          data: { status: 'expired' },
        });
        return { success: false, reason: 'full' };
      }

      // Update waiting list entry
      await tx.waitingListEntry.update({
        where: { id: entryId },
        data: { status: 'accepted' },
      });

      // Create or update participation (upsert to handle edge cases)
      await tx.participation.upsert({
        where: { eventId_userId: { eventId: entry.eventId, userId } },
        update: {
          status: 'joined',
          joinedAt: now,
          canceledAt: null,
        },
        create: {
          eventId: entry.eventId,
          userId,
          status: 'joined',
        },
      });

      return { success: true };
    });

    if (!result.success) {
      // Offer next in queue since this one failed
      await offerNextInQueue(entry.eventId);
      return res.status(409).json({ error: 'Event is now full, offer expired' });
    }

    await syncCrmParticipantForEvent({
      eventId: entry.eventId,
      userId,
      status: 'booked',
    });

    res.json({
      status: 'accepted',
      eventId: entry.eventId,
    });
  } catch (error) {
    console.error('[Events] POST /waiting-list/:id/accept error:', error);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

// POST /api/v1/waiting-list/:id/decline - отклонить предложение места
router.post('/waiting-list/:entryId/decline', requireAuth, async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const userId = req.auth!.userId;

    const entry = await prisma.waitingListEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry || entry.userId !== userId) {
      return res.status(404).json({ error: 'Waiting list entry not found' });
    }

    if (entry.status !== 'offered') {
      return res.status(400).json({ error: 'No active offer to decline' });
    }

    await prisma.waitingListEntry.update({
      where: { id: entryId },
      data: { status: 'canceled' },
    });

    // Выдаём offer следующему в очереди
    await offerNextInQueue(entry.eventId);

    res.json({ status: 'declined' });
  } catch (error) {
    console.error('[Events] POST /waiting-list/:id/decline error:', error);
    res.status(500).json({ error: 'Failed to decline offer' });
  }
});

// POST /api/v1/events/:id/attended - подтвердить посещение события
// Правила:
// - Событие должно быть в статусе 'finished'
// - Подтверждение возможно только в течение 24 часов после окончания события
const ATTENDANCE_WINDOW_HOURS = 24;

router.post('/:id/attended', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;
    const { attended } = req.body;

    if (attended !== true) {
      return res.status(400).json({ error: 'attended must be true' });
    }

    // Find participation with event
    const participation = await prisma.participation.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
      include: { event: true },
    });

    if (!participation) {
      return res.status(404).json({ error: 'Participation not found' });
    }

    if (participation.status === 'attended') {
      return res.json({ status: 'attended', message: 'Already marked as attended' });
    }

    if (participation.status !== 'joined') {
      return res.status(400).json({ error: `Cannot mark as attended: current status is ${participation.status}` });
    }

    const event = participation.event;
    const now = new Date();

    // Calculate event end time
    const eventEndAt = event.endAt || (event.durationMin 
      ? new Date(event.startAt.getTime() + event.durationMin * 60 * 1000)
      : event.startAt);

    // Check 1: Event must be finished
    if (event.status !== 'finished') {
      return res.status(400).json({ 
        error: 'Event not finished yet',
        message: 'Подтверждение посещения доступно только после завершения события организатором',
        eventStatus: event.status,
      });
    }

    // Check 2: Must be within attendance window (24 hours after event end)
    const windowEnd = new Date(eventEndAt.getTime() + ATTENDANCE_WINDOW_HOURS * 60 * 60 * 1000);
    
    if (now > windowEnd) {
      return res.status(400).json({ 
        error: 'Attendance window expired',
        message: `Окно подтверждения посещения истекло (${ATTENDANCE_WINDOW_HOURS} часов после окончания события)`,
        windowExpiredAt: windowEnd.toISOString(),
      });
    }

    // Update participation
    await prisma.participation.update({
      where: { id: participation.id },
      data: {
        status: 'attended',
        attendedAt: now,
      },
    });

    await syncCrmParticipantForEvent({
      eventId: id,
      userId,
      status: 'attended',
    });

    // Trigger gamification hooks (points, challenge progress, status)
    await onParticipationAttended(userId, id);

    res.json({
      status: 'attended',
      eventId: id,
      message: 'Посещение подтверждено! Баллы начислены.',
    });
  } catch (error) {
    console.error('[Events] POST /:id/attended error:', error);
    res.status(500).json({ error: 'Failed to mark as attended' });
  }
});

// POST /api/v1/events/:id/check-in - отметка участия по QR/коду события
// Окно: -30 минут до старта ... +3 часа после окончания
router.post('/:id/check-in', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

    if (!code && !token) {
      return res.status(400).json({ error: 'code or token is required' });
    }

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        durationMin: true,
        checkInTokenHash: true,
        checkInCode: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status === 'finished' || event.status === 'canceled') {
      return res.status(400).json({
        error: 'Check-in closed',
        message: 'Организатор завершил событие. Чек-ин закрыт.',
        eventStatus: event.status,
      });
    }

    const now = new Date();
    const endAt = calculateEventEndAt(event.startAt, event.durationMin, event.endAt);
    const availableFrom = new Date(event.startAt.getTime() - 30 * 60 * 1000);
    const expiresAt = new Date(endAt.getTime() + 3 * 60 * 60 * 1000);
    if (now < availableFrom || now > expiresAt) {
      return res.status(400).json({
        error: 'Check-in window closed',
        message: 'Отметка доступна за 30 минут до старта и в течение 3 часов после окончания события.',
        availableFrom: availableFrom.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
    }

    const participation = await prisma.participation.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
    });
    if (!participation) {
      return res.status(404).json({ error: 'Participation not found' });
    }
    if (participation.status === 'attended') {
      return res.json({ ok: true, status: 'attended', message: 'Already checked in' });
    }
    if (participation.status !== 'joined') {
      return res.status(400).json({ error: `Cannot check in: current status is ${participation.status}` });
    }

    const tokenOk = token && event.checkInTokenHash ? hashOpaqueToken(token) === event.checkInTokenHash : false;
    const codeOk = code && event.checkInCode ? code === event.checkInCode : false;
    if (!tokenOk && !codeOk) {
      return res.status(400).json({ error: 'Invalid check-in code' });
    }

    await prisma.participation.update({
      where: { id: participation.id },
      data: { status: 'attended', attendedAt: now },
    });

    await syncCrmParticipantForEvent({ eventId: id, userId, status: 'attended' });
    await onParticipationAttended(userId, id);

    return res.json({ ok: true, status: 'attended', eventId: id, message: 'Посещение отмечено!' });
  } catch (error) {
    console.error('[Events] POST /:id/check-in error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// ============================================
// PRIVATE EVENT ACCESS ENDPOINTS
// ============================================

// POST /api/v1/events/private/resolve - получить доступ к приватному событию по коду
router.post('/private/resolve', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Введите код приглашения' });
    }

    const event = await prisma.event.findFirst({
      where: {
        inviteCode: code.toUpperCase(),
        visibility: 'private',
      },
      include: {
        organizer: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Событие не найдено. Проверьте код.' });
    }

    // Grant access (upsert to avoid duplicates)
    await prisma.eventAccess.upsert({
      where: {
        eventId_userId: { eventId: event.id, userId },
      },
      update: {},
      create: {
        eventId: event.id,
        userId,
        grantedBy: 'code',
      },
    });

    res.json({
      eventId: event.id,
      title: event.title,
      organizer: event.organizer.name || 'Организатор',
      startAt: event.startAt.toISOString(),
      status: event.status,
      message: 'Доступ получен!',
    });
  } catch (error) {
    console.error('[Events] POST /private/resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve invite code' });
  }
});

// GET /api/v1/events/invite/:token - получить доступ к приватному событию по ссылке
router.get('/invite/:token', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { token } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        inviteLinkToken: token,
        visibility: 'private',
      },
      include: {
        organizer: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Ссылка недействительна или событие удалено' });
    }

    // Grant access
    await prisma.eventAccess.upsert({
      where: {
        eventId_userId: { eventId: event.id, userId },
      },
      update: {},
      create: {
        eventId: event.id,
        userId,
        grantedBy: 'link',
      },
    });

    res.json({
      eventId: event.id,
      title: event.title,
      organizer: event.organizer.name || 'Организатор',
      startAt: event.startAt.toISOString(),
      status: event.status,
      message: 'Доступ получен!',
    });
  } catch (error) {
    console.error('[Events] GET /invite/:token error:', error);
    res.status(500).json({ error: 'Failed to resolve invite link' });
  }
});

// POST /api/v1/events/:id/review - оставить отзыв о событии
router.post('/:id/review', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user attended this event
    const participation = await prisma.participation.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
    });

    if (!participation || participation.status !== 'attended') {
      return res.status(403).json({ error: 'You must attend the event before leaving a review' });
    }

    // Check if already reviewed
    const existingReview = await prisma.review.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
    });

    if (existingReview) {
      return res.status(409).json({ error: 'You have already reviewed this event' });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        eventId: id,
        userId,
        rating,
        comment: comment || null,
      },
    });

    // Trigger gamification hooks (points for review)
    await onReviewCreated(userId, review.id, id);

    res.status(201).json({
      id: review.id,
      eventId: review.eventId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      message: 'Отзыв сохранён! Баллы начислены.',
    });
  } catch (error) {
    console.error('[Events] POST /:id/review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

export { router as eventsRouter };
