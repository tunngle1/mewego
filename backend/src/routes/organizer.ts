import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth';
import { getUserEntitlements } from './subscriptions';
import { createOpaqueToken, hashOpaqueToken } from '../services/tokenService';

// Generate a random invite code (6 alphanumeric chars)
const generateInviteCode = (): string => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Generate a random invite link token (32 chars)
const generateInviteLinkToken = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

const router = Router();
const prisma = new PrismaClient();
const OCCUPIED_PARTICIPATION_STATUSES = ['joined', 'attended', 'no_show'] as const;

const CHECK_IN_BEFORE_START_MINUTES = 30;
const CHECK_IN_AFTER_END_HOURS = 3;

const generateCheckInCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const calculateEventEndAt = (params: { startAt: Date; durationMin: number | null; endAt: Date | null }) => {
  if (params.endAt) return params.endAt;
  if (typeof params.durationMin === 'number' && params.durationMin > 0) {
    return new Date(params.startAt.getTime() + params.durationMin * 60 * 1000);
  }
  return params.startAt;
};

const getCheckInWindow = (event: { startAt: Date; durationMin: number | null; endAt: Date | null }) => {
  const endAt = calculateEventEndAt({ startAt: event.startAt, durationMin: event.durationMin, endAt: event.endAt });
  const availableFrom = new Date(event.startAt.getTime() - CHECK_IN_BEFORE_START_MINUTES * 60 * 1000);
  const expiresAt = new Date(endAt.getTime() + CHECK_IN_AFTER_END_HOURS * 60 * 60 * 1000);
  return { availableFrom, expiresAt, endAt };
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

const syncCrmParticipantStatusForEvent = async (params: {
  eventId: string;
  userId: string;
  organizerId: string;
  status: string;
}) => {
  const { eventId, userId, organizerId, status } = params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      crmSession: { select: { id: true } },
    },
  });

  if (!event?.crmSession) {
    return;
  }

  const participant = await prisma.trainerSessionParticipant.findFirst({
    where: {
      sessionId: event.crmSession.id,
      userId,
    },
  });

  if (!participant) {
    return;
  }

  await prisma.trainerSessionParticipant.update({
    where: { id: participant.id },
    data: {
      status:
        status === 'attended'
          ? 'attended'
          : status === 'canceled'
            ? 'cancelled'
            : status === 'no_show'
              ? 'no_show'
              : 'booked',
      attendedAt: status === 'attended' ? new Date() : undefined,
      cancelledAt: status === 'canceled' ? new Date() : undefined,
      attendanceMarkedBy: status === 'attended' || status === 'no_show' ? organizerId : undefined,
    },
  });
};

