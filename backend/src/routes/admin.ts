import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendPushToUsers } from '../services/push';

const router = Router();
const prisma = new PrismaClient();

const safeJsonParse = (raw: string | null | undefined): any => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// GET /api/v1/admin/events?status=pending - список событий на модерацию
router.get('/events', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status) {
      where.status = status as string;
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
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
      orderBy: { createdAt: 'desc' },
    });

    const result = events.map((event) => ({
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
      capacity: event.capacity,
      priceType: event.priceType,
      priceValue: event.priceValue,
      status: event.status,
      participantsJoinedCount: event._count.participations,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    }));

    res.json(result);
  } catch (error) {
    console.error('[Admin] GET /events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ============================================================
// SuperAdmin: Search
// ============================================================

// GET /api/v1/admin/search/events?q=...
router.get('/search/events', requireAuth, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({ items: [] });
    }

    const items = await prisma.event.findMany({
      where: {
        OR: [
          { id: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        organizer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      items: items.map((e) => ({
        id: e.id,
        title: e.title,
        movementType: e.movementType,
        status: e.status,
        startAt: e.startAt.toISOString(),
        organizerId: e.organizerId,
        organizerName: e.organizer?.name || null,
      })),
    });
  } catch (error) {
    console.error('[Admin] GET /search/events error:', error);
    res.status(500).json({ error: 'Failed to search events' });
  }
});

// ============================================================
// Admin: Event Edit Requests (before/after moderation)
// ============================================================

// GET /api/v1/admin/event-edit-requests?status=pending
router.get('/event-edit-requests', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const where: any = {};
    if (status) where.status = status;

    const items = await prisma.eventEditRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({
      items: items.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        organizerId: r.organizerId,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Admin] GET /event-edit-requests error:', error);
    res.status(500).json({ error: 'Failed to fetch event edit requests' });
  }
});

// GET /api/v1/admin/event-edit-requests/:id
router.get('/event-edit-requests/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const r = await prisma.eventEditRequest.findUnique({ where: { id } });
    if (!r) return res.status(404).json({ error: 'Edit request not found' });

    res.json({
      id: r.id,
      eventId: r.eventId,
      organizerId: r.organizerId,
      status: r.status,
      before: safeJsonParse(r.beforeSnapshot),
      after: safeJsonParse(r.afterSnapshot),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() || null,
      reviewedById: r.reviewedById || null,
    });
  } catch (error) {
    console.error('[Admin] GET /event-edit-requests/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch edit request' });
  }
});

// POST /api/v1/admin/event-edit-requests/:id/approve
router.post('/event-edit-requests/:id/approve', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;

    const r = await prisma.eventEditRequest.findUnique({ where: { id } });
    if (!r) return res.status(404).json({ error: 'Edit request not found' });
    if (r.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be approved' });

    const after = safeJsonParse(r.afterSnapshot);
    if (!after) return res.status(400).json({ error: 'Invalid afterSnapshot' });

    const updatedEvent = await prisma.$transaction(async (tx) => {
      const existingEvent = await tx.event.findUnique({ where: { id: r.eventId } });
      if (!existingEvent) throw new Error('Event not found');

      const event = await tx.event.update({
        where: { id: r.eventId },
        data: {
          title: after.title,
          description: after.description,
          movementType: after.movementType,
          level: after.level,
          startAt: after.startAt ? new Date(after.startAt) : undefined,
          durationMin: typeof after.durationMin === 'number' ? after.durationMin : undefined,
          locationName: after.locationName,
          locationAddress: after.locationAddress,
          locationType: after.locationType,
          capacity: typeof after.capacity === 'number' ? after.capacity : after.capacity === null ? null : undefined,
          priceType: after.priceType,
          priceValue: typeof after.priceValue === 'number' ? after.priceValue : after.priceValue === null ? null : undefined,
          paymentInstructions: after.paymentInstructions,
          visibility: after.visibility,
          inviteCode: after.inviteCode,
          status: 'approved',
        },
      });

      await tx.eventEditRequest.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewedById: adminId,
        },
      });

      // Audit
      const admin = await tx.user.findUnique({ where: { id: adminId }, select: { name: true } });
      await tx.auditLog.create({
        data: {
          adminId,
          adminName: admin?.name,
          action: 'approve_event',
          targetType: 'event_edit_request',
          targetId: id,
          targetName: existingEvent.title,
          details: JSON.stringify({ eventId: r.eventId, mode: 'edit_request' }),
        },
      });

      return event;
    });

    // Notify joined participants
    const userIds = await prisma.participation.findMany({
      where: { eventId: r.eventId, status: 'joined' },
      select: { userId: true },
    });
    const uniqueUserIds = Array.from(new Set(userIds.map((u) => u.userId)));

    if (uniqueUserIds.length) {
      await sendPushToUsers(uniqueUserIds, {
        title: 'Событие обновлено',
        body: `Организатор обновил "${updatedEvent.title}". Проверьте детали.`,
        data: {
          type: 'event_updated',
          eventId: r.eventId,
        },
      });

      await prisma.notificationLog.createMany({
        data: uniqueUserIds.map((userId) => ({
          userId,
          eventId: r.eventId,
          type: 'event_updated',
          channel: 'push',
          status: 'sent',
        })),
        skipDuplicates: false,
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('[Admin] POST /event-edit-requests/:id/approve error:', error);
    res.status(500).json({ error: 'Failed to approve edit request' });
  }
});

