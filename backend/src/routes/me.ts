import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { ensurePublicId } from '../utils/publicId';

const router = Router();
const prisma = new PrismaClient();
const OCCUPIED_PARTICIPATION_STATUSES = ['joined', 'attended', 'no_show'] as const;

// GET /api/v1/me/ban-appeal - получить заявку на обжалование бана (если есть)
router.get('/ban-appeal', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    const appeal = await prisma.banAppeal.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        userMessage: true,
        status: true,
        adminResponse: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
      },
    });

    if (!appeal) {
      return res.json({ appeal: null });
    }

    res.json({
      appeal: {
        ...appeal,
        createdAt: appeal.createdAt.toISOString(),
        updatedAt: appeal.updatedAt.toISOString(),
        resolvedAt: appeal.resolvedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('[Me] GET /ban-appeal error:', error);
    res.status(500).json({ error: 'Failed to fetch ban appeal' });
  }
});

// POST /api/v1/me/ban-appeal - отправить заявку на обжалование (только 1 раз)
router.post('/ban-appeal', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { message } = req.body as { message?: string };

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.status !== 'banned') {
      return res.status(400).json({ error: 'Ban appeal can be created only for banned accounts' });
    }

    const existing = await prisma.banAppeal.findUnique({ where: { userId }, select: { id: true } });
    if (existing) {
      return res.status(400).json({ error: 'Ban appeal already submitted' });
    }

    const created = await prisma.banAppeal.create({
      data: {
        userId,
        userMessage: message.trim(),
        status: 'pending',
      },
      select: {
        id: true,
        userId: true,
        userMessage: true,
        status: true,
        adminResponse: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
      },
    });

    res.json({
      appeal: {
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        resolvedAt: created.resolvedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('[Me] POST /ban-appeal error:', error);
    // unique(userId) protection
    res.status(500).json({ error: 'Failed to create ban appeal' });
  }
});

// GET /api/v1/me/participations - мои записи на события
router.get('/participations', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    const now = new Date();

    const calculateEventEndAt = (startAt: Date, durationMin: number | null, endAt: Date | null): Date => {
      if (endAt) return endAt;
      if (durationMin) return new Date(startAt.getTime() + durationMin * 60 * 1000);
      return startAt;
    };

    const getViewerPhase = (params: { now: Date; startAt: Date; endAt: Date }): 'upcoming' | 'ongoing' | 'ended' => {
      const { now, startAt, endAt } = params;
      if (now < startAt) return 'upcoming';
      if (now >= startAt && now < endAt) return 'ongoing';
      return 'ended';
    };

    const participations = await prisma.participation.findMany({
      where: { userId },
      include: {
        event: {
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
                  where: { status: { in: [...OCCUPIED_PARTICIPATION_STATUSES] } },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 200,
    });

    const organizerIds = [...new Set(participations.map((p) => p.event.organizerId))];
    const ratingsMap: Record<string, number> = {};
    for (const orgId of organizerIds) {
      const agg = await prisma.review.aggregate({
        where: { event: { organizerId: orgId } },
        _avg: { rating: true },
      });
      ratingsMap[orgId] = agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0;
    }

    const offersCounts = await prisma.waitingListEntry.groupBy({
      by: ['eventId'],
      where: {
        status: 'offered',
        offerExpiresAt: { gt: new Date() },
        eventId: { in: participations.map((p) => p.eventId) },
      },
      _count: { _all: true },
    });
    const offersMap = new Map<string, number>(offersCounts.map((x) => [x.eventId, x._count._all]));

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
    }) => {
      const { event, spotsTaken, isFull, trainerRating } = params;
      return {
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
        waitingList: [],
      };
    };

    const result = participations.map((p) => {
      const phase =
        p.status === 'joined' || p.status === 'attended' || p.status === 'no_show'
          ? getViewerPhase({
              now,
              startAt: p.event.startAt,
              endAt: calculateEventEndAt(p.event.startAt, p.event.durationMin, p.event.endAt),
            })
          : undefined;

      const activeOffersCount = offersMap.get(p.eventId) || 0;
      const effectiveTaken = (p.event as any)._count?.participations ? (p.event as any)._count.participations + activeOffersCount : activeOffersCount;
      const isFull = p.event.capacity ? effectiveTaken >= p.event.capacity : false;

      return {
      id: p.id,
      eventId: p.eventId,
      userId: p.userId,
      status: p.status,
      bookedAt: p.joinedAt.toISOString(),
      canceledAt: p.canceledAt?.toISOString(),
      viewerPhase: phase,
      event: toPublicEventDTO({
        event: p.event,
        spotsTaken: effectiveTaken,
        isFull,
        trainerRating: ratingsMap[p.event.organizerId] || 0,
      }),
      };
    });

    res.json(result);
  } catch (error) {
    console.error('[Me] GET /participations error:', error);
    res.status(500).json({ error: 'Failed to fetch participations' });
  }
});