// GET /api/v1/organizer/events - список событий организатора
router.get('/events', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const organizerId = req.auth!.userId;

    const events = await prisma.event.findMany({
      where: { organizerId },
      include: {
        _count: {
          select: {
            participations: {
              where: { status: { in: [...OCCUPIED_PARTICIPATION_STATUSES] } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingEditRequests = await prisma.eventEditRequest.findMany({
      where: {
        organizerId,
        status: 'pending',
        eventId: { in: events.map((e) => e.id) },
      },
      select: { eventId: true },
      take: 500,
    });
    const pendingEditEventIdSet = new Set(pendingEditRequests.map((r) => r.eventId));

    const eventIds = events.map((e) => e.id);
    const participations = await prisma.participation.findMany({
      where: {
        eventId: { in: eventIds },
        status: { in: ['joined', 'attended', 'canceled', 'no_show'] },
      },
      select: {
        eventId: true,
        status: true,
      },
    });

    const countsByEventId: Record<
      string,
      { joined: number; attended: number; canceled: number; no_show: number }
    > = {};
    for (const p of participations) {
      if (!countsByEventId[p.eventId]) {
        countsByEventId[p.eventId] = { joined: 0, attended: 0, canceled: 0, no_show: 0 };
      }
      if (p.status === 'joined') countsByEventId[p.eventId].joined++;
      if (p.status === 'attended') countsByEventId[p.eventId].attended++;
      if (p.status === 'canceled') countsByEventId[p.eventId].canceled++;
      if (p.status === 'no_show') countsByEventId[p.eventId].no_show++;
    }

    const result = events.map((event) => {
      const counts = countsByEventId[event.id] || { joined: 0, attended: 0, canceled: 0, no_show: 0 };
      const joinedCount = counts.joined + counts.attended + counts.no_show;
      const attendedCount = counts.attended;
      const canceledCount = counts.canceled;

      const revenueTotal =
        event.priceType === 'fixed' && typeof event.priceValue === 'number'
          ? event.priceValue * joinedCount
          : 0;

      return {
      id: event.id,
      organizerId: event.organizerId,
      title: event.title,
      description: event.description,
      movementType: event.movementType,
      level: event.level,
      startAt: event.startAt.toISOString(),
      durationMin: event.durationMin,
      locationName: event.locationName,
      locationAddress: event.locationAddress,
      locationType: event.locationType,
      lat: event.lat,
      lng: event.lng,
      capacity: event.capacity,
      priceType: event.priceType,
      priceValue: event.priceValue,
      paymentInstructions: event.paymentInstructions,
      status: event.status,
      hasPendingEditRequest: pendingEditEventIdSet.has(event.id),
      visibility: event.visibility,
      inviteCode: event.inviteCode,
      inviteLinkToken: event.inviteLinkToken,
      participantsJoinedCount: joinedCount,
      participantsAttendedCount: attendedCount,
      participantsCanceledCount: canceledCount,
      revenueTotal,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      };
    });

    res.json(result);
  } catch (error) {
    console.error('[Organizer] GET /events error:', error);
    res.status(500).json({ error: 'Failed to fetch organizer events' });
  }
});

// GET /api/v1/organizer/events/:id - детали события организатора
router.get('/events/:id', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizerId = req.auth!.userId;

    const event = await prisma.event.findFirst({
      where: { id, organizerId },
      include: {
        _count: {
          select: {
            participations: {
              where: { status: { in: [...OCCUPIED_PARTICIPATION_STATUSES] } },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({
      id: event.id,
      organizerId: event.organizerId,
      title: event.title,
      description: event.description,
      movementType: event.movementType,
      level: event.level,
      startAt: event.startAt.toISOString(),
      durationMin: event.durationMin,
      locationName: event.locationName,
      locationAddress: event.locationAddress,
      locationType: event.locationType,
      lat: event.lat,
      lng: event.lng,
      capacity: event.capacity,
      priceType: event.priceType,
      priceValue: event.priceValue,
      paymentInstructions: event.paymentInstructions,
      status: event.status,
      visibility: event.visibility,
      inviteCode: event.inviteCode,
      inviteLinkToken: event.inviteLinkToken,
      participantsJoinedCount: event._count.participations,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Organizer] GET /events/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/v1/organizer/events - создать событие (статус pending)
router.post('/events', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const organizerId = req.auth!.userId;
    await ensureUserExists(organizerId, req.auth!.role);
    const {
      title,
      description,
      movementType,
      level,
      startAt,
      durationMin,
      locationName,
      locationAddress,
      locationType,
      lat,
      lng,
      capacity,
      priceType,
      priceValue,
      paymentInstructions,
      visibility,
      inviteCode: customInviteCode,
    } = req.body;

    // ГЕЙТ: платные события только для organizer_999 (по TZ.md)
    // Сейчас: по запросу отключаем гейт флагом, и всегда пропускаем admin/superadmin.
    const disableSubscriptionGates = process.env.DISABLE_SUBSCRIPTION_GATES === 'true';
    const isPrivilegedRole = req.auth!.role === 'admin' || req.auth!.role === 'superadmin';
    if (!disableSubscriptionGates && !isPrivilegedRole && priceType && priceType !== 'free') {
      const entitlements = await getUserEntitlements(organizerId, req.auth!.role);
      if (!entitlements.canCreatePaidEvents) {
        return res.status(403).json({
          error: 'Subscription required',
          message: 'Платные события доступны только с подпиской организатора',
          requiredFeature: 'paid_events',
        });
      }
    }

    // Private event setup
    const isPrivate = visibility === 'private';
    let inviteCode: string | null = null;
    let inviteLinkToken: string | null = null;

    if (isPrivate) {
      // Use custom code or generate one
      inviteCode = customInviteCode?.toUpperCase() || generateInviteCode();
      inviteLinkToken = generateInviteLinkToken();

      // Ensure code is unique
      const existingCode = await prisma.event.findFirst({ where: { inviteCode } });
      if (existingCode) {
        inviteCode = generateInviteCode(); // regenerate if collision
      }
    }

    const event = await prisma.event.create({
      data: {
        organizerId,
        title,
        description,
        movementType: movementType || 'other',
        level: level || 'novice',
        startAt: new Date(startAt),
        durationMin,
        locationName: locationName || 'Не указано',
        locationAddress,
        locationType: locationType || 'public_place',
        lat: typeof lat === 'number' ? lat : lat ? Number(lat) : undefined,
        lng: typeof lng === 'number' ? lng : lng ? Number(lng) : undefined,
        capacity,
        priceType: priceType || 'free',
        priceValue,
        paymentInstructions,
        visibility: isPrivate ? 'private' : 'public',
        inviteCode,
        inviteLinkToken,
        status: 'pending', // всегда pending при создании
      },
    });

    // Возвращаем полный payload как в GET /organizer/events,
    // чтобы мобильное приложение могло сразу отрисовать событие в списке.
    res.status(201).json({
      id: event.id,
      organizerId: event.organizerId,
      title: event.title,
      description: event.description,
      movementType: event.movementType,
      level: event.level,
      startAt: event.startAt.toISOString(),
      durationMin: event.durationMin,
      locationName: event.locationName,
      locationAddress: event.locationAddress,
      locationType: event.locationType,
      lat: event.lat,
      lng: event.lng,
      capacity: event.capacity,
      priceType: event.priceType,
      priceValue: event.priceValue,
      paymentInstructions: event.paymentInstructions,
      status: event.status,
      visibility: event.visibility,
      inviteCode: event.inviteCode,
      inviteLinkToken: event.inviteLinkToken,
      participantsJoinedCount: 0,
      participantsAttendedCount: 0,
      participantsCanceledCount: 0,
      revenueTotal: 0,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Organizer] POST /events error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PATCH /api/v1/organizer/events/:id - редактировать событие
router.patch('/events/:id', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizerId = req.auth!.userId;

    const existing = await prisma.event.findFirst({
      where: { id, organizerId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Нельзя редактировать canceled/finished
    if (['canceled', 'finished'].includes(existing.status)) {
      return res.status(400).json({ error: 'Cannot edit canceled or finished event' });
    }

    const EDIT_TIME_CHANGE_LOCK_HOURS = 24;

    const {
      title,
      description,
      movementType,
      level,
      startAt,
      durationMin,
      locationName,
      locationAddress,
      locationType,
      lat,
      lng,
      capacity,
      priceType,
      priceValue,
      paymentInstructions,
      visibility,
      inviteCode: customInviteCode,
    } = req.body;

    const wantsPrivate = visibility ? visibility === 'private' : existing.visibility === 'private';
    let inviteCode: string | null | undefined = undefined;
    let inviteLinkToken: string | null | undefined = undefined;

    if (visibility) {
      if (wantsPrivate) {
        inviteCode = customInviteCode?.toUpperCase() || existing.inviteCode || generateInviteCode();
        if (!existing.inviteLinkToken) {
          inviteLinkToken = generateInviteLinkToken();
        }

        const existingCode = await prisma.event.findFirst({
          where: {
            inviteCode,
            NOT: { id },
          },
        });
        if (existingCode) {
          inviteCode = generateInviteCode();
        }
      } else {
        inviteCode = null;
        inviteLinkToken = null;
      }
    } else if (existing.visibility === 'private' && customInviteCode) {
      inviteCode = customInviteCode.toUpperCase();
      const existingCode = await prisma.event.findFirst({
        where: {
          inviteCode,
          NOT: { id },
        },
      });
      if (existingCode) {
        inviteCode = generateInviteCode();
      }
    }

    const shouldRemoderate =
      (existing.status === 'approved' || existing.status === 'rejected') &&
      [
        'title',
        'description',
        'movementType',
        'level',
        'startAt',
        'durationMin',
        'locationName',
        'locationAddress',
        'locationType',
        'capacity',
        'priceType',
        'priceValue',
        'paymentInstructions',
        'visibility',
        'inviteCode',
      ].some((k) => Object.prototype.hasOwnProperty.call(req.body, k));

    // If event is already approved, we create an edit request for admin review.
    // Users continue to see old data until admin approves.
    if (existing.status === 'approved' && shouldRemoderate) {
      // If there are joined participants and startAt is being changed within 24h window, block.
      if (startAt) {
        const now = new Date();
        const existingStartAt = new Date(existing.startAt);
        const diffHours = (existingStartAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (diffHours <= EDIT_TIME_CHANGE_LOCK_HOURS) {
          const joinedCount = await prisma.participation.count({
            where: { eventId: id, status: 'joined' },
          });
          if (joinedCount > 0) {
            return res.status(400).json({
              error: 'Cannot change start time within 24h when participants are joined',
              message: `Нельзя менять время менее чем за ${EDIT_TIME_CHANGE_LOCK_HOURS} часа(ов) до начала, если уже есть записавшиеся участники`,
            });
          }
        }
      }

      // Build AFTER snapshot using current event + requested changes
      const wantsPrivateForSnapshot = visibility ? visibility === 'private' : existing.visibility === 'private';
      const afterSnapshot: any = {
        id: existing.id,
        organizerId: existing.organizerId,
        title: title ?? existing.title,
        description: description ?? existing.description,
        movementType: movementType ?? existing.movementType,
        level: level ?? existing.level,
        startAt: startAt ? new Date(startAt).toISOString() : existing.startAt.toISOString(),
        durationMin: durationMin ?? existing.durationMin,
        locationName: locationName ?? existing.locationName,
        locationAddress: Object.prototype.hasOwnProperty.call(req.body, 'locationAddress')
          ? locationAddress
          : existing.locationAddress,
        locationType: locationType ?? existing.locationType,
        lat: Object.prototype.hasOwnProperty.call(req.body, 'lat')
          ? lat === null
            ? null
            : typeof lat === 'number'
              ? lat
              : lat
                ? Number(lat)
                : undefined
          : existing.lat,
        lng: Object.prototype.hasOwnProperty.call(req.body, 'lng')
          ? lng === null
            ? null
            : typeof lng === 'number'
              ? lng
              : lng
                ? Number(lng)
                : undefined
          : existing.lng,
        capacity: Object.prototype.hasOwnProperty.call(req.body, 'capacity') ? capacity : existing.capacity,
        priceType: priceType ?? existing.priceType,
        priceValue: Object.prototype.hasOwnProperty.call(req.body, 'priceValue') ? priceValue : existing.priceValue,
        paymentInstructions: Object.prototype.hasOwnProperty.call(req.body, 'paymentInstructions')
          ? paymentInstructions
          : existing.paymentInstructions,
        visibility: visibility ? (wantsPrivateForSnapshot ? 'private' : 'public') : existing.visibility,
        inviteCode: customInviteCode
          ? customInviteCode.toUpperCase()
          : existing.inviteCode,
      };

      const beforeSnapshot: any = {
        id: existing.id,
        organizerId: existing.organizerId,
        title: existing.title,
        description: existing.description,
        movementType: existing.movementType,
        level: existing.level,
        startAt: existing.startAt.toISOString(),
        durationMin: existing.durationMin,
        locationName: existing.locationName,
        locationAddress: existing.locationAddress,
        locationType: existing.locationType,
        lat: existing.lat,
        lng: existing.lng,
        capacity: existing.capacity,
        priceType: existing.priceType,
        priceValue: existing.priceValue,
        paymentInstructions: existing.paymentInstructions,
        visibility: existing.visibility,
        inviteCode: existing.inviteCode,
      };

      const created = await prisma.eventEditRequest.create({
        data: {
          eventId: id,
          organizerId,
          status: 'pending',
          beforeSnapshot: JSON.stringify(beforeSnapshot),
          afterSnapshot: JSON.stringify(afterSnapshot),
        },
      });

      return res.json({
        ok: true,
        mode: 'edit_request',
        requestId: created.id,
        status: 'pending',
        message: 'Изменения отправлены на модерацию. Участники увидят изменения после одобрения администратором.',
      });
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        movementType,
        level,
        startAt: startAt ? new Date(startAt) : undefined,
        durationMin,
        locationName,
        locationAddress,
        locationType,
        lat: lat === null ? null : typeof lat === 'number' ? lat : lat ? Number(lat) : undefined,
        lng: lng === null ? null : typeof lng === 'number' ? lng : lng ? Number(lng) : undefined,
        capacity,
        priceType,
        priceValue,
        paymentInstructions,
        visibility: visibility ? (wantsPrivate ? 'private' : 'public') : undefined,
        inviteCode,
        inviteLinkToken,
        status: shouldRemoderate ? 'pending' : undefined,
      },
      include: {
        _count: {
          select: {
            participations: {
              where: { status: { in: [...OCCUPIED_PARTICIPATION_STATUSES] } },
            },
          },
        },
      },
    });

    const participationCounts = await prisma.participation.findMany({
      where: {
        eventId: id,
        status: { in: ['joined', 'attended', 'canceled', 'no_show'] },
      },
      select: { status: true },
    });

    let joinedCount = 0;
    let attendedCount = 0;
    let canceledCount = 0;
    for (const p of participationCounts) {
      if (p.status === 'joined' || p.status === 'attended' || p.status === 'no_show') joinedCount++;
      if (p.status === 'attended') attendedCount++;
      if (p.status === 'canceled') canceledCount++;
    }

    const revenueTotal =
      event.priceType === 'fixed' && typeof event.priceValue === 'number' ? event.priceValue * joinedCount : 0;

    res.json({
      id: event.id,
      organizerId: event.organizerId,
      title: event.title,
      description: event.description,
      movementType: event.movementType,
      level: event.level,
      startAt: event.startAt.toISOString(),
      durationMin: event.durationMin,
      locationName: event.locationName,
      locationAddress: event.locationAddress,
      locationType: event.locationType,
      lat: event.lat,
      lng: event.lng,
      capacity: event.capacity,
      priceType: event.priceType,
      priceValue: event.priceValue,
      paymentInstructions: event.paymentInstructions,
      status: event.status,
      visibility: event.visibility,
      inviteCode: event.inviteCode,
      inviteLinkToken: event.inviteLinkToken,
      participantsJoinedCount: joinedCount,
      participantsAttendedCount: attendedCount,
      participantsCanceledCount: canceledCount,
      revenueTotal,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Organizer] PATCH /events/:id error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// POST /api/v1/organizer/events/:id/cancel - отменить событие
router.post('/events/:id/cancel', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizerId = req.auth!.userId;

    const existing = await prisma.event.findFirst({
      where: { id, organizerId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (['canceled', 'finished'].includes(existing.status)) {
      return res.status(400).json({ error: 'Event already canceled or finished' });
    }

    const event = await prisma.event.update({
      where: { id },
      data: { status: 'canceled' },
    });

    res.json({
      id: event.id,
      status: event.status,
    });
  } catch (error) {
    console.error('[Organizer] POST /events/:id/cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel event' });
  }
});

// GET /api/v1/organizer/events/:id/participants - список участников
router.get('/events/:id/participants', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizerId = req.auth!.userId;

    const event = await prisma.event.findFirst({
      where: { id, organizerId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const participations = await prisma.participation.findMany({
      where: { eventId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // Получаем историю участий каждого пользователя у этого организатора
    const userIds = participations.map((p) => p.userId);
    const previousParticipations = await prisma.participation.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        event: { organizerId },
        status: { in: ['joined', 'attended'] },
      },
      _count: true,
    });

    const repeatMap: Record<string, number> = {};
    previousParticipations.forEach((p) => {
      repeatMap[p.userId] = p._count;
    });

    const result = participations.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user.name || 'Участник',
      avatarUrl: p.user.avatarUrl,
      userName: p.user.name || 'Участник',
      userAvatar: p.user.avatarUrl,
      status: p.status,
      joinedAt: p.joinedAt.toISOString(),
      canceledAt: p.canceledAt?.toISOString(),
      attendedAt: p.attendedAt?.toISOString(),
      isRepeat: (repeatMap[p.userId] || 0) > 1,
    }));

    res.json(result);
  } catch (error) {
    console.error('[Organizer] GET /events/:id/participants error:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// GET /api/v1/organizer/events/:id/check-in - QR+код для отметки участников
router.get('/events/:id/check-in', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizerId = req.auth!.userId;

    const event = await prisma.event.findFirst({
      where: { id, organizerId },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        durationMin: true,
        status: true,
        checkInTokenHash: true,
        checkInCode: true,
        checkInIssuedAt: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const now = new Date();
    const window = getCheckInWindow({ startAt: event.startAt, durationMin: event.durationMin, endAt: event.endAt });
    const active = now >= window.availableFrom && now <= window.expiresAt;

    if (event.status === 'finished' || event.status === 'canceled') {
      return res.json({
        ok: true,
        eventId: event.id,
        title: event.title,
        active: false,
        availableFrom: window.availableFrom.toISOString(),
        expiresAt: window.expiresAt.toISOString(),
        reason: 'Event is finished',
      });
    }

    if (!active) {
      return res.json({
        ok: true,
        eventId: event.id,
        title: event.title,
        active: false,
        availableFrom: window.availableFrom.toISOString(),
        expiresAt: window.expiresAt.toISOString(),
      });
    }

    let code = event.checkInCode;
    let tokenHash = event.checkInTokenHash;

    if (!code || !tokenHash) {
      const token = createOpaqueToken(32);
      tokenHash = hashOpaqueToken(token);
      code = generateCheckInCode();

      await prisma.event.update({
        where: { id: event.id },
        data: {
          checkInTokenHash: tokenHash,
          checkInCode: code,
          checkInIssuedAt: now,
          endAt: event.endAt || window.endAt,
        },
      });
    }

    // MVP: QR содержит код события (без длинного токена), валидный только в окне чек-ина.
    const qrPayload = JSON.stringify({ type: 'event_checkin', eventId: event.id, code });

    return res.json({
      ok: true,
      eventId: event.id,
      title: event.title,
      active: true,
      availableFrom: window.availableFrom.toISOString(),
      expiresAt: window.expiresAt.toISOString(),
      code,
      qrPayload,
    });
  } catch (error) {
    console.error('[Organizer] GET /events/:id/check-in error:', error);
    res.status(500).json({ error: 'Failed to get check-in details' });
  }
});

// PATCH /api/v1/organizer/events/:eventId/participants/:participantId - обновить статус участника
router.patch('/events/:eventId/participants/:participantId', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const { eventId, participantId } = req.params;
    const organizerId = req.auth!.userId;
    const { status, note } = req.body;

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // SECURITY FIX: verify that participation belongs to this event
    const participation = await prisma.participation.findUnique({
      where: { id: participantId },
    });

    if (!participation || participation.eventId !== eventId) {
      return res.status(404).json({ error: 'Participant not found in this event' });
    }

    const updateData: any = { status };
    if (status === 'attended') {
      updateData.attendedAt = new Date();
    } else if (status === 'canceled') {
      updateData.canceledAt = new Date();
    }

    const updatedParticipation = await prisma.participation.update({
      where: { id: participantId },
      data: updateData,
    });

    await syncCrmParticipantStatusForEvent({
      eventId,
      userId: participation.userId,
      organizerId,
      status: updatedParticipation.status,
    });

    res.json({
      id: updatedParticipation.id,
      status: updatedParticipation.status,
      attendedAt: updatedParticipation.attendedAt?.toISOString(),
      canceledAt: updatedParticipation.canceledAt?.toISOString(),
    });
  } catch (error) {
    console.error('[Organizer] PATCH /events/:eventId/participants/:participantId error:', error);
    res.status(500).json({ error: 'Failed to update participant status' });
  }
});

// GET /api/v1/organizer/stats - статистика организатора
router.get('/stats', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const organizerId = req.auth!.userId;

    const events = await prisma.event.findMany({
      where: { organizerId },
      include: {
        participations: true,
        reviews: true,
      },
    });

    const now = new Date();
    const totalEventsCreated = events.length;
    const eventsHosted = events.filter(e => e.status === 'finished' || (e.startAt < now && e.status === 'approved')).length;
    const upcomingEvents = events.filter(e => e.startAt > now && e.status === 'approved').length;

    let totalParticipants = 0;
    let attendedCount = 0;
    let noShowCount = 0;
    const attendeeIds = new Set<string>();
    const repeatAttendeeIds = new Set<string>();

    events.forEach(event => {
      event.participations.forEach(p => {
        totalParticipants++;
        if (p.status === 'attended') {
          attendedCount++;
          if (attendeeIds.has(p.userId)) {
            repeatAttendeeIds.add(p.userId);
          }
          attendeeIds.add(p.userId);
        } else if (p.status === 'no_show') {
          noShowCount++;
        }
      });
    });

    const attendanceRate = totalParticipants > 0 ? Math.round((attendedCount / totalParticipants) * 100) : 0;
    const noShowRate = totalParticipants > 0 ? Math.round((noShowCount / totalParticipants) * 100) : 0;

    let ratingSum = 0;
    let ratingCount = 0;
    events.forEach(event => {
      event.reviews.forEach(r => {
        ratingSum += r.rating;
        ratingCount++;
      });
    });

    const ratingAvg = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

    res.json({
      totalEventsCreated,
      eventsHosted,
      upcomingEvents,
      totalParticipants,
      attendanceRate,
      noShowRate,
      repeatAttendeesCount: repeatAttendeeIds.size,
      ratingAvg,
      ratingCount,
    });
  } catch (error) {
    console.error('[Organizer] GET /stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/v1/organizer/reviews - отзывы на события организатора
router.get('/reviews', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const organizerId = req.auth!.userId;

    const reviews = await prisma.review.findMany({
      where: {
        event: { organizerId },
      },
      include: {
        event: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = reviews.map(r => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.event.title,
      userId: r.userId,
      userName: r.user.name || 'Пользователь',
      userAvatar: r.user.avatarUrl,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    }));

    res.json(result);
  } catch (error) {
    console.error('[Organizer] GET /reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/v1/organizer/certificates - сертификаты организатора
router.get('/certificates', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const organizerId = req.auth!.userId;

    const certificates = await prisma.certificate.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(certificates.map(c => ({
      id: c.id,
      title: c.title,
      issuer: c.issuer,
      issuedAt: c.issuedAt?.toISOString(),
      assetUrl: c.assetUrl,
      verified: c.verified,
      createdAt: c.createdAt.toISOString(),
    })));
  } catch (error) {
    console.error('[Organizer] GET /certificates error:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

// POST /api/v1/organizer/certificates - добавить сертификат
router.post('/certificates', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const organizerId = req.auth!.userId;
    const { title, issuer, issuedAt, assetUrl } = req.body;

    // Ensure organizer profile exists
    const user = await prisma.user.findUnique({ where: { id: organizerId }, select: { name: true } });
    await prisma.organizerProfile.upsert({
      where: { userId: organizerId },
      update: {},
      create: {
        userId: organizerId,
        displayName: user?.name || 'Тренер',
      },
    });

    const certificate = await prisma.certificate.create({
      data: {
        organizerId,
        title,
        issuer,
        issuedAt: issuedAt ? new Date(issuedAt) : null,
        assetUrl,
      },
    });

    res.status(201).json({
      id: certificate.id,
      title: certificate.title,
      issuer: certificate.issuer,
      issuedAt: certificate.issuedAt?.toISOString(),
      assetUrl: certificate.assetUrl,
      verified: certificate.verified,
      createdAt: certificate.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('[Organizer] POST /certificates error:', error);
    res.status(500).json({ error: 'Failed to create certificate' });
  }
});

// DELETE /api/v1/organizer/certificates/:id - удалить сертификат
router.delete('/certificates/:id', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const organizerId = req.auth!.userId;
    const { id } = req.params;

    const certificate = await prisma.certificate.findFirst({
      where: { id, organizerId },
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    await prisma.certificate.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('[Organizer] DELETE /certificates/:id error:', error);
    res.status(500).json({ error: 'Failed to delete certificate' });
  }
});

// GET /api/v1/organizer/profile - профиль организатора (для редактирования)
router.get('/profile', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const organizerId = req.auth!.userId;

    let profile = await prisma.organizerProfile.findUnique({
      where: { userId: organizerId },
      include: { certificates: true },
    });

    if (!profile) {
      // Create default profile with user's name
      const user = await prisma.user.findUnique({ where: { id: organizerId }, select: { name: true } });
      profile = await prisma.organizerProfile.create({
        data: {
          userId: organizerId,
          displayName: user?.name || 'Тренер',
        },
        include: { certificates: true },
      });
    }

    res.json({
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      tags: profile.tags,
      city: profile.city,
      contactPhone: profile.contactPhone,
      contactTelegram: profile.contactTelegram,
      contactEmail: profile.contactEmail,
      paymentInfo: profile.paymentInfo,
      status: profile.status,
      certificates: profile.certificates.map(c => ({
        id: c.id,
        title: c.title,
        issuer: c.issuer,
        issuedAt: c.issuedAt?.toISOString(),
        assetUrl: c.assetUrl,
        verified: c.verified,
      })),
    });
  } catch (error) {
    console.error('[Organizer] GET /profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /api/v1/organizer/profile - обновить профиль организатора
router.patch('/profile', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const organizerId = req.auth!.userId;
    const { displayName, avatarUrl, bio, tags, city, contactPhone, contactTelegram, contactEmail, paymentInfo } = req.body;

    // Get user name for fallback
    const user = await prisma.user.findUnique({ where: { id: organizerId }, select: { name: true } });
    const defaultDisplayName = displayName || user?.name || 'Тренер';

    const profile = await prisma.organizerProfile.upsert({
      where: { userId: organizerId },
      update: {
        displayName,
        avatarUrl,
        bio,
        tags,
        city,
        contactPhone,
        contactTelegram,
        contactEmail,
        paymentInfo,
      },
      create: {
        userId: organizerId,
        displayName: defaultDisplayName,
        avatarUrl,
        bio,
        tags: tags || [],
        city,
        contactPhone,
        contactTelegram,
        contactEmail,
        paymentInfo,
      },
    });

    res.json({
      userId: profile.userId,
      displayName: profile.displayName,
      status: profile.status,
    });
  } catch (error) {
    console.error('[Organizer] PATCH /profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/v1/organizer/:id/public - публичный профиль организатора (для всех)
router.get('/:id/public', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const profile = await prisma.organizerProfile.findUnique({
      where: { userId: id },
      include: {
        certificates: true,
        user: {
          include: {
            events: {
              where: { status: { in: ['approved', 'finished'] } },
              include: {
                participations: { where: { status: 'attended' } },
                reviews: true,
              },
            },
          },
        },
      },
    });

    if (!profile || profile.status !== 'active') {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    const events = profile.user.events;
    const eventsHostedCount = events.filter(e => e.status === 'finished' || e.startAt < new Date()).length;
    
    let totalAttendeesCount = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    events.forEach(event => {
      totalAttendeesCount += event.participations.length;
      event.reviews.forEach(r => {
        ratingSum += r.rating;
        ratingCount++;
      });
    });

    const ratingAvg = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

    res.json({
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      tags: profile.tags,
      city: profile.city,
      contactTelegram: profile.contactTelegram,
      paymentInfo: profile.paymentInfo,
      ratingAvg,
      ratingCount,
      eventsHostedCount,
      totalAttendeesCount,
      certificates: profile.certificates.map(c => ({
        id: c.id,
        title: c.title,
        issuer: c.issuer,
        issuedAt: c.issuedAt?.toISOString(),
        assetUrl: c.assetUrl,
        verified: c.verified,
      })),
    });
  } catch (error) {
    console.error('[Organizer] GET /:id/public error:', error);
    res.status(500).json({ error: 'Failed to fetch public profile' });
  }
});

// GET /api/v1/organizer/:id/events - события организатора (публичные)
router.get('/:id/events', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { filter } = req.query; // upcoming | past

    const now = new Date();
    let dateFilter: any = {};

    if (filter === 'upcoming') {
      dateFilter = { startAt: { gte: now } };
    } else if (filter === 'past') {
      dateFilter = { startAt: { lt: now } };
    }

    const events = await prisma.event.findMany({
      where: {
        organizerId: id,
        status: { in: ['approved', 'finished'] },
        ...dateFilter,
      },
      include: {
        _count: {
          select: { participations: { where: { status: { in: [...OCCUPIED_PARTICIPATION_STATUSES] } } } },
        },
      },
      orderBy: { startAt: filter === 'past' ? 'desc' : 'asc' },
    });

    res.json(events.map(e => ({
      id: e.id,
      title: e.title,
      movementType: e.movementType,
      startAt: e.startAt.toISOString(),
      durationMin: e.durationMin,
      locationName: e.locationName,
      capacity: e.capacity,
      participantsCount: e._count.participations,
      priceType: e.priceType,
      priceValue: e.priceValue,
      status: e.status,
    })));
  } catch (error) {
    console.error('[Organizer] GET /:id/events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/v1/organizer/:id/reviews - отзывы на организатора (публичные)
router.get('/:id/reviews', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reviews = await prisma.review.findMany({
      where: {
        event: { organizerId: id },
      },
      include: {
        event: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(reviews.map(r => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.event.title,
      userId: r.userId,
      userName: r.user.name || 'Пользователь',
      userAvatar: r.user.avatarUrl,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (error) {
    console.error('[Organizer] GET /:id/reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/v1/organizer/events/:id/finish - завершить событие
router.post('/events/:id/finish', requireAuth, requireRole('organizer', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizerId = req.auth!.userId;

    const event = await prisma.event.findFirst({
      where: { id, organizerId },
      include: {
        _count: {
          select: {
            participations: { where: { status: { in: [...OCCUPIED_PARTICIPATION_STATUSES] } } },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'approved') {
      return res.status(400).json({ error: `Cannot finish event with status: ${event.status}` });
    }

    // Проверяем, что событие уже закончилось (endAt или startAt + durationMin)
    const now = new Date();
    const eventEndAt = event.endAt || (event.durationMin 
      ? new Date(event.startAt.getTime() + event.durationMin * 60 * 1000)
      : event.startAt);

    if (now < eventEndAt) {
      return res.status(400).json({ 
        error: 'Cannot finish event before it ends',
        message: 'Событие можно завершить только после окончания',
        endsAt: eventEndAt.toISOString(),
      });
    }

    // Транзакция: завершаем событие и закрываем waitlist
    await prisma.$transaction([
      // Обновляем статус события
      prisma.event.update({
        where: { id },
        data: { 
          status: 'finished',
          endAt: event.endAt || eventEndAt,
        },
      }),
      // Закрываем все записи в waitlist (waiting/offered -> canceled)
      prisma.waitingListEntry.updateMany({
        where: {
          eventId: id,
          status: { in: ['waiting', 'offered'] },
        },
        data: { status: 'canceled' },
      }),
    ]);

    // Получаем статистику
    const stats = await prisma.participation.groupBy({
      by: ['status'],
      where: { eventId: id },
      _count: true,
    });

    const statsMap: Record<string, number> = {};
    stats.forEach(s => { statsMap[s.status] = s._count; });

    res.json({
      status: 'finished',
      eventId: id,
      stats: {
        joinedCount: statsMap['joined'] || 0,
        attendedCount: statsMap['attended'] || 0,
        noShowCount: statsMap['no_show'] || 0,
        canceledCount: statsMap['canceled'] || 0,
      },
      message: 'Событие завершено. Участники могут подтвердить присутствие в течение 24 часов.',
    });
  } catch (error) {
    console.error('[Organizer] POST /events/:id/finish error:', error);
    res.status(500).json({ error: 'Failed to finish event' });
  }
});

export { router as organizerRouter };