// POST /api/v1/admin/event-edit-requests/:id/reject
router.post('/event-edit-requests/:id/reject', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;

    const r = await prisma.eventEditRequest.findUnique({ where: { id } });
    if (!r) return res.status(404).json({ error: 'Edit request not found' });
    if (r.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be rejected' });

    await prisma.eventEditRequest.update({
      where: { id },
      data: { status: 'rejected', reviewedAt: new Date(), reviewedById: adminId },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('[Admin] POST /event-edit-requests/:id/reject error:', error);
    res.status(500).json({ error: 'Failed to reject edit request' });
  }
});

router.get('/analytics/overview', requireAuth, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';

    const now = new Date();
    const from = (() => {
      if (range === 'all') return null;
      const d = new Date(now);
      if (range === '7d') d.setDate(d.getDate() - 7);
      else if (range === '30d') d.setDate(d.getDate() - 30);
      else if (range === '90d') d.setDate(d.getDate() - 90);
      else d.setDate(d.getDate() - 30);
      return d;
    })();

    const whereDate = (field: string) => (from ? { [field]: { gte: from, lte: now } } : {});

    const [
      eventsTotal,
      eventsCreated,
      participationsJoined,
      participationsAttended,
      reviewsTotal,
      ratingsAgg,
      positiveReviews,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { ...(from ? { createdAt: { gte: from, lte: now } } : {}) } }),
      prisma.participation.count({ where: { status: 'joined', ...(from ? { joinedAt: { gte: from, lte: now } } : {}) } }),
      prisma.participation.count({ where: { status: 'attended', ...(from ? { attendedAt: { gte: from, lte: now } } : {}) } }),
      prisma.review.count({ where: { ...(from ? { createdAt: { gte: from, lte: now } } : {}) } }),
      prisma.review.aggregate({
        where: { ...(from ? { createdAt: { gte: from, lte: now } } : {}) },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.review.count({ where: { rating: { gte: 4 }, ...(from ? { createdAt: { gte: from, lte: now } } : {}) } }),
    ]);

    const attendedByEvent = await prisma.participation.groupBy({
      by: ['eventId'],
      where: { status: 'attended', ...(from ? { attendedAt: { gte: from, lte: now } } : {}) },
      _count: { _all: true },
    });

    const attendedCountByEventId = new Map(attendedByEvent.map((x) => [x.eventId, x._count._all]));

    const eventIds = attendedByEvent.map((x) => x.eventId);
    const eventsForRevenue = eventIds.length
      ? await prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, priceType: true, priceValue: true },
        })
      : [];

    const revenueEventsEstimated = eventsForRevenue.reduce((sum, e) => {
      if (e.priceType !== 'fixed') return sum;
      const attended = attendedCountByEventId.get(e.id) || 0;
      const price = typeof e.priceValue === 'number' ? e.priceValue : 0;
      return sum + attended * price;
    }, 0);

    res.json({
      range,
      events: {
        total: eventsTotal,
        createdInRange: eventsCreated,
      },
      participations: {
        joined: participationsJoined,
        attended: participationsAttended,
      },
      reviews: {
        total: reviewsTotal,
        avgRating: ratingsAgg._avg.rating || 0,
        positiveCount: positiveReviews,
        positiveShare: reviewsTotal > 0 ? positiveReviews / reviewsTotal : 0,
      },
      revenue: {
        eventsEstimated: revenueEventsEstimated,
        subscriptions: 0,
      },
    });
  } catch (error) {
    console.error('[Admin] GET /analytics/overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

router.get('/analytics/top-events', requireAuth, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';
    const now = new Date();
    const from = (() => {
      if (range === 'all') return null;
      const d = new Date(now);
      if (range === '7d') d.setDate(d.getDate() - 7);
      else if (range === '30d') d.setDate(d.getDate() - 30);
      else if (range === '90d') d.setDate(d.getDate() - 90);
      else d.setDate(d.getDate() - 30);
      return d;
    })();

    const joinedByEvent = await prisma.participation.groupBy({
      by: ['eventId'],
      where: { status: 'joined', ...(from ? { joinedAt: { gte: from, lte: now } } : {}) },
      _count: { _all: true },
    });

    const attendedByEvent = await prisma.participation.groupBy({
      by: ['eventId'],
      where: { status: 'attended', ...(from ? { attendedAt: { gte: from, lte: now } } : {}) },
      _count: { _all: true },
    });

    const reviewsByEvent = await prisma.review.groupBy({
      by: ['eventId'],
      where: { ...(from ? { createdAt: { gte: from, lte: now } } : {}) },
      _count: { _all: true },
      _avg: { rating: true },
    });

    const positiveReviewsByEvent = await prisma.review.groupBy({
      by: ['eventId'],
      where: { rating: { gte: 4 }, ...(from ? { createdAt: { gte: from, lte: now } } : {}) },
      _count: { _all: true },
    });

    const joinedMap = new Map(joinedByEvent.map((x) => [x.eventId, x._count._all]));
    const attendedMap = new Map(attendedByEvent.map((x) => [x.eventId, x._count._all]));
    const reviewsMap = new Map(reviewsByEvent.map((x) => [x.eventId, { count: x._count._all, avg: x._avg.rating || 0 }]));
    const positiveMap = new Map(positiveReviewsByEvent.map((x) => [x.eventId, x._count._all]));

    const eventIds = Array.from(
      new Set([...joinedMap.keys(), ...attendedMap.keys(), ...reviewsMap.keys(), ...positiveMap.keys()])
    );

    const events = eventIds.length
      ? await prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true, movementType: true, startAt: true, status: true, priceType: true, priceValue: true },
        })
      : [];

    const rows = events
      .map((e) => {
        const joined = joinedMap.get(e.id) || 0;
        const attended = attendedMap.get(e.id) || 0;
        const review = reviewsMap.get(e.id) || { count: 0, avg: 0 };
        const positive = positiveMap.get(e.id) || 0;
        const revenueEstimated = e.priceType === 'fixed' ? (attended || 0) * (e.priceValue || 0) : 0;
        return {
          id: e.id,
          title: e.title,
          movementType: e.movementType,
          startAt: e.startAt.toISOString(),
          status: e.status,
          joined,
          attended,
          reviews: review.count,
          avgRating: review.avg,
          positiveReviews: positive,
          positiveShare: review.count > 0 ? positive / review.count : 0,
          revenueEstimated,
        };
      })
      .sort((a, b) => {
        if (b.attended !== a.attended) return b.attended - a.attended;
        return b.joined - a.joined;
      })
      .slice(0, 50);

    res.json({ range, items: rows });
  } catch (error) {
    console.error('[Admin] GET /analytics/top-events error:', error);
    res.status(500).json({ error: 'Failed to fetch top events analytics' });
  }
});

