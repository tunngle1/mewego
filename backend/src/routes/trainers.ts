import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/trainers/:publicId - публичный профиль тренера
router.get('/:publicId', async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;

    // Найти пользователя по publicId
    const user = await prisma.user.findUnique({
      where: { publicId },
      include: {
        organizerProfile: {
          include: {
            certificates: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    // Проверяем, что это организатор
    if (user.role !== 'organizer' && user.role !== 'admin') {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    // Считаем агрегаты: количество проведённых событий, средний рейтинг
    const eventsCount = await prisma.event.count({
      where: {
        organizerId: user.id,
        status: { in: ['approved', 'finished'] },
      },
    });

    // Средний рейтинг и количество отзывов (через события организатора)
    const reviewsAgg = await prisma.review.aggregate({
      where: {
        event: {
          organizerId: user.id,
        },
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const profile = user.organizerProfile;

    res.json({
      id: user.id,
      publicId: user.publicId,
      name: profile?.displayName || user.name || 'Тренер',
      avatarUrl: profile?.avatarUrl || user.avatarUrl,
      city: profile?.city || user.cityId,
      bio: profile?.bio || null,
      tags: profile?.tags || [],
      status: profile?.status || 'pending',
      ratingAvg: reviewsAgg._avg.rating ? Math.round(reviewsAgg._avg.rating * 10) / 10 : null,
      ratingCount: reviewsAgg._count.rating || 0,
      hostedEventsCount: eventsCount,
      certificates: (profile?.certificates || []).map((c) => ({
        id: c.id,
        title: c.title,
        issuer: c.issuer,
        issuedAt: c.issuedAt?.toISOString(),
        assetUrl: c.assetUrl,
        verified: c.verified,
      })),
    });
  } catch (error) {
    console.error('[Trainers] GET /:publicId error:', error);
    res.status(500).json({ error: 'Failed to fetch trainer profile' });
  }
});

// GET /api/v1/trainers/:publicId/events - события тренера
router.get('/:publicId/events', async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    const { status } = req.query; // upcoming | past

    const user = await prisma.user.findUnique({
      where: { publicId },
      select: { id: true, role: true },
    });

    if (!user || (user.role !== 'organizer' && user.role !== 'admin')) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    const now = new Date();

    let dateFilter: any = {};
    if (status === 'upcoming') {
      dateFilter = { startAt: { gte: now } };
    } else if (status === 'past') {
      dateFilter = { startAt: { lt: now } };
    }

    const events = await prisma.event.findMany({
      where: {
        organizerId: user.id,
        status: 'approved', // публично показываем только approved
        ...dateFilter,
      },
      orderBy: { startAt: status === 'past' ? 'desc' : 'asc' },
      take: 20,
      include: {
        _count: {
          select: { participations: true },
        },
      },
    });

    const result = events.map((e) => ({
      id: e.id,
      title: e.title,
      movementType: e.movementType,
      level: e.level,
      startAt: e.startAt.toISOString(),
      durationMin: e.durationMin,
      locationName: e.locationName,
      locationAddress: e.locationAddress,
      capacity: e.capacity,
      participantsCount: e._count.participations,
      priceType: e.priceType,
      priceValue: e.priceValue,
    }));

    res.json(result);
  } catch (error) {
    console.error('[Trainers] GET /:publicId/events error:', error);
    res.status(500).json({ error: 'Failed to fetch trainer events' });
  }
});

// GET /api/v1/trainers/:publicId/reviews - отзывы о тренере
router.get('/:publicId/reviews', async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    const { sort = 'newest', limit = '20', cursor } = req.query;

    const user = await prisma.user.findUnique({
      where: { publicId },
      select: { id: true, role: true },
    });

    if (!user || (user.role !== 'organizer' && user.role !== 'admin')) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'high') {
      orderBy = { rating: 'desc' };
    } else if (sort === 'low') {
      orderBy = { rating: 'asc' };
    }

    const take = Math.min(parseInt(limit as string, 10) || 20, 50);

    const reviews = await prisma.review.findMany({
      where: {
        event: {
          organizerId: user.id,
        },
      },
      orderBy,
      take,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            publicId: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
          },
        },
      },
    });

    const result = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      reviewer: {
        id: r.user.id,
        publicId: r.user.publicId,
        name: r.user.name || 'Пользователь',
        avatarUrl: r.user.avatarUrl,
      },
      event: {
        id: r.event.id,
        title: r.event.title,
        startAt: r.event.startAt.toISOString(),
      },
    }));

    const nextCursor = reviews.length === take ? reviews[reviews.length - 1].id : null;

    res.json({
      items: result,
      nextCursor,
    });
  } catch (error) {
    console.error('[Trainers] GET /:publicId/reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch trainer reviews' });
  }
});

export { router as trainersRouter };