// GET /api/v1/me/waiting-list - моя очередь ожидания
router.get('/waiting-list', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    const entries = await prisma.waitingListEntry.findMany({
      where: { userId, status: { in: ['waiting', 'offered'] } },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const result = entries.map((e) => ({
      eventId: e.eventId,
      position: 1, // TODO: calculate actual position
      joinedAt: e.createdAt.toISOString(),
      status: e.status,
      offerExpiresAt: e.offerExpiresAt?.toISOString(),
    }));

    res.json(result);
  } catch (error) {
    console.error('[Me] GET /waiting-list error:', error);
    res.status(500).json({ error: 'Failed to fetch waiting list' });
  }
});

// POST /api/v1/me/push-token - сохранить push-token устройства (Expo)
router.post('/push-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { token, platform } = req.body as { token?: string; platform?: string };

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token is required' });
    }

    // Token must be globally unique; if the same device logs in with another user,
    // we re-bind token to the current user to prevent sending notifications to the wrong account.
    await prisma.pushToken.upsert({
      where: {
        token,
      },
      create: {
        userId,
        token,
        platform: typeof platform === 'string' ? platform : null,
      },
      update: {
        userId,
        platform: typeof platform === 'string' ? platform : null,
      },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('[Me] POST /push-token error:', error);
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

// POST /api/v1/me/push-test - отправить тестовый push (через Expo Push API)
router.post('/push-test', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    const tokens = await prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (!tokens || tokens.length === 0) {
      return res.status(400).json({ error: 'No push tokens registered for this user' });
    }

    const messages = tokens.map((t) => ({
      to: t.token,
      title: 'ME·WE·GO',
      body: 'Тестовый push (через Expo).',
      data: { type: 'push_test' },
      sound: 'default',
    }));

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const json = await expoRes.json().catch(() => null);
    res.status(expoRes.ok ? 200 : 502).json({ ok: expoRes.ok, response: json });
  } catch (error) {
    console.error('[Me] POST /push-test error:', error);
    res.status(500).json({ error: 'Failed to send test push' });
  }
});

// PATCH /api/v1/me - обновить профиль пользователя
router.patch('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { name, firstName, lastName, city, interests, avatarUrl, about, gender, birthDate, onboardingCompleted } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (city !== undefined) updateData.cityId = city;
    if (interests !== undefined) updateData.interests = interests;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (about !== undefined) updateData.about = about;
    if (gender !== undefined) updateData.gender = gender;
    if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
    if (onboardingCompleted === true) updateData.onboardingCompleted = true;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const publicId = await ensurePublicId(prisma, userId);

    console.log(`[Me] Updated profile for user ${userId}`);

    res.json({
      id: user.id,
      publicId,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      about: (user as any).about ?? null,
      role: user.role,
      gender: user.gender,
      birthDate: user.birthDate?.toISOString(),
      cityId: user.cityId,
      interests: user.interests,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    console.error('[Me] PATCH / error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/v1/me - профиль пользователя
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Если пользователя нет - создаём (для dev/mock auth)
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          name:
            req.auth!.role === 'superadmin'
              ? 'SuperAdmin'
              : req.auth!.role === 'admin'
                ? 'Admin'
                : req.auth!.role === 'organizer'
                  ? 'Organizer'
                  : 'User',
          role: req.auth!.role,
        },
      });
    }

    const publicId = await ensurePublicId(prisma, userId);

    if (user.status === 'banned') {
      return res.status(403).json({
        error: 'Account banned',
        status: user.status,
        bannedAt: user.bannedAt?.toISOString(),
        bannedReason: user.bannedReason,
      });
    }

    if (user.status === 'frozen') {
      // Auto-unfreeze if time has passed
      if (user.frozenUntil && user.frozenUntil.getTime() <= Date.now()) {
        user = await prisma.user.update({
          where: { id: userId },
          data: {
            status: 'active',
            frozenAt: null,
            frozenUntil: null,
            frozenReason: null,
          },
        });
      } else {
      return res.status(403).json({
        error: 'Account frozen',
        status: user.status,
        frozenAt: user.frozenAt?.toISOString(),
        frozenUntil: user.frozenUntil?.toISOString(),
        frozenReason: (user as any).frozenReason,
      });
      }
    }

    res.json({
      id: user.id,
      publicId,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
      isEmailVerified: Boolean(user.emailVerifiedAt),
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      about: (user as any).about ?? null,
      role: user.role,
      gender: user.gender,
      birthDate: user.birthDate?.toISOString(),
      cityId: user.cityId,
      activityLevel: user.activityLevel,
      interests: user.interests,
      onboardingCompleted: user.onboardingCompleted,
      accountStatus: user.status,
      marketingEmailOptIn: Boolean(user.marketingEmailOptIn),
      bannedAt: user.bannedAt?.toISOString(),
      bannedReason: user.bannedReason,
      frozenAt: user.frozenAt?.toISOString(),
      frozenUntil: user.frozenUntil?.toISOString(),
      frozenReason: (user as any).frozenReason,
    });
  } catch (error) {
    console.error('[Me] GET / error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export { router as meRouter };