router.get('/analytics/categories', requireAuth, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';
    const now = new Date();
    const from = (() => {
      if (range === 'all') return null;
      const d = new Date(now);
      if (range === '7d') d.setDate(d.getDate() - 7);
      else if (range === '30d') d.setDate(d.getDate() - 30);
      else if (range === '90d') d.setDate(d.getDate() - 90);
      else d.setDate(d.getDate() - 30);
      return d;
    })();

    const participations = await prisma.participation.findMany({
      where: { status: 'joined', ...(from ? { joinedAt: { gte: from, lte: now } } : {}) },
      select: { eventId: true, event: { select: { movementType: true } } },
      take: range === 'all' ? 200000 : 200000,
    });

    const counts = new Map<string, number>();
    for (const p of participations) {
      const key = p.event?.movementType || 'unknown';
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const items = Array.from(counts.entries())
      .map(([movementType, joined]) => ({ movementType, joined }))
      .sort((a, b) => b.joined - a.joined);

    res.json({ range, items });
  } catch (error) {
    console.error('[Admin] GET /analytics/categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories analytics' });
  }
});

router.get('/analytics/timeseries', requireAuth, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d';
    const metric = (req.query.metric as string) || 'joined';
    const now = new Date();
    const from = (() => {
      if (range === 'all') {
        const d = new Date(now);
        d.setDate(d.getDate() - 365);
        return d;
      }
      const d = new Date(now);
      if (range === '7d') d.setDate(d.getDate() - 7);
      else if (range === '30d') d.setDate(d.getDate() - 30);
      else if (range === '90d') d.setDate(d.getDate() - 90);
      else d.setDate(d.getDate() - 30);
      return d;
    })();

    const start = new Date(from);
    start.setHours(0, 0, 0, 0);

    const buckets: string[] = [];
    const cursor = new Date(start);
    while (cursor.getTime() <= now.getTime()) {
      buckets.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }

    const counts = new Map<string, number>();

    if (metric === 'joined') {
      const rows = await prisma.participation.findMany({
        where: { status: 'joined', joinedAt: { gte: start, lte: now } },
        select: { joinedAt: true },
        take: 200000,
      });
      for (const r of rows) {
        const key = r.joinedAt.toISOString().slice(0, 10);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    } else if (metric === 'attended') {
      const rows = await prisma.participation.findMany({
        where: { status: 'attended', attendedAt: { gte: start, lte: now } },
        select: { attendedAt: true },
        take: 200000,
      });
      for (const r of rows) {
        if (!r.attendedAt) continue;
        const key = r.attendedAt.toISOString().slice(0, 10);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    } else if (metric === 'reviews') {
      const rows = await prisma.review.findMany({
        where: { createdAt: { gte: start, lte: now } },
        select: { createdAt: true },
        take: 200000,
      });
      for (const r of rows) {
        const key = r.createdAt.toISOString().slice(0, 10);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    } else if (metric === 'positive_reviews') {
      const rows = await prisma.review.findMany({
        where: { rating: { gte: 4 }, createdAt: { gte: start, lte: now } },
        select: { createdAt: true },
        take: 200000,
      });
      for (const r of rows) {
        const key = r.createdAt.toISOString().slice(0, 10);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    } else {
      return res.status(400).json({ error: 'Invalid metric' });
    }

    res.json({
      range,
      metric,
      items: buckets.map((date) => ({ date, value: counts.get(date) || 0 })),
    });
  } catch (error) {
    console.error('[Admin] GET /analytics/timeseries error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics timeseries' });
  }
});

// ============================================================
// SuperAdmin: Users management
// ============================================================

// ============================================================
// Admin: Ban Appeals
// ============================================================

// GET /api/v1/admin/ban-appeals?status=pending - список заявок на обжалование
router.get('/ban-appeals', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || '';
    const where: any = {};
    if (status) where.status = status;

    const appeals = await prisma.banAppeal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, phone: true, telegramId: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
      take: 200,
    });

    res.json({
      items: appeals.map((a) => ({
        id: a.id,
        userId: a.userId,
        user: a.user,
        userMessage: a.userMessage,
        status: a.status,
        adminResponse: a.adminResponse,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        resolvedAt: a.resolvedAt?.toISOString() || null,
        resolvedBy: a.resolvedBy,
      })),
    });
  } catch (error) {
    console.error('[Admin] GET /ban-appeals error:', error);
    res.status(500).json({ error: 'Failed to fetch ban appeals' });
  }
});

// PATCH /api/v1/admin/ban-appeals/:id - ответить на appeal (approve/reject)
router.patch('/ban-appeals/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;
    const { status, adminResponse } = req.body as { status?: string; adminResponse?: string };

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (!adminResponse || !adminResponse.trim()) {
      return res.status(400).json({ error: 'adminResponse is required' });
    }

    const appeal = await prisma.banAppeal.findUnique({ where: { id } });
    if (!appeal) return res.status(404).json({ error: 'Appeal not found' });

    if (appeal.status !== 'pending') {
      return res.status(400).json({ error: 'Appeal already resolved' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedAppeal = await tx.banAppeal.update({
        where: { id },
        data: {
          status,
          adminResponse: adminResponse.trim(),
          resolvedAt: new Date(),
          resolvedById: adminId,
        },
      });

      if (status === 'approved') {
        // Approve = unban user
        await tx.user.update({
          where: { id: appeal.userId },
          data: {
            status: 'active',
            bannedAt: null,
            bannedReason: null,
          },
        });

        // Remove appeal after unban so user can appeal again if banned in the future
        await tx.banAppeal.deleteMany({ where: { userId: appeal.userId } });
      }

      return updatedAppeal;
    });

    await logAdminAction(adminId, 'ban_appeal_resolve', 'ban_appeal', id, appeal.userId, {
      status,
    });

    res.json({
      id: updated.id,
      userId: updated.userId,
      status: updated.status,
      adminResponse: updated.adminResponse,
      resolvedAt: updated.resolvedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('[Admin] PATCH /ban-appeals/:id error:', error);
    res.status(500).json({ error: 'Failed to resolve appeal' });
  }
});

// GET /api/v1/admin/users?q=...&role=... - список пользователей (admin/superadmin)
router.get('/users', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const role = (req.query.role as string) || '';

    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (q) {
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { telegramId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        phone: true,
        telegramId: true,
        role: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    res.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        telegramId: u.telegramId,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        lastActiveAt: u.lastActiveAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('[Admin] GET /users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/v1/admin/users/:id/role - назначить роль пользователю (superadmin)
router.patch('/users/:id/role', requireAuth, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body as { role?: string };
    const adminId = req.auth!.userId;

    if (!role || typeof role !== 'string') {
      return res.status(400).json({ error: 'role is required' });
    }

    if (!['user', 'organizer', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Safety: superadmin cannot demote themselves
    if (req.auth!.userId === id && req.auth!.role === 'superadmin' && role !== 'superadmin') {
      return res.status(400).json({ error: 'Cannot change own superadmin role' });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { name: true, role: true } });
    const oldRole = user?.role;

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, role: true, createdAt: true, lastActiveAt: true },
    });

    // Log to audit
    const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName: admin?.name,
        action: 'change_role',
        targetType: 'user',
        targetId: id,
        targetName: user?.name || id,
        details: JSON.stringify({ oldRole, newRole: role }),
      },
    });

    res.json({
      id: updated.id,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
      lastActiveAt: updated.lastActiveAt.toISOString(),
    });
  } catch (error) {
    console.error('[Admin] PATCH /users/:id/role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// POST /api/v1/admin/users/:id/grant-subscription - выдать подписку пользователю (superadmin)
router.post('/users/:id/grant-subscription', requireAuth, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;
    const { plan, days } = req.body as { plan?: string; days?: number };

    if (!plan || typeof plan !== 'string') {
      return res.status(400).json({ error: 'plan is required' });
    }

    if (!['user_349', 'organizer_999'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be user_349 or organizer_999' });
    }

    const durationDays = typeof days === 'number' && days > 0 ? Math.floor(days) : 365;
    const now = new Date();
    const endAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const target = await prisma.user.findUnique({ where: { id }, select: { name: true } });

    const updated = await prisma.subscription.upsert({
      where: {
        userId_plan: { userId: id, plan },
      },
      create: {
        userId: id,
        plan,
        status: 'active',
        startAt: now,
        endAt,
        autoRenew: false,
        platform: 'manual',
        storeReceipt: null,
      },
      update: {
        status: 'active',
        startAt: now,
        endAt,
        autoRenew: false,
        platform: 'manual',
        storeReceipt: null,
      },
      select: {
        id: true,
        userId: true,
        plan: true,
        status: true,
        startAt: true,
        endAt: true,
      },
    });

    const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName: admin?.name,
        action: 'grant_subscription',
        targetType: 'user',
        targetId: id,
        targetName: target?.name || id,
        details: JSON.stringify({ plan, days: durationDays, startAt: now.toISOString(), endAt: endAt.toISOString() }),
      },
    });

    res.json({
      id: updated.id,
      userId: updated.userId,
      plan: updated.plan,
      status: updated.status,
      startAt: updated.startAt.toISOString(),
      endAt: updated.endAt.toISOString(),
    });
  } catch (error) {
    console.error('[Admin] POST /users/:id/grant-subscription error:', error);
    res.status(500).json({ error: 'Failed to grant subscription' });
  }
});

// POST /api/v1/admin/events/:id/approve - одобрить событие
router.post('/events/:id/approve', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;

    const existing = await prisma.event.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending events can be approved' });
    }

    const event = await prisma.event.update({
      where: { id },
      data: { status: 'approved' },
    });

    // Log to audit
    const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName: admin?.name,
        action: 'approve_event',
        targetType: 'event',
        targetId: id,
        targetName: existing.title,
      },
    });

    res.json({
      id: event.id,
      status: event.status,
      updatedAt: event.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Admin] POST /events/:id/approve error:', error);
    res.status(500).json({ error: 'Failed to approve event' });
  }
});

// POST /api/v1/admin/events/:id/reject - отклонить событие
router.post('/events/:id/reject', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;

    const existing = await prisma.event.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending events can be rejected' });
    }

    const event = await prisma.event.update({
      where: { id },
      data: { status: 'rejected' },
    });

    // Log to audit
    const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName: admin?.name,
        action: 'reject_event',
        targetType: 'event',
        targetId: id,
        targetName: existing.title,
      },
    });

    res.json({
      id: event.id,
      status: event.status,
      updatedAt: event.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Admin] POST /events/:id/reject error:', error);
    res.status(500).json({ error: 'Failed to reject event' });
  }
});

// GET /api/v1/admin/complaints - список жалоб
router.get('/complaints', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const complaints = await prisma.complaint.findMany({
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const eventTargetIds = complaints
      .filter((c) => c.targetType === 'event')
      .map((c) => c.targetId);

    const eventsById = new Map<
      string,
      { organizerId: string; organizerName: string | null }
    >();
    if (eventTargetIds.length > 0) {
      const events = await prisma.event.findMany({
        where: { id: { in: Array.from(new Set(eventTargetIds)) } },
        include: { organizer: { select: { name: true } } },
      });
      events.forEach((e) => {
        eventsById.set(e.id, { organizerId: e.organizerId, organizerName: e.organizer?.name || null });
      });
    }

    const result = complaints.map((c) => ({
      id: c.id,
      targetType: c.targetType,
      targetId: c.targetId,
      reason: c.reason,
      description: c.description,
      status: c.status,
      reporterId: c.reporterId,
      reporterName: c.reporter.name || c.reporterName || 'Аноним',
      createdAt: c.createdAt.toISOString(),
      closedAt: c.closedAt?.toISOString(),
      resolutionAction: (c as any).resolutionAction || null,
      resolutionNote: (c as any).resolutionNote || null,
      resolvedAt: (c as any).resolvedAt ? (c as any).resolvedAt.toISOString() : null,
      resolvedById: (c as any).resolvedById || null,
      resolvedByName: (c as any).resolvedBy?.name || null,
      targetOrganizerId:
        c.targetType === 'event' ? eventsById.get(c.targetId)?.organizerId || null : null,
      targetOrganizerName:
        c.targetType === 'event' ? eventsById.get(c.targetId)?.organizerName || null : null,
    }));

    res.json(result);
  } catch (error) {
    console.error('[Admin] GET /complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// POST /api/v1/admin/complaints/:id/resolve - решить жалобу и сохранить решение
router.post('/complaints/:id/resolve', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;
    const { action, note, freezeUntil } = req.body as { action?: string; note?: string; freezeUntil?: string };

    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'action is required' });
    }

    if (!['dismiss', 'freeze', 'ban', 'unpublish_event', 'delete_event', 'reject_event'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    if (existing.status === 'closed') {
      return res.status(400).json({ error: 'Complaint already closed' });
    }

    // Validate actions depending on targetType
    if (action === 'freeze' || action === 'ban') {
      if (!(existing.targetType === 'user' || existing.targetType === 'organizer')) {
        return res.status(400).json({ error: 'This action is available only for user/organizer complaints' });
      }
    }
    if (action === 'unpublish_event' || action === 'delete_event' || action === 'reject_event') {
      if (existing.targetType !== 'event') {
        return res.status(400).json({ error: 'This action is available only for event complaints' });
      }
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      if (action === 'unpublish_event') {
        const event = await tx.event.findUnique({ where: { id: existing.targetId } });
        if (!event) throw new Error('Event not found');
        await tx.event.update({ where: { id: existing.targetId }, data: { visibility: 'private' } });
      }

      if (action === 'reject_event') {
        const event = await tx.event.findUnique({ where: { id: existing.targetId } });
        if (!event) throw new Error('Event not found');
        // Use reject semantics; we allow reject even if not pending to forcibly hide it from public flows
        await tx.event.update({ where: { id: existing.targetId }, data: { status: 'rejected' } });
      }

      if (action === 'delete_event') {
        const event = await tx.event.findUnique({ where: { id: existing.targetId } });
        if (!event) throw new Error('Event not found');
        await tx.waitingListEntry.deleteMany({ where: { eventId: existing.targetId } });
        await tx.participation.deleteMany({ where: { eventId: existing.targetId } });
        await tx.review.deleteMany({ where: { eventId: existing.targetId } });
        await tx.pointsLedger.deleteMany({ where: { sourceType: 'event', sourceId: existing.targetId } });
        await tx.eventAccess.deleteMany({ where: { eventId: existing.targetId } });
        await tx.eventEditRequest.deleteMany({ where: { eventId: existing.targetId } });
        await tx.event.delete({ where: { id: existing.targetId } });
      }

      if (action === 'ban') {
        const user = await tx.user.findUnique({ where: { id: existing.targetId } });
        if (!user) throw new Error('User not found');
        if (user.role === 'admin' || user.role === 'superadmin') {
          throw new Error('Cannot ban admin or superadmin');
        }
        if (user.status !== 'banned') {
          await tx.banAppeal.deleteMany({ where: { userId: existing.targetId } });
          await tx.user.update({
            where: { id: existing.targetId },
            data: { status: 'banned', bannedAt: now, bannedReason: (note || '').trim() || null },
          });
        }
      }

      if (action === 'freeze') {
        const user = await tx.user.findUnique({ where: { id: existing.targetId } });
        if (!user) throw new Error('User not found');
        if (user.role === 'admin' || user.role === 'superadmin') {
          throw new Error('Cannot freeze admin or superadmin');
        }
        const until = freezeUntil ? new Date(freezeUntil) : null;
        if (user.status !== 'frozen') {
          await tx.user.update({
            where: { id: existing.targetId },
            data: {
              status: 'frozen',
              frozenAt: now,
              frozenUntil: until,
              frozenReason: (note || '').trim() || 'Complaint resolution',
            },
          });
        }
      }

      return tx.complaint.update({
        where: { id },
        data: {
          status: 'closed',
          closedAt: now,
          resolutionAction: action,
          resolutionNote: note ? String(note).trim() : null,
          resolvedAt: now,
          resolvedById: adminId,
        } as any,
      });
    });

    await logAdminAction(adminId, 'resolve_complaint', 'complaint', id, `${existing.targetType}:${existing.targetId}`, {
      action,
      note: note ? String(note).trim() : null,
      targetType: existing.targetType,
      targetId: existing.targetId,
    });

    res.json({
      id: updated.id,
      status: updated.status,
      closedAt: updated.closedAt?.toISOString(),
      resolutionAction: (updated as any).resolutionAction || null,
      resolutionNote: (updated as any).resolutionNote || null,
      resolvedAt: (updated as any).resolvedAt ? (updated as any).resolvedAt.toISOString() : null,
      resolvedById: (updated as any).resolvedById || null,
    });
  } catch (error) {
    console.error('[Admin] POST /complaints/:id/resolve error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to resolve complaint' });
  }
});

// POST /api/v1/admin/complaints/:id/close - закрыть жалобу
router.post('/complaints/:id/close', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;

    const existing = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    if (existing.status === 'closed') {
      return res.status(400).json({ error: 'Complaint already closed' });
    }

    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
    });

    // Log to audit
    const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName: admin?.name,
        action: 'close_complaint',
        targetType: 'complaint',
        targetId: id,
        targetName: `${existing.targetType}:${existing.targetId}`,
        details: JSON.stringify({ reason: existing.reason }),
      },
    });

    res.json({
      id: complaint.id,
      status: complaint.status,
      closedAt: complaint.closedAt?.toISOString(),
    });
  } catch (error) {
    console.error('[Admin] POST /complaints/:id/close error:', error);
    res.status(500).json({ error: 'Failed to close complaint' });
  }
});

// ============================================================
// User detail & complaints history
// ============================================================

// GET /api/v1/admin/users/:id - детальная информация о пользователе
router.get('/users/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        organizerProfile: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            participations: true,
            events: true,
            reviews: true,
            complaints: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      publicId: user.publicId,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      telegramId: user.telegramId,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      birthDate: user.birthDate?.toISOString(),
      cityId: user.cityId,
      activityLevel: user.activityLevel,
      interests: user.interests,
      role: user.role,
      status: user.status,
      bannedAt: user.bannedAt?.toISOString(),
      bannedReason: user.bannedReason,
      frozenAt: user.frozenAt?.toISOString(),
      frozenUntil: user.frozenUntil?.toISOString(),
      frozenReason: user.frozenReason,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: user.lastActiveAt.toISOString(),
      organizerProfile: user.organizerProfile ? {
        displayName: user.organizerProfile.displayName,
        status: user.organizerProfile.status,
        bio: user.organizerProfile.bio,
        tags: user.organizerProfile.tags,
      } : null,
      subscription: user.subscriptions[0] ? {
        plan: user.subscriptions[0].plan,
        status: user.subscriptions[0].status,
        endAt: user.subscriptions[0].endAt.toISOString(),
      } : null,
      stats: {
        participations: user._count.participations,
        events: user._count.events,
        reviews: user._count.reviews,
        complaintsReported: user._count.complaints,
      },
    });
  } catch (error) {
    console.error('[Admin] GET /users/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/v1/admin/users/:id/complaints - жалобы на пользователя и от пользователя
router.get('/users/:id/complaints', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Жалобы НА пользователя (targetType=user, targetId=id)
    const complaintsAgainst = await prisma.complaint.findMany({
      where: { targetType: 'user', targetId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, name: true } },
      },
    });

    // Жалобы ОТ пользователя (reporterId=id)
    const complaintsBy = await prisma.complaint.findMany({
      where: { reporterId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      against: complaintsAgainst.map((c) => ({
        id: c.id,
        reason: c.reason,
        description: c.description,
        status: c.status,
        reporterId: c.reporterId,
        reporterName: c.reporter.name || c.reporterName,
        createdAt: c.createdAt.toISOString(),
        closedAt: c.closedAt?.toISOString(),
      })),
      by: complaintsBy.map((c) => ({
        id: c.id,
        targetType: c.targetType,
        targetId: c.targetId,
        reason: c.reason,
        description: c.description,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        closedAt: c.closedAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Admin] GET /users/:id/complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch user complaints' });
  }
});

// ============================================================
// User moderation actions (admin can do all except delete)
// ============================================================

// Helper: log admin action
async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  targetName?: string,
  details?: any
) {
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
  await prisma.auditLog.create({
    data: {
      adminId,
      adminName: admin?.name,
      action,
      targetType,
      targetId,
      targetName,
      details: details ? JSON.stringify(details) : null,
    },
  });
}

// POST /api/v1/admin/users/:id/ban - забанить пользователя
router.post('/users/:id/ban', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const adminId = req.auth!.userId;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'banned') return res.status(400).json({ error: 'User already banned' });

    // Cannot ban admin/superadmin
    if (user.role === 'admin' || user.role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot ban admin or superadmin' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Defensive: if there is a stale appeal from a previous ban cycle, clear it
      await tx.banAppeal.deleteMany({ where: { userId: id } });

      return tx.user.update({
        where: { id },
        data: {
          status: 'banned',
          bannedAt: new Date(),
          bannedReason: reason,
        },
      });
    });

    await logAdminAction(adminId, 'ban', 'user', id, user.name || id, { reason });

    res.json({ id: updated.id, status: updated.status, bannedAt: updated.bannedAt?.toISOString() });
  } catch (error) {
    console.error('[Admin] POST /users/:id/ban error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// POST /api/v1/admin/users/:id/unban - разбанить пользователя
router.post('/users/:id/unban', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status !== 'banned') return res.status(400).json({ error: 'User is not banned' });

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          status: 'active',
          bannedAt: null,
          bannedReason: null,
        },
      });

      // Clear appeal so user can submit a new one if banned again
      await tx.banAppeal.deleteMany({ where: { userId: id } });

      return u;
    });

    await logAdminAction(adminId, 'unban', 'user', id, user.name || id);

    res.json({ id: updated.id, status: updated.status });
  } catch (error) {
    console.error('[Admin] POST /users/:id/unban error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// POST /api/v1/admin/users/:id/freeze - заморозить пользователя
router.post('/users/:id/freeze', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, until } = req.body as { reason: string; until?: string };
    const adminId = req.auth!.userId;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'frozen') return res.status(400).json({ error: 'User already frozen' });

    if (user.role === 'admin' || user.role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot freeze admin or superadmin' });
    }

    const frozenUntil = until ? new Date(until) : null;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        status: 'frozen',
        frozenAt: new Date(),
        frozenUntil,
        frozenReason: reason.trim(),
      },
    });

    await logAdminAction(adminId, 'freeze', 'user', id, user.name || id, { reason, until });

    res.json({ id: updated.id, status: updated.status, frozenUntil: updated.frozenUntil?.toISOString() });
  } catch (error) {
    console.error('[Admin] POST /users/:id/freeze error:', error);
    res.status(500).json({ error: 'Failed to freeze user' });
  }
});

// POST /api/v1/admin/users/:id/unfreeze - разморозить пользователя
router.post('/users/:id/unfreeze', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status !== 'frozen') return res.status(400).json({ error: 'User is not frozen' });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        status: 'active',
        frozenAt: null,
        frozenUntil: null,
        frozenReason: null,
      },
    });

    await logAdminAction(adminId, 'unfreeze', 'user', id, user.name || id);

    res.json({ id: updated.id, status: updated.status });
  } catch (error) {
    console.error('[Admin] POST /users/:id/unfreeze error:', error);
    res.status(500).json({ error: 'Failed to unfreeze user' });
  }
});

// POST /api/v1/admin/users/:id/reset-progress - сбросить прогресс (points, status, challenges)
router.post('/users/:id/reset-progress', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.$transaction([
      prisma.pointsLedger.deleteMany({ where: { userId: id } }),
      prisma.userStatus.deleteMany({ where: { userId: id } }),
      prisma.userChallenge.deleteMany({ where: { userId: id } }),
    ]);

    await logAdminAction(adminId, 'reset_progress', 'user', id, user.name || id);

    res.json({ status: 'progress_reset', userId: id });
  } catch (error) {
    console.error('[Admin] POST /users/:id/reset-progress error:', error);
    res.status(500).json({ error: 'Failed to reset user progress' });
  }
});

// POST /api/v1/admin/users/:id/reset-subscriptions - сбросить подписки
router.post('/users/:id/reset-subscriptions', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.subscription.deleteMany({ where: { userId: id } });

    await logAdminAction(adminId, 'reset_subscriptions', 'user', id, user.name || id);

    res.json({ status: 'subscriptions_reset', userId: id });
  } catch (error) {
    console.error('[Admin] POST /users/:id/reset-subscriptions error:', error);
    res.status(500).json({ error: 'Failed to reset user subscriptions' });
  }
});

// ============================================================
// Organizer profile moderation
// ============================================================

// POST /api/v1/admin/organizers/:id/block - заблокировать organizer профиль
router.post('/organizers/:id/block', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // userId
    const adminId = req.auth!.userId;

    const profile = await prisma.organizerProfile.findUnique({ where: { userId: id } });
    if (!profile) return res.status(404).json({ error: 'Organizer profile not found' });
    if (profile.status === 'suspended') return res.status(400).json({ error: 'Profile already blocked' });

    const updated = await prisma.organizerProfile.update({
      where: { userId: id },
      data: { status: 'suspended' },
    });

    await logAdminAction(adminId, 'block_organizer', 'organizer', id, profile.displayName);

    res.json({ userId: id, status: updated.status });
  } catch (error) {
    console.error('[Admin] POST /organizers/:id/block error:', error);
    res.status(500).json({ error: 'Failed to block organizer' });
  }
});

// POST /api/v1/admin/organizers/:id/unblock - разблокировать organizer профиль
router.post('/organizers/:id/unblock', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;

    const profile = await prisma.organizerProfile.findUnique({ where: { userId: id } });
    if (!profile) return res.status(404).json({ error: 'Organizer profile not found' });
    if (profile.status !== 'suspended') return res.status(400).json({ error: 'Profile is not blocked' });

    const updated = await prisma.organizerProfile.update({
      where: { userId: id },
      data: { status: 'active' },
    });

    await logAdminAction(adminId, 'unblock_organizer', 'organizer', id, profile.displayName);

    res.json({ userId: id, status: updated.status });
  } catch (error) {
    console.error('[Admin] POST /organizers/:id/unblock error:', error);
    res.status(500).json({ error: 'Failed to unblock organizer' });
  }
});

// ============================================================
// Audit logs
// ============================================================

// GET /api/v1/admin/audit-logs - список логов действий админов
router.get('/audit-logs', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { action, targetType, targetId, adminId, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (adminId) where.adminId = adminId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string, 10), 100),
      skip: parseInt(offset as string, 10),
    });

    const total = await prisma.auditLog.count({ where });

    res.json({
      logs: logs.map((l) => ({
        id: l.id,
        adminId: l.adminId,
        adminName: l.adminName,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        targetName: l.targetName,
        details: l.details ? JSON.parse(l.details) : null,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    console.error('[Admin] GET /audit-logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ============================================================
// Delete user (SUPERADMIN ONLY)
// ============================================================

// DELETE /api/v1/admin/users/:id - удалить пользователя (superadmin only)
router.delete('/users/:id', requireAuth, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.auth!.userId;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot delete superadmin
    if (existing.role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot delete superadmin' });
    }

    await prisma.$transaction(async (tx) => {
      // Push tokens
      await tx.pushToken.deleteMany({ where: { userId: id } });

      // Subscriptions
      await tx.subscription.deleteMany({ where: { userId: id } });

      // Gamification
      await tx.pointsLedger.deleteMany({ where: { userId: id } });
      await tx.userStatus.deleteMany({ where: { userId: id } });
      await tx.userChallenge.deleteMany({ where: { userId: id } });

      // Organizer profile (if any)
      await tx.certificate.deleteMany({ where: { organizerId: id } });
      await tx.organizerProfile.deleteMany({ where: { userId: id } });

      // User-generated entities
      await tx.waitingListEntry.deleteMany({ where: { userId: id } });
      await tx.participation.deleteMany({ where: { userId: id } });
      await tx.review.deleteMany({ where: { userId: id } });
      await tx.complaint.deleteMany({ where: { reporterId: id } });

      // Events created by organizer: сначала удаляем зависимости событий
      const events = await tx.event.findMany({ where: { organizerId: id }, select: { id: true } });
      const eventIds = events.map((e) => e.id);

      if (eventIds.length > 0) {
        await tx.waitingListEntry.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.participation.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.review.deleteMany({ where: { eventId: { in: eventIds } } });
        await tx.pointsLedger.deleteMany({ where: { sourceType: 'event', sourceId: { in: eventIds } } });
        // complaints могут ссылаться на event через targetId, но это не FK, поэтому не блокирует
        await tx.event.deleteMany({ where: { id: { in: eventIds } } });
      }

      // Finally: user
      await tx.user.delete({ where: { id } });
    });

    // Log to audit (после транзакции, чтобы не потерять лог при ошибке)
    await logAdminAction(adminId, 'delete_user', 'user', id, existing.name || id);

    res.json({ status: 'deleted', userId: id });
  } catch (error) {
    console.error('[Admin] DELETE /users/:id error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================================
// Superadmin: Global App Statistics
// ============================================================

// GET /api/v1/admin/stats/overview - глобальная статистика приложения (только superadmin)
router.get('/stats/overview', requireAuth, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    // Users stats
    const usersTotal = await prisma.user.count();
    const usersByStatus = await prisma.user.groupBy({
      by: ['status'],
      _count: true,
    });
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    // Events stats
    const eventsTotal = await prisma.event.count();
    const eventsByStatus = await prisma.event.groupBy({
      by: ['status'],
      _count: true,
    });
    const eventsByMovementType = await prisma.event.groupBy({
      by: ['movementType'],
      _count: true,
    });

    // Participations stats
    const participationsTotal = await prisma.participation.count();
    const participationsByStatus = await prisma.participation.groupBy({
      by: ['status'],
      _count: true,
    });

    // Reviews stats
    const reviewsTotal = await prisma.review.count();
    const ratingsAggregate = await prisma.review.aggregate({
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Complaints stats
    const complaintsTotal = await prisma.complaint.count();
    const complaintsByStatus = await prisma.complaint.groupBy({
      by: ['status'],
      _count: true,
    });

    // Transform groupBy results to objects
    const transformGroupBy = (data: Array<{ _count: number } & Record<string, any>>, key: string) => {
      return data.reduce((acc, item) => {
        acc[item[key] || 'unknown'] = item._count;
        return acc;
      }, {} as Record<string, number>);
    };

    res.json({
      users: {
        total: usersTotal,
        byStatus: transformGroupBy(usersByStatus, 'status'),
        byRole: transformGroupBy(usersByRole, 'role'),
      },
      events: {
        total: eventsTotal,
        byStatus: transformGroupBy(eventsByStatus, 'status'),
        byMovementType: transformGroupBy(eventsByMovementType, 'movementType'),
      },
      participations: {
        total: participationsTotal,
        byStatus: transformGroupBy(participationsByStatus, 'status'),
      },
      reviews: {
        total: reviewsTotal,
        avgRating: ratingsAggregate._avg.rating || 0,
        ratingsCount: ratingsAggregate._count.rating || 0,
      },
      complaints: {
        total: complaintsTotal,
        byStatus: transformGroupBy(complaintsByStatus, 'status'),
      },
    });
  } catch (error) {
    console.error('[Admin] GET /stats/overview error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export { router as adminRouter };
